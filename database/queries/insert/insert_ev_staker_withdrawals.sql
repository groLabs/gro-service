INSERT INTO gro."EV_STAKER_WITHDRAWALS" (
        "transaction_id",
        "log_index",
        "contract_address",
        "block_timestamp",
        "log_name",
        "user",
        "pids",
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
        $9
    ) ON CONFLICT ON CONSTRAINT "EV_STAKER_WITHDRAWALS_pkey" DO NOTHING;