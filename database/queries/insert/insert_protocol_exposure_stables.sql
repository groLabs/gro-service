INSERT INTO gro."PROTOCOL_EXPOSURE_STABLES" (
        "current_timestamp",
        "current_date",
        "network_id",
        "name",
        "display_name",
        "concentration",
        "creation_date"
    )
VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7
    );