use ic_cdk::api::{time, msg_caller};
use crate::types::*;
use crate::memory::*;
use crate::admin::is_admin;
use candid::Principal;

pub fn get_assignment(assignment_id: u64) -> Result<QuoteAssignment, String> {
    QUOTE_ASSIGNMENTS.with(|assignments| {
        assignments.borrow()
            .get(&assignment_id)
            .ok_or_else(|| "Assignment not found".to_string())
    })
}

pub fn set_coordinator_public_key(public_key_hex: String) -> Result<(), String> {
    let _admin = crate::admin::require_admin()?;

    let public_key_bytes = hex_to_bytes(&public_key_hex)?;

    if public_key_bytes.len() != 32 {
        return Err("Ed25519 public key must be 32 bytes".to_string());
    }

    GLOBAL_STATE.with(|state| {
        let mut state = state.borrow_mut();
        let mut global_state = state.get().clone();

        global_state.coordinator_public_key = Some(public_key_bytes);

        state.set(global_state)
            .map_err(|_| "Failed to update global state".to_string())
    })
}

fn get_coordinator_public_key() -> Result<Vec<u8>, String> {
    GLOBAL_STATE.with(|state| {
        let state = state.borrow();
        let global_state = state.get();

        global_state.coordinator_public_key
            .clone()
            .ok_or_else(|| "Coordinator public key not configured".to_string())
    })
}

fn hex_to_bytes(hex: &str) -> Result<Vec<u8>, String> {
    let hex = hex.trim_start_matches("0x");

    if hex.len() % 2 != 0 {
        return Err("Hex string must have even length".to_string());
    }

    (0..hex.len())
        .step_by(2)
        .map(|i| {
            u8::from_str_radix(&hex[i..i + 2], 16)
                .map_err(|_| format!("Invalid hex at position {}", i))
        })
        .collect()
}

fn serialize_quote_for_signing(quote: &QuoteObject) -> Vec<u8> {
    let asset_amounts_str = quote.asset_amounts
        .iter()
        .map(|a| format!("{}:{}", a.asset_id.0, a.amount))
        .collect::<Vec<_>>()
        .join(",");

    format!(
        "{}:{}:{}:{}:{}:{}:{}:{}",
        quote.bundle_id,
        quote.resolver,
        quote.nav_tokens,
        quote.ckusdc_amount,
        asset_amounts_str,
        quote.fees,
        quote.nonce,
        quote.valid_until
    )
    .into_bytes()
}

fn consume_nonce(nonce: u64, timestamp: u64) -> Result<(), String> {
    USED_NONCES.with(|nonces| {
        let mut nonces = nonces.borrow_mut();
        if nonces.contains_key(&nonce) {
            return Err("Nonce already used (replay attack prevented)".to_string());
        }
        nonces.insert(nonce, timestamp);
        Ok(())
    })
}

fn validate_coordinator_signature(quote: &QuoteObject) -> Result<(), String> {
    use ic_crypto_ed25519::{PublicKey as Ed25519PublicKey, Signature as Ed25519Signature};

    let public_key_bytes = get_coordinator_public_key()?;
    let public_key = Ed25519PublicKey::try_from(public_key_bytes.as_slice())
        .map_err(|_| "Invalid Ed25519 public key format")?;

    let message = serialize_quote_for_signing(quote);

    let signature = Ed25519Signature::try_from(quote.coordinator_signature.as_slice())
        .map_err(|_| "Invalid Ed25519 signature format")?;

    public_key
        .verify_signature(&message, &signature)
        .map_err(|_| "Ed25519 signature verification failed - quote has been tampered with")?;

    Ok(())
}

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

