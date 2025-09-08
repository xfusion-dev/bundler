use candid::Principal;
use ic_cdk::api::{msg_caller, time};
use ic_cdk_macros::*;
use crate::types::*;
use crate::memory::*;

fn is_admin(caller: Principal) -> bool {
    ADMIN_PRINCIPAL.with(|admin| {
        admin.borrow().map_or(false, |admin_principal| admin_principal == caller)
    })
}

#[query]
pub fn get_admin() -> Option<Principal> {
    ADMIN_PRINCIPAL.with(|admin| *admin.borrow())
}

#[update]
pub fn set_admin(new_admin: Principal) -> Result<(), String> {
    let caller = msg_caller();
    if !is_admin(caller) {
        return Err("Only admin can set new admin".to_string());
    }
    ADMIN_PRINCIPAL.with(|admin| *admin.borrow_mut() = Some(new_admin));
    Ok(())
}

#[update]
pub fn add_asset(mut asset_info: AssetInfo) -> Result<(), String> {
    let caller = msg_caller();
    if !is_admin(caller) {
        return Err("Only admin can add assets".to_string());
    }

    asset_info.added_at = time();

    ASSET_REGISTRY.with(|registry| {
        let mut registry = registry.borrow_mut();
        if registry.contains_key(&asset_info.id) {
            return Err(format!("Asset {} already exists", asset_info.id.0));
        }
        registry.insert(asset_info.id.clone(), asset_info);
        Ok(())
    })
}

#[update]
pub fn update_asset(asset_id: AssetId, updates: AssetInfoUpdate) -> Result<(), String> {
    let caller = msg_caller();
    if !is_admin(caller) {
        return Err("Only admin can update assets".to_string());
    }

    ASSET_REGISTRY.with(|registry| {
        let mut registry = registry.borrow_mut();
        match registry.get(&asset_id) {
            Some(mut asset_info) => {
                if let Some(name) = updates.name {
                    asset_info.name = name;
                }
                if let Some(oracle_ticker) = updates.oracle_ticker {
                    asset_info.oracle_ticker = Some(oracle_ticker);
                }
                if let Some(minter_canister) = updates.minter_canister {
                    asset_info.minter_canister = Some(minter_canister);
                }
                if let Some(is_active) = updates.is_active {
                    asset_info.is_active = is_active;
                }
                if let Some(metadata) = updates.metadata {
                    asset_info.metadata = metadata;
                }
                registry.insert(asset_id, asset_info);
                Ok(())
            }
            None => Err(format!("Asset {} not found", asset_id.0))
        }
    })
}

#[query]
pub fn get_asset(asset_id: AssetId) -> Result<AssetInfo, String> {
    ASSET_REGISTRY.with(|registry| {
        registry.borrow()
            .get(&asset_id)
            .ok_or_else(|| format!("Asset {} not found", asset_id.0))
    })
}

#[query]
pub fn list_assets(filter: Option<AssetFilter>) -> Vec<AssetInfo> {
    ASSET_REGISTRY.with(|registry| {
        let registry = registry.borrow();
        let mut assets: Vec<AssetInfo> = Vec::new();

        for (_, asset_info) in registry.iter() {
            let mut include = true;

            if let Some(ref filter) = filter {
                if filter.active_only && !asset_info.is_active {
                    include = false;
                }

                if let Some(ref category) = filter.category {
                    if std::mem::discriminant(&asset_info.metadata.category) != std::mem::discriminant(category) {
                        include = false;
                    }
                }

                if let Some(ref standard) = filter.standard {
                    if std::mem::discriminant(&asset_info.standard) != std::mem::discriminant(standard) {
                        include = false;
                    }
                }
            }

            if include {
                assets.push(asset_info);
            }
        }

        assets
    })
}

#[update]
pub fn deactivate_asset(asset_id: AssetId) -> Result<(), String> {
    let caller = msg_caller();
    if !is_admin(caller) {
        return Err("Only admin can deactivate assets".to_string());
    }

    ASSET_REGISTRY.with(|registry| {
        let mut registry = registry.borrow_mut();
        match registry.get(&asset_id) {
            Some(mut asset_info) => {
                asset_info.is_active = false;
                registry.insert(asset_id, asset_info);
                Ok(())
            }
            None => Err(format!("Asset {} not found", asset_id.0))
        }
    })
}

pub fn get_asset_count() -> u64 {
    ASSET_REGISTRY.with(|registry| {
        registry.borrow().len()
    })
}