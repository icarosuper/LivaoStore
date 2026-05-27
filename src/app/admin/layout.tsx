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
		<div className="min-h-screen bg-[#fef5f0]">
			<header className="flex items-center justify-between border-[#f0c0aa] border-b-2 bg-[#fff8f4] px-6 py-4 shadow-[0_2px_0_#f0c0aa]">
				<div>
					<span
						style={{
							fontFamily: "var(--font-baloo), cursive",
							fontWeight: 800,
							fontSize: "1.2rem",
							color: "#d96c4a",
						}}
					>
						Livão<span style={{ color: "#3d1f14" }}>Store</span>
					</span>
					<span
						style={{
							marginLeft: "0.5rem",
							fontSize: "0.75rem",
							fontWeight: 700,
							color: "#c4907a",
							letterSpacing: "2px",
							textTransform: "uppercase" as const,
						}}
					>
						admin
					</span>
				</div>
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
