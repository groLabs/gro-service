DELETE FROM gro."USER_APPROVALS"
WHERE date("approval_date") >= $1
AND date("approval_date") <= $2;