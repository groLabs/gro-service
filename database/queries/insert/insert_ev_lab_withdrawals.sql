INSERT INTO gro."EV_LAB_WITHDRAWALS" (
        "transaction_id",
        "log_index",
        "contract_address",
        "block_timestamp",
        "log_name",
        "token_id",
        "from",
        "value",
        "shares",
        "total_loss",
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
        $10,
        $11
    ) ON CONFLICT ON CONSTRAINT "EV_LAB_WITHDRAWALS_pkey" DO NOTHING;