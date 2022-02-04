-- @notice: any change here should be also applied to 'insert_tmp_user_approvals'
INSERT INTO gro."USER_APPROVALS_CACHE_TMP" (
        "block_number",
        "tx_hash",
        "network_id",
        "token_id",
        "version_id",
        "sender_address",
        "spender_address",
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