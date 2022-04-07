SELECT "log_index",
    "transaction_id",
    "contract_address",
    "log_name",
    "from",
    "pids",
    "amounts",
    "creation_date"
FROM gro."EV_MULTI_WITHDRAWALS"
WHERE "from" = $1