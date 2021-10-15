INSERT INTO gro."PROTOCOL_PRICE_CHECK_GLOBAL" (
        "block_number",
        "block_timestamp",
        "block_date",
        "network_id",
        "safety_check_bound",
        "safety_check",
        "creation_date",
        "oracle_check_tolerance",
        "curve_check_tolerance"
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