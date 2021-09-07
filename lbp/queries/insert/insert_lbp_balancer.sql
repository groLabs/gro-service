INSERT INTO gro."LBP_BALANCER_V1" (
        "lbp_date",
        "lbp_timestamp",
        "lbp_block_number",
        "network_id",
        "spot_price",
        "current_balance",
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