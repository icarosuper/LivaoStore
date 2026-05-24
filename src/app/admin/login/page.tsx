"use client";

import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { createSupabaseBrowserClient } from "~/lib/supabase";

export default function AdminLoginPage() {
	const [email, setEmail] = useState("");
	const [sent, setSent] = useState(false);
	const [loading, setLoading] = useState(false);

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setLoading(true);
		const supabase = createSupabaseBrowserClient();
		await supabase.auth.signInWithOtp({
			email,
			options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
		});
		setSent(true);
		setLoading(false);
	}

	return (
		<div className="flex min-h-screen items-center justify-center">
			<Card className="w-full max-w-sm">
				<CardHeader>
					<CardTitle>Acesso Admin</CardTitle>
				</CardHeader>
				<CardContent>
					{sent ? (
						<p className="text-muted-foreground text-sm">
							Link enviado para <strong>{email}</strong>. Verifique seu e-mail.
						</p>
					) : (
						<form className="flex flex-col gap-4" onSubmit={handleSubmit}>
							<div>
								<Label htmlFor="email">E-mail</Label>
								<Input
									id="email"
									onChange={(e) => setEmail(e.target.value)}
									placeholder="admin@exemplo.com"
									required
									type="email"
									value={email}
								/>
							</div>
							<Button disabled={loading} type="submit">
								{loading ? "Enviando..." : "Enviar link de acesso"}
							</Button>
						</form>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
