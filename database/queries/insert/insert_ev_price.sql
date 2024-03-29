INSERT INTO gro."EV_PRICE" (
        "transaction_id",
        "log_index",
        "contract_address",
        "block_timestamp",
        "log_name",
        "token1_id",
        "token2_id",
        "price",
        "round_id",
        "updated_at"
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
    ) ON CONFLICT ON CONSTRAINT "EV_PRICE_pkey" DO NOTHING;