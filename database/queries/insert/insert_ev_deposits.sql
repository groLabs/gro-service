INSERT INTO gro."EV_DEPOSITS" (
        "log_index",
        "transaction_id",
        "contract_address",
        "log_name",
        "from",
        "referral",
        "pid",
        "token_id",
        "allowance",
        "amount1",
        "amount2",
        "amount3",
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
        $8,
        $9,
        $10,
        $11,
        $12,
        $13
    ) ON CONFLICT ON CONSTRAINT "EV_DEPOSITS_pkey" DO NOTHING;