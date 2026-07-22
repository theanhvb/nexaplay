import { PrismaClient } from "../generated/catalog/index.js";

const globalDatabase = globalThis as unknown as { catalogPrisma?: PrismaClient };

const catalogUrl = process.env.CATALOG_DATABASE_URL ?? process.env.DATABASE_URL ?? `postgresql://${encodeURIComponent(process.env.PGUSER ?? "postgres")}:${encodeURIComponent(process.env.PGPASSWORD ?? "12345")}@${process.env.PGHOST ?? "localhost"}:${process.env.PGPORT ?? "5432"}/catalog_db`;
export const catalogPrisma = globalDatabase.catalogPrisma ?? new PrismaClient({ datasourceUrl: catalogUrl });

if (process.env.NODE_ENV !== "production") globalDatabase.catalogPrisma = catalogPrisma;

export * from "../generated/catalog/index.js";
