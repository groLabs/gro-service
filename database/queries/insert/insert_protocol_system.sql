INSERT INTO gro."PROTOCOL_SYSTEM" (
        "launch_timestamp",
        "launch_date",
        "network_id",
        "total_share",
        "total_amount",
        "last3d_apy",
        "hodl_bonus",
        "creation_date"
    )
    VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7,
        $8
    )