UPDATE gro."SYS_PROTOCOL_LOAD"
SET last_timestamp = $1,
    update_date = $2
WHERE network_id = $3;