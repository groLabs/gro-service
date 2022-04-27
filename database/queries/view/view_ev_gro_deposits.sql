CREATE VIEW gro."V_EV_GRO_DEPOSITS" AS
SELECT d."transaction_id" AS "transaction_id",
    d."log_index" AS "log_index",
    d."contract_address" AS "contract_address",
    d."log_name" AS "log_name",
    tx."tx_hash" AS "transaction_hash",
    tx."network_id" AS "network_id",
    tx."block_number" AS "block_number",
    tx."block_timestamp" AS "block_timestamp",
    tx."block_date" AS "block_date",
    d."token_id" AS "token_id",
    coalesce(tok."name", 'unknown') AS "token_name",
    d."user" AS "user",
    d."referral" AS "referral",
    coalesce(d."usd_amount", 0) AS "usd_amount",
    coalesce(d."amount1", 0) AS "amount1",
    coalesce(d."amount2", 0) AS "amount2",
    coalesce(d."amount3", 0) AS "amount3"
FROM gro."EV_GRO_DEPOSITS" d
    LEFT JOIN gro."EV_TRANSACTIONS" tx ON d."transaction_id" = tx."transaction_id"
    AND tx."uncle_block" = false
    LEFT JOIN gro."MD_TOKENS" tok ON d."token_id" = tok."token_id";