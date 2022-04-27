CREATE VIEW gro."V_EV_LAB_NEW_RELEASE_FACTOR" AS
SELECT rf."transaction_id" AS "transaction_id",
    rf."log_index" AS "log_index",
    rf."contract_address" AS "contract_address",
    rf."log_name" AS "log_name",
    tx."tx_hash" AS "transaction_hash",
    tx."network_id" AS "network_id",
    tx."block_number" AS "block_number",
    tx."block_timestamp" AS "block_timestamp",
    tx."block_date" AS "block_date",
    coalesce(rf."factor", 0) AS "factor"
FROM gro."EV_LAB_NEW_RELEASE_FACTOR" rf
    LEFT JOIN gro."EV_TRANSACTIONS" tx ON rf."transaction_id" = tx."transaction_id"
    AND tx."uncle_block" = false;