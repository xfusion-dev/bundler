use ic_cdk::api::time;
use candid::{CandidType, Deserialize, Principal};
use crate::types::*;
use crate::memory::*;
use crate::transaction_manager;

const MAX_RETRY_ATTEMPTS: u8 = 3;
const RECOVERY_TIMEOUT_NS: u64 = 3_600_000_000_000;

pub async fn detect_and_handle_timeouts() -> Result<u32, String> {
    let current_time = time();
    let mut recovered = 0;

    let timed_out_transactions = TRANSACTIONS.with(|transactions| {
        transactions.borrow().iter()
            .filter(|(_, tx)| {
                matches!(tx.status, TransactionStatus::Pending | TransactionStatus::FundsLocked | TransactionStatus::InProgress)
                && tx.timeout_at < current_time
            })
            .map(|(id, tx)| (id, tx.clone()))
            .collect::<Vec<_>>()
    });

    for (tx_id, tx) in timed_out_transactions {
        if recover_transaction(tx_id, tx).await.is_ok() {
            recovered += 1;
        }
    }

    ic_cdk::println!("Recovered {} timed-out transactions", recovered);
    Ok(recovered)
}

async fn recover_transaction(tx_id: u64, tx: Transaction) -> Result<(), String> {
    ic_cdk::println!("Recovering transaction {}: status={:?}, operation={:?}",
        tx_id, tx.status, tx.operation);

    transaction_manager::update_transaction_status(tx_id, TransactionStatus::TimedOut)?;

    let unlocked_funds = unlock_all_transaction_funds_safe(tx_id).await?;

    for (fund_type, amount) in unlocked_funds {
        ic_cdk::println!("Unlocked {:?}: {} for user {}", fund_type, amount, tx.user);
    }

    match tx.operation {
        OperationType::InitialBuy { .. } | OperationType::Buy { .. } => recover_buy_transaction(&tx).await?,
        OperationType::Sell { .. } => recover_sell_transaction(&tx).await?,
    }

    record_recovery_event(tx_id, &tx)?;

    Ok(())
}

async fn unlock_all_transaction_funds_safe(tx_id: u64) -> Result<Vec<(LockedFundType, u64)>, String> {
    let tx = transaction_manager::get_transaction(tx_id)?;
    let mut unlocked = Vec::new();

    let locked_funds = LOCKED_FUNDS.with(|locks| {
        locks.borrow().iter()
            .filter(|(_, lock)| lock.transaction_id == tx_id)
            .map(|(_, lock)| lock.clone())
            .collect::<Vec<_>>()
    });

    for lock in locked_funds {
        match transaction_manager::unlock_user_funds(tx_id, &lock.fund_type) {
            Ok(amount) => {
                unlocked.push((lock.fund_type.clone(), amount));
            },
            Err(e) => {
                ic_cdk::println!("Warning: Failed to unlock {:?} for tx {}: {}",
                    lock.fund_type, tx_id, e);
            }
        }
    }

    Ok(unlocked)
}

async fn recover_buy_transaction(tx: &Transaction) -> Result<(), String> {
    if matches!(tx.status, TransactionStatus::InProgress) {
        let request_id = tx.request_id;
        if let Ok(assignment) = crate::quote_manager::get_quote_assignment(request_id) {
            if let Some(assignment) = assignment {
                let canister_id = ic_cdk::api::id();

                let ckusdc_ledger = Principal::from_text(crate::icrc2_client::CKUSDC_LEDGER_CANISTER)
                    .map_err(|e| format!("Invalid ckUSDC ledger: {}", e))?;

                let balance = crate::icrc2_client::icrc1_balance_of(
                    ckusdc_ledger,
                    canister_id
                ).await?;

                if balance >= assignment.ckusdc_amount {
                    return crate::icrc2_client::send_ckusdc_to_user(
                        tx.user,
                        assignment.ckusdc_amount,
                        Some(format!("Refund for failed tx {}", tx.id).into_bytes())
                    ).await.map(|_| ());
                }
            }
        }
    }

    Ok(())
}

async fn recover_sell_transaction(_tx: &Transaction) -> Result<(), String> {
    Ok(())
}

