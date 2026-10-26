-- Persistent project invitations and user notifications.
-- Apply with `npx prisma db push` from backend-core, then run this file
-- for the partial unique index Prisma schema cannot express:
--   psql "$DATABASE_URL" -f prisma/migrations/20261026120000_invitations_and_notifications/migration.sql
-- The application also creates this index on startup.

CREATE UNIQUE INDEX IF NOT EXISTS project_invitations_one_pending
  ON project_invitations (project_id, recipient_email)
  WHERE status = 'pending';
