INSERT INTO gro."LBP_PRICE" (
        "price_date",
        "price_timestamp",
        "block_number",
        "network_id",
        "spot_price",
        "creation_date"
    )
VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6
    );