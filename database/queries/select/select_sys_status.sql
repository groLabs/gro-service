SELECT s."status_id" as "status_id",
    md."description" as "status_desc"
FROM gro."SYS_DB_STATUS" s,
    gro."MD_STATUS" md
WHERE s."feature_id" = $1
    AND s."status_id" = md."status_id";