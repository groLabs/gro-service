INSERT INTO gro."EV_TRANSFERS" (
        "log_index",
        "transaction_id",
        "contract_address",
        "log_name",
        "from",
        "to",
        "token_id",
        "value"
    )
VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7,
        $8
    ) ON CONFLICT ON CONSTRAINT "EV_TRANSFERS_pkey" DO NOTHING;