INSERT INTO gro."EV_TRANSACTIONS" (
        "transaction_id",
        "block_number",
        "block_timestamp",
        "block_date",
        "network_id",
        "tx_hash",
        "block_hash",
        "uncled"
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
    ) ON CONFLICT ON CONSTRAINT "EV_TRANSACTIONS_pkey" DO NOTHING;