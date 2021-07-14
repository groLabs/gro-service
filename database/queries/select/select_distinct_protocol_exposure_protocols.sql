SELECT DISTINCT "name"
FROM gro."PROTOCOL_EXPOSURE_PROTOCOLS"
WHERE "current_timestamp" >= $1
    AND "current_timestamp" <= $2;