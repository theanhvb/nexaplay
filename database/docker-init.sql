-- Docker/psql bootstrap. pgAdmin users should follow PGADMIN_GUIDE.md instead.
SELECT 'CREATE DATABASE identity_db' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname='identity_db')\gexec
SELECT 'CREATE DATABASE catalog_db' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname='catalog_db')\gexec
SELECT 'CREATE DATABASE engagement_db' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname='engagement_db')\gexec
SELECT 'CREATE DATABASE review_db' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname='review_db')\gexec
SELECT 'CREATE DATABASE billing_db' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname='billing_db')\gexec
SELECT 'CREATE DATABASE notification_db' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname='notification_db')\gexec
SELECT 'CREATE DATABASE analytics_db' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname='analytics_db')\gexec
\connect identity_db
\ir /database/01_identity.sql
\connect catalog_db
\ir /database/02_catalog.sql
\connect engagement_db
\ir /database/03_engagement.sql
\connect review_db
\ir /database/04_review.sql
\connect billing_db
\ir /database/05_billing.sql
\connect notification_db
\ir /database/06_notification.sql
\connect analytics_db
\ir /database/07_analytics.sql