pub async fn submit_quote_assignment(mut assignment: QuoteAssignment) -> Result<(), String> {
    if !is_authorized_quote_service(msg_caller()) {
        return Err("Only authorized quote service can submit assignments".to_string());
    }

    if !quote_request_exists(assignment.request_id) {
        return Err("Quote request not found".to_string());
    }

    if quote_assignment_exists(assignment.request_id) {
        return Err("Quote already assigned".to_string());
    }

    let request = get_quote_request(assignment.request_id)?;
    let bundle = crate::bundle_manager::get_bundle(request.bundle_id)?;

    let asset_amounts = match &request.operation {
        OperationType::InitialBuy { .. } | OperationType::Buy { .. } => {
            let usd_amount = match &request.operation {
                OperationType::InitialBuy { usd_amount, .. } => *usd_amount,
                OperationType::Buy { .. } => assignment.ckusdc_amount,
                _ => unreachable!()
            };

            let mut amounts = Vec::new();
            for allocation in &bundle.allocations {
                let asset_price = crate::oracle::get_asset_price(allocation.asset_id.clone()).await?;
                let asset_info = crate::asset_registry::get_asset(allocation.asset_id.clone())?;

                let usd_for_asset = (usd_amount as f64 * allocation.percentage as f64) / 100.0;
                let price_in_usd = asset_price.price_usd as f64 / 1e8;
                let amount_in_tokens = usd_for_asset / price_in_usd;
                let amount_in_base_units = amount_in_tokens * 10u64.pow(asset_info.decimals as u32) as f64;

                amounts.push(AssetAmount {
                    asset_id: allocation.asset_id.clone(),
                    amount: amount_in_base_units as u64,
                });
            }
            amounts
        }
        OperationType::Sell { .. } => {
            let withdrawals = crate::holdings_tracker::calculate_proportional_withdrawal(
                request.bundle_id,
                assignment.nav_tokens,
            ).await?;

            withdrawals.iter().map(|w| AssetAmount {
                asset_id: w.asset_id.clone(),
                amount: w.amount,
            }).collect()
        }
    };

    assignment.asset_amounts = asset_amounts;

    validate_quote_assignment(&assignment)?;

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

fn generate_request_id() -> u64 {
    get_next_quote_id()
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

fn is_authorized_quote_service(caller: candid::Principal) -> bool {
    get_quote_service_principal().map_or(false, |service| service == caller)
}

pub fn set_quote_service_principal(principal: candid::Principal) -> Result<(), String> {
    if !is_admin(msg_caller()) {
        return Err("Only admin can set quote service principal".to_string());
    }

    crate::memory::set_quote_service_principal(principal);

    Ok(())
}

fn validate_quote_request(request: &QuoteRequest) -> Result<(), String> {
    if request.bundle_id == 0 {
        return Err("Invalid bundle ID".to_string());
    }

    match &request.operation {
        OperationType::InitialBuy { usd_amount, nav_tokens } => {
            if *usd_amount == 0 {
                return Err("USD amount must be greater than zero".to_string());
            }
            if *nav_tokens == 0 {
                return Err("NAV tokens must be greater than zero".to_string());
            }
        }
        OperationType::Buy { nav_tokens } => {
            if *nav_tokens == 0 {
                return Err("NAV tokens must be greater than zero".to_string());
            }
        }
        OperationType::Sell { nav_tokens } => {
            if *nav_tokens == 0 {
                return Err("NAV tokens must be greater than zero".to_string());
            }
        }
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

pub async fn execute_quote(request_id: u64) -> Result<u64, String> {
    let caller = msg_caller();
    let request = get_quote_request(request_id)?;
    let assignment = get_quote_assignment(request_id)?
        .ok_or_else(|| "No quote assignment found".to_string())?;

    if request.user != caller {
        return Err("Only the quote requester can execute".to_string());
    }

    validate_buy_transaction_preconditions(&request, &assignment).await?;

    let transaction_id = crate::transaction_manager::create_transaction(request_id)?;

    match request.operation {
        OperationType::InitialBuy { .. } | OperationType::Buy { .. } => initiate_buy_transaction(transaction_id, &request, &assignment).await,
        OperationType::Sell { .. } => Ok(initiate_sell_transaction(transaction_id, &request, &assignment).await?),
    }
}

async fn validate_buy_transaction_preconditions(request: &QuoteRequest, assignment: &QuoteAssignment) -> Result<(), String> {
    if assignment.valid_until <= time() {
        return Err("Quote assignment expired".to_string());
    }

    validate_assignment_against_request(request, assignment)?;

    let bundle = crate::bundle_manager::get_bundle(request.bundle_id)?;
    if !bundle.is_active {
        return Err("Bundle is not active".to_string());
    }

    match &request.operation {
        OperationType::InitialBuy { usd_amount, nav_tokens } => {
            if *usd_amount != assignment.ckusdc_amount {
                return Err("Initial buy USD amount mismatch".to_string());
            }
            if *nav_tokens != assignment.nav_tokens {
                return Err("Initial buy NAV tokens mismatch".to_string());
            }
        }
        OperationType::Buy { nav_tokens } => {
            if *nav_tokens != assignment.nav_tokens {
                return Err("Buy NAV tokens mismatch".to_string());
            }
        }
        OperationType::Sell { nav_tokens } => {
            if *nav_tokens != assignment.nav_tokens {
                return Err("Sell NAV tokens mismatch".to_string());
            }

            let user_nav_balance = crate::nav_token::get_user_nav_token_balance(request.user, request.bundle_id).await?;
            if user_nav_balance < *nav_tokens {
                return Err("Insufficient NAV token balance".to_string());
            }
        }
    }

    Ok(())
}

async fn initiate_buy_transaction(transaction_id: u64, request: &QuoteRequest, assignment: &QuoteAssignment) -> Result<u64, String> {
    validate_buy_transaction_safety(request, assignment)?;

    let block_index = crate::transaction_manager::lock_and_transfer_ckusdc(
        transaction_id,
        request.user,
        assignment.ckusdc_amount
    ).await?;

    crate::transaction_manager::update_transaction_status(transaction_id, TransactionStatus::FundsLocked)?;

    ic_cdk::println!("Buy transaction initiated: transaction_id={}, user={}, bundle_id={}, ckusdc_amount={}, nav_tokens={}, block_index={}",
        transaction_id, request.user.to_text(), request.bundle_id, assignment.ckusdc_amount, assignment.nav_tokens, block_index);

    Ok(transaction_id)
}

async fn initiate_sell_transaction(transaction_id: u64, request: &QuoteRequest, assignment: &QuoteAssignment) -> Result<u64, String> {
    validate_sell_transaction_safety(request, assignment)?;

    let fund_type = LockedFundType::NAVTokens { bundle_id: request.bundle_id };
    crate::transaction_manager::lock_user_funds_with_validation(transaction_id, fund_type, assignment.nav_tokens).await?;

    crate::transaction_manager::update_transaction_status(transaction_id, TransactionStatus::FundsLocked)?;

    ic_cdk::println!("Sell transaction initiated: transaction_id={}, user={}, bundle_id={}, nav_tokens={}, ckusdc_amount={}",
        transaction_id, request.user.to_text(), request.bundle_id, assignment.nav_tokens, assignment.ckusdc_amount);

    Ok(transaction_id)
}

fn validate_buy_transaction_safety(request: &QuoteRequest, assignment: &QuoteAssignment) -> Result<(), String> {
    if assignment.nav_tokens == 0 {
        return Err("NAV tokens amount must be greater than zero".to_string());
    }

    if assignment.ckusdc_amount == 0 {
        return Err("ckUSDC amount must be greater than zero".to_string());
    }

    if assignment.estimated_nav == 0 {
        return Err("Estimated NAV must be greater than zero".to_string());
    }

    let max_slippage_amount = (assignment.estimated_nav * request.max_slippage as u64) / 100;
    let actual_nav_per_token = (assignment.ckusdc_amount * 100_000_000) / assignment.nav_tokens;

    if actual_nav_per_token > assignment.estimated_nav + max_slippage_amount {
        return Err("Price exceeds maximum slippage tolerance".to_string());
    }

    Ok(())
}

fn validate_sell_transaction_safety(request: &QuoteRequest, assignment: &QuoteAssignment) -> Result<(), String> {
    if assignment.nav_tokens == 0 {
        return Err("NAV tokens amount must be greater than zero".to_string());
    }

    if assignment.ckusdc_amount == 0 {
        return Err("ckUSDC amount must be greater than zero".to_string());
    }

    let min_expected_ckusdc = (assignment.nav_tokens * assignment.estimated_nav * (100 - request.max_slippage as u64)) / (100 * 100_000_000);

    if assignment.ckusdc_amount < min_expected_ckusdc {
        return Err("Sell price below minimum slippage tolerance".to_string());
    }

    Ok(())
}

pub async fn confirm_asset_deposit(request_id: u64) -> Result<(), String> {
    crate::buy_flow::confirm_asset_deposit(request_id).await
}

pub async fn confirm_ckusdc_payment(request_id: u64) -> Result<(), String> {
    crate::sell_flow::confirm_resolver_payment_and_complete_sell(request_id).await
}


fn validate_assignment_against_request(request: &QuoteRequest, assignment: &QuoteAssignment) -> Result<(), String> {
    if request.request_id != assignment.request_id {
        return Err("Request ID mismatch".to_string());
    }

    match &request.operation {
        OperationType::InitialBuy { usd_amount, nav_tokens } => {
            if *usd_amount != assignment.ckusdc_amount {
                return Err("Initial buy USD amount mismatch".to_string());
            }
            if *nav_tokens != assignment.nav_tokens {
                return Err("Initial buy NAV tokens mismatch".to_string());
            }
        }
        OperationType::Buy { nav_tokens } => {
            if *nav_tokens != assignment.nav_tokens {
                return Err("Buy NAV tokens mismatch".to_string());
            }
        }
        OperationType::Sell { nav_tokens } => {
            if *nav_tokens != assignment.nav_tokens {
                return Err("Sell NAV tokens mismatch".to_string());
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