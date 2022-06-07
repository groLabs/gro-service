INSERT INTO gro."EV_GRO_STRATEGY_UPDATE_RATIO" (
        "transaction_id",
        "log_index",
        "contract_address",
        "block_timestamp",
        "log_name",
        "strategy",
        "debt_ratio"
    )
VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7
    ) ON CONFLICT ON CONSTRAINT "EV_GRO_STRATEGY_UPDATE_RATIO_pkey" DO NOTHING;