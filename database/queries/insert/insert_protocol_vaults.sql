INSERT INTO gro."PROTOCOL_VAULTS" (
        "launch_timestamp",
        "launch_date",
        "network_id",
        "name",
        "display_name",
        "amount",
        "share",
        "last3d_apy",
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
        $8,
        $9
    );