--filter?
SELECT "log_index",
    "transaction_id",
    "contract_address",
    "log_name",
    "factor",
    "creation_date"
FROM gro."EV_PNL_NEW_RELEASE_FACTOR"
WHERE "transaction_id" = $1