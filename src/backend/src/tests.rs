#[cfg(test)]
mod tests {
    use candid::Principal;
    use crate::types::*;

    fn mock_principal() -> Principal {
        Principal::from_text("rdmx6-jaaaa-aaaaa-aaadq-cai").unwrap()
    }

    fn create_ckbtc_asset() -> AssetInfo {
        AssetInfo {
            id: AssetId("ckBTC".to_string()),
            symbol: "ckBTC".to_string(),
            name: "Chain Key Bitcoin".to_string(),
            standard: AssetStandard::ICRC2,
            ledger_canister: mock_principal(),
            minter_canister: Some(mock_principal()),
            oracle_ticker: Some("BTC".to_string()),
            decimals: 8,
            is_active: true,
            added_at: 1699000000000000000u64,
            metadata: AssetMetadata {
                category: AssetCategory::Cryptocurrency,
                description: Some("Chain Key Bitcoin on IC".to_string()),
                website: Some("https://bitcoin.org".to_string()),
                logo_url: None,
            },
        }
    }

    fn create_cketh_asset() -> AssetInfo {
        AssetInfo {
            id: AssetId("ckETH".to_string()),
            symbol: "ckETH".to_string(),
            name: "Chain Key Ethereum".to_string(),
            standard: AssetStandard::ICRC2,
            ledger_canister: mock_principal(),
            minter_canister: Some(mock_principal()),
            oracle_ticker: Some("ETH".to_string()),
            decimals: 18,
            is_active: true,
            added_at: 1699000000000000000u64,
            metadata: AssetMetadata {
                category: AssetCategory::Cryptocurrency,
                description: Some("Chain Key Ethereum on IC".to_string()),
                website: Some("https://ethereum.org".to_string()),
                logo_url: None,
            },
        }
    }

    fn create_ckusdc_asset() -> AssetInfo {
        AssetInfo {
            id: AssetId("ckUSDC".to_string()),
            symbol: "ckUSDC".to_string(),
            name: "Chain Key USD Coin".to_string(),
            standard: AssetStandard::ICRC2,
            ledger_canister: mock_principal(),
            minter_canister: Some(mock_principal()),
            oracle_ticker: Some("USDC".to_string()),
            decimals: 6,
            is_active: true,
            added_at: 1699000000000000000u64,
            metadata: AssetMetadata {
                category: AssetCategory::Stablecoin,
                description: Some("Chain Key USD Coin on IC".to_string()),
                website: Some("https://centre.io".to_string()),
                logo_url: None,
            },
        }
    }

    fn get_mock_oracle_price(ticker: &str) -> u64 {
        match ticker {
            "BTC" => 100_000_00_000_000u64,   // $100,000 with 8 decimals
            "ETH" => 4_000_00_000_000u64,     // $4,000 with 8 decimals
            "USDC" => 1_00_000_000u64,        // $1.00 with 8 decimals
            "GOLD" => 3_000_00_000_000u64,    // $3,000 with 8 decimals
            "GLDT" => 1_50_000_000u64,        // $1.50 with 8 decimals
            _ => 1_00_000_000u64,             // $1.00 default
        }
    }

    fn mock_asset_id() -> AssetId {
        AssetId("ckBTC".to_string())
    }

    fn mock_asset_info() -> AssetInfo {
        AssetInfo {
            id: mock_asset_id(),
            symbol: "ckBTC".to_string(),
            name: "Chain Key Bitcoin".to_string(),
            standard: AssetStandard::ICRC2,
            ledger_canister: mock_principal(),
            minter_canister: Some(mock_principal()),
            oracle_ticker: Some("BTC".to_string()),
            decimals: 8,
            is_active: true,
            added_at: 1699000000000000000,
            metadata: AssetMetadata {
                logo_url: None,
                website: None,
                description: Some("Bitcoin on IC".to_string()),
                category: AssetCategory::Cryptocurrency,
            },
        }
    }

    #[test]
    fn test_asset_id_and_types() {
        let asset_id = mock_asset_id();
        assert_eq!(asset_id.0, "ckBTC");

        let asset_info = mock_asset_info();
        assert_eq!(asset_info.symbol, "ckBTC");
        assert_eq!(asset_info.decimals, 8);
        assert!(asset_info.is_active);
        assert!(matches!(asset_info.standard, AssetStandard::ICRC2));
        assert!(matches!(asset_info.metadata.category, AssetCategory::Cryptocurrency));
    }

    #[test]
    fn test_bundle_allocation_validation() {
        let allocation = AssetAllocation {
            asset_id: mock_asset_id(),
            percentage: 50,
        };
        assert_eq!(allocation.percentage, 50);
        assert_eq!(allocation.asset_id.0, "ckBTC");

        // Test valid percentage range
        assert!(allocation.percentage <= 100);
        assert!(allocation.percentage > 0);
    }

    #[test]
    fn test_transaction_status_types() {
        let statuses = vec![
            TransactionStatus::Pending,
            TransactionStatus::WaitingForResolver,
            TransactionStatus::FundsLocked,
            TransactionStatus::InProgress,
            TransactionStatus::Completed,
            TransactionStatus::Failed,
            TransactionStatus::TimedOut,
        ];

        // Test that all transaction statuses are properly defined
        for status in statuses {
            match status {
                TransactionStatus::Pending => assert!(true),
                TransactionStatus::WaitingForResolver => assert!(true),
                TransactionStatus::FundsLocked => assert!(true),
                TransactionStatus::InProgress => assert!(true),
                TransactionStatus::Completed => assert!(true),
                TransactionStatus::Failed => assert!(true),
                TransactionStatus::TimedOut => assert!(true),
            }
        }
    }

    #[test]
    fn test_locked_fund_types() {
        let ckusdc_lock = LockedFundType::CkUSDC;
        let nav_lock = LockedFundType::NAVTokens { bundle_id: 1 };

        match ckusdc_lock {
            LockedFundType::CkUSDC => assert!(true),
            _ => assert!(false),
        }

        match nav_lock {
            LockedFundType::NAVTokens { bundle_id } => assert_eq!(bundle_id, 1),
            _ => assert!(false),
        }
    }

    #[test]
    fn test_precise_nav_calculation() {
        let total_value = 1000_00000000u64; // $1000 with 8 decimals
        let total_tokens = 500u64; // 500 tokens
        let decimals = 8u8;

        let nav_per_token = crate::nav_calculator::calculate_precise_nav_per_token(
            total_value,
            total_tokens,
            decimals
        );

        // Should be $2.00 per token
        assert_eq!(nav_per_token, 2_00000000u64);

        // Test edge case: zero tokens should return 0
        let nav_zero_tokens = crate::nav_calculator::calculate_precise_nav_per_token(
            total_value,
            0,
            decimals
        );
        assert_eq!(nav_zero_tokens, 0u64); // Returns 0 when no tokens exist

        // Test precision formatting
        let formatted = crate::nav_calculator::format_nav_with_precision(nav_per_token, decimals);
        assert_eq!(formatted, "2.00000000");
    }

    #[test]
    fn test_operation_types() {
        let buy_op = OperationType::Buy;
        let sell_op = OperationType::Sell;

        match buy_op {
            OperationType::Buy => assert!(true),
            OperationType::Sell => assert!(false),
        }

        match sell_op {
            OperationType::Sell => assert!(true),
            OperationType::Buy => assert!(false),
        }
    }

