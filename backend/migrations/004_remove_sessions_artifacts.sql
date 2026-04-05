DROP TRIGGER IF EXISTS sessions_set_updated_at ON sessions;
DROP FUNCTION IF EXISTS cleanup_expired_sessions();
DROP TABLE IF EXISTS sessions;
