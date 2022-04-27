CREATE VIEW gro."V_EV_GRO_WITHDRAWALS" AS
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
    w."user" AS "user",
    w."referral" AS "referral",
    w."balanced" AS "balanced",
    w."all" AS "all",
    coalesce(w."deduct_usd", 0) AS "deduct_usd",
    coalesce(w."return_usd", 0) AS "return_usd",
    coalesce(w."lp_amount", 0) AS "lp_amount",
    coalesce(w."amount1", 0) AS "amount1",
    coalesce(w."amount2", 0) AS "amount2",
    coalesce(w."amount3", 0) AS "amount3"
    FROM gro."EV_GRO_WITHDRAWALS" w
    LEFT JOIN gro."EV_TRANSACTIONS" tx ON w."transaction_id" = tx."transaction_id"
    AND tx."uncle_block" = false
    LEFT JOIN gro."MD_TOKENS" tok ON w."token_id" = tok."token_id";