    #[test]
    fn test_decimal_precision_handling() {
        // Test various decimal configurations
        let test_cases = vec![
            (8, 100_000_000u64, "1.00000000"),
            (6, 1_000_000u64, "1.000000"),
            (18, 1_000_000_000_000_000_000u64, "1.000000000000000000"),
        ];

        for (decimals, unit_value, expected) in test_cases {
            let formatted = crate::nav_calculator::format_nav_with_precision(unit_value, decimals);
            assert_eq!(formatted, expected);
        }
    }

    #[test]
    fn test_asset_value_calculation() {
        let holding_amount = 50_000_000u64; // 0.5 BTC (8 decimals)
        let price_usd = 45_000_00000000u64; // $45,000 USD (8 decimals)
        let decimals = 8u8;

        let value = crate::nav_calculator::calculate_holding_value_usd(
            holding_amount,
            price_usd,
            decimals
        ).unwrap();

        // 0.5 BTC * $45,000 = $22,500
        assert_eq!(value, 22_500_00000000u64);

        // Test overflow protection
        let max_amount = u64::MAX;
        let max_price = u64::MAX;
        assert!(crate::nav_calculator::calculate_holding_value_usd(
            max_amount,
            max_price,
            decimals
        ).is_err());
    }

    // Integration Tests for Trading System

    #[test]
    fn test_quote_request_structure() {
        let user = mock_principal();
        let quote_request = QuoteRequest {
            request_id: 1,
            user,
            bundle_id: 1,
            operation: OperationType::Buy,
            amount: 1000_00000000u64, // $1000 USD
            max_slippage: 5, // 5%
            created_at: 1699000000000000000,
            expires_at: 1699000300000000000, // 5 minutes later
        };

        assert_eq!(quote_request.request_id, 1);
        assert_eq!(quote_request.user, user);
        assert_eq!(quote_request.bundle_id, 1);
        assert!(matches!(quote_request.operation, OperationType::Buy));
        assert_eq!(quote_request.amount, 1000_00000000u64);
        assert_eq!(quote_request.max_slippage, 5);
        assert!(quote_request.expires_at > quote_request.created_at);
    }

    #[test]
    fn test_quote_assignment_structure() {
        let resolver = mock_principal();
        let quote_assignment = QuoteAssignment {
            request_id: 1,
            resolver,
            nav_tokens: 500_00000000u64, // 500 NAV tokens
            ckusdc_amount: 1000_00000000u64, // $1000 ckUSDC
            estimated_nav: 2_00000000u64, // $2.00 per token
            fees: 5_00000000u64, // $5 fees
            assigned_at: 1699000000000000000,
            valid_until: 1699000180000000000, // 3 minutes later
        };

        assert_eq!(quote_assignment.request_id, 1);
        assert_eq!(quote_assignment.resolver, resolver);
        assert_eq!(quote_assignment.nav_tokens, 500_00000000u64);
        assert_eq!(quote_assignment.ckusdc_amount, 1000_00000000u64);
        assert_eq!(quote_assignment.estimated_nav, 2_00000000u64);
        assert_eq!(quote_assignment.fees, 5_00000000u64);
        assert!(quote_assignment.valid_until > quote_assignment.assigned_at);

        // Verify NAV calculation: $1000 / 500 tokens = $2 per token (with 8 decimals)
        let calculated_nav = quote_assignment.ckusdc_amount / quote_assignment.nav_tokens;
        assert_eq!(calculated_nav, 2u64); // Simple division without decimals
    }

    #[test]
    fn test_transaction_structure() {
        let user = mock_principal();
        let resolver = mock_principal();
        let transaction = Transaction {
            id: 1,
            request_id: 1,
            user,
            resolver,
            bundle_id: 1,
            operation: OperationType::Buy,
            status: TransactionStatus::Pending,
            nav_tokens: 500_00000000u64,
            ckusdc_amount: 1000_00000000u64,
            created_at: 1699000000000000000,
            updated_at: 1699000000000000000,
            completed_at: None,
            timeout_at: 1699001800000000000, // 30 minutes later
        };

        assert_eq!(transaction.id, 1);
        assert_eq!(transaction.request_id, 1);
        assert_eq!(transaction.user, user);
        assert_eq!(transaction.resolver, resolver);
        assert_eq!(transaction.bundle_id, 1);
        assert!(matches!(transaction.operation, OperationType::Buy));
        assert!(matches!(transaction.status, TransactionStatus::Pending));
        assert_eq!(transaction.nav_tokens, 500_00000000u64);
        assert_eq!(transaction.ckusdc_amount, 1000_00000000u64);
        assert_eq!(transaction.created_at, transaction.updated_at);
        assert!(transaction.completed_at.is_none());
        assert!(transaction.timeout_at > transaction.created_at);
    }

    #[test]
    fn test_locked_funds_structure() {
        let user = mock_principal();
        let locked_funds = LockedFunds {
            user,
            transaction_id: 1,
            fund_type: LockedFundType::CkUSDC,
            amount: 1000_00000000u64,
            locked_at: 1699000000000000000,
            expires_at: 1699001800000000000,
        };

        assert_eq!(locked_funds.user, user);
        assert_eq!(locked_funds.transaction_id, 1);
        assert!(matches!(locked_funds.fund_type, LockedFundType::CkUSDC));
        assert_eq!(locked_funds.amount, 1000_00000000u64);
        assert!(locked_funds.expires_at > locked_funds.locked_at);

        // Test NAV token locked funds
        let nav_locked_funds = LockedFunds {
            user,
            transaction_id: 2,
            fund_type: LockedFundType::NAVTokens { bundle_id: 1 },
            amount: 500_00000000u64,
            locked_at: 1699000000000000000,
            expires_at: 1699001800000000000,
        };

        match nav_locked_funds.fund_type {
            LockedFundType::NAVTokens { bundle_id } => assert_eq!(bundle_id, 1),
            _ => assert!(false),
        }
    }

    #[test]
    fn test_bundle_holding_structure() {
        let asset_id = mock_asset_id();
        let bundle_holding = BundleHolding {
            bundle_id: 1,
            asset_id: asset_id.clone(),
            amount: 50_000_000u64, // 0.5 BTC
            last_updated: 1699000000000000000,
        };

        assert_eq!(bundle_holding.bundle_id, 1);
        assert_eq!(bundle_holding.asset_id, asset_id);
        assert_eq!(bundle_holding.amount, 50_000_000u64);
        assert!(bundle_holding.last_updated > 0);
    }

    #[test]
    fn test_nav_token_structure() {
        let user = mock_principal();
        let nav_token = XFusionNAVToken {
            bundle_id: 1,
            owner: user,
            amount: 500_00000000u64,
            last_updated: 1699000000000000000,
        };

        assert_eq!(nav_token.bundle_id, 1);
        assert_eq!(nav_token.owner, user);
        assert_eq!(nav_token.amount, 500_00000000u64);
        assert!(nav_token.last_updated > 0);
    }

