SELECT *
FROM gro."PROTOCOL_SYSTEM"
WHERE "current_timestamp" >= $1
    AND "current_timestamp" <= $2
LIMIT 1;