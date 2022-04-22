INSERT INTO gro."EV_PNL_STRATEGY_REPORTED" (
        "log_index",
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
        "lockedProfit",
        "totalAssets"
    )
VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7,
        $8,
        $9,
        $10,
        $11,
        $12,
        $13,
        $14,
        $15
    ) ON CONFLICT ON CONSTRAINT "EV_PNL_STRATEGY_REPORTED_pkey" DO NOTHING;