CREATE VIEW gro."V_EV_TRANSERS" AS
SELECT t."log_index" AS "log_index",
    t."transaction_id" AS "transaction_id",
    t."contract_address" AS "contract_address",
    t."log_name" AS "log_name",
    tx."network_id" AS "network_id",
    tx."block_number" AS "block_number",
    tx."block_timestamp" AS "block_timestamp",
    coalesce(tx."uncled", false) AS "uncled",
    t."token_id" AS "token_id",
    coalesce(tok."name", 'unknown') AS "token_name",
    t."from" AS "from",
    t."to" AS "to",
    coalesce(t."value", 0) AS "value"
FROM gro."EV_TRANSFERS" t
    LEFT JOIN gro."EV_TRANSACTIONS" tx ON t."transaction_id" = tx."transaction_id"
    LEFT JOIN gro."MD_TOKENS" tok ON t."token_id" = tok."token_id";