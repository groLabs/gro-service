INSERT INTO gro."EV_APPROVALS" (
        "transaction_id",
        "log_index",
        "contract_address",
        "block_timestamp",
        "log_name",
        "token_id",
        "owner",
        "spender",
        "value"
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
    ) ON CONFLICT ON CONSTRAINT "EV_APPROVALS_pkey" DO NOTHING;