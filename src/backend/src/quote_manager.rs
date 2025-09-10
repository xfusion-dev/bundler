use ic_cdk::api::{time, msg_caller};
use crate::types::*;
use crate::memory::*;
use crate::admin::is_admin;

pub fn request_quote(mut request: QuoteRequest) -> Result<u64, String> {
    validate_quote_request(&request)?;

    let request_id = generate_request_id();
    request.request_id = request_id;
    request.created_at = time();

    QUOTE_REQUESTS.with(|quotes| {
        quotes.borrow_mut().insert(request_id, request)
    });

    Ok(request_id)
}

pub fn submit_quote_assignment(assignment: QuoteAssignment) -> Result<(), String> {
    if !is_authorized_quote_api(msg_caller()) {
        return Err("Only authorized quote API can submit assignments".to_string());
    }

    validate_quote_assignment(&assignment)?;

    if !quote_request_exists(assignment.request_id) {
        return Err("Quote request not found".to_string());
    }

    if quote_assignment_exists(assignment.request_id) {
        return Err("Quote already assigned".to_string());
    }

    QUOTE_ASSIGNMENTS.with(|assignments| {
        assignments.borrow_mut().insert(assignment.request_id, assignment)
    });

    Ok(())
}

pub fn get_quote_request(request_id: u64) -> Result<QuoteRequest, String> {
    QUOTE_REQUESTS.with(|quotes| {
        quotes.borrow()
            .get(&request_id)
            .ok_or_else(|| "Quote request not found".to_string())
    })
}

pub fn get_quote_assignment(request_id: u64) -> Result<Option<QuoteAssignment>, String> {
    QUOTE_ASSIGNMENTS.with(|assignments| {
        Ok(assignments.borrow().get(&request_id))
    })
}

pub fn get_pending_quote_requests() -> Vec<QuoteRequest> {
    let current_time = time();

    QUOTE_REQUESTS.with(|quotes| {
        quotes.borrow()
            .iter()
            .filter_map(|(request_id, request)| {
                if request.expires_at > current_time &&
                   !quote_assignment_exists(request_id) {
                    Some(request)
                } else {
                    None
                }
            })
            .collect()
    })
}

pub fn cleanup_expired_quotes() -> u32 {
    let current_time = time();
    let mut cleaned_count = 0;

    let expired_request_ids: Vec<u64> = QUOTE_REQUESTS.with(|quotes| {
        quotes.borrow()
            .iter()
            .filter_map(|(request_id, request)| {
                if request.expires_at <= current_time {
                    Some(request_id)
                } else {
                    None
                }
            })
            .collect()
    });

    for request_id in &expired_request_ids {
        QUOTE_REQUESTS.with(|quotes| {
            quotes.borrow_mut().remove(request_id)
        });

        QUOTE_ASSIGNMENTS.with(|assignments| {
            assignments.borrow_mut().remove(request_id)
        });

        cleaned_count += 1;
    }

    cleaned_count
}

pub fn cleanup_expired_assignments() -> u32 {
    let current_time = time();
    let mut cleaned_count = 0;

    let expired_assignment_ids: Vec<u64> = QUOTE_ASSIGNMENTS.with(|assignments| {
        assignments.borrow()
            .iter()
            .filter_map(|(request_id, assignment)| {
                if assignment.valid_until <= current_time {
                    Some(request_id)
                } else {
                    None
                }
            })
            .collect()
    });

    for request_id in expired_assignment_ids {
        QUOTE_ASSIGNMENTS.with(|assignments| {
            assignments.borrow_mut().remove(&request_id)
        });
        cleaned_count += 1;
    }

    cleaned_count
}

pub fn get_quotes_expiring_soon(threshold_seconds: u64) -> Vec<QuoteRequest> {
    let current_time = time();
    let threshold_ns = threshold_seconds * 1_000_000_000;
    let expiry_threshold = current_time + threshold_ns;

    QUOTE_REQUESTS.with(|quotes| {
        quotes.borrow()
            .iter()
            .filter_map(|(_, request)| {
                if request.expires_at <= expiry_threshold && request.expires_at > current_time {
                    Some(request)
                } else {
                    None
                }
            })
            .collect()
    })
}

