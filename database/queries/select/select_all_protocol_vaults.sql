SELECT *
FROM gro."PROTOCOL_VAULTS"
WHERE "current_timestamp" >= $1
    AND "current_timestamp" <= $2
    AND "name" = $3
ORDER BY "current_timestamp" DESC
LIMIT 1;