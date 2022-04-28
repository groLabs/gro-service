INSERT INTO gro."EV_LAB_NEW_RELEASE_FACTOR" (
        "transaction_id",
        "log_index",
        "contract_address",
        "block_timestamp",
        "log_name",
        "factor"
    )
VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6
    ) ON CONFLICT ON CONSTRAINT "EV_LAB_NEW_RELEASE_FACTOR_pkey" DO NOTHING;