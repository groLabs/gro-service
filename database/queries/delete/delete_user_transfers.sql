DELETE FROM gro."USER_TRANSFERS"
WHERE TO_CHAR(transfer_date, 'DD/MM/YYYY') >= $1
AND TO_CHAR(transfer_date, 'DD/MM/YYYY') <= $2;