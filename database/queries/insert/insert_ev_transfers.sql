INSERT INTO gro."EV_TRANSFERS" (
        "transaction_id",
        "log_index",
        "contract_address",
        "block_timestamp",
        "log_name",
        "token_id",
        "from",
        "to",
        "value",
        "factor"
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
    ) ON CONFLICT ON CONSTRAINT "EV_TRANSFERS_pkey" DO NOTHING;