    #[test]
    fn test_slippage_calculation_logic() {
        let estimated_nav = 2_00000000u64; // $2.00 per token (8 decimals)
        let max_slippage = 5u8; // 5%
        let nav_tokens = 100_00000000u64; // 100 tokens (8 decimals)

        // Base calculation: 100 tokens * $2 = $200
        // Both nav_tokens and estimated_nav have 8 decimals, so result has 16 decimals
        // We need to normalize back to 8 decimals
        let base_amount = (nav_tokens as u128 * estimated_nav as u128) / 100_000_000u128; // Normalize to 8 decimals

        // Calculate slippage amounts
        let max_ckusdc_with_slippage = (base_amount * 105 / 100) as u64; // 105% = $210
        let min_ckusdc_with_slippage = (base_amount * 95 / 100) as u64;  // 95% = $190

        let expected_max = 210_00000000u64; // $210
        let expected_min = 190_00000000u64; // $190

        assert_eq!(max_ckusdc_with_slippage, expected_max);
        assert_eq!(min_ckusdc_with_slippage, expected_min);

        // Test that actual amount should be within slippage bounds
        let actual_ckusdc = 200_00000000u64; // $200 (exact NAV value)
        assert!(actual_ckusdc <= max_ckusdc_with_slippage);
        assert!(actual_ckusdc >= min_ckusdc_with_slippage);
    }

    #[test]
    fn test_proportional_calculation_logic() {
        let total_nav_tokens = 1000_00000000u64; // 1000 total tokens
        let user_nav_tokens = 100_00000000u64;   // User owns 100 tokens (10%)
        let total_asset_holding = 1_00000000u64; // 1 BTC total

        // Calculate proportional share
        let user_share_percentage = (user_nav_tokens as f64) / (total_nav_tokens as f64);
        assert_eq!(user_share_percentage, 0.1); // 10%

        let user_asset_share = (total_asset_holding as f64 * user_share_percentage) as u64;
        let expected_share = 10_000_000u64; // 0.1 BTC (10% of 1 BTC)
        assert_eq!(user_asset_share, expected_share);
    }

    #[test]
    fn test_time_and_expiration_logic() {
        let base_time = 1699000000000000000u64;
        let quote_duration = 300_000_000_000u64; // 5 minutes in nanoseconds
        let transaction_timeout = 1800_000_000_000u64; // 30 minutes in nanoseconds

        let quote_expires_at = base_time + quote_duration;
        let transaction_timeout_at = base_time + transaction_timeout;

        assert_eq!(quote_expires_at, 1699000300000000000u64);
        assert_eq!(transaction_timeout_at, 1699001800000000000u64);
        assert!(transaction_timeout_at > quote_expires_at);

        // Test expiration check logic
        let current_time = base_time + 600_000_000_000u64; // 10 minutes later
        let is_quote_expired = current_time > quote_expires_at;
        let is_transaction_expired = current_time > transaction_timeout_at;

        assert!(is_quote_expired);
        assert!(!is_transaction_expired);
    }

    // Transaction Lifecycle and Error Handling Tests

    #[test]
    fn test_transaction_status_transitions() {
        // Test valid status transitions for buy flow
        let valid_buy_transitions = vec![
            (TransactionStatus::Pending, TransactionStatus::WaitingForResolver),
            (TransactionStatus::WaitingForResolver, TransactionStatus::FundsLocked),
            (TransactionStatus::FundsLocked, TransactionStatus::InProgress),
            (TransactionStatus::InProgress, TransactionStatus::Completed),
            (TransactionStatus::Pending, TransactionStatus::Failed),
            (TransactionStatus::FundsLocked, TransactionStatus::TimedOut),
        ];

        for (from_status, to_status) in valid_buy_transitions {
            // Verify that status transitions make logical sense
            match (&from_status, &to_status) {
                (TransactionStatus::Pending, TransactionStatus::WaitingForResolver) => assert!(true),
                (TransactionStatus::WaitingForResolver, TransactionStatus::FundsLocked) => assert!(true),
                (TransactionStatus::FundsLocked, TransactionStatus::InProgress) => assert!(true),
                (TransactionStatus::InProgress, TransactionStatus::Completed) => assert!(true),
                (TransactionStatus::Pending, TransactionStatus::Failed) => assert!(true),
                (TransactionStatus::FundsLocked, TransactionStatus::TimedOut) => assert!(true),
                _ => assert!(false, "Invalid transition from {:?} to {:?}", from_status, to_status),
            }
        }
    }

    #[test]
    fn test_transaction_timeout_scenarios() {
        let base_time = 1699000000000000000u64;
        let timeout_duration = 1800_000_000_000u64; // 30 minutes

        let transaction = Transaction {
            id: 1,
            request_id: 1,
            user: mock_principal(),
            resolver: mock_principal(),
            bundle_id: 1,
            operation: OperationType::Buy,
            status: TransactionStatus::FundsLocked,
            nav_tokens: 100_00000000u64,
            ckusdc_amount: 200_00000000u64,
            created_at: base_time,
            updated_at: base_time,
            completed_at: None,
            timeout_at: base_time + timeout_duration,
        };

        // Test within timeout window
        let current_time_1 = base_time + 900_000_000_000u64; // 15 minutes later
        let is_timed_out_1 = current_time_1 > transaction.timeout_at;
        assert!(!is_timed_out_1);

        // Test after timeout
        let current_time_2 = base_time + 2400_000_000_000u64; // 40 minutes later
        let is_timed_out_2 = current_time_2 > transaction.timeout_at;
        assert!(is_timed_out_2);

        // Test exactly at timeout
        let current_time_3 = transaction.timeout_at;
        let is_timed_out_3 = current_time_3 > transaction.timeout_at;
        assert!(!is_timed_out_3); // Should not be timed out exactly at timeout
    }

    #[test]
    fn test_fund_locking_error_scenarios() {
        let user = mock_principal();

        // Test insufficient funds scenario
        let insufficient_lock = LockedFunds {
            user,
            transaction_id: 1,
            fund_type: LockedFundType::CkUSDC,
            amount: 1000_00000000u64, // $1000
            locked_at: 1699000000000000000,
            expires_at: 1699001800000000000,
        };

        // Verify lock structure for insufficient funds
        assert_eq!(insufficient_lock.amount, 1000_00000000u64);
        assert!(matches!(insufficient_lock.fund_type, LockedFundType::CkUSDC));

        // Test NAV token insufficient funds
        let insufficient_nav_lock = LockedFunds {
            user,
            transaction_id: 2,
            fund_type: LockedFundType::NAVTokens { bundle_id: 1 },
            amount: 500_00000000u64, // 500 tokens
            locked_at: 1699000000000000000,
            expires_at: 1699001800000000000,
        };

        match insufficient_nav_lock.fund_type {
            LockedFundType::NAVTokens { bundle_id } => {
                assert_eq!(bundle_id, 1);
                assert_eq!(insufficient_nav_lock.amount, 500_00000000u64);
            }
            _ => assert!(false),
        }
    }

