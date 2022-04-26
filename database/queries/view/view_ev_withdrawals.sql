CREATE VIEW gro."V_EV_WITHDRAWALS" AS
SELECT w."log_index" AS "log_index",
    w."transaction_id" AS "transaction_id",
    tx."tx_hash" AS "transaction_hash",
    w."contract_address" AS "contract_address",
    w."log_name" AS "log_name",
    tx."network_id" AS "network_id",
    tx."block_number" AS "block_number",
    tx."block_timestamp" AS "block_timestamp",
    tx."block_date" AS "block_date",
    coalesce(tx."uncled", false) AS "uncled",
    w."token_id" AS "token_id",
    coalesce(tok."name", 'unknown') AS "token_name",
    w."from" AS "from",
    w."pid" AS "pid",
    coalesce(w."amount1", 0) AS "amount1",
    coalesce(w."amount2", 0) AS "amount2",
    coalesce(w."amount3", 0) AS "amount3",
    coalesce(w."value", 0) AS "value",
    coalesce(
        w."referral",
        '0x0000000000000000000000000000000000000000'
    ) AS "referral",
    coalesce(w."balanced", false) AS "balanced",
    coalesce(w."all", false) AS "all",
    coalesce(w."deductUsd", 0) AS "deductUsd",
    coalesce(w."lpAmount", 0) AS "lpAmount",
    coalesce(w."allowance", 0) AS "allowance",
    coalesce(w."totalLoss", 0) AS "totalLoss"
FROM gro."EV_WITHDRAWALS" w
    LEFT JOIN gro."EV_TRANSACTIONS" tx ON w."transaction_id" = tx."transaction_id"
    AND tx."uncled" = false
    LEFT JOIN gro."MD_TOKENS" tok ON w."token_id" = tok."token_id";