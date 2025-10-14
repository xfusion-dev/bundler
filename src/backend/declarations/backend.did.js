export const idlFactory = ({ IDL }) => {
  const TokenLocation = IDL.Variant({
    'ICRC151' : IDL.Record({
      'token_id' : IDL.Vec(IDL.Nat8),
      'ledger' : IDL.Principal,
    }),
    'ICRC2' : IDL.Record({ 'ledger' : IDL.Principal }),
  });
  const AssetCategory = IDL.Variant({
    'RWA' : IDL.Null,
    'Stablecoin' : IDL.Null,
    'Stocks' : IDL.Null,
    'LiquidStaking' : IDL.Null,
    'Yield' : IDL.Null,
    'Cryptocurrency' : IDL.Null,
    'CommodityBacked' : IDL.Null,
    'Other' : IDL.Text,
  });
  const AssetMetadata = IDL.Record({
    'description' : IDL.Opt(IDL.Text),
    'website' : IDL.Opt(IDL.Text),
    'logo_url' : IDL.Opt(IDL.Text),
    'category' : AssetCategory,
  });
  const Result = IDL.Variant({ 'Ok' : IDL.Null, 'Err' : IDL.Text });
  const AssetValue = IDL.Record({
    'value_usd' : IDL.Nat64,
    'asset_id' : IDL.Text,
    'amount' : IDL.Nat64,
    'percentage' : IDL.Float64,
  });
  const BundleNAV = IDL.Record({
    'asset_values' : IDL.Vec(AssetValue),
    'nav_per_token' : IDL.Nat64,
    'bundle_id' : IDL.Nat64,
    'total_nav_usd' : IDL.Nat64,
    'calculated_at' : IDL.Nat64,
    'total_tokens' : IDL.Nat64,
  });
  const Result_1 = IDL.Variant({ 'Ok' : BundleNAV, 'Err' : IDL.Text });
  const Result_2 = IDL.Variant({ 'Ok' : IDL.Nat64, 'Err' : IDL.Text });
  const Result_3 = IDL.Variant({ 'Ok' : IDL.Nat32, 'Err' : IDL.Text });
  const AssetAllocationInput = IDL.Record({
    'asset_id' : IDL.Text,
    'percentage' : IDL.Nat8,
  });
  const BundleCreationRequest = IDL.Record({
    'name' : IDL.Text,
    'description' : IDL.Opt(IDL.Text),
    'icrc151_ledger' : IDL.Principal,
    'allocations' : IDL.Vec(AssetAllocationInput),
    'symbol' : IDL.Text,
  });
  const RecoveryReport = IDL.Record({
    'recovered_assets' : IDL.Vec(IDL.Tuple(IDL.Text, IDL.Nat64)),
    'recovered_ckusdc' : IDL.Nat64,
    'user' : IDL.Principal,
    'timestamp' : IDL.Nat64,
    'recovered_nav_tokens' : IDL.Nat64,
  });
  const Result_4 = IDL.Variant({ 'Ok' : RecoveryReport, 'Err' : IDL.Text });
  const AssetAmount = IDL.Record({
    'asset_id' : IDL.Text,
    'amount' : IDL.Nat64,
  });
  const OperationType = IDL.Variant({
    'Buy' : IDL.Record({ 'ckusdc_amount' : IDL.Nat64 }),
    'Sell' : IDL.Record({ 'nav_tokens' : IDL.Nat64 }),
    'InitialBuy' : IDL.Record({
      'usd_amount' : IDL.Nat64,
      'nav_tokens' : IDL.Nat64,
    }),
  });
  const QuoteObject = IDL.Record({
    'resolver' : IDL.Principal,
    'asset_amounts' : IDL.Vec(AssetAmount),
    'bundle_id' : IDL.Nat64,
    'fees' : IDL.Nat64,
    'ckusdc_amount' : IDL.Nat64,
    'coordinator_signature' : IDL.Vec(IDL.Nat8),
    'valid_until' : IDL.Nat64,
    'nonce' : IDL.Nat64,
    'operation' : OperationType,
    'nav_tokens' : IDL.Nat64,
  });
  const LockedFundType = IDL.Variant({
    'NAVTokens' : IDL.Record({ 'bundle_id' : IDL.Nat64 }),
    'CkUSDC' : IDL.Null,
  });
  const ResolverInfo = IDL.Record({
    'principal' : IDL.Principal,
    'failed_transactions' : IDL.Nat64,
    'name' : IDL.Text,
    'last_active' : IDL.Nat64,
    'fee_rate' : IDL.Nat64,
    'total_volume_processed' : IDL.Nat64,
    'is_active' : IDL.Bool,
    'registered_at' : IDL.Nat64,
    'successful_transactions' : IDL.Nat64,
  });
  const AssetInfo = IDL.Record({
    'id' : IDL.Text,
    'decimals' : IDL.Nat8,
    'metadata' : AssetMetadata,
    'name' : IDL.Text,
    'added_at' : IDL.Nat64,
    'token_location' : TokenLocation,
    'is_active' : IDL.Bool,
    'oracle_ticker' : IDL.Opt(IDL.Text),
    'symbol' : IDL.Text,
  });
  const Result_5 = IDL.Variant({ 'Ok' : AssetInfo, 'Err' : IDL.Text });
  const AssetPrice = IDL.Record({
    'source' : IDL.Text,
    'timestamp' : IDL.Nat64,
    'asset_id' : IDL.Text,
    'confidence' : IDL.Nat8,
    'price_usd' : IDL.Nat64,
  });
  const Result_6 = IDL.Variant({ 'Ok' : AssetPrice, 'Err' : IDL.Text });
  const AssetSummary = IDL.Record({
    'id' : IDL.Text,
    'bundles_using' : IDL.Nat32,
    'name' : IDL.Text,
    'token_location' : TokenLocation,
    'category' : AssetCategory,
    'is_active' : IDL.Bool,
    'symbol' : IDL.Text,
  });
  const QuoteAssignment = IDL.Record({
    'request_id' : IDL.Nat64,
    'resolver' : IDL.Principal,
    'asset_amounts' : IDL.Vec(AssetAmount),
    'fees' : IDL.Nat64,
    'ckusdc_amount' : IDL.Nat64,
    'assigned_at' : IDL.Nat64,
    'valid_until' : IDL.Nat64,
    'estimated_nav' : IDL.Nat64,
    'nav_tokens' : IDL.Nat64,
  });
  const Result_7 = IDL.Variant({ 'Ok' : QuoteAssignment, 'Err' : IDL.Text });
  const AssetAllocation = IDL.Record({
    'token_location' : TokenLocation,
    'asset_id' : IDL.Text,
    'percentage' : IDL.Nat8,
  });
  const BundleConfig = IDL.Record({
    'id' : IDL.Nat64,
    'creator' : IDL.Principal,
    'name' : IDL.Text,
    'description' : IDL.Opt(IDL.Text),
    'created_at' : IDL.Nat64,
    'platform_fee_bps' : IDL.Opt(IDL.Nat64),
    'token_location' : TokenLocation,
    'allocations' : IDL.Vec(AssetAllocation),
    'is_active' : IDL.Bool,
    'symbol' : IDL.Text,
  });
  const Result_8 = IDL.Variant({ 'Ok' : BundleConfig, 'Err' : IDL.Text });
  const BundleHolding = IDL.Record({
    'bundle_id' : IDL.Nat64,
    'last_updated' : IDL.Nat64,
    'asset_id' : IDL.Text,
    'amount' : IDL.Nat64,
  });
  const BundleSummary = IDL.Record({
    'id' : IDL.Nat64,
    'creator' : IDL.Principal,
    'name' : IDL.Text,
    'created_at' : IDL.Nat64,
    'holder_count' : IDL.Nat32,
    'allocations' : IDL.Vec(AssetAllocation),
    'is_active' : IDL.Bool,
    'total_nav_tokens' : IDL.Nat64,
  });
  const Result_9 = IDL.Variant({ 'Ok' : BundleSummary, 'Err' : IDL.Text });
  const BundleTransactionHistory = IDL.Record({
    'total_sell_transactions' : IDL.Nat64,
    'total_buy_transactions' : IDL.Nat64,
    'bundle_id' : IDL.Nat64,
    'active_transactions' : IDL.Nat32,
    'total_volume_bought' : IDL.Nat64,
    'last_transaction_at' : IDL.Opt(IDL.Nat64),
    'total_volume_sold' : IDL.Nat64,
  });
  const BundleListItem = IDL.Record({
    'id' : IDL.Nat64,
    'nav_per_token' : IDL.Nat64,
    'name' : IDL.Text,
    'description' : IDL.Opt(IDL.Text),
    'created_at' : IDL.Nat64,
    'total_nav_usd' : IDL.Nat64,
    'token_location' : TokenLocation,
    'allocations' : IDL.Vec(AssetAllocation),
    'holders' : IDL.Nat64,
    'is_active' : IDL.Bool,
    'symbol' : IDL.Text,
  });
  const CacheStatistics = IDL.Record({
    'total_entries' : IDL.Nat32,
    'cache_hit_rate' : IDL.Float64,
    'valid_entries' : IDL.Nat32,
    'expired_entries' : IDL.Nat32,
    'oldest_entry_age_seconds' : IDL.Nat64,
    'cache_duration_seconds' : IDL.Nat64,
  });
  const CanisterInfo = IDL.Record({
    'version' : IDL.Text,
    'total_assets' : IDL.Nat64,
    'total_bundles' : IDL.Nat64,
    'total_nav_tokens' : IDL.Nat64,
  });
  const MemoryUsage = IDL.Record({
    'asset_registry_entries' : IDL.Nat64,
    'bundle_storage_entries' : IDL.Nat64,
  });
  const CanisterStatus = IDL.Record({
    'total_assets' : IDL.Nat64,
    'is_admin_set' : IDL.Bool,
    'total_bundles' : IDL.Nat64,
    'memory_usage' : MemoryUsage,
    'total_nav_tokens' : IDL.Nat64,
  });
  const NAVPrecisionReport = IDL.Record({
    'nav_per_token_18_decimals' : IDL.Nat64,
    'bundle_id' : IDL.Nat64,
    'calculation_timestamp' : IDL.Nat64,
    'nav_per_token_8_decimals' : IDL.Nat64,
    'formatted_nav_display' : IDL.Text,
    'total_usd_value' : IDL.Nat64,
    'total_tokens' : IDL.Nat64,
    'precision_loss_amount' : IDL.Nat64,
  });
  const Result_10 = IDL.Variant({
    'Ok' : NAVPrecisionReport,
    'Err' : IDL.Text,
  });
  const OracleConfig = IDL.Record({
    'oracle_canister' : IDL.Principal,
    'max_staleness_ns' : IDL.Nat64,
    'cache_duration_ns' : IDL.Nat64,
    'fallback_enabled' : IDL.Bool,
  });
  const TransactionStatus = IDL.Variant({
    'Failed' : IDL.Null,
    'FundsLocked' : IDL.Null,
    'WaitingForResolver' : IDL.Null,
    'TimedOut' : IDL.Null,
    'InProgress' : IDL.Null,
    'AssetsTransferred' : IDL.Null,
    'Completed' : IDL.Null,
    'Pending' : IDL.Null,
  });
  const TransactionSummary = IDL.Record({
    'id' : IDL.Nat64,
    'status' : TransactionStatus,
    'bundle_id' : IDL.Nat64,
    'user' : IDL.Principal,
    'created_at' : IDL.Nat64,
    'ckusdc_amount' : IDL.Nat64,
    'operation' : OperationType,
    'duration_ms' : IDL.Opt(IDL.Nat64),
    'nav_tokens' : IDL.Nat64,
  });
  const RecoveryStatistics = IDL.Record({
    'recoveries_last_24h' : IDL.Nat32,
    'success_rate' : IDL.Float64,
    'average_recovery_time_ms' : IDL.Nat64,
    'total_recoveries' : IDL.Nat32,
  });
  const Result_11 = IDL.Variant({ 'Ok' : ResolverInfo, 'Err' : IDL.Text });
  const ResolverStatistics = IDL.Record({
    'total_resolvers' : IDL.Nat64,
    'active_resolvers' : IDL.Nat64,
    'total_volume_processed' : IDL.Nat64,
    'total_transactions' : IDL.Nat64,
  });
  const Transaction = IDL.Record({
    'id' : IDL.Nat64,
    'request_id' : IDL.Nat64,
    'status' : TransactionStatus,
    'resolver' : IDL.Principal,
    'updated_at' : IDL.Nat64,
    'bundle_id' : IDL.Nat64,
    'user' : IDL.Principal,
    'created_at' : IDL.Nat64,
    'timeout_at' : IDL.Nat64,
    'ckusdc_amount' : IDL.Nat64,
    'operation' : OperationType,
    'completed_at' : IDL.Opt(IDL.Nat64),
    'nav_tokens' : IDL.Nat64,
  });
  const Result_12 = IDL.Variant({ 'Ok' : Transaction, 'Err' : IDL.Text });
  const TransactionStats = IDL.Record({
    'total_nav_tokens_burned' : IDL.Nat64,
    'failed_transactions' : IDL.Nat64,
    'total_volume_ckusdc' : IDL.Nat64,
    'average_completion_time_ms' : IDL.Nat64,
    'pending_transactions' : IDL.Nat64,
    'total_nav_tokens_minted' : IDL.Nat64,
    'total_transactions' : IDL.Nat64,
    'completed_transactions' : IDL.Nat64,
  });
  const Result_13 = IDL.Variant({
    'Ok' : TransactionSummary,
    'Err' : IDL.Text,
  });
  const LockedFunds = IDL.Record({
    'transaction_id' : IDL.Nat64,
    'fund_type' : LockedFundType,
    'locked_at' : IDL.Nat64,
    'user' : IDL.Principal,
    'amount' : IDL.Nat64,
    'expires_at' : IDL.Nat64,
  });
  const NAVTokenHolding = IDL.Record({
    'bundle_name' : IDL.Text,
    'bundle_id' : IDL.Nat64,
    'last_updated' : IDL.Nat64,
    'amount' : IDL.Nat64,
  });
  const UserPortfolio = IDL.Record({
    'total_bundles_created' : IDL.Nat32,
    'user' : IDL.Principal,
    'nav_token_holdings' : IDL.Vec(NAVTokenHolding),
    'created_bundles' : IDL.Vec(BundleConfig),
    'total_nav_tokens_held' : IDL.Nat64,
  });
  const UserTransactionSummary = IDL.Record({
    'buy_transactions' : IDL.Nat64,
    'sell_transactions' : IDL.Nat64,
    'current_locked_funds' : IDL.Nat64,
    'user' : IDL.Principal,
    'total_volume_ckusdc' : IDL.Nat64,
    'last_transaction_at' : IDL.Opt(IDL.Nat64),
    'total_transactions' : IDL.Nat64,
  });
  const AssetFilter = IDL.Record({
    'payment_tokens_only' : IDL.Opt(IDL.Bool),
    'category' : IDL.Opt(AssetCategory),
    'active_only' : IDL.Bool,
  });
  const Result_14 = IDL.Variant({
    'Ok' : IDL.Vec(IDL.Tuple(LockedFundType, IDL.Nat64)),
    'Err' : IDL.Text,
  });
  const AssetInfoUpdate = IDL.Record({
    'metadata' : IDL.Opt(AssetMetadata),
    'name' : IDL.Opt(IDL.Text),
    'is_active' : IDL.Opt(IDL.Bool),
    'oracle_ticker' : IDL.Opt(IDL.Text),
  });
  return IDL.Service({
    'add_asset' : IDL.Func(
        [
          IDL.Text,
          IDL.Text,
          IDL.Text,
          TokenLocation,
          IDL.Opt(IDL.Text),
          IDL.Nat8,
          AssetMetadata,
        ],
        [Result],
        [],
      ),
    'calculate_bundle_nav' : IDL.Func([IDL.Nat64], [Result_1], []),
    'check_asset_allowance' : IDL.Func(
        [IDL.Text, IDL.Principal],
        [Result_2],
        ['query'],
      ),
    'check_ckusdc_allowance' : IDL.Func([IDL.Principal], [Result_2], ['query']),
    'cleanup_expired_locks' : IDL.Func([], [Result_3], []),
    'cleanup_expired_transactions' : IDL.Func([], [Result_3], []),
    'cleanup_inactive_bundles' : IDL.Func([], [Result_3], []),
    'clear_price_cache' : IDL.Func([], [Result_3], []),
    'confirm_asset_deposit' : IDL.Func([IDL.Nat64], [Result], []),
    'confirm_ckusdc_payment' : IDL.Func([IDL.Nat64], [Result], []),
    'confirm_resolver_payment_and_complete_sell' : IDL.Func(
        [IDL.Nat64],
        [Result],
        [],
      ),
    'create_bundle' : IDL.Func([BundleCreationRequest], [Result_2], []),
    'deactivate_asset' : IDL.Func([IDL.Text], [Result], []),
    'detect_and_recover_timeouts' : IDL.Func([], [Result_3], []),
    'dissolve_nav_tokens' : IDL.Func([IDL.Nat64], [Result], []),
    'emergency_pause_canister' : IDL.Func([], [Result], []),
    'emergency_recovery' : IDL.Func([IDL.Opt(IDL.Principal)], [Result_4], []),
    'emergency_unpause_canister' : IDL.Func([], [Result], []),
    'execute_quote' : IDL.Func([QuoteObject], [Result_2], []),
    'extend_lock_expiration' : IDL.Func(
        [IDL.Nat64, LockedFundType, IDL.Nat64],
        [Result],
        [],
      ),
    'force_deactivate_bundle' : IDL.Func([IDL.Nat64, IDL.Text], [Result], []),
    'format_nav_display' : IDL.Func(
        [IDL.Nat64, IDL.Nat8],
        [IDL.Text],
        ['query'],
      ),
    'get_active_resolvers' : IDL.Func([], [IDL.Vec(ResolverInfo)], ['query']),
    'get_admin' : IDL.Func([], [IDL.Opt(IDL.Principal)], ['query']),
    'get_asset' : IDL.Func([IDL.Text], [Result_5], ['query']),
    'get_asset_price' : IDL.Func([IDL.Text], [Result_6], []),
    'get_asset_summary' : IDL.Func([], [IDL.Vec(AssetSummary)], ['query']),
    'get_assignment' : IDL.Func([IDL.Nat64], [Result_7], ['query']),
    'get_bundle' : IDL.Func([IDL.Nat64], [Result_8], ['query']),
    'get_bundle_holdings' : IDL.Func(
        [IDL.Nat64],
        [IDL.Vec(BundleHolding)],
        ['query'],
      ),
    'get_bundle_summary' : IDL.Func([IDL.Nat64], [Result_9], []),
    'get_bundle_transaction_history' : IDL.Func(
        [IDL.Nat64],
        [BundleTransactionHistory],
        ['query'],
      ),
    'get_bundles_list' : IDL.Func([], [IDL.Vec(BundleListItem)], []),
    'get_cache_statistics' : IDL.Func([], [CacheStatistics], ['query']),
    'get_cached_price' : IDL.Func([IDL.Text], [IDL.Opt(AssetPrice)], ['query']),
    'get_canister_info' : IDL.Func([], [CanisterInfo], ['query']),
    'get_canister_status' : IDL.Func([], [CanisterStatus], ['query']),
    'get_current_week' : IDL.Func([], [IDL.Nat64], ['query']),
    'get_default_platform_fee_bps' : IDL.Func([], [IDL.Nat64], ['query']),
    'get_leaderboard' : IDL.Func(
        [IDL.Opt(IDL.Nat64), IDL.Nat64],
        [IDL.Vec(IDL.Tuple(IDL.Principal, IDL.Nat64))],
        ['query'],
      ),
    'get_lock_expiration_time' : IDL.Func(
        [IDL.Nat64, LockedFundType],
        [Result_2],
        ['query'],
      ),
    'get_nav_precision_report' : IDL.Func([IDL.Nat64], [Result_10], []),
    'get_oracle_config' : IDL.Func([], [IDL.Opt(OracleConfig)], ['query']),
    'get_platform_treasury' : IDL.Func([], [IDL.Opt(IDL.Principal)], ['query']),
    'get_portfolio_value' : IDL.Func([IDL.Opt(IDL.Principal)], [Result_2], []),
    'get_recent_transactions' : IDL.Func(
        [IDL.Nat64],
        [IDL.Vec(TransactionSummary)],
        ['query'],
      ),
    'get_recovery_statistics' : IDL.Func([], [RecoveryStatistics], ['query']),
    'get_resolver' : IDL.Func([IDL.Principal], [Result_11], ['query']),
    'get_resolver_statistics' : IDL.Func([], [ResolverStatistics], ['query']),
    'get_transaction' : IDL.Func([IDL.Nat64], [Result_12], ['query']),
    'get_transaction_stats' : IDL.Func([], [TransactionStats], ['query']),
    'get_transaction_summary' : IDL.Func([IDL.Nat64], [Result_13], ['query']),
    'get_transactions_by_status' : IDL.Func(
        [TransactionStatus],
        [IDL.Vec(Transaction)],
        ['query'],
      ),
    'get_user_bundles' : IDL.Func(
        [IDL.Principal],
        [IDL.Vec(BundleConfig)],
        ['query'],
      ),
    'get_user_locked_funds' : IDL.Func(
        [IDL.Principal],
        [IDL.Vec(LockedFunds)],
        ['query'],
      ),
    'get_user_points' : IDL.Func(
        [IDL.Opt(IDL.Principal)],
        [IDL.Nat64],
        ['query'],
      ),
    'get_user_portfolio' : IDL.Func(
        [IDL.Principal],
        [UserPortfolio],
        ['query'],
      ),
    'get_user_total_locked_amount' : IDL.Func(
        [IDL.Principal, LockedFundType],
        [IDL.Nat64],
        ['query'],
      ),
    'get_user_transaction_summary' : IDL.Func(
        [IDL.Principal],
        [UserTransactionSummary],
        ['query'],
      ),
    'get_user_transactions' : IDL.Func(
        [IDL.Principal],
        [IDL.Vec(Transaction)],
        ['query'],
      ),
    'get_user_weekly_points' : IDL.Func(
        [IDL.Opt(IDL.Principal), IDL.Nat64],
        [IDL.Nat64],
        ['query'],
      ),
    'is_fund_already_locked' : IDL.Func(
        [IDL.Nat64, LockedFundType],
        [IDL.Bool],
        ['query'],
      ),
    'list_active_bundles' : IDL.Func([], [IDL.Vec(BundleConfig)], ['query']),
    'list_assets' : IDL.Func(
        [IDL.Opt(AssetFilter)],
        [IDL.Vec(AssetInfo)],
        ['query'],
      ),
    'list_cached_prices' : IDL.Func([], [IDL.Vec(AssetPrice)], ['query']),
    'list_valid_cached_prices' : IDL.Func([], [IDL.Vec(AssetPrice)], ['query']),
    'lock_user_funds_with_validation' : IDL.Func(
        [IDL.Nat64, LockedFundType, IDL.Nat64],
        [Result],
        [],
      ),
    'register_resolver' : IDL.Func(
        [IDL.Principal, IDL.Text, IDL.Nat64],
        [Result],
        [],
      ),
    'search_assets' : IDL.Func([IDL.Text], [IDL.Vec(AssetInfo)], ['query']),
    'search_bundles' : IDL.Func([IDL.Text], [IDL.Vec(BundleConfig)], ['query']),
    'set_admin' : IDL.Func([IDL.Principal], [Result], []),
    'set_bundle_platform_fee' : IDL.Func([IDL.Nat64, IDL.Nat64], [Result], []),
    'set_coordinator_public_key' : IDL.Func([IDL.Text], [Result], []),
    'set_default_platform_fee_bps' : IDL.Func([IDL.Nat64], [Result], []),
    'set_oracle_config' : IDL.Func([OracleConfig], [Result], []),
    'set_platform_treasury' : IDL.Func([IDL.Principal], [Result], []),
    'set_quote_api_principal' : IDL.Func([IDL.Principal], [Result], []),
    'unlock_all_transaction_funds' : IDL.Func([IDL.Nat64], [Result_14], []),
    'update_asset' : IDL.Func([IDL.Text, AssetInfoUpdate], [Result], []),
    'update_asset_token_location' : IDL.Func(
        [IDL.Text, TokenLocation],
        [Result],
        [],
      ),
    'update_resolver_status' : IDL.Func(
        [IDL.Principal, IDL.Bool],
        [Result],
        [],
      ),
    'validate_sufficient_balance' : IDL.Func(
        [IDL.Principal, LockedFundType, IDL.Nat64],
        [Result],
        ['query'],
      ),
    'validate_transaction_integrity' : IDL.Func(
        [IDL.Nat64],
        [Result],
        ['query'],
      ),
  });
};
export const init = ({ IDL }) => { return []; };
