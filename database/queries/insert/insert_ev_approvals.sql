INSERT INTO gro."EV_APPROVALS" (
        "log_index",
        "transaction_id",
        "contract_address",
        "log_name",
        "owner",
        "spender",
        "value",
        "token_id"
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
    ) ON CONFLICT ON CONSTRAINT "EV_APPROVALS_pkey" DO NOTHING;