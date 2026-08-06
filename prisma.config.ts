import "dotenv/config";
import { defineConfig } from "prisma/config";

/** Central Prisma CLI configuration for schema discovery, migrations, seeding, and Studio. */
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
});
