ALTER TABLE patch ADD COLUMN state_type VARCHAR(16);
ALTER TABLE patch ADD COLUMN started_at TIMESTAMP(6) WITH TIME ZONE;

UPDATE patch
SET state_type = CASE status
    WHEN 0 THEN 'AVAILABLE'
    WHEN 1 THEN 'WIP'
    WHEN 2 THEN 'DONE'
    ELSE 'AVAILABLE'
END;

-- Work start time was recorded in last_updated when work began.
UPDATE patch SET started_at = last_updated WHERE status = 1;

ALTER TABLE patch ALTER COLUMN state_type SET NOT NULL;
ALTER TABLE patch DROP COLUMN status;
