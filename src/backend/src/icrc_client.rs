use candid::Principal;
use ic_cdk::api::call::CallResult;
use crate::types::*;

pub const CKUSDC_LEDGER_CANISTER: &str = "xevnm-gaaaa-aaaar-qafnq-cai";

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
pub struct Account {
    pub owner: Principal,
    pub subaccount: Option<[u8; 32]>,
}

#[derive(candid::CandidType, candid::Deserialize, Clone, Debug)]
pub enum TransferResult {
    Ok(u64),
    Err(TransferError),
}

#[derive(candid::CandidType, candid::Deserialize, Clone, Debug)]
pub enum TransferError {
    BadFee { expected_fee: u64 },
    BadBurn { min_burn_amount: u64 },
    InsufficientFunds { balance: u64 },
    TooOld,
    CreatedInFuture { ledger_time: u64 },
    Duplicate { duplicate_of: u64 },
    TemporarilyUnavailable,
    GenericError { error_code: u64, message: String },
}


pub async fn transfer_icrc_token(
    ledger_canister: Principal,
    from: Principal,
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

pub async fn transfer_ckusdc(
    from: Principal,
    to: Principal,
    amount: u64,
    memo: Option<Vec<u8>>,
) -> Result<u64, String> {
    let ledger_canister = Principal::from_text(CKUSDC_LEDGER_CANISTER)
        .map_err(|e| format!("Invalid ckUSDC ledger canister ID: {}", e))?;

    transfer_icrc_token(ledger_canister, from, to, amount, memo).await
}

pub async fn get_icrc_balance(ledger_canister: Principal, account: Principal) -> Result<u64, String> {
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

pub async fn get_ckusdc_balance(account: Principal) -> Result<u64, String> {
    let ledger_canister = Principal::from_text(CKUSDC_LEDGER_CANISTER)
        .map_err(|e| format!("Invalid ckUSDC ledger canister ID: {}", e))?;

    get_icrc_balance(ledger_canister, account).await
}


pub async fn transfer_from_canister(
    to: Principal,
    amount: u64,
    memo: Option<Vec<u8>>,
) -> Result<u64, String> {
    let canister_id = ic_cdk::api::id();
    transfer_ckusdc(canister_id, to, amount, memo).await
}

pub async fn transfer_to_canister(
    from: Principal,
    amount: u64,
    memo: Option<Vec<u8>>,
) -> Result<u64, String> {
    let canister_id = ic_cdk::api::id();
    transfer_ckusdc(from, canister_id, amount, memo).await
}

pub async fn transfer_asset_to_canister(
    asset_id: &AssetId,
    from: Principal,
    amount: u64,
    memo: Option<Vec<u8>>,
) -> Result<u64, String> {
    let asset_info = crate::asset_registry::get_asset(asset_id.clone())?;
    let canister_id = ic_cdk::api::id();

    match asset_info.standard {
        AssetStandard::ICRC2 => {
            transfer_icrc_token(asset_info.ledger_canister, from, canister_id, amount, memo).await
        }
        AssetStandard::MTLS { .. } => {
            Err("MTLS transfers not yet implemented".to_string())
        }
    }
}

pub async fn transfer_asset_from_canister(
    asset_id: &AssetId,
    to: Principal,
    amount: u64,
    memo: Option<Vec<u8>>,
) -> Result<u64, String> {
    let asset_info = crate::asset_registry::get_asset(asset_id.clone())?;
    let canister_id = ic_cdk::api::id();

    match asset_info.standard {
        AssetStandard::ICRC2 => {
            transfer_icrc_token(asset_info.ledger_canister, canister_id, to, amount, memo).await
        }
        AssetStandard::MTLS { .. } => {
            Err("MTLS transfers not yet implemented".to_string())
        }
    }
}

pub async fn get_asset_balance(asset_id: &AssetId, account: Principal) -> Result<u64, String> {
    let asset_info = crate::asset_registry::get_asset(asset_id.clone())?;

    match asset_info.standard {
        AssetStandard::ICRC2 => {
            get_icrc_balance(asset_info.ledger_canister, account).await
        }
        AssetStandard::MTLS { .. } => {
            Err("MTLS balance queries not yet implemented".to_string())
        }
    }
}