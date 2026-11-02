import { PrismaClient } from "@prisma/client";
import { seedDefaults } from "../src/lib/seed-data";

const db = new PrismaClient();

seedDefaults(db)
  .then(() => console.log("Seed lõpetatud"))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
