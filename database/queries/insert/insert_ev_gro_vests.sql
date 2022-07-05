INSERT INTO gro."EV_GRO_VESTS" (
        "transaction_id",
        "log_index",
        "contract_address",
        "block_timestamp",
        "log_name",
        "user",
        "total_locked_amount",
        "amount",
        "vesting_total",
        "vesting_start_time",
        "global_start_time"
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
        $11
    ) ON CONFLICT ON CONSTRAINT "EV_GRO_VESTS_pkey" DO NOTHING;