-- SELECT *
-- FROM gro."PROTOCOL_LIFEGUARD"
-- WHERE "current_timestamp" >= $1
--     AND "current_timestamp" <= $2
-- LIMIT 1;
SELECT *
FROM gro."PROTOCOL_LIFEGUARD"
WHERE "current_timestamp" >= $1
    AND "current_timestamp" <= $2
ORDER BY "current_timestamp" DESC
LIMIT 1;