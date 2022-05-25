INSERT INTO gro."EV_HODLER_CLAIMS" (
        "transaction_id",
        "log_index",
        "contract_address",
        "block_timestamp",
        "log_name",
        "user",
        "vest",
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
    ) ON CONFLICT ON CONSTRAINT "EV_HODLER_CLAIMS_pkey" DO NOTHING;