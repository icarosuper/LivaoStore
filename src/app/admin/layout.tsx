"use client";

import { useRouter } from "next/navigation";
import { Button } from "~/components/ui/button";
import { createSupabaseBrowserClient } from "~/lib/supabase";

export default function AdminLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const router = useRouter();

	async function handleLogout() {
		const supabase = createSupabaseBrowserClient();
		await supabase.auth.signOut();
		router.push("/admin/login");
	}

	return (
		<div className="min-h-screen bg-gray-50">
			<header className="flex items-center justify-between border-b bg-white px-6 py-4">
				<h1 className="font-bold text-lg">LivaoStore Admin</h1>
				<Button onClick={handleLogout} size="sm" variant="outline">
					Sair
				</Button>
			</header>
			<main className="mx-auto max-w-5xl p-6">{children}</main>
		</div>
	);
}
