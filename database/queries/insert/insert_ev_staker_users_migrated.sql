INSERT INTO gro."EV_STAKER_USERS_MIGRATED" (
        "transaction_id",
        "log_index",
        "contract_address",
        "block_timestamp",
        "log_name",
        "account",
        "pids"
    )
VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7
    ) ON CONFLICT ON CONSTRAINT "EV_STAKER_USERS_MIGRATED_pkey" DO NOTHING;