INSERT INTO gro."EV_LAB_DROPS" (
        "transaction_id",
        "log_index",
        "contract_address",
        "block_timestamp",
        "log_name",
        "merkle_root"
    )
VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6
    ) ON CONFLICT ON CONSTRAINT "EV_LAB_DROPS_pkey" DO NOTHING;