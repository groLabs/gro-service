INSERT INTO gro."ETH_BLOCKS" (
        "block_number",
        "block_timestamp",
        "block_date",
        "network_id",
        "creation_date"
    )
VALUES (
        $1,
        $2,
        $3,
        $4,
        $5
    );