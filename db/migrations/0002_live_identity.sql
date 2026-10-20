ALTER TABLE versions ADD COLUMN market TEXT;
ALTER TABLE previews ADD COLUMN client_tag TEXT;
CREATE UNIQUE INDEX preview_client_tag ON previews(client_tag);
ALTER TABLE attempts ADD COLUMN candidate_hash TEXT;
CREATE TABLE app_data_mode (singleton INTEGER PRIMARY KEY CHECK(singleton=1), mode TEXT NOT NULL CHECK(mode IN ('offline','testnet')));
