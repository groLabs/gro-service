INSERT INTO gro."EV_LAB_CLAIMS" (
        "transaction_id",
        "log_index",
        "contract_address",
        "block_timestamp",
        "log_name",
        "account",
        "vault",
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
    ) ON CONFLICT ON CONSTRAINT "EV_LAB_CLAIMS_pkey" DO NOTHING;