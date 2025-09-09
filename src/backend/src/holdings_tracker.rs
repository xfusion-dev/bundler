use ic_cdk::api::time;
use crate::types::*;
use crate::memory::*;
use crate::nav_calculator::calculate_precise_nav_per_token;

pub fn update_bundle_holdings(bundle_id: u64, asset_id: &AssetId, amount_change: i64) -> Result<(), String> {
    let key = bundle_holdings_key(bundle_id, asset_id);

    BUNDLE_HOLDINGS.with(|holdings| {
        let mut holdings = holdings.borrow_mut();
        let mut current_holding = holdings.get(&key)
            .unwrap_or(BundleHolding {
                bundle_id,
                asset_id: asset_id.clone(),
                amount: 0,
                last_updated: time(),
            });

        if amount_change >= 0 {
            current_holding.amount += amount_change as u64;
        } else {
            let decrease = (-amount_change) as u64;
            if current_holding.amount < decrease {
                return Err("Insufficient holdings for withdrawal".to_string());
            }
            current_holding.amount -= decrease;
        }

        current_holding.last_updated = time();

        if current_holding.amount == 0 {
            holdings.remove(&key);
        } else {
            holdings.insert(key, current_holding);
        }

        Ok(())
    })
}

pub fn get_bundle_holding(bundle_id: u64, asset_id: &AssetId) -> u64 {
    let key = bundle_holdings_key(bundle_id, asset_id);

    BUNDLE_HOLDINGS.with(|holdings| {
        holdings.borrow()
            .get(&key)
            .map(|holding| holding.amount)
            .unwrap_or(0)
    })
}

pub fn get_all_bundle_holdings(bundle_id: u64) -> Vec<BundleHolding> {
    let bundle_prefix = format!("{}:", bundle_id);

    BUNDLE_HOLDINGS.with(|holdings| {
        holdings.borrow()
            .iter()
            .filter_map(|(key, holding)| {
                if key.starts_with(&bundle_prefix) {
                    Some(holding)
                } else {
                    None
                }
            })
            .collect()
    })
}

pub fn calculate_proportional_withdrawal(
    bundle_id: u64,
    nav_tokens_to_redeem: u64,
) -> Result<Vec<AssetWithdrawal>, String> {
    let total_nav_tokens = crate::nav_token::get_total_tokens_for_bundle(bundle_id);

    if total_nav_tokens == 0 {
        return Err("No NAV tokens exist for this bundle".to_string());
    }

    if nav_tokens_to_redeem > total_nav_tokens {
        return Err("Cannot redeem more NAV tokens than exist".to_string());
    }

    let withdrawal_percentage = (nav_tokens_to_redeem as f64) / (total_nav_tokens as f64);
    let holdings = get_all_bundle_holdings(bundle_id);
    let mut withdrawals = Vec::new();

    for holding in holdings {
        let withdrawal_amount = (holding.amount as f64 * withdrawal_percentage) as u64;

        if withdrawal_amount > 0 {
            withdrawals.push(AssetWithdrawal {
                asset_id: holding.asset_id,
                amount: withdrawal_amount,
                remaining_in_bundle: holding.amount - withdrawal_amount,
                withdrawal_percentage,
            });
        }
    }

    Ok(withdrawals)
}

