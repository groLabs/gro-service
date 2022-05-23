INSERT INTO gro."EV_AIRDROP_CLAIMS" (
        "transaction_id",
        "log_index",
        "contract_address",
        "block_timestamp",
        "log_name",
        "account",
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
        $9
    ) ON CONFLICT ON CONSTRAINT "EV_AIRDROP_CLAIMS_pkey" DO NOTHING;