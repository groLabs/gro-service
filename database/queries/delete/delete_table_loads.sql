DELETE FROM gro."SYS_TABLE_LOADS"
WHERE TO_CHAR(target_date, 'DD/MM/YYYY') >= $1
AND TO_CHAR(target_date, 'DD/MM/YYYY') <= $2;