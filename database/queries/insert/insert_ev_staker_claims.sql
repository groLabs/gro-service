INSERT INTO gro."EV_STAKER_CLAIMS" (
        "transaction_id",
        "log_index",
        "contract_address",
        "block_timestamp",
        "log_name",
        "user",
        "vest",
        "pids",
        "amount",
        "amounts",
        "reward_debts"
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
    ) ON CONFLICT ON CONSTRAINT "EV_STAKER_CLAIMS_pkey" DO NOTHING;