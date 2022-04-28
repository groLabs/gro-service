CREATE VIEW gro."V_EV_LAB_PNL_SUMMARY" AS 
WITH
    max_ts_strategy AS (
        SELECT "contract_address" AS "contract_address",
            max("block_timestamp") AS "block_timestamp"
        FROM gro."EV_LAB_STRATEGY_REPORTED"
        GROUP BY 1
    ),
    max_ts_factor AS (
        SELECT "contract_address" AS "contract_address",
            max("block_timestamp") AS "block_timestamp"
        FROM gro."EV_LAB_NEW_RELEASE_FACTOR"
        GROUP BY 1
    ),
    strategy AS (
        SELECT sr."block_timestamp" AS "block_timestamp",
            sr."contract_address" AS "contract_address",
            sr."locked_profit" AS "locked_profit",
            sr."total_assets" AS "total_assets"
        FROM gro."EV_LAB_STRATEGY_REPORTED" sr
            JOIN max_ts_strategy max_sr ON sr."block_timestamp" = max_sr."block_timestamp"
            AND sr."contract_address" = max_sr."contract_address"
    ),
    factor AS (
        SELECT rf."contract_address" AS "contract_address",
            rf."factor" AS "factor"
        FROM gro."EV_LAB_NEW_RELEASE_FACTOR" rf
            JOIN max_ts_factor max_rf ON rf."block_timestamp" = max_rf."block_timestamp"
            AND rf."contract_address" = max_rf."contract_address"
    ),
    total_supply AS (
        SELECT "contract_address" AS "contract_address",
            sum("normalized") AS "value"
        FROM (
                SELECT "contract_address",
                    CASE
                        WHEN "to" = '0x0000000000000000000000000000000000000000' THEN value * -1
                        WHEN "from" = '0x0000000000000000000000000000000000000000' THEN value
                    END "normalized"
                FROM gro."EV_TRANSFERS"
                WHERE '0x0000000000000000000000000000000000000000' IN ("to", "from")
            ) ts
        GROUP BY "contract_address"
    )

SELECT sr."block_timestamp" AS "report_timestamp",
    sr."contract_address" AS "contract_address",
    sr."locked_profit" AS "locked_profit",
    sr."total_assets" AS "total_assets",
    ts."value" AS "total_supply",
    rf."factor" AS "release_factor"
FROM strategy sr
    LEFT JOIN factor rf ON sr."contract_address" = rf."contract_address"
    LEFT JOIN total_supply ts ON sr."contract_address" = ts."contract_address";