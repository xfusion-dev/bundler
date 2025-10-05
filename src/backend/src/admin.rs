use candid::Principal;
use ic_cdk::api::msg_caller;
use ic_cdk_macros::*;
use crate::types::*;
use crate::memory::*;

#[derive(candid::CandidType, serde::Serialize, serde::Deserialize, Clone, Debug)]
pub struct AdminAction {
    pub action_type: String,
    pub target: String,
    pub admin: Principal,
    pub timestamp: u64,
    pub details: Option<String>,
}

pub fn is_admin(caller: Principal) -> bool {
    get_admin_principal().map_or(false, |admin_principal| admin_principal == caller)
}

pub fn require_admin() -> Result<Principal, String> {
    let caller = msg_caller();
    if !is_admin(caller) {
        return Err("Admin access required".to_string());
    }
    Ok(caller)
}

#[query]
pub fn get_admin() -> Option<Principal> {
    get_admin_principal()
}

#[update]
pub fn set_admin(new_admin: Principal) -> Result<(), String> {
    let _admin = require_admin()?;

    set_admin_principal(new_admin);

    ic_cdk::println!("Admin changed to: {}", new_admin);
    Ok(())
}

#[update]
pub fn emergency_pause_canister() -> Result<(), String> {
    let _admin = require_admin()?;

    ic_cdk::println!("Emergency pause initiated by admin");
    Ok(())
}

#[update]
pub fn emergency_unpause_canister() -> Result<(), String> {
    let _admin = require_admin()?;

    ic_cdk::println!("Emergency unpause initiated by admin");
    Ok(())
}

#[query]
pub fn get_canister_status() -> CanisterStatus {
    CanisterStatus {
        is_admin_set: get_admin_principal().is_some(),
        total_assets: crate::asset_registry::get_asset_count(),
        total_bundles: crate::bundle_manager::get_bundle_count(),
        total_nav_tokens: crate::nav_token::get_total_nav_token_supply(),
        memory_usage: get_memory_usage(),
    }
}

fn get_memory_usage() -> MemoryUsage {
    MemoryUsage {
        asset_registry_entries: ASSET_REGISTRY.with(|r| r.borrow().len()),
        bundle_storage_entries: BUNDLE_STORAGE.with(|r| r.borrow().len()),
    }
}

#[update]
pub async fn cleanup_inactive_bundles() -> Result<u32, String> {
    let _admin = require_admin()?;

    let inactive_bundles: Vec<u64> = BUNDLE_STORAGE.with(|storage| {
        storage.borrow().iter()
            .filter_map(|(id, bundle)| {
                if !bundle.is_active {
                    Some(id)
                } else {
                    None
                }
            })
            .collect()
    });

    let mut bundles_to_remove = Vec::new();
    for bundle_id in inactive_bundles {
        if let Ok(total_tokens) = crate::nav_token::get_total_tokens_for_bundle(bundle_id).await {
            if total_tokens == 0 {
                bundles_to_remove.push(bundle_id);
            }
        }
    }

    let removed_count = bundles_to_remove.len() as u32;

    BUNDLE_STORAGE.with(|storage| {
        let mut storage = storage.borrow_mut();
        for bundle_id in bundles_to_remove {
            storage.remove(&bundle_id);
        }
    });

    ic_cdk::println!("Removed {} inactive bundles", removed_count);
    Ok(removed_count)
}

#[update]
pub fn force_deactivate_bundle(bundle_id: u64, reason: String) -> Result<(), String> {
    let _admin = require_admin()?;

    BUNDLE_STORAGE.with(|storage| {
        let mut storage = storage.borrow_mut();
        match storage.get(&bundle_id) {
            Some(mut bundle) => {
                bundle.is_active = false;
                storage.insert(bundle_id, bundle);
                ic_cdk::println!("Bundle {} deactivated by admin. Reason: {}", bundle_id, reason);
                Ok(())
            }
            None => Err(format!("Bundle {} not found", bundle_id))
        }
    })
}