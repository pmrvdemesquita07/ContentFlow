import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const DEMO_USER_ID = "00000000-0000-0000-0000-000000000001";

async function main() {
  await prisma.user.upsert({
    where: { id: DEMO_USER_ID },
    update: {},
    create: { id: DEMO_USER_ID, email: "demo@contentflow.test", name: "Demo User" },
  });

  const workspace = await prisma.workspace.upsert({
    where: { id: "00000000-0000-0000-0000-000000000002" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000002",
      name: "Acme Studio",
      members: { create: { userId: DEMO_USER_ID, role: "owner" } },
    },
  });

  const brand = await prisma.brand.upsert({
    where: { id: "00000000-0000-0000-0000-000000000003" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000003",
      workspaceId: workspace.id,
      name: "Acme Coffee Co.",
    },
  });

  await prisma.content.createMany({
    skipDuplicates: true,
    data: [
      {
        id: "00000000-0000-0000-0000-000000000010",
        workspaceId: workspace.id,
        brandId: brand.id,
        createdBy: DEMO_USER_ID,
        title: "5 ways to brew cold brew at home",
        body: "A quick carousel walking through cold brew ratios.",
        type: "carousel",
        status: "idea",
        platforms: ["instagram"],
      },
      {
        id: "00000000-0000-0000-0000-000000000011",
        workspaceId: workspace.id,
        brandId: brand.id,
        createdBy: DEMO_USER_ID,
        title: "Behind the roast: a day in the roastery",
        body: "Reel following the beans from green to bag.",
        type: "reel",
        status: "idea",
        platforms: ["instagram", "tiktok"],
      },
      {
        id: "00000000-0000-0000-0000-000000000012",
        workspaceId: workspace.id,
        brandId: brand.id,
        createdBy: DEMO_USER_ID,
        title: "New seasonal blend announcement",
        body: "Draft caption for the autumn blend launch.",
        type: "post",
        status: "draft",
        platforms: ["instagram", "x"],
      },
      {
        id: "00000000-0000-0000-0000-000000000013",
        workspaceId: workspace.id,
        brandId: brand.id,
        createdBy: DEMO_USER_ID,
        title: "Weekend hours reminder",
        body: "Short post reminding followers of holiday hours.",
        type: "post",
        status: "scheduled",
        platforms: ["instagram"],
        scheduledAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3),
      },
      {
        id: "00000000-0000-0000-0000-000000000014",
        workspaceId: workspace.id,
        brandId: brand.id,
        createdBy: DEMO_USER_ID,
        title: "Barista tip: dialing in espresso",
        body: "Published last week, well received.",
        type: "video",
        status: "published",
        platforms: ["youtube"],
        publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5),
      },
    ],
  });

  console.log("Seeded demo workspace, brand, and content.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
