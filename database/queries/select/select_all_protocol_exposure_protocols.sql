SELECT *
FROM gro."PROTOCOL_EXPOSURE_PROTOCOLS"
WHERE launch_timestamp >= $1
    AND launch_timestamp <= $2
    AND "name"= $3
LIMIT 1;