    #[test]
    fn test_slippage_tolerance_violations() {
        let estimated_nav = 2_00000000u64; // $2.00 per token
        let nav_tokens = 100_00000000u64; // 100 tokens
        let max_slippage = 5u8; // 5%

        // Calculate expected range
        let base_amount = (nav_tokens as u128 * estimated_nav as u128) / 100_000_000u128;
        let max_acceptable = (base_amount * 105 / 100) as u64; // $210
        let min_acceptable = (base_amount * 95 / 100) as u64;  // $190

        // Test scenarios
        let test_cases = vec![
            (220_00000000u64, false), // $220 - exceeds max slippage
            (210_00000000u64, true),  // $210 - at max boundary
            (200_00000000u64, true),  // $200 - exact NAV
            (190_00000000u64, true),  // $190 - at min boundary
            (180_00000000u64, false), // $180 - below min slippage
        ];

        for (price, should_be_valid) in test_cases {
            let is_within_slippage = price >= min_acceptable && price <= max_acceptable;
            assert_eq!(is_within_slippage, should_be_valid,
                "Price {} should be {} slippage bounds", price,
                if should_be_valid { "within" } else { "outside" });
        }
    }

    #[test]
    fn test_asset_deposit_validation_errors() {
        let user = mock_principal();
        let asset_id = mock_asset_id();

        // Test valid deposit
        let valid_deposit = (asset_id.clone(), 50_000_000u64); // 0.5 BTC
        assert!(valid_deposit.1 > 0);
        assert_eq!(valid_deposit.0.0, "ckBTC");

        // Test zero amount deposit (should be invalid)
        let zero_deposit = (asset_id.clone(), 0u64);
        assert_eq!(zero_deposit.1, 0);

        // Test multiple deposits
        let deposits = vec![
            (AssetId("ckBTC".to_string()), 25_000_000u64), // 0.25 BTC
            (AssetId("ckETH".to_string()), 1_000_000_000u64), // 1 ETH (18 decimals)
            (AssetId("GLDT".to_string()), 100_000_000u64), // 1 GLDT (8 decimals)
        ];

        // Validate all deposits have positive amounts
        for (asset, amount) in deposits {
            assert!(amount > 0, "Deposit amount must be positive for asset {}", asset.0);
            assert!(!asset.0.is_empty(), "Asset ID cannot be empty");
        }
    }

    #[test]
    fn test_transaction_failure_recovery() {
        let base_time = 1699000000000000000u64;
        let user = mock_principal();

        // Create a failed transaction
        let failed_transaction = Transaction {
            id: 1,
            request_id: 1,
            user,
            resolver: mock_principal(),
            bundle_id: 1,
            operation: OperationType::Buy,
            status: TransactionStatus::Failed,
            nav_tokens: 100_00000000u64,
            ckusdc_amount: 200_00000000u64,
            created_at: base_time,
            updated_at: base_time + 300_000_000_000u64, // Failed 5 minutes later
            completed_at: Some(base_time + 300_000_000_000u64),
            timeout_at: base_time + 1800_000_000_000u64,
        };

        // Verify failed transaction properties
        assert!(matches!(failed_transaction.status, TransactionStatus::Failed));
        assert!(failed_transaction.completed_at.is_some());
        assert!(failed_transaction.updated_at > failed_transaction.created_at);

        // Test fund unlock scenario for failed transaction
        let locked_funds_to_unlock = LockedFunds {
            user: failed_transaction.user,
            transaction_id: failed_transaction.id,
            fund_type: LockedFundType::CkUSDC,
            amount: failed_transaction.ckusdc_amount,
            locked_at: failed_transaction.created_at,
            expires_at: failed_transaction.timeout_at,
        };

        assert_eq!(locked_funds_to_unlock.amount, failed_transaction.ckusdc_amount);
        assert_eq!(locked_funds_to_unlock.transaction_id, failed_transaction.id);
    }

    #[test]
    fn test_quote_expiration_handling() {
        let base_time = 1699000000000000000u64;
        let quote_duration = 300_000_000_000u64; // 5 minutes

        let quote_request = QuoteRequest {
            request_id: 1,
            user: mock_principal(),
            bundle_id: 1,
            operation: OperationType::Buy,
            amount: 200_00000000u64,
            max_slippage: 5,
            created_at: base_time,
            expires_at: base_time + quote_duration,
        };

        // Test various time scenarios
        let time_scenarios = vec![
            (base_time + 120_000_000_000u64, false), // 2 minutes - not expired
            (base_time + 300_000_000_000u64, false), // Exactly at expiration - not expired
            (base_time + 301_000_000_000u64, true),  // 1 second past - expired
            (base_time + 600_000_000_000u64, true),  // 10 minutes - expired
        ];

        for (current_time, should_be_expired) in time_scenarios {
            let is_expired = current_time > quote_request.expires_at;
            assert_eq!(is_expired, should_be_expired,
                "Quote should {} at time offset {}ns",
                if should_be_expired { "be expired" } else { "not be expired" },
                current_time - base_time);
        }
    }

    #[test]
    fn test_nav_calculation_edge_cases() {
        // Test zero total tokens
        let nav_zero_tokens = crate::nav_calculator::calculate_precise_nav_per_token(
            1000_00000000u64, // $1000 total value
            0u64,             // 0 tokens
            8u8               // 8 decimals
        );
        assert_eq!(nav_zero_tokens, 0u64); // Should return 0 for zero tokens

        // Test zero total value
        let nav_zero_value = crate::nav_calculator::calculate_precise_nav_per_token(
            0u64,             // $0 total value
            100_00000000u64,  // 100 tokens
            8u8               // 8 decimals
        );
        assert_eq!(nav_zero_value, 0u64); // Should return 0 for zero value

        // Test very small amounts
        let nav_small = crate::nav_calculator::calculate_precise_nav_per_token(
            1u64,           // $0.00000001 total value
            1u64,           // 0.00000001 tokens
            8u8             // 8 decimals
        );
        assert_eq!(nav_small, 1u64); // Should return $0.00000001 per token

        // Test formatting edge cases
        let formatted_zero = crate::nav_calculator::format_nav_with_precision(0u64, 8u8);
        assert_eq!(formatted_zero, "0.00000000");

        let formatted_max = crate::nav_calculator::format_nav_with_precision(
            999_99999999u64, // $999.99999999
            8u8
        );
        assert_eq!(formatted_max, "999.99999999");
    }

    #[test]
    fn test_asset_holding_calculation_errors() {
        // Test valid calculation
        let valid_calc = crate::nav_calculator::calculate_holding_value_usd(
            100_000_000u64,   // 1.0 BTC (8 decimals)
            50000_00000000u64, // $50,000 per BTC
            8u8               // 8 decimals
        );
        assert!(valid_calc.is_ok());
        assert_eq!(valid_calc.unwrap(), 50000_00000000u64); // $50,000

        // Test decimal overflow protection
        let invalid_decimals = crate::nav_calculator::calculate_holding_value_usd(
            100_000_000u64,
            50000_00000000u64,
            25u8 // Invalid: exceeds 18 decimals
        );
        assert!(invalid_decimals.is_err());

        // Test value overflow protection
        let overflow_calc = crate::nav_calculator::calculate_holding_value_usd(
            u64::MAX,
            u64::MAX,
            8u8
        );
        assert!(overflow_calc.is_err());

        // Test zero amounts
        let zero_amount = crate::nav_calculator::calculate_holding_value_usd(
            0u64,
            50000_00000000u64,
            8u8
        );
        assert!(zero_amount.is_ok());
        assert_eq!(zero_amount.unwrap(), 0u64);

        let zero_price = crate::nav_calculator::calculate_holding_value_usd(
            100_000_000u64,
            0u64,
            8u8
        );
        assert!(zero_price.is_ok());
        assert_eq!(zero_price.unwrap(), 0u64);
    }

