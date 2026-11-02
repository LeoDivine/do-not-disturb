import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSuperAdminUser } from "../../lib/auth";
import SuperadminDashboard from "../../components/admin/superadmin-dashboard";

export const metadata = {
	title: "Admin — Do Not Disturb",
	robots: {
		index: false,
		follow: false,
	},
};

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
