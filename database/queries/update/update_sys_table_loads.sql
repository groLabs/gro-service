UPDATE gro."SYS_TABLE_LOADS"
SET "table_name" = $1,
    "last_block_number" = $2,
    "last_date" = $3,
    "network_id" = $4,
    "update_date" = $5
WHERE "table_name" = $1;