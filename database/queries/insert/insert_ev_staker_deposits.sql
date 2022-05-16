INSERT INTO gro."EV_STAKER_DEPOSITS" (
        "transaction_id",
        "log_index",
        "contract_address",
        "block_timestamp",
        "log_name",
        "user",
        "pid",
        "amount"
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
    ) ON CONFLICT ON CONSTRAINT "EV_STAKER_DEPOSITS_pkey" DO NOTHING;