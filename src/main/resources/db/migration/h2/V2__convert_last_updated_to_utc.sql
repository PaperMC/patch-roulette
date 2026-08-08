-- Legacy LocalDateTime values are interpreted using the deployment timezone.
ALTER TABLE patch
    ALTER COLUMN last_updated TIMESTAMP(6) WITH TIME ZONE
    USING CAST(FORMATDATETIME(last_updated, 'yyyy-MM-dd HH:mm:ss.SSSSSS') || ' ${legacy_timezone}' AS TIMESTAMP(6) WITH TIME ZONE);
