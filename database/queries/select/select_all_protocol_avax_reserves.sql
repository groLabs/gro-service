-- SELECT *
-- FROM gro."PROTOCOL_AVAX_RESERVES"
-- WHERE "current_timestamp" >= $1
--     AND "current_timestamp" <= $2
--     AND "vault_name" = $3
--     AND "reserve_name" = $4
-- LIMIT 1;
SELECT *
FROM gro."PROTOCOL_AVAX_RESERVES"
WHERE "current_timestamp" >= $1
    AND "current_timestamp" <= $2
    AND "vault_name" = $3
    AND "reserve_name" = $4
ORDER BY "current_timestamp" DESC
LIMIT 1;