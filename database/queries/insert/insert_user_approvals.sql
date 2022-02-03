INSERT INTO gro."USER_APPROVALS" (
        "block_number",
        "block_timestamp",
        "approval_date",
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
SELECT a."block_number",
    b."block_timestamp",
    to_timestamp(b.block_timestamp)::timestamp,
    a."tx_hash",
    a."network_id",
    a."token_id",
    a."version_id",
    a."sender_address",
    a."spender_address",
    sum(a."amount"),
    sum(a."value"),
    a."creation_date"
FROM gro."USER_APPROVALS_TMP" a
    LEFT JOIN gro."ETH_BLOCKS" b ON a."block_number" = b."block_number"
    AND a."network_id" = b."network_id"
GROUP BY a."block_number",
    b."block_timestamp",
    to_timestamp(b.block_timestamp)::timestamp,
    a."tx_hash",
    a."network_id",
    a."token_id",
    a."version_id",
    a."sender_address",
    a."spender_address",
    a."creation_date";