pub fn get_assignments_expiring_soon(threshold_seconds: u64) -> Vec<QuoteAssignment> {
    let current_time = time();
    let threshold_ns = threshold_seconds * 1_000_000_000;
    let expiry_threshold = current_time + threshold_ns;

    QUOTE_ASSIGNMENTS.with(|assignments| {
        assignments.borrow()
            .iter()
            .filter_map(|(_, assignment)| {
                if assignment.valid_until <= expiry_threshold && assignment.valid_until > current_time {
                    Some(assignment)
                } else {
                    None
                }
            })
            .collect()
    })
}

pub fn is_quote_request_expired(request_id: u64) -> Result<bool, String> {
    let request = get_quote_request(request_id)?;
    Ok(request.expires_at <= time())
}

pub fn is_quote_assignment_expired(request_id: u64) -> Result<bool, String> {
    let assignment = get_quote_assignment(request_id)?
        .ok_or_else(|| "No quote assignment found".to_string())?;
    Ok(assignment.valid_until <= time())
}

pub fn extend_quote_expiration(request_id: u64, additional_seconds: u64) -> Result<(), String> {
    if !is_admin(msg_caller()) {
        return Err("Only admin can extend quote expiration".to_string());
    }

    let additional_ns = additional_seconds * 1_000_000_000;

    QUOTE_REQUESTS.with(|quotes| {
        let mut quotes = quotes.borrow_mut();
        if let Some(mut request) = quotes.get(&request_id) {
            request.expires_at += additional_ns;
            quotes.insert(request_id, request);
            Ok(())
        } else {
            Err("Quote request not found".to_string())
        }
    })
}

pub fn extend_assignment_validity(request_id: u64, additional_seconds: u64) -> Result<(), String> {
    if !is_admin(msg_caller()) {
        return Err("Only admin can extend assignment validity".to_string());
    }

    let additional_ns = additional_seconds * 1_000_000_000;

    QUOTE_ASSIGNMENTS.with(|assignments| {
        let mut assignments = assignments.borrow_mut();
        if let Some(mut assignment) = assignments.get(&request_id) {
            assignment.valid_until += additional_ns;
            assignments.insert(request_id, assignment);
            Ok(())
        } else {
            Err("Quote assignment not found".to_string())
        }
    })
}

pub fn get_quote_statistics() -> QuoteStatistics {
    let current_time = time();
    let mut stats = QuoteStatistics {
        total_requests: 0,
        pending_requests: 0,
        assigned_requests: 0,
        expired_requests: 0,
        expired_assignments: 0,
    };

    QUOTE_REQUESTS.with(|quotes| {
        for (request_id, request) in quotes.borrow().iter() {
            stats.total_requests += 1;

            if request.expires_at <= current_time {
                stats.expired_requests += 1;
            } else if quote_assignment_exists(request_id) {
                stats.assigned_requests += 1;
            } else {
                stats.pending_requests += 1;
            }
        }
    });

    QUOTE_ASSIGNMENTS.with(|assignments| {
        for (_, assignment) in assignments.borrow().iter() {
            if assignment.valid_until <= current_time {
                stats.expired_assignments += 1;
            }
        }
    });

    stats
}

pub fn cleanup_all_expired() -> (u32, u32, u32) {
    let expired_quotes = cleanup_expired_quotes();
    let expired_assignments = cleanup_expired_assignments();
    let expired_locks = crate::transaction_manager::cleanup_expired_locks();

    (expired_quotes, expired_assignments, expired_locks)
}

pub fn set_quote_api_principal(api_principal: candid::Principal) -> Result<(), String> {
    if !is_admin(msg_caller()) {
        return Err("Only admin can set quote API principal".to_string());
    }

    QUOTE_API_PRINCIPAL.with(|api| {
        *api.borrow_mut() = Some(api_principal);
    });

    Ok(())
}

fn generate_request_id() -> u64 {
    QUOTE_COUNTER.with(|counter| {
        let mut counter = counter.borrow_mut();
        *counter += 1;
        *counter
    })
}

