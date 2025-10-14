use candid::Principal;
use ic_cdk_macros::*;
use crate::types::*;
use crate::asset_registry;
use crate::bundle_manager;
use crate::nav_token;

#[query]
pub fn get_canister_info() -> CanisterInfo {
    CanisterInfo {
        version: "0.1.0".to_string(),
        total_assets: asset_registry::get_asset_count(),
        total_bundles: bundle_manager::get_bundle_count(),
        total_nav_tokens: nav_token::get_total_nav_token_supply(),
    }
}

#[query]
pub fn get_asset_summary() -> Vec<AssetSummary> {
    let assets = asset_registry::list_assets(Some(AssetFilter {
        active_only: true,
        category: None,
        payment_tokens_only: None,
    }));

    assets.into_iter().map(|asset| AssetSummary {
        id: asset.id.clone(),
        symbol: asset.symbol,
        name: asset.name,
        category: asset.metadata.category,
        token_location: asset.token_location,
        is_active: asset.is_active,
        bundles_using: bundle_manager::get_bundles_using_asset(&asset.id).len() as u32,
    }).collect()
}

#[update]
pub async fn get_bundle_summary(bundle_id: u64) -> Result<BundleSummary, String> {
    let bundle = bundle_manager::get_bundle(bundle_id)?;
    let total_tokens = nav_token::get_total_tokens_for_bundle(bundle_id).await?;
    let holder_count = nav_token::get_bundle_holder_count(bundle_id).await?;

    Ok(BundleSummary {
        id: bundle.id,
        name: bundle.name,
        creator: bundle.creator,
        created_at: bundle.created_at,
        allocations: bundle.allocations,
        total_nav_tokens: total_tokens,
        holder_count,
        is_active: bundle.is_active,
    })
}

pub async fn get_bundles_list() -> Vec<BundleListItem> {
    let bundles = bundle_manager::list_active_bundles();
    let mut result = Vec::new();

    for bundle in bundles {
        let (nav_per_token, total_nav_usd) = match crate::memory::get_cached_nav(bundle.id) {
            Some((nav, total)) => (nav, total),
            None => {
                match crate::nav_calculator::calculate_bundle_nav(bundle.id).await {
                    Ok(nav_data) => (nav_data.nav_per_token, nav_data.total_nav_usd),
                    Err(_) => (0, 0)
                }
            }
        };

        let holders = match crate::memory::get_cached_holder_count(bundle.id) {
            Some(count) => count,
            None => nav_token::get_bundle_holder_count(bundle.id).await.unwrap_or(0) as u64
        };

        result.push(BundleListItem {
            id: bundle.id,
            name: bundle.name,
            symbol: bundle.symbol,
            description: bundle.description,
            allocations: bundle.allocations,
            nav_per_token,
            total_nav_usd,
            holders,
            created_at: bundle.created_at,
            is_active: bundle.is_active,
            token_location: bundle.token_location,
        });
    }

    result
}

#[query]
pub fn get_user_portfolio(user: Principal) -> UserPortfolio {
    let nav_tokens = nav_token::get_user_nav_tokens(user);
    let created_bundles = bundle_manager::get_user_bundles(user);

    let holdings: Vec<NAVTokenHolding> = nav_tokens.into_iter().map(|token| {
        let bundle = bundle_manager::get_bundle(token.bundle_id)
            .unwrap_or_else(|_| BundleConfig {
                id: token.bundle_id,
                name: "Unknown Bundle".to_string(),
                symbol: "UNKNOWN".to_string(),
                token_location: TokenLocation::ICRC151 {
                    ledger: Principal::anonymous(),
                    token_id: vec![0u8; 32],
                },
                description: None,
                creator: Principal::anonymous(),
                allocations: vec![],
                created_at: 0,
                is_active: false,
                platform_fee_bps: Some(50),
            });

        NAVTokenHolding {
            bundle_id: token.bundle_id,
            bundle_name: bundle.name,
            amount: token.amount,
            last_updated: token.last_updated,
        }
    }).collect();

    let total_bundles_created = created_bundles.len() as u32;
    let total_nav_tokens_held = holdings.iter().map(|h| h.amount).sum();

    UserPortfolio {
        user,
        nav_token_holdings: holdings,
        created_bundles,
        total_bundles_created,
        total_nav_tokens_held,
    }
}

#[query]
pub fn search_assets(query: String) -> Vec<AssetInfo> {
    let all_assets = asset_registry::list_assets(None);
    let query_lower = query.to_lowercase();

    all_assets.into_iter()
        .filter(|asset| {
            asset.symbol.to_lowercase().contains(&query_lower) ||
            asset.name.to_lowercase().contains(&query_lower) ||
            asset.id.to_lowercase().contains(&query_lower)
        })
        .collect()
}

#[query]
pub fn search_bundles(query: String) -> Vec<BundleConfig> {
    let all_bundles = bundle_manager::list_active_bundles();
    let query_lower = query.to_lowercase();

    all_bundles.into_iter()
        .filter(|bundle| {
            bundle.name.to_lowercase().contains(&query_lower) ||
            bundle.description.as_ref()
                .map(|desc| desc.to_lowercase().contains(&query_lower))
                .unwrap_or(false)
        })
        .collect()
}