use candid::Principal;
use ic_cdk::api::time;
use ic_cdk_macros::*;
use crate::types::*;
use crate::memory::*;
use crate::admin::require_admin;

const DEFAULT_CACHE_DURATION_NS: u64 = 60_000_000_000;
const DEFAULT_MAX_STALENESS_NS: u64 = 300_000_000_000;

#[update]
pub fn set_oracle_config(config: OracleConfig) -> Result<(), String> {
    let _admin = require_admin()?;

    ORACLE_CONFIG.with(|oracle_config| {
        *oracle_config.borrow_mut() = Some(config);
    });

    Ok(())
}

#[query]
pub fn get_oracle_config() -> Option<OracleConfig> {
    ORACLE_CONFIG.with(|oracle_config| {
        oracle_config.borrow().clone()
    })
}

pub async fn get_latest_price(asset_id: &AssetId) -> Result<AssetPrice, String> {
    if let Some(cached_price) = PRICE_STORAGE.with(|p| p.borrow().get(asset_id)) {
        let age = time() - cached_price.timestamp;
        if age < DEFAULT_CACHE_DURATION_NS {
            return Ok(cached_price);
        }
    }

    let asset_info = crate::asset_registry::get_asset(asset_id.clone())?;
    let oracle_ticker = asset_info.oracle_ticker
        .ok_or_else(|| format!("No oracle ticker configured for asset {}", asset_id.0))?;

    let price = fetch_price_from_oracle(&oracle_ticker).await?;

    let asset_price = AssetPrice {
        asset_id: asset_id.clone(),
        price_usd: price,
        timestamp: time(),
        source: "mock_oracle".to_string(),
        confidence: 95,
    };

    PRICE_STORAGE.with(|p| p.borrow_mut().insert(asset_id.clone(), asset_price.clone()));

    Ok(asset_price)
}

async fn fetch_price_from_oracle(ticker: &str) -> Result<u64, String> {
    match ticker {
        "BTC" => Ok(100_000_00_000_000),
        "ETH" => Ok(4_000_00_000_000),
        "GOLD" => Ok(3_000_00_000_000),
        "GLDT" => Ok(1_50_000_000),
        "USDC" => Ok(1_00_000_000),
        _ => {
            ic_cdk::println!("Mock oracle: Unknown ticker {}, returning default price", ticker);
            Ok(1_00_000_000)
        }
    }
}

#[query]
pub fn get_cached_price(asset_id: AssetId) -> Option<AssetPrice> {
    PRICE_STORAGE.with(|p| p.borrow().get(&asset_id))
}

#[query]
pub fn list_cached_prices() -> Vec<AssetPrice> {
    PRICE_STORAGE.with(|p| {
        p.borrow().iter().map(|(_, price)| price).collect()
    })
}

#[update]
pub fn clear_price_cache() -> Result<u32, String> {
    let _admin = require_admin()?;

    let mut count = 0;
    PRICE_STORAGE.with(|p| {
        let mut storage = p.borrow_mut();
        count = storage.len() as u32;

        let keys: Vec<AssetId> = storage.iter().map(|(key, _)| key).collect();
        for key in keys {
            storage.remove(&key);
        }
    });

    ic_cdk::println!("Cleared {} cached prices", count);
    Ok(count)
}

pub fn adjust_price_for_decimals(price_usd: u64, decimals: u8) -> u64 {
    if decimals >= 8 {
        price_usd / 10_u64.pow((decimals - 8) as u32)
    } else {
        price_usd * 10_u64.pow((8 - decimals) as u32)
    }
}