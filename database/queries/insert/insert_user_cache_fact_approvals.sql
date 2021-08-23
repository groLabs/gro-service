-- @notice: any change here should be also applied to 'insert_user_approvals'
--INSERT INTO gro."CACHE_USER_APPROVALS" (
INSERT INTO gro."USER_CACHE_FACT_APPROVALS" (
        "block_number",
        "block_timestamp",
        "approval_date",
        "network_id",
        "stablecoin_id",
        "tx_hash",
        "sender_address",
        "spender_address",
        "coin_amount",
        "coin_value",
        "creation_date"
    )
SELECT a."block_number",
    b."block_timestamp",
    to_timestamp(b.block_timestamp)::timestamp,
    a."network_id",
    a."stablecoin_id",
    a."tx_hash",
    a."sender_address",
    a."spender_address",
    a."coin_amount",
    a."coin_value",
    a."creation_date"
--FROM gro."CACHE_TMP_USER_APPROVALS" a
FROM gro."USER_CACHE_TMP_APPROVALS" a
    LEFT JOIN gro."ETH_BLOCKS" b ON a.block_number = b.block_number
WHERE a.sender_address = $1;