-- @notice: any change here should be also applied to 'insert_user_approvals.sql'
INSERT INTO gro."USER_APPROVALS_CACHE" (
        "block_number",
        "block_timestamp",
        "approval_date",
        "network_id",
        "token_id",
        "tx_hash",
        "version_id",
        "sender_address",
        "spender_address",
        "amount",
        "value",
        "creation_date"
    )
SELECT a."block_number",
    b."block_timestamp",
    to_timestamp(b.block_timestamp)::timestamp as "approval_date",
    a."network_id",
    a."token_id",
    a."tx_hash",
    a."version_id",
    a."sender_address",
    a."spender_address",
    sum(a."amount"),
    sum(a."value"),
    a."creation_date"
FROM gro."USER_APPROVALS_CACHE_TMP" a
    LEFT JOIN gro."ETH_BLOCKS" b ON a."block_number" = b."block_number"
    AND a."network_id" = b."network_id"
WHERE a.sender_address = $1
GROUP BY a."block_number",
    b."block_timestamp",
    to_timestamp(b.block_timestamp)::timestamp,
    a."network_id",
    a."token_id",
    a."tx_hash",
    a."version_id",
    a."sender_address",
    a."spender_address",
    a."creation_date";