INSERT INTO gro."EV_GRO_PNL_EXECUTION" (
        "transaction_id",
        "log_index",
        "contract_address",
        "block_timestamp",
        "log_name",
        "deducted_assets",
        "total_pnl",
        "invest_pnl",
        "price_pnl",
        "withdrawal_bonus",
        "performance_bonus",
        "before_gvt_assets",
        "before_pwrd_assets",
        "after_gvt_assets",
        "after_pwrd_assets"
    )
VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7,
        $8,
        $9,
        $10,
        $11,
        $12,
        $13,
        $14,
        $15
    ) ON CONFLICT ON CONSTRAINT "EV_GRO_PNL_EXECUTION_pkey" DO NOTHING;