SELECT DISTINCT "name"
FROM gro."PROTOCOL_VAULTS"
WHERE "current_timestamp" >= $1
ORDER BY "name";