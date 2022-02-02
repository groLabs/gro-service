SELECT vb."user_address" as "address",
    SUM(vb."amount") as amount
FROM gro."USER_VESTING_BONUS" vb
WHERE vb."user_address" = $1
GROUP BY vb."user_address";