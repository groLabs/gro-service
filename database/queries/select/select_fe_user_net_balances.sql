SELECT b.pwrd_value as "pwrd",
    b.gvt_value as "gvt",
    b.usd_value as "total"
FROM gro."USER_BALANCES" b
WHERE b.user_address = $1
    AND TO_CHAR(b.balance_date, 'DD/MM/YYYY') <= $2;