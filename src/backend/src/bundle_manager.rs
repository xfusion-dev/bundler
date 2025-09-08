use candid::Principal;
use ic_cdk::api::{msg_caller, time};
use ic_cdk_macros::*;
use crate::types::*;
use crate::memory::*;

#[update]
pub fn create_bundle(mut config: BundleConfig) -> Result<u64, String> {
    let total_percentage: u32 = config.allocations.iter()
        .map(|a| a.percentage as u32)
        .sum();

    if total_percentage != 100 {
        return Err(format!("Allocations must sum to 100%, got {}%", total_percentage));
    }

    for allocation in &config.allocations {
        ASSET_REGISTRY.with(|registry| {
            let registry = registry.borrow();
            match registry.get(&allocation.asset_id) {
                Some(asset_info) if !asset_info.is_active => {
                    return Err(format!("Asset {} is not active", allocation.asset_id.0));
                }
                None => {
                    return Err(format!("Asset {} not found", allocation.asset_id.0));
                }
                _ => Ok(())
            }
        })?;
    }

    let bundle_id = BUNDLE_COUNTER.with(|counter| {
        let mut counter = counter.borrow_mut();
        *counter += 1;
        *counter
    });

    config.id = bundle_id;
    config.creator = msg_caller();
    config.created_at = time();
    config.is_active = true;

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