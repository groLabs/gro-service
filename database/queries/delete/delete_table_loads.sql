DELETE FROM gro."SYS_USER_LOADS"
WHERE date("target_date") >= $1
AND date("target_date") <= $2;