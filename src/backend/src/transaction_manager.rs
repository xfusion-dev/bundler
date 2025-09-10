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

pub fn validate_sufficient_balance(user: Principal, fund_type: &LockedFundType, amount: u64) -> Result<(), String> {
    match fund_type {
        LockedFundType::CkUSDC => {
            let user_balance = crate::nav_token::get_user_ckusdc_balance(user)?;
            let locked_amount = get_user_total_locked_amount(user, fund_type);
            let available_balance = user_balance.saturating_sub(locked_amount);

            if available_balance < amount {
                return Err(format!("Insufficient ckUSDC balance: {} required, {} available", amount, available_balance));
            }
        }
        LockedFundType::NAVTokens { bundle_id } => {
            let user_balance = crate::nav_token::get_user_nav_token_balance(user, *bundle_id)?;
            let locked_amount = get_user_total_locked_amount(user, fund_type);
            let available_balance = user_balance.saturating_sub(locked_amount);

            if available_balance < amount {
                return Err(format!("Insufficient NAV token balance for bundle {}: {} required, {} available", bundle_id, amount, available_balance));
            }
        }
    }
    Ok(())
}

pub fn get_user_total_locked_amount(user: Principal, fund_type: &LockedFundType) -> u64 {
    let user_locked_funds = get_user_locked_funds(user);
    user_locked_funds
        .iter()
        .filter(|locked| std::mem::discriminant(&locked.fund_type) == std::mem::discriminant(fund_type))
        .map(|locked| locked.amount)
        .sum()
}

pub fn lock_user_funds_with_validation(transaction_id: u64, fund_type: LockedFundType, amount: u64) -> Result<(), String> {
    let transaction = get_transaction(transaction_id)?;

    validate_sufficient_balance(transaction.user, &fund_type, amount)?;

    if is_fund_already_locked(transaction_id, &fund_type) {
        return Err("Funds already locked for this transaction".to_string());
    }

    lock_user_funds(transaction_id, fund_type, amount)
}

pub fn unlock_all_transaction_funds(transaction_id: u64) -> Result<Vec<(LockedFundType, u64)>, String> {
    let transaction = get_transaction(transaction_id)?;
    let mut unlocked_funds = Vec::new();

    let user_locked_funds = get_user_locked_funds(transaction.user);
    for locked_fund in user_locked_funds {
        if locked_fund.transaction_id == transaction_id {
            let amount = unlock_user_funds(transaction_id, &locked_fund.fund_type)?;
            unlocked_funds.push((locked_fund.fund_type, amount));
        }
    }

    Ok(unlocked_funds)
}

pub fn is_fund_already_locked(transaction_id: u64, fund_type: &LockedFundType) -> bool {
    let transaction = match get_transaction(transaction_id) {
        Ok(tx) => tx,
        Err(_) => return false,
    };

    let lock_key = generate_lock_key(&transaction.user, transaction_id, fund_type);

    LOCKED_FUNDS.with(|locks| {
        locks.borrow().contains_key(&lock_key)
    })
}

pub fn get_lock_expiration_time(transaction_id: u64, fund_type: &LockedFundType) -> Result<u64, String> {
    let transaction = get_transaction(transaction_id)?;
    let lock_key = generate_lock_key(&transaction.user, transaction_id, fund_type);

    LOCKED_FUNDS.with(|locks| {
        locks.borrow()
            .get(&lock_key)
            .map(|locked_fund| locked_fund.expires_at)
            .ok_or_else(|| "No locked funds found".to_string())
    })
}

pub fn extend_lock_expiration(transaction_id: u64, fund_type: &LockedFundType, new_expiration: u64) -> Result<(), String> {
    let transaction = get_transaction(transaction_id)?;
    let lock_key = generate_lock_key(&transaction.user, transaction_id, fund_type);

    LOCKED_FUNDS.with(|locks| {
        let mut locks = locks.borrow_mut();

        if let Some(mut locked_fund) = locks.get(&lock_key) {
            locked_fund.expires_at = new_expiration;
            locks.insert(lock_key, locked_fund);
            Ok(())
        } else {
            Err("No locked funds found to extend".to_string())
        }
    })
}

