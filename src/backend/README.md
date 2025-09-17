# xFusion Backend Canister

## Architecture Overview

The xFusion platform consists of three main components working together to enable decentralized asset bundling and trading:

### 1. Backend Canister (This Component)
The core smart contract on the Internet Computer that manages:
- Bundle creation and registry
- NAV token minting/burning
- Quote request processing
- Transaction orchestration
- Asset custody and holdings tracking
- Integration with ICRC-2 token standards

### 2. Resolver Network
Off-chain services that provide liquidity and execute trades:
- Market makers providing continuous liquidity
- Arbitrageurs ensuring efficient pricing
- DEX aggregators for best execution
- Independent services competing for order flow

### 3. XFusion Oracle
Push-based price oracle service providing:
- Real-time asset prices from multiple sources
- 5-second update frequency
- Price validation and aggregation
- Direct push updates to the backend canister

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend                             │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Backend Canister                          │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │   Bundle    │  │    Quote     │  │ Transaction  │       │
│  │  Manager    │  │   Manager    │  │   Manager    │       │
│  └─────────────┘  └──────────────┘  └──────────────┘       │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │   Holdings  │  │     NAV      │  │    ICRC-2    │       │
│  │   Tracker   │  │  Calculator  │  │    Client    │       │
│  └─────────────┘  └──────────────┘  └──────────────┘       │
└─────────────────────────────────────────────────────────────┘
         │                    │                    │
         ▼                    ▼                    ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   Resolver   │    │   XFusion    │    │  ICRC-2      │
│   Network    │    │    Oracle    │    │  Ledgers     │
└──────────────┘    └──────────────┘    └──────────────┘
```

## Core Modules

### Bundle Manager (`bundle_manager.rs`)
Handles bundle lifecycle and configuration:

```rust
// Create a new bundle with asset allocations
create_bundle(config: BundleConfig) -> Result<u64, String>

// Get bundle details
get_bundle(bundle_id: u64) -> Result<BundleConfig, String>

// List all active bundles
list_active_bundles() -> Vec<BundleConfig>
```

**Bundle Creation Process:**
1. Validates allocations sum to 100%
2. Ensures all assets are registered and active
3. Assigns unique bundle ID
4. Stores in stable memory
5. Indexes for efficient queries

### Quote Manager (`quote_manager.rs`)
Manages the quote request/response lifecycle:

```rust
// User requests a quote for buy/sell
request_quote(request: QuoteRequest) -> Result<u64, String>

// Resolver coordinator submits best quote
submit_quote_assignment(assignment: QuoteAssignment) -> Result<(), String>

// Execute the assigned quote
execute_quote(request_id: u64) -> Result<u64, String>
```

**Quote Flow:**
1. User submits quote request (buy/sell)
2. Request stored with expiration timestamp
3. Off-chain coordinator monitors requests
4. Resolvers submit bids
5. Best quote assigned to request
6. User executes quote to complete trade

### Transaction Manager (`transaction_manager.rs`)
Orchestrates the execution of trades:

```rust
// Create transaction from quote
create_transaction(request_id: u64) -> Result<u64, String>

// Update transaction status
update_transaction_status(tx_id: u64, status: TransactionStatus) -> Result<(), String>

// Lock user funds during trade
lock_user_funds(user: Principal, fund_type: LockedFundType, amount: u64) -> Result<(), String>
```

**Transaction States:**
- `Pending` - Transaction created
- `FundsLocked` - User funds secured
- `InProgress` - Resolver executing
- `Completed` - Successfully finished
- `Failed` - Error occurred
- `Cancelled` - User/timeout cancellation

### NAV Calculator (`nav_calculator.rs`)
Calculates Net Asset Value for bundles:

```rust
// Calculate current NAV for bundle
calculate_bundle_nav(bundle_id: u64) -> Result<BundleNAV, String>

// Get user's total portfolio value
get_portfolio_value(user: Principal) -> Result<u64, String>
```

**NAV Calculation:**
1. Fetch current holdings for bundle
2. Get latest prices from oracle
3. Calculate: NAV = Σ(Asset Quantity × Price) / Total NAV Tokens
4. Return with 8 decimal precision

### Holdings Tracker (`holdings_tracker.rs`)
Manages bundle asset holdings:

```rust
// Update bundle holdings after trade
update_bundle_holdings(bundle_id: u64, asset_id: AssetId, delta: i64) -> Result<(), String>

// Calculate proportional withdrawal for redemption
calculate_proportional_withdrawal(bundle_id: u64, nav_tokens: u64) -> Result<Vec<AssetWithdrawal>, String>
```

### ICRC-2 Client (`icrc2_client.rs`)
Interfaces with token ledgers:

```rust
// Transfer tokens from user (with approval)
pull_asset_from_user(asset_id: AssetId, user: Principal, amount: u64) -> Result<u64, String>

