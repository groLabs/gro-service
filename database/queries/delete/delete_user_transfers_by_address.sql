DELETE FROM gro."USER_TRANSFERS"
WHERE TO_CHAR(block_date, 'DD/MM/YYYY') = $1
    AND user_address = $2;