pub fn cleanup_expired_locks() -> u32 {
    let current_time = time();
    let mut cleaned_count = 0;

    let expired_lock_keys: Vec<String> = LOCKED_FUNDS.with(|locks| {
        locks.borrow()
            .iter()
            .filter_map(|(key, locked_fund)| {
                if locked_fund.expires_at <= current_time {
                    Some(key)
                } else {
                    None
                }
            })
            .collect()
    });

    for lock_key in expired_lock_keys {
        LOCKED_FUNDS.with(|locks| {
            locks.borrow_mut().remove(&lock_key)
        });
        cleaned_count += 1;
    }

    cleaned_count
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

pub fn get_transaction_summary(transaction_id: u64) -> Result<TransactionSummary, String> {
    let transaction = get_transaction(transaction_id)?;
    let duration_ms = if let Some(completed_at) = transaction.completed_at {
        Some((completed_at - transaction.created_at) / 1_000_000) // Convert ns to ms
    } else {
        None
    };

    Ok(TransactionSummary {
        id: transaction.id,
        user: transaction.user,
        bundle_id: transaction.bundle_id,
        operation: transaction.operation,
        status: transaction.status,
        nav_tokens: transaction.nav_tokens,
        ckusdc_amount: transaction.ckusdc_amount,
        created_at: transaction.created_at,
        duration_ms,
    })
}

pub fn get_transaction_stats() -> TransactionStats {
    let mut stats = TransactionStats {
        total_transactions: 0,
        completed_transactions: 0,
        failed_transactions: 0,
        pending_transactions: 0,
        total_volume_ckusdc: 0,
        total_nav_tokens_minted: 0,
        total_nav_tokens_burned: 0,
        average_completion_time_ms: 0,
    };

    let mut total_completion_time = 0u64;
    let mut completion_count = 0u64;

    TRANSACTIONS.with(|transactions| {
        for (_, transaction) in transactions.borrow().iter() {
            stats.total_transactions += 1;
            stats.total_volume_ckusdc += transaction.ckusdc_amount;

            match transaction.operation {
                OperationType::Buy => {
                    stats.total_nav_tokens_minted += transaction.nav_tokens;
                }
                OperationType::Sell => {
                    stats.total_nav_tokens_burned += transaction.nav_tokens;
                }
            }

            match transaction.status {
                TransactionStatus::Completed => {
                    stats.completed_transactions += 1;
                    if let Some(completed_at) = transaction.completed_at {
                        total_completion_time += (completed_at - transaction.created_at) / 1_000_000;
                        completion_count += 1;
                    }
                }
                TransactionStatus::Failed | TransactionStatus::TimedOut => {
                    stats.failed_transactions += 1;
                }
                _ => {
                    stats.pending_transactions += 1;
                }
            }
        }
    });

    if completion_count > 0 {
        stats.average_completion_time_ms = total_completion_time / completion_count;
    }

    stats
}

pub fn get_bundle_transaction_history(bundle_id: u64) -> BundleTransactionHistory {
    let mut history = BundleTransactionHistory {
        bundle_id,
        total_buy_transactions: 0,
        total_sell_transactions: 0,
        total_volume_bought: 0,
        total_volume_sold: 0,
        last_transaction_at: None,
        active_transactions: 0,
    };

    TRANSACTIONS.with(|transactions| {
        for (_, transaction) in transactions.borrow().iter() {
            if transaction.bundle_id != bundle_id {
                continue;
            }

            match transaction.operation {
                OperationType::Buy => {
                    history.total_buy_transactions += 1;
                    if matches!(transaction.status, TransactionStatus::Completed) {
                        history.total_volume_bought += transaction.ckusdc_amount;
                    }
                }
                OperationType::Sell => {
                    history.total_sell_transactions += 1;
                    if matches!(transaction.status, TransactionStatus::Completed) {
                        history.total_volume_sold += transaction.ckusdc_amount;
                    }
                }
            }

            if !matches!(transaction.status, TransactionStatus::Completed | TransactionStatus::Failed | TransactionStatus::TimedOut) {
                history.active_transactions += 1;
            }

            if history.last_transaction_at.is_none() || Some(transaction.created_at) > history.last_transaction_at {
                history.last_transaction_at = Some(transaction.created_at);
            }
        }
    });

    history
}

pub fn get_user_transaction_summary(user: Principal) -> UserTransactionSummary {
    let mut summary = UserTransactionSummary {
        user,
        total_transactions: 0,
        buy_transactions: 0,
        sell_transactions: 0,
        total_volume_ckusdc: 0,
        current_locked_funds: 0,
        last_transaction_at: None,
    };

    TRANSACTIONS.with(|transactions| {
        for (_, transaction) in transactions.borrow().iter() {
            if transaction.user != user {
                continue;
            }

            summary.total_transactions += 1;

            match transaction.operation {
                OperationType::Buy => {
                    summary.buy_transactions += 1;
                }
                OperationType::Sell => {
                    summary.sell_transactions += 1;
                }
            }

            if matches!(transaction.status, TransactionStatus::Completed) {
                summary.total_volume_ckusdc += transaction.ckusdc_amount;
            }

            if summary.last_transaction_at.is_none() || Some(transaction.created_at) > summary.last_transaction_at {
                summary.last_transaction_at = Some(transaction.created_at);
            }
        }
    });

    // Calculate current locked funds
    let locked_funds = get_user_locked_funds(user);
    for locked_fund in locked_funds {
        match locked_fund.fund_type {
            LockedFundType::CkUSDC => {
                summary.current_locked_funds += locked_fund.amount;
            }
            LockedFundType::NAVTokens { .. } => {
                // For NAV tokens, we could convert to USD value, but for now just count the amount
                summary.current_locked_funds += locked_fund.amount;
            }
        }
    }

    summary
}

pub fn get_transactions_by_status(status: TransactionStatus) -> Vec<Transaction> {
    TRANSACTIONS.with(|transactions| {
        transactions.borrow()
            .iter()
            .filter_map(|(_, transaction)| {
                if std::mem::discriminant(&transaction.status) == std::mem::discriminant(&status) {
                    Some(transaction)
                } else {
                    None
                }
            })
            .collect()
    })
}

pub fn get_recent_transactions(limit: usize) -> Vec<TransactionSummary> {
    let mut recent_transactions: Vec<Transaction> = TRANSACTIONS.with(|transactions| {
        transactions.borrow()
            .iter()
            .map(|(_, transaction)| transaction)
            .collect()
    });

    // Sort by creation time, most recent first
    recent_transactions.sort_by(|a, b| b.created_at.cmp(&a.created_at));

    recent_transactions
        .into_iter()
        .take(limit)
        .map(|transaction| {
            let duration_ms = if let Some(completed_at) = transaction.completed_at {
                Some((completed_at - transaction.created_at) / 1_000_000)
            } else {
                None
            };

            TransactionSummary {
                id: transaction.id,
                user: transaction.user,
                bundle_id: transaction.bundle_id,
                operation: transaction.operation,
                status: transaction.status,
                nav_tokens: transaction.nav_tokens,
                ckusdc_amount: transaction.ckusdc_amount,
                created_at: transaction.created_at,
                duration_ms,
            }
        })
        .collect()
}

pub fn monitor_transaction_health() -> Result<(), String> {
    let current_time = time();
    let warning_threshold = TRANSACTION_TIMEOUT_NS / 2; // Warn at 15 minutes

    let mut warnings = Vec::new();

    TRANSACTIONS.with(|transactions| {
        for (_, transaction) in transactions.borrow().iter() {
            if matches!(transaction.status, TransactionStatus::Completed | TransactionStatus::Failed | TransactionStatus::TimedOut) {
                continue;
            }

            let age = current_time - transaction.created_at;
            if age > warning_threshold {
                warnings.push(format!(
                    "Transaction {} is taking longer than expected ({}ms)",
                    transaction.id,
                    age / 1_000_000
                ));
            }
        }
    });

    if !warnings.is_empty() {
        ic_cdk::println!("Transaction health warnings: {:?}", warnings);
    }

    Ok(())
}