UPDATE gro."SYS_PROTOCOL_LOADS"
SET "last_timestamp" = $1,
    "update_date" = $2
WHERE "network_id" = $3
AND "table_name" = $4;