fn quote_request_exists(request_id: u64) -> bool {
    QUOTE_REQUESTS.with(|quotes| {
        quotes.borrow().contains_key(&request_id)
    })
}

fn quote_assignment_exists(request_id: u64) -> bool {
    QUOTE_ASSIGNMENTS.with(|assignments| {
        assignments.borrow().contains_key(&request_id)
    })
}

fn is_authorized_quote_api(caller: candid::Principal) -> bool {
    QUOTE_API_PRINCIPAL.with(|api| {
        api.borrow().map_or(false, |api_principal| api_principal == caller)
    })
}

fn validate_quote_request(request: &QuoteRequest) -> Result<(), String> {
    if request.bundle_id == 0 {
        return Err("Invalid bundle ID".to_string());
    }

    if request.amount == 0 {
        return Err("Amount must be greater than zero".to_string());
    }

    if request.max_slippage > 100 {
        return Err("Maximum slippage cannot exceed 100%".to_string());
    }

    if request.expires_at <= time() {
        return Err("Quote expiration must be in the future".to_string());
    }

    let bundle = crate::bundle_manager::get_bundle(request.bundle_id)?;
    if !bundle.is_active {
        return Err("Bundle is not active".to_string());
    }

    Ok(())
}

fn validate_quote_assignment(assignment: &QuoteAssignment) -> Result<(), String> {
    if assignment.nav_tokens == 0 {
        return Err("NAV tokens amount must be greater than zero".to_string());
    }

    if assignment.ckusdc_amount == 0 {
        return Err("ckUSDC amount must be greater than zero".to_string());
    }

    if assignment.valid_until <= time() {
        return Err("Assignment expiration must be in the future".to_string());
    }

    if assignment.estimated_nav == 0 {
        return Err("Estimated NAV must be greater than zero".to_string());
    }

    Ok(())
}

pub fn execute_quote(request_id: u64) -> Result<u64, String> {
    let caller = msg_caller();
    let request = get_quote_request(request_id)?;
    let assignment = get_quote_assignment(request_id)?
        .ok_or_else(|| "No quote assignment found".to_string())?;

    if request.user != caller {
        return Err("Only the quote requester can execute".to_string());
    }

    if assignment.valid_until <= time() {
        return Err("Quote assignment expired".to_string());
    }

    validate_assignment_against_request(&request, &assignment)?;

    let transaction_id = crate::transaction_manager::create_transaction(request_id)?;

    match request.operation {
        OperationType::Buy => execute_buy_quote(transaction_id, &assignment),
        OperationType::Sell => execute_sell_quote(transaction_id, &assignment),
    }
}

pub fn confirm_asset_deposit(request_id: u64, deposits: Vec<(AssetId, u64)>) -> Result<(), String> {
    let caller = msg_caller();
    let assignment = get_quote_assignment(request_id)?
        .ok_or_else(|| "No quote assignment found".to_string())?;

    if assignment.resolver != caller {
        return Err("Only assigned resolver can confirm deposits".to_string());
    }

    let transaction = crate::transaction_manager::get_transaction_by_request(request_id)?;
    crate::transaction_manager::validate_resolver_for_transaction(transaction.id)?;

    validate_asset_deposits(&assignment, &deposits)?;

    complete_buy_transaction(transaction.id, &assignment, deposits)
}

pub fn confirm_ckusdc_payment(request_id: u64, ckusdc_amount: u64) -> Result<(), String> {
    let caller = msg_caller();
    let assignment = get_quote_assignment(request_id)?
        .ok_or_else(|| "No quote assignment found".to_string())?;

    if assignment.resolver != caller {
        return Err("Only assigned resolver can confirm payment".to_string());
    }

    if ckusdc_amount != assignment.ckusdc_amount {
        return Err("ckUSDC amount mismatch".to_string());
    }

    let transaction = crate::transaction_manager::get_transaction_by_request(request_id)?;
    crate::transaction_manager::validate_resolver_for_transaction(transaction.id)?;

    complete_sell_transaction(transaction.id, &assignment)
}

