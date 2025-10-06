use ic_cdk::api::{time, msg_caller};
use crate::types::*;
use crate::memory::*;

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
            .map(|_| ())
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
    use ed25519_dalek::{Verifier, VerifyingKey, Signature};

    let public_key_bytes = get_coordinator_public_key()?;

    if public_key_bytes.len() != 32 {
        return Err("Ed25519 public key must be 32 bytes".to_string());
    }

    let mut key_array = [0u8; 32];
    key_array.copy_from_slice(&public_key_bytes);

    let public_key = VerifyingKey::from_bytes(&key_array)
        .map_err(|_| "Invalid Ed25519 public key format")?;

    let message = serialize_quote_for_signing(quote);

    if quote.coordinator_signature.len() != 64 {
        return Err("Ed25519 signature must be 64 bytes".to_string());
    }

    let mut sig_array = [0u8; 64];
    sig_array.copy_from_slice(&quote.coordinator_signature);

    let signature = Signature::from_bytes(&sig_array);

    public_key
        .verify(&message, &signature)
        .map_err(|_| "Ed25519 signature verification failed - quote has been tampered with")?;

    Ok(())
}



pub async fn execute_quote(quote: QuoteObject) -> Result<u64, String> {
    let user = msg_caller();

    validate_coordinator_signature(&quote)?;

    let current_time = time();
    if current_time > quote.valid_until {
        return Err(format!(
            "Quote expired at {}, current time is {}",
            quote.valid_until,
            current_time
        ));
    }

    consume_nonce(quote.nonce, current_time)?;

    let _bundle = crate::bundle_manager::get_bundle(quote.bundle_id)?;

    let transaction_id = crate::transaction_manager::create_transaction_from_quote(&quote, user)?;

    match &quote.operation {
        OperationType::InitialBuy { .. } | OperationType::Buy { .. } => {
            crate::transaction_manager::lock_user_funds_with_validation(
                transaction_id,
                LockedFundType::CkUSDC,
                quote.ckusdc_amount,
            ).await?;
        }
        OperationType::Sell { .. } => {
            crate::transaction_manager::lock_user_funds_with_validation(
                transaction_id,
                LockedFundType::NAVTokens { bundle_id: quote.bundle_id },
                quote.nav_tokens,
            ).await?;
        }
    }

    if matches!(quote.operation, OperationType::InitialBuy { .. } | OperationType::Buy { .. }) {
        let ckusdc_ledger = candid::Principal::from_text(crate::icrc2_client::CKUSDC_LEDGER_CANISTER)
            .map_err(|e| format!("Invalid ckUSDC ledger: {}", e))?;

        let pull_memo = format!("Lock ckUSDC for tx {}", transaction_id).into_bytes();

        crate::icrc2_client::icrc2_transfer_from(
            ckusdc_ledger,
            user,
            ic_cdk::api::id(),
            quote.ckusdc_amount,
            Some(pull_memo),
        ).await?;
    }

    let assignment = QuoteAssignment {
        request_id: transaction_id,
        resolver: quote.resolver,
        nav_tokens: quote.nav_tokens,
        ckusdc_amount: quote.ckusdc_amount,
        asset_amounts: quote.asset_amounts.clone(),
        estimated_nav: 0,
        fees: quote.fees,
        valid_until: quote.valid_until,
        assigned_at: current_time,
    };

    QUOTE_ASSIGNMENTS.with(|assignments| {
        assignments.borrow_mut().insert(transaction_id, assignment);
    });

    Ok(transaction_id)
}


pub async fn confirm_asset_deposit(request_id: u64) -> Result<(), String> {
    crate::buy_flow::confirm_asset_deposit(request_id).await
}

pub async fn confirm_ckusdc_payment(request_id: u64) -> Result<(), String> {
    crate::sell_flow::confirm_resolver_payment_and_complete_sell(request_id).await
}