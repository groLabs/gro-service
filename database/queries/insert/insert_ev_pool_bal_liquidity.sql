INSERT INTO gro."EV_POOL_BAL_LIQUIDITY" (
        "transaction_id",
        "log_index",
        "contract_address",
        "block_timestamp",
        "log_name",
        "pool_id",
        "liquidity_provider",
        "tokens",
        "deltas",
        "protocol_fee_amounts"
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
    ) ON CONFLICT ON CONSTRAINT "EV_POOL_BAL_LIQUIDITY_pkey" DO NOTHING;