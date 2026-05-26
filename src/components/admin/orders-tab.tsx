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
import { buildCustomerWhatsAppUrl } from "~/lib/whatsapp";
import { createSupabaseBrowserClient } from "~/lib/supabase";
import { api } from "~/trpc/react";

const statusLabel: Record<string, string> = {
	pending: "Pendente",
	paid: "Pago",
	delivered: "Entregue",
	cancelled: "Cancelado",
};

const statusVariant: Record<
	string,
	"default" | "secondary" | "destructive" | "outline"
> = {
	pending: "secondary",
	paid: "default",
	delivered: "outline",
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

	const setStatus = api.orders.setStatus.useMutation({
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
								{o.whatsapp && (
									<a
										className="text-xs text-green-600 hover:underline"
										href={buildCustomerWhatsAppUrl(o.whatsapp)}
										rel="noreferrer"
										target="_blank"
									>
										{o.whatsapp}
									</a>
								)}
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
						<p className="text-muted-foreground text-sm">
							{o.items.map((i) => `${i.quantity}x ${i.productName}`).join(", ")}
						</p>
						<p className="font-bold">
							R$ {parseFloat(o.total).toFixed(2).replace(".", ",")}
						</p>
						{(o.status === "pending" || o.status === "paid") && (
							<div className="flex gap-2">
								{o.status === "pending" && (
									<Button
										className="flex-1"
										disabled={setStatus.isPending}
										onClick={() =>
											setStatus.mutate({ id: o.id, status: "paid" })
										}
										size="sm"
									>
										Marcar como Pago
									</Button>
								)}
								{o.status === "paid" && (
									<Button
										className="flex-1"
										disabled={setStatus.isPending}
										onClick={() =>
											setStatus.mutate({ id: o.id, status: "delivered" })
										}
										size="sm"
									>
										Marcar como Entregue
									</Button>
								)}
								<Button
									className="flex-1"
									disabled={setStatus.isPending}
									onClick={() =>
										setStatus.mutate({ id: o.id, status: "cancelled" })
									}
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
							<TableHead>WhatsApp</TableHead>
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
								<TableCell>
									{o.whatsapp ? (
										<a
											className="text-green-600 text-sm hover:underline"
											href={buildCustomerWhatsAppUrl(o.whatsapp)}
											rel="noreferrer"
											target="_blank"
										>
											{o.whatsapp}
										</a>
									) : (
										"—"
									)}
								</TableCell>
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
									{(o.status === "pending" || o.status === "paid") && (
										<div className="flex gap-2">
											{o.status === "pending" && (
												<Button
													className="flex-1"
													disabled={setStatus.isPending}
													onClick={() =>
														setStatus.mutate({ id: o.id, status: "paid" })
													}
													size="sm"
												>
													Marcar como Pago
												</Button>
											)}
											{o.status === "paid" && (
												<Button
													className="flex-1"
													disabled={setStatus.isPending}
													onClick={() =>
														setStatus.mutate({ id: o.id, status: "delivered" })
													}
													size="sm"
												>
													Marcar como Entregue
												</Button>
											)}
											<Button
												className="flex-1"
												disabled={setStatus.isPending}
												onClick={() =>
													setStatus.mutate({ id: o.id, status: "cancelled" })
												}
												size="sm"
												variant="destructive"
											>
												Cancelar
											</Button>
										</div>
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
