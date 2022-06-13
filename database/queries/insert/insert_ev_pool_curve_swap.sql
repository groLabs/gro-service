INSERT INTO gro."EV_POOL_META_SWAP" (
        "transaction_id",
        "log_index",
        "contract_address",
        "block_timestamp",
        "log_name",
        "buyer",
        "sold_id",
        "tokens_sold",
        "bought_id",
        "tokens_bought",
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
        $11
    ) ON CONFLICT ON CONSTRAINT "EV_POOL_META_SWAP_pkey" DO NOTHING;