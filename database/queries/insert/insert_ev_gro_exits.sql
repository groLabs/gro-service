INSERT INTO gro."EV_GRO_EXITS" (
        "transaction_id",
        "log_index",
        "contract_address",
        "block_timestamp",
        "log_name",
        "user",
        "total_locked_amount",
        "amount",
        "minting_amount",
        "penalty"
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
    ) ON CONFLICT ON CONSTRAINT "EV_GRO_EXITS_pkey" DO NOTHING;