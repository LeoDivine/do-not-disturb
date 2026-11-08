import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSuperAdminUser } from "../../lib/auth";
import SuperadminDashboard from "../../components/admin/superadmin-dashboard";
import { createPageMetadata } from "../../lib/seo/seo-config";

export const metadata = createPageMetadata("admin");

async function AdminGate() {
	const adminUser = await getSuperAdminUser();

	if (!adminUser) {
		redirect("/");
	}

	return (
		<SuperadminDashboard
			adminEmail={adminUser.email || ""}
			adminName={adminUser.name || "Superadmin"}
		/>
	);
}

export default function AdminPage() {
	return (
		<Suspense fallback={null}>
			<AdminGate />
		</Suspense>
	);
}
