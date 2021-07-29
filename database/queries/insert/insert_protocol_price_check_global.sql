INSERT INTO gro."PROTOCOL_PRICE_CHECK_GLOBAL" (
        "block_number",
        "block_timestamp",
        "block_date",
        "network_id",
        "safety_check_bound",
        "safety_checkck",
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
