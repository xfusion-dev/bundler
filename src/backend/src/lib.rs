use candid::Principal;
use ic_cdk::api::msg_caller;
use ic_cdk_macros::*;

mod types;
mod memory;
mod asset_registry;
mod bundle_manager;
mod nav_token;
mod query_api;
mod admin;
mod oracle;
mod nav_calculator;
mod holdings_tracker;
mod quote_manager;
mod transaction_manager;
mod icrc2_client;
mod icrc151_client;
mod resolver_manager;
mod sell_flow;
mod buy_flow;
mod error_recovery;
mod tests;

use types::*;
use memory::*;

#[init]
fn init() {
    let caller = msg_caller();
    set_admin_principal(caller);
    ic_cdk::println!("XFusion backend canister initialized with admin: {}", caller);
}

#[pre_upgrade]
fn pre_upgrade() {
    ic_cdk::println!("Preparing for upgrade");
}

#[post_upgrade]
fn post_upgrade() {
    GLOBAL_STATE.with(|cell| {
        let state = cell.borrow().get().clone();

        match state.version {
            1 => {
                ic_cdk::println!("GlobalState V1 - no migration required");
            }
            _ => {
                ic_cdk::println!("Unknown GlobalState version: {}", state.version);
            }
        }
    });

    ic_cdk::println!("Upgrade completed successfully");
}

#[query]
fn get_bundle(bundle_id: u64) -> Result<BundleConfig, String> {
    bundle_manager::get_bundle(bundle_id)
}

#[update]
async fn get_bundles_list() -> Vec<BundleListItem> {
    query_api::get_bundles_list().await
}

#[update]
async fn calculate_bundle_nav(bundle_id: u64) -> Result<BundleNAV, String> {
    nav_calculator::calculate_bundle_nav(bundle_id).await
}

#[update]
async fn get_asset_price(asset_id: AssetId) -> Result<AssetPrice, String> {
    oracle::get_asset_price(asset_id).await
}

#[update]
async fn get_portfolio_value(user: Option<Principal>) -> Result<u64, String> {
    let user_principal = user.unwrap_or_else(|| msg_caller());
    nav_calculator::get_portfolio_value(user_principal).await
}

#[update]
async fn get_nav_precision_report(bundle_id: u64) -> Result<NAVPrecisionReport, String> {
    nav_calculator::calculate_nav_with_full_precision_report(bundle_id).await
}

#[query]
fn format_nav_display(nav_value: u64, precision_decimals: u8) -> String {
    nav_calculator::format_nav_with_precision(nav_value, precision_decimals)
}

#[query]
fn get_assignment(assignment_id: u64) -> Result<QuoteAssignment, String> {
    quote_manager::get_assignment(assignment_id)
}

#[update]
fn set_coordinator_public_key(public_key_hex: String) -> Result<(), String> {
    quote_manager::set_coordinator_public_key(public_key_hex)
}


#[update]
fn register_resolver(
    resolver_principal: Principal,
    name: String,
    fee_rate: u64,
) -> Result<(), String> {
    resolver_manager::register_resolver_admin(resolver_principal, name, fee_rate)
}

#[update]
fn update_resolver_status(resolver: Principal, is_active: bool) -> Result<(), String> {
    resolver_manager::update_resolver_status(resolver, is_active)
}

#[query]
fn get_resolver(principal: Principal) -> Result<resolver_manager::ResolverInfo, String> {
    resolver_manager::get_resolver(principal)
}

#[query]
fn get_active_resolvers() -> Vec<resolver_manager::ResolverInfo> {
    resolver_manager::get_active_resolvers()
}


#[query]
fn get_resolver_statistics() -> resolver_manager::ResolverStatistics {
    resolver_manager::get_resolver_statistics()
}

#[query]
fn get_transaction(transaction_id: u64) -> Result<Transaction, String> {
    transaction_manager::get_transaction(transaction_id)
}

#[query]
fn get_user_transactions(user: Principal) -> Vec<Transaction> {
    transaction_manager::get_user_transactions(user)
}

#[query]
fn get_user_locked_funds(user: Principal) -> Vec<LockedFunds> {
    transaction_manager::get_user_locked_funds(user)
}

#[update]
async fn cleanup_expired_transactions() -> Result<u32, String> {
    let _admin = admin::require_admin()?;
    Ok(transaction_manager::cleanup_expired_transactions().await)
}

#[update]
async fn execute_quote(quote: QuoteObject) -> Result<u64, String> {
    quote_manager::execute_quote(quote).await
}

#[update]
async fn confirm_asset_deposit(request_id: u64) -> Result<(), String> {
    quote_manager::confirm_asset_deposit(request_id).await
}

#[update]
async fn confirm_ckusdc_payment(request_id: u64) -> Result<(), String> {
    quote_manager::confirm_ckusdc_payment(request_id).await
}

#[update]
async fn confirm_resolver_payment_and_complete_sell(request_id: u64) -> Result<(), String> {
    sell_flow::confirm_resolver_payment_and_complete_sell(request_id).await
}

