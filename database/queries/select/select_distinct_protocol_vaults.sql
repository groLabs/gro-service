SELECT DISTINCT "name"
FROM gro."PROTOCOL_VAULTS"
WHERE "current_timestamp" >= $1
    AND "current_timestamp" <= $2;