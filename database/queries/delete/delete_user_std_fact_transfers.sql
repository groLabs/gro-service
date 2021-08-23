-- DELETE FROM gro."USER_TRANSFERS"
DELETE FROM gro."USER_STD_FACT_TRANSFERS"
WHERE date(transfer_date) >= $1
AND date(transfer_date) <= $2;