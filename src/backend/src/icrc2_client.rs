use candid::Principal;
use ic_cdk::api::call::CallResult;
use crate::types::*;

pub const CKUSDC_LEDGER_CANISTER: &str = "xevnm-gaaaa-aaaar-qafnq-cai";

#[derive(candid::CandidType, candid::Deserialize, Clone, Debug)]
pub struct Account {
    pub owner: Principal,
    pub subaccount: Option<[u8; 32]>,
}

#[derive(candid::CandidType, candid::Deserialize, Clone, Debug)]
pub struct TransferArgs {
    pub from_subaccount: Option<[u8; 32]>,
    pub to: Account,
    pub amount: u64,
    pub fee: Option<u64>,
    pub memo: Option<Vec<u8>>,
    pub created_at_time: Option<u64>,
}

#[derive(candid::CandidType, candid::Deserialize, Clone, Debug)]
pub struct TransferFromArgs {
    pub spender_subaccount: Option<[u8; 32]>,
    pub from: Account,
    pub to: Account,
    pub amount: u64,
    pub fee: Option<u64>,
    pub memo: Option<Vec<u8>>,
    pub created_at_time: Option<u64>,
}

#[derive(candid::CandidType, candid::Deserialize, Clone, Debug)]
pub struct ApproveArgs {
    pub from_subaccount: Option<[u8; 32]>,
    pub spender: Account,
    pub amount: u64,
    pub expected_allowance: Option<u64>,
    pub expires_at: Option<u64>,
    pub fee: Option<u64>,
    pub memo: Option<Vec<u8>>,
    pub created_at_time: Option<u64>,
}

#[derive(candid::CandidType, candid::Deserialize, Clone, Debug)]
pub struct AllowanceArgs {
    pub account: Account,
    pub spender: Account,
}

#[derive(candid::CandidType, candid::Deserialize, Clone, Debug)]
pub struct Allowance {
    pub allowance: u64,
    pub expires_at: Option<u64>,
}

#[derive(candid::CandidType, candid::Deserialize, Clone, Debug)]
pub enum TransferResult {
    Ok(u64),
    Err(TransferError),
}

#[derive(candid::CandidType, candid::Deserialize, Clone, Debug)]
pub enum ApproveResult {
    Ok(u64),
    Err(ApproveError),
}

#[derive(candid::CandidType, candid::Deserialize, Clone, Debug)]
pub enum TransferError {
    BadFee { expected_fee: u64 },
    BadBurn { min_burn_amount: u64 },
    InsufficientFunds { balance: u64 },
    InsufficientAllowance { allowance: u64 },
    TooOld,
    CreatedInFuture { ledger_time: u64 },
    Duplicate { duplicate_of: u64 },
    TemporarilyUnavailable,
    GenericError { error_code: u64, message: String },
}

#[derive(candid::CandidType, candid::Deserialize, Clone, Debug)]
pub enum ApproveError {
    BadFee { expected_fee: u64 },
    InsufficientFunds { balance: u64 },
    AllowanceChanged { current_allowance: u64 },
    Expired { ledger_time: u64 },
    TooOld,
    CreatedInFuture { ledger_time: u64 },
    Duplicate { duplicate_of: u64 },
    TemporarilyUnavailable,
    GenericError { error_code: u64, message: String },
}

// ICRC-1 Basic Transfer (when we own the tokens)
pub async fn icrc1_transfer(
    ledger_canister: Principal,
    to: Principal,
    amount: u64,
    memo: Option<Vec<u8>>,
) -> Result<u64, String> {
    let transfer_args = TransferArgs {
        from_subaccount: None,
        to: Account {
            owner: to,
            subaccount: None,
        },
        amount,
        fee: None,
        memo,
        created_at_time: Some(ic_cdk::api::time()),
    };

    let result: CallResult<(TransferResult,)> = ic_cdk::call(
        ledger_canister,
        "icrc1_transfer",
        (transfer_args,),
    ).await;

    match result {
        Ok((TransferResult::Ok(block_index),)) => Ok(block_index),
        Ok((TransferResult::Err(error),)) => Err(format!("Transfer failed: {:?}", error)),
        Err((code, msg)) => Err(format!("Call failed: {:?}: {}", code, msg)),
    }
}

// ICRC-2 Transfer From (pull tokens from someone who approved us)
pub async fn icrc2_transfer_from(
    ledger_canister: Principal,
    from: Principal,
    to: Principal,
    amount: u64,
    memo: Option<Vec<u8>>,
) -> Result<u64, String> {
    let transfer_args = TransferFromArgs {
        spender_subaccount: None,
        from: Account {
            owner: from,
            subaccount: None,
        },
        to: Account {
            owner: to,
            subaccount: None,
        },
        amount,
        fee: None,
        memo,
        created_at_time: Some(ic_cdk::api::time()),
    };

    let result: CallResult<(TransferResult,)> = ic_cdk::call(
        ledger_canister,
        "icrc2_transfer_from",
        (transfer_args,),
    ).await;

    match result {
        Ok((TransferResult::Ok(block_index),)) => Ok(block_index),
        Ok((TransferResult::Err(error),)) => Err(format!("Transfer from failed: {:?}", error)),
        Err((code, msg)) => Err(format!("Call failed: {:?}: {}", code, msg)),
    }
}

