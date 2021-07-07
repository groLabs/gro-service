-- @notice: any change here should be also applied to 'insert_tmp_user_deposits'
INSERT INTO gro."CACHE_TMP_USER_DEPOSITS" (
        "block_number",
        "tx_hash",
        "network_id",
        "transfer_type",
        "user_address",
        "referral_address",
        "usd_value",
        "gvt_value",
        "pwrd_value",
        "gvt_amount",
        "pwrd_amount",
        "stable_amount",
        "dai_amount",
        "usdc_amount",
        "usdt_amount",
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
        $12,
        $13,
        $14,
        $15,
        $16
    );