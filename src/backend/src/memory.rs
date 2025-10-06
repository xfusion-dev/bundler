use ic_stable_structures::{DefaultMemoryImpl, StableBTreeMap, StableCell};
use ic_stable_structures::memory_manager::{MemoryId, MemoryManager, VirtualMemory};
use std::cell::RefCell;
use candid::Principal;
use crate::types::*;

pub type Memory = VirtualMemory<DefaultMemoryImpl>;

pub const ASSET_REGISTRY_MEMORY_ID: MemoryId = MemoryId::new(0);
pub const BUNDLE_STORAGE_MEMORY_ID: MemoryId = MemoryId::new(1);
pub const PRICE_STORAGE_MEMORY_ID: MemoryId = MemoryId::new(3);
pub const BUNDLE_HOLDINGS_MEMORY_ID: MemoryId = MemoryId::new(4);
pub const TRANSACTION_STORAGE_MEMORY_ID: MemoryId = MemoryId::new(5);
pub const QUOTE_STORAGE_MEMORY_ID: MemoryId = MemoryId::new(6);
pub const RESOLVER_STORAGE_MEMORY_ID: MemoryId = MemoryId::new(7);
pub const QUOTE_ASSIGNMENT_MEMORY_ID: MemoryId = MemoryId::new(8);
pub const LOCKED_FUNDS_MEMORY_ID: MemoryId = MemoryId::new(9);
pub const RESOLVER_REGISTRY_MEMORY_ID: MemoryId = MemoryId::new(10);
pub const GLOBAL_STATE_MEMORY_ID: MemoryId = MemoryId::new(11);
pub const USED_NONCES_MEMORY_ID: MemoryId = MemoryId::new(14);

thread_local! {
    pub static MEMORY_MANAGER: RefCell<MemoryManager<DefaultMemoryImpl>> = RefCell::new(
        MemoryManager::init(DefaultMemoryImpl::default())
    );

    pub static ASSET_REGISTRY: RefCell<StableBTreeMap<AssetId, AssetInfo, Memory>> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(ASSET_REGISTRY_MEMORY_ID))
        )
    );

    pub static BUNDLE_STORAGE: RefCell<StableBTreeMap<u64, BundleConfig, Memory>> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(BUNDLE_STORAGE_MEMORY_ID))
        )
    );

    pub static PRICE_STORAGE: RefCell<StableBTreeMap<AssetId, AssetPrice, Memory>> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(PRICE_STORAGE_MEMORY_ID))
        )
    );

    pub static BUNDLE_HOLDINGS: RefCell<StableBTreeMap<String, BundleHolding, Memory>> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(BUNDLE_HOLDINGS_MEMORY_ID))
        )
    );

    pub static QUOTE_ASSIGNMENTS: RefCell<StableBTreeMap<u64, QuoteAssignment, Memory>> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(QUOTE_ASSIGNMENT_MEMORY_ID))
        )
    );

    pub static TRANSACTIONS: RefCell<StableBTreeMap<u64, Transaction, Memory>> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(TRANSACTION_STORAGE_MEMORY_ID))
        )
    );

    pub static LOCKED_FUNDS: RefCell<StableBTreeMap<String, LockedFunds, Memory>> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(LOCKED_FUNDS_MEMORY_ID))
        )
    );

    pub static RESOLVER_REGISTRY: RefCell<StableBTreeMap<Principal, crate::resolver_manager::ResolverInfo, Memory>> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(RESOLVER_REGISTRY_MEMORY_ID))
        )
    );

    pub static USED_NONCES: RefCell<StableBTreeMap<u64, u64, Memory>> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(USED_NONCES_MEMORY_ID))
        )
    );

    pub static GLOBAL_STATE: RefCell<StableCell<GlobalState, Memory>> = RefCell::new(
        StableCell::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(GLOBAL_STATE_MEMORY_ID)),
            GlobalState::default()
        ).expect("Failed to initialize GLOBAL_STATE")
    );
}

pub fn get_next_bundle_id() -> u64 {
    GLOBAL_STATE.with(|state| {
        let mut s = state.borrow().get().clone();
        let id = s.bundle_counter;
        s.bundle_counter += 1;
        state.borrow_mut().set(s).expect("Failed to increment bundle counter");
        id
    })
}

pub fn get_next_quote_id() -> u64 {
    GLOBAL_STATE.with(|state| {
        let mut s = state.borrow().get().clone();
        let id = s.quote_counter;
        s.quote_counter += 1;
        state.borrow_mut().set(s).expect("Failed to increment quote counter");
        id
    })
}

pub fn get_next_transaction_id() -> u64 {
    GLOBAL_STATE.with(|state| {
        let mut s = state.borrow().get().clone();
        let id = s.transaction_counter;
        s.transaction_counter += 1;
        state.borrow_mut().set(s).expect("Failed to increment transaction counter");
        id
    })
}

pub fn get_admin_principal() -> Option<Principal> {
    GLOBAL_STATE.with(|state| state.borrow().get().admin_principal)
}

pub fn set_admin_principal(principal: Principal) {
    GLOBAL_STATE.with(|state| {
        let mut s = state.borrow().get().clone();
        s.admin_principal = Some(principal);
        state.borrow_mut().set(s).expect("Failed to set admin principal");
    })
}

pub fn get_oracle_config() -> Option<OracleConfig> {
    GLOBAL_STATE.with(|state| state.borrow().get().oracle_config.clone())
}

pub fn set_oracle_config(config: OracleConfig) {
    GLOBAL_STATE.with(|state| {
        let mut s = state.borrow().get().clone();
        s.oracle_config = Some(config);
        state.borrow_mut().set(s).expect("Failed to set oracle config");
    })
}

pub fn get_icrc151_ledger() -> Option<Principal> {
    GLOBAL_STATE.with(|state| state.borrow().get().icrc151_ledger)
}

pub fn set_icrc151_ledger(principal: Principal) {
    GLOBAL_STATE.with(|state| {
        let mut s = state.borrow().get().clone();
        s.icrc151_ledger = Some(principal);
        state.borrow_mut().set(s).expect("Failed to set ICRC-151 ledger");
    })
}

pub fn get_icrc2_ckusdc_ledger() -> Option<Principal> {
    GLOBAL_STATE.with(|state| state.borrow().get().icrc2_ckusdc_ledger)
}

pub fn set_icrc2_ckusdc_ledger(principal: Principal) {
    GLOBAL_STATE.with(|state| {
        let mut s = state.borrow().get().clone();
        s.icrc2_ckusdc_ledger = Some(principal);
        state.borrow_mut().set(s).expect("Failed to set ICRC-2 ckUSDC ledger");
    })
}

pub fn get_quote_service_principal() -> Option<Principal> {
    GLOBAL_STATE.with(|state| state.borrow().get().quote_service_principal)
}

pub fn set_quote_service_principal(principal: Principal) {
    GLOBAL_STATE.with(|state| {
        let mut s = state.borrow().get().clone();
        s.quote_service_principal = Some(principal);
        state.borrow_mut().set(s).expect("Failed to set quote service principal");
    })
}