// Send tokens to user
send_asset_to_user(asset_id: AssetId, user: Principal, amount: u64) -> Result<u64, String>
```

## Buy Flow - How It Works

When a user wants to buy NAV tokens:

### 1. Quote Request Phase
```rust
// User requests to buy $1000 worth of bundle
request_quote(QuoteRequest {
    bundle_id: 1,
    operation: Buy,
    amount: 1_000_000_000, // $1000 in 6 decimals
    user: caller,
    max_slippage: 5, // 0.5%
})
```

### 2. Quote Assignment Phase
```rust
// Resolver coordinator assigns best quote
submit_quote_assignment(QuoteAssignment {
    request_id: 12345,
    resolver: resolver_principal,
    nav_tokens: 10_000_000_000, // 10 NAV tokens
    ckusdc_amount: 1_000_000_000,
    fees: { resolver_fee: 3_000_000, protocol_fee: 2_000_000 },
})
```

### 3. Execution Phase
```rust
// User executes the quote
execute_quote(request_id) -> transaction_id
```

### 4. Asset Deposit Phase
The resolver deposits required assets:
```rust
// Resolver confirms asset deposits
confirm_asset_deposit_icrc2(request_id)
// This function:
// - Pulls assets from resolver using ICRC-2
// - Updates bundle holdings
// - Mints NAV tokens to user
// - Pays resolver from locked ckUSDC
```

## Sell Flow - How It Works

When a user wants to redeem NAV tokens:

### 1. Quote Request Phase
```rust
// User requests to sell 10 NAV tokens
request_quote(QuoteRequest {
    bundle_id: 1,
    operation: Sell,
    amount: 10_000_000_000, // 10 NAV tokens
    user: caller,
    max_slippage: 5,
})
```

### 2. Execution Phase
```rust
// Lock user's NAV tokens
lock_user_funds(user, NAVTokens { bundle_id: 1 }, amount)
```

### 3. Payment & Settlement Phase
```rust
// Resolver confirms payment
confirm_resolver_payment_and_complete_sell(request_id)
// This function:
// - Pulls ckUSDC from resolver
// - Calculates proportional asset withdrawal
// - Transfers assets to resolver
// - Pays user ckUSDC
// - Burns NAV tokens
```

## Oracle Integration

The backend integrates with XFusion Oracle for real-time pricing:

```rust
// Fetch latest price for asset
get_asset_price(asset_id: AssetId) -> Result<AssetPrice, String>
```

**Price Caching:**
- Prices cached for 60 seconds
- Automatic refresh on cache miss
- Fallback to last known price if oracle unavailable

**Supported Price Feeds:**
- `BTC/USD` - Bitcoin price
- `ETH/USD` - Ethereum price
- `XAUT/USD` - Gold price
- `USDC/USD` - Stablecoin price

## Safety Mechanisms

### 1. Atomic Operations
All trades are atomic - they either complete fully or revert entirely:
- Funds locked before execution
- Automatic refund on failure
- No partial executions

### 2. Timeout Recovery
```rust
// Automatic timeout handling
handle_transaction_timeout(tx_id: u64)
// - Checks transaction age
// - Refunds locked funds if expired
// - Updates status to Failed
```

### 3. Resolver Validation
- Only assigned resolvers can confirm trades
- Resolver must be registered and active
- Performance tracking for reputation

### 4. Price Validation
- Oracle prices validated for staleness
- Multiple source aggregation
- Deviation checks for anomalies

## Storage Architecture

The canister uses stable memory with BTreeMaps:

```rust
// Core storage structures
type BundleStorage = StableBTreeMap<u64, BundleConfig>;
type NAVTokenStorage = StableBTreeMap<(Principal, u64), NAVToken>;
type TransactionStorage = StableBTreeMap<u64, Transaction>;
type QuoteStorage = StableBTreeMap<u64, (QuoteRequest, Option<QuoteAssignment>)>;
type HoldingsStorage = StableBTreeMap<(u64, AssetId), u64>;
type PriceCache = StableBTreeMap<AssetId, AssetPrice>;
```

## Error Handling

The canister implements comprehensive error handling:

```rust
pub enum ErrorType {
    InvalidInput(String),
    InsufficientFunds(String),
    QuoteExpired(String),
    TransactionFailed(String),
    OracleError(String),
    ICRCTransferError(String),
}
```

## Admin Functions

Protected administrative functions:

```rust
// Set oracle configuration
set_oracle_config(config: OracleConfig) -> Result<(), String>

// Emergency pause
emergency_pause_canister() -> Result<(), String>

// Update resolver status
update_resolver_status(resolver: Principal, active: bool) -> Result<(), String>

// Cleanup expired quotes
cleanup_expired_quotes() -> Result<u32, String>
```

## Testing

Run tests with:
```bash
cargo test
```

Key test coverage:
- Bundle creation validation
- NAV calculation accuracy
- Quote expiration handling
- Transaction state transitions
- ICRC-2 transfer simulation

## Deployment

### Local Development
```bash
dfx start --clean
dfx deploy backend
```

### IC Mainnet
```bash
dfx deploy --network ic backend
```

### Canister IDs
- Local: `bkyz2-fmaaa-aaaaa-qaaaq-cai`
- Mainnet: `dk3fi-vyaaa-aaaae-qfycq-cai`

## API Documentation

Full Candid interface available at:
- Local: http://localhost:4943/?canisterId=bkyz2-fmaaa-aaaaa-qaaaq-cai
- Mainnet: https://a4gq6-oaaaa-aaaab-qaa4q-cai.raw.icp0.io/?id=dk3fi-vyaaa-aaaae-qfycq-cai

## Security Considerations

1. **Principal-based Authentication**: All actions tied to Internet Identity
2. **Approval Pattern**: ICRC-2 requires explicit approval before transfers
3. **Escrow Model**: Canister holds funds during trades
4. **Rate Limiting**: Quote request throttling per user
5. **Input Validation**: Comprehensive validation on all inputs

## Performance Metrics

- NAV Calculation: < 100ms
- Quote Request: < 50ms
- Transaction Creation: < 200ms
- Bundle Query: < 20ms
- Price Cache Hit: < 5ms

## Future Enhancements

- [ ] Cross-chain asset support via threshold signatures
- [ ] Advanced order types (limit, stop-loss)
- [ ] Automated rebalancing strategies
- [ ] Governance token for protocol decisions
- [ ] Historical price tracking and analytics
- [ ] WebSocket support for real-time updates

## Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for development guidelines.

## License

MIT License - see [LICENSE](../../LICENSE) for details.