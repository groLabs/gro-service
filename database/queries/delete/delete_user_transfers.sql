DELETE FROM gro."USER_TRANSFERS"
WHERE date("transfer_date") >= $1
AND date("transfer_date") <= $2
AND "network_id" = $3;