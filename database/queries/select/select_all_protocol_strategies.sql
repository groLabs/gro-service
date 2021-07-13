SELECT *
FROM gro."PROTOCOL_STRATEGIES"
WHERE launch_timestamp >= $1
    AND launch_timestamp <= $2
    AND "vault_name"= $3
    AND "strategy_name"= $4
LIMIT 1;