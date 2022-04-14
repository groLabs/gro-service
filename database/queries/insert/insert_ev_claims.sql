INSERT INTO gro."EV_CLAIMS" (
        "log_index",
        "transaction_id",
        "contract_address",
        "log_name",
        "from",
        "token_id",
        "pids",
        "vest",
        "tranche_id",
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
        $8,
        $9,
        $10
    ) ON CONFLICT ON CONSTRAINT "EV_CLAIMS_pkey" DO NOTHING;