// ICRC-2 Approve (give someone permission to transfer our tokens)
pub async fn icrc2_approve(
    ledger_canister: Principal,
    spender: Principal,
    amount: u64,
    expires_at: Option<u64>,
    memo: Option<Vec<u8>>,
) -> Result<u64, String> {
    let approve_args = ApproveArgs {
        from_subaccount: None,
        spender: Account {
            owner: spender,
            subaccount: None,
        },
        amount,
        expected_allowance: None,
        expires_at,
        fee: None,
        memo,
        created_at_time: Some(ic_cdk::api::time()),
    };

    let result: CallResult<(ApproveResult,)> = ic_cdk::call(
        ledger_canister,
        "icrc2_approve",
        (approve_args,),
    ).await;

    match result {
        Ok((ApproveResult::Ok(block_index),)) => Ok(block_index),
        Ok((ApproveResult::Err(error),)) => Err(format!("Approve failed: {:?}", error)),
        Err((code, msg)) => Err(format!("Call failed: {:?}: {}", code, msg)),
    }
}

// ICRC-2 Check Allowance
pub async fn icrc2_allowance(
    ledger_canister: Principal,
    owner: Principal,
    spender: Principal,
) -> Result<Allowance, String> {
    let allowance_args = AllowanceArgs {
        account: Account {
            owner,
            subaccount: None,
        },
        spender: Account {
            owner: spender,
            subaccount: None,
        },
    };

    let result: CallResult<(Allowance,)> = ic_cdk::call(
        ledger_canister,
        "icrc2_allowance",
        (allowance_args,),
    ).await;

    match result {
        Ok((allowance,)) => Ok(allowance),
        Err((code, msg)) => Err(format!("Allowance query failed: {:?}: {}", code, msg)),
    }
}

// Get balance using ICRC-1
pub async fn icrc1_balance_of(
    ledger_canister: Principal,
    account: Principal,
) -> Result<u64, String> {
    let account_arg = Account {
        owner: account,
        subaccount: None,
    };

    let result: CallResult<(u64,)> = ic_cdk::call(
        ledger_canister,
        "icrc1_balance_of",
        (account_arg,),
    ).await;

    match result {
        Ok((balance,)) => Ok(balance),
        Err((code, msg)) => Err(format!("Balance query failed: {:?}: {}", code, msg)),
    }
}

// High-level functions for ckUSDC

pub async fn pull_ckusdc_from_user(
    from: Principal,
    amount: u64,
    memo: Option<Vec<u8>>,
) -> Result<u64, String> {
    let ledger = Principal::from_text(CKUSDC_LEDGER_CANISTER)
        .map_err(|e| format!("Invalid ckUSDC ledger: {}", e))?;

    let canister_id = ic_cdk::api::id();

    // Check allowance first
    let allowance = icrc2_allowance(ledger, from, canister_id).await?;
    if allowance.allowance < amount {
        return Err(format!("Insufficient allowance: {} < {}", allowance.allowance, amount));
    }

    // Pull tokens from user to canister
    icrc2_transfer_from(ledger, from, canister_id, amount, memo).await
}

pub async fn send_ckusdc_to_user(
    to: Principal,
    amount: u64,
    memo: Option<Vec<u8>>,
) -> Result<u64, String> {
    let ledger = Principal::from_text(CKUSDC_LEDGER_CANISTER)
        .map_err(|e| format!("Invalid ckUSDC ledger: {}", e))?;

    // Direct transfer from canister to user
    icrc1_transfer(ledger, to, amount, memo).await
}

pub async fn get_ckusdc_balance(account: Principal) -> Result<u64, String> {
    let ledger = Principal::from_text(CKUSDC_LEDGER_CANISTER)
        .map_err(|e| format!("Invalid ckUSDC ledger: {}", e))?;

    icrc1_balance_of(ledger, account).await
}

pub async fn get_asset_balance(asset_id: &AssetId, account: Principal) -> Result<u64, String> {
    let asset_info = crate::asset_registry::get_asset(asset_id.clone())?;
    let ledger = asset_info.ledger_canister;

    icrc1_balance_of(ledger, account).await
}

// High-level functions for any asset

pub async fn pull_asset_from_user(
    asset_id: &AssetId,
    from: Principal,
    amount: u64,
    memo: Option<Vec<u8>>,
) -> Result<u64, String> {
    let asset_info = crate::asset_registry::get_asset(asset_id.clone())?;
    let canister_id = ic_cdk::api::id();

    match asset_info.standard {
        AssetStandard::ICRC2 => {
            // Check allowance
            let allowance = icrc2_allowance(asset_info.ledger_canister, from, canister_id).await?;
            if allowance.allowance < amount {
                return Err(format!("Insufficient allowance for {}: {} < {}",
                    asset_id.0, allowance.allowance, amount));
            }

            // Pull tokens
            icrc2_transfer_from(asset_info.ledger_canister, from, canister_id, amount, memo).await
        }
        AssetStandard::MTLS { .. } => {
            Err("MTLS transfers not yet implemented".to_string())
        }
    }
}

pub async fn send_asset_to_user(
    asset_id: &AssetId,
    to: Principal,
    amount: u64,
    memo: Option<Vec<u8>>,
) -> Result<u64, String> {
    let asset_info = crate::asset_registry::get_asset(asset_id.clone())?;

    match asset_info.standard {
        AssetStandard::ICRC2 => {
            icrc1_transfer(asset_info.ledger_canister, to, amount, memo).await
        }
        AssetStandard::MTLS { .. } => {
            Err("MTLS transfers not yet implemented".to_string())
        }
    }
}

pub async fn check_user_allowance(
    asset_id: &AssetId,
    owner: Principal,
) -> Result<u64, String> {
    let asset_info = crate::asset_registry::get_asset(asset_id.clone())?;
    let canister_id = ic_cdk::api::id();

    match asset_info.standard {
        AssetStandard::ICRC2 => {
            let allowance = icrc2_allowance(asset_info.ledger_canister, owner, canister_id).await?;
            Ok(allowance.allowance)
        }
        AssetStandard::MTLS { .. } => {
            Err("MTLS allowance check not yet implemented".to_string())
        }
    }
}