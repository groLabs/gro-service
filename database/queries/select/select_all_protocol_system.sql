SELECT *
FROM gro."PROTOCOL_SYSTEM"
WHERE launch_timestamp >= $1
    AND launch_timestamp <= $2
LIMIT 1;