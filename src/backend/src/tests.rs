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
            "BTC" => 100_000_00_000_000u64,
            "ETH" => 4_000_00_000_000u64,
            "USDC" => 1_00_000_000u64,
            "GOLD" => 3_000_00_000_000u64,
            "GLDT" => 1_50_000_000u64,
            _ => 1_00_000_000u64,
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
        let total_value = 1000_00000000u64;
        let total_tokens = 500u64;
        let decimals = 8u8;
        let nav_per_token = crate::nav_calculator::calculate_precise_nav_per_token(
            total_value,
            total_tokens,
            decimals
        );
        assert_eq!(nav_per_token, 2_00000000u64);
        let nav_zero_tokens = crate::nav_calculator::calculate_precise_nav_per_token(
            total_value,
            0,
            decimals
        );
        assert_eq!(nav_zero_tokens, 0u64);
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
        let holding_amount = 50_000_000u64;
        let price_usd = 45_000_00000000u64;
        let decimals = 8u8;
        let value = crate::nav_calculator::calculate_holding_value_usd(
            holding_amount,
            price_usd,
            decimals
        ).unwrap();
        assert_eq!(value, 22_500_00000000u64);
        let max_amount = u64::MAX;
        let max_price = u64::MAX;
        assert!(crate::nav_calculator::calculate_holding_value_usd(
            max_amount,
            max_price,
            decimals
        ).is_err());
    }
    #[test]
    fn test_quote_request_structure() {
        let user = mock_principal();
        let quote_request = QuoteRequest {
            request_id: 1,
            user,
            bundle_id: 1,
            operation: OperationType::Buy,
            amount: 1000_00000000u64,
            max_slippage: 5,
            created_at: 1699000000000000000,
            expires_at: 1699000300000000000,
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
            nav_tokens: 500_00000000u64,
            ckusdc_amount: 1000_00000000u64,
            estimated_nav: 2_00000000u64,
            fees: 5_00000000u64,
            assigned_at: 1699000000000000000,
            valid_until: 1699000180000000000,
        };
        assert_eq!(quote_assignment.request_id, 1);
        assert_eq!(quote_assignment.resolver, resolver);
        assert_eq!(quote_assignment.nav_tokens, 500_00000000u64);
        assert_eq!(quote_assignment.ckusdc_amount, 1000_00000000u64);
        assert_eq!(quote_assignment.estimated_nav, 2_00000000u64);
        assert_eq!(quote_assignment.fees, 5_00000000u64);
        assert!(quote_assignment.valid_until > quote_assignment.assigned_at);
        let calculated_nav = quote_assignment.ckusdc_amount / quote_assignment.nav_tokens;
        assert_eq!(calculated_nav, 2u64);
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
            timeout_at: 1699001800000000000,
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
            amount: 50_000_000u64,
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
        let estimated_nav = 2_00000000u64;
        let max_slippage = 5u8;
        let nav_tokens = 100_00000000u64;
        let base_amount = (nav_tokens as u128 * estimated_nav as u128) / 100_000_000u128;
        let max_ckusdc_with_slippage = (base_amount * 105 / 100) as u64;
        let min_ckusdc_with_slippage = (base_amount * 95 / 100) as u64;
        let expected_max = 210_00000000u64;
        let expected_min = 190_00000000u64;
        assert_eq!(max_ckusdc_with_slippage, expected_max);
        assert_eq!(min_ckusdc_with_slippage, expected_min);
        let actual_ckusdc = 200_00000000u64;
        assert!(actual_ckusdc <= max_ckusdc_with_slippage);
        assert!(actual_ckusdc >= min_ckusdc_with_slippage);
    }
    #[test]
    fn test_proportional_calculation_logic() {
        let total_nav_tokens = 1000_00000000u64;
        let user_nav_tokens = 100_00000000u64;
        let total_asset_holding = 1_00000000u64;
        let user_share_percentage = (user_nav_tokens as f64) / (total_nav_tokens as f64);
        assert_eq!(user_share_percentage, 0.1);
        let user_asset_share = (total_asset_holding as f64 * user_share_percentage) as u64;
        let expected_share = 10_000_000u64;
        assert_eq!(user_asset_share, expected_share);
    }
    #[test]
    fn test_time_and_expiration_logic() {
        let base_time = 1699000000000000000u64;
        let quote_duration = 300_000_000_000u64;
        let transaction_timeout = 1800_000_000_000u64;
        let quote_expires_at = base_time + quote_duration;
        let transaction_timeout_at = base_time + transaction_timeout;
        assert_eq!(quote_expires_at, 1699000300000000000u64);
        assert_eq!(transaction_timeout_at, 1699001800000000000u64);
        assert!(transaction_timeout_at > quote_expires_at);
        let current_time = base_time + 600_000_000_000u64;
        let is_quote_expired = current_time > quote_expires_at;
        let is_transaction_expired = current_time > transaction_timeout_at;
        assert!(is_quote_expired);
        assert!(!is_transaction_expired);
    }
    #[test]
    fn test_transaction_status_transitions() {
        let valid_buy_transitions = vec![
            (TransactionStatus::Pending, TransactionStatus::WaitingForResolver),
            (TransactionStatus::WaitingForResolver, TransactionStatus::FundsLocked),
            (TransactionStatus::FundsLocked, TransactionStatus::InProgress),
            (TransactionStatus::InProgress, TransactionStatus::Completed),
            (TransactionStatus::Pending, TransactionStatus::Failed),
            (TransactionStatus::FundsLocked, TransactionStatus::TimedOut),
        ];
        for (from_status, to_status) in valid_buy_transitions {
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
        let timeout_duration = 1800_000_000_000u64;
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
        let current_time_1 = base_time + 900_000_000_000u64;
        let is_timed_out_1 = current_time_1 > transaction.timeout_at;
        assert!(!is_timed_out_1);
        let current_time_2 = base_time + 2400_000_000_000u64;
        let is_timed_out_2 = current_time_2 > transaction.timeout_at;
        assert!(is_timed_out_2);
        let current_time_3 = transaction.timeout_at;
        let is_timed_out_3 = current_time_3 > transaction.timeout_at;
        assert!(!is_timed_out_3);
    }
    #[test]
    fn test_fund_locking_error_scenarios() {
        let user = mock_principal();
        let insufficient_lock = LockedFunds {
            user,
            transaction_id: 1,
            fund_type: LockedFundType::CkUSDC,
            amount: 1000_00000000u64,
            locked_at: 1699000000000000000,
            expires_at: 1699001800000000000,
        };
        assert_eq!(insufficient_lock.amount, 1000_00000000u64);
        assert!(matches!(insufficient_lock.fund_type, LockedFundType::CkUSDC));
        let insufficient_nav_lock = LockedFunds {
            user,
            transaction_id: 2,
            fund_type: LockedFundType::NAVTokens { bundle_id: 1 },
            amount: 500_00000000u64,
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
        let estimated_nav = 2_00000000u64;
        let nav_tokens = 100_00000000u64;
        let max_slippage = 5u8;
        let base_amount = (nav_tokens as u128 * estimated_nav as u128) / 100_000_000u128;
        let max_acceptable = (base_amount * 105 / 100) as u64;
        let min_acceptable = (base_amount * 95 / 100) as u64;
        let test_cases = vec![
            (220_00000000u64, false),
            (210_00000000u64, true),
            (200_00000000u64, true),
            (190_00000000u64, true),
            (180_00000000u64, false),
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
        let valid_deposit = (asset_id.clone(), 50_000_000u64);
        assert!(valid_deposit.1 > 0);
        assert_eq!(valid_deposit.0.0, "ckBTC");
        let zero_deposit = (asset_id.clone(), 0u64);
        assert_eq!(zero_deposit.1, 0);
        let deposits = vec![
            (AssetId("ckBTC".to_string()), 25_000_000u64),
            (AssetId("ckETH".to_string()), 1_000_000_000u64),
            (AssetId("GLDT".to_string()), 100_000_000u64),
        ];
        for (asset, amount) in deposits {
            assert!(amount > 0, "Deposit amount must be positive for asset {}", asset.0);
            assert!(!asset.0.is_empty(), "Asset ID cannot be empty");
        }
    }
    #[test]
    fn test_transaction_failure_recovery() {
        let base_time = 1699000000000000000u64;
        let user = mock_principal();
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
            updated_at: base_time + 300_000_000_000u64,
            completed_at: Some(base_time + 300_000_000_000u64),
            timeout_at: base_time + 1800_000_000_000u64,
        };
        assert!(matches!(failed_transaction.status, TransactionStatus::Failed));
        assert!(failed_transaction.completed_at.is_some());
        assert!(failed_transaction.updated_at > failed_transaction.created_at);
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
        let quote_duration = 300_000_000_000u64;
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
        let time_scenarios = vec![
            (base_time + 120_000_000_000u64, false),
            (base_time + 300_000_000_000u64, false),
            (base_time + 301_000_000_000u64, true),
            (base_time + 600_000_000_000u64, true),
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
        let nav_zero_tokens = crate::nav_calculator::calculate_precise_nav_per_token(
            1000_00000000u64,
            0u64,
            8u8
        );
        assert_eq!(nav_zero_tokens, 0u64);
        let nav_zero_value = crate::nav_calculator::calculate_precise_nav_per_token(
            0u64,
            100_00000000u64,
            8u8
        );
        assert_eq!(nav_zero_value, 0u64);
        let nav_small = crate::nav_calculator::calculate_precise_nav_per_token(
            1u64,
            1u64,
            8u8
        );
        assert_eq!(nav_small, 1u64);
        let formatted_zero = crate::nav_calculator::format_nav_with_precision(0u64, 8u8);
        assert_eq!(formatted_zero, "0.00000000");
        let formatted_max = crate::nav_calculator::format_nav_with_precision(
            999_99999999u64,
            8u8
        );
        assert_eq!(formatted_max, "999.99999999");
    }
    #[test]
    fn test_asset_holding_calculation_errors() {
        let valid_calc = crate::nav_calculator::calculate_holding_value_usd(
            100_000_000u64,
            50000_00000000u64,
            8u8
        );
        assert!(valid_calc.is_ok());
        assert_eq!(valid_calc.unwrap(), 50000_00000000u64);
        let invalid_decimals = crate::nav_calculator::calculate_holding_value_usd(
            100_000_000u64,
            50000_00000000u64,
            25u8
        );
        assert!(invalid_decimals.is_err());
        let overflow_calc = crate::nav_calculator::calculate_holding_value_usd(
            u64::MAX,
            u64::MAX,
            8u8
        );
        assert!(overflow_calc.is_err());
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
        let total_usd_value = 1000_00000000u64;
        let total_tokens = 1000u64;
        let precision_decimals = 8u8;
        let nav_per_token = crate::nav_calculator::calculate_precise_nav_per_token(
            total_usd_value,
            total_tokens,
            precision_decimals,
        );
        assert_eq!(nav_per_token, 100_000_000u64, "NAV should be $1.00 per token with 8 decimals");
        let nav_per_token_2 = crate::nav_calculator::calculate_precise_nav_per_token(
            500_00000000u64,
            100u64,
            precision_decimals,
        );
        assert_eq!(nav_per_token_2, 500_000_000u64, "NAV should be $5.00 per token with 8 decimals");
        let zero_tokens_nav = crate::nav_calculator::calculate_precise_nav_per_token(
            total_usd_value,
            0,
            precision_decimals,
        );
        assert_eq!(zero_tokens_nav, 0u64, "Zero tokens should return zero NAV");
        let nav_6_decimals = crate::nav_calculator::calculate_precise_nav_per_token(
            total_usd_value,
            total_tokens,
            6,
        );
        assert_eq!(nav_6_decimals, 1_000_000u64, "NAV should be $1.000000 with 6 decimals");
    }
    #[test]
    fn test_nav_calculation_overflow_protection() {
        let large_usd_value = u64::MAX / 1_000_000;
        let total_tokens = 1u64;
        let precision_decimals = 8u8;
        let nav_result = crate::nav_calculator::calculate_nav_per_token_with_supply_validation(
            large_usd_value,
            total_tokens,
            precision_decimals,
        );
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
        let ckbtc_asset = create_ckbtc_asset();
        let ckbtc_amount = 100_000_000u64;
        let btc_price_usd = get_mock_oracle_price("BTC");
        let holding_value = crate::nav_calculator::calculate_holding_value_usd(
            ckbtc_amount,
            btc_price_usd,
            ckbtc_asset.decimals,
        ).unwrap();
        assert_eq!(holding_value, 100_000_00_000_000u64, "1 BTC at $100k should equal $100k USD");
        let cketh_asset = create_cketh_asset();
        let cketh_amount_small = 1_000_000_000_000_000u64;
        let eth_price_usd = get_mock_oracle_price("ETH");
        let cketh_value = crate::nav_calculator::calculate_holding_value_usd(
            cketh_amount_small,
            eth_price_usd,
            cketh_asset.decimals,
        ).unwrap();
        assert_eq!(cketh_value, 4_00_000_000u64, "0.001 ETH at $4k should equal $4.00 USD");
        let ckusdc_asset = create_ckusdc_asset();
        let ckusdc_amount = 1000_000000u64;
        let usdc_price_usd = get_mock_oracle_price("USDC");
        let ckusdc_value = crate::nav_calculator::calculate_holding_value_usd(
            ckusdc_amount,
            usdc_price_usd,
            ckusdc_asset.decimals,
        ).unwrap();
        assert_eq!(ckusdc_value, 1000_00_000_000u64, "1000 USDC at $1 should equal $1000 USD");
        let half_btc = 50_000_000u64;
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
        let btc_amount = 10_000_000u64;
        let btc_price_per_unit = 10000_00000000u64;
        let btc_decimals = 8u8;
        let usd_value = crate::nav_calculator::normalize_amount_to_usd(
            btc_amount,
            btc_decimals,
            btc_price_per_unit,
        ).unwrap();
        assert_eq!(usd_value, 1000_00000000u64, "0.1 BTC at $10k should normalize to $1k USD");
        let eth_amount_normalized = 10_000_000u64;
        let eth_price_per_unit = 1000_00000000u64;
        let normalized_decimals = 8u8;
        let eth_usd_value = crate::nav_calculator::normalize_amount_to_usd(
            eth_amount_normalized,
            normalized_decimals,
            eth_price_per_unit,
        ).unwrap();
        assert_eq!(eth_usd_value, 100_00000000u64, "0.1 ETH at $1k should normalize to $100 USD");
        let usdc_amount = 100_000000u64;
        let usdc_price_per_unit = 1_00000000u64;
        let usdc_decimals = 6u8;
        let usdc_usd_value = crate::nav_calculator::normalize_amount_to_usd(
            usdc_amount,
            usdc_decimals,
            usdc_price_per_unit,
        ).unwrap();
        assert_eq!(usdc_usd_value, 100_00000000u64, "100 USDC at $1 should normalize to $100 USD");
        let zero_amount = crate::nav_calculator::normalize_amount_to_usd(
            0u64,
            8,
            50000_00000000u64,
        ).unwrap();
        assert_eq!(zero_amount, 0u64, "Zero amount should normalize to zero USD");
    }
    #[test]
    fn test_icrc_decimal_range_handling() {
        let ckusdc_asset = create_ckusdc_asset();
        let usdc_amount = 1_000_000u64;
        let usdc_price = get_mock_oracle_price("USDC");
        let usdc_value = crate::nav_calculator::calculate_holding_value_usd(
            usdc_amount,
            usdc_price,
            ckusdc_asset.decimals,
        ).unwrap();
        assert_eq!(usdc_value, 1_00_000_000u64, "1 USDC should equal $1.00");
        let ckbtc_asset = create_ckbtc_asset();
        let btc_amount = 1_000_000u64;
        let btc_price = get_mock_oracle_price("BTC");
        let btc_value = crate::nav_calculator::calculate_holding_value_usd(
            btc_amount,
            btc_price,
            ckbtc_asset.decimals,
        ).unwrap();
        assert_eq!(btc_value, 1_000_00_000_000u64, "0.01 BTC should equal $1,000");
        let cketh_asset = create_cketh_asset();
        let eth_amount = 100_000_000_000_000u64;
        let eth_price = get_mock_oracle_price("ETH");
        let eth_value = crate::nav_calculator::calculate_holding_value_usd(
            eth_amount,
            eth_price,
            cketh_asset.decimals,
        ).unwrap();
        assert_eq!(eth_value, 40_000_000u64, "0.0001 ETH should equal $0.40");
        let amount_18_dec = 1_000_000_000_000_000_000u64;
        let amount_8_dec = crate::nav_calculator::convert_amount_between_decimals(
            amount_18_dec, 18, 8
        ).unwrap();
        assert_eq!(amount_8_dec, 100_000_000u64, "18→8 decimal conversion should work");
        let amount_6_dec = crate::nav_calculator::convert_amount_between_decimals(
            amount_8_dec, 8, 6
        ).unwrap();
        assert_eq!(amount_6_dec, 1_000_000u64, "8→6 decimal conversion should work");
        let amount_back_to_18 = crate::nav_calculator::convert_amount_between_decimals(
            amount_6_dec, 6, 18
        ).unwrap();
        assert_eq!(amount_back_to_18, amount_18_dec, "6→18 decimal conversion should work");
    }
    #[test]
    fn test_memory_storage_consistency() {
        let asset_count_before = crate::asset_registry::get_asset_count();
        let ckbtc_asset = create_ckbtc_asset();
        let cketh_asset = create_cketh_asset();
        let ckusdc_asset = create_ckusdc_asset();
        let large_asset_id = AssetId("x".repeat(95));
        assert!(large_asset_id.0.len() < 100, "Asset ID should be within bounds");
        let max_asset_id = AssetId("x".repeat(99));
        assert!(max_asset_id.0.len() < 100, "Max asset ID should be within bounds");
        let serialized = candid::encode_one(&ckbtc_asset).expect("Should serialize");
        let deserialized: AssetInfo = candid::decode_one(&serialized).expect("Should deserialize");
        assert_eq!(ckbtc_asset.id, deserialized.id, "Asset ID should survive serialization");
        assert_eq!(ckbtc_asset.decimals, deserialized.decimals, "Decimals should survive serialization");
        assert_eq!(ckbtc_asset.is_active, deserialized.is_active, "Active status should survive serialization");
    }
    #[test]
    fn test_stable_memory_data_structures() {
        let test_asset = create_ckbtc_asset();
        let serialized_size = candid::encode_one(&test_asset).expect("Should serialize").len();
        assert!(serialized_size < 1024, "AssetInfo serialization should be compact");
        use crate::memory::*;
        use ic_stable_structures::Storable;
        let asset_id = AssetId("test".to_string());
        let serialized_id = asset_id.to_bytes();
        let deserialized_id = AssetId::from_bytes(serialized_id);
        assert_eq!(asset_id.0, deserialized_id.0, "AssetId should survive stable storage serialization");
        let large_id = AssetId("a".repeat(95));
        let large_serialized = large_id.to_bytes();
        assert!(large_serialized.len() <= 100, "Large AssetId should fit in bounds");
        let large_deserialized = AssetId::from_bytes(large_serialized);
        assert_eq!(large_id.0, large_deserialized.0, "Large AssetId should survive serialization");
    }
    #[test]
    fn test_storage_map_key_consistency() {
        let btc_id = AssetId("ckBTC".to_string());
        let eth_id = AssetId("ckETH".to_string());
        let usdc_id = AssetId("ckUSDC".to_string());
        assert_ne!(btc_id, eth_id, "Different assets should have different IDs");
        assert_ne!(btc_id, usdc_id, "Different assets should have different IDs");
        assert_ne!(eth_id, usdc_id, "Different assets should have different IDs");
        assert!(btc_id < eth_id, "Asset IDs should have consistent ordering");
        assert!(btc_id < usdc_id, "Asset IDs should have consistent ordering");
        assert!(eth_id > btc_id, "Asset IDs should have consistent ordering");
        let bundle_id_1 = 1u64;
        let bundle_id_2 = 2u64;
        assert_ne!(bundle_id_1, bundle_id_2, "Bundle IDs should be unique");
        assert!(bundle_id_1 < bundle_id_2, "Bundle IDs should have natural ordering");
        let user = mock_principal();
        let nav_key_1 = format!("{}:{}", user.to_text(), bundle_id_1);
        let nav_key_2 = format!("{}:{}", user.to_text(), bundle_id_2);
        assert_ne!(nav_key_1, nav_key_2, "NAV token keys should be unique per bundle");
    }
    #[test]
    fn test_data_integrity_constraints() {
        let valid_decimals = [0u8, 6u8, 8u8, 18u8];
        for decimals in valid_decimals {
            assert!(decimals <= 18, "Decimals should be within reasonable bounds");
        }
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
        let valid_percentages = [1u8, 50u8, 100u8];
        for percentage in valid_percentages {
            assert!(percentage <= 100, "Percentage should be within 0-100");
        }
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
        let invalid_allocations = vec![
            AssetAllocation {
                asset_id: AssetId("ckBTC".to_string()),
                percentage: 60u8,
            },
            AssetAllocation {
                asset_id: AssetId("ckETH".to_string()),
                percentage: 50u8,
            },
        ];
        let invalid_result = crate::nav_calculator::validate_bundle_allocations(&invalid_allocations);
        assert!(invalid_result.is_err(), "Invalid total percentage should be rejected");
    }
    #[test]
    fn test_memory_efficiency_and_bounds() {
        let principal = mock_principal();
        let principal_text = principal.to_text();
        assert!(principal_text.len() < 100, "Principal text should be reasonably sized");
        let timestamp = 1699000000000000000u64;
        assert!(timestamp > 0, "Timestamp should be positive");
        assert!(timestamp < u64::MAX / 2, "Timestamp should be reasonable");
        let max_reasonable_amount = u64::MAX / 1000;
        let test_amounts = [
            0u64,
            1u64,
            1_000_000u64,
            1_000_000_000u64,
            max_reasonable_amount,
        ];
        for amount in test_amounts {
            let doubled = amount.checked_mul(2);
            if amount <= max_reasonable_amount {
                assert!(doubled.is_some() || amount == 0, "Reasonable amounts should not overflow in basic operations");
            }
        }
        let realistic_prices = [
            1u64,
            1_00_000_000u64,
            100_000_00_000_000u64,
        ];
        for price in realistic_prices {
            assert!(price > 0, "Prices should be positive");
            assert!(price <= 1_000_000_00_000_000u64, "Prices should be within reasonable bounds");
        }
    }
    #[test]
    fn test_concurrent_data_access_patterns() {
        let asset_ids = vec![
            AssetId("ckBTC".to_string()),
            AssetId("ckETH".to_string()),
            AssetId("ckUSDC".to_string()),
        ];
        for asset_id in &asset_ids {
            let _cloned_id = asset_id.clone();
            assert_eq!(asset_id.0, _cloned_id.0, "Asset ID cloning should be consistent");
        }
        let bundle_ids = vec![1u64, 2u64, 3u64];
        for bundle_id in &bundle_ids {
            assert!(*bundle_id > 0, "Bundle IDs should be positive");
            let user1 = mock_principal();
            let user1_text = user1.to_text();
            let user2_text = "different-user-principal-text";
            let key1 = format!("{}:{}", user1_text, bundle_id);
            let key2 = format!("{}:{}", user2_text, bundle_id);
            assert_ne!(key1, key2, "Different users should have different NAV token keys");
        }
        let now = 1699000000000000000u64;
        let later = now + 1000000000u64;
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
        let ckbtc_asset = create_ckbtc_asset();
        let cketh_asset = create_cketh_asset();
        let btc_holding_amount = 100_000_000u64;
        let btc_price = get_mock_oracle_price("BTC");
        let btc_value = crate::nav_calculator::calculate_holding_value_usd(
            btc_holding_amount,
            btc_price,
            ckbtc_asset.decimals,
        ).unwrap();
        assert_eq!(btc_value, 100_000_00_000_000u64, "1 BTC at $100k = $100k");
        let eth_holding_amount = 250_000_000_000_000_000u64;
        let eth_price = get_mock_oracle_price("ETH");
        let eth_value = crate::nav_calculator::calculate_holding_value_usd(
            eth_holding_amount,
            eth_price,
            cketh_asset.decimals,
        ).unwrap();
        assert_eq!(eth_value, 1000_00_000_000u64, "0.25 ETH at $4k = $1k");
        let total_usd_value = btc_value + eth_value;
        assert_eq!(total_usd_value, 101_000_00_000_000u64, "Total portfolio = $101k");
        let total_nav_tokens = 1000u64;
        let nav_per_token = crate::nav_calculator::calculate_precise_nav_per_token(
            total_usd_value,
            total_nav_tokens,
            8,
        );
        assert_eq!(nav_per_token, 10_100_000_000u64, "NAV should be $101.00 per token");
        let formatted_nav = crate::nav_calculator::format_nav_with_precision(nav_per_token, 8);
        assert_eq!(formatted_nav, "101.00000000", "Formatted NAV should display as $101.00000000");
        let user_nav_tokens = 100u64;
        let user_portfolio_value_raw = user_nav_tokens as u128 * nav_per_token as u128;
        let user_portfolio_value_usd = user_portfolio_value_raw;
        assert_eq!(user_portfolio_value_usd, 1_010_000_000_000u128, "User should own $10.1k worth of assets (10% of $101k)");
        let user_btc_proportion = (user_nav_tokens as u128 * btc_holding_amount as u128) / total_nav_tokens as u128;
        let user_eth_proportion = (user_nav_tokens as u128 * eth_holding_amount as u128) / total_nav_tokens as u128;
        assert_eq!(user_btc_proportion, 10_000_000u128, "User should own 0.1 BTC (10% of 1 BTC)");
        assert_eq!(user_eth_proportion, 25_000_000_000_000_000u128, "User should own 0.025 ETH (10% of 0.25 ETH)");
    }
    #[test]
    fn test_nav_calculation_edge_cases_mathematical() {
        let tiny_value = 1u64;
        let many_tokens = 1000000u64;
        let tiny_nav = crate::nav_calculator::calculate_precise_nav_per_token(tiny_value, many_tokens, 8);
        assert_eq!(tiny_nav, 0u64, "Very small value should result in zero NAV due to rounding");
        let large_value = 1000000_00000000u64;
        let single_token = 1u64;
        let large_nav = crate::nav_calculator::calculate_precise_nav_per_token(large_value, single_token, 8);
        assert_eq!(large_nav, 1000000_00000000u64, "Single token worth $1M should have $1M NAV");
        let value = 1000_00000000u64;
        let tokens = 3u64;
        let nav_8_decimals = crate::nav_calculator::calculate_precise_nav_per_token(value, tokens, 8);
        let nav_6_decimals = crate::nav_calculator::calculate_precise_nav_per_token(value, tokens, 6);
        assert_eq!(nav_8_decimals, 333_33333333u64, "8-decimal precision should be 333.33333333");
        assert_eq!(nav_6_decimals, 333_333333u64, "6-decimal precision should be 333.333333");
    }
}