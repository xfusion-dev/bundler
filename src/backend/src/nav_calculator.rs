use ic_cdk::api::time;
use crate::types::*;
use crate::oracle::get_latest_price;
use crate::bundle_manager::get_bundle;
use crate::nav_token::get_total_tokens_for_bundle;

pub async fn calculate_bundle_nav(bundle_id: u64) -> Result<BundleNAV, String> {
    let bundle = get_bundle(bundle_id)?;

    if !bundle.is_active {
        return Err("Bundle is not active".to_string());
    }

    let total_nav_tokens = get_total_tokens_for_bundle(bundle_id).await?;

    if total_nav_tokens == 0 {
        return Ok(BundleNAV {
            bundle_id,
            nav_per_token: 0,
            total_nav_usd: 0,
            total_tokens: 0,
            asset_values: Vec::new(),
            calculated_at: time(),
        });
    }

    let mut asset_values = Vec::new();
    let mut total_value_usd = 0u64;

    let holdings = crate::holdings_tracker::get_all_bundle_holdings(bundle_id);

    for holding in holdings {
        let asset_price = get_latest_price(&holding.asset_id).await?;
        let asset_info = crate::asset_registry::get_asset(holding.asset_id.clone())?;

        let holding_value_usd = calculate_holding_value_usd(
            holding.amount,
            asset_price.price_usd,
            asset_info.decimals,
        )?;

        asset_values.push(AssetValue {
            asset_id: holding.asset_id.clone(),
            amount: holding.amount,
            value_usd: holding_value_usd,
            percentage: 0.0, // Will be calculated after total is known
        });

        total_value_usd = total_value_usd.checked_add(holding_value_usd)
            .ok_or("Total value overflow")?;
    }

    // Calculate actual percentages based on holdings
    for asset_value in &mut asset_values {
        asset_value.percentage = if total_value_usd > 0 {
            (asset_value.value_usd as f64 / total_value_usd as f64) * 100.0
        } else {
            0.0
        };
    }

    let nav_per_token = calculate_precise_nav_per_token(total_value_usd, total_nav_tokens, 8);

    Ok(BundleNAV {
        bundle_id,
        nav_per_token,
        total_nav_usd: total_value_usd,
        total_tokens: total_nav_tokens,
        asset_values,
        calculated_at: time(),
    })
}

struct AllocationValue {
    amount: u64,
    value_usd: u64,
}

pub fn calculate_holding_value_usd(
    holding_amount: u64,
    asset_price_usd: u64,
    asset_decimals: u8,
) -> Result<u64, String> {
    if asset_decimals > 18 {
        return Err("Asset decimals cannot exceed 18".to_string());
    }

    let amount_factor = 10_u64.pow(asset_decimals as u32);

    let value_usd = (holding_amount as u128 * asset_price_usd as u128) / amount_factor as u128;

    if value_usd > u64::MAX as u128 {
        return Err("Value overflow".to_string());
    }

    Ok(value_usd as u64)
}

fn calculate_allocation_value(
    total_nav_tokens: u64,
    allocation_percentage: u8,
    asset_price_usd: u64,
) -> Result<AllocationValue, String> {
    calculate_allocation_value_with_decimals(
        total_nav_tokens,
        allocation_percentage,
        asset_price_usd,
        8, // Default to 8 decimals for USD calculations
    )
}

fn calculate_allocation_value_with_decimals(
    total_nav_tokens: u64,
    allocation_percentage: u8,
    asset_price_usd: u64,
    asset_decimals: u8,
) -> Result<AllocationValue, String> {
    if allocation_percentage > 100 {
        return Err("Allocation percentage cannot exceed 100%".to_string());
    }

    // Use 8 decimal precision for base calculations (USD standard)
    let base_value_per_token = 100_000_000u64; // 1.00000000 USD
    let total_base_value = total_nav_tokens.checked_mul(base_value_per_token)
        .ok_or("Total base value overflow")?;

    let allocation_value = total_base_value.checked_mul(allocation_percentage as u64)
        .ok_or("Allocation value calculation overflow")?
        .checked_div(100)
        .ok_or("Division by zero")?;

    // Adjust price for asset decimals
    let adjusted_price = adjust_price_for_decimals(asset_price_usd, asset_decimals);

    let asset_amount = if adjusted_price > 0 {
        allocation_value.checked_div(adjusted_price).unwrap_or(0)
    } else {
        0
    };

    // Scale asset amount to proper decimals
    let scaled_asset_amount = scale_amount_to_decimals(asset_amount, asset_decimals);

    // Calculate actual USD value using original price
    let actual_value_usd = scaled_asset_amount.checked_mul(asset_price_usd)
        .and_then(|v| v.checked_div(10u64.pow(asset_decimals as u32)))
        .ok_or("Value calculation overflow")?;

    Ok(AllocationValue {
        amount: scaled_asset_amount,
        value_usd: actual_value_usd,
    })
}

