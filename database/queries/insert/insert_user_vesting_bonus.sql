INSERT INTO gro."USER_VESTING_BONUS" (
        "block_number",
        "tx_hash",
        "network_id",
        "user_address",
        "amount",
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