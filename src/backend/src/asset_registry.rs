use ic_cdk::api::time;
use ic_cdk_macros::*;
use crate::types::*;
use crate::memory::*;
use crate::admin::require_admin;

#[update]
pub fn add_asset(mut asset_info: AssetInfo) -> Result<(), String> {
    let _admin = require_admin()?;

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
    let _admin = require_admin()?;

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

                if let Some(payment_tokens_only) = filter.payment_tokens_only {
                    if payment_tokens_only && !asset_info.is_payment_token() {
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
    let _admin = require_admin()?;

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