use candid::Principal;
use ic_cdk::api::{time, msg_caller};

use crate::types::*;
use crate::memory::*;

// This replaces the broken confirm_ckusdc_payment flow
pub async fn confirm_resolver_payment_and_complete_sell(
    request_id: u64,
) -> Result<(), String> {
    let caller = msg_caller();
    let request = crate::quote_manager::get_quote_request(request_id)?;
    let assignment = crate::quote_manager::get_quote_assignment(request_id)?
        .ok_or("No quote assignment found")?;

    // Step 1: Verify resolver is calling
    if assignment.resolver != caller {
        return Err("Only assigned resolver can confirm payment".to_string());
    }

    // Step 2: Verify it's a sell operation
    match request.operation {
        OperationType::Sell => {},
        _ => return Err("This function is only for sell operations".to_string()),
    }

    // Step 3: Pull ckUSDC from resolver to canister using ICRC-2
    // The resolver must have approved the canister to pull these tokens
    let memo = format!("Sell payment for request {}", request_id).into_bytes();

    let payment_result = crate::icrc2_client::pull_ckusdc_from_user(
        assignment.resolver,
        assignment.ckusdc_amount,
        Some(memo),
    ).await?;

    ic_cdk::println!(
        "Received {} ckUSDC from resolver {} for request {} (block: {})",
        assignment.ckusdc_amount,
        assignment.resolver,
        request_id,
        payment_result
    );

    // Step 4: Get transaction
    let transaction = crate::transaction_manager::get_transaction_by_request(request_id)?;

    // Step 5: Calculate proportional withdrawals
    let withdrawals = crate::holdings_tracker::calculate_proportional_withdrawal(
        transaction.bundle_id,
        assignment.nav_tokens,
    )?;

    // Step 6: Transfer assets from canister to resolver
    for withdrawal in &withdrawals {
        let asset_memo = format!("Sell tx {} asset {}", transaction.id, withdrawal.asset_id.0).into_bytes();

        let transfer_result = crate::icrc2_client::send_asset_to_user(
            &withdrawal.asset_id,
            assignment.resolver,
            withdrawal.amount,
            Some(asset_memo),
        ).await?;

        ic_cdk::println!(
            "Transferred {} units of {} to resolver {} (block: {})",
            withdrawal.amount,
            withdrawal.asset_id.0,
            assignment.resolver,
            transfer_result
        );

        // Update bundle holdings
        crate::holdings_tracker::reduce_bundle_holding(
            transaction.bundle_id,
            &withdrawal.asset_id,
            withdrawal.amount,
        )?;
    }

    // Step 7: Transfer ckUSDC from canister to user
    let user_memo = format!("Sell proceeds for tx {}", transaction.id).into_bytes();
    let user_payment = crate::icrc2_client::send_ckusdc_to_user(
        request.user,
        assignment.ckusdc_amount,
        Some(user_memo),
    ).await?;

    ic_cdk::println!(
        "Paid {} ckUSDC to user {} (block: {})",
        assignment.ckusdc_amount,
        request.user,
        user_payment
    );

    // Step 8: Burn NAV tokens
    crate::nav_token::burn_nav_tokens(
        request.user,
        transaction.bundle_id,
        assignment.nav_tokens,
    )?;

    // Step 9: Unlock and clean up
    crate::transaction_manager::unlock_user_funds(
        transaction.id,
        &LockedFundType::NAVTokens { bundle_id: transaction.bundle_id },
    )?;

    // Step 10: Mark transaction complete
    crate::transaction_manager::update_transaction_status(
        transaction.id,
        TransactionStatus::Completed,
    )?;

    ic_cdk::println!(
        "Sell transaction {} completed successfully: {} NAV tokens → {} ckUSDC",
        transaction.id,
        assignment.nav_tokens,
        assignment.ckusdc_amount
    );

    Ok(())
}