CREATE VIEW gro."V_EV_PNL_SUMMARY" AS 
WITH 
    max_block_factor AS (
        SELECT contract_address AS "contract_address",
            max(block_number) AS block_number
        FROM gro."V_EV_PNL_NEW_RELEASE_FACTOR"
        GROUP BY 1
    ),
    max_block_strategy AS (
        SELECT contract_address AS "contract_address",
            max(block_number) AS block_number
        FROM gro."V_EV_PNL_STRATEGY_REPORTED"
        GROUP BY 1
    ),
    factor AS (
        SELECT rf.contract_address,
            rf.factor
        FROM gro."V_EV_PNL_NEW_RELEASE_FACTOR" rf
            JOIN max_block_factor max_rf ON rf.block_number = max_rf.block_number
            AND rf.contract_address = max_rf.contract_address
    ),
    strategy AS (
        SELECT sr.block_timestamp,
            sr.contract_address,
            sr."lockedProfit",
            sr."totalAssets",
            sr."totalSupply"
        FROM gro."V_EV_PNL_STRATEGY_REPORTED" sr
            JOIN max_block_strategy max_sr ON sr.block_number = max_sr.block_number
            AND sr.contract_address = max_sr.contract_address
    )
    
SELECT sr."block_timestamp" AS report_timestamp,
    sr."contract_address" AS "contract_address",
    sr."lockedProfit" AS locked_profit,
    sr."totalAssets" AS total_assets,
    sr."totalSupply" AS total_supply,
    rf."factor" AS release_factor
FROM strategy sr
    LEFT JOIN factor rf ON sr.contract_address = rf.contract_address;