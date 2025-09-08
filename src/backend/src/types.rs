use candid::{CandidType, Deserialize, Principal, encode_one, decode_one};
use serde::Serialize;
use ic_stable_structures::{Storable, storable::Bound};
use std::borrow::Cow;

#[derive(CandidType, Serialize, Deserialize, Clone, Debug, PartialEq)]
pub enum AssetStandard {
    ICRC2,
    MTLS { asset_id: u64 },
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug, PartialEq)]
pub enum AssetCategory {
    Cryptocurrency,
    Stablecoin,
    CommodityBacked,
    Stocks,
    Other(String),
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct AssetMetadata {
    pub logo_url: Option<String>,
    pub website: Option<String>,
    pub description: Option<String>,
    pub category: AssetCategory,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct AssetInfo {
    pub id: AssetId,
    pub symbol: String,
    pub name: String,
    pub standard: AssetStandard,
    pub ledger_canister: Principal,
    pub minter_canister: Option<Principal>,
    pub oracle_ticker: Option<String>,
    pub decimals: u8,
    pub is_active: bool,
    pub added_at: u64,
    pub metadata: AssetMetadata,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug, PartialEq, Eq, Hash, PartialOrd, Ord)]
pub struct AssetId(pub String);

impl Storable for AssetId {
    fn to_bytes(&self) -> Cow<'_, [u8]> {
        Cow::Owned(self.0.as_bytes().to_vec())
    }

    fn from_bytes(bytes: Cow<'_, [u8]>) -> Self {
        Self(String::from_utf8(bytes.to_vec()).expect("Invalid UTF-8"))
    }

    const BOUND: Bound = Bound::Bounded {
        max_size: 100,
        is_fixed_size: false,
    };
}

impl Storable for AssetInfo {
    fn to_bytes(&self) -> Cow<'_, [u8]> {
        let serialized = candid::encode_one(self).expect("Failed to serialize AssetInfo");
        Cow::Owned(serialized)
    }

    fn from_bytes(bytes: Cow<'_, [u8]>) -> Self {
        candid::decode_one(&bytes).expect("Failed to deserialize AssetInfo")
    }

    const BOUND: Bound = Bound::Bounded {
        max_size: 2048,
        is_fixed_size: false,
    };
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct AssetInfoUpdate {
    pub name: Option<String>,
    pub oracle_ticker: Option<String>,
    pub minter_canister: Option<Principal>,
    pub is_active: Option<bool>,
    pub metadata: Option<AssetMetadata>,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct AssetFilter {
    pub active_only: bool,
    pub category: Option<AssetCategory>,
    pub standard: Option<AssetStandard>,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct AssetAllocation {
    pub asset_id: AssetId,
    pub percentage: u8,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct BundleConfig {
    pub id: u64,
    pub name: String,
    pub description: Option<String>,
    pub creator: Principal,
    pub allocations: Vec<AssetAllocation>,
    pub created_at: u64,
    pub is_active: bool,
}

impl Storable for BundleConfig {
    fn to_bytes(&self) -> Cow<'_, [u8]> {
        let serialized = encode_one(self).expect("Failed to serialize BundleConfig");
        Cow::Owned(serialized)
    }

    fn from_bytes(bytes: Cow<'_, [u8]>) -> Self {
        decode_one(&bytes).expect("Failed to deserialize BundleConfig")
    }

    const BOUND: Bound = Bound::Bounded {
        max_size: 4096,
        is_fixed_size: false,
    };
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct XFusionNAVToken {
    pub bundle_id: u64,
    pub owner: Principal,
    pub amount: u64,
    pub last_updated: u64,
}

impl Storable for XFusionNAVToken {
    fn to_bytes(&self) -> Cow<'_, [u8]> {
        let serialized = encode_one(self).expect("Failed to serialize XFusionNAVToken");
        Cow::Owned(serialized)
    }

    fn from_bytes(bytes: Cow<'_, [u8]>) -> Self {
        decode_one(&bytes).expect("Failed to deserialize XFusionNAVToken")
    }

    const BOUND: Bound = Bound::Bounded {
        max_size: 256,
        is_fixed_size: false,
    };
}

pub fn nav_token_key(user: Principal, bundle_id: u64) -> String {
    format!("{}:{}", user.to_text(), bundle_id)
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct CanisterInfo {
    pub version: String,
    pub total_assets: u64,
    pub total_bundles: u64,
    pub total_nav_tokens: u64,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct AssetSummary {
    pub id: AssetId,
    pub symbol: String,
    pub name: String,
    pub category: AssetCategory,
    pub standard: AssetStandard,
    pub is_active: bool,
    pub bundles_using: u32,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct BundleSummary {
    pub id: u64,
    pub name: String,
    pub creator: Principal,
    pub created_at: u64,
    pub allocations: Vec<AssetAllocation>,
    pub total_nav_tokens: u64,
    pub holder_count: u32,
    pub is_active: bool,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct NAVTokenHolding {
    pub bundle_id: u64,
    pub bundle_name: String,
    pub amount: u64,
    pub last_updated: u64,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct UserPortfolio {
    pub user: Principal,
    pub nav_token_holdings: Vec<NAVTokenHolding>,
    pub created_bundles: Vec<BundleConfig>,
    pub total_bundles_created: u32,
    pub total_nav_tokens_held: u64,
}