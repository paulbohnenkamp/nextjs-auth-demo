import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../lib/password";

const db = new PrismaClient();
const password = "DemoPassword1!";

/**
 * Idempotently creates the two documented local demonstration users.
 *
 * One user contains every field required by `isProfileComplete`; the other intentionally contains only
 * credentials so login enters onboarding. Both hashes are refreshed on repeat runs, while existing
 * profile data is preserved by the narrow `update` objects. The script disconnects Prisma in `finally`
 * so command-line execution exits cleanly after success or failure.
 */
async function main() {
  const passwordHash = await hashPassword(password);
  await db.user.upsert({
    where: { email: "complete@example.com" },
    update: { passwordHash },
    create: {
      email: "complete@example.com",
      passwordHash,
      firstName: "Complete",
      lastName: "User",
      country: "US",
      cellPhone: "3035550100",
      birthday: new Date("1990-01-15T00:00:00.000Z"),
      zipCode: "80202",
      termsAcceptedAt: new Date(),
    },
  });
  await db.user.upsert({
    where: { email: "incomplete@example.com" },
    update: { passwordHash },
    create: { email: "incomplete@example.com", passwordHash },
  });
  console.info(
    "Seeded complete@example.com and incomplete@example.com with password DemoPassword1!",
  );
}

main().finally(() => db.$disconnect());
