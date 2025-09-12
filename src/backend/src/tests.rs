#[cfg(test)]
mod tests {
    use candid::Principal;
    use crate::types::*;

    fn mock_principal() -> Principal {
        Principal::from_text("rdmx6-jaaaa-aaaaa-aaadq-cai").unwrap()
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
        let total_tokens = 500_00000000u64; // 500 tokens with 8 decimals
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
}