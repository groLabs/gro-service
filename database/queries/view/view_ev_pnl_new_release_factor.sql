CREATE VIEW gro."V_EV_PNL_NEW_RELEASE_FACTOR" AS
SELECT rf."log_index" AS "log_index",
    rf."transaction_id" AS "transaction_id",
    tx."tx_hash" AS "transaction_hash",
    rf."contract_address" AS "contract_address",
    rf."log_name" AS "log_name",
    tx."network_id" AS "network_id",
    tx."block_number" AS "block_number",
    tx."block_timestamp" AS "block_timestamp",
    tx."block_date" AS "block_date",
    coalesce(rf."factor", 0) AS "factor"
FROM gro."EV_PNL_NEW_RELEASE_FACTOR" rf
    LEFT JOIN gro."EV_TRANSACTIONS" tx ON rf."transaction_id" = tx."transaction_id"
    AND tx."uncled" = false;