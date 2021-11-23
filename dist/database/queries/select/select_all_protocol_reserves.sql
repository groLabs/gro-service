SELECT *
FROM gro."PROTOCOL_RESERVES"
WHERE "current_timestamp" >= $1
    AND "current_timestamp" <= $2
    AND "vault_name" = $3
    AND "reserve_name" = $4
LIMIT 1;