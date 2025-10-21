# XFusion Backend Canister

Canister for decentralized token portfolio bundling on the Internet Computer.

## Overview

XFusion allows users to create and trade custom token bundles (portfolios) as single tradeable assets. Each bundle is represented by an ICRC-151 NAV (Net Asset Value) token that tracks the underlying portfolio value.

**Key Features:**
- Create custom token bundles with multiple assets
- Trade bundles via initial funding, buying, and selling flows
- Automatic NAV token minting/burning
- Platform and creator fee distribution
- Points reward system for volume
- Admin controls for platform management

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React)                          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  Backend Canister (Rust)                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Bundle     │  │    Quote     │  │ Transaction  │      │
│  │  Manager     │  │   Manager    │  │   Manager    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │    Asset     │  │   Buy/Sell   │  │     NAV      │      │
│  │   Registry   │  │     Flows    │  │  Calculator  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Holdings   │  │   ICRC-151   │  │   ICRC-2     │      │
│  │   Tracker    │  │    Client    │  │    Client    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│  ┌──────────────┐  ┌──────────────┐                        │
│  │    Admin     │  │    Oracle    │                        │
│  │   Controls   │  │  Integration │                        │
│  └──────────────┘  └──────────────┘                        │
└─────────────────────────────────────────────────────────────┘
         │                    │                    │
         ▼                    ▼                    ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│ Coordinator  │    │   XFusion    │    │  ICRC-2 &    │