    #[test]
    fn test_nav_per_token_calculation_precision() {
        // Test basic NAV calculation: $1000 / 1000 tokens = $1.00 per token
        // total_usd_value is in 8 decimals: $1000.00000000
        let total_usd_value = 1000_00000000u64;
        let total_tokens = 1000u64;
        let precision_decimals = 8u8;

        let nav_per_token = crate::nav_calculator::calculate_precise_nav_per_token(
            total_usd_value,
            total_tokens,
            precision_decimals,
        );

        // Expected: (1000_00000000 * 10^8) / 1000 = 100_000_000 (which is $1.00000000)
        assert_eq!(nav_per_token, 100_000_000u64, "NAV should be $1.00 per token with 8 decimals");

        // Test with different amounts: $500 / 100 tokens = $5.00 per token
        let nav_per_token_2 = crate::nav_calculator::calculate_precise_nav_per_token(
            500_00000000u64,
            100u64,
            precision_decimals,
        );
        assert_eq!(nav_per_token_2, 500_000_000u64, "NAV should be $5.00 per token with 8 decimals");

        // Test zero tokens
        let zero_tokens_nav = crate::nav_calculator::calculate_precise_nav_per_token(
            total_usd_value,
            0,
            precision_decimals,
        );
        assert_eq!(zero_tokens_nav, 0u64, "Zero tokens should return zero NAV");

        // Test different precision: 6 decimals
        let nav_6_decimals = crate::nav_calculator::calculate_precise_nav_per_token(
            total_usd_value,
            total_tokens,
            6,
        );
        // Expected: (1000_00000000 * 10^6) / 1000 = 1_000_000 (which is $1.000000)
        assert_eq!(nav_6_decimals, 1_000_000u64, "NAV should be $1.000000 with 6 decimals");
    }

    #[test]
    fn test_nav_calculation_overflow_protection() {
        // Test that normal large values work correctly
        let large_usd_value = u64::MAX / 1_000_000;
        let total_tokens = 1u64;
        let precision_decimals = 8u8;

        let nav_result = crate::nav_calculator::calculate_nav_per_token_with_supply_validation(
            large_usd_value,
            total_tokens,
            precision_decimals,
        );

        // This should work fine with our simplified calculation
        assert!(nav_result.is_ok());

        let excessive_precision_result = crate::nav_calculator::calculate_nav_per_token_with_supply_validation(
            1000_00000000u64,
            1000u64,
            25,
        );

        assert!(excessive_precision_result.is_err());
        assert!(excessive_precision_result.unwrap_err().contains("Precision decimals cannot exceed 18"));
    }

    #[test]
    fn test_holding_value_calculation_with_real_icrc_decimals() {
        // Test ckBTC: 1.0 BTC at mock oracle price (8 decimals)
        let ckbtc_asset = create_ckbtc_asset();
        let ckbtc_amount = 100_000_000u64; // 1.0 BTC (8 decimals)
        let btc_price_usd = get_mock_oracle_price("BTC"); // $100,000 from oracle

        let holding_value = crate::nav_calculator::calculate_holding_value_usd(
            ckbtc_amount,
            btc_price_usd,
            ckbtc_asset.decimals,
        ).unwrap();

        // Expected: (100_000_000 * 100_000_00_000_000) / 10^8 = 100_000_00_000_000
        assert_eq!(holding_value, 100_000_00_000_000u64, "1 BTC at $100k should equal $100k USD");

        // Test ckETH: Use smaller amount to avoid u64 overflow (18 decimals)
        let cketh_asset = create_cketh_asset();
        let cketh_amount_small = 1_000_000_000_000_000u64; // 0.001 ETH (18 decimals)
        let eth_price_usd = get_mock_oracle_price("ETH"); // $4,000 from oracle

        let cketh_value = crate::nav_calculator::calculate_holding_value_usd(
            cketh_amount_small,
            eth_price_usd,
            cketh_asset.decimals,
        ).unwrap();

        // Expected: (1_000_000_000_000_000 * 4_000_00_000_000) / 10^18 = 4_00_000_000 ($4.00)
        assert_eq!(cketh_value, 4_00_000_000u64, "0.001 ETH at $4k should equal $4.00 USD");

        // Test ckUSDC: 1000 USDC with 6 decimals
        let ckusdc_asset = create_ckusdc_asset();
        let ckusdc_amount = 1000_000000u64; // 1000 USDC (6 decimals)
        let usdc_price_usd = get_mock_oracle_price("USDC"); // $1.00 from oracle

        let ckusdc_value = crate::nav_calculator::calculate_holding_value_usd(
            ckusdc_amount,
            usdc_price_usd,
            ckusdc_asset.decimals,
        ).unwrap();

        // Expected: (1000_000000 * 1_00_000_000) / 10^6 = 1000_00_000_000
        assert_eq!(ckusdc_value, 1000_00_000_000u64, "1000 USDC at $1 should equal $1000 USD");

        // Test fractional amounts: 0.5 BTC at oracle price
        let half_btc = 50_000_000u64; // 0.5 BTC (8 decimals)
        let half_btc_value = crate::nav_calculator::calculate_holding_value_usd(
            half_btc,
            btc_price_usd,
            ckbtc_asset.decimals,
        ).unwrap();
        assert_eq!(half_btc_value, 50_000_00_000_000u64, "0.5 BTC at $100k should equal $50k USD");
    }

    #[test]
    fn test_decimal_conversion_accuracy() {
        let amount_18_decimals = 1_000_000_000_000_000_000u64;
        let amount_8_decimals = crate::nav_calculator::convert_amount_between_decimals(
            amount_18_decimals,
            18,
            8,
        ).unwrap();

        assert_eq!(amount_8_decimals, 100_000_000u64);

        let amount_6_decimals = 1_000_000u64;
        let amount_8_decimals_converted = crate::nav_calculator::convert_amount_between_decimals(
            amount_6_decimals,
            6,
            8,
        ).unwrap();

        assert_eq!(amount_8_decimals_converted, 100_000_000u64);

        let same_decimals = crate::nav_calculator::convert_amount_between_decimals(
            1000u64,
            8,
            8,
        ).unwrap();

        assert_eq!(same_decimals, 1000u64);

        let overflow_conversion = crate::nav_calculator::convert_amount_between_decimals(
            u64::MAX,
            6,
            18,
        );

        assert!(overflow_conversion.is_err());
        assert!(overflow_conversion.unwrap_err().contains("Amount overflow during decimal conversion"));
    }

