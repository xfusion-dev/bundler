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