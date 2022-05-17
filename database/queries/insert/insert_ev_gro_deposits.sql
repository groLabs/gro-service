INSERT INTO gro."EV_GRO_DEPOSITS" (
        "transaction_id",
        "log_index",
        "contract_address",
        "block_timestamp",
        "log_name",
        "token_id",
        "user",
        "referral",
        "usd_amount",
        "amount1",
        "amount2",
        "amount3"
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
    ) ON CONFLICT ON CONSTRAINT "EV_GRO_DEPOSITS_pkey" DO NOTHING;