INSERT INTO gro."EV_VESTING_EXITS" (
        "transaction_id",
        "log_index",
        "contract_address",
        "block_timestamp",
        "log_name",
        "user",
        "total_locked_amount",
        "unlocked",
        "amount",
        "minting_amount",
        "penalty",
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
        $11,
        $12
    ) ON CONFLICT ON CONSTRAINT "EV_VESTING_EXITS_pkey" DO NOTHING;