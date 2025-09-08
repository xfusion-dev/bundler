use candid::Principal;
use ic_cdk::api::{msg_caller, time};
use ic_cdk_macros::*;
use crate::types::*;
use crate::memory::*;

pub fn mint_nav_tokens(user: Principal, bundle_id: u64, amount: u64) -> Result<(), String> {
    let key = nav_token_key(user, bundle_id);

    NAV_TOKEN_STORAGE.with(|tokens| {
        let mut tokens = tokens.borrow_mut();
        let mut token_record = tokens.get(&key)
            .unwrap_or(XFusionNAVToken {
                bundle_id,
                owner: user,
                amount: 0,
                last_updated: time(),
            });

        token_record.amount += amount;
        token_record.last_updated = time();
        tokens.insert(key, token_record);
    });

    Ok(())
}

pub fn burn_nav_tokens(user: Principal, bundle_id: u64, amount: u64) -> Result<(), String> {
    let key = nav_token_key(user, bundle_id);

    NAV_TOKEN_STORAGE.with(|tokens| {
        let mut tokens = tokens.borrow_mut();
        if let Some(mut token_record) = tokens.get(&key) {
            if token_record.amount < amount {
                return Err("Insufficient NAV token balance".to_string());
            }
            token_record.amount -= amount;
            token_record.last_updated = time();

            if token_record.amount == 0 {
                tokens.remove(&key);
            } else {
                tokens.insert(key, token_record);
            }
            Ok(())
        } else {
            Err("No NAV tokens found for user".to_string())
        }
    })
}

#[query]
pub fn get_nav_token_balance(user: Principal, bundle_id: u64) -> u64 {
    let key = nav_token_key(user, bundle_id);

    NAV_TOKEN_STORAGE.with(|tokens| {
        tokens.borrow()
            .get(&key)
            .map(|token| token.amount)
            .unwrap_or(0)
    })
}

#[query]
pub fn get_user_nav_tokens(user: Principal) -> Vec<XFusionNAVToken> {
    let user_prefix = format!("{}:", user.to_text());

    NAV_TOKEN_STORAGE.with(|tokens| {
        let tokens = tokens.borrow();
        tokens.iter()
            .filter_map(|(key, token)| {
                if key.starts_with(&user_prefix) {
                    Some(token)
                } else {
                    None
                }
            })
            .collect()
    })
}

pub fn transfer_nav_tokens(
    from: Principal,
    to: Principal,
    bundle_id: u64,
    amount: u64
) -> Result<(), String> {
    burn_nav_tokens(from, bundle_id, amount)?;
    mint_nav_tokens(to, bundle_id, amount)?;
    Ok(())
}

#[query]
pub fn get_total_tokens_for_bundle(bundle_id: u64) -> u64 {
    let bundle_suffix = format!(":{}", bundle_id);

    NAV_TOKEN_STORAGE.with(|tokens| {
        let tokens = tokens.borrow();
        tokens.iter()
            .filter_map(|(key, token)| {
                if key.ends_with(&bundle_suffix) {
                    Some(token.amount)
                } else {
                    None
                }
            })
            .sum()
    })
}