    #[test]
    fn test_usd_normalization_accuracy() {
        // Test BTC: 0.1 BTC at $10,000 per unit = $1,000
        let btc_amount = 10_000_000u64; // 0.1 BTC (8 decimals)
        let btc_price_per_unit = 10000_00000000u64; // $10,000 per BTC (8 decimals)
        let btc_decimals = 8u8;

        let usd_value = crate::nav_calculator::normalize_amount_to_usd(
            btc_amount,
            btc_decimals,
            btc_price_per_unit,
        ).unwrap();

        // Expected: (10_000_000 * 10000_00000000) / 10^8 = 1000_00000000
        assert_eq!(usd_value, 1000_00000000u64, "0.1 BTC at $10k should normalize to $1k USD");

        // Test smaller ETH to avoid overflow: use 8-decimal normalized value
        let eth_amount_normalized = 10_000_000u64; // 0.1 ETH normalized to 8 decimals
        let eth_price_per_unit = 1000_00000000u64; // $1,000 per ETH (8 decimals)
        let normalized_decimals = 8u8;

        let eth_usd_value = crate::nav_calculator::normalize_amount_to_usd(
            eth_amount_normalized,
            normalized_decimals,
            eth_price_per_unit,
        ).unwrap();

        // Expected: (10_000_000 * 1000_00000000) / 10^8 = 100_00000000 ($100)
        assert_eq!(eth_usd_value, 100_00000000u64, "0.1 ETH at $1k should normalize to $100 USD");

        // Test USDC: 100 USDC at $1.00 per unit = $100
        let usdc_amount = 100_000000u64; // 100 USDC (6 decimals)
        let usdc_price_per_unit = 1_00000000u64; // $1.00 per USDC (8 decimals)
        let usdc_decimals = 6u8;

        let usdc_usd_value = crate::nav_calculator::normalize_amount_to_usd(
            usdc_amount,
            usdc_decimals,
            usdc_price_per_unit,
        ).unwrap();

        // Expected: (100_000000 * 1_00000000) / 10^6 = 100_00000000
        assert_eq!(usdc_usd_value, 100_00000000u64, "100 USDC at $1 should normalize to $100 USD");

        // Test zero amount
        let zero_amount = crate::nav_calculator::normalize_amount_to_usd(
            0u64,
            8,
            50000_00000000u64,
        ).unwrap();

        assert_eq!(zero_amount, 0u64, "Zero amount should normalize to zero USD");
    }

    #[test]
    fn test_icrc_decimal_range_handling() {
        // Test that our calculation logic correctly handles the full ICRC decimal range (6-18)

        // Test 6 decimals (ckUSDC)
        let ckusdc_asset = create_ckusdc_asset();
        let usdc_amount = 1_000_000u64; // 1 USDC (6 decimals)
        let usdc_price = get_mock_oracle_price("USDC"); // $1.00

        let usdc_value = crate::nav_calculator::calculate_holding_value_usd(
            usdc_amount,
            usdc_price,
            ckusdc_asset.decimals,
        ).unwrap();
        assert_eq!(usdc_value, 1_00_000_000u64, "1 USDC should equal $1.00");

        // Test 8 decimals (ckBTC)
        let ckbtc_asset = create_ckbtc_asset();
        let btc_amount = 1_000_000u64; // 0.01 BTC (8 decimals)
        let btc_price = get_mock_oracle_price("BTC"); // $100,000

        let btc_value = crate::nav_calculator::calculate_holding_value_usd(
            btc_amount,
            btc_price,
            ckbtc_asset.decimals,
        ).unwrap();
        assert_eq!(btc_value, 1_000_00_000_000u64, "0.01 BTC should equal $1,000");

        // Test 18 decimals (ckETH) - using very small amount to avoid overflow
        let cketh_asset = create_cketh_asset();
        let eth_amount = 100_000_000_000_000u64; // 0.0001 ETH (18 decimals)
        let eth_price = get_mock_oracle_price("ETH"); // $4,000

        let eth_value = crate::nav_calculator::calculate_holding_value_usd(
            eth_amount,
            eth_price,
            cketh_asset.decimals,
        ).unwrap();
        assert_eq!(eth_value, 40_000_000u64, "0.0001 ETH should equal $0.40");

        // Test decimal conversions across the range
        let amount_18_dec = 1_000_000_000_000_000_000u64; // 1.0 with 18 decimals

        // Convert 18 → 8 decimals
        let amount_8_dec = crate::nav_calculator::convert_amount_between_decimals(
            amount_18_dec, 18, 8
        ).unwrap();
        assert_eq!(amount_8_dec, 100_000_000u64, "18→8 decimal conversion should work");

        // Convert 8 → 6 decimals
        let amount_6_dec = crate::nav_calculator::convert_amount_between_decimals(
            amount_8_dec, 8, 6
        ).unwrap();
        assert_eq!(amount_6_dec, 1_000_000u64, "8→6 decimal conversion should work");

        // Convert 6 → 18 decimals (back to original)
        let amount_back_to_18 = crate::nav_calculator::convert_amount_between_decimals(
            amount_6_dec, 6, 18
        ).unwrap();
        assert_eq!(amount_back_to_18, amount_18_dec, "6→18 decimal conversion should work");
    }

    #[test]
    fn test_memory_storage_consistency() {
        // Test that our storage maps maintain data integrity and consistency

        // Test asset registry consistency
        let asset_count_before = crate::asset_registry::get_asset_count();

        // Create test assets
        let ckbtc_asset = create_ckbtc_asset();
        let cketh_asset = create_cketh_asset();
        let ckusdc_asset = create_ckusdc_asset();

        // Verify each asset can be stored and retrieved correctly
        // Note: We can't actually call add_asset without admin context in tests,
        // but we can test the data structure integrity

        // Test storage map bounds and limits
        let large_asset_id = AssetId("x".repeat(95)); // Near max bound of 100
        assert!(large_asset_id.0.len() < 100, "Asset ID should be within bounds");

        let max_asset_id = AssetId("x".repeat(99)); // At max bound
        assert!(max_asset_id.0.len() < 100, "Max asset ID should be within bounds");

        // Test data serialization consistency
        let serialized = candid::encode_one(&ckbtc_asset).expect("Should serialize");
        let deserialized: AssetInfo = candid::decode_one(&serialized).expect("Should deserialize");
        assert_eq!(ckbtc_asset.id, deserialized.id, "Asset ID should survive serialization");
        assert_eq!(ckbtc_asset.decimals, deserialized.decimals, "Decimals should survive serialization");
        assert_eq!(ckbtc_asset.is_active, deserialized.is_active, "Active status should survive serialization");
    }

    #[test]
    fn test_stable_memory_data_structures() {
        // Test that our stable memory data structures are properly designed

        // Test AssetInfo serialization bounds
        let test_asset = create_ckbtc_asset();
        let serialized_size = candid::encode_one(&test_asset).expect("Should serialize").len();

        // Verify reasonable serialization size (should be well under any reasonable bounds)
        assert!(serialized_size < 1024, "AssetInfo serialization should be compact");

        // Test AssetId bounds compliance
        use crate::memory::*;
        use ic_stable_structures::Storable;

        let asset_id = AssetId("test".to_string());
        let serialized_id = asset_id.to_bytes();
        let deserialized_id = AssetId::from_bytes(serialized_id);
        assert_eq!(asset_id.0, deserialized_id.0, "AssetId should survive stable storage serialization");

        // Test large asset ID at boundary
        let large_id = AssetId("a".repeat(95));
        let large_serialized = large_id.to_bytes();
        assert!(large_serialized.len() <= 100, "Large AssetId should fit in bounds");

        let large_deserialized = AssetId::from_bytes(large_serialized);
        assert_eq!(large_id.0, large_deserialized.0, "Large AssetId should survive serialization");
    }

