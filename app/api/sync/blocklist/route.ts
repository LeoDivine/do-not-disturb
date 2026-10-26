import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { getCurrentUser } from "../../../../lib/auth";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Guest users save blocklist to this device only." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { url, active, deflections, icon, action } = body as {
      url: string;
      active?: boolean;
      deflections?: number;
      icon?: string;
      action?: "delete" | "upsert";
    };

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    const cleanUrl = url.trim().toLowerCase();

    if (action === "delete") {
      await prisma.blockedWebsite.deleteMany({
        where: { userId: user.id, url: cleanUrl },
      });
      return NextResponse.json({ success: true, action: "deleted" });
    }

    const existing = await prisma.blockedWebsite.findFirst({
      where: { userId: user.id, url: cleanUrl },
    });

    if (existing) {
      const updated = await prisma.blockedWebsite.update({
        where: { id: existing.id },
        data: {
          active: active !== undefined ? active : existing.active,
          deflections: deflections !== undefined ? deflections : existing.deflections,
          icon: icon || existing.icon,
        },
      });
      return NextResponse.json({ success: true, item: updated });
    }

    const created = await prisma.blockedWebsite.create({
      data: {
        userId: user.id,
        url: cleanUrl,
        active: active !== undefined ? active : true,
        deflections: deflections || 0,
        icon: icon || "link",
      },
    });

    return NextResponse.json({ success: true, item: created });
  } catch (error) {
    console.error("Blocklist sync error:", error);
    return NextResponse.json(
      { error: "Failed to sync blocklist." },
      { status: 500 }
    );
  }
}
