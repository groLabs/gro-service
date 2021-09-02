INSERT INTO gro."LBP_VOLUME" (
        "volume_date",
        "volume_timestamp",
        "network_id",
        "tx_hash",
        "tx_type",
        "amount",
        "coin",
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
    );