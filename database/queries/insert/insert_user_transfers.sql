INSERT INTO gro."USER_TRANSFERS" (
        "block_number",
        "block_timestamp",
        "transfer_date",
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
SELECT d."block_number",
    b."block_timestamp",
    to_timestamp(b."block_timestamp")::TIMESTAMP,
    d."tx_hash",
    d."network_id",
    d."transfer_id",
    d."token_id",
    d."user_address",
    d."referral_address",
    sum(d."amount"),
    sum(d."value"),
    now()
FROM gro."USER_DEPOSITS_TMP" d
    LEFT JOIN gro."ETH_BLOCKS" b ON d."block_number" = b."block_number"
    AND d."network_id" = b."network_id"
GROUP BY d."block_number",
    b."block_timestamp",
    to_timestamp(b."block_timestamp")::TIMESTAMP,
    d."tx_hash",
    d."network_id",
    d."transfer_id",
    d."token_id",
    d."user_address",
    d."referral_address",
    now()
UNION ALL
SELECT w."block_number",
    b."block_timestamp",
    to_timestamp(b."block_timestamp")::TIMESTAMP,
    w."tx_hash",
    w."network_id",
    w."transfer_id",
    w."token_id",
    w."user_address",
    w."referral_address",
    sum(w."amount"),
    sum(w."value"),
    now()
FROM gro."USER_WITHDRAWALS_TMP" w
    LEFT JOIN gro."ETH_BLOCKS" b ON w."block_number" = b."block_number"
    and w."network_id" = b."network_id"
GROUP BY w."block_number",
    b."block_timestamp",
    to_timestamp(b."block_timestamp")::TIMESTAMP,
    w."tx_hash",
    w."network_id",
    w."transfer_id",
    w."token_id",
    w."user_address",
    w."referral_address",
    now();