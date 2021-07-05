DELETE FROM gro."USER_APPROVALS"
WHERE TO_CHAR(approval_date, 'DD/MM/YYYY') >= $1
AND TO_CHAR(approval_date, 'DD/MM/YYYY') <= $2;