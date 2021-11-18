SELECT DISTINCT "name"
FROM gro."PROTOCOL_SYSTEM_LIFEGUARD_STABLES"
WHERE "current_timestamp" >= $1
    AND "current_timestamp" <= $2;