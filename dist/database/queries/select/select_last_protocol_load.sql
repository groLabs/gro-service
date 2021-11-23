SELECT max(last_timestamp) as last_timestamp
FROM gro."SYS_PROTOCOL_LOADS"
WHERE "table_name" = $1;