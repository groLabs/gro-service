SELECT *
FROM gro."PROTOCOL_TVL"
WHERE launch_timestamp >= $1
    AND launch_timestamp <= $2
LIMIT 1;