pub fn adjust_price_for_decimals(price_usd: u64, decimals: u8) -> u64 {
    // Price is in 8-decimal USD format, adjust for asset decimals
    if decimals >= 8 {
        // Asset has more decimals than USD, need to multiply
        price_usd.checked_mul(10u64.pow((decimals - 8) as u32)).unwrap_or(price_usd)
    } else if decimals < 8 {
        // Asset has fewer decimals than USD, need to divide
        price_usd.checked_div(10u64.pow((8 - decimals) as u32)).unwrap_or(1)
    } else {
        price_usd
    }
}

pub fn scale_amount_to_decimals(amount: u64, decimals: u8) -> u64 {
    // Ensure amount is properly scaled for the asset's decimal places
    let max_decimals = 18; // Reasonable maximum
    if decimals > max_decimals {
        return amount;
    }

    // If we're dealing with very small amounts, ensure minimum precision
    if amount == 0 {
        return 0;
    }

    // Apply decimal scaling
    amount
}

pub fn convert_amount_between_decimals(amount: u64, from_decimals: u8, to_decimals: u8) -> Result<u64, String> {
    if from_decimals == to_decimals {
        return Ok(amount);
    }

    if from_decimals > to_decimals {
        let scale_down = 10u64.pow((from_decimals - to_decimals) as u32);
        Ok(amount / scale_down)
    } else {
        let scale_up = 10u64.pow((to_decimals - from_decimals) as u32);
        amount.checked_mul(scale_up)
            .ok_or_else(|| "Amount overflow during decimal conversion".to_string())
    }
}

pub fn normalize_amount_to_usd(amount: u64, asset_decimals: u8, price_per_unit: u64) -> Result<u64, String> {
    // Convert asset amount to USD value
    let decimal_factor = 10u64.pow(asset_decimals as u32);
    let usd_value = amount.checked_mul(price_per_unit)
        .and_then(|v| v.checked_div(decimal_factor))
        .ok_or("USD normalization overflow")?;

    Ok(usd_value)
}

pub fn calculate_precise_nav_per_token(total_usd_value: u64, total_tokens: u64, precision_decimals: u8) -> u64 {
    calculate_nav_per_token_with_supply_validation(total_usd_value, total_tokens, precision_decimals)
        .unwrap_or(0)
}

pub fn calculate_nav_per_token_with_supply_validation(
    total_usd_value: u64,
    total_tokens: u64,
    precision_decimals: u8,
) -> Result<u64, String> {
    if total_tokens == 0 {
        return Ok(0);
    }

    if precision_decimals > 18 {
        return Err("Precision decimals cannot exceed 18".to_string());
    }

    // total_usd_value is in 8 decimals, so we divide by total_tokens first
    let nav_per_token_8_decimals = total_usd_value.checked_div(total_tokens)
        .ok_or("Division by zero in NAV calculation")?;

    // Convert from 8 decimals to the requested precision
    let nav_per_token = convert_amount_between_decimals(
        nav_per_token_8_decimals,
        8,
        precision_decimals,
    )?;

    Ok(nav_per_token)
}

pub fn format_nav_with_precision(nav_value: u64, precision_decimals: u8) -> String {
    if precision_decimals == 0 {
        return nav_value.to_string();
    }

    let precision_factor = 10u64.pow(precision_decimals as u32);
    let whole_part = nav_value / precision_factor;
    let decimal_part = nav_value % precision_factor;

    if decimal_part == 0 {
        format!("{}.{:0width$}", whole_part, 0, width = precision_decimals as usize)
    } else {
        let decimal_str = format!("{:0width$}", decimal_part, width = precision_decimals as usize);
        let trimmed = decimal_str.trim_end_matches('0');
        if trimmed.is_empty() {
            format!("{}.0", whole_part)
        } else {
            format!("{}.{}", whole_part, trimmed)
        }
    }
}

pub async fn validate_total_supply_consistency(bundle_id: u64) -> Result<SupplyValidationResult, String> {
    let recorded_total = crate::nav_token::get_total_tokens_for_bundle(bundle_id).await?;
    let calculated_total = calculate_total_supply_from_holders(bundle_id);

    let is_consistent = recorded_total == calculated_total;
    let discrepancy = if recorded_total > calculated_total {
        recorded_total - calculated_total
    } else {
        calculated_total - recorded_total
    };

    Ok(SupplyValidationResult {
        bundle_id,
        recorded_total_supply: recorded_total,
        calculated_total_supply: calculated_total,
        is_consistent,
        discrepancy,
        validation_timestamp: time(),
    })
}

