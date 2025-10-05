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

#[query]
fn validate_total_supply_consistency(bundle_id: u64) -> Result<SupplyValidationResult, String> {
    nav_calculator::validate_total_supply_consistency(bundle_id)
}

#[update]
async fn get_nav_precision_report(bundle_id: u64) -> Result<NAVPrecisionReport, String> {
    nav_calculator::calculate_nav_with_full_precision_report(bundle_id).await
}

#[query]
fn format_nav_display(nav_value: u64, precision_decimals: u8) -> String {
    nav_calculator::format_nav_with_precision(nav_value, precision_decimals)
}

#[update]
fn request_quote(request: QuoteRequest) -> Result<u64, String> {
    quote_manager::request_quote(request)
}

#[update]
fn submit_quote_assignment(assignment: QuoteAssignment) -> Result<(), String> {
    quote_manager::submit_quote_assignment(assignment)
}

#[query]
fn get_quote_request(request_id: u64) -> Result<QuoteRequest, String> {
    quote_manager::get_quote_request(request_id)
}

#[query]
fn get_quote_assignment(request_id: u64) -> Result<Option<QuoteAssignment>, String> {
    quote_manager::get_quote_assignment(request_id)
}

#[query]
fn get_pending_quote_requests() -> Vec<QuoteRequest> {
    quote_manager::get_pending_quote_requests()
}

#[update]
fn cleanup_expired_quotes() -> Result<u32, String> {
    let _admin = admin::require_admin()?;
    Ok(quote_manager::cleanup_expired_quotes())
}

#[update]
fn cleanup_expired_assignments() -> Result<u32, String> {
    let _admin = admin::require_admin()?;
    Ok(quote_manager::cleanup_expired_assignments())
}

#[query]
fn get_quotes_expiring_soon(threshold_seconds: u64) -> Vec<QuoteRequest> {
    quote_manager::get_quotes_expiring_soon(threshold_seconds)
}

#[query]
fn get_assignments_expiring_soon(threshold_seconds: u64) -> Vec<QuoteAssignment> {
    quote_manager::get_assignments_expiring_soon(threshold_seconds)
}

#[query]
fn is_quote_request_expired(request_id: u64) -> Result<bool, String> {
    quote_manager::is_quote_request_expired(request_id)
}

#[query]
fn is_quote_assignment_expired(request_id: u64) -> Result<bool, String> {
    quote_manager::is_quote_assignment_expired(request_id)
}

#[update]
fn extend_quote_expiration(request_id: u64, additional_seconds: u64) -> Result<(), String> {
    quote_manager::extend_quote_expiration(request_id, additional_seconds)
}

#[update]
fn extend_assignment_validity(request_id: u64, additional_seconds: u64) -> Result<(), String> {
    quote_manager::extend_assignment_validity(request_id, additional_seconds)
}

#[query]
fn get_quote_statistics() -> QuoteStatistics {
    quote_manager::get_quote_statistics()
}

#[update]
fn cleanup_all_expired() -> Result<(u32, u32, u32), String> {
    let _admin = admin::require_admin()?;
    Ok(quote_manager::cleanup_all_expired())
}

#[update]
fn set_quote_api_principal(api_principal: Principal) -> Result<(), String> {
    quote_manager::set_quote_api_principal(api_principal)
}

#[update]
fn register_resolver(
    name: String,
    fee_rate: u64,
) -> Result<(), String> {
    resolver_manager::register_resolver(name, fee_rate)
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

#[update]
fn create_transaction(request_id: u64) -> Result<u64, String> {
    transaction_manager::create_transaction(request_id)
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
async fn execute_quote(request_id: u64) -> Result<u64, String> {
    quote_manager::execute_quote(request_id).await
}

#[update]
async fn confirm_asset_deposit(request_id: u64) -> Result<(), String> {
    quote_manager::confirm_asset_deposit(request_id).await
}

#[update]
async fn confirm_ckusdc_payment(request_id: u64) -> Result<(), String> {
    quote_manager::confirm_ckusdc_payment(request_id).await
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
fn validate_sufficient_balance(user: Principal, fund_type: LockedFundType, amount: u64) -> Result<(), String> {
    transaction_manager::validate_sufficient_balance(user, &fund_type, amount)
}

#[query]
fn get_user_total_locked_amount(user: Principal, fund_type: LockedFundType) -> u64 {
    transaction_manager::get_user_total_locked_amount(user, &fund_type)
}

#[update]
fn lock_user_funds_with_validation(transaction_id: u64, fund_type: LockedFundType, amount: u64) -> Result<(), String> {
    transaction_manager::lock_user_funds_with_validation(transaction_id, fund_type, amount)
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
    Ok(allowance.allowance)
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

ic_cdk::export_candid!();