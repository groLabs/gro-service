SELECT *
FROM gro."PROTOCOL_APY"
WHERE "current_timestamp" >= $1
    AND "current_timestamp" <= $2
    AND "product_id" = $3
LIMIT 1;