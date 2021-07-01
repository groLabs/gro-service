SELECT SUM(t.pwrd_in) as "pwrd_in",
    SUM(t.gvt_in) as "gvt_in",
    SUM(t.total_in) as "total_in",
    SUM(t.pwrd_out) as "pwrd_out",
    SUM(t.gvt_out) as "gvt_out",
    SUM(t.total_out) as "total_out",
    SUM(t.pwrd_in + t.pwrd_out) as "pwrd_net",
    SUM(t.gvt_in + t.gvt_out) as "gvt_net",
    SUM(t.total_in + t.total_out) as "total_net"
FROM (
        SELECT SUM(t_in.pwrd_value) as "pwrd_in",
            SUM(t_in.gvt_value) as "gvt_in",
            SUM(t_in.usd_value) as "total_in",
            0 as "pwrd_out",
            0 as "gvt_out",
            0 as "total_out"
        FROM gro."USER_TRANSFERS" t_in
        WHERE t_in.user_address = $1
            AND t_in.transfer_type in (
                'deposit',
                'ext_pwrd_deposit',
                'ext_gvt_deposit'
            )
            AND TO_CHAR(t_in.transfer_date, 'DD/MM/YYYY') <= $2
        UNION ALL
        SELECT 0 as "pwrd_in",
            0 as "gvt_in",
            0 as "total_in",
            SUM(t_out.pwrd_value) as "pwrd_out",
            SUM(t_out.gvt_value) as "gvt_out",
            SUM(t_out.usd_value) as "total_out"
        FROM gro."USER_TRANSFERS" t_out
        WHERE t_out.user_address = $1
            AND t_out.transfer_type in (
                'withdrawal',
                'ext_pwrd_withdrawal',
                'ext_gvt_withdrawal'
            )
            AND TO_CHAR(t_out.transfer_date, 'DD/MM/YYYY') <= $2
    ) t;