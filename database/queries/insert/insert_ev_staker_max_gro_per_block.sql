INSERT INTO gro."EV_STAKER_MAX_GRO_PER_BLOCK" (
        "transaction_id",
        "log_index",
        "contract_address",
        "block_timestamp",
        "log_name",
        "max_gro_per_block"
    )
VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6
    ) ON CONFLICT ON CONSTRAINT "EV_STAKER_MAX_GRO_PER_BLOCK_pkey" DO NOTHING;