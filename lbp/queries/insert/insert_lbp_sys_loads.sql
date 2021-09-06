INSERT INTO gro."SYS_LBP_LOADS" (
        "table_name",
        "network_id",
        "last_date",
        "last_timestamp",
        "last_block",
        "records_loaded",
        "creation_date"
    )
VALUES ($1, $2, $3, $4, $5, $6, $7);