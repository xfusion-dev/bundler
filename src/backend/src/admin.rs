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
    ADMIN_PRINCIPAL.with(|admin| {
        admin.borrow().map_or(false, |admin_principal| admin_principal == caller)
    })
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
    ADMIN_PRINCIPAL.with(|admin| *admin.borrow())
}

#[update]
pub fn set_admin(new_admin: Principal) -> Result<(), String> {
    let _admin = require_admin()?;

    ADMIN_PRINCIPAL.with(|admin| *admin.borrow_mut() = Some(new_admin));

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
        is_admin_set: ADMIN_PRINCIPAL.with(|admin| admin.borrow().is_some()),
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
        nav_token_storage_entries: NAV_TOKEN_STORAGE.with(|r| r.borrow().len()),
    }
}

#[update]
pub fn cleanup_inactive_bundles() -> Result<u32, String> {
    let _admin = require_admin()?;

    let mut removed_count = 0;

    BUNDLE_STORAGE.with(|storage| {
        let mut storage = storage.borrow_mut();
        let inactive_bundles: Vec<u64> = storage.iter()
            .filter_map(|(id, bundle)| {
                if !bundle.is_active && crate::nav_token::get_total_tokens_for_bundle(id) == 0 {
                    Some(id)
                } else {
                    None
                }
            })
            .collect();

        for bundle_id in inactive_bundles {
            storage.remove(&bundle_id);
            removed_count += 1;
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