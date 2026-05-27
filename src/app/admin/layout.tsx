"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import { createSupabaseBrowserClient } from "~/lib/supabase";

export default function AdminLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const router = useRouter();
	const [loggingOut, setLoggingOut] = useState(false);

	async function handleLogout() {
		setLoggingOut(true);
		const supabase = createSupabaseBrowserClient();
		await supabase.auth.signOut();
		router.push("/admin/login");
	}

	return (
		<div className="min-h-screen bg-gray-50">
			<header className="flex items-center justify-between border-b bg-white px-6 py-4">
				<h1 className="font-bold text-lg">LivaoStore Admin</h1>
				<Button
					disabled={loggingOut}
					onClick={handleLogout}
					size="sm"
					variant="outline"
				>
					{loggingOut ? "Saindo..." : "Sair"}
				</Button>
			</header>
			<main className="mx-auto max-w-5xl p-6">{children}</main>
		</div>
	);
}
