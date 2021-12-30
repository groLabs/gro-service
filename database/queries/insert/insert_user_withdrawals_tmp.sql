INSERT INTO gro."USER_WITHDRAWALS_TMP" (
        "block_number",
        "tx_hash",
        "network_id",
        "transfer_id",
        "token_id",
        "user_address",
        "referral_address",
        "amount",
        "value",
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
        $10
    );