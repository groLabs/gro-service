SELECT DISTINCT "name"
FROM gro."PROTOCOL_VAULTS"
WHERE launch_timestamp >= $1
    AND launch_timestamp <= $2;