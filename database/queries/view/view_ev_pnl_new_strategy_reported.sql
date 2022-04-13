CREATE VIEW gro."V_EV_PNL_STRATEGY_REPORTED" AS
SELECT sr."log_index" AS "log_index",
    sr."transaction_id" AS "transaction_id",
    sr."contract_address" AS "contract_address",
    sr."log_name" AS "log_name",
    tx."network_id" AS "network_id",
    tx."block_number" AS "block_number",
    tx."block_timestamp" AS "block_timestamp",
    tx."block_date" AS "block_date",
    coalesce(tx."uncled", false) AS "uncled",
    sr."strategy" AS "strategy",
    coalesce(sr."gain", 0) AS "gain",
    coalesce(sr."loss", 0) AS "loss",
    coalesce(sr."debtPaid", 0) AS "debtPaid",
    coalesce(sr."totalGain", 0) AS "totalGain",
    coalesce(sr."totalLoss", 0) AS "totalLoss",
    coalesce(sr."totalDebt", 0) AS "totalDebt",
    coalesce(sr."debtAdded", 0) AS "debtAdded",
    coalesce(sr."debtRatio", 0) AS "debtRatio",
    coalesce(sr."lockedProfit", 0) AS "lockedProfit",
    coalesce(sr."totalAssets", 0) AS "totalAssets"
FROM gro."EV_PNL_STRATEGY_REPORTED" sr
    LEFT JOIN gro."EV_TRANSACTIONS" tx ON sr."transaction_id" = tx."transaction_id"