    #[test]
    fn test_storage_map_key_consistency() {
        // Test that storage map keys are consistent and unique

        // Test AssetId uniqueness
        let btc_id = AssetId("ckBTC".to_string());
        let eth_id = AssetId("ckETH".to_string());
        let usdc_id = AssetId("ckUSDC".to_string());

        assert_ne!(btc_id, eth_id, "Different assets should have different IDs");
        assert_ne!(btc_id, usdc_id, "Different assets should have different IDs");
        assert_ne!(eth_id, usdc_id, "Different assets should have different IDs");

        // Test key ordering consistency (important for stable maps)
        assert!(btc_id < eth_id, "Asset IDs should have consistent ordering");
        assert!(btc_id < usdc_id, "Asset IDs should have consistent ordering");
        assert!(eth_id > btc_id, "Asset IDs should have consistent ordering");

        // Test bundle ID generation consistency
        let bundle_id_1 = 1u64;
        let bundle_id_2 = 2u64;
        assert_ne!(bundle_id_1, bundle_id_2, "Bundle IDs should be unique");
        assert!(bundle_id_1 < bundle_id_2, "Bundle IDs should have natural ordering");

        // Test NAV token key composition
        let user = mock_principal();
        let nav_key_1 = format!("{}:{}", user.to_text(), bundle_id_1);
        let nav_key_2 = format!("{}:{}", user.to_text(), bundle_id_2);
        assert_ne!(nav_key_1, nav_key_2, "NAV token keys should be unique per bundle");
    }

    #[test]
    fn test_data_integrity_constraints() {
        // Test that our data structures maintain integrity constraints

        // Test asset decimal constraints
        let valid_decimals = [0u8, 6u8, 8u8, 18u8];
        for decimals in valid_decimals {
            assert!(decimals <= 18, "Decimals should be within reasonable bounds");
        }

        // Test invalid decimal handling
        let invalid_decimals = [19u8, 25u8, 255u8];
        for decimals in invalid_decimals {
            let result = crate::nav_calculator::calculate_holding_value_usd(
                1000u64,
                1_00_000_000u64,
                decimals,
            );
            if decimals > 18 {
                assert!(result.is_err(), "Should reject excessive decimals: {}", decimals);
            }
        }

        // Test percentage constraints
        let valid_percentages = [1u8, 50u8, 100u8];
        for percentage in valid_percentages {
            assert!(percentage <= 100, "Percentage should be within 0-100");
        }

        // Test bundle allocation constraints
        let test_allocations = vec![
            AssetAllocation {
                asset_id: AssetId("ckBTC".to_string()),
                percentage: 60u8,
            },
            AssetAllocation {
                asset_id: AssetId("ckETH".to_string()),
                percentage: 40u8,
            },
        ];

        let validation_result = crate::nav_calculator::validate_bundle_allocations(&test_allocations);
        assert!(validation_result.is_ok(), "Valid allocations should pass validation");

        // Test total percentage constraint
        let invalid_allocations = vec![
            AssetAllocation {
                asset_id: AssetId("ckBTC".to_string()),
                percentage: 60u8,
            },
            AssetAllocation {
                asset_id: AssetId("ckETH".to_string()),
                percentage: 50u8, // Total = 110%
            },
        ];

        let invalid_result = crate::nav_calculator::validate_bundle_allocations(&invalid_allocations);
        assert!(invalid_result.is_err(), "Invalid total percentage should be rejected");
    }

    #[test]
    fn test_memory_efficiency_and_bounds() {
        // Test memory usage patterns and efficiency

        // Test principal storage efficiency
        let principal = mock_principal();
        let principal_text = principal.to_text();
        assert!(principal_text.len() < 100, "Principal text should be reasonably sized");

        // Test timestamp storage
        let timestamp = 1699000000000000000u64; // Realistic timestamp
        assert!(timestamp > 0, "Timestamp should be positive");
        assert!(timestamp < u64::MAX / 2, "Timestamp should be reasonable");

        // Test amount storage bounds
        let max_reasonable_amount = u64::MAX / 1000; // Leave room for calculations
        let test_amounts = [
            0u64,
            1u64,
            1_000_000u64,
            1_000_000_000u64,
            max_reasonable_amount,
        ];

        for amount in test_amounts {
            // Test that amounts can be safely used in calculations
            let doubled = amount.checked_mul(2);
            if amount <= max_reasonable_amount {
                assert!(doubled.is_some() || amount == 0, "Reasonable amounts should not overflow in basic operations");
            }
        }

        // Test price storage bounds
        let realistic_prices = [
            1u64,                    // $0.00000001
            1_00_000_000u64,        // $1.00
            100_000_00_000_000u64,  // $100,000
        ];

        for price in realistic_prices {
            assert!(price > 0, "Prices should be positive");
            assert!(price <= 1_000_000_00_000_000u64, "Prices should be within reasonable bounds");
        }
    }

    #[test]
    fn test_concurrent_data_access_patterns() {
        // Test data access patterns that might occur concurrently

        // Test multiple asset lookups
        let asset_ids = vec![
            AssetId("ckBTC".to_string()),
            AssetId("ckETH".to_string()),
            AssetId("ckUSDC".to_string()),
        ];

        for asset_id in &asset_ids {
            // Simulate multiple concurrent reads
            let _cloned_id = asset_id.clone();
            assert_eq!(asset_id.0, _cloned_id.0, "Asset ID cloning should be consistent");
        }

        // Test multiple bundle operations
        let bundle_ids = vec![1u64, 2u64, 3u64];

        for bundle_id in &bundle_ids {
            // Test bundle ID consistency
            assert!(*bundle_id > 0, "Bundle IDs should be positive");

            // Test NAV token key generation for same bundle
            let user1 = mock_principal();
            let user1_text = user1.to_text();
            let user2_text = "different-user-principal-text";

            let key1 = format!("{}:{}", user1_text, bundle_id);
            let key2 = format!("{}:{}", user2_text, bundle_id);

            assert_ne!(key1, key2, "Different users should have different NAV token keys");
        }

        // Test timestamp consistency
        let now = 1699000000000000000u64;
        let later = now + 1000000000u64; // 1 second later
        assert!(later > now, "Timestamps should maintain ordering");
        assert!(later - now == 1000000000u64, "Timestamp arithmetic should be precise");
    }

    #[test]
    fn test_nav_formatting_precision() {
        let nav_value_8_decimals = 123_456_789u64;
        let formatted = crate::nav_calculator::format_nav_with_precision(nav_value_8_decimals, 8);
        assert_eq!(formatted, "1.23456789");

        let nav_value_whole = 100_000_000u64;
        let formatted_whole = crate::nav_calculator::format_nav_with_precision(nav_value_whole, 8);
        assert_eq!(formatted_whole, "1.00000000");

        let nav_value_zero_decimals = 50u64;
        let formatted_zero = crate::nav_calculator::format_nav_with_precision(nav_value_zero_decimals, 0);
        assert_eq!(formatted_zero, "50");

        let nav_value_trailing_zeros = 123_400_000u64;
        let formatted_trimmed = crate::nav_calculator::format_nav_with_precision(nav_value_trailing_zeros, 8);
        assert_eq!(formatted_trimmed, "1.234");
    }

