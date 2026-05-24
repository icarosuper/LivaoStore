"use client";

import { useState } from "react";
import { Button } from "~/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { api } from "~/trpc/react";

interface Props {
	productId: string;
	productName: string;
	open: boolean;
	onClose: () => void;
}

export function InterestModal({
	productId,
	productName,
	open,
	onClose,
}: Props) {
	const [name, setName] = useState("");
	const [whatsapp, setWhatsapp] = useState("");
	const [done, setDone] = useState(false);

	const register = api.interests.register.useMutation({
		onSuccess: () => setDone(true),
	});

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		register.mutate({ productId, customerName: name, whatsapp });
	}

	return (
		<Dialog onOpenChange={(o) => !o && onClose()} open={open}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Quero esse item</DialogTitle>
				</DialogHeader>
				{done ? (
					<p className="text-muted-foreground text-sm">
						Anotado! Você será avisado quando <strong>{productName}</strong>{" "}
						estiver disponível.
					</p>
				) : (
					<form className="flex flex-col gap-4" onSubmit={handleSubmit}>
						<p className="text-muted-foreground text-sm">
							Deixe seus dados para ser avisado quando{" "}
							<strong>{productName}</strong> voltar ao estoque.
						</p>
						<div>
							<Label htmlFor="name">Nome</Label>
							<Input
								id="name"
								onChange={(e) => setName(e.target.value)}
								required
								value={name}
							/>
						</div>
						<div>
							<Label htmlFor="whatsapp">WhatsApp (com DDD)</Label>
							<Input
								id="whatsapp"
								onChange={(e) => setWhatsapp(e.target.value)}
								placeholder="31999999999"
								required
								value={whatsapp}
							/>
						</div>
						<Button disabled={register.isPending} type="submit">
							{register.isPending ? "Salvando..." : "Quero ser avisado"}
						</Button>
					</form>
				)}
			</DialogContent>
		</Dialog>
	);
}
