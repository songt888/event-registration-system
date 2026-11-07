-- Separate databases for integration tests and E2E (D-14). Runs only on first start of an empty volume.
CREATE DATABASE eventreg_test;
CREATE DATABASE eventreg_e2e;
