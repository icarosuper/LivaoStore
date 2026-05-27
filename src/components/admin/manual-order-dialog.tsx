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

let rowCounter = 0;

interface ItemRow {
	uid: number;
	productId: string;
	quantity: number;
	unitPrice: string;
}

function newRow(): ItemRow {
	return { uid: ++rowCounter, productId: "", quantity: 1, unitPrice: "" };
}

interface Props {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSuccess: () => void;
}

export function ManualOrderDialog({ open, onOpenChange, onSuccess }: Props) {
	const { data: products } = api.products.adminList.useQuery(undefined, {
		enabled: open,
	});

	const [customerName, setCustomerName] = useState("");
	const [whatsapp, setWhatsapp] = useState("");
	const [rows, setRows] = useState<ItemRow[]>([newRow()]);
	const [error, setError] = useState("");

	const createManual = api.orders.createManual.useMutation({
		onSuccess: () => {
			onSuccess();
			reset();
		},
		onError: (e) => setError(e.message),
	});

	function reset() {
		setCustomerName("");
		setWhatsapp("");
		setRows([newRow()]);
		setError("");
	}

	function addRow() {
		setRows((prev) => [...prev, newRow()]);
	}

	function removeRow(uid: number) {
		setRows((prev) => prev.filter((r) => r.uid !== uid));
	}

	function updateRow(uid: number, patch: Partial<Omit<ItemRow, "uid">>) {
		setRows((prev) =>
			prev.map((r) => {
				if (r.uid !== uid) return r;
				const updated = { ...r, ...patch };
				if (patch.productId !== undefined) {
					const product = products?.find((p) => p.id === patch.productId);
					updated.unitPrice = product?.price ?? "";
				}
				return updated;
			}),
		);
	}

	const total = rows.reduce((acc, r) => {
		const price = parseFloat(r.unitPrice);
		return acc + (Number.isNaN(price) ? 0 : price * r.quantity);
	}, 0);

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setError("");

		const validItems = rows.filter(
			(r) => r.productId && r.quantity >= 1 && r.unitPrice,
		);
		if (validItems.length === 0) {
			setError("Adicione ao menos um item.");
			return;
		}

		createManual.mutate({
			customerName: customerName.trim() || undefined,
			whatsapp: whatsapp.trim() || undefined,
			items: validItems.map((r) => ({
				productId: r.productId,
				quantity: r.quantity,
				unitPrice: r.unitPrice,
			})),
		});
	}

	return (
		<Dialog onOpenChange={onOpenChange} open={open}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Pedido Manual</DialogTitle>
				</DialogHeader>

				<form className="flex flex-col gap-4" onSubmit={handleSubmit}>
					<div className="grid grid-cols-2 gap-3">
						<div>
							<Label htmlFor="manual-name">Nome do cliente</Label>
							<Input
								id="manual-name"
								onChange={(e) => setCustomerName(e.target.value)}
								placeholder="Opcional"
								value={customerName}
							/>
						</div>
						<div>
							<Label htmlFor="manual-wa">WhatsApp</Label>
							<Input
								id="manual-wa"
								onChange={(e) => setWhatsapp(e.target.value)}
								placeholder="Opcional"
								value={whatsapp}
							/>
						</div>
					</div>

					<div className="flex flex-col gap-2">
						<Label>Itens</Label>
						{rows.map((row) => (
							<div className="flex items-center gap-2" key={row.uid}>
								<select
									className="h-8 flex-1 rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus:border-ring focus:ring-3 focus:ring-ring/50"
									onChange={(e) =>
										updateRow(row.uid, { productId: e.target.value })
									}
									value={row.productId}
								>
									<option value="">Selecione...</option>
									{products
										?.filter((p) => p.active)
										.map((p) => (
											<option key={p.id} value={p.id}>
												{p.name} (est. {p.availableStock})
											</option>
										))}
								</select>
								<input
									className="h-8 w-16 rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus:border-ring focus:ring-3 focus:ring-ring/50"
									min={1}
									onChange={(e) =>
										updateRow(row.uid, {
											quantity: parseInt(e.target.value, 10) || 1,
										})
									}
									type="number"
									value={row.quantity}
								/>
								<Button
									disabled={rows.length === 1}
									onClick={() => removeRow(row.uid)}
									size="icon-sm"
									type="button"
									variant="ghost"
								>
									×
								</Button>
							</div>
						))}
						<Button
							className="self-start"
							onClick={addRow}
							size="sm"
							type="button"
							variant="outline"
						>
							+ Adicionar item
						</Button>
					</div>

					<p className="font-semibold text-sm">
						Total: R$ {total.toFixed(2).replace(".", ",")}
					</p>

					{error && (
						<p className="rounded bg-destructive/10 px-3 py-2 text-destructive text-sm">
							{error}
						</p>
					)}

					<Button disabled={createManual.isPending} type="submit">
						{createManual.isPending ? "Salvando..." : "Criar pedido"}
					</Button>
				</form>
			</DialogContent>
		</Dialog>
	);
}
