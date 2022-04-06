SELECT "log_index",
    "transaction_id",
    "contract_address",
    "log_name",
    "from",
    "pids",
    "amounts",
    "value",
    "token_id" "creation_date"
FROM gro."EV_MULTI_WITHDRAWALS"
WHERE "from" = $1