SELECT DISTINCT vault_name,
    strategy_name
FROM gro."PROTOCOL_STRATEGIES"
WHERE launch_timestamp >= $1
    AND launch_timestamp <= $2
ORDER BY vault_name,
    strategy_name;