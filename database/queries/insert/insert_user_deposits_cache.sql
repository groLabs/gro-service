-- @notice: any change here should be also applied to 'insert_user_deposits_tmp'
INSERT INTO gro."USER_DEPOSITS_CACHE" (
        "block_number",
        "tx_hash",
        "network_id",
        "transfer_id",
        "token_id",
        "version_id",
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
        $10,
        $11
    );