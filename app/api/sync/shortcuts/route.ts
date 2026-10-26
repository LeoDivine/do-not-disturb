import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { getCurrentUser } from "../../../../lib/auth";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Guest users save shortcuts to this device only." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { actionType, keys } = body as { actionType: string; keys: string[] };

    if (!actionType || !Array.isArray(keys)) {
      return NextResponse.json(
        { error: "actionType and keys array are required." },
        { status: 400 }
      );
    }

    const updated = await prisma.userShortcut.upsert({
      where: {
        userId_actionType: {
          userId: user.id,
          actionType,
        },
      },
      create: {
        userId: user.id,
        actionType,
        keys,
      },
      update: {
        keys,
      },
    });

    return NextResponse.json({ success: true, shortcut: updated });
  } catch (error) {
    console.error("Shortcut sync error:", error);
    return NextResponse.json(
      { error: "Failed to sync shortcut." },
      { status: 500 }
    );
  }
}
