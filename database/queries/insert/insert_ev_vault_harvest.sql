INSERT INTO gro."EV_LAB_VAULT_HARVEST" (
        "transaction_id",
        "log_index",
        "contract_address",
        "block_timestamp",
        "log_name",
        "loss",
        "change"
    )
VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7
    ) ON CONFLICT ON CONSTRAINT "EV_LAB_VAULT_HARVEST_pkey" DO NOTHING;