│   Service    │    │    Oracle    │    │  ICRC-151    │
│  (Off-chain) │    │ (zutfo-...)  │    │   Ledgers    │
└──────────────┘    └──────────────┘    └──────────────┘
```

## Project Structure

```
src/backend/src/
├── lib.rs                    # Main entry point, canister lifecycle
├── types.rs                  # All type definitions
├── memory.rs                 # Stable storage management
│
├── bundle_manager.rs         # Bundle creation & lifecycle
├── asset_registry.rs         # Asset registration & management
├── nav_token.rs              # NAV token operations (ICRC-151)
│
├── quote_manager.rs          # Quote request/execution
├── buy_flow.rs               # Buy flow orchestration
├── sell_flow.rs              # Sell flow orchestration
├── transaction_manager.rs    # Transaction state management
│
├── nav_calculator.rs         # NAV calculation logic
├── holdings_tracker.rs       # Asset holdings tracking
├── oracle.rs                 # Price oracle integration
│
├── icrc2_client.rs           # ICRC-2 token operations
├── icrc151_client.rs         # ICRC-151 multi-token operations
│
├── admin.rs                  # Admin functions
├── query_api.rs              # Public query methods
├── error_recovery.rs         # Error handling & recovery
├── resolver_manager.rs       # (Legacy) Resolver registry
└── tests.rs                  # Unit tests
```

## Core Modules

### Bundle Manager (`bundle_manager.rs`)

Manages bundle lifecycle and configuration.

**Key Functions:**
- `create_bundle()` - Create a new bundle (starts inactive)
- `get_bundle()` - Retrieve bundle configuration
- `list_active_bundles()` - Get all funded bundles
- `activate_bundle()` - Activate bundle after initial funding

**Bundle States:**
- `is_active = false` - Created but not funded (hidden from public)
- `is_active = true` - Funded and tradeable (visible publicly)

**Bundle Creation:**
1. Validates allocations sum to 100%
2. Ensures all assets exist and are active
3. Creates ICRC-151 token for the bundle
4. Stores bundle with `is_active = false`
5. Bundle activates only after successful InitialBuy

### Asset Registry (`asset_registry.rs`)

Manages supported assets and their configurations.

**Functions:**
- `register_asset()` - Add new asset (admin only)
- `list_assets()` - Get all active assets
- `update_asset_metadata()` - Update asset info
- `deactivate_asset()` - Mark asset as inactive

**Asset Types:**
- `Cryptocurrency` - Standard crypto tokens (BTC, ETH, SOL, etc.)
- `RWA` - Real-world assets (stocks, commodities)
- `LiquidStaking` - Liquid staking derivatives (STETH, JITOSOL)
- `Yield` - Yield-bearing assets

### Quote Manager (`quote_manager.rs`)

Handles quote lifecycle and execution.

**Flow:**
1. User calls `execute_quote()` with signed quote from coordinator
2. Quote signature verified
3. Quote expiration checked
4. Nonce consumed (prevents replay)
5. For inactive bundles: only InitialBuy allowed
6. For active bundles: Buy/Sell allowed
7. Funds locked and transaction created
8. Assignment stored for resolver

**Quote Types:**
- `InitialBuy` - Fund a new bundle (activates it)
- `Buy` - Purchase NAV tokens of active bundle
- `Sell` - Redeem NAV tokens for underlying assets

### Buy Flow (`buy_flow.rs`)

Orchestrates asset deposit and NAV token minting.

**Process:**
1. Resolver calls `confirm_asset_deposit()`
2. Assets pulled from resolver via ICRC-151
3. Bundle holdings updated
4. NAV tokens minted to user
5. Platform fees transferred to treasury
6. Resolver paid in ckUSDC
7. Transaction marked complete
8. **If InitialBuy**: Bundle activated

### Sell Flow (`sell_flow.rs`)

Handles NAV token redemption for assets.

**Process:**
1. User's NAV tokens locked
2. Resolver calls `confirm_resolver_payment_and_complete_sell()`
3. ckUSDC pulled from resolver
4. Bundle holdings calculated proportionally
5. Assets transferred to resolver
6. User paid in ckUSDC
7. NAV tokens dissolved (burned)
8. Transaction complete

### Transaction Manager (`transaction_manager.rs`)

Manages transaction states and fund locking.

**Transaction States:**
- `Pending` - Created, awaiting execution
- `InProgress` - Being processed
- `Completed` - Successfully finished
- `Failed` - Error occurred
- `TimedOut` - Exceeded timeout

**Fund Locking:**
- Locks user funds before execution
- Auto-refund on timeout/failure
- Prevents double-spending

### NAV Calculator (`nav_calculator.rs`)

Calculates bundle net asset value.

**Calculation:**
```
NAV per token = (Σ holding_amount × asset_price) / total_nav_tokens
```

**Features:**
- Real-time price fetching from oracle
- 8 decimal precision
- Per-token and total bundle NAV

### Holdings Tracker (`holdings_tracker.rs`)

Tracks asset quantities held by bundles.

**Storage:**
```rust
BUNDLE_HOLDINGS: Map<(bundle_id, asset_id), amount>
```

**Operations:**
- `increment_bundle_holding()` - Add assets
- `get_all_bundle_holdings()` - Get bundle composition
- Proportional withdrawal calculation for sells

### Oracle Integration (`oracle.rs`)

Interfaces with XFusion Oracle for price data.

**Functions:**
- `get_multiple_prices()` - Batch price fetch
- `get_latest_price()` - Single asset price

**Oracle Canister:** `zutfo-jqaaa-aaaao-a4puq-cai`

### Admin Controls (`admin.rs`)

Platform administration functions.

**Functions:**
- `set_admin()` - Transfer admin rights
- `set_quote_api_principal()` - Set coordinator canister
- `force_deactivate_bundle()` - Hide bundle (admin cleanup)
- `cleanup_inactive_bundles()` - Remove unfunded bundles
- `set_platform_treasury()` - Set fee recipient
- `set_default_platform_fee_bps()` - Set platform fee (basis points)

**Default Settings:**
- Platform fee: 50 bps (0.5%)
- Creator commission: Inherited by bundles

## Flows

### 1. Create Bundle Flow

```
User → create_bundle()
  ├─ Validate allocations = 100%
  ├─ Verify assets exist & active
  ├─ Create ICRC-151 token
  ├─ Store bundle (is_active = false)
  └─ Return bundle_id

Bundle is created but HIDDEN from public lists
```

### 2. Initial Funding Flow (InitialBuy)

```
User → Gets quote from coordinator
  ↓
User → execute_quote()
  ├─ Verify signature
  ├─ Check only InitialBuy allowed for inactive bundle
  ├─ Lock user's ckUSDC
  └─ Create transaction

