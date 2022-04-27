CREATE VIEW gro."V_EV_LAB_STRATEGY_REPORTED" AS
SELECT sr."transaction_id" AS "transaction_id",
    sr."log_index" AS "log_index",
    sr."contract_address" AS "contract_address",
    sr."log_name" AS "log_name",
    tx."tx_hash" AS "transaction_hash",
    tx."network_id" AS "network_id",
    tx."block_number" AS "block_number",
    tx."block_timestamp" AS "block_timestamp",
    tx."block_date" AS "block_date",
    sr."strategy" AS "strategy",
    coalesce(sr."gain", 0) AS "gain",
    coalesce(sr."loss", 0) AS "loss",
    coalesce(sr."debt_paid", 0) AS "debt_paid",
    coalesce(sr."total_gain", 0) AS "total_gain",
    coalesce(sr."total_loss", 0) AS "total_loss",
    coalesce(sr."total_debt", 0) AS "total_debt",
    coalesce(sr."debt_added", 0) AS "debt_added",
    coalesce(sr."debt_ratio", 0) AS "debt_ratio",
    coalesce(sr."locked_profit", 0) AS "locked_profit",
    coalesce(sr."total_assets", 0) AS "total_assets"
FROM gro."EV_LAB_STRATEGY_REPORTED" sr
    LEFT JOIN gro."EV_TRANSACTIONS" tx ON sr."transaction_id" = tx."transaction_id"
    AND tx."uncle_block" = false;