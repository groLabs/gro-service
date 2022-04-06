SELECT "log_index",
    "transaction_id",
    "contract_address",
    "log_name",
    "from",
    "pid",
    "vest",
    "tranche_id",
    "amount",
    "creation_date"
FROM gro."EV_CLAIMS"
WHERE "from" = $1