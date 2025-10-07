use candid::Principal;
use ic_cdk::api::time;
use ic_cdk_macros::*;
use crate::types::*;
use crate::memory::*;
use crate::admin::require_admin;

#[update]
pub fn add_asset(
    id: AssetId,
    symbol: String,
    name: String,
    token_location: TokenLocation,
    oracle_ticker: Option<String>,
    decimals: u8,
    metadata: AssetMetadata,
) -> Result<(), String> {
    let _admin = require_admin()?;

    match &token_location {
        TokenLocation::ICRC2 { ledger: _ } => {
            if id.0 != "ckUSDC" {
                return Err("Only ckUSDC should use ICRC-2".to_string());
            }
        }
        TokenLocation::ICRC151 { ledger: _, token_id } => {
            if token_id.len() != 32 {
                return Err("ICRC-151 token_id must be 32 bytes".to_string());
            }
        }
    }

    let asset = AssetInfo {
        id: id.clone(),
        symbol,
        name,
        token_location,
        oracle_ticker,
        decimals,
        is_active: true,
        added_at: time(),
        metadata,
    };

    ASSET_REGISTRY.with(|registry| {
        let mut registry = registry.borrow_mut();
        if registry.contains_key(&id) {
            return Err(format!("Asset {} already exists", id.0));
        }
        registry.insert(id, asset);
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

pub fn get_asset_icrc151_location(asset_id: &AssetId) -> Result<(Principal, Vec<u8>), String> {
    ASSET_REGISTRY.with(|registry| {
        let asset = registry.borrow()
            .get(asset_id)
            .ok_or_else(|| format!("Asset {} not found", asset_id.0))?;

        asset.get_icrc151_location()
    })
}

#[update]
pub fn update_asset_token_location(asset_id: AssetId, new_token_location: TokenLocation) -> Result<(), String> {
    let _admin = require_admin()?;

    // Validate token_location
    match &new_token_location {
        TokenLocation::ICRC151 { ledger: _, token_id } => {
            if token_id.len() != 32 {
                return Err("ICRC-151 token_id must be 32 bytes".to_string());
            }
        }
        TokenLocation::ICRC2 { ledger: _ } => {
            // ICRC-2 is valid
        }
    }

    ASSET_REGISTRY.with(|registry| {
        let mut registry = registry.borrow_mut();
        match registry.get(&asset_id) {
            Some(mut asset_info) => {
                asset_info.token_location = new_token_location;
                registry.insert(asset_id, asset_info);
                Ok(())
            }
            None => Err(format!("Asset {} not found", asset_id.0))
        }
    })
}