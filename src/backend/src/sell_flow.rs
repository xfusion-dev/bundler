use ic_cdk::api::msg_caller;
use crate::types::*;
use crate::{icrc151_client, icrc2_client};

pub async fn confirm_resolver_payment_and_complete_sell(request_id: u64) -> Result<(), String> {
    let caller = msg_caller();

    let assignment = crate::quote_manager::get_assignment(request_id)?;
    let transaction = crate::transaction_manager::get_transaction_by_request(request_id)?;

    if assignment.resolver != caller {
        return Err("Only assigned resolver can confirm payment".to_string());
    }

    match transaction.operation {
        OperationType::Sell { .. } => {},
        _ => return Err("This function is only for sell operations".to_string()),
    }

    let bundle = crate::bundle_manager::get_bundle(transaction.bundle_id)?;

    let ckusdc_ledger = candid::Principal::from_text(icrc2_client::CKUSDC_LEDGER_CANISTER)
        .map_err(|e| format!("Invalid ckUSDC ledger: {}", e))?;

    let canister_id = ic_cdk::api::id();
    let allowance = icrc2_client::icrc2_allowance(
        ckusdc_ledger,
        assignment.resolver,
        canister_id,
    ).await?;

    let available_allowance: u64 = allowance.allowance.0.try_into()
        .map_err(|_| "Allowance amount too large".to_string())?;

    if available_allowance < assignment.ckusdc_amount {
        return Err(format!(
            "Insufficient allowance: resolver has {} but needs {}",
            available_allowance,
            assignment.ckusdc_amount
        ));
    }

    let pull_memo = format!(
        "Sell tx {} - resolver payment",
        transaction.id
    ).into_bytes();

    let pull_result = icrc2_client::icrc2_transfer_from(
        ckusdc_ledger,
        assignment.resolver,
        ic_cdk::api::id(),
        assignment.ckusdc_amount,
        Some(pull_memo),
    ).await?;

    ic_cdk::println!(
        "Pulled {} ICRC-2 ckUSDC from resolver {} (tx: {})",
        assignment.ckusdc_amount,
        assignment.resolver,
        pull_result
    );

    let fees = if assignment.fees > 0 {
        let treasury = crate::memory::GLOBAL_STATE.with(|state| {
            state.borrow().get().platform_treasury
        });

        if let Some(treasury_principal) = treasury {
            let fee_memo = format!(
                "Platform fee for sell tx {} ({}bps)",
                transaction.id,
                bundle.platform_fee_bps.unwrap_or(50)
            ).into_bytes();

            let fee_result = icrc2_client::icrc1_transfer(
                ckusdc_ledger,
                treasury_principal,
                assignment.fees,
                Some(fee_memo),
            ).await?;

            ic_cdk::println!(
                "Transferred {} ckUSDC platform fee to treasury {} (tx: {})",
                assignment.fees,
                treasury_principal,
                fee_result
            );
            assignment.fees
        } else {
            ic_cdk::println!(
                "Warning: Platform fee {} calculated but treasury not configured",
                assignment.fees
            );
            0
        }
    } else {
        0
    };

    for asset_amount in &assignment.asset_amounts {
        let asset = crate::asset_registry::get_asset(asset_amount.asset_id.clone())?;

        let (ledger, token_id) = asset.get_icrc151_location()?;

        let transfer_memo = format!(
            "Sell tx {} - transfer {} {}",
            transaction.id,
            asset_amount.amount,
            asset_amount.asset_id
        ).into_bytes();

        let transfer_result = icrc151_client::transfer_icrc151(
            ledger,
            token_id,
            icrc151_client::Account {
                owner: assignment.resolver,
                subaccount: None,
            },
            asset_amount.amount,
            Some(transfer_memo),
        ).await?;

        ic_cdk::println!(
            "Transferred {} ICRC-151 {} to resolver {} via ledger {} (tx: {})",
            asset_amount.amount,
            asset_amount.asset_id,
            assignment.resolver,
            ledger,
            transfer_result
        );

        crate::holdings_tracker::update_bundle_holdings(
            transaction.bundle_id,
            &asset_amount.asset_id,
            -(asset_amount.amount as i64),
        )?;
    }

    let user_proceeds = assignment.ckusdc_amount - fees;
    let user_payment_memo = format!(
        "Sell tx {} - user proceeds",
        transaction.id
    ).into_bytes();

    let user_payment_result = icrc2_client::icrc1_transfer(
        ckusdc_ledger,
        transaction.user,
        user_proceeds,
        Some(user_payment_memo),
    ).await?;

    ic_cdk::println!(
        "Paid {} ICRC-2 ckUSDC to user {} (tx: {})",
        user_proceeds,
        transaction.user,
        user_payment_result
    );

    let (bundle_ledger, bundle_token_id) = bundle.get_token_location()?;

    let burn_memo = format!(
        "Sell tx {} - burn {} bundle tokens",
        transaction.id,
        assignment.nav_tokens
    ).into_bytes();

    let burn_tx_id = icrc151_client::burn_icrc151(
        bundle_ledger,
        bundle_token_id,
        icrc151_client::Account {
            owner: transaction.user,
            subaccount: None,
        },
        assignment.nav_tokens,
        Some(burn_memo),
    ).await?;

    ic_cdk::println!(
        "Burned {} ICRC-151 bundle tokens from user {} via ledger {} (tx: {})",
        assignment.nav_tokens,
        transaction.user,
        bundle_ledger,
        burn_tx_id
    );

    crate::transaction_manager::unlock_user_funds(
        transaction.id,
        &LockedFundType::NAVTokens { bundle_id: transaction.bundle_id },
    )?;

    crate::transaction_manager::update_transaction_status(
        transaction.id,
        TransactionStatus::Completed,
    )?;

    Ok(())
}