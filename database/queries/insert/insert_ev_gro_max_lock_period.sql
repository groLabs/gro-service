INSERT INTO gro."EV_GRO_MAX_LOCK_PERIOD" (
        "transaction_id",
        "log_index",
        "contract_address",
        "block_timestamp",
        "log_name",
        "new_max_period"
    )
VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6
    ) ON CONFLICT ON CONSTRAINT "EV_GRO_MAX_LOCK_PERIOD_pkey" DO NOTHING;