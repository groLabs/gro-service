CREATE VIEW gro."V_EV_APPROVALS" AS
SELECT a."log_index" AS "log_index",
    a."transaction_id" AS "transaction_id",
    a."contract_address" AS "contract_address",
    a."log_name" AS "log_name",
    tx."network_id" AS "network_id",
    tx."block_number" AS "block_number",
    tx."block_timestamp" AS "block_timestamp",
    tx."block_date" AS "block_date",
    a."token_id" AS "token_id",
    coalesce(tok."name", 'unknown') AS "token_name",
    a."owner" AS "owner",
    a."spender" AS "spender",
    coalesce(a."value", 0) AS "value"
FROM gro."EV_APPROVALS" a
    LEFT JOIN gro."EV_TRANSACTIONS" tx ON a."transaction_id" = tx."transaction_id"
    AND tx."uncled" = false
    LEFT JOIN gro."MD_TOKENS" tok ON a."token_id" = tok."token_id";