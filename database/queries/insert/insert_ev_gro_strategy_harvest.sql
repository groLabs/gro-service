INSERT INTO gro."EV_GRO_STRATEGY_HARVEST" (
        "transaction_id",
        "log_index",
        "contract_address",
        "block_timestamp",
        "log_name",
        "profit",
        "loss",
        "debt_payment",
        "debt_outstanding"
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
        $9
    ) ON CONFLICT ON CONSTRAINT "EV_GRO_STRATEGY_HARVEST_pkey" DO NOTHING;