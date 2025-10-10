use candid::Principal;
use crate::icrc151_client;

pub async fn get_user_nav_token_balance(user: Principal, bundle_id: u64) -> Result<u64, String> {
    let bundle = crate::bundle_manager::get_bundle(bundle_id)?;
    let (ledger, token_id) = bundle.get_token_location()?;

    icrc151_client::get_balance_icrc151(
        ledger,
        token_id,
        icrc151_client::Account {
            owner: user,
            subaccount: None,
        },
    ).await
}

pub async fn get_total_tokens_for_bundle(bundle_id: u64) -> Result<u64, String> {
    let bundle = crate::bundle_manager::get_bundle(bundle_id)?;
    let (ledger, token_id) = bundle.get_token_location()?;

    #[derive(candid::CandidType, candid::Deserialize)]
    enum QueryResult {
        Ok(candid::Nat),
        Err(String),
    }

    let result: Result<(QueryResult,), _> = ic_cdk::call(
        ledger,
        "get_total_supply",
        (token_id,),
    ).await;

    match result {
        Ok((QueryResult::Ok(supply),)) => {
            supply.0.try_into().map_err(|_| "Supply too large".to_string())
        }
        Ok((QueryResult::Err(e),)) => Err(format!("Total supply query failed: {}", e)),
        Err((code, msg)) => Err(format!("Call failed: {:?} - {}", code, msg)),
    }
}

pub async fn get_user_ckusdc_balance(user: Principal) -> Result<u64, String> {
    crate::icrc2_client::get_ckusdc_balance(user).await
}

pub fn get_total_nav_token_supply() -> u64 {
    0
}

pub fn get_bundle_holder_count(_bundle_id: u64) -> u32 {
    1
}

pub fn get_user_nav_tokens(_user: Principal) -> Vec<crate::types::XFusionNAVToken> {
    vec![]
}

fn nav_token_key(user: Principal, bundle_id: u64) -> String {
    format!("{}:{}", user.to_text(), bundle_id)
}
