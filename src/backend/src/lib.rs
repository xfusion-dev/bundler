use candid::{CandidType, Deserialize, Principal};
use ic_cdk::api::msg_caller;
use ic_cdk_macros::*;
use ic_stable_structures::{DefaultMemoryImpl, StableBTreeMap, Storable};
use ic_stable_structures::memory_manager::{MemoryId, MemoryManager, VirtualMemory};
use std::cell::RefCell;
use serde::Serialize;
use std::borrow::Cow;

type Memory = VirtualMemory<DefaultMemoryImpl>;

const ASSET_REGISTRY_MEMORY_ID: MemoryId = MemoryId::new(0);
const BUNDLE_STORAGE_MEMORY_ID: MemoryId = MemoryId::new(1);
const NAV_TOKEN_STORAGE_MEMORY_ID: MemoryId = MemoryId::new(2);
const PRICE_STORAGE_MEMORY_ID: MemoryId = MemoryId::new(3);
const TRANSACTION_STORAGE_MEMORY_ID: MemoryId = MemoryId::new(4);
const QUOTE_STORAGE_MEMORY_ID: MemoryId = MemoryId::new(5);
const RESOLVER_STORAGE_MEMORY_ID: MemoryId = MemoryId::new(6);

#[derive(CandidType, Serialize, Deserialize, Clone, Debug, PartialEq, Eq, Hash, PartialOrd, Ord)]
pub struct AssetId(pub String);

impl Storable for AssetId {
    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(self.0.as_bytes().to_vec())
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        Self(String::from_utf8(bytes.to_vec()).expect("Invalid UTF-8"))
    }

    const BOUND: ic_stable_structures::storable::Bound = ic_stable_structures::storable::Bound::Bounded {
        max_size: 100,
        is_fixed_size: false,
    };
}

thread_local! {
    static MEMORY_MANAGER: RefCell<MemoryManager<DefaultMemoryImpl>> = RefCell::new(
        MemoryManager::init(DefaultMemoryImpl::default())
    );

    static ASSET_REGISTRY: RefCell<StableBTreeMap<AssetId, Vec<u8>, Memory>> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(ASSET_REGISTRY_MEMORY_ID))
        )
    );

    static BUNDLE_STORAGE: RefCell<StableBTreeMap<u64, Vec<u8>, Memory>> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(BUNDLE_STORAGE_MEMORY_ID))
        )
    );

    static NAV_TOKEN_STORAGE: RefCell<StableBTreeMap<String, Vec<u8>, Memory>> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(NAV_TOKEN_STORAGE_MEMORY_ID))
        )
    );

    static ADMIN_PRINCIPAL: RefCell<Option<Principal>> = RefCell::new(None);
}

#[init]
fn init() {
    let caller = msg_caller();
    ADMIN_PRINCIPAL.with(|admin| *admin.borrow_mut() = Some(caller));
    ic_cdk::println!("XFusion backend canister initialized with admin: {}", caller);
}

#[pre_upgrade]
fn pre_upgrade() {
    ic_cdk::println!("Preparing for upgrade");
}

#[post_upgrade]
fn post_upgrade() {
    ic_cdk::println!("Upgrade completed");
}

fn is_admin(caller: Principal) -> bool {
    ADMIN_PRINCIPAL.with(|admin| {
        admin.borrow().map_or(false, |admin_principal| admin_principal == caller)
    })
}

#[query]
fn get_admin() -> Option<Principal> {
    ADMIN_PRINCIPAL.with(|admin| *admin.borrow())
}

#[update]
fn set_admin(new_admin: Principal) -> Result<(), String> {
    let caller = msg_caller();
    if !is_admin(caller) {
        return Err("Only admin can set new admin".to_string());
    }
    ADMIN_PRINCIPAL.with(|admin| *admin.borrow_mut() = Some(new_admin));
    Ok(())
}

#[query]
fn greet(name: String) -> String {
    format!("Hello, {}!", name)
}

#[update]
fn whoami() -> String {
    let caller_principal: Principal = msg_caller();
    caller_principal.to_text()
}

ic_cdk::export_candid!();