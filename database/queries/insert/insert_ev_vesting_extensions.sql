INSERT INTO gro."EV_VESTING_EXTENSIONS" (
        "transaction_id",
        "log_index",
        "contract_address",
        "block_timestamp",
        "log_name",
        "user",
        "new_period",
        "total",
        "start_time",
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
        $10
    ) ON CONFLICT ON CONSTRAINT "EV_VESTING_EXTENSIONS_pkey" DO NOTHING;