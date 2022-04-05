INSERT INTO gro."EV_WITHDRAWALS" (
        "log_index",
        "transaction_id",
        "contract_address",
        "log_name",
        "from",
        "pid",
        "amount1",
        "amount2",
        "amount3",
        "value",
        "referral",
        "balanced",
        "all",
        "deductUsd",
        "lpAmount",
        "allowance",
        "totalLoss",
        "token_id",
        "creation_date"
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
        $13,
        $14,
        $15,
        $16,
        $17,
        $18,
        $19
    ) ON CONFLICT ON CONSTRAINT "EV_WITHDRAWALS_pkey" DO NOTHING;