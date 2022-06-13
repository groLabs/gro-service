INSERT INTO gro."EV_STAKER_ADD_POOL" (
        "transaction_id",
        "log_index",
        "contract_address",
        "block_timestamp",
        "log_name",
        "pid",
        "alloc_point",
        "lp_token"
    )
VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7,
        $8
    ) ON CONFLICT ON CONSTRAINT "EV_STAKER_ADD_POOL_pkey" DO NOTHING;