--DELETE FROM gro."CACHE_TMP_USER_DEPOSITS"
DELETE FROM gro."USER_CACHE_TMP_DEPOSITS"
WHERE user_address = $1;