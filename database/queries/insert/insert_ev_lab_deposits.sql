INSERT INTO gro."EV_LAB_DEPOSITS" (
        "transaction_id",
        "log_index",
        "contract_address",
        "block_timestamp",
        "log_name",
        "token_id",
        "from",
        "amount",
        "shares",
        "allowance"
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
    ) ON CONFLICT ON CONSTRAINT "EV_LAB_DEPOSITS_pkey" DO NOTHING;