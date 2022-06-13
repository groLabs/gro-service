INSERT INTO gro."EV_POOL_UNI_SWAP" (
        "transaction_id",
        "log_index",
        "contract_address",
        "block_timestamp",
        "log_name",
        "sender",
        "amount0_in",
        "amount1_in",
        "amount0_out",
        "amount1_out",
        "to"
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
    ) ON CONFLICT ON CONSTRAINT "EV_POOL_UNI_SWAP_pkey" DO NOTHING;