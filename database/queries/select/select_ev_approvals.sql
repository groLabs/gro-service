SELECT "log_index",
    "transaction_id",
    "contract_address",
    "log_name",
    "owner",
    "spender",
    "value",
    "token_id",
    "creation_date"
FROM gro."EV_APPROVALS"
WHERE "owner" = $1