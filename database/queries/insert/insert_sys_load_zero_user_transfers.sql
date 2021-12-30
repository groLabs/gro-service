INSERT INTO gro."SYS_USER_LOADS" (
		table_name,
		network_id,
		target_date,
		records_loaded,
		creation_date
    )
VALUES (
        $1,
        $2,
        $3,
        $4,
        $5
    );