fn execute_buy_quote(transaction_id: u64, assignment: &QuoteAssignment) -> Result<u64, String> {
    let fund_type = LockedFundType::CkUSDC;
    crate::transaction_manager::lock_user_funds(transaction_id, fund_type, assignment.ckusdc_amount)?;

    crate::transaction_manager::update_transaction_status(transaction_id, TransactionStatus::WaitingForResolver)?;

    Ok(transaction_id)
}

fn execute_sell_quote(transaction_id: u64, assignment: &QuoteAssignment) -> Result<u64, String> {
    let transaction = crate::transaction_manager::get_transaction(transaction_id)?;
    let fund_type = LockedFundType::NAVTokens { bundle_id: transaction.bundle_id };

    crate::transaction_manager::lock_user_funds(transaction_id, fund_type, assignment.nav_tokens)?;

    crate::transaction_manager::update_transaction_status(transaction_id, TransactionStatus::WaitingForResolver)?;

    Ok(transaction_id)
}

fn complete_buy_transaction(transaction_id: u64, assignment: &QuoteAssignment, deposits: Vec<(AssetId, u64)>) -> Result<(), String> {
    crate::transaction_manager::update_transaction_status(transaction_id, TransactionStatus::InProgress)?;

    let transaction = crate::transaction_manager::get_transaction(transaction_id)?;

    for (asset_id, amount) in deposits {
        crate::holdings_tracker::update_bundle_holdings(transaction.bundle_id, &asset_id, amount as i64)?;
    }

    crate::nav_token::mint_nav_tokens(transaction.user, transaction.bundle_id, assignment.nav_tokens)?;

    let _ckusdc_amount = crate::transaction_manager::unlock_user_funds(transaction_id, &LockedFundType::CkUSDC)?;

    crate::transaction_manager::update_transaction_status(transaction_id, TransactionStatus::Completed)?;

    Ok(())
}

fn complete_sell_transaction(transaction_id: u64, assignment: &QuoteAssignment) -> Result<(), String> {
    crate::transaction_manager::update_transaction_status(transaction_id, TransactionStatus::InProgress)?;

    let transaction = crate::transaction_manager::get_transaction(transaction_id)?;
    let withdrawals = crate::holdings_tracker::calculate_proportional_withdrawal(
        transaction.bundle_id,
        assignment.nav_tokens
    )?;

    for withdrawal in withdrawals {
        crate::holdings_tracker::update_bundle_holdings(
            transaction.bundle_id,
            &withdrawal.asset_id,
            -(withdrawal.amount as i64)
        )?;
    }

    crate::nav_token::burn_nav_tokens(transaction.user, transaction.bundle_id, assignment.nav_tokens)?;

    let _nav_tokens = crate::transaction_manager::unlock_user_funds(
        transaction_id,
        &LockedFundType::NAVTokens { bundle_id: transaction.bundle_id }
    )?;

    crate::transaction_manager::update_transaction_status(transaction_id, TransactionStatus::Completed)?;

    Ok(())
}

fn validate_assignment_against_request(request: &QuoteRequest, assignment: &QuoteAssignment) -> Result<(), String> {
    if request.request_id != assignment.request_id {
        return Err("Request ID mismatch".to_string());
    }

    match request.operation {
        OperationType::Buy => {
            if request.amount != assignment.ckusdc_amount {
                return Err("Buy amount mismatch".to_string());
            }
        }
        OperationType::Sell => {
            if request.amount != assignment.nav_tokens {
                return Err("Sell amount mismatch".to_string());
            }
        }
    }

    Ok(())
}

fn validate_asset_deposits(_assignment: &QuoteAssignment, deposits: &[(AssetId, u64)]) -> Result<(), String> {
    if deposits.is_empty() {
        return Err("No asset deposits provided".to_string());
    }

    for (asset_id, deposited_amount) in deposits {
        if *deposited_amount == 0 {
            return Err(format!("Zero deposit amount for asset {}", asset_id.0));
        }

        let asset_info = crate::asset_registry::get_asset(asset_id.clone())?;
        if !asset_info.is_active {
            return Err(format!("Asset {} is not active", asset_id.0));
        }
    }

    Ok(())
}