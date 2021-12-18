-- SELECT DISTINCT vault_name,
--     reserve_name
-- FROM gro."PROTOCOL_RESERVES"
-- WHERE "current_timestamp" >= $1
--     AND "current_timestamp" <= $2;
SELECT DISTINCT vault_name,
    reserve_name
FROM gro."PROTOCOL_RESERVES"
WHERE "current_timestamp" >= $1
ORDER BY "vault_name",
    "reserve_name";