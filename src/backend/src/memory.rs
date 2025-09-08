use ic_stable_structures::{DefaultMemoryImpl, StableBTreeMap};
use ic_stable_structures::memory_manager::{MemoryId, MemoryManager, VirtualMemory};
use std::cell::RefCell;
use crate::types::*;

pub type Memory = VirtualMemory<DefaultMemoryImpl>;

pub const ASSET_REGISTRY_MEMORY_ID: MemoryId = MemoryId::new(0);
pub const BUNDLE_STORAGE_MEMORY_ID: MemoryId = MemoryId::new(1);
pub const NAV_TOKEN_STORAGE_MEMORY_ID: MemoryId = MemoryId::new(2);
pub const PRICE_STORAGE_MEMORY_ID: MemoryId = MemoryId::new(3);
pub const TRANSACTION_STORAGE_MEMORY_ID: MemoryId = MemoryId::new(4);
pub const QUOTE_STORAGE_MEMORY_ID: MemoryId = MemoryId::new(5);
pub const RESOLVER_STORAGE_MEMORY_ID: MemoryId = MemoryId::new(6);

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

    pub static NAV_TOKEN_STORAGE: RefCell<StableBTreeMap<String, XFusionNAVToken, Memory>> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(NAV_TOKEN_STORAGE_MEMORY_ID))
        )
    );

    pub static BUNDLE_COUNTER: RefCell<u64> = RefCell::new(0);

    pub static ADMIN_PRINCIPAL: RefCell<Option<candid::Principal>> = RefCell::new(None);
}