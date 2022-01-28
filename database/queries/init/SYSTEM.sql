/****************************************************
                SYS_PROTOCOL_LOADS 
 ****************************************************/

CREATE TABLE IF NOT EXISTS gro."SYS_PROTOCOL_LOADS" (
    "table_name" character varying(256) NULL,
    "last_timestamp" integer NOT NULL,
    "network_id" integer,
    "update_date" timestamp(6) without time zone
) TABLESPACE pg_default;

ALTER TABLE gro."SYS_PROTOCOL_LOADS" OWNER to postgres;

INSERT INTO gro."SYS_PROTOCOL_LOADS"(
        "table_name",
        "last_timestamp",
        "network_id",
        "update_date"
    )
VALUES ('GRO_STATS', 1, 1, now()::timestamp);

INSERT INTO gro."SYS_PROTOCOL_LOADS"(
        "table_name",
        "last_timestamp",
        "network_id",
        "update_date"
    )
VALUES ('PRICE_CHECK', 1, 1, now()::timestamp);

/****************************************************
                SYS_USER_LOADS 
 ****************************************************/

CREATE TABLE gro."SYS_USER_LOADS" (
    "table_name" CHARACTER VARYING (50) NOT NULL,
    "network_id" INTEGER NULL,
    "target_date" TIMESTAMP (6) NULL,
    "records_loaded" INTEGER NULL,
    "creation_date" TIMESTAMP (6) NULL
) WITH (OIDS = FALSE);

ALTER TABLE gro."SYS_USER_LOADS" OWNER to postgres;

/****************************************************
                SYS_LBP_LOADS 
 ****************************************************/

CREATE TABLE gro."SYS_LBP_LOADS" (
    "table_name" CHARACTER VARYING (50) NOT NULL,
    "network_id" INTEGER NULL,
    "last_date" TIMESTAMP (6) NULL,
    "last_timestamp" INTEGER NOT NULL,
    "last_block" INTEGER NOT NULL,
    "records_loaded" INTEGER NULL,
    "creation_date" TIMESTAMP (6) NULL
) WITH (OIDS = FALSE);

ALTER TABLE gro."SYS_LBP_LOADS" OWNER to postgres;

/****************************************************
                SYS_DB_STATUS 
 ****************************************************/

CREATE TABLE gro."SYS_DB_STATUS" (
    "feature_id" SMALLINT NOT NULL,
    "status_id" SMALLINT NOT NULL,
    "update_date" TIMESTAMP (6) NULL,
    CONSTRAINT "SYS_DB_STATUS_pkey" PRIMARY KEY ("feature_id")
) WITH (OIDS = FALSE);

ALTER TABLE gro."SYS_DB_STATUS" OWNER to postgres;

INSERT INTO gro."SYS_DB_STATUS"("feature_id", "status_id", "update_date")
VALUES (1, 2, now()::timestamp);

INSERT INTO gro."SYS_DB_STATUS"("feature_id", "status_id", "update_date")
VALUES (2, 1, now()::timestamp);
