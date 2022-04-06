--filter?
SELECT "log_index",
    "transaction_id",
    "contract_address",
    "log_name",
    "strategy",
    "gain",
    "loss",
    "debtPaid",
    "totalGain",
    "totalLoss",
    "totalDebt",
    "debtAdded",
    "debtRatio",
    "creation_date"
FROM gro."EV_PNL_STRATEGY_REPORTED"
WHERE "transaction_id" = $1