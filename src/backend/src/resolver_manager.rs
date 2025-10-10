use candid::{CandidType, Principal};
use serde::{Deserialize, Serialize};
use ic_cdk::api::{time, msg_caller};
use ic_stable_structures::Storable;
use std::borrow::Cow;

use crate::memory::*;
use crate::admin::is_admin;

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct ResolverInfo {
    pub principal: Principal,
    pub name: String,
    pub fee_rate: u64,
    pub total_volume_processed: u64,
    pub successful_transactions: u64,
    pub failed_transactions: u64,
    pub is_active: bool,
    pub registered_at: u64,
    pub last_active: u64,
}

impl Storable for ResolverInfo {
    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(candid::encode_one(self).unwrap())
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        candid::decode_one(&bytes).unwrap()
    }

    const BOUND: ic_stable_structures::storable::Bound = ic_stable_structures::storable::Bound::Bounded {
        max_size: 2048,
        is_fixed_size: false,
    };
}


pub fn register_resolver(
    name: String,
    fee_rate: u64,
) -> Result<(), String> {
    let caller = msg_caller();

    if !is_admin(caller) {
        return Err("Unauthorized: Only admin can register resolvers".to_string());
    }

    if fee_rate > 1000 {
        return Err("Fee rate too high (max 10%)".to_string());
    }

    RESOLVER_REGISTRY.with(|registry| {
        let mut registry = registry.borrow_mut();

        if registry.contains_key(&caller) {
            return Err("Resolver already registered".to_string());
        }

        let resolver_info = ResolverInfo {
            principal: caller,
            name,
            fee_rate,
            total_volume_processed: 0,
            successful_transactions: 0,
            failed_transactions: 0,
            is_active: true,
            registered_at: time(),
            last_active: time(),
        };

        registry.insert(caller, resolver_info);
        Ok(())
    })
}

pub fn register_resolver_admin(
    resolver_principal: Principal,
    name: String,
    fee_rate: u64,
) -> Result<(), String> {
    let caller = msg_caller();

    if !is_admin(caller) {
        return Err("Unauthorized: Only admin can register resolvers".to_string());
    }

    if fee_rate > 1000 {
        return Err("Fee rate too high (max 10%)".to_string());
    }

    RESOLVER_REGISTRY.with(|registry| {
        let mut registry = registry.borrow_mut();

        if registry.contains_key(&resolver_principal) {
            return Err("Resolver already registered".to_string());
        }

        let resolver_info = ResolverInfo {
            principal: resolver_principal,
            name,
            fee_rate,
            total_volume_processed: 0,
            successful_transactions: 0,
            failed_transactions: 0,
            is_active: true,
            registered_at: time(),
            last_active: time(),
        };

        registry.insert(resolver_principal, resolver_info);
        Ok(())
    })
}

pub fn update_resolver_status(resolver: Principal, is_active: bool) -> Result<(), String> {
    let caller = msg_caller();

    if !is_admin(caller) && caller != resolver {
        return Err("Unauthorized".to_string());
    }

    RESOLVER_REGISTRY.with(|registry| {
        let mut registry = registry.borrow_mut();

        let mut resolver_info = registry.get(&resolver)
            .ok_or("Resolver not found")?;

        resolver_info.is_active = is_active;
        resolver_info.last_active = time();
        registry.insert(resolver, resolver_info);
        Ok(())
    })
}

pub fn update_resolver_performance(
    resolver: Principal,
    transaction_success: bool,
    volume: u64,
) -> Result<(), String> {
    RESOLVER_REGISTRY.with(|registry| {
        let mut registry = registry.borrow_mut();

        let mut resolver_info = registry.get(&resolver)
            .ok_or("Resolver not found")?;

        resolver_info.total_volume_processed += volume;
        resolver_info.last_active = time();

        if transaction_success {
            resolver_info.successful_transactions += 1;
        } else {
            resolver_info.failed_transactions += 1;
        }

        registry.insert(resolver, resolver_info);
        Ok(())
    })
}

pub fn get_resolver(principal: Principal) -> Result<ResolverInfo, String> {
    RESOLVER_REGISTRY.with(|registry| {
        registry.borrow().get(&principal)
            .ok_or("Resolver not found".to_string())
    })
}

pub fn get_active_resolvers() -> Vec<ResolverInfo> {
    RESOLVER_REGISTRY.with(|registry| {
        registry.borrow().iter()
            .map(|(_, resolver)| resolver)
            .filter(|r| r.is_active)
            .collect()
    })
}


pub fn is_resolver_registered(principal: Principal) -> bool {
    RESOLVER_REGISTRY.with(|registry| {
        registry.borrow().contains_key(&principal)
    })
}

pub fn is_resolver_active(principal: Principal) -> bool {
    RESOLVER_REGISTRY.with(|registry| {
        registry.borrow()
            .get(&principal)
            .map(|r| r.is_active)
            .unwrap_or(false)
    })
}

fn is_quote_service(principal: Principal) -> bool {
    get_quote_service_principal().map_or(false, |service| service == principal)
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct ResolverStatistics {
    pub total_resolvers: u64,
    pub active_resolvers: u64,
    pub total_volume_processed: u64,
    pub total_transactions: u64,
}


pub fn get_resolver_statistics() -> ResolverStatistics {
    RESOLVER_REGISTRY.with(|registry| {
        let registry = registry.borrow();
        let resolvers: Vec<ResolverInfo> = registry.iter()
            .map(|(_, r)| r)
            .collect();

        ResolverStatistics {
            total_resolvers: resolvers.len() as u64,
            active_resolvers: resolvers.iter().filter(|r| r.is_active).count() as u64,
            total_volume_processed: resolvers.iter().map(|r| r.total_volume_processed).sum(),
            total_transactions: resolvers.iter()
                .map(|r| r.successful_transactions + r.failed_transactions)
                .sum(),
        }
    })
}