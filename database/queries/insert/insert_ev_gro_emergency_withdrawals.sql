INSERT INTO gro."EV_GRO_EMERGENCY_WITHDRAWALS" (
        "transaction_id",
        "log_index",
        "contract_address",
        "block_timestamp",
        "log_name",
        "pwrd",
        "account",
        "asset",
        "amount",
        "price"
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
    ) ON CONFLICT ON CONSTRAINT "EV_GRO_EMERGENCY_WITHDRAWALS_pkey" DO NOTHING;