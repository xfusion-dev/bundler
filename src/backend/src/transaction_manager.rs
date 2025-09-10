use ic_cdk::api::{time, msg_caller};
use candid::Principal;
use crate::types::*;
use crate::memory::*;

const TRANSACTION_TIMEOUT_NS: u64 = 1_800_000_000_000; // 30 minutes

pub fn create_transaction(request_id: u64) -> Result<u64, String> {
    let assignment = get_quote_assignment_internal(request_id)?;
    let request = get_quote_request_internal(request_id)?;

    if assignment.assigned_at + assignment.valid_until < time() {
        return Err("Quote assignment expired".to_string());
    }

    let transaction_id = generate_transaction_id();
    let current_time = time();

    let transaction = Transaction {
        id: transaction_id,
        request_id,
        user: request.user,
        resolver: assignment.resolver,
        bundle_id: request.bundle_id,
        operation: request.operation,
        status: TransactionStatus::Pending,
        nav_tokens: assignment.nav_tokens,
        ckusdc_amount: assignment.ckusdc_amount,
        created_at: current_time,
        updated_at: current_time,
        completed_at: None,
        timeout_at: current_time + TRANSACTION_TIMEOUT_NS,
    };

    TRANSACTIONS.with(|transactions| {
        transactions.borrow_mut().insert(transaction_id, transaction)
    });

    Ok(transaction_id)
}

pub fn get_transaction(transaction_id: u64) -> Result<Transaction, String> {
    TRANSACTIONS.with(|transactions| {
        transactions.borrow()
            .get(&transaction_id)
            .ok_or_else(|| "Transaction not found".to_string())
    })
}

pub fn update_transaction_status(transaction_id: u64, status: TransactionStatus) -> Result<(), String> {
    TRANSACTIONS.with(|transactions| {
        let mut transactions = transactions.borrow_mut();

        if let Some(mut transaction) = transactions.get(&transaction_id) {
            transaction.status = status;
            transaction.updated_at = time();

            if matches!(transaction.status, TransactionStatus::Completed | TransactionStatus::Failed | TransactionStatus::TimedOut) {
                transaction.completed_at = Some(time());
            }

            transactions.insert(transaction_id, transaction);
            Ok(())
        } else {
            Err("Transaction not found".to_string())
        }
    })
}

pub fn lock_user_funds(transaction_id: u64, fund_type: LockedFundType, amount: u64) -> Result<(), String> {
    let transaction = get_transaction(transaction_id)?;

    if !matches!(transaction.status, TransactionStatus::Pending) {
        return Err("Transaction not in pending state".to_string());
    }

    let lock_key = generate_lock_key(&transaction.user, transaction_id, &fund_type);
    let current_time = time();

    let locked_funds = LockedFunds {
        user: transaction.user,
        transaction_id,
        fund_type,
        amount,
        locked_at: current_time,
        expires_at: transaction.timeout_at,
    };

    LOCKED_FUNDS.with(|locks| {
        locks.borrow_mut().insert(lock_key, locked_funds)
    });

    update_transaction_status(transaction_id, TransactionStatus::FundsLocked)?;

    Ok(())
}

pub fn unlock_user_funds(transaction_id: u64, fund_type: &LockedFundType) -> Result<u64, String> {
    let transaction = get_transaction(transaction_id)?;
    let lock_key = generate_lock_key(&transaction.user, transaction_id, fund_type);

    LOCKED_FUNDS.with(|locks| {
        let mut locks = locks.borrow_mut();

        if let Some(locked_funds) = locks.remove(&lock_key) {
            Ok(locked_funds.amount)
        } else {
            Err("No locked funds found".to_string())
        }
    })
}

pub fn get_user_locked_funds(user: Principal) -> Vec<LockedFunds> {
    let user_prefix = format!("{}:", user.to_text());

    LOCKED_FUNDS.with(|locks| {
        locks.borrow()
            .iter()
            .filter_map(|(key, locked_funds)| {
                if key.starts_with(&user_prefix) {
                    Some(locked_funds)
                } else {
                    None
                }
            })
            .collect()
    })
}

pub fn cleanup_expired_transactions() -> u32 {
    let current_time = time();
    let mut cleaned_count = 0;

    let expired_transaction_ids: Vec<u64> = TRANSACTIONS.with(|transactions| {
        transactions.borrow()
            .iter()
            .filter_map(|(transaction_id, transaction)| {
                if transaction.timeout_at <= current_time &&
                   !matches!(transaction.status, TransactionStatus::Completed) {
                    Some(transaction_id)
                } else {
                    None
                }
            })
            .collect()
    });

    for transaction_id in expired_transaction_ids {
        if let Ok(transaction) = get_transaction(transaction_id) {
            // Unlock any locked funds
            match transaction.operation {
                OperationType::Buy => {
                    let _ = unlock_user_funds(transaction_id, &LockedFundType::CkUSDC);
                }
                OperationType::Sell => {
                    let _ = unlock_user_funds(transaction_id, &LockedFundType::NAVTokens {
                        bundle_id: transaction.bundle_id
                    });
                }
            }

            // Mark transaction as timed out
            let _ = update_transaction_status(transaction_id, TransactionStatus::TimedOut);
            cleaned_count += 1;
        }
    }

    cleaned_count
}

pub fn get_user_transactions(user: Principal) -> Vec<Transaction> {
    TRANSACTIONS.with(|transactions| {
        transactions.borrow()
            .iter()
            .filter_map(|(_, transaction)| {
                if transaction.user == user {
                    Some(transaction)
                } else {
                    None
                }
            })
            .collect()
    })
}

pub fn validate_resolver_for_transaction(transaction_id: u64) -> Result<(), String> {
    let transaction = get_transaction(transaction_id)?;
    let caller = msg_caller();

    if transaction.resolver != caller {
        return Err("Only assigned resolver can perform this action".to_string());
    }

    if !matches!(transaction.status, TransactionStatus::FundsLocked | TransactionStatus::WaitingForResolver) {
        return Err("Transaction not in valid state for resolver action".to_string());
    }

    Ok(())
}

fn generate_transaction_id() -> u64 {
    TRANSACTION_COUNTER.with(|counter| {
        let mut counter = counter.borrow_mut();
        *counter += 1;
        *counter
    })
}

fn generate_lock_key(user: &Principal, transaction_id: u64, fund_type: &LockedFundType) -> String {
    match fund_type {
        LockedFundType::CkUSDC => {
            format!("{}:{}:ckusdc", user.to_text(), transaction_id)
        }
        LockedFundType::NAVTokens { bundle_id } => {
            format!("{}:{}:nav:{}", user.to_text(), transaction_id, bundle_id)
        }
    }
}

fn get_quote_assignment_internal(request_id: u64) -> Result<QuoteAssignment, String> {
    crate::quote_manager::get_quote_assignment(request_id)?
        .ok_or_else(|| "No quote assignment found".to_string())
}

fn get_quote_request_internal(request_id: u64) -> Result<QuoteRequest, String> {
    crate::quote_manager::get_quote_request(request_id)
}

pub fn get_transaction_by_request(request_id: u64) -> Result<Transaction, String> {
    TRANSACTIONS.with(|transactions| {
        transactions.borrow()
            .iter()
            .find_map(|(_, transaction)| {
                if transaction.request_id == request_id {
                    Some(transaction)
                } else {
                    None
                }
            })
            .ok_or_else(|| "Transaction not found for request".to_string())
    })
}