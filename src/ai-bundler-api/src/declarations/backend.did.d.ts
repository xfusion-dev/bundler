import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export interface AssetAllocation {
  'token_location' : TokenLocation,
  'asset_id' : string,
  'percentage' : number,
}
export interface AssetAllocationInput {
  'asset_id' : string,
  'percentage' : number,
}
export interface AssetAmount { 'asset_id' : string, 'amount' : bigint }
export type AssetCategory = { 'RWA' : null } |
  { 'Stablecoin' : null } |
  { 'Stocks' : null } |
  { 'LiquidStaking' : null } |
  { 'Yield' : null } |
  { 'Cryptocurrency' : null } |
  { 'CommodityBacked' : null } |
  { 'Other' : string };
export interface AssetFilter {
  'payment_tokens_only' : [] | [boolean],
  'category' : [] | [AssetCategory],
  'active_only' : boolean,
}
export interface AssetInfo {
  'id' : string,
  'decimals' : number,
  'metadata' : AssetMetadata,
  'name' : string,
  'added_at' : bigint,
  'token_location' : TokenLocation,
  'is_active' : boolean,
  'oracle_ticker' : [] | [string],
  'symbol' : string,
}
export interface AssetInfoUpdate {
  'metadata' : [] | [AssetMetadata],
  'name' : [] | [string],
  'is_active' : [] | [boolean],
  'oracle_ticker' : [] | [string],
}
export interface AssetMetadata {
  'description' : [] | [string],
  'website' : [] | [string],
  'logo_url' : [] | [string],
  'category' : AssetCategory,
}
export interface AssetPrice {
  'source' : string,
  'timestamp' : bigint,
  'asset_id' : string,
  'confidence' : number,
  'price_usd' : bigint,
}
export interface AssetSummary {
  'id' : string,
  'bundles_using' : number,
  'name' : string,
  'token_location' : TokenLocation,
  'category' : AssetCategory,
  'is_active' : boolean,
  'symbol' : string,
}
export interface AssetValue {
  'value_usd' : bigint,
  'asset_id' : string,
  'amount' : bigint,
  'percentage' : number,
}
export interface BundleConfig {
  'id' : bigint,
  'creator' : Principal,
  'name' : string,
  'description' : [] | [string],
  'created_at' : bigint,
  'platform_fee_bps' : [] | [bigint],
  'token_location' : TokenLocation,
  'allocations' : Array<AssetAllocation>,
  'is_active' : boolean,
  'symbol' : string,
}
export interface BundleCreationRequest {
  'name' : string,
  'description' : [] | [string],
  'icrc151_ledger' : Principal,
  'allocations' : Array<AssetAllocationInput>,
  'symbol' : string,
}
export interface BundleHolding {
  'bundle_id' : bigint,
  'last_updated' : bigint,
  'asset_id' : string,
  'amount' : bigint,
}
export interface BundleListItem {
  'id' : bigint,
  'nav_per_token' : bigint,
  'name' : string,
  'description' : [] | [string],
  'created_at' : bigint,
  'total_nav_usd' : bigint,
  'token_location' : TokenLocation,
  'allocations' : Array<AssetAllocation>,
  'holders' : bigint,
  'is_active' : boolean,
  'symbol' : string,
}
export interface BundleNAV {
  'asset_values' : Array<AssetValue>,
  'nav_per_token' : bigint,
  'bundle_id' : bigint,
  'total_nav_usd' : bigint,
  'calculated_at' : bigint,
  'total_tokens' : bigint,
}
export interface BundleSummary {
  'id' : bigint,
  'creator' : Principal,
  'name' : string,
  'created_at' : bigint,
  'holder_count' : number,
  'allocations' : Array<AssetAllocation>,
  'is_active' : boolean,
  'total_nav_tokens' : bigint,
}
export interface BundleTransactionHistory {
  'total_sell_transactions' : bigint,
  'total_buy_transactions' : bigint,
  'bundle_id' : bigint,
  'active_transactions' : number,
  'total_volume_bought' : bigint,
  'last_transaction_at' : [] | [bigint],
  'total_volume_sold' : bigint,
}
export interface CacheStatistics {
  'total_entries' : number,
  'cache_hit_rate' : number,
  'valid_entries' : number,
  'expired_entries' : number,
  'oldest_entry_age_seconds' : bigint,
  'cache_duration_seconds' : bigint,
}
export interface CanisterInfo {
  'version' : string,
  'total_assets' : bigint,
  'total_bundles' : bigint,
  'total_nav_tokens' : bigint,
}
export interface CanisterStatus {
  'total_assets' : bigint,
  'is_admin_set' : boolean,
  'total_bundles' : bigint,
  'memory_usage' : MemoryUsage,
  'total_nav_tokens' : bigint,
}
export type LockedFundType = { 'NAVTokens' : { 'bundle_id' : bigint } } |
  { 'CkUSDC' : null };
