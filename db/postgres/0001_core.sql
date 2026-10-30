CREATE TABLE app_data_mode (singleton INTEGER PRIMARY KEY CHECK(singleton=1), mode TEXT NOT NULL CHECK(mode IN ('offline','testnet')));
--> statement-breakpoint
CREATE TABLE plans (id TEXT PRIMARY KEY, owner TEXT NOT NULL, mode TEXT NOT NULL CHECK(mode IN ('offline','testnet')), current_version INTEGER NOT NULL CHECK(current_version>0), root_id TEXT NOT NULL REFERENCES plans(id), source_version TEXT, source_publication TEXT, depth INTEGER NOT NULL CHECK(depth IN (0,1)), created_at BIGINT NOT NULL, CHECK((depth=0 AND source_version IS NULL AND source_publication IS NULL) OR (depth=1 AND source_version IS NOT NULL AND source_publication IS NOT NULL)));
--> statement-breakpoint
CREATE INDEX plans_owner_mode ON plans(owner,mode,created_at);
--> statement-breakpoint
CREATE TABLE versions (id TEXT PRIMARY KEY, plan_id TEXT NOT NULL REFERENCES plans(id), version INTEGER NOT NULL CHECK(version>0), data TEXT NOT NULL, market TEXT NOT NULL, hash TEXT NOT NULL, created_at BIGINT NOT NULL, UNIQUE(id,plan_id));
--> statement-breakpoint
CREATE UNIQUE INDEX version_number ON versions(plan_id,version);
--> statement-breakpoint
CREATE FUNCTION reject_immutable_change() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Versions and evidence identities are append-only'; END $$;
--> statement-breakpoint
CREATE TRIGGER immutable_version_update BEFORE UPDATE OR DELETE ON versions FOR EACH ROW EXECUTE FUNCTION reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER immutable_data_mode BEFORE UPDATE OR DELETE ON app_data_mode FOR EACH ROW EXECUTE FUNCTION reject_immutable_change();
--> statement-breakpoint
CREATE TABLE previews (id TEXT PRIMARY KEY, owner TEXT NOT NULL, version_id TEXT NOT NULL REFERENCES versions(id), data TEXT NOT NULL, client_tag TEXT, expires_at BIGINT NOT NULL, UNIQUE(id,version_id,owner));
--> statement-breakpoint
CREATE UNIQUE INDEX preview_client_tag ON previews(client_tag);
--> statement-breakpoint
CREATE TABLE attempts (id TEXT PRIMARY KEY, owner TEXT NOT NULL, plan_id TEXT NOT NULL REFERENCES plans(id), version_id TEXT NOT NULL REFERENCES versions(id), preview_id TEXT NOT NULL REFERENCES previews(id), payload_hash TEXT NOT NULL, context_hash TEXT NOT NULL, candidate_hash TEXT, data TEXT NOT NULL, created_at BIGINT NOT NULL, FOREIGN KEY(version_id,plan_id) REFERENCES versions(id,plan_id), FOREIGN KEY(preview_id,version_id,owner) REFERENCES previews(id,version_id,owner));
--> statement-breakpoint
CREATE UNIQUE INDEX one_request_per_version ON attempts(version_id);
--> statement-breakpoint
CREATE UNIQUE INDEX one_request_per_preview ON attempts(preview_id);
--> statement-breakpoint
CREATE INDEX attempts_plan ON attempts(plan_id);
--> statement-breakpoint
CREATE TRIGGER immutable_attempt_identity BEFORE UPDATE OF id,owner,plan_id,version_id,preview_id,payload_hash,context_hash,created_at ON attempts FOR EACH ROW EXECUTE FUNCTION reject_immutable_change();
--> statement-breakpoint
CREATE TABLE observations (id TEXT PRIMARY KEY, attempt_id TEXT NOT NULL REFERENCES attempts(id), data TEXT NOT NULL, created_at BIGINT NOT NULL);
--> statement-breakpoint
CREATE TRIGGER immutable_observation BEFORE UPDATE OR DELETE ON observations FOR EACH ROW EXECUTE FUNCTION reject_immutable_change();
--> statement-breakpoint
CREATE TABLE publications (id TEXT PRIMARY KEY, owner TEXT NOT NULL, version_id TEXT NOT NULL REFERENCES versions(id), fields TEXT NOT NULL, revision INTEGER NOT NULL CHECK(revision>0), active BOOLEAN NOT NULL, updated_at BIGINT NOT NULL);
--> statement-breakpoint
CREATE UNIQUE INDEX one_publication_per_version ON publications(version_id);
--> statement-breakpoint
ALTER TABLE plans ADD FOREIGN KEY(source_version) REFERENCES versions(id);
--> statement-breakpoint
ALTER TABLE plans ADD FOREIGN KEY(source_publication) REFERENCES publications(id);
--> statement-breakpoint
CREATE TABLE sessions (token_hash TEXT PRIMARY KEY, owner TEXT NOT NULL, mode TEXT NOT NULL CHECK(mode IN ('offline','testnet')), csrf TEXT NOT NULL, expires_at BIGINT NOT NULL);
--> statement-breakpoint
CREATE INDEX sessions_expiry ON sessions(expires_at);
--> statement-breakpoint
CREATE TABLE challenges (nonce TEXT PRIMARY KEY, address TEXT NOT NULL, message TEXT NOT NULL, domain TEXT NOT NULL, expires_at BIGINT NOT NULL, used BOOLEAN NOT NULL);
--> statement-breakpoint
CREATE INDEX challenges_expiry ON challenges(expires_at);
--> statement-breakpoint
CREATE TABLE rate_limits (key TEXT PRIMARY KEY, count INTEGER NOT NULL CHECK(count>0), until BIGINT NOT NULL);
