-- Habilitar extensões necessárias para Lojeo
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Banco para testes paralelos (CI / Vitest)
SELECT 'CREATE DATABASE lojeo_test'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'lojeo_test')\gexec
