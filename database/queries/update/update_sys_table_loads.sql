UPDATE gro."SYS_TABLE_LOADS"
SET "table_name" = $1,
    "last_block_number" = $2,
    "network_id" = $3,
    "update_date" = $4
WHERE "table_name" = $1;