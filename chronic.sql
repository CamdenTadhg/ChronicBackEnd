\echo 'Delete and recreate chronic db?'
\prompt 'Return for yes or control-C to cancel > ' foo

DROP DATABASE chronic;
CREATE DATABASE chronic;
\connect chronic

\i chronic-schema.sql
\i chronic-seed.sql

\echo 'Delete and recreate chronic_test db?'
\prompt 'Return for yes or control-C to cancel > ' foo

DROP DATABASE chronic_test;
CREATE DATABASE chronic_test;
\connect chronic_test

\i chronic-schema.sql