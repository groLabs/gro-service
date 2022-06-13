INSERT INTO gro."EV_POOL_BAL_SWAP" (
        "transaction_id",
        "log_index",
        "contract_address",
        "block_timestamp",
        "log_name",
        "pool_id",
        "token_in",
        "token_out",
        "amount_in",
        "amount_out"
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
    ) ON CONFLICT ON CONSTRAINT "EV_POOL_BAL_SWAP_pkey" DO NOTHING;