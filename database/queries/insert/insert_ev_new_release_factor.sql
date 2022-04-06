INSERT INTO gro."EV_PNL_NEW_RELEASE_FACTOR" (
        "log_index",
        "transaction_id",
        "contract_address",
        "log_name",
        "factor",
        "creation_date"
    )
VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6
    ) ON CONFLICT ON CONSTRAINT "EV_PNL_NEW_RELEASE_FACTOR_pkey" DO NOTHING;