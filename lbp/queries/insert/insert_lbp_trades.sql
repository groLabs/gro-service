INSERT INTO gro."LBP_TRADES" (
        "trade_date",
        "trade_timestamp",
        "block_number",
        "network_id",
        "tx_hash",
        "tx_type",
        "user_address",
        "token_addr_in",
        "token_amount_in",
        "token_addr_out",
        "token_amount_out",
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
        $9,
        $10,
        $11,
        $12
    );