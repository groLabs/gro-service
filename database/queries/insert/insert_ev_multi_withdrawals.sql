INSERT INTO gro."EV_MULTI_WITHDRAWALS" (
        "log_index",
        "transaction_id",
        "contract_address",
        "log_name",
        "from",
        "pids",
        "amounts",
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
        $8
    ) ON CONFLICT ON CONSTRAINT "EV_MULTI_WITHDRAWALS_pkey" DO NOTHING;