pub async fn simulate_proportional_withdrawal(
    bundle_id: u64,
    nav_tokens_to_redeem: u64,
) -> Result<WithdrawalSimulation, String> {
    let withdrawals = calculate_proportional_withdrawal(bundle_id, nav_tokens_to_redeem)?;

    // Calculate estimated USD value of withdrawal
    let total_nav_tokens = crate::nav_token::get_total_tokens_for_bundle(bundle_id);
    let withdrawal_percentage = (nav_tokens_to_redeem as f64) / (total_nav_tokens as f64);

    let mut estimated_usd_value = 0u64;
    let mut asset_breakdown = Vec::new();

    for withdrawal in &withdrawals {
        // Get current price for this asset
        if let Ok(asset_price) = crate::oracle::get_latest_price(&withdrawal.asset_id).await {
            let usd_value = withdrawal.amount
                .checked_mul(asset_price.price_usd)
                .and_then(|v| v.checked_div(100_000_000)) // Assuming 8 decimal places
                .unwrap_or(0);

            estimated_usd_value += usd_value;

            asset_breakdown.push(WithdrawalAssetBreakdown {
                asset_id: withdrawal.asset_id.clone(),
                amount: withdrawal.amount,
                estimated_usd_value: usd_value,
                price_per_unit: asset_price.price_usd,
            });
        }
    }

    Ok(WithdrawalSimulation {
        bundle_id,
        nav_tokens_to_redeem,
        withdrawal_percentage,
        estimated_total_usd_value: estimated_usd_value,
        asset_withdrawals: withdrawals,
        asset_breakdown,
        calculated_at: time(),
    })
}

pub fn execute_proportional_withdrawal(
    bundle_id: u64,
    user: candid::Principal,
    nav_tokens_to_redeem: u64,
) -> Result<Vec<AssetWithdrawal>, String> {
    // First verify user has enough NAV tokens
    let user_balance = crate::nav_token::get_nav_token_balance(user, bundle_id);
    if user_balance < nav_tokens_to_redeem {
        return Err("Insufficient NAV token balance".to_string());
    }

    // Calculate withdrawals
    let withdrawals = calculate_proportional_withdrawal(bundle_id, nav_tokens_to_redeem)?;

    // Execute the withdrawal - update holdings
    for withdrawal in &withdrawals {
        update_bundle_holdings(
            bundle_id,
            &withdrawal.asset_id,
            -(withdrawal.amount as i64),
        )?;
    }

    // Burn the NAV tokens
    crate::nav_token::burn_nav_tokens(user, bundle_id, nav_tokens_to_redeem)?;

    Ok(withdrawals)
}

pub async fn calculate_bundle_drift_from_holdings(bundle_id: u64) -> Result<Vec<HoldingDrift>, String> {
    let bundle = crate::bundle_manager::get_bundle(bundle_id)?;
    let holdings = get_all_bundle_holdings(bundle_id);

    let mut total_holding_value = 0u64;
    let mut holding_values = Vec::new();

    // Calculate current USD value of all holdings
    for holding in &holdings {
        if let Ok(asset_price) = crate::oracle::get_latest_price(&holding.asset_id).await {
            let usd_value = holding.amount
                .checked_mul(asset_price.price_usd)
                .and_then(|v| v.checked_div(100_000_000))
                .unwrap_or(0);

            total_holding_value += usd_value;
            holding_values.push((holding.asset_id.clone(), usd_value));
        }
    }

    if total_holding_value == 0 {
        return Ok(Vec::new());
    }

    let mut drift_analysis = Vec::new();

    // Compare actual holdings percentages with target allocations
    for allocation in &bundle.allocations {
        let actual_value = holding_values.iter()
            .find(|(asset_id, _)| asset_id == &allocation.asset_id)
            .map(|(_, value)| *value)
            .unwrap_or(0);

        let actual_percentage = (actual_value as f64 / total_holding_value as f64) * 100.0;
        let target_percentage = allocation.percentage as f64;
        let drift_percentage = actual_percentage - target_percentage;

        drift_analysis.push(HoldingDrift {
            asset_id: allocation.asset_id.clone(),
            target_percentage,
            actual_percentage,
            drift_percentage,
            holding_amount: get_bundle_holding(bundle_id, &allocation.asset_id),
            usd_value: actual_value,
        });
    }

    Ok(drift_analysis)
}

fn bundle_holdings_key(bundle_id: u64, asset_id: &AssetId) -> String {
    format!("{}:{}", bundle_id, asset_id.0)
}