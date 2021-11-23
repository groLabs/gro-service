SELECT SUM(t_in.pwrd_in + ct_in.pwrd_in) as "pwrd_in",
    SUM(t_in.gvt_in + ct_in.gvt_in) as "gvt_in",
    SUM(t_in.total_in + ct_in.total_in) as "total_in",
    SUM(t_out.pwrd_out + ct_out.pwrd_out) as "pwrd_out",
    SUM(t_out.gvt_out + ct_out.gvt_out) as "gvt_out",
    SUM(t_out.total_out + ct_out.total_out) as "total_out",
    SUM(
        t_in.pwrd_in + t_out.pwrd_out + ct_in.pwrd_in + ct_out.pwrd_out
    ) as "pwrd_net",
    SUM(
        t_in.gvt_in + t_out.gvt_out + ct_in.gvt_in + ct_out.gvt_out
    ) as "gvt_net",
    SUM(
        t_in.total_in + t_out.total_out + ct_in.total_in + ct_out.total_out
    ) as "total_net"
FROM (
        SELECT CASE
                WHEN SUM(t_in.pwrd_value) IS NULL THEN 0
                ELSE SUM(t_in.pwrd_value)
            END as "pwrd_in",
            CASE
                WHEN SUM(t_in.gvt_value) IS NULL THEN 0
                ELSE SUM(t_in.gvt_value)
            END as "gvt_in",
            CASE
                WHEN SUM(t_in.usd_value) IS NULL THEN 0
                ELSE SUM(t_in.usd_value)
            END as "total_in",
            0 as "pwrd_out",
            0 as "gvt_out",
            0 as "total_out"
        FROM gro."USER_CACHE_FACT_TRANSFERS" t_in
        WHERE t_in.user_address = $1
            AND t_in.transfer_type in (
                'deposit',
                'ext_pwrd_deposit',
                'ext_gvt_deposit'
            )
    ) t_in,
    (
        SELECT 0 as "pwrd_in",
            0 as "gvt_in",
            0 as "total_in",
            CASE
                WHEN SUM(t_out.pwrd_value) IS NULL THEN 0
                ELSE SUM(t_out.pwrd_value)
            END as "pwrd_out",
            CASE
                WHEN SUM(t_out.gvt_value) IS NULL THEN 0
                ELSE SUM(t_out.gvt_value)
            END as "gvt_out",
            CASE
                WHEN SUM(t_out.usd_value) IS NULL THEN 0
                ELSE SUM(t_out.usd_value)
            END as "total_out"
        FROM gro."USER_CACHE_FACT_TRANSFERS" t_out
        WHERE t_out.user_address = $1
            AND t_out.transfer_type in (
                'withdrawal',
                'ext_pwrd_withdrawal',
                'ext_gvt_withdrawal'
            )
    ) t_out,
    (
        SELECT CASE
                WHEN SUM(t_in.pwrd_value) IS NULL THEN 0
                ELSE SUM(t_in.pwrd_value)
            END as "pwrd_in",
            CASE
                WHEN SUM(t_in.gvt_value) IS NULL THEN 0
                ELSE SUM(t_in.gvt_value)
            END as "gvt_in",
            CASE
                WHEN SUM(t_in.usd_value) IS NULL THEN 0
                ELSE SUM(t_in.usd_value)
            END as "total_in",
            0 as "pwrd_out",
            0 as "gvt_out",
            0 as "total_out"
        FROM gro."USER_STD_FACT_TRANSFERS" t_in
        WHERE t_in.user_address = $1
            AND t_in.transfer_type in (
                'deposit',
                'ext_pwrd_deposit',
                'ext_gvt_deposit'
            )
    ) ct_in,
    (
        SELECT 0 as "pwrd_in",
            0 as "gvt_in",
            0 as "total_in",
            CASE
                WHEN SUM(t_out.pwrd_value) IS NULL THEN 0
                ELSE SUM(t_out.pwrd_value)
            END as "pwrd_out",
            CASE
                WHEN SUM(t_out.gvt_value) IS NULL THEN 0
                ELSE SUM(t_out.gvt_value)
            END as "gvt_out",
            CASE
                WHEN SUM(t_out.usd_value) IS NULL THEN 0
                ELSE SUM(t_out.usd_value)
            END as "total_out"
        FROM gro."USER_STD_FACT_TRANSFERS" t_out
        WHERE t_out.user_address = $1
            AND t_out.transfer_type in (
                'withdrawal',
                'ext_pwrd_withdrawal',
                'ext_gvt_withdrawal'
            )
    ) ct_out;
-- SELECT SUM(t.pwrd_in) as "pwrd_in",
--     SUM(t.gvt_in) as "gvt_in",
--     SUM(t.total_in) as "total_in",
--     SUM(t.pwrd_out) as "pwrd_out",
--     SUM(t.gvt_out) as "gvt_out",
--     SUM(t.total_out) as "total_out",
--     SUM(t.pwrd_in + t.pwrd_out) as "pwrd_net",
--     SUM(t.gvt_in + t.gvt_out) as "gvt_net",
--     SUM(t.total_in + t.total_out) as "total_net"
-- FROM (
--         SELECT SUM(t_in.pwrd_value) as "pwrd_in",
--             SUM(t_in.gvt_value) as "gvt_in",
--             SUM(t_in.usd_value) as "total_in",
--             0 as "pwrd_out",
--             0 as "gvt_out",
--             0 as "total_out"
--         FROM gro."USER_TRANSFERS" t_in
--         WHERE t_in.user_address = $1
--             AND t_in.transfer_type in (
--                 'deposit',
--                 'ext_pwrd_deposit',
--                 'ext_gvt_deposit'
--             )
--         UNION ALL
--         SELECT 0 as "pwrd_in",
--             0 as "gvt_in",
--             0 as "total_in",
--             SUM(t_out.pwrd_value) as "pwrd_out",
--             SUM(t_out.gvt_value) as "gvt_out",
--             SUM(t_out.usd_value) as "total_out"
--         FROM gro."USER_TRANSFERS" t_out
--         WHERE t_out.user_address =$1
--             AND t_out.transfer_type in (
--                 'withdrawal',
--                 'ext_pwrd_withdrawal',
--                 'ext_gvt_withdrawal'
--             )
--     ) t;