INSERT INTO gro."USER_APPROVALS_TMP" (
        "block_number",
        "network_id",
        "stablecoin_id",
        "tx_hash",
        "sender_address",
        "spender_address",
        "coin_amount",
        "coin_value",
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