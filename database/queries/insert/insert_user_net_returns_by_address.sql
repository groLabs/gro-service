INSERT INTO gro."USER_NET_RETURNS" (
        "balance_date",
        "network_id",
        "user_address",
        "usd_value",
        "pwrd_value",
        "gvt_value",
        "usd_ratio_value",
        "pwrd_ratio_value",
        "gvt_ratio_value",
        "creation_date"
    )
SELECT ub.balance_date as balace_date,
    ut.network_id as network_id,
    ut.user_address as user_address,
    ub.usd_value - ut.usd_value as total_value,
    ub.pwrd_value - ut.pwrd_value as pwrd_value,
    ub.gvt_value - ut.gvt_value as gvt_value,
    (ub.usd_value - ut.usd_value) / ut.usd_value as total_ratio_value,
    (ub.pwrd_value - ut.pwrd_value) / ut.pwrd_value as pwrd_ratio_value,
    (ub.gvt_value - ut.gvt_value) / ut.gvt_value as gvt_ratio_value,
    now()::timestamp as creation_date
FROM (
        SELECT sum(t.usd_value) as usd_value,
            sum(t.pwrd_value) as pwrd_value,
            sum(t.gvt_value) as gvt_value,
            t.user_address as user_address,
            t.network_id as network_id
        FROM gro."USER_TRANSFERS" t
        WHERE TO_CHAR(block_date, 'DD/MM/YYYY') <= $1
        GROUP BY t.user_address,
            t.network_id
    ) ut,
    (
        SELECT b.usd_value as usd_value,
            b.pwrd_value as pwrd_value,
            b.gvt_value as gvt_value,
            b.user_address as user_address,
            b.balance_date as balance_date,
            b.network_id as network_id
        FROM gro."USER_BALANCES" b
        WHERE TO_CHAR(b.balance_date, 'DD/MM/YYYY') = $1
    ) ub
WHERE ut.user_address = ub.user_address
    AND ut.network_id = ub.network_id
    AND ut.user_address = $2;