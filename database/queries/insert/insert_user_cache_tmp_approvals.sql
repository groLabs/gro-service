-- @notice: any change here should be also applied to 'insert_tmp_user_approvals'
INSERT INTO gro."USER_CACHE_TMP_APPROVALS" (
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