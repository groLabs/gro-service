SELECT *
FROM gro."PROTOCOL_APY"
WHERE launch_timestamp >= $1
    AND launch_timestamp <= $2
    AND product_id = $3
LIMIT 1;