INSERT INTO gro."EV_MULTI_CLAIMS" (
        "log_index",
        "transaction_id",
        "contract_address",
        "log_name",
        "from",
        "pids",
        "vest",
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
        $8,
        $9
    ) ON CONFLICT ON CONSTRAINT "EV_MULTI_CLAIMS_pkey" DO NOTHING;