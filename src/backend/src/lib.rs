use candid::{CandidType, Deserialize, Principal};
use ic_cdk::api::{msg_caller, time};
use ic_cdk_macros::*;
use ic_stable_structures::{DefaultMemoryImpl, StableBTreeMap};
use ic_stable_structures::memory_manager::{MemoryId, MemoryManager, VirtualMemory};
use std::cell::RefCell;

mod types;
use types::*;

type Memory = VirtualMemory<DefaultMemoryImpl>;

const ASSET_REGISTRY_MEMORY_ID: MemoryId = MemoryId::new(0);
const BUNDLE_STORAGE_MEMORY_ID: MemoryId = MemoryId::new(1);
const NAV_TOKEN_STORAGE_MEMORY_ID: MemoryId = MemoryId::new(2);
const PRICE_STORAGE_MEMORY_ID: MemoryId = MemoryId::new(3);
const TRANSACTION_STORAGE_MEMORY_ID: MemoryId = MemoryId::new(4);
const QUOTE_STORAGE_MEMORY_ID: MemoryId = MemoryId::new(5);
const RESOLVER_STORAGE_MEMORY_ID: MemoryId = MemoryId::new(6);

thread_local! {
    static MEMORY_MANAGER: RefCell<MemoryManager<DefaultMemoryImpl>> = RefCell::new(
        MemoryManager::init(DefaultMemoryImpl::default())
    );

    static ASSET_REGISTRY: RefCell<StableBTreeMap<AssetId, AssetInfo, Memory>> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(ASSET_REGISTRY_MEMORY_ID))
        )
    );

    static BUNDLE_STORAGE: RefCell<StableBTreeMap<u64, BundleConfig, Memory>> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(BUNDLE_STORAGE_MEMORY_ID))
        )
    );

    static BUNDLE_COUNTER: RefCell<u64> = RefCell::new(0);

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

#[update]
fn add_asset(mut asset_info: AssetInfo) -> Result<(), String> {
    let caller = msg_caller();
    if !is_admin(caller) {
        return Err("Only admin can add assets".to_string());
    }

    asset_info.added_at = time();

    ASSET_REGISTRY.with(|registry| {
        let mut registry = registry.borrow_mut();
        if registry.contains_key(&asset_info.id) {
            return Err(format!("Asset {} already exists", asset_info.id.0));
        }
        registry.insert(asset_info.id.clone(), asset_info);
        Ok(())
    })
}

#[update]
fn update_asset(asset_id: AssetId, updates: AssetInfoUpdate) -> Result<(), String> {
    let caller = msg_caller();
    if !is_admin(caller) {
        return Err("Only admin can update assets".to_string());
    }

    ASSET_REGISTRY.with(|registry| {
        let mut registry = registry.borrow_mut();
        match registry.get(&asset_id) {
            Some(mut asset_info) => {
                if let Some(name) = updates.name {
                    asset_info.name = name;
                }
                if let Some(oracle_ticker) = updates.oracle_ticker {
                    asset_info.oracle_ticker = Some(oracle_ticker);
                }
                if let Some(minter_canister) = updates.minter_canister {
                    asset_info.minter_canister = Some(minter_canister);
                }
                if let Some(is_active) = updates.is_active {
                    asset_info.is_active = is_active;
                }
                if let Some(metadata) = updates.metadata {
                    asset_info.metadata = metadata;
                }
                registry.insert(asset_id, asset_info);
                Ok(())
            }
            None => Err(format!("Asset {} not found", asset_id.0))
        }
    })
}

#[query]
fn get_asset(asset_id: AssetId) -> Result<AssetInfo, String> {
    ASSET_REGISTRY.with(|registry| {
        registry.borrow()
            .get(&asset_id)
            .ok_or_else(|| format!("Asset {} not found", asset_id.0))
    })
}

#[query]
fn list_assets(filter: Option<AssetFilter>) -> Vec<AssetInfo> {
    ASSET_REGISTRY.with(|registry| {
        let registry = registry.borrow();
        let mut assets: Vec<AssetInfo> = Vec::new();

        for (_, asset_info) in registry.iter() {
            let mut include = true;

            if let Some(ref filter) = filter {
                if filter.active_only && !asset_info.is_active {
                    include = false;
                }

                if let Some(ref category) = filter.category {
                    if std::mem::discriminant(&asset_info.metadata.category) != std::mem::discriminant(category) {
                        include = false;
                    }
                }

                if let Some(ref standard) = filter.standard {
                    if std::mem::discriminant(&asset_info.standard) != std::mem::discriminant(standard) {
                        include = false;
                    }
                }
            }

            if include {
                assets.push(asset_info);
            }
        }

        assets
    })
}

#[update]
fn deactivate_asset(asset_id: AssetId) -> Result<(), String> {
    let caller = msg_caller();
    if !is_admin(caller) {
        return Err("Only admin can deactivate assets".to_string());
    }

    ASSET_REGISTRY.with(|registry| {
        let mut registry = registry.borrow_mut();
        match registry.get(&asset_id) {
            Some(mut asset_info) => {
                asset_info.is_active = false;
                registry.insert(asset_id, asset_info);
                Ok(())
            }
            None => Err(format!("Asset {} not found", asset_id.0))
        }
    })
}

#[update]
fn create_bundle(mut config: BundleConfig) -> Result<u64, String> {
    let total_percentage: u32 = config.allocations.iter()
        .map(|a| a.percentage as u32)
        .sum();

    if total_percentage != 100 {
        return Err(format!("Allocations must sum to 100%, got {}%", total_percentage));
    }

    for allocation in &config.allocations {
        ASSET_REGISTRY.with(|registry| {
            let registry = registry.borrow();
            match registry.get(&allocation.asset_id) {
                Some(asset_info) if !asset_info.is_active => {
                    return Err(format!("Asset {} is not active", allocation.asset_id.0));
                }
                None => {
                    return Err(format!("Asset {} not found", allocation.asset_id.0));
                }
                _ => Ok(())
            }
        })?;
    }

    let bundle_id = BUNDLE_COUNTER.with(|counter| {
        let mut counter = counter.borrow_mut();
        *counter += 1;
        *counter
    });

    config.id = bundle_id;
    config.creator = msg_caller();
    config.created_at = time();
    config.is_active = true;

    BUNDLE_STORAGE.with(|storage| {
        storage.borrow_mut().insert(bundle_id, config)
    });

    Ok(bundle_id)
}

#[query]
fn get_bundle(bundle_id: u64) -> Result<BundleConfig, String> {
    BUNDLE_STORAGE.with(|storage| {
        storage.borrow()
            .get(&bundle_id)
            .ok_or_else(|| format!("Bundle {} not found", bundle_id))
    })
}

#[query]
fn get_user_bundles(user: Principal) -> Vec<BundleConfig> {
    BUNDLE_STORAGE.with(|storage| {
        let storage = storage.borrow();
        storage.iter()
            .map(|(_, bundle)| bundle)
            .filter(|bundle| bundle.creator == user)
            .collect()
    })
}

#[query]
fn list_active_bundles() -> Vec<BundleConfig> {
    BUNDLE_STORAGE.with(|storage| {
        let storage = storage.borrow();
        storage.iter()
            .map(|(_, bundle)| bundle)
            .filter(|bundle| bundle.is_active)
            .collect()
    })
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