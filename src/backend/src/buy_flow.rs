use ic_cdk::api::msg_caller;
use crate::types::*;
use crate::{icrc151_client, icrc2_client};

pub async fn confirm_asset_deposit(request_id: u64) -> Result<(), String> {
    let caller = msg_caller();

    let assignment = crate::quote_manager::get_quote_assignment(request_id)?
        .ok_or("No quote assignment found")?;
    let request = crate::quote_manager::get_quote_request(request_id)?;

    if assignment.resolver != caller {
        return Err("Only assigned resolver can confirm deposits".to_string());
    }

    match request.operation {
        OperationType::Buy => {},
        _ => return Err("This function is only for buy operations".to_string()),
    }

    let transaction = crate::transaction_manager::get_transaction_by_request(request_id)?;
    let bundle = crate::bundle_manager::get_bundle(request.bundle_id)?;

    let bundle_nav = crate::nav_calculator::calculate_bundle_nav(request.bundle_id).await?;
    let nav_token_percentage = (assignment.nav_tokens as f64) / (bundle_nav.total_tokens as f64);

    for allocation in &bundle.allocations {
        let current_holding = crate::holdings_tracker::get_bundle_holding(
            request.bundle_id,
            &allocation.asset_id
        );

        let required_amount = (current_holding as f64 * nav_token_percentage) as u64;

        if required_amount > 0 {
            let (ledger, token_id) = match &allocation.token_location {
                TokenLocation::ICRC151 { ledger, token_id } => (*ledger, token_id.clone()),
                _ => return Err("Allocation must be ICRC-151".to_string()),
            };

            let pull_memo = format!(
                "Buy tx {} - {} collateral",
                transaction.id,
                allocation.asset_id.0
            ).into_bytes();

            let pull_result = icrc151_client::transfer_from_icrc151(
                ledger,
                token_id,
                icrc151_client::Account {
                    owner: assignment.resolver,
                    subaccount: None,
                },
                icrc151_client::Account {
                    owner: ic_cdk::api::id(),
                    subaccount: None,
                },
                required_amount,
                Some(pull_memo),
            ).await?;

            ic_cdk::println!(
                "Pulled {} ICRC-151 {} from resolver {} via ledger {} (tx: {})",
                required_amount,
                allocation.asset_id.0,
                assignment.resolver,
                ledger,
                pull_result
            );

            crate::holdings_tracker::update_bundle_holdings(
                request.bundle_id,
                &allocation.asset_id,
                required_amount as i64,
            )?;
        }
    }

    let (bundle_ledger, bundle_token_id) = bundle.get_token_location()?;

    let mint_memo = format!(
        "Buy tx {} - mint {} bundle tokens",
        transaction.id,
        assignment.nav_tokens
    ).into_bytes();

    let mint_tx_id = icrc151_client::mint_icrc151(
        bundle_ledger,
        bundle_token_id,
        icrc151_client::Account {
            owner: request.user,
            subaccount: None,
        },
        assignment.nav_tokens,
        Some(mint_memo),
    ).await?;

    ic_cdk::println!(
        "Minted {} ICRC-151 bundle tokens to user {} via ledger {} (tx: {})",
        assignment.nav_tokens,
        request.user,
        bundle_ledger,
        mint_tx_id
    );

    let ckusdc_ledger = candid::Principal::from_text(icrc2_client::CKUSDC_LEDGER_CANISTER)
        .map_err(|e| format!("Invalid ckUSDC ledger: {}", e))?;

    let payment_memo = format!(
        "Payment for buy tx {}",
        transaction.id
    ).into_bytes();

    let payment_result = icrc2_client::icrc1_transfer(
        ckusdc_ledger,
        assignment.resolver,
        assignment.ckusdc_amount,
        Some(payment_memo),
    ).await?;

    ic_cdk::println!(
        "Paid {} ICRC-2 ckUSDC to resolver {} (tx: {})",
        assignment.ckusdc_amount,
        assignment.resolver,
        payment_result
    );

    crate::transaction_manager::unlock_user_funds(
        transaction.id,
        &LockedFundType::CkUSDC,
    )?;

    crate::transaction_manager::update_transaction_status(
        transaction.id,
        TransactionStatus::Completed,
    )?;

    Ok(())
}