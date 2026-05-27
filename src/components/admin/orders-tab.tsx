"use client";

import { useEffect, useState } from "react";
import { ManualOrderDialog } from "~/components/admin/manual-order-dialog";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "~/components/ui/table";
import { createSupabaseBrowserClient } from "~/lib/supabase";
import { buildCustomerWhatsAppUrl } from "~/lib/whatsapp";
import { api } from "~/trpc/react";

const statusLabel: Record<string, string> = {
	pending: "Pendente",
	paid: "Pago",
	delivered: "Entregue",
	cancelled: "Cancelado",
};

const statusClassName: Record<string, string> = {
	pending: "bg-amber-100 text-amber-800 border-amber-200",
	paid: "bg-blue-100 text-blue-800 border-blue-200",
	delivered: "bg-green-100 text-green-800 border-green-200",
	cancelled: "bg-red-100 text-red-800 border-red-200",
};

const PAGE_SIZE = 20;

type Filters = {
	status: "" | "pending" | "paid" | "delivered" | "cancelled";
	customer: string;
	dateFrom: string;
	dateTo: string;
	sortField: "createdAt" | "total";
	sortDir: "asc" | "desc";
};

const DEFAULT_FILTERS: Filters = {
	status: "",
	customer: "",
	dateFrom: "",
	dateTo: "",
	sortField: "createdAt",
	sortDir: "desc",
};

export function OrdersTab() {
	const utils = api.useUtils();

	const [page, setPage] = useState(1);
	const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
	const [showManualOrder, setShowManualOrder] = useState(false);

	const { data } = api.orders.list.useQuery({
		page,
		pageSize: PAGE_SIZE,
		status: filters.status || undefined,
		customer: filters.customer || undefined,
		dateFrom: filters.dateFrom || undefined,
		dateTo: filters.dateTo || undefined,
		sortField: filters.sortField,
		sortDir: filters.sortDir,
	});

	const orders = data?.items ?? [];
	const totalPages = data?.totalPages ?? 1;
	const total = data?.total ?? 0;

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

	function setFilter<K extends keyof Filters>(k: K, v: Filters[K]) {
		setPage(1);
		setFilters((prev) => ({ ...prev, [k]: v }));
	}

	function clearFilters() {
		setPage(1);
		setFilters(DEFAULT_FILTERS);
	}

	const hasActiveFilters =
		filters.status !== "" ||
		filters.customer !== "" ||
		filters.dateFrom !== "" ||
		filters.dateTo !== "";

	const selectClass =
		"h-8 rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus:border-ring focus:ring-3 focus:ring-ring/50";

	return (
		<div className="flex flex-col gap-4">
			<div className="flex items-center justify-between gap-2">
				<h2 className="font-semibold text-xl">Pedidos</h2>
				<Button onClick={() => setShowManualOrder(true)} size="sm">
					+ Pedido manual
				</Button>
			</div>

			{/* Filter bar */}
			<div className="flex flex-wrap gap-2">
				<select
					className={selectClass}
					onChange={(e) =>
						setFilter("status", e.target.value as Filters["status"])
					}
					value={filters.status}
				>
					<option value="">Todos os status</option>
					<option value="pending">Pendente</option>
					<option value="paid">Pago</option>
					<option value="delivered">Entregue</option>
					<option value="cancelled">Cancelado</option>
				</select>

				<Input
					className="h-8 w-48"
					onChange={(e) => setFilter("customer", e.target.value)}
					placeholder="Cliente ou WhatsApp"
					value={filters.customer}
				/>

				<input
					className={selectClass}
					onChange={(e) => setFilter("dateFrom", e.target.value)}
					type="date"
					value={filters.dateFrom}
				/>
				<input
					className={selectClass}
					onChange={(e) => setFilter("dateTo", e.target.value)}
					type="date"
					value={filters.dateTo}
				/>

				<select
					className={selectClass}
					onChange={(e) => {
						const [field, dir] = e.target.value.split("-") as [
							"createdAt" | "total",
							"asc" | "desc",
						];
						setFilter("sortField", field);
						setFilter("sortDir", dir);
					}}
					value={`${filters.sortField}-${filters.sortDir}`}
				>
					<option value="createdAt-desc">Data (mais recente)</option>
					<option value="createdAt-asc">Data (mais antigo)</option>
					<option value="total-desc">Valor (maior)</option>
					<option value="total-asc">Valor (menor)</option>
				</select>

				{hasActiveFilters && (
					<Button onClick={clearFilters} size="sm" variant="ghost">
						Limpar filtros
					</Button>
				)}
			</div>

			{total > 0 && (
				<p className="text-muted-foreground text-xs">
					{total} pedido{total !== 1 ? "s" : ""}
				</p>
			)}

			{/* Mobile cards */}
			<div className="flex flex-col gap-3 sm:hidden">
				{orders.map((o) => (
					<div
						className="flex flex-col gap-3 rounded-lg border bg-white p-4"
						key={o.id}
					>
						<div className="flex items-start justify-between gap-2">
							<div>
								<p className="font-medium">{o.customerName ?? "—"}</p>
								{o.whatsapp && (
									<a
										className="text-green-600 text-xs hover:underline"
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
							<Badge className={statusClassName[o.status]} variant="outline">
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
				{orders.length === 0 && (
					<p className="text-center text-muted-foreground text-sm">
						Nenhum pedido encontrado.
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
						{orders.map((o) => (
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
									<Badge
										className={statusClassName[o.status]}
										variant="outline"
									>
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

			{/* Pagination */}
			{totalPages > 1 && (
				<div className="flex items-center justify-center gap-2">
					<Button
						disabled={page === 1}
						onClick={() => setPage((p) => p - 1)}
						size="sm"
						variant="outline"
					>
						Anterior
					</Button>
					<span className="text-muted-foreground text-sm">
						{page} / {totalPages}
					</span>
					<Button
						disabled={page >= totalPages}
						onClick={() => setPage((p) => p + 1)}
						size="sm"
						variant="outline"
					>
						Próxima
					</Button>
				</div>
			)}

			<ManualOrderDialog
				onOpenChange={setShowManualOrder}
				onSuccess={() => void utils.orders.list.invalidate()}
				open={showManualOrder}
			/>
		</div>
	);
}