export interface LockedFunds {
  'transaction_id' : bigint,
  'fund_type' : LockedFundType,
  'locked_at' : bigint,
  'user' : Principal,
  'amount' : bigint,
  'expires_at' : bigint,
}
export interface MemoryUsage {
  'asset_registry_entries' : bigint,
  'bundle_storage_entries' : bigint,
}
export interface NAVPrecisionReport {
  'nav_per_token_18_decimals' : bigint,
  'bundle_id' : bigint,
  'calculation_timestamp' : bigint,
  'nav_per_token_8_decimals' : bigint,
  'formatted_nav_display' : string,
  'total_usd_value' : bigint,
  'total_tokens' : bigint,
  'precision_loss_amount' : bigint,
}
export interface NAVTokenHolding {
  'bundle_name' : string,
  'bundle_id' : bigint,
  'last_updated' : bigint,
  'amount' : bigint,
}
export type OperationType = { 'Buy' : { 'ckusdc_amount' : bigint } } |
  { 'Sell' : { 'nav_tokens' : bigint } } |
  { 'InitialBuy' : { 'usd_amount' : bigint, 'nav_tokens' : bigint } };
export interface OracleConfig {
  'oracle_canister' : Principal,
  'max_staleness_ns' : bigint,
  'cache_duration_ns' : bigint,
  'fallback_enabled' : boolean,
}
export interface QuoteAssignment {
  'request_id' : bigint,
  'resolver' : Principal,
  'asset_amounts' : Array<AssetAmount>,
  'fees' : bigint,
  'ckusdc_amount' : bigint,
  'assigned_at' : bigint,
  'valid_until' : bigint,
  'estimated_nav' : bigint,
  'nav_tokens' : bigint,
}
export interface QuoteObject {
  'resolver' : Principal,
  'asset_amounts' : Array<AssetAmount>,
  'bundle_id' : bigint,
  'fees' : bigint,
  'ckusdc_amount' : bigint,
  'coordinator_signature' : Uint8Array | number[],
  'valid_until' : bigint,
  'nonce' : bigint,
  'operation' : OperationType,
  'nav_tokens' : bigint,
}
export interface RecoveryReport {
  'recovered_assets' : Array<[string, bigint]>,
  'recovered_ckusdc' : bigint,
  'user' : Principal,
  'timestamp' : bigint,
  'recovered_nav_tokens' : bigint,
}
export interface RecoveryStatistics {
  'recoveries_last_24h' : number,
  'success_rate' : number,
  'average_recovery_time_ms' : bigint,
  'total_recoveries' : number,
}
export interface ResolverInfo {
  'principal' : Principal,
  'failed_transactions' : bigint,
  'name' : string,
  'last_active' : bigint,
  'fee_rate' : bigint,
  'total_volume_processed' : bigint,
  'is_active' : boolean,
  'registered_at' : bigint,
  'successful_transactions' : bigint,
}
export interface ResolverStatistics {
  'total_resolvers' : bigint,
  'active_resolvers' : bigint,
  'total_volume_processed' : bigint,
  'total_transactions' : bigint,
}
export type Result = { 'Ok' : null } |
  { 'Err' : string };
export type Result_1 = { 'Ok' : BundleNAV } |
  { 'Err' : string };
export type Result_10 = { 'Ok' : NAVPrecisionReport } |
  { 'Err' : string };
export type Result_11 = { 'Ok' : ResolverInfo } |
  { 'Err' : string };
export type Result_12 = { 'Ok' : Transaction } |
  { 'Err' : string };
export type Result_13 = { 'Ok' : TransactionSummary } |
  { 'Err' : string };
export type Result_14 = { 'Ok' : Array<[LockedFundType, bigint]> } |
  { 'Err' : string };
export type Result_2 = { 'Ok' : bigint } |
  { 'Err' : string };
export type Result_3 = { 'Ok' : number } |
  { 'Err' : string };
export type Result_4 = { 'Ok' : RecoveryReport } |
  { 'Err' : string };
export type Result_5 = { 'Ok' : AssetInfo } |
  { 'Err' : string };
export type Result_6 = { 'Ok' : AssetPrice } |
  { 'Err' : string };
export type Result_7 = { 'Ok' : QuoteAssignment } |
  { 'Err' : string };
export type Result_8 = { 'Ok' : BundleConfig } |
  { 'Err' : string };
export type Result_9 = { 'Ok' : BundleSummary } |
  { 'Err' : string };
