CREATE TABLE IF NOT EXISTS patch (
    minecraft_version VARCHAR(255) NOT NULL,
    path VARCHAR(1024) NOT NULL,
    status SMALLINT,
    responsible_user VARCHAR(255),
    last_updated TIMESTAMP(6),
    duration NUMERIC(21),
    PRIMARY KEY (minecraft_version, path)
);