Resolver → confirm_asset_deposit()
  ├─ Pull assets from resolver (ICRC-151)
  ├─ Update bundle holdings
  ├─ Mint NAV tokens to user
  ├─ Pay platform fee
  ├─ Pay resolver
  ├─ Mark transaction complete
  └─ ACTIVATE BUNDLE ✓

Bundle now active and visible in public lists
```

### 3. Buy Flow

```
User → Gets quote from coordinator
  ↓
User → execute_quote()
  ├─ Verify bundle is active
  ├─ Lock user's ckUSDC
  └─ Create transaction

Resolver → confirm_asset_deposit()
  ├─ Pull assets from resolver
  ├─ Update holdings
  ├─ Mint NAV tokens
  ├─ Pay fees
  └─ Complete
```

### 4. Sell Flow

```
User → Gets quote from coordinator
  ↓
User → execute_quote()
  ├─ Verify bundle is active
  ├─ Lock user's NAV tokens
  └─ Create transaction

Resolver → confirm_resolver_payment_and_complete_sell()
  ├─ Pull ckUSDC from resolver
  ├─ Calculate proportional assets
  ├─ Transfer assets to resolver
  ├─ Pay user ckUSDC
  ├─ Burn NAV tokens
  └─ Complete
```

## Storage

**Stable Memory Layout:**

```rust
// Memory IDs (memory.rs)
BUNDLE_STORAGE         = MemoryId::new(0)   // Bundles
ASSET_REGISTRY         = MemoryId::new(1)   // Assets
BUNDLE_HOLDINGS        = MemoryId::new(2)   // Holdings
TRANSACTIONS           = MemoryId::new(3)   // Transactions
QUOTE_ASSIGNMENTS      = MemoryId::new(4)   // Assignments
LOCKED_FUNDS           = MemoryId::new(5)   // Fund locks
CONSUMED_NONCES        = MemoryId::new(8)   // Replay protection
ORACLE_PRICES          = MemoryId::new(9)   // Price cache
GLOBAL_STATE           = MemoryId::new(10)  // Global config
USER_POINTS            = MemoryId::new(11)  // Loyalty points
```

**Data Structures:**

```rust
BundleConfig {
    id: u64,
    name: String,
    symbol: String,
    description: Option<String>,
    creator: Principal,
    allocations: Vec<AssetAllocation>,
    token_location: TokenLocation::ICRC151,
    is_active: bool,                    // ← Bundle activation state
    platform_fee_bps: Option<u64>,
    created_at: u64,
}

AssetAllocation {
    asset_id: String,
    token_location: TokenLocation,
    percentage: u8,                     // 0-100
}

Transaction {
    id: u64,
    user: Principal,
    bundle_id: u64,
    operation: OperationType,
    status: TransactionStatus,
    created_at: u64,
}
```

## Fees

**Platform Fee:**
- Default: 50 bps (0.5%)
- Configurable per bundle
- Paid in ckUSDC to treasury

**Creator Commission:**
- Bundles inherit platform fee
- Can be customized at creation
- Paid to bundle creator

**Points System:**
- Earn 1 point per $0.001 volume
- Tracked per user
- Future loyalty benefits

## Security

**Quote Validation:**
- Coordinator signature verification
- Nonce-based replay protection
- Expiration checking (180s default)

**Fund Safety:**
- Atomic transactions (all-or-nothing)
- Automatic timeout refunds
- Locked funds during execution

**Access Control:**
- Admin-only functions
- Coordinator-only quote execution
- Resolver-only confirmations

**Bundle Safety:**
- Only InitialBuy can activate bundles
- Buy/Sell blocked on inactive bundles
- Allocation validation (must sum to 100%)

## Deployment

**Local:**
```bash
dfx start --clean
dfx deploy backend
```

**Mainnet:**
```bash
dfx deploy --network ic backend
```

**Canister ID (mainnet):** `dk3fi-vyaaa-aaaae-qfycq-cai`


## Dependencies

- `ic-cdk` - Internet Computer SDK
- `candid` - Candid serialization
- `serde` - Serialization framework
- `ic-stable-structures` - Stable memory primitives

## License

Proprietary - XFusion Platform
