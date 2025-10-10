use candid::{CandidType, Nat, Principal};
use ic_cdk::api::call::CallResult;
use serde::{Deserialize, Serialize};

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct Account {
    pub owner: Principal,
    pub subaccount: Option<Vec<u8>>,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub enum TransferError {
    GenericError { message: String, error_code: Nat },
    TemporarilyUnavailable,
    BadBurn { min_burn_amount: Nat },
    Duplicate { duplicate_of: u64 },
    BadFee { expected_fee: Nat },
    CreatedInFuture { ledger_time: u64 },
    TooOld,
    InsufficientFunds { balance: Nat },
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub enum TransferResult {
    Ok(u64),
    Err(TransferError),
}

#[derive(CandidType, Serialize, Deserialize)]
struct Icrc151TransferFromArgs {
    pub token_id: Vec<u8>,
    pub spender_subaccount: Option<Vec<u8>>,
    pub from: Account,
    pub to: Account,
    pub amount: Nat,
    pub fee: Option<Nat>,
    pub memo: Option<Vec<u8>>,
    pub created_at_time: Option<u64>,
}

pub async fn transfer_from_icrc151(
    ledger: Principal,
    token_id: Vec<u8>,
    from: Account,
    to: Account,
    amount: u64,
    memo: Option<Vec<u8>>,
) -> Result<u64, String> {
    let args = Icrc151TransferFromArgs {
        token_id,
        spender_subaccount: None,
        from,
        to,
        amount: Nat::from(amount),
        fee: None,
        memo,
        created_at_time: None,
    };

    let result: CallResult<(TransferResult,)> = ic_cdk::call(
        ledger,
        "icrc151_transfer_from",
        (args,),
    ).await;

    match result {
        Ok((TransferResult::Ok(tx_id),)) => Ok(tx_id),
        Ok((TransferResult::Err(e),)) => Err(format!("Transfer failed: {:?}", e)),
        Err((code, msg)) => Err(format!("Call failed: {:?} - {}", code, msg)),
    }
}

#[derive(CandidType, Serialize, Deserialize)]
struct Icrc151TransferArgs {
    pub token_id: Vec<u8>,
    pub from_subaccount: Option<Vec<u8>>,
    pub to: Account,
    pub amount: Nat,
    pub fee: Option<Nat>,
    pub memo: Option<Vec<u8>>,
    pub created_at_time: Option<u64>,
}

pub async fn transfer_icrc151(
    ledger: Principal,
    token_id: Vec<u8>,
    to: Account,
    amount: u64,
    memo: Option<Vec<u8>>,
) -> Result<u64, String> {
    let args = Icrc151TransferArgs {
        token_id,
        from_subaccount: None,
        to,
        amount: Nat::from(amount),
        fee: None,
        memo,
        created_at_time: None,
    };

    let result: CallResult<(TransferResult,)> = ic_cdk::call(
        ledger,
        "icrc151_transfer",
        (args,),
    ).await;

    match result {
        Ok((TransferResult::Ok(tx_id),)) => Ok(tx_id),
        Ok((TransferResult::Err(e),)) => Err(format!("Transfer failed: {:?}", e)),
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
        (token_id, to, Nat::from(amount), memo),
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
        (token_id, from, Nat::from(amount), memo),
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

pub async fn create_token_icrc151(
    ledger: Principal,
    name: String,
    symbol: String,
    decimals: u8,
    fee: Option<u64>,
    logo: Option<String>,
    description: Option<String>,
) -> Result<Vec<u8>, String> {
    let result: CallResult<(Result<Vec<u8>, String>,)> = ic_cdk::call(
        ledger,
        "create_token",
        (name, symbol, decimals, fee, None::<u64>, logo, description),
    ).await;

    match result {
        Ok((Ok(token_id),)) => Ok(token_id),
        Ok((Err(e),)) => Err(format!("Token creation failed: {}", e)),
        Err((code, msg)) => Err(format!("Call failed: {:?} - {}", code, msg)),
    }
}
