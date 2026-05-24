"use client";

import { useEffect } from "react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "~/components/ui/table";
import { createSupabaseBrowserClient } from "~/lib/supabase";
import { api } from "~/trpc/react";

const statusLabel: Record<string, string> = {
	pending: "Pendente",
	confirmed: "Confirmado",
	cancelled: "Cancelado",
};

const statusVariant: Record<string, "default" | "secondary" | "destructive"> = {
	pending: "secondary",
	confirmed: "default",
	cancelled: "destructive",
};

export function OrdersTab() {
	const utils = api.useUtils();
	const { data: orders } = api.orders.list.useQuery();

	useEffect(() => {
		const supabase = createSupabaseBrowserClient();
		const channel = supabase
			.channel("admin-orders")
			.on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => {
				void utils.orders.list.invalidate();
			})
			.subscribe();

		return () => { void supabase.removeChannel(channel); };
	}, [utils]);
	const confirm = api.orders.confirm.useMutation({
		onSuccess: () => void utils.orders.list.invalidate(),
	});
	const cancel = api.orders.cancel.useMutation({
		onSuccess: () => void utils.orders.list.invalidate(),
	});

	return (
		<div className="flex flex-col gap-4">
			<h2 className="font-semibold text-xl">Pedidos</h2>
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>Data</TableHead>
						<TableHead>Cliente</TableHead>
						<TableHead>Itens</TableHead>
						<TableHead>Total</TableHead>
						<TableHead>Status</TableHead>
						<TableHead>Ações</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{orders?.map((o) => (
						<TableRow key={o.id}>
							<TableCell className="text-sm">
								{o.createdAt
									? new Date(o.createdAt).toLocaleDateString("pt-BR")
									: "—"}
							</TableCell>
							<TableCell>{o.customerName ?? "—"}</TableCell>
							<TableCell className="text-sm">
								{o.items
									.map((i) => `${i.quantity}x ${i.productName}`)
									.join(", ")}
							</TableCell>
							<TableCell>
								R$ {parseFloat(o.total).toFixed(2).replace(".", ",")}
							</TableCell>
							<TableCell>
								<Badge variant={statusVariant[o.status]}>
									{statusLabel[o.status]}
								</Badge>
							</TableCell>
							<TableCell className="flex gap-2">
								{o.status === "pending" && (
									<>
										<Button
											disabled={confirm.isPending}
											onClick={() => confirm.mutate({ id: o.id })}
											size="sm"
										>
											Confirmar
										</Button>
										<Button
											disabled={cancel.isPending}
											onClick={() => cancel.mutate({ id: o.id })}
											size="sm"
											variant="destructive"
										>
											Cancelar
										</Button>
									</>
								)}
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		</div>
	);
}
