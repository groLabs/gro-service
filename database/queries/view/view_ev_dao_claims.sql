CREATE VIEW gro."V_EV_DAO_CLAIMS" AS
SELECT c."transaction_id" AS "transaction_id",
    c."log_index" AS "log_index",
    c."contract_address" AS "contract_address",
    c."log_name" AS "log_name",
    tx."tx_hash" AS "transaction_hash",
    tx."network_id" AS "network_id",
    tx."block_number" AS "block_number",
    tx."block_timestamp" AS "block_timestamp",
    tx."block_date" AS "block_date",
    c."token_id" AS "token_id",
    coalesce(tok."name", 'unknown') AS "token_name",
    c."user" AS "user",
    c."vest" AS "vest",
    c."pids" AS "pids",
    coalesce(c."amount", 0) AS "amount"
FROM gro."EV_DAO_CLAIMS" c
    LEFT JOIN gro."EV_TRANSACTIONS" tx ON c."transaction_id" = tx."transaction_id"
    AND tx."uncle_block" = false
    LEFT JOIN gro."MD_TOKENS" tok ON c."token_id" = tok."token_id";