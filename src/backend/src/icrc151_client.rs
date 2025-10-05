use candid::{CandidType, Principal};
use ic_cdk::api::call::CallResult;
use serde::{Deserialize, Serialize};

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct Account {
    pub owner: Principal,
    pub subaccount: Option<Vec<u8>>,
}

pub async fn transfer_from_icrc151(
    ledger: Principal,
    token_id: Vec<u8>,
    from: Account,
    to: Account,
    amount: u64,
    memo: Option<Vec<u8>>,
) -> Result<u64, String> {
    let result: CallResult<(Result<u64, String>,)> = ic_cdk::call(
        ledger,
        "icrc151_transfer_from",
        (
            token_id.clone(),
            None::<Vec<u8>>,
            from,
            to,
            amount,
            None::<u64>,
            memo,
            None::<u64>,
        ),
    ).await;

    match result {
        Ok((Ok(tx_id),)) => Ok(tx_id),
        Ok((Err(e),)) => Err(format!("Transfer failed: {}", e)),
        Err((code, msg)) => Err(format!("Call failed: {:?} - {}", code, msg)),
    }
}

pub async fn transfer_icrc151(
    ledger: Principal,
    token_id: Vec<u8>,
    to: Account,
    amount: u64,
    memo: Option<Vec<u8>>,
) -> Result<u64, String> {
    let result: CallResult<(Result<u64, String>,)> = ic_cdk::call(
        ledger,
        "icrc151_transfer",
        (
            token_id.clone(),
            None::<Vec<u8>>,
            to,
            amount,
            None::<u64>,
            memo,
            None::<u64>,
        ),
    ).await;

    match result {
        Ok((Ok(tx_id),)) => Ok(tx_id),
        Ok((Err(e),)) => Err(format!("Transfer failed: {}", e)),
        Err((code, msg)) => Err(format!("Call failed: {:?} - {}", code, msg)),
    }
}

pub async fn mint_icrc151(
    ledger: Principal,
    token_id: Vec<u8>,
    to: Account,
    amount: u64,
    memo: Option<Vec<u8>>,
) -> Result<u64, String> {
    let result: CallResult<(Result<u64, String>,)> = ic_cdk::call(
        ledger,
        "mint_tokens",
        (token_id, to, amount, memo),
    ).await;

    match result {
        Ok((Ok(tx_id),)) => Ok(tx_id),
        Ok((Err(e),)) => Err(format!("Mint failed: {}", e)),
        Err((code, msg)) => Err(format!("Call failed: {:?} - {}", code, msg)),
    }
}

pub async fn burn_icrc151(
    ledger: Principal,
    token_id: Vec<u8>,
    from: Account,
    amount: u64,
    memo: Option<Vec<u8>>,
) -> Result<u64, String> {
    let result: CallResult<(Result<u64, String>,)> = ic_cdk::call(
        ledger,
        "burn_tokens_from",
        (token_id, from, amount, memo),
    ).await;

    match result {
        Ok((Ok(tx_id),)) => Ok(tx_id),
        Ok((Err(e),)) => Err(format!("Burn failed: {}", e)),
        Err((code, msg)) => Err(format!("Call failed: {:?} - {}", code, msg)),
    }
}

pub async fn get_balance_icrc151(
    ledger: Principal,
    token_id: Vec<u8>,
    account: Account,
) -> Result<u64, String> {
    let result: CallResult<(u64,)> = ic_cdk::call(
        ledger,
        "icrc1_balance_of",
        (token_id, account),
    ).await;

    match result {
        Ok((balance,)) => Ok(balance),
        Err((code, msg)) => Err(format!("Balance query failed: {:?} - {}", code, msg)),
    }
}

pub async fn get_allowance_icrc151(
    ledger: Principal,
    token_id: Vec<u8>,
    owner: Account,
    spender: Account,
) -> Result<u64, String> {
    let result: CallResult<(u64,)> = ic_cdk::call(
        ledger,
        "icrc2_allowance",
        (token_id, owner, spender),
    ).await;

    match result {
        Ok((allowance,)) => Ok(allowance),
        Err((code, msg)) => Err(format!("Allowance query failed: {:?} - {}", code, msg)),
    }
}
