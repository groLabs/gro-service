select t."current_timestamp",
    t."current_date",
    t."network_id"
from gro."PROTOCOL_TVL" t,
    (
        select MAX("current_timestamp") as "max_date"
        from gro."PROTOCOL_TVL"
    ) m
where t."current_timestamp" = m."max_date";