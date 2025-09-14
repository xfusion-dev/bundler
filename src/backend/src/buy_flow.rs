use ic_cdk::api::msg_caller;

use crate::types::*;
pub async fn confirm_asset_deposit_icrc2(request_id: u64) -> Result<(), String> {
    let caller = msg_caller();
    let assignment = crate::quote_manager::get_quote_assignment(request_id)?
        .ok_or("No quote assignment found")?;

    let request = crate::quote_manager::get_quote_request(request_id)?;

    // Step 1: Verify resolver is calling
    if assignment.resolver != caller {
        return Err("Only assigned resolver can confirm deposits".to_string());
    }

    // Step 2: Verify it's a buy operation
    match request.operation {
        OperationType::Buy => {},
        _ => return Err("This function is only for buy operations".to_string()),
    }

    // Step 3: Get transaction
    let transaction = crate::transaction_manager::get_transaction_by_request(request_id)?;

    // Step 4: Calculate required assets based on bundle allocations
    let bundle = crate::bundle_manager::get_bundle(request.bundle_id)?;
    let bundle_nav = crate::nav_calculator::calculate_bundle_nav(request.bundle_id).await?;

    // Calculate proportional assets needed for the NAV tokens being minted
    let nav_token_percentage = (assignment.nav_tokens as f64) / (bundle_nav.total_tokens as f64);

    // Step 5: Pull each asset from resolver using ICRC-2
    for allocation in &bundle.allocations {
        // Calculate required amount of this asset
        let current_holding = crate::holdings_tracker::get_bundle_holding(
            request.bundle_id,
            &allocation.asset_id
        );

        let required_amount = (current_holding as f64 * nav_token_percentage) as u64;

        if required_amount > 0 {
            // Check resolver has approved enough
            let allowance = crate::icrc2_client::check_user_allowance(
                &allocation.asset_id,
                assignment.resolver
            ).await?;

            if allowance < required_amount {
                return Err(format!(
                    "Resolver hasn't approved enough {} tokens: {} < {}",
                    allocation.asset_id.0,
                    allowance,
                    required_amount
                ));
            }

            // Pull the asset from resolver
            let memo = format!("Buy tx {} asset {}", transaction.id, allocation.asset_id.0).into_bytes();

            let pull_result = crate::icrc2_client::pull_asset_from_user(
                &allocation.asset_id,
                assignment.resolver,
                required_amount,
                Some(memo),
            ).await?;

            ic_cdk::println!(
                "Pulled {} units of {} from resolver {} via ICRC-2 (block: {})",
                required_amount,
                allocation.asset_id.0,
                assignment.resolver,
                pull_result
            );

            // Update bundle holdings
            crate::holdings_tracker::update_bundle_holdings(
                request.bundle_id,
                &allocation.asset_id,
                required_amount as i64
            )?;
        }
    }

    // Step 6: Mint NAV tokens to user
    crate::nav_token::mint_nav_tokens(
        request.user,
        request.bundle_id,
        assignment.nav_tokens,
    )?;

    // Step 7: Transfer ckUSDC from canister to resolver as payment
    let payment_memo = format!("Payment for buy tx {}", transaction.id).into_bytes();
    let payment_result = crate::icrc2_client::send_ckusdc_to_user(
        assignment.resolver,
        assignment.ckusdc_amount,
        Some(payment_memo),
    ).await?;

    ic_cdk::println!(
        "Paid {} ckUSDC to resolver {} (block: {})",
        assignment.ckusdc_amount,
        assignment.resolver,
        payment_result
    );

    // Step 8: Unlock ckUSDC funds and mark complete
    crate::transaction_manager::unlock_user_funds(
        transaction.id,
        &LockedFundType::CkUSDC,
    )?;

    crate::transaction_manager::update_transaction_status(
        transaction.id,
        TransactionStatus::Completed,
    )?;

    ic_cdk::println!(
        "Buy transaction {} completed: {} ckUSDC → {} NAV tokens",
        transaction.id,
        assignment.ckusdc_amount,
        assignment.nav_tokens
    );

    Ok(())
}