export type TokenLocation = {
    'ICRC151' : { 'token_id' : Uint8Array | number[], 'ledger' : Principal }
  } |
  { 'ICRC2' : { 'ledger' : Principal } };
export interface Transaction {
  'id' : bigint,
  'request_id' : bigint,
  'status' : TransactionStatus,
  'resolver' : Principal,
  'updated_at' : bigint,
  'bundle_id' : bigint,
  'user' : Principal,
  'created_at' : bigint,
  'timeout_at' : bigint,
  'ckusdc_amount' : bigint,
  'operation' : OperationType,
  'completed_at' : [] | [bigint],
  'nav_tokens' : bigint,
}
export interface TransactionStats {
  'total_nav_tokens_burned' : bigint,
  'failed_transactions' : bigint,
  'total_volume_ckusdc' : bigint,
  'average_completion_time_ms' : bigint,
  'pending_transactions' : bigint,
  'total_nav_tokens_minted' : bigint,
  'total_transactions' : bigint,
  'completed_transactions' : bigint,
}
export type TransactionStatus = { 'Failed' : null } |
  { 'FundsLocked' : null } |
  { 'WaitingForResolver' : null } |
  { 'TimedOut' : null } |
  { 'InProgress' : null } |
  { 'AssetsTransferred' : null } |
  { 'Completed' : null } |
  { 'Pending' : null };
