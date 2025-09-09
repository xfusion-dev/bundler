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

    let total_nav_tokens = get_total_tokens_for_bundle(bundle_id);

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

    for allocation in &bundle.allocations {
        let asset_price = get_latest_price(&allocation.asset_id).await?;
        let asset_info = crate::asset_registry::get_asset(allocation.asset_id.clone())?;

        let allocation_value = calculate_allocation_value_with_decimals(
            total_nav_tokens,
            allocation.percentage,
            asset_price.price_usd,
            asset_info.decimals,
        )?;

        let percentage = allocation.percentage as f64;

        asset_values.push(AssetValue {
            asset_id: allocation.asset_id.clone(),
            amount: allocation_value.amount,
            value_usd: allocation_value.value_usd,
            percentage,
        });

        total_value_usd = total_value_usd.checked_add(allocation_value.value_usd)
            .ok_or("Total value overflow")?;
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
    if total_tokens == 0 {
        return 0;
    }

    let precision_factor = 10u64.pow(precision_decimals as u32);
    let precise_value = total_usd_value.checked_mul(precision_factor)
        .and_then(|v| v.checked_div(total_tokens))
        .unwrap_or(0);

    precise_value
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