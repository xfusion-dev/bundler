use candid::Principal;
use ic_cdk::api::time;

use crate::types::*;
use crate::memory::*;
use crate::holdings_tracker::calculate_proportional_withdrawal;
use crate::nav_token::burn_nav_tokens;
use crate::transaction_manager::{get_transaction, update_transaction_status};

pub fn process_sell_transaction(
    transaction_id: u64,
    request_id: u64,
) -> Result<Vec<AssetWithdrawal>, String> {
    let request = crate::quote_manager::get_quote_request(request_id)?;
    let assignment = crate::quote_manager::get_quote_assignment(request_id)?
        .ok_or("No quote assignment found")?;

    match request.operation {
        OperationType::Sell => {},
        _ => return Err("Not a sell transaction".to_string()),
    }

    let withdrawals = calculate_proportional_withdrawal(
        request.bundle_id,
        assignment.nav_tokens
    )?;

    ic_cdk::println!(
        "Sell transaction {}: Calculated withdrawals for {} NAV tokens from bundle {}",
        transaction_id,
        assignment.nav_tokens,
        request.bundle_id
    );

    for withdrawal in &withdrawals {
        ic_cdk::println!(
            "  - Asset {}: {} units",
            withdrawal.asset_id.0,
            withdrawal.amount
        );
    }

    Ok(withdrawals)
}

pub async fn transfer_assets_to_resolver(
    transaction_id: u64,
    request_id: u64,
    resolver: Principal,
    withdrawals: Vec<AssetWithdrawal>,
) -> Result<(), String> {
    let request = crate::quote_manager::get_quote_request(request_id)?;

    for withdrawal in withdrawals {
        let memo = format!("Sell tx {} asset {}", transaction_id, withdrawal.asset_id.0).into_bytes();
        let transfer_result = crate::icrc_client::transfer_asset_from_canister(
            &withdrawal.asset_id,
            resolver,
            withdrawal.amount,
            Some(memo),
        ).await?;

        ic_cdk::println!(
            "Transferred {} units of {} to resolver {} (block: {})",
            withdrawal.amount,
            withdrawal.asset_id.0,
            resolver,
            transfer_result
        );

        crate::holdings_tracker::reduce_bundle_holding(
            request.bundle_id,
            &withdrawal.asset_id,
            withdrawal.amount,
        )?;
    }

    update_transaction_status(transaction_id, TransactionStatus::AssetsTransferred)?;
    Ok(())
}

pub fn confirm_asset_liquidation(
    request_id: u64,
    ckusdc_received: u64,
) -> Result<(), String> {
    let caller = ic_cdk::api::msg_caller();
    let assignment = crate::quote_manager::get_quote_assignment(request_id)?
        .ok_or("No quote assignment found")?;

    if caller != assignment.resolver {
        return Err("Only assigned resolver can confirm liquidation".to_string());
    }

    let request = crate::quote_manager::get_quote_request(request_id)?;

    let max_slippage_amount = (assignment.ckusdc_amount * request.max_slippage as u64) / 10000;
    let min_acceptable = assignment.ckusdc_amount.saturating_sub(max_slippage_amount);

    if ckusdc_received < min_acceptable {
        return Err(format!(
            "Received ckUSDC {} is below minimum acceptable {} (max slippage {}%)",
            ckusdc_received,
            min_acceptable,
            request.max_slippage
        ));
    }

    QUOTE_ASSIGNMENTS.with(|assignments| {
        let mut assignments = assignments.borrow_mut();
        if let Some(mut assignment) = assignments.get(&request_id) {
            assignment.ckusdc_amount = ckusdc_received;
            assignments.insert(request_id, assignment);
        }
    });

    ic_cdk::println!(
        "Liquidation confirmed for request {}: {} ckUSDC received",
        request_id,
        ckusdc_received
    );

    Ok(())
}

pub async fn complete_sell_transaction(
    transaction_id: u64,
    request_id: u64,
) -> Result<(), String> {
    let request = crate::quote_manager::get_quote_request(request_id)?;
    let assignment = crate::quote_manager::get_quote_assignment(request_id)?
        .ok_or("No quote assignment found")?;

    burn_nav_tokens(
        request.user,
        request.bundle_id,
        assignment.nav_tokens,
    )?;

    let canister_id = ic_cdk::api::id();
    let memo = format!("Sell transaction {}", transaction_id).into_bytes();
    let transfer_result = crate::icrc_client::transfer_ckusdc(
        canister_id,
        request.user,
        assignment.ckusdc_amount,
        Some(memo),
    ).await?;

    update_transaction_status(transaction_id, TransactionStatus::Completed)?;

    ic_cdk::println!(
        "Sell transaction {} completed: {} NAV tokens burned, {} ckUSDC sent to user (block: {})",
        transaction_id,
        assignment.nav_tokens,
        assignment.ckusdc_amount,
        transfer_result
    );

    Ok(())
}