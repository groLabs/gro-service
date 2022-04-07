SELECT *
FROM gro."PROTOCOL_SYSTEM"
WHERE "current_timestamp" >= $1
    AND "current_timestamp" <= $2
ORDER BY "current_timestamp" DESC
LIMIT 1;