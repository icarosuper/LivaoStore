"use client";

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
import { Switch } from "~/components/ui/switch";
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
	const { data: products } = api.products.adminList.useQuery();
	const { data: interestCounts } = api.interests.allCounts.useQuery();
	const [createOpen, setCreateOpen] = useState(false);
	const [editProduct, setEditProduct] = useState<ProductRow | null>(null);
	const [deleteId, setDeleteId] = useState<string | null>(null);
	const [interestProductId, setInterestProductId] = useState<string | null>(
		null,
	);

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
	});
	const del = api.products.delete.useMutation({
		onSuccess: () => {
			void utils.products.adminList.invalidate();
			setDeleteId(null);
		},
	});

	const { data: interests } = api.interests.listByProduct.useQuery(
		{ productId: interestProductId! },
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

	function InterestButton({ productId }: { productId: string }) {
		const c = countMap[productId];
		return (
			<Button
				onClick={() => setInterestProductId(productId)}
				size="sm"
				variant="outline"
			>
				Interessados ({c ?? 0})
			</Button>
		);
	}

	return (
		<div className="flex flex-col gap-4">
			<div className="flex items-center justify-between">
				<h2 className="font-semibold text-xl">Produtos</h2>
				<Button onClick={() => setCreateOpen(true)}>+ Novo produto</Button>
			</div>

			{/* Mobile cards */}
			<div className="flex flex-col gap-3 sm:hidden">
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
							<Switch
								checked={p.active}
								onCheckedChange={() => toggle.mutate({ id: p.id })}
							/>
						</div>
						<p className="text-sm text-muted-foreground">
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
							<InterestButton productId={p.id} />
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
							<TableHead>Preço</TableHead>
							<TableHead>Estoque</TableHead>
							<TableHead>Ativo</TableHead>
							<TableHead>Ações</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{products?.map((p) => (
							<TableRow key={p.id}>
								<TableCell>{p.name}</TableCell>
								<TableCell>
									R$ {parseFloat(p.price).toFixed(2).replace(".", ",")}
								</TableCell>
								<TableCell>
									{p.availableStock}/{p.quantity}
									{p.availableStock === 0 && (
										<Badge className="ml-2" variant="destructive">
											Esgotado
										</Badge>
									)}
								</TableCell>
								<TableCell>
									<Switch
										checked={p.active}
										onCheckedChange={() => toggle.mutate({ id: p.id })}
									/>
								</TableCell>
								<TableCell className="flex gap-2">
									<Button
										onClick={() => setEditProduct(p)}
										size="sm"
										variant="outline"
									>
										Editar
									</Button>
									<InterestButton productId={p.id} />
									<Button
										onClick={() => setDeleteId(p.id)}
										size="sm"
										variant="destructive"
									>
										Excluir
									</Button>
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
							onClick={() => deleteId && del.mutate({ id: deleteId })}
						>
							Excluir
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
					{interests?.length === 0 && (
						<p className="text-muted-foreground text-sm">
							Nenhum interessado ainda.
						</p>
					)}
					<div className="flex flex-col gap-2">
						{interests?.map((i) => (
							<div className="flex items-center justify-between" key={i.id}>
								<div>
									<p className="font-medium">{i.customerName}</p>
									<p className="text-muted-foreground text-sm">{i.whatsapp}</p>
								</div>
								<Button
									onClick={() =>
										window.open(
											`https://wa.me/${i.whatsapp}?text=${encodeURIComponent(`Olá ${i.customerName}! O produto que você se interessou voltou ao estoque. Acesse nossa loja para pedir!`)}`,
											"_blank",
										)
									}
									size="sm"
									variant="outline"
								>
									Avisar
								</Button>
							</div>
						))}
					</div>
				</DialogContent>
			</Dialog>
		</div>
	);
}
