INSERT INTO gro."EV_POOL_UNI_LIQUIDITY" (
        "transaction_id",
        "log_index",
        "contract_address",
        "block_timestamp",
        "log_name",
        "sender",
        "amount0",
        "amount1",
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
        $9
    ) ON CONFLICT ON CONSTRAINT "EV_POOL_UNI_LIQUIDITY_pkey" DO NOTHING;