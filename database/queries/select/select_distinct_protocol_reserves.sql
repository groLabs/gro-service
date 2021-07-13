SELECT DISTINCT vault_name,
    reserve_name
FROM gro."PROTOCOL_RESERVES"
WHERE launch_timestamp >= $1
    AND launch_timestamp <= $2;