#[update]
async fn dissolve_nav_tokens(request_id: u64) -> Result<(), String> {
    sell_flow::dissolve_nav_tokens(request_id).await
}

#[query]
fn get_transaction_summary(transaction_id: u64) -> Result<TransactionSummary, String> {
    transaction_manager::get_transaction_summary(transaction_id)
}

#[query]
fn get_transaction_stats() -> TransactionStats {
    transaction_manager::get_transaction_stats()
}

#[query]
fn get_bundle_transaction_history(bundle_id: u64) -> BundleTransactionHistory {
    transaction_manager::get_bundle_transaction_history(bundle_id)
}

#[query]
fn get_user_transaction_summary(user: Principal) -> UserTransactionSummary {
    transaction_manager::get_user_transaction_summary(user)
}

#[query]
fn get_transactions_by_status(status: TransactionStatus) -> Vec<Transaction> {
    transaction_manager::get_transactions_by_status(status)
}

#[query]
fn get_recent_transactions(limit: usize) -> Vec<TransactionSummary> {
    transaction_manager::get_recent_transactions(limit)
}

#[query]
pub fn get_bundle_holdings(bundle_id: u64) -> Vec<BundleHolding> {
    holdings_tracker::get_all_bundle_holdings(bundle_id)
}

#[query]
async fn validate_sufficient_balance(user: Principal, fund_type: LockedFundType, amount: u64) -> Result<(), String> {
    transaction_manager::validate_sufficient_balance(user, &fund_type, amount).await
}

#[query]
fn get_user_total_locked_amount(user: Principal, fund_type: LockedFundType) -> u64 {
    transaction_manager::get_user_total_locked_amount(user, &fund_type)
}

#[update]
async fn lock_user_funds_with_validation(transaction_id: u64, fund_type: LockedFundType, amount: u64) -> Result<(), String> {
    transaction_manager::lock_user_funds_with_validation(transaction_id, fund_type, amount).await
}

#[update]
fn unlock_all_transaction_funds(transaction_id: u64) -> Result<Vec<(LockedFundType, u64)>, String> {
    transaction_manager::unlock_all_transaction_funds(transaction_id)
}

#[query]
fn is_fund_already_locked(transaction_id: u64, fund_type: LockedFundType) -> bool {
    transaction_manager::is_fund_already_locked(transaction_id, &fund_type)
}

#[query]
fn get_lock_expiration_time(transaction_id: u64, fund_type: LockedFundType) -> Result<u64, String> {
    transaction_manager::get_lock_expiration_time(transaction_id, &fund_type)
}

#[update]
fn extend_lock_expiration(transaction_id: u64, fund_type: LockedFundType, new_expiration: u64) -> Result<(), String> {
    transaction_manager::extend_lock_expiration(transaction_id, &fund_type, new_expiration)
}

#[update]
fn cleanup_expired_locks() -> Result<u32, String> {
    let _admin = admin::require_admin()?;
    Ok(transaction_manager::cleanup_expired_locks())
}

#[query]
async fn check_ckusdc_allowance(user: Principal) -> Result<u64, String> {
    let canister_id = ic_cdk::api::id();
    let ledger = Principal::from_text(icrc2_client::CKUSDC_LEDGER_CANISTER)
        .map_err(|e| format!("Invalid ckUSDC ledger: {}", e))?;

    let allowance = icrc2_client::icrc2_allowance(ledger, user, canister_id).await?;
    allowance.allowance.0.try_into().map_err(|_| "Allowance too large".to_string())
}

#[query]
async fn check_asset_allowance(asset_id: AssetId, user: Principal) -> Result<u64, String> {
    icrc2_client::check_user_allowance(&asset_id, user).await
}

#[update]
async fn detect_and_recover_timeouts() -> Result<u32, String> {
    let _admin = admin::require_admin()?;
    error_recovery::detect_and_handle_timeouts().await
}

#[update]
async fn emergency_recovery(user: Option<Principal>) -> Result<error_recovery::RecoveryReport, String> {
    let user_principal = user.unwrap_or_else(|| msg_caller());
    error_recovery::perform_emergency_recovery(user_principal).await
}

#[query]
fn validate_transaction_integrity(transaction_id: u64) -> Result<(), String> {
    error_recovery::validate_transaction_integrity(transaction_id)
}

#[query]
fn get_recovery_statistics() -> error_recovery::RecoveryStatistics {
    error_recovery::get_recovery_statistics()
}

#[query]
fn get_user_points(user: Option<Principal>) -> u64 {
    let user_principal = user.unwrap_or_else(|| msg_caller());
    memory::get_user_points(user_principal)
}

#[query]
fn get_user_weekly_points(user: Option<Principal>, week: u64) -> u64 {
    let user_principal = user.unwrap_or_else(|| msg_caller());
    memory::get_user_weekly_points(user_principal, week)
}

#[query]
fn get_leaderboard(week: Option<u64>, limit: u64) -> Vec<(Principal, u64)> {
    memory::get_leaderboard(week, limit)
}

#[query]
fn get_current_week() -> u64 {
    memory::get_current_week()
}

ic_cdk::export_candid!();