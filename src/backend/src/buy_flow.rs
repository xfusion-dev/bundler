use ic_cdk::api::msg_caller;
use crate::types::*;
use crate::{icrc151_client, icrc2_client};

pub async fn confirm_asset_deposit(request_id: u64) -> Result<(), String> {
    let caller = msg_caller();

    let assignment = crate::quote_manager::get_assignment(request_id)?;
    let transaction = crate::transaction_manager::get_transaction_by_request(request_id)?;

    if assignment.resolver != caller {
        return Err("Only assigned resolver can confirm deposits".to_string());
    }

    match transaction.operation {
        OperationType::InitialBuy { .. } | OperationType::Buy { .. } => {},
        _ => return Err("This function is only for buy operations".to_string()),
    }

    let bundle = crate::bundle_manager::get_bundle(transaction.bundle_id)?;

    for asset_amount in &assignment.asset_amounts {
        let allocation = bundle.allocations.iter()
            .find(|a| a.asset_id == asset_amount.asset_id)
            .ok_or("Asset not found in bundle allocations".to_string())?;

        let required_amount = asset_amount.amount;

        if required_amount > 0 {
            let (ledger, token_id) = match &allocation.token_location {
                TokenLocation::ICRC151 { ledger, token_id } => (*ledger, token_id.clone()),
                _ => return Err("Allocation must be ICRC-151".to_string()),
            };

            let pull_memo = format!(
                "Buy tx {} - {} collateral",
                transaction.id,
                allocation.asset_id
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
                allocation.asset_id,
                assignment.resolver,
                ledger,
                pull_result
            );

            crate::holdings_tracker::update_bundle_holdings(
                transaction.bundle_id,
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
            owner: transaction.user,
            subaccount: None,
        },
        assignment.nav_tokens,
        Some(mint_memo),
    ).await?;

    ic_cdk::println!(
        "Minted {} ICRC-151 bundle tokens to user {} via ledger {} (tx: {})",
        assignment.nav_tokens,
        transaction.user,
        bundle_ledger,
        mint_tx_id
    );

    let ckusdc_ledger = candid::Principal::from_text(icrc2_client::CKUSDC_LEDGER_CANISTER)
        .map_err(|e| format!("Invalid ckUSDC ledger: {}", e))?;

    if assignment.fees > 0 {
        let treasury = crate::memory::GLOBAL_STATE.with(|state| {
            state.borrow().get().platform_treasury
        });

        if let Some(treasury_principal) = treasury {
            let fee_memo = format!(
                "Platform fee for buy tx {} ({}bps)",
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
        } else {
            ic_cdk::println!(
                "Warning: Platform fee {} calculated but treasury not configured",
                assignment.fees
            );
        }
    }

    let resolver_payment = assignment.ckusdc_amount - assignment.fees;

    let payment_memo = format!(
        "Payment for buy tx {}",
        transaction.id
    ).into_bytes();

    let payment_result = icrc2_client::icrc1_transfer(
        ckusdc_ledger,
        assignment.resolver,
        resolver_payment,
        Some(payment_memo),
    ).await?;

    ic_cdk::println!(
        "Paid {} ICRC-2 ckUSDC to resolver {} (tx: {})",
        resolver_payment,
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

    let usdc_amount_e6 = assignment.ckusdc_amount;
    let points = usdc_amount_e6 / 10_000;
    crate::memory::add_points(transaction.user, points);

    Ok(())
}