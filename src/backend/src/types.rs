use candid::{CandidType, Deserialize, Principal};
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