export interface TransactionSummary {
  'id' : bigint,
  'status' : TransactionStatus,
  'bundle_id' : bigint,
  'user' : Principal,
  'created_at' : bigint,
  'ckusdc_amount' : bigint,
  'operation' : OperationType,
  'duration_ms' : [] | [bigint],
  'nav_tokens' : bigint,
}
export interface UserPortfolio {
  'total_bundles_created' : number,
  'user' : Principal,
  'nav_token_holdings' : Array<NAVTokenHolding>,
  'created_bundles' : Array<BundleConfig>,
  'total_nav_tokens_held' : bigint,
}
export interface UserTransactionSummary {
  'buy_transactions' : bigint,
  'sell_transactions' : bigint,
  'current_locked_funds' : bigint,
  'user' : Principal,
  'total_volume_ckusdc' : bigint,
  'last_transaction_at' : [] | [bigint],
  'total_transactions' : bigint,
}
export interface _SERVICE {
  'add_asset' : ActorMethod<
    [
      string,
      string,
      string,
      TokenLocation,
      [] | [string],
      number,
      AssetMetadata,
    ],
    Result
  >,
  'calculate_bundle_nav' : ActorMethod<[bigint], Result_1>,
  'check_asset_allowance' : ActorMethod<[string, Principal], Result_2>,
  'check_ckusdc_allowance' : ActorMethod<[Principal], Result_2>,
  'cleanup_expired_locks' : ActorMethod<[], Result_3>,
  'cleanup_expired_transactions' : ActorMethod<[], Result_3>,
  'cleanup_inactive_bundles' : ActorMethod<[], Result_3>,
  'clear_price_cache' : ActorMethod<[], Result_3>,
  'confirm_asset_deposit' : ActorMethod<[bigint], Result>,
  'confirm_ckusdc_payment' : ActorMethod<[bigint], Result>,
  'confirm_resolver_payment_and_complete_sell' : ActorMethod<[bigint], Result>,
  'create_bundle' : ActorMethod<[BundleCreationRequest], Result_2>,
  'deactivate_asset' : ActorMethod<[string], Result>,
  'detect_and_recover_timeouts' : ActorMethod<[], Result_3>,
  'dissolve_nav_tokens' : ActorMethod<[bigint], Result>,
  'emergency_pause_canister' : ActorMethod<[], Result>,
  'emergency_recovery' : ActorMethod<[[] | [Principal]], Result_4>,
  'emergency_unpause_canister' : ActorMethod<[], Result>,
  'execute_quote' : ActorMethod<[QuoteObject], Result_2>,
  'extend_lock_expiration' : ActorMethod<
    [bigint, LockedFundType, bigint],
    Result
  >,
  'force_deactivate_bundle' : ActorMethod<[bigint, string], Result>,
  'format_nav_display' : ActorMethod<[bigint, number], string>,
  'get_active_resolvers' : ActorMethod<[], Array<ResolverInfo>>,
  'get_admin' : ActorMethod<[], [] | [Principal]>,
  'get_asset' : ActorMethod<[string], Result_5>,
  'get_asset_price' : ActorMethod<[string], Result_6>,
  'get_asset_summary' : ActorMethod<[], Array<AssetSummary>>,
  'get_assignment' : ActorMethod<[bigint], Result_7>,
  'get_bundle' : ActorMethod<[bigint], Result_8>,
  'get_bundle_holdings' : ActorMethod<[bigint], Array<BundleHolding>>,
  'get_bundle_summary' : ActorMethod<[bigint], Result_9>,
  'get_bundle_transaction_history' : ActorMethod<
    [bigint],
    BundleTransactionHistory
  >,
  'get_bundles_list' : ActorMethod<[], Array<BundleListItem>>,
  'get_cache_statistics' : ActorMethod<[], CacheStatistics>,
  'get_cached_price' : ActorMethod<[string], [] | [AssetPrice]>,
  'get_canister_info' : ActorMethod<[], CanisterInfo>,
  'get_canister_status' : ActorMethod<[], CanisterStatus>,
  'get_current_week' : ActorMethod<[], bigint>,
  'get_default_platform_fee_bps' : ActorMethod<[], bigint>,
  'get_leaderboard' : ActorMethod<
    [[] | [bigint], bigint],
    Array<[Principal, bigint]>
  >,
  'get_lock_expiration_time' : ActorMethod<[bigint, LockedFundType], Result_2>,
  'get_nav_precision_report' : ActorMethod<[bigint], Result_10>,
  'get_oracle_config' : ActorMethod<[], [] | [OracleConfig]>,
  'get_platform_treasury' : ActorMethod<[], [] | [Principal]>,
  'get_portfolio_value' : ActorMethod<[[] | [Principal]], Result_2>,
  'get_recent_transactions' : ActorMethod<[bigint], Array<TransactionSummary>>,
  'get_recovery_statistics' : ActorMethod<[], RecoveryStatistics>,
  'get_resolver' : ActorMethod<[Principal], Result_11>,
  'get_resolver_statistics' : ActorMethod<[], ResolverStatistics>,
  'get_transaction' : ActorMethod<[bigint], Result_12>,
  'get_transaction_stats' : ActorMethod<[], TransactionStats>,
  'get_transaction_summary' : ActorMethod<[bigint], Result_13>,
  'get_transactions_by_status' : ActorMethod<
    [TransactionStatus],
    Array<Transaction>
  >,
  'get_user_bundles' : ActorMethod<[Principal], Array<BundleConfig>>,
  'get_user_locked_funds' : ActorMethod<[Principal], Array<LockedFunds>>,
  'get_user_points' : ActorMethod<[[] | [Principal]], bigint>,
  'get_user_portfolio' : ActorMethod<[Principal], UserPortfolio>,
  'get_user_total_locked_amount' : ActorMethod<
    [Principal, LockedFundType],
    bigint
  >,
  'get_user_transaction_summary' : ActorMethod<
    [Principal],
    UserTransactionSummary
  >,
  'get_user_transactions' : ActorMethod<[Principal], Array<Transaction>>,
  'get_user_weekly_points' : ActorMethod<[[] | [Principal], bigint], bigint>,
  'is_fund_already_locked' : ActorMethod<[bigint, LockedFundType], boolean>,
  'list_active_bundles' : ActorMethod<[], Array<BundleConfig>>,
  'list_assets' : ActorMethod<[[] | [AssetFilter]], Array<AssetInfo>>,
  'list_cached_prices' : ActorMethod<[], Array<AssetPrice>>,
  'list_valid_cached_prices' : ActorMethod<[], Array<AssetPrice>>,
  'lock_user_funds_with_validation' : ActorMethod<
    [bigint, LockedFundType, bigint],
    Result
  >,
  'register_resolver' : ActorMethod<[Principal, string, bigint], Result>,
  'search_assets' : ActorMethod<[string], Array<AssetInfo>>,
  'search_bundles' : ActorMethod<[string], Array<BundleConfig>>,
  'set_admin' : ActorMethod<[Principal], Result>,
  'set_bundle_platform_fee' : ActorMethod<[bigint, bigint], Result>,
  'set_coordinator_public_key' : ActorMethod<[string], Result>,
  'set_default_platform_fee_bps' : ActorMethod<[bigint], Result>,
  'set_oracle_config' : ActorMethod<[OracleConfig], Result>,
  'set_platform_treasury' : ActorMethod<[Principal], Result>,
  'set_quote_api_principal' : ActorMethod<[Principal], Result>,
  'unlock_all_transaction_funds' : ActorMethod<[bigint], Result_14>,
  'update_asset' : ActorMethod<[string, AssetInfoUpdate], Result>,
  'update_asset_token_location' : ActorMethod<[string, TokenLocation], Result>,
  'update_resolver_status' : ActorMethod<[Principal, boolean], Result>,
  'validate_sufficient_balance' : ActorMethod<
    [Principal, LockedFundType, bigint],
    Result
  >,
  'validate_transaction_integrity' : ActorMethod<[bigint], Result>,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
