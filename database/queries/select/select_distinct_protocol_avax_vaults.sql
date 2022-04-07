SELECT DISTINCT "name"
FROM gro."PROTOCOL_AVAX_VAULTS"
WHERE "current_timestamp" >= $1
ORDER BY "name";