CREATE VIEW gro."V_EV_MULTI_WITHDRAWALS" AS
SELECT mw."log_index" AS "log_index",
    mw."transaction_id" AS "transaction_id",
    tx."tx_hash" AS "transaction_hash",
    mw."contract_address" AS "contract_address",
    mw."log_name" AS "log_name",
    tx."network_id" AS "network_id",
    tx."block_number" AS "block_number",
    tx."block_timestamp" AS "block_timestamp",
    tx."block_date" AS "block_date",
    coalesce(tx."uncled", false) AS "uncled",
    tok."token_id" AS "token_id",
    coalesce(tok."name", 'unknown') AS "token_name",
    mw."from" AS "from",
    mw."pids" AS "pids",
    mw."amounts" AS "amounts"
FROM gro."EV_MULTI_WITHDRAWALS" mw
    LEFT JOIN gro."EV_TRANSACTIONS" tx ON mw."transaction_id" = tx."transaction_id"
    AND tx."uncled" = false
    LEFT JOIN gro."MD_TOKENS" tok ON tok."token_id" = 3;