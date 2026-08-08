-- Legacy LocalDateTime values are interpreted using the deployment timezone.
ALTER TABLE patch
    ALTER COLUMN last_updated TYPE TIMESTAMP(6) WITH TIME ZONE
    USING last_updated AT TIME ZONE '${legacy_timezone}';
