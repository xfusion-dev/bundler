use candid::{CandidType, Deserialize, Principal, encode_one, decode_one};
use serde::Serialize;
use ic_stable_structures::{Storable, storable::Bound};
use std::borrow::Cow;

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct GlobalState {
    pub version: u32,
    pub bundle_counter: u64,
    pub quote_counter: u64,
    pub transaction_counter: u64,
    pub admin_principal: Option<Principal>,
    pub oracle_config: Option<OracleConfig>,
    pub quote_service_principal: Option<Principal>,
    pub lending_canister: Option<Principal>,
    pub wrapper_canister: Option<Principal>,
    pub icrc151_ledger: Option<Principal>,
    pub icrc2_ckusdc_ledger: Option<Principal>,
}

impl Default for GlobalState {
    fn default() -> Self {
        Self {
            version: 1,
            bundle_counter: 0,
            quote_counter: 0,
            transaction_counter: 0,
            admin_principal: None,
            oracle_config: None,
            quote_service_principal: None,
            lending_canister: None,
            wrapper_canister: None,
            icrc151_ledger: None,
            icrc2_ckusdc_ledger: None,
        }
    }
}

impl Storable for GlobalState {
    fn to_bytes(&self) -> Cow<'_, [u8]> {
        let serialized = encode_one(self).expect("Failed to serialize GlobalState");
        Cow::Owned(serialized)
    }

    fn from_bytes(bytes: Cow<'_, [u8]>) -> Self {
        decode_one(&bytes).expect("Failed to deserialize GlobalState")
    }

    const BOUND: Bound = Bound::Bounded {
        max_size: 1024,
        is_fixed_size: false,
    };
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug, PartialEq)]
pub enum AssetStandard {
    ICRC2, // Includes ICP, ckBTC, ckUSDC, GLDT, etc. - all use ICRC-1 interface
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

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct CanisterStatus {
    pub is_admin_set: bool,
    pub total_assets: u64,
    pub total_bundles: u64,
    pub total_nav_tokens: u64,
    pub memory_usage: MemoryUsage,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct MemoryUsage {
    pub asset_registry_entries: u64,
    pub bundle_storage_entries: u64,
    pub nav_token_storage_entries: u64,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct AssetPrice {
    pub asset_id: AssetId,
    pub price_usd: u64,
    pub timestamp: u64,
    pub source: String,
    pub confidence: u8,
}

impl Storable for AssetPrice {
    fn to_bytes(&self) -> Cow<'_, [u8]> {
        let serialized = encode_one(self).expect("Failed to serialize AssetPrice");
        Cow::Owned(serialized)
    }

    fn from_bytes(bytes: Cow<'_, [u8]>) -> Self {
        decode_one(&bytes).expect("Failed to deserialize AssetPrice")
    }

    const BOUND: Bound = Bound::Bounded {
        max_size: 512,
        is_fixed_size: false,
    };
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct BundleNAV {
    pub bundle_id: u64,
    pub nav_per_token: u64,
    pub total_nav_usd: u64,
    pub total_tokens: u64,
    pub asset_values: Vec<AssetValue>,
    pub calculated_at: u64,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct AssetValue {
    pub asset_id: AssetId,
    pub amount: u64,
    pub value_usd: u64,
    pub percentage: f64,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct OracleConfig {
    pub oracle_canister: Principal,
    pub cache_duration_ns: u64,
    pub max_staleness_ns: u64,
    pub fallback_enabled: bool,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct CacheStatistics {
    pub total_entries: u32,
    pub valid_entries: u32,
    pub expired_entries: u32,
    pub cache_hit_rate: f64,
    pub oldest_entry_age_seconds: u64,
    pub cache_duration_seconds: u64,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct BundleHolding {
    pub bundle_id: u64,
    pub asset_id: AssetId,
    pub amount: u64,
    pub last_updated: u64,
}

impl Storable for BundleHolding {
    fn to_bytes(&self) -> Cow<'_, [u8]> {
        let serialized = encode_one(self).expect("Failed to serialize BundleHolding");
        Cow::Owned(serialized)
    }

    fn from_bytes(bytes: Cow<'_, [u8]>) -> Self {
        decode_one(&bytes).expect("Failed to deserialize BundleHolding")
    }

    const BOUND: Bound = Bound::Bounded {
        max_size: 256,
        is_fixed_size: false,
    };
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct AssetWithdrawal {
    pub asset_id: AssetId,
    pub amount: u64,
    pub remaining_in_bundle: u64,
    pub withdrawal_percentage: f64,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct WithdrawalAssetBreakdown {
    pub asset_id: AssetId,
    pub amount: u64,
    pub estimated_usd_value: u64,
    pub price_per_unit: u64,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct WithdrawalSimulation {
    pub bundle_id: u64,
    pub nav_tokens_to_redeem: u64,
    pub withdrawal_percentage: f64,
    pub estimated_total_usd_value: u64,
    pub asset_withdrawals: Vec<AssetWithdrawal>,
    pub asset_breakdown: Vec<WithdrawalAssetBreakdown>,
    pub calculated_at: u64,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct HoldingDrift {
    pub asset_id: AssetId,
    pub target_percentage: f64,
    pub actual_percentage: f64,
    pub drift_percentage: f64,
    pub holding_amount: u64,
    pub usd_value: u64,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct SupplyValidationResult {
    pub bundle_id: u64,
    pub recorded_total_supply: u64,
    pub calculated_total_supply: u64,
    pub is_consistent: bool,
    pub discrepancy: u64,
    pub validation_timestamp: u64,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct NAVPrecisionReport {
    pub bundle_id: u64,
    pub total_usd_value: u64,
    pub total_tokens: u64,
    pub nav_per_token_8_decimals: u64,
    pub nav_per_token_18_decimals: u64,
    pub formatted_nav_display: String,
    pub precision_loss_amount: u64,
    pub calculation_timestamp: u64,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct QuoteRequest {
    pub request_id: u64,
    pub user: Principal,
    pub bundle_id: u64,
    pub operation: OperationType,
    pub amount: u64,
    pub max_slippage: u8,
    pub expires_at: u64,
    pub created_at: u64,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub enum OperationType {
    Buy,
    Sell,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct QuoteAssignment {
    pub request_id: u64,
    pub resolver: Principal,
    pub nav_tokens: u64,
    pub ckusdc_amount: u64,
    pub estimated_nav: u64,
    pub fees: u64,
    pub valid_until: u64,
    pub assigned_at: u64,
}

impl Storable for QuoteRequest {
    fn to_bytes(&self) -> Cow<'_, [u8]> {
        let serialized = encode_one(self).expect("Failed to serialize QuoteRequest");
        Cow::Owned(serialized)
    }

    fn from_bytes(bytes: Cow<'_, [u8]>) -> Self {
        decode_one(&bytes).expect("Failed to deserialize QuoteRequest")
    }

    const BOUND: Bound = Bound::Bounded {
        max_size: 512,
        is_fixed_size: false,
    };
}

impl Storable for QuoteAssignment {
    fn to_bytes(&self) -> Cow<'_, [u8]> {
        let serialized = encode_one(self).expect("Failed to serialize QuoteAssignment");
        Cow::Owned(serialized)
    }

    fn from_bytes(bytes: Cow<'_, [u8]>) -> Self {
        decode_one(&bytes).expect("Failed to deserialize QuoteAssignment")
    }

    const BOUND: Bound = Bound::Bounded {
        max_size: 512,
        is_fixed_size: false,
    };
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct Transaction {
    pub id: u64,
    pub request_id: u64,
    pub user: Principal,
    pub resolver: Principal,
    pub bundle_id: u64,
    pub operation: OperationType,
    pub status: TransactionStatus,
    pub nav_tokens: u64,
    pub ckusdc_amount: u64,
    pub created_at: u64,
    pub updated_at: u64,
    pub completed_at: Option<u64>,
    pub timeout_at: u64,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug, PartialEq)]
pub enum TransactionStatus {
    Pending,
    FundsLocked,
    WaitingForResolver,
    InProgress,
    AssetsTransferred,
    Completed,
    Failed,
    TimedOut,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct LockedFunds {
    pub user: Principal,
    pub transaction_id: u64,
    pub fund_type: LockedFundType,
    pub amount: u64,
    pub locked_at: u64,
    pub expires_at: u64,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug, PartialEq)]
pub enum LockedFundType {
    CkUSDC,
    NAVTokens { bundle_id: u64 },
}

impl Storable for Transaction {
    fn to_bytes(&self) -> Cow<'_, [u8]> {
        let serialized = encode_one(self).expect("Failed to serialize Transaction");
        Cow::Owned(serialized)
    }

    fn from_bytes(bytes: Cow<'_, [u8]>) -> Self {
        decode_one(&bytes).expect("Failed to deserialize Transaction")
    }

    const BOUND: Bound = Bound::Bounded {
        max_size: 512,
        is_fixed_size: false,
    };
}

impl Storable for LockedFunds {
    fn to_bytes(&self) -> Cow<'_, [u8]> {
        let serialized = encode_one(self).expect("Failed to serialize LockedFunds");
        Cow::Owned(serialized)
    }

    fn from_bytes(bytes: Cow<'_, [u8]>) -> Self {
        decode_one(&bytes).expect("Failed to deserialize LockedFunds")
    }

    const BOUND: Bound = Bound::Bounded {
        max_size: 256,
        is_fixed_size: false,
    };
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct TransactionSummary {
    pub id: u64,
    pub user: Principal,
    pub bundle_id: u64,
    pub operation: OperationType,
    pub status: TransactionStatus,
    pub nav_tokens: u64,
    pub ckusdc_amount: u64,
    pub created_at: u64,
    pub duration_ms: Option<u64>,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct TransactionStats {
    pub total_transactions: u64,
    pub completed_transactions: u64,
    pub failed_transactions: u64,
    pub pending_transactions: u64,
    pub total_volume_ckusdc: u64,
    pub total_nav_tokens_minted: u64,
    pub total_nav_tokens_burned: u64,
    pub average_completion_time_ms: u64,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct BundleTransactionHistory {
    pub bundle_id: u64,
    pub total_buy_transactions: u64,
    pub total_sell_transactions: u64,
    pub total_volume_bought: u64,
    pub total_volume_sold: u64,
    pub last_transaction_at: Option<u64>,
    pub active_transactions: u32,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct UserTransactionSummary {
    pub user: Principal,
    pub total_transactions: u64,
    pub buy_transactions: u64,
    pub sell_transactions: u64,
    pub total_volume_ckusdc: u64,
    pub current_locked_funds: u64,
    pub last_transaction_at: Option<u64>,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct QuoteStatistics {
    pub total_requests: u32,
    pub pending_requests: u32,
    pub assigned_requests: u32,
    pub expired_requests: u32,
    pub expired_assignments: u32,
}