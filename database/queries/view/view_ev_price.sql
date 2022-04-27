CREATE VIEW gro."V_EV_PRICE" AS
SELECT p."transaction_id" AS "transaction_id",
    p."log_index" AS "log_index",
    p."contract_address" AS "contract_address",
    p."log_name" AS "log_name",
    tx."tx_hash" AS "transaction_hash",
    tx."network_id" AS "network_id",
    tx."block_number" AS "block_number",
    tx."block_timestamp" AS "block_timestamp",
    tx."block_date" AS "block_date",
    p."token1_id" AS "token1_id",
    coalesce(tok_1."name", 'unknown') AS "token1_name",
    p."token2_id" AS "token2_id",
    coalesce(tok_2."name", 'unknown') AS "token2_name",
    p."price" AS "price",
    p."round_id" AS "round_id",
    p."updated_at" AS "updated_at"
FROM gro."V_EV_PRICE" p
    LEFT JOIN gro."V_EV_TRANSACTIONS" tx ON p."transaction_id" = tx."transaction_id"
    AND tx."uncle_block" = false
    LEFT JOIN gro."MD_TOKENS" tok_1 ON p."token1_id" = tok_1."token_id"
    LEFT JOIN gro."MD_TOKENS" tok_2 ON p."token2_id" = tok_2."token_id";