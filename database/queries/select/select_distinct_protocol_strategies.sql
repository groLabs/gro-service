-- SELECT DISTINCT vault_name,
--     strategy_name
-- FROM gro."PROTOCOL_STRATEGIES"
-- WHERE "current_timestamp" >= $1
--     AND "current_timestamp" <= $2
-- ORDER BY vault_name,
--     strategy_name;
SELECT DISTINCT vault_name,
    strategy_name
FROM gro."PROTOCOL_STRATEGIES"
WHERE "current_timestamp" >= $1
ORDER BY vault_name,
    strategy_name;