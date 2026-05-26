"use client";

import { useEffect, useState } from "react";
import { Button } from "~/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { useCustomer } from "~/hooks/use-customer";
import { isValidBrazilianPhone } from "~/lib/phone";
import { api } from "~/trpc/react";

interface Props {
	productId: string;
	productName: string;
	open: boolean;
	onClose: () => void;
}

type Step = "phone" | "name" | "done";

export function InterestModal({
	productId,
	productName,
	open,
	onClose,
}: Props) {
	const { customer, saveCustomer } = useCustomer();
	const [step, setStep] = useState<Step>("phone");
	const [phone, setPhone] = useState("");
	const [name, setName] = useState("");
	const [phoneError, setPhoneError] = useState("");

	useEffect(() => {
		if (open) {
			setPhone(customer?.whatsapp ?? "");
			setName("");
			setStep("phone");
			setPhoneError("");
		}
	}, [open, customer?.whatsapp]);

	const utils = api.useUtils();

	const lookupQuery = api.interests.lookupCustomer.useQuery(
		{ whatsapp: phone },
		{ enabled: false, retry: false },
	);

	const register = api.interests.register.useMutation({
		onSuccess: () => {
			setStep("done");
			void utils.interests.activeProductIds.invalidate();
		},
	});

	async function handlePhoneContinue(e: React.FormEvent) {
		e.preventDefault();
		setPhoneError("");
		if (!isValidBrazilianPhone(phone)) {
			setPhoneError(
				"Número inválido. Informe um celular ou fixo brasileiro com DDD.",
			);
			return;
		}
		const result = await lookupQuery.refetch();
		if (result.data?.name) {
			saveCustomer({ name: result.data.name, whatsapp: phone });
			register.mutate({
				productId,
				customerName: result.data.name,
				whatsapp: phone,
			});
		} else {
			setStep("name");
		}
	}

	function handleNameSubmit(e: React.FormEvent) {
		e.preventDefault();
		const trimmed = name.trim();
		saveCustomer({ name: trimmed, whatsapp: phone });
		register.mutate({ productId, customerName: trimmed, whatsapp: phone });
	}

	const isPending = lookupQuery.isFetching || register.isPending;

	return (
		<Dialog onOpenChange={(o) => !o && onClose()} open={open}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Quero esse item</DialogTitle>
				</DialogHeader>

				{step === "phone" && (
					<form className="flex flex-col gap-4" onSubmit={handlePhoneContinue}>
						<p className="text-muted-foreground text-sm">
							Informe seu WhatsApp para ser avisado quando{" "}
							<strong>{productName}</strong> voltar ao estoque.
						</p>
						<div>
							<Label htmlFor="phone">WhatsApp (com DDD)</Label>
							<Input
								id="phone"
								inputMode="numeric"
								maxLength={13}
								onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
								placeholder="31999999999"
								required
								value={phone}
							/>
							{phoneError && (
								<p className="mt-1 text-red-600 text-xs">{phoneError}</p>
							)}
						</div>
						<Button disabled={isPending} type="submit">
							{isPending ? "Verificando..." : "Continuar"}
						</Button>
					</form>
				)}

				{step === "name" && (
					<form className="flex flex-col gap-4" onSubmit={handleNameSubmit}>
						<p className="text-muted-foreground text-sm">
							Qual é o seu nome?
						</p>
						<div>
							<Label htmlFor="name">Nome</Label>
							<Input
								id="name"
								maxLength={100}
								minLength={2}
								onChange={(e) => setName(e.target.value)}
								required
								value={name}
							/>
						</div>
						<Button disabled={register.isPending} type="submit">
							{register.isPending ? "Salvando..." : "Quero ser avisado"}
						</Button>
						<button
							className="text-muted-foreground text-xs underline"
							onClick={() => {
								setStep("phone");
								setPhoneError("");
							}}
							type="button"
						>
							Voltar
						</button>
					</form>
				)}

				{step === "done" && (
					<p className="text-muted-foreground text-sm">
						Anotado! Você será avisado quando <strong>{productName}</strong>{" "}
						estiver disponível.
					</p>
				)}
			</DialogContent>
		</Dialog>
	);
}
