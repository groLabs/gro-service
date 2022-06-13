INSERT INTO gro."EV_POOL_META_LIQUIDITY" (
        "transaction_id",
        "log_index",
        "contract_address",
        "block_timestamp",
        "log_name",
        "provider",
        "token_amounts",
        "fees",
        "coin_amount",
        "invariant",
        "token_supply",
        "virtual_price"
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
    ) ON CONFLICT ON CONSTRAINT "EV_POOL_META_LIQUIDITY_pkey" DO NOTHING;