fn calculate_total_supply_from_holders(bundle_id: u64) -> u64 {
    let bundle_suffix = format!(":{}", bundle_id);

    crate::memory::NAV_TOKEN_STORAGE.with(|tokens| {
        let tokens = tokens.borrow();
        tokens.iter()
            .filter_map(|(key, token)| {
                if key.ends_with(&bundle_suffix) {
                    Some(token.amount)
                } else {
                    None
                }
            })
            .sum()
    })
}

pub async fn calculate_nav_with_full_precision_report(bundle_id: u64) -> Result<NAVPrecisionReport, String> {
    let bundle = crate::bundle_manager::get_bundle(bundle_id)?;
    let total_tokens = crate::nav_token::get_total_tokens_for_bundle(bundle_id).await?;

    if total_tokens == 0 {
        return Ok(NAVPrecisionReport {
            bundle_id,
            total_usd_value: 0,
            total_tokens: 0,
            nav_per_token_8_decimals: 0,
            nav_per_token_18_decimals: 0,
            formatted_nav_display: "0.00000000".to_string(),
            precision_loss_amount: 0,
            calculation_timestamp: time(),
        });
    }

    // Calculate total USD value with high precision
    let mut total_usd_value = 0u64;
    for allocation in &bundle.allocations {
        if let Ok(asset_price) = crate::oracle::get_latest_price(&allocation.asset_id).await {
            if let Ok(asset_info) = crate::asset_registry::get_asset(allocation.asset_id.clone()) {
                if let Ok(allocation_value) = calculate_allocation_value_with_decimals(
                    total_tokens,
                    allocation.percentage,
                    asset_price.price_usd,
                    asset_info.decimals,
                ) {
                    total_usd_value = total_usd_value.saturating_add(allocation_value.value_usd);
                }
            }
        }
    }

    // Calculate NAV with different precisions
    let nav_8_decimals = calculate_nav_per_token_with_supply_validation(total_usd_value, total_tokens, 8)?;
    let nav_18_decimals = calculate_nav_per_token_with_supply_validation(total_usd_value, total_tokens, 18)?;

    // Calculate precision loss
    let scaled_nav_8 = nav_8_decimals.saturating_mul(10u64.pow(10)); // Scale to 18 decimals
    let precision_loss = if nav_18_decimals > scaled_nav_8 {
        nav_18_decimals - scaled_nav_8
    } else {
        0
    };

    Ok(NAVPrecisionReport {
        bundle_id,
        total_usd_value,
        total_tokens,
        nav_per_token_8_decimals: nav_8_decimals,
        nav_per_token_18_decimals: nav_18_decimals,
        formatted_nav_display: format_nav_with_precision(nav_8_decimals, 8),
        precision_loss_amount: precision_loss,
        calculation_timestamp: time(),
    })
}

pub async fn calculate_multiple_bundle_navs(bundle_ids: Vec<u64>) -> Vec<(u64, Result<BundleNAV, String>)> {
    let mut results = Vec::new();

    for bundle_id in bundle_ids {
        let nav_result = calculate_bundle_nav(bundle_id).await;
        results.push((bundle_id, nav_result));
    }

    results
}

pub async fn get_portfolio_value(user_principal: candid::Principal) -> Result<u64, String> {
    let nav_tokens = crate::nav_token::get_user_nav_tokens(user_principal);
    let mut total_value = 0u64;

    for nav_token in nav_tokens {
        match calculate_bundle_nav(nav_token.bundle_id).await {
            Ok(bundle_nav) => {
                let user_value = nav_token.amount.checked_mul(bundle_nav.nav_per_token)
                    .ok_or("User portfolio value overflow")?;
                total_value = total_value.checked_add(user_value)
                    .ok_or("Total portfolio value overflow")?;
            }
            Err(_) => {
                continue;
            }
        }
    }

    Ok(total_value)
}

pub fn validate_bundle_allocations(allocations: &[AssetAllocation]) -> Result<(), String> {
    if allocations.is_empty() {
        return Err("Bundle must have at least one allocation".to_string());
    }

    if allocations.len() > 20 {
        return Err("Bundle cannot have more than 20 allocations".to_string());
    }

    let total_percentage: u32 = allocations.iter()
        .map(|a| a.percentage as u32)
        .sum();

    if total_percentage != 100 {
        return Err(format!("Total allocation percentage must equal 100%, got {}%", total_percentage));
    }

    for allocation in allocations {
        if allocation.percentage == 0 {
            return Err("Allocation percentage cannot be zero".to_string());
        }
        if allocation.percentage > 100 {
            return Err("Individual allocation cannot exceed 100%".to_string());
        }
    }

    let mut seen_assets = std::collections::HashSet::new();
    for allocation in allocations {
        if !seen_assets.insert(&allocation.asset_id) {
            return Err(format!("Duplicate asset in allocations: {}", allocation.asset_id.0));
        }
    }

    Ok(())
}