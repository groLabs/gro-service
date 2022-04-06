SELECT "log_index",
    "transaction_id",
    "contract_address",
    "log_name",
    "from",
    "pids",
    "vest",
    "amounts",
    "creation_date"
FROM gro."EV_MULTI_CLAIMS"
WHERE "from" = $1