use candid::Principal;
use ic_cdk::api::{msg_caller, time};
use ic_cdk_macros::*;
use crate::types::*;
use crate::memory::*;

#[update]
pub async fn create_bundle(request: BundleCreationRequest) -> Result<u64, String> {
    let total_percentage: u32 = request.allocations.iter()
        .map(|a| a.percentage as u32)
        .sum();

    if total_percentage != 100 {
        return Err(format!("Allocations must sum to 100%, got {}%", total_percentage));
    }

    let mut allocations_with_location = Vec::new();

    for allocation_input in &request.allocations {
        let asset_info = ASSET_REGISTRY.with(|registry| {
            let registry = registry.borrow();
            match registry.get(&allocation_input.asset_id) {
                Some(asset_info) if !asset_info.is_active => {
                    Err(format!("Asset {} is not active", allocation_input.asset_id))
                }
                None => {
                    Err(format!("Asset {} not found", allocation_input.asset_id))
                }
                Some(asset_info) => Ok(asset_info.clone())
            }
        })?;

        allocations_with_location.push(AssetAllocation {
            asset_id: allocation_input.asset_id.clone(),
            token_location: asset_info.token_location,
            percentage: allocation_input.percentage,
        });
    }

    let bundle_id = get_next_bundle_id();

    let token_id = crate::icrc151_client::create_token_icrc151(
        request.icrc151_ledger,
        request.name.clone(),
        request.symbol.clone(),
        8,
        Some(10000),
        None,
        request.description.clone(),
    ).await?;

    let default_fee_bps = crate::memory::GLOBAL_STATE.with(|state| {
        state.borrow().get().default_platform_fee_bps.unwrap_or(50)
    });

    let config = BundleConfig {
        id: bundle_id,
        name: request.name,
        symbol: request.symbol,
        token_location: TokenLocation::ICRC151 {
            ledger: request.icrc151_ledger,
            token_id,
        },
        description: request.description,
        creator: msg_caller(),
        allocations: allocations_with_location,
        created_at: time(),
        is_active: true,
        platform_fee_bps: Some(default_fee_bps),
    };

    BUNDLE_STORAGE.with(|storage| {
        storage.borrow_mut().insert(bundle_id, config)
    });

    Ok(bundle_id)
}

#[query]
pub fn get_bundle(bundle_id: u64) -> Result<BundleConfig, String> {
    BUNDLE_STORAGE.with(|storage| {
        storage.borrow()
            .get(&bundle_id)
            .ok_or_else(|| format!("Bundle {} not found", bundle_id))
    })
}

#[query]
pub fn get_user_bundles(user: Principal) -> Vec<BundleConfig> {
    BUNDLE_STORAGE.with(|storage| {
        let storage = storage.borrow();
        storage.iter()
            .map(|(_, bundle)| bundle)
            .filter(|bundle| bundle.creator == user)
            .collect()
    })
}

#[query]
pub fn list_active_bundles() -> Vec<BundleConfig> {
    BUNDLE_STORAGE.with(|storage| {
        let storage = storage.borrow();
        storage.iter()
            .map(|(_, bundle)| bundle)
            .filter(|bundle| bundle.is_active)
            .collect()
    })
}

pub fn get_bundle_count() -> u64 {
    BUNDLE_STORAGE.with(|storage| {
        storage.borrow().len()
    })
}

pub fn get_bundles_using_asset(asset_id: &AssetId) -> Vec<u64> {
    BUNDLE_STORAGE.with(|storage| {
        let storage = storage.borrow();
        storage.iter()
            .filter_map(|(bundle_id, bundle)| {
                if bundle.allocations.iter().any(|alloc| &alloc.asset_id == asset_id) {
                    Some(bundle_id)
                } else {
                    None
                }
            })
            .collect()
    })
}

#[update]
pub fn set_bundle_platform_fee(bundle_id: u64, fee_bps: u64) -> Result<(), String> {
    let _admin = crate::admin::require_admin()?;

    if fee_bps > 10000 {
        return Err("Fee cannot exceed 100% (10000 bps)".to_string());
    }

    BUNDLE_STORAGE.with(|storage| {
        let mut storage = storage.borrow_mut();
        let mut bundle = storage.get(&bundle_id)
            .ok_or_else(|| format!("Bundle {} not found", bundle_id))?;

        bundle.platform_fee_bps = Some(fee_bps);
        storage.insert(bundle_id, bundle);
        Ok(())
    })
}