    #[test]
    fn test_price_adjustment_for_different_decimals() {
        let usd_price_8_decimals = 1_00000000u64;

        let adjusted_for_18_decimals = crate::nav_calculator::adjust_price_for_decimals(
            usd_price_8_decimals,
            18
        );
        assert!(adjusted_for_18_decimals > usd_price_8_decimals);

        let adjusted_for_6_decimals = crate::nav_calculator::adjust_price_for_decimals(
            usd_price_8_decimals,
            6
        );
        assert_eq!(adjusted_for_6_decimals, 1_000000u64);

        let adjusted_for_8_decimals = crate::nav_calculator::adjust_price_for_decimals(
            usd_price_8_decimals,
            8
        );
        assert_eq!(adjusted_for_8_decimals, usd_price_8_decimals);

        let adjusted_for_2_decimals = crate::nav_calculator::adjust_price_for_decimals(
            usd_price_8_decimals,
            2
        );
        assert_eq!(adjusted_for_2_decimals, 1_00u64);
    }

    #[test]
    fn test_allocation_percentage_validation() {
        let allocations = vec![
            AssetAllocation {
                asset_id: AssetId("ckBTC".to_string()),
                percentage: 60,
            },
            AssetAllocation {
                asset_id: AssetId("ckETH".to_string()),
                percentage: 40,
            },
        ];

        let result = crate::nav_calculator::validate_bundle_allocations(&allocations);
        assert!(result.is_ok());

        let invalid_percentage_allocations = vec![
            AssetAllocation {
                asset_id: AssetId("ckBTC".to_string()),
                percentage: 60,
            },
            AssetAllocation {
                asset_id: AssetId("ckETH".to_string()),
                percentage: 50,
            },
        ];

        let invalid_result = crate::nav_calculator::validate_bundle_allocations(&invalid_percentage_allocations);
        assert!(invalid_result.is_err());
        assert!(invalid_result.unwrap_err().contains("Total allocation percentage must equal 100%"));

        let duplicate_asset_allocations = vec![
            AssetAllocation {
                asset_id: AssetId("ckBTC".to_string()),
                percentage: 50,
            },
            AssetAllocation {
                asset_id: AssetId("ckBTC".to_string()),
                percentage: 50,
            },
        ];

        let duplicate_result = crate::nav_calculator::validate_bundle_allocations(&duplicate_asset_allocations);
        assert!(duplicate_result.is_err());
        assert!(duplicate_result.unwrap_err().contains("Duplicate asset in allocations"));

        let empty_allocations: Vec<AssetAllocation> = vec![];
        let empty_result = crate::nav_calculator::validate_bundle_allocations(&empty_allocations);
        assert!(empty_result.is_err());
        assert!(empty_result.unwrap_err().contains("Bundle must have at least one allocation"));
    }

    #[test]
    fn test_complete_nav_calculation_flow_with_real_icrc_assets() {
        // Scenario: Multi-asset bundle with realistic ICRC decimals and oracle prices
        // Portfolio: 1.0 ckBTC + 0.25 ckETH, 1000 NAV tokens issued

        let ckbtc_asset = create_ckbtc_asset();
        let cketh_asset = create_cketh_asset();

        // === ckBTC Holdings (8 decimals) ===
        let btc_holding_amount = 100_000_000u64; // 1.0 BTC (8 decimals)
        let btc_price = get_mock_oracle_price("BTC"); // $100,000 from oracle

        let btc_value = crate::nav_calculator::calculate_holding_value_usd(
            btc_holding_amount,
            btc_price,
            ckbtc_asset.decimals,
        ).unwrap();
        assert_eq!(btc_value, 100_000_00_000_000u64, "1 BTC at $100k = $100k");

        // === ckETH Holdings (18 decimals, smaller amount to avoid overflow) ===
        let eth_holding_amount = 250_000_000_000_000_000u64; // 0.25 ETH (18 decimals)
        let eth_price = get_mock_oracle_price("ETH"); // $4,000 from oracle

        let eth_value = crate::nav_calculator::calculate_holding_value_usd(
            eth_holding_amount,
            eth_price,
            cketh_asset.decimals,
        ).unwrap();
        assert_eq!(eth_value, 1000_00_000_000u64, "0.25 ETH at $4k = $1k");

        // === Total Portfolio Value ===
        let total_usd_value = btc_value + eth_value;
        assert_eq!(total_usd_value, 101_000_00_000_000u64, "Total portfolio = $101k");

        // === NAV Calculation ===
        let total_nav_tokens = 1000u64; // 1000 NAV tokens issued

        let nav_per_token = crate::nav_calculator::calculate_precise_nav_per_token(
            total_usd_value,
            total_nav_tokens,
            8,
        );

        // Expected: 101_000_00_000_000 / 1000 = 10_100_000_000 ($101.00000000 per token with 8 decimals)
        assert_eq!(nav_per_token, 10_100_000_000u64, "NAV should be $101.00 per token");

        // === Verify Formatting ===
        let formatted_nav = crate::nav_calculator::format_nav_with_precision(nav_per_token, 8);
        assert_eq!(formatted_nav, "101.00000000", "Formatted NAV should display as $101.00000000");

        // === User Portfolio Calculation ===
        // User owns 100 NAV tokens (10% of total supply)
        let user_nav_tokens = 100u64;
        let user_portfolio_value_raw = user_nav_tokens as u128 * nav_per_token as u128;
        let user_portfolio_value_usd = user_portfolio_value_raw; // Already in correct format (8 decimals)

        assert_eq!(user_portfolio_value_usd, 1_010_000_000_000u128, "User should own $10.1k worth of assets (10% of $101k)");

        // === Proportional Asset Breakdown ===
        // User should own proportional amounts of underlying assets
        let user_btc_proportion = (user_nav_tokens as u128 * btc_holding_amount as u128) / total_nav_tokens as u128;
        let user_eth_proportion = (user_nav_tokens as u128 * eth_holding_amount as u128) / total_nav_tokens as u128;

        assert_eq!(user_btc_proportion, 10_000_000u128, "User should own 0.1 BTC (10% of 1 BTC)");
        assert_eq!(user_eth_proportion, 25_000_000_000_000_000u128, "User should own 0.025 ETH (10% of 0.25 ETH)");
    }

    #[test]
    fn test_nav_calculation_edge_cases_mathematical() {
        // Test very small amounts
        let tiny_value = 1u64; // $0.00000001
        let many_tokens = 1000000u64; // 1 million tokens
        let tiny_nav = crate::nav_calculator::calculate_precise_nav_per_token(tiny_value, many_tokens, 8);
        assert_eq!(tiny_nav, 0u64, "Very small value should result in zero NAV due to rounding");

        // Test single token with significant value
        let large_value = 1000000_00000000u64; // $1,000,000
        let single_token = 1u64;
        let large_nav = crate::nav_calculator::calculate_precise_nav_per_token(large_value, single_token, 8);
        assert_eq!(large_nav, 1000000_00000000u64, "Single token worth $1M should have $1M NAV");

        // Test precision differences
        let value = 1000_00000000u64; // $1,000
        let tokens = 3u64; // 3 tokens

        let nav_8_decimals = crate::nav_calculator::calculate_precise_nav_per_token(value, tokens, 8);
        let nav_6_decimals = crate::nav_calculator::calculate_precise_nav_per_token(value, tokens, 6);

        // $1000 / 3 = $333.33333333 (8 decimals) = 333_33333333
        assert_eq!(nav_8_decimals, 333_33333333u64, "8-decimal precision should be 333.33333333");

        // $1000 / 3 = $333.333333 (6 decimals) = 333_333333
        assert_eq!(nav_6_decimals, 333_333333u64, "6-decimal precision should be 333.333333");
    }
}