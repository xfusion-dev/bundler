use ic_cdk::api::time;
use ic_cdk_macros::*;
use candid::{CandidType, Deserialize, Principal};
use crate::types::*;
use crate::memory::*;
use crate::admin::require_admin;

const XFUSION_ORACLE_CANISTER: &str = "uxrrr-q7777-77774-qaaaq-cai";

#[derive(Clone, Debug, CandidType, Deserialize)]
pub struct OraclePrice {
    pub value: u64,
    pub confidence: Option<u64>,
    pub timestamp: u64,
    pub source: String,
}

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
    if let Some(cached_price) = get_cached_price_if_valid(asset_id) {
        return Ok(cached_price);
    }

    let asset_info = crate::asset_registry::get_asset(asset_id.clone())?;
    let oracle_ticker = asset_info.oracle_ticker
        .ok_or_else(|| format!("No oracle ticker configured for asset {}", asset_id.0))?;

    let price = fetch_price_from_oracle(&oracle_ticker).await?;

    let asset_price = AssetPrice {
        asset_id: asset_id.clone(),
        price_usd: price,
        timestamp: time(),
        source: "xfusion_oracle".to_string(),
        confidence: 95,
    };

    PRICE_STORAGE.with(|p| p.borrow_mut().insert(asset_id.clone(), asset_price.clone()));

    Ok(asset_price)
}

pub async fn get_multiple_prices(asset_ids: &[AssetId]) -> Result<Vec<AssetPrice>, String> {
    let mut prices = Vec::new();
    let mut tickers_to_fetch = Vec::new();
    let mut assets_to_update = Vec::new();

    for asset_id in asset_ids {
        if let Some(cached_price) = get_cached_price_if_valid(asset_id) {
            prices.push(cached_price);
        } else {
            let asset_info = crate::asset_registry::get_asset(asset_id.clone())?;
            let oracle_ticker = asset_info.oracle_ticker
                .ok_or_else(|| format!("No oracle ticker configured for asset {}", asset_id.0))?;
            tickers_to_fetch.push(oracle_ticker);
            assets_to_update.push(asset_id.clone());
        }
    }

    if !tickers_to_fetch.is_empty() {
        let current_time = time();

        // Use mock prices for development
        for (i, ticker) in tickers_to_fetch.iter().enumerate() {
            let mock_price = match ticker.as_str() {
                "BTC" => 65_000_00000000,  // $65,000 with 8 decimals
                "ETH" => 3_500_00000000,   // $3,500 with 8 decimals
                "ICP" => 15_00000000,      // $15 with 8 decimals
                "SOL" => 150_00000000,     // $150 with 8 decimals
                "GOLD" => 2_000_00000000,  // $2,000 with 8 decimals
                "USDC" => 1_00000000,      // $1 with 8 decimals
                _ => 100_00000000,         // Default $100 with 8 decimals
            };

            let asset_price = AssetPrice {
                asset_id: assets_to_update[i].clone(),
                price_usd: mock_price,
                timestamp: current_time,
                source: "mock_oracle".to_string(),
                confidence: 95,
            };

            PRICE_STORAGE.with(|p| p.borrow_mut().insert(assets_to_update[i].clone(), asset_price.clone()));
            prices.push(asset_price);
        }
    }

    Ok(prices)
}

async fn fetch_price_from_oracle(ticker: &str) -> Result<u64, String> {
    // Mock prices for development
    let mock_price = match ticker {
        "BTC" => 65_000_00000000,  // $65,000 with 8 decimals
        "ETH" => 3_500_00000000,   // $3,500 with 8 decimals
        "ICP" => 15_00000000,      // $15 with 8 decimals
        "SOL" => 150_00000000,     // $150 with 8 decimals
        "GOLD" => 2_000_00000000,  // $2,000 with 8 decimals
        "USDC" => 1_00000000,      // $1 with 8 decimals
        _ => 100_00000000,         // Default $100 with 8 decimals
    };

    Ok(mock_price)
}

#[query]
pub fn get_cached_price(asset_id: AssetId) -> Option<AssetPrice> {
    PRICE_STORAGE.with(|p| p.borrow().get(&asset_id))
}

pub fn get_cached_price_if_valid(asset_id: &AssetId) -> Option<AssetPrice> {
    PRICE_STORAGE.with(|p| {
        let storage = p.borrow();
        if let Some(cached_price) = storage.get(asset_id) {
            let age = time() - cached_price.timestamp;
            if age < DEFAULT_CACHE_DURATION_NS {
                Some(cached_price)
            } else {
                None
            }
        } else {
            None
        }
    })
}

pub fn is_price_stale(asset_id: &AssetId, max_staleness: Option<u64>) -> bool {
    let max_staleness = max_staleness.unwrap_or(DEFAULT_MAX_STALENESS_NS);

    PRICE_STORAGE.with(|p| {
        let storage = p.borrow();
        if let Some(cached_price) = storage.get(asset_id) {
            let age = time() - cached_price.timestamp;
            age > max_staleness
        } else {
            true
        }
    })
}

pub fn refresh_expired_prices() -> Vec<AssetId> {
    let mut expired_assets = Vec::new();

    PRICE_STORAGE.with(|p| {
        let storage = p.borrow();
        for (asset_id, price) in storage.iter() {
            let age = time() - price.timestamp;
            if age > DEFAULT_CACHE_DURATION_NS {
                expired_assets.push(asset_id);
            }
        }
    });

    expired_assets
}

#[query]
pub fn get_cache_statistics() -> CacheStatistics {
    let current_time = time();
    let mut total_entries = 0;
    let mut valid_entries = 0;
    let mut expired_entries = 0;
    let mut oldest_entry_age = 0u64;

    PRICE_STORAGE.with(|p| {
        let storage = p.borrow();
        total_entries = storage.len() as u32;

        for (_, price) in storage.iter() {
            let age = current_time - price.timestamp;

            if age < DEFAULT_CACHE_DURATION_NS {
                valid_entries += 1;
            } else {
                expired_entries += 1;
            }

            if age > oldest_entry_age {
                oldest_entry_age = age;
            }
        }
    });

    CacheStatistics {
        total_entries,
        valid_entries,
        expired_entries,
        cache_hit_rate: if total_entries > 0 {
            (valid_entries as f64 / total_entries as f64) * 100.0
        } else {
            0.0
        },
        oldest_entry_age_seconds: oldest_entry_age / 1_000_000_000,
        cache_duration_seconds: DEFAULT_CACHE_DURATION_NS / 1_000_000_000,
    }
}

#[query]
pub fn list_cached_prices() -> Vec<AssetPrice> {
    PRICE_STORAGE.with(|p| {
        p.borrow().iter().map(|(_, price)| price).collect()
    })
}

#[query]
pub fn list_valid_cached_prices() -> Vec<AssetPrice> {
    let current_time = time();
    PRICE_STORAGE.with(|p| {
        p.borrow().iter()
            .filter_map(|(_, price)| {
                let age = current_time - price.timestamp;
                if age < DEFAULT_CACHE_DURATION_NS {
                    Some(price)
                } else {
                    None
                }
            })
            .collect()
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