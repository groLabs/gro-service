INSERT INTO gro."USER_CACHE_FACT_NET_RETURNS" (
        "balance_date",
        "network_id",
        "user_address",
        "total_unstaked_value",
        "pwrd_unstaked_value",
        "gvt_unstaked_value",
        "creation_date"
    )
SELECT now()::timestamp as balance_date,
    ut.network_id as network_id,
    ut.user_address as user_address,
    CASE
        WHEN ut.total_unstaked_value IS NULL THEN 0
        ELSE ub.total_unstaked_value - ut.total_unstaked_value
    END as total_unstaked_value,
    CASE
        WHEN ut.pwrd_unstaked_value IS NULL THEN 0
        ELSE ub.pwrd_unstaked_value - ut.pwrd_unstaked_value
    END as pwrd_unstaked_value,
    CASE
        WHEN ut.gvt_unstaked_value IS NULL THEN 0
        ELSE ub.gvt_unstaked_value - ut.gvt_unstaked_value
    END as gvt_unstaked_value,
    now()::timestamp as creation_date --TODO: replace by moment() from node.js
FROM (
SELECT sum(ctt.total_unstaked_value) as total_unstaked_value,
            sum(ctt.pwrd_unstaked_value) as pwrd_unstaked_value,
            sum(ctt.gvt_unstaked_value) as gvt_unstaked_value,
            ctt.user_address as user_address,
            ctt.network_id as network_id
       FROM
       (SELECT t.usd_value as total_unstaked_value,
      		  t.pwrd_value as pwrd_unstaked_value,
       		  t.gvt_value as gvt_unstaked_value,
       		  t.user_address as user_address,
              t.network_id as network_id
        FROM gro."USER_STD_FACT_TRANSFERS" t
        WHERE t.user_address = $1
        UNION ALL
        SELECT ct.usd_value as total_unstaked_value,
      		  ct.pwrd_value as pwrd_unstaked_value,
       		  ct.gvt_value as gvt_unstaked_value,
       		  ct.user_address as user_address,
              ct.network_id as network_id
        FROM gro."USER_CACHE_FACT_TRANSFERS" ct
        WHERE ct.user_address = $1) ctt
        GROUP BY ctt.user_address, ctt.network_id
    ) ut
    LEFT JOIN (
                SELECT b.pwrd_unstaked_value + b.gvt_unstaked_value as total_unstaked_value,
            b.pwrd_unstaked_value as pwrd_unstaked_value,
            b.gvt_unstaked_value as gvt_unstaked_value,
            b.user_address as user_address,
            b.balance_date as balance_date,
            b.network_id as network_id
        FROM gro."USER_CACHE_FACT_V_BALANCES" b
        WHERE user_address = $1
     
    ) ub ON ut.user_address = ub.user_address
    AND ut.network_id = ub.network_id
    AND ut.user_address = $1;