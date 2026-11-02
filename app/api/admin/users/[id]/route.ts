import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { getSuperAdminUser, isSuperAdminEmail } from "../../../../../lib/auth";

export async function DELETE(
	_req: NextRequest,
	context: { params: Promise<{ id: string }> }
) {
	try {
		const adminUser = await getSuperAdminUser();
		if (!adminUser) {
			return NextResponse.json(
				{ error: "Unauthorized. Superadmin access required." },
				{ status: 403 }
			);
		}

		const { id } = await context.params;
		if (!id) {
			return NextResponse.json(
				{ error: "Missing user ID." },
				{ status: 400 }
			);
		}

		if (id === adminUser.id) {
			return NextResponse.json(
				{ error: "You cannot delete your own Superadmin account." },
				{ status: 400 }
			);
		}

		const targetUser = await prisma.user.findUnique({
			where: { id },
			select: { id: true, email: true, name: true },
		});

		if (!targetUser) {
			return NextResponse.json(
				{ error: "User not found." },
				{ status: 404 }
			);
		}

		if (isSuperAdminEmail(targetUser.email)) {
			return NextResponse.json(
				{ error: "Cannot delete a protected Superadmin account." },
				{ status: 400 }
			);
		}

		// Delete focus sessions explicitly (FocusSession uses onDelete: SetNull in schema)
		// and then delete the user record (which cascades to settings, blocklist, streak, gamification, etc.)
		await prisma.$transaction([
			prisma.focusSession.deleteMany({ where: { userId: id } }),
			prisma.user.delete({ where: { id } }),
		]);

		return NextResponse.json({
			success: true,
			deletedUserId: id,
		});
	} catch (error) {
		console.error("Failed to delete user:", error);
		return NextResponse.json(
			{ error: "Failed to delete user account." },
			{ status: 500 }
		);
	}
}