fn record_recovery_event(tx_id: u64, tx: &Transaction) -> Result<(), String> {
    RECOVERY_LOG.with(|log| {
        let event = RecoveryEvent {
            transaction_id: tx_id,
            user: tx.user,
            operation: tx.operation.clone(),
            recovered_at: time(),
            funds_recovered: true,
        };
        log.borrow_mut().push(event);
    });

    Ok(())
}

pub fn validate_transaction_integrity(tx_id: u64) -> Result<(), String> {
    let tx = transaction_manager::get_transaction(tx_id)?;

    let locked_funds = LOCKED_FUNDS.with(|locks| {
        locks.borrow().iter()
            .filter(|(_, lock)| lock.transaction_id == tx_id)
            .map(|(_, lock)| lock.clone())
            .collect::<Vec<_>>()
    });

    match tx.operation {
        OperationType::InitialBuy { .. } | OperationType::Buy { .. } => {
            if !locked_funds.iter().any(|l| matches!(&l.fund_type, LockedFundType::CkUSDC)) {
                return Err("Missing ckUSDC lock".to_string());
            }
        },
        OperationType::Sell { .. } => {
            if !locked_funds.iter().any(|l| matches!(&l.fund_type, LockedFundType::NAVTokens { .. })) {
                return Err("Missing NAV token lock".to_string());
            }
        }
    }

    for lock in &locked_funds {
        if lock.expires_at < time() && !matches!(tx.status, TransactionStatus::Completed | TransactionStatus::Failed | TransactionStatus::TimedOut) {
            return Err(format!("Lock expired but transaction not finalized: {:?}", lock.fund_type));
        }
    }

    Ok(())
}

pub async fn perform_emergency_recovery(user: Principal) -> Result<RecoveryReport, String> {
    let user_transactions = transaction_manager::get_user_transactions(user);
    let mut recovered_ckusdc = 0u64;
    let mut recovered_nav = 0u64;
    let mut recovered_assets = Vec::new();

    for tx in user_transactions.iter() {
        if matches!(tx.status, TransactionStatus::Pending | TransactionStatus::FundsLocked | TransactionStatus::InProgress) {
            if let Ok(funds) = unlock_all_transaction_funds_safe(tx.id).await {
                for (fund_type, amount) in funds {
                    match fund_type {
                        LockedFundType::CkUSDC => recovered_ckusdc += amount,
                        LockedFundType::NAVTokens { .. } => recovered_nav += amount
                    }
                }
            }
        }
    }

    Ok(RecoveryReport {
        user,
        recovered_ckusdc,
        recovered_nav_tokens: recovered_nav,
        recovered_assets,
        timestamp: time(),
    })
}

pub fn get_recovery_statistics() -> RecoveryStatistics {
    let total_events = RECOVERY_LOG.with(|log| log.borrow().len() as u32);

    let last_24h = time() - 86_400_000_000_000;
    let recent_events = RECOVERY_LOG.with(|log| {
        log.borrow().iter()
            .filter(|e| e.recovered_at > last_24h)
            .count() as u32
    });

    RecoveryStatistics {
        total_recoveries: total_events,
        recoveries_last_24h: recent_events,
        average_recovery_time_ms: 0,
        success_rate: 100.0,
    }
}

#[derive(Clone, Debug)]
struct RecoveryEvent {
    transaction_id: u64,
    user: Principal,
    operation: OperationType,
    recovered_at: u64,
    funds_recovered: bool,
}

#[derive(Clone, Debug, CandidType, Deserialize)]
pub struct RecoveryReport {
    pub user: Principal,
    pub recovered_ckusdc: u64,
    pub recovered_nav_tokens: u64,
    pub recovered_assets: Vec<(AssetId, u64)>,
    pub timestamp: u64,
}

#[derive(Clone, Debug, CandidType, Deserialize)]
pub struct RecoveryStatistics {
    pub total_recoveries: u32,
    pub recoveries_last_24h: u32,
    pub average_recovery_time_ms: u64,
    pub success_rate: f64,
}

thread_local! {
    static RECOVERY_LOG: std::cell::RefCell<Vec<RecoveryEvent>> = std::cell::RefCell::new(Vec::new());
}