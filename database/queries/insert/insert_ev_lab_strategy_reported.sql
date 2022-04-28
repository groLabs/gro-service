INSERT INTO gro."EV_LAB_STRATEGY_REPORTED" (
        "transaction_id",
        "log_index",
        "contract_address",
        "block_timestamp",
        "log_name",
        "strategy",
        "gain",
        "loss",
        "debt_paid",
        "total_gain",
        "total_loss",
        "total_debt",
        "debt_added",
        "debt_ratio",
        "locked_profit",
        "total_assets"
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
        $15,
        $16
    ) ON CONFLICT ON CONSTRAINT "EV_LAB_STRATEGY_REPORTED_pkey" DO NOTHING;