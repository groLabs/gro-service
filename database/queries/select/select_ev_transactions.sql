SELECT "transaction_id",
    "block_number",
    "block_timestamp",
    "block_date",
    "network_id",
    "tx_hash",
    "block_hash",
    "uncled",
    "creation_date"
FROM gro."EV_TRANSACTIONS"
WHERE "transaction_id" = $1