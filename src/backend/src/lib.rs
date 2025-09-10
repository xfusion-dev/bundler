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

use types::*;
use memory::*;

#[init]
fn init() {
    let caller = msg_caller();
    ADMIN_PRINCIPAL.with(|admin| *admin.borrow_mut() = Some(caller));
    ic_cdk::println!("XFusion backend canister initialized with admin: {}", caller);
}

#[pre_upgrade]
fn pre_upgrade() {
    ic_cdk::println!("Preparing for upgrade");
}

#[post_upgrade]
fn post_upgrade() {
    ic_cdk::println!("Upgrade completed");
}

#[query]
fn greet(name: String) -> String {
    format!("Hello, {}!", name)
}

#[update]
fn whoami() -> String {
    let caller_principal: Principal = msg_caller();
    caller_principal.to_text()
}

#[update]
async fn calculate_bundle_nav(bundle_id: u64) -> Result<BundleNAV, String> {
    nav_calculator::calculate_bundle_nav(bundle_id).await
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
fn cleanup_expired_quotes() -> u32 {
    quote_manager::cleanup_expired_quotes()
}

#[update]
fn set_quote_api_principal(api_principal: Principal) -> Result<(), String> {
    quote_manager::set_quote_api_principal(api_principal)
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
fn cleanup_expired_transactions() -> u32 {
    transaction_manager::cleanup_expired_transactions()
}

#[update]
fn execute_quote(request_id: u64) -> Result<u64, String> {
    quote_manager::execute_quote(request_id)
}

#[update]
fn confirm_asset_deposit(request_id: u64, deposits: Vec<(AssetId, u64)>) -> Result<(), String> {
    quote_manager::confirm_asset_deposit(request_id, deposits)
}

#[update]
fn confirm_ckusdc_payment(request_id: u64, ckusdc_amount: u64) -> Result<(), String> {
    quote_manager::confirm_ckusdc_payment(request_id, ckusdc_amount)
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

#[update]
fn monitor_transaction_health() -> Result<(), String> {
    transaction_manager::monitor_transaction_health()
}

ic_cdk::export_candid!();