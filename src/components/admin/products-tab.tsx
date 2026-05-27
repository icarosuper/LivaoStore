"use client";

import { Bell, Loader2, PackagePlus, Pencil, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import {
	ProductForm,
	type ProductFormValues,
} from "~/components/admin/product-form";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Switch } from "~/components/ui/switch";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "~/components/ui/table";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "~/components/ui/tooltip";
import { createSupabaseBrowserClient } from "~/lib/supabase";
import { api } from "~/trpc/react";

type ProductRow = {
	id: string;
	name: string;
	description: string | null;
	price: string;
	quantity: number;
	availableStock: number;
	imageUrl: string | null;
	active: boolean;
	stockRestockedAt: Date | null;
};

export function ProductsTab() {
	const utils = api.useUtils();
	const { data: products, isLoading: productsLoading } =
		api.products.adminList.useQuery();
	const { data: interestCounts } = api.interests.allCounts.useQuery();
	const [createOpen, setCreateOpen] = useState(false);
	const [editProduct, setEditProduct] = useState<ProductRow | null>(null);
	const [deleteId, setDeleteId] = useState<string | null>(null);
	const [interestProductId, setInterestProductId] = useState<string | null>(
		null,
	);
	const [togglingId, setTogglingId] = useState<string | null>(null);
	const [notifyingInterestId, setNotifyingInterestId] = useState<string | null>(
		null,
	);
	const [addStockProductId, setAddStockProductId] = useState<string | null>(
		null,
	);
	const [addStockQty, setAddStockQty] = useState(1);

	const countMap = Object.fromEntries(
		interestCounts?.map((c) => [c.productId, c.count]) ?? [],
	);

	useEffect(() => {
		const supabase = createSupabaseBrowserClient();
		const channel = supabase
			.channel("admin-products")
			.on(
				"postgres_changes",
				{ event: "*", schema: "public", table: "products" },
				() => {
					void utils.products.adminList.invalidate();
				},
			)
			.on(
				"postgres_changes",
				{ event: "*", schema: "public", table: "orders" },
				() => {
					void utils.products.adminList.invalidate();
				},
			)
			.on(
				"postgres_changes",
				{ event: "*", schema: "public", table: "product_interests" },
				() => {
					void utils.interests.allCounts.invalidate();
					void utils.interests.listByProduct.invalidate();
				},
			)
			.subscribe();

		return () => {
			void supabase.removeChannel(channel);
		};
	}, [utils]);

	const create = api.products.create.useMutation({
		onSuccess: () => {
			void utils.products.adminList.invalidate();
			setCreateOpen(false);
		},
	});
	const update = api.products.update.useMutation({
		onSuccess: () => {
			void utils.products.adminList.invalidate();
			setEditProduct(null);
		},
	});
	const toggle = api.products.toggleActive.useMutation({
		onSuccess: () => void utils.products.adminList.invalidate(),
		onSettled: () => setTogglingId(null),
	});
	const del = api.products.delete.useMutation({
		onSuccess: () => {
			void utils.products.adminList.invalidate();
			setDeleteId(null);
		},
	});
	const addStock = api.products.addStock.useMutation({
		onSuccess: () => {
			void utils.products.adminList.invalidate();
			void utils.interests.allCounts.invalidate();
			setAddStockProductId(null);
			setAddStockQty(1);
		},
	});
	const markNotified = api.interests.markNotified.useMutation({
		onSuccess: () => void utils.interests.listByProduct.invalidate(),
		onSettled: () => setNotifyingInterestId(null),
	});

	function handleToggle(id: string) {
		setTogglingId(id);
		toggle.mutate({ id });
	}

	const { data: interests, isLoading: interestsLoading } =
		api.interests.listByProduct.useQuery(
			{ productId: interestProductId ?? "" },
			{ enabled: !!interestProductId },
		);

	function handleCreate(v: ProductFormValues) {
		create.mutate({
			...v,
			imageUrl: v.imageUrl || undefined,
			description: v.description || undefined,
		});
	}

	function handleUpdate(v: ProductFormValues) {
		if (!editProduct) return;
		update.mutate({
			id: editProduct.id,
			...v,
			imageUrl: v.imageUrl || null,
			description: v.description || undefined,
		});
	}

	return (
		<div className="flex flex-col gap-4">
			<div className="flex items-center justify-between">
				<h2 className="font-semibold text-xl">Produtos</h2>
				<Button onClick={() => setCreateOpen(true)}>+ Novo produto</Button>
			</div>

			{/* Mobile cards */}
			<div className="flex flex-col gap-3 sm:hidden">
				{productsLoading && (
					<div className="flex items-center justify-center py-8">
						<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
					</div>
				)}
				{products?.map((p) => (
					<div
						className="flex flex-col gap-3 rounded-lg border bg-white p-4"
						key={p.id}
					>
						<div className="flex items-start justify-between gap-2">
							<div>
								<p className="font-medium">{p.name}</p>
								<p className="font-bold text-gray-900">
									R$ {parseFloat(p.price).toFixed(2).replace(".", ",")}
								</p>
							</div>
							{togglingId === p.id ? (
								<Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
							) : (
								<Switch
									checked={p.active}
									onCheckedChange={() => handleToggle(p.id)}
								/>
							)}
						</div>
						<p className="text-muted-foreground text-sm">
							{p.availableStock}/{p.quantity} disponíveis
							{p.availableStock === 0 && (
								<Badge className="ml-2" variant="destructive">
									Esgotado
								</Badge>
							)}
						</p>
						<div className="flex flex-wrap gap-2">
							<Button
								onClick={() => setEditProduct(p)}
								size="sm"
								variant="outline"
							>
								Editar
							</Button>
							<Button
								onClick={() => setInterestProductId(p.id)}
								size="sm"
								variant="outline"
							>
								Interessados ({countMap[p.id] ?? 0})
							</Button>
							<Button
								onClick={() => {
									setAddStockQty(1);
									setAddStockProductId(p.id);
								}}
								size="sm"
								variant="outline"
							>
								Adicionar estoque
							</Button>
							<Button
								onClick={() => setDeleteId(p.id)}
								size="sm"
								variant="destructive"
							>
								Excluir
							</Button>
						</div>
					</div>
				))}
			</div>

			{/* Desktop table */}
			<div className="hidden sm:block">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Nome</TableHead>
							<TableHead className="text-center">Preço</TableHead>
							<TableHead className="text-center">Estoque</TableHead>
							<TableHead className="text-center">Ativo</TableHead>
							<TableHead className="text-center">Ações</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{productsLoading && (
							<TableRow>
								<TableCell className="py-8 text-center" colSpan={5}>
									<Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
								</TableCell>
							</TableRow>
						)}
						{products?.map((p) => (
							<TableRow key={p.id}>
								<TableCell>{p.name}</TableCell>
								<TableCell className="text-center">
									R$ {parseFloat(p.price).toFixed(2).replace(".", ",")}
								</TableCell>
								<TableCell className="text-center">
									{p.availableStock}/{p.quantity}
									{p.availableStock === 0 && (
										<Badge className="ml-2" variant="destructive">
											Esgotado
										</Badge>
									)}
								</TableCell>
								<TableCell className="text-center">
									{togglingId === p.id ? (
										<Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
									) : (
										<div className="flex justify-center">
											<Switch
												checked={p.active}
												onCheckedChange={() => handleToggle(p.id)}
											/>
										</div>
									)}
								</TableCell>
								<TableCell>
									<div className="flex items-center justify-center gap-1">
										<Tooltip>
											<TooltipTrigger
												className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md hover:bg-accent disabled:pointer-events-none disabled:opacity-50"
												onClick={() => setEditProduct(p)}
											>
												<Pencil className="h-4 w-4 text-muted-foreground" />
											</TooltipTrigger>
											<TooltipContent>Editar produto</TooltipContent>
										</Tooltip>

										<Tooltip>
											<TooltipTrigger
												className="inline-flex h-8 cursor-pointer items-center justify-center gap-1 rounded-md px-2 hover:bg-accent disabled:pointer-events-none disabled:opacity-50"
												onClick={() => setInterestProductId(p.id)}
											>
												<Bell className="h-4 w-4 text-amber-500" />
												{(countMap[p.id] ?? 0) > 0 && (
													<span className="font-medium text-amber-500 text-xs">
														{countMap[p.id]}
													</span>
												)}
											</TooltipTrigger>
											<TooltipContent>
												Interessados ({countMap[p.id] ?? 0})
											</TooltipContent>
										</Tooltip>

										<Tooltip>
											<TooltipTrigger
												className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md hover:bg-accent disabled:pointer-events-none disabled:opacity-50"
												onClick={() => {
													setAddStockQty(1);
													setAddStockProductId(p.id);
												}}
											>
												<PackagePlus className="h-4 w-4 text-green-600" />
											</TooltipTrigger>
											<TooltipContent>Adicionar estoque</TooltipContent>
										</Tooltip>

										<Tooltip>
											<TooltipTrigger
												className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md hover:bg-accent disabled:pointer-events-none disabled:opacity-50"
												onClick={() => setDeleteId(p.id)}
											>
												<Trash2 className="h-4 w-4 text-red-500" />
											</TooltipTrigger>
											<TooltipContent>Excluir produto</TooltipContent>
										</Tooltip>
									</div>
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</div>

			<Dialog onOpenChange={setCreateOpen} open={createOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Novo produto</DialogTitle>
					</DialogHeader>
					<ProductForm
						loading={create.isPending}
						onSubmit={handleCreate}
						submitLabel="Criar produto"
					/>
				</DialogContent>
			</Dialog>

			<Dialog
				onOpenChange={(o) => !o && setEditProduct(null)}
				open={!!editProduct}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Editar produto</DialogTitle>
					</DialogHeader>
					{editProduct && (
						<ProductForm
							initial={{
								name: editProduct.name,
								description: editProduct.description ?? "",
								price: editProduct.price,
								quantity: editProduct.quantity,
								imageUrl: editProduct.imageUrl ?? "",
							}}
							loading={update.isPending}
							onSubmit={handleUpdate}
						/>
					)}
				</DialogContent>
			</Dialog>

			<AlertDialog
				onOpenChange={(o) => !o && setDeleteId(null)}
				open={!!deleteId}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Excluir produto?</AlertDialogTitle>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancelar</AlertDialogCancel>
						<AlertDialogAction
							disabled={del.isPending}
							onClick={() => deleteId && del.mutate({ id: deleteId })}
						>
							{del.isPending ? "Excluindo..." : "Excluir"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			<Dialog
				onOpenChange={(o) => !o && setInterestProductId(null)}
				open={!!interestProductId}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Interessados</DialogTitle>
					</DialogHeader>
					{interestsLoading && (
						<div className="flex items-center justify-center py-4">
							<Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
						</div>
					)}
					{!interestsLoading && interests?.length === 0 && (
						<p className="text-muted-foreground text-sm">
							Nenhum interessado ainda.
						</p>
					)}
					<div className="flex flex-col gap-2">
						{interests?.map((i) => (
							<div className="flex items-center justify-between" key={i.id}>
								<div>
									<p
										className={
											i.notifiedAt
												? "font-medium text-muted-foreground"
												: "font-medium"
										}
									>
										{i.customerName}
									</p>
									<p className="text-muted-foreground text-sm">{i.whatsapp}</p>
								</div>
								<Button
									className={i.notifiedAt ? "text-muted-foreground" : ""}
									disabled={notifyingInterestId === i.id}
									onClick={() => {
										window.open(
											`https://wa.me/${i.whatsapp}?text=${encodeURIComponent(`Olá ${i.customerName}! O produto que você se interessou voltou ao estoque. Acesse nossa loja para pedir!`)}`,
											"_blank",
										);
										if (!i.notifiedAt) {
											setNotifyingInterestId(i.id);
											markNotified.mutate({ id: i.id });
										}
									}}
									size="sm"
									variant={i.notifiedAt ? "ghost" : "outline"}
								>
									{notifyingInterestId === i.id
										? "Avisando..."
										: i.notifiedAt
											? "✓ Avisado"
											: "Avisar"}
								</Button>
							</div>
						))}
					</div>
				</DialogContent>
			</Dialog>

			<AlertDialog
				onOpenChange={(o) => !o && setAddStockProductId(null)}
				open={!!addStockProductId}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Adicionar estoque</AlertDialogTitle>
					</AlertDialogHeader>
					<div className="py-2">
						<Label htmlFor="add-stock-qty">Quantidade a adicionar</Label>
						<Input
							disabled={addStock.isPending}
							id="add-stock-qty"
							min={1}
							onChange={(e) => setAddStockQty(parseInt(e.target.value, 10))}
							type="number"
							value={addStockQty}
						/>
						<p className="mt-2 text-muted-foreground text-xs">
							Isso irá arquivar os interesses da leva atual e marcar o produto
							como reposto.
						</p>
					</div>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancelar</AlertDialogCancel>
						<AlertDialogAction
							disabled={addStock.isPending || addStockQty < 1}
							onClick={() =>
								addStockProductId &&
								addStock.mutate({
									id: addStockProductId,
									quantity: addStockQty,
								})
							}
						>
							{addStock.isPending ? "Salvando..." : "Confirmar"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
