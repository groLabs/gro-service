CREATE VIEW gro."V_EV_CLAIMS" AS
SELECT c."log_index" AS "log_index",
    c."transaction_id" AS "transaction_id",
    c."contract_address" AS "contract_address",
    c."log_name" AS "log_name",
    tx."network_id" AS "network_id",
    tx."block_number" AS "block_number",
    tx."block_timestamp" AS "block_timestamp",
    tx."block_date" AS "block_date",
    coalesce(tx."uncled", false) AS "uncled",
    tok."token_id" AS "token_id",
    coalesce(tok."name", 'unknown') AS "token_name",
    c."from" AS "from",
    c."pids" AS "pids",
    coalesce(c."vest", false) AS "vest",
    coalesce(c."tranche_id", 0) AS "tranche_id",
    coalesce(c."amount", 0) AS "amount"
FROM gro."EV_CLAIMS" c
    LEFT JOIN gro."EV_TRANSACTIONS" tx ON c."transaction_id" = tx."transaction_id"
    LEFT JOIN gro."MD_TOKENS" tok ON tok."token_id" = 3;