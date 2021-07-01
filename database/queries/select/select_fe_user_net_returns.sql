SELECT nr.pwrd_value as "return_pwrd",
    nr.gvt_value as "return_gvt",
    nr.usd_value as "return_total",
    nr.pwrd_ratio_value as "ratio_pwrd",
    nr.gvt_ratio_value as "ratio_gvt",
    nr.usd_ratio_value as "ratio_total"
FROM gro."USER_NET_RETURNS" nr
WHERE nr.user_address = $1
    AND TO_CHAR(nr.balance_date, 'DD/MM/YYYY') <= $2;