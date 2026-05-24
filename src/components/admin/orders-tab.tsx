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

const statusVariant: Record<string, "default" | "secondary" | "destructive"> =
	{
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
			.on(
				"postgres_changes",
				{ event: "*", schema: "public", table: "orders" },
				() => {
					void utils.orders.list.invalidate();
				},
			)
			.subscribe();

		return () => {
			void supabase.removeChannel(channel);
		};
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

			{/* Mobile cards */}
			<div className="flex flex-col gap-3 sm:hidden">
				{orders?.map((o) => (
					<div
						className="flex flex-col gap-3 rounded-lg border bg-white p-4"
						key={o.id}
					>
						<div className="flex items-start justify-between gap-2">
							<div>
								<p className="font-medium">{o.customerName ?? "—"}</p>
								<p className="text-muted-foreground text-xs">
									{o.createdAt
										? new Date(o.createdAt).toLocaleDateString("pt-BR")
										: "—"}
								</p>
							</div>
							<Badge variant={statusVariant[o.status]}>
								{statusLabel[o.status]}
							</Badge>
						</div>
						<p className="text-sm text-muted-foreground">
							{o.items.map((i) => `${i.quantity}x ${i.productName}`).join(", ")}
						</p>
						<p className="font-bold">
							R$ {parseFloat(o.total).toFixed(2).replace(".", ",")}
						</p>
						{o.status === "pending" && (
							<div className="flex gap-2">
								<Button
									className="flex-1"
									disabled={confirm.isPending}
									onClick={() => confirm.mutate({ id: o.id })}
									size="sm"
								>
									Confirmar
								</Button>
								<Button
									className="flex-1"
									disabled={cancel.isPending}
									onClick={() => cancel.mutate({ id: o.id })}
									size="sm"
									variant="destructive"
								>
									Cancelar
								</Button>
							</div>
						)}
					</div>
				))}
				{orders?.length === 0 && (
					<p className="text-center text-muted-foreground text-sm">
						Nenhum pedido ainda.
					</p>
				)}
			</div>

			{/* Desktop table */}
			<div className="hidden sm:block">
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
		</div>
	);
}
