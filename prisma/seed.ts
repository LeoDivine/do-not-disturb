import { prisma } from "../lib/prisma";

const DEFAULT_BLOCKLIST = [
  { url: "youtube.com", deflections: 0, active: true, icon: "video" },
  { url: "x.com", deflections: 0, active: true, icon: "hash" },
  { url: "reddit.com", deflections: 0, active: true, icon: "chat" },
  { url: "instagram.com", deflections: 0, active: true, icon: "camera" },
  { url: "news.ycombinator.com", deflections: 0, active: true, icon: "news" },
  { url: "netflix.com", deflections: 0, active: true, icon: "film" },
  { url: "tiktok.com", deflections: 0, active: true, icon: "music" },
  { url: "discord.com", deflections: 0, active: true, icon: "message" },
];

const DEFAULT_TAGS = [
  { name: "Deep Work", color: "#0f766e", icon: "brain" },
  { name: "Coding & Dev", color: "#0284c7", icon: "code" },
  { name: "Writing & Docs", color: "#ea580c", icon: "pen-tool" },
  { name: "Research", color: "#8b5cf6", icon: "search" },
  { name: "Admin & Planning", color: "#64748b", icon: "clipboard" },
];

async function main() {
  console.log("🌱 Seeding database...");

  // Seed default blocked websites
  for (const item of DEFAULT_BLOCKLIST) {
    const existing = await prisma.blockedWebsite.findFirst({
      where: { url: item.url },
    });

    if (!existing) {
      await prisma.blockedWebsite.create({
        data: item,
      });
      console.log(`  Added blocked website: ${item.url}`);
    }
  }

  // Seed default tags
  for (const tag of DEFAULT_TAGS) {
    const existing = await prisma.tag.findFirst({
      where: { name: tag.name },
    });

    if (!existing) {
      await prisma.tag.create({
        data: tag,
      });
      console.log(`  Added tag: ${tag.name}`);
    }
  }

  console.log("✅ Seeding complete!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
