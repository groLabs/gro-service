SELECT "log_index",
    "transaction_id",
    "contract_address",
    "log_name",
    "from",
    "to",
    "token_id",
    "value",
    "creation_date"
FROM gro."EV_TRANSFERS"
WHERE "from" = $1