SELECT DISTINCT "name"
FROM gro."PROTOCOL_EXPOSURE_STABLES"
WHERE "current_timestamp" >= $1
ORDER BY "name";