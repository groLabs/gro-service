INSERT INTO gro."USER_STD_FACT_NET_RETURNS" (
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
    ub.network_id as network_id,
    ub.user_address as user_address,
    CASE
        WHEN ut.usd_value IS NULL THEN 0
        ELSE ub.usd_value - ut.usd_value
    END as total_value,
    CASE
        WHEN ut.pwrd_value IS NULL THEN 0
        ELSE ub.pwrd_value - ut.pwrd_value
    END as pwrd_value,
    CASE
        WHEN ut.gvt_value IS NULL THEN 0
        ELSE ub.gvt_value - ut.gvt_value
    END as gvt_value,
    CASE
        WHEN ut.usd_value IS NULL
        OR ut.usd_value = 0 THEN 0
        ELSE (ub.usd_value - ut.usd_value) / ut.usd_value
    END as total_ratio_value,
    CASE
        WHEN ut.pwrd_value IS NULL
        OR ut.pwrd_value = 0 THEN 0
        ELSE(ub.pwrd_value - ut.pwrd_value) / ut.pwrd_value
    END as pwrd_ratio_value,
    CASE
        WHEN ut.gvt_value IS NULL
        OR ut.gvt_value = 0 THEN 0
        ELSE (ub.gvt_value - ut.gvt_value) / ut.gvt_value
    END as gvt_ratio_value,
    now()::timestamp as creation_date
FROM (
        SELECT b.usd_value as usd_value,
            b.pwrd_value as pwrd_value,
            b.gvt_value as gvt_value,
            b.user_address as user_address,
            b.balance_date as balance_date,
            b.network_id as network_id
        FROM gro."USER_STD_FACT_BALANCES" b
        WHERE date(b.balance_date) = $1
    ) ub
    LEFT JOIN (
        SELECT sum(t.usd_value) as usd_value,
            sum(t.pwrd_value) as pwrd_value,
            sum(t.gvt_value) as gvt_value,
            t.user_address as user_address,
            t.network_id as network_id
        FROM gro."USER_STD_FACT_TRANSFERS" t
        WHERE date(transfer_date) <= $1
        GROUP BY t.user_address,
            t.network_id
    ) ut ON ub.user_address = ut.user_address
    AND ub.network_id = ut.network_id;