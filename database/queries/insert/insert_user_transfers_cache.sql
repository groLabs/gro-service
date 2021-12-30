-- @notice: any change here should be also applied to 'insert_user_transfers.sql'
INSERT INTO gro."USER_TRANSFERS_CACHE" (
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
FROM gro."USER_DEPOSITS_CACHE" d
    LEFT JOIN gro."ETH_BLOCKS" b ON d."block_number" = b."block_number"
    AND d."network_id" = b."network_id"
WHERE d."user_address" = $1
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
FROM gro."USER_WITHDRAWALS_CACHE" w
    LEFT JOIN gro."ETH_BLOCKS" b ON w."block_number" = b."block_number"
    and w."network_id" = b."network_id"
WHERE w.user_address = $1
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
-- INSERT INTO gro."USER_TRANSFERS_CACHE" (
--         "block_number",
--         "block_timestamp",
--         "transfer_date",
--         "tx_hash",
--         "network_id",
--         "transfer_type",
--         "user_address",
--         "referral_address",
--         "usd_value",
--         "gvt_value",
--         "pwrd_value",
--         "gvt_amount",
--         "pwrd_amount",
--         "usd_deduct",
--         "usd_return",
--         "lp_amount",
--         "stable_amount",
--         "dai_amount",
--         "usdc_amount",
--         "usdt_amount",
--         "gro_amount",
--         "creation_date"
--     )
-- SELECT d."block_number",
--     b."block_timestamp",
--     to_timestamp(b.block_timestamp)::timestamp,
--     d."tx_hash",
--     d."network_id",
--     d."transfer_type",
--     d."user_address",
--     d."referral_address",
--     d."usd_value",
--     d."gvt_value",
--     d."pwrd_value",
--     d."gvt_amount",
--     d."pwrd_amount",
--     0,
--     0,
--     0,
--     d."stable_amount",
--     d."dai_amount",
--     d."usdc_amount",
--     d."usdt_amount",
--     d."gro_amount",
--     d."creation_date"
-- FROM gro."USER_DEPOSITS_CACHE" d
--     LEFT JOIN gro."ETH_BLOCKS" b ON d.block_number = b.block_number
-- WHERE d.user_address = $1
-- UNION ALL
-- SELECT w."block_number",
--     b."block_timestamp",
--     to_timestamp(b.block_timestamp)::timestamp,
--     w."tx_hash",
--     w."network_id",
--     w."transfer_type",
--     w."user_address",
--     w."referral_address",
--     w."usd_value",
--     w."gvt_value",
--     w."pwrd_value",
--     w."gvt_amount",
--     w."pwrd_amount",
--     w."usd_deduct",
--     w."usd_return",
--     w."lp_amount",
--     w."stable_amount",
--     w."dai_amount",
--     w."usdc_amount",
--     w."usdt_amount",
--     w."gro_amount",
--     w."creation_date"
-- FROM gro."USER_WITHDRAWALS_CACHE" w
--     LEFT JOIN gro."ETH_BLOCKS" b ON w.block_number = b.block_number
-- WHERE w.user_address = $1;