import { defineConfig } from "prisma/config";

// dotenv not imported here — dev uses local .env, CI/production platforms inject vars natively
// prisma generate does not connect to the DB so DATABASE_URL is not required at build time

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env["DATABASE_URL"] ?? "",
  },
});
