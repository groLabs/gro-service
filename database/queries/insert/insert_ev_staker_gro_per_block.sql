INSERT INTO gro."EV_STAKER_GRO_PER_BLOCK" (
        "transaction_id",
        "log_index",
        "contract_address",
        "block_timestamp",
        "log_name",
        "new_gro"
    )
VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6
    ) ON CONFLICT ON CONSTRAINT "EV_STAKER_GRO_PER_BLOCK_pkey" DO NOTHING;