CREATE VIEW gro."V_EV_LAB_WITHDRAWALS" AS
SELECT w."transaction_id" AS "transaction_id",
    w."log_index" AS "log_index",
    tx."tx_hash" AS "transaction_hash",
    w."contract_address" AS "contract_address",
    w."log_name" AS "log_name",
    tx."network_id" AS "network_id",
    tx."block_number" AS "block_number",
    tx."block_timestamp" AS "block_timestamp",
    tx."block_date" AS "block_date",
    w."token_id" AS "token_id",
    coalesce(tok."name", 'unknown') AS "token_name",
    w."from" AS "from",
    coalesce(w."value", 0) AS "value",
    coalesce(w."shares", 0) AS "shares",
    coalesce(w."total_loss", 0) AS "total_loss",
    coalesce(w."allowance", 0) AS "allowance"
    FROM gro."EV_LAB_WITHDRAWALS" w
    LEFT JOIN gro."EV_TRANSACTIONS" tx ON w."transaction_id" = tx."transaction_id"
    AND tx."uncle_block" = false
    LEFT JOIN gro."MD_TOKENS" tok ON w."token_id" = tok."token_id";