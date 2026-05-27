"use client";

import Image from "next/image";
import { useState } from "react";
import { InterestModal } from "~/components/interest-modal";
import { Button } from "~/components/ui/button";
import type { CartItem } from "~/hooks/use-cart";

type Product = {
	id: string;
	name: string;
	description: string | null;
	price: string;
	availableStock: number;
	imageUrl: string | null;
	stockRestockedAt: Date | null;
};

interface Props {
	product: Product;
	onAddToCart: (item: Omit<CartItem, "quantity">) => void;
	hasInterest?: boolean;
	cartQuantity?: number;
}

function isRestocked(stockRestockedAt: Date | null): boolean {
	if (!stockRestockedAt) return false;
	const diff = Date.now() - new Date(stockRestockedAt).getTime();
	return diff < 24 * 60 * 60 * 1000;
}

export function ProductCard({
	product,
	onAddToCart,
	hasInterest,
	cartQuantity = 0,
}: Props) {
	const [modalOpen, setModalOpen] = useState(false);
	const restocked = isRestocked(product.stockRestockedAt);

	return (
		<>
			<div className="relative flex flex-col overflow-hidden rounded-lg border bg-white shadow-sm">
				{restocked && (
					<span className="absolute top-2 left-2 z-10 rounded-full bg-green-500 px-2 py-0.5 font-semibold text-white text-xs">
						Voltou!
					</span>
				)}
				{product.imageUrl && (
					<div className="relative h-48 w-full">
						<Image
							alt={product.name}
							className="object-cover"
							fill
							src={product.imageUrl}
						/>
					</div>
				)}
				<div className="flex flex-1 flex-col gap-2 p-4">
					<h3 className="font-semibold text-gray-900 text-lg">
						{product.name}
					</h3>
					{product.description && (
						<p className="text-gray-500 text-sm">{product.description}</p>
					)}
					<div className="flex justify-between">
						<p className="mt-auto font-bold text-2xl text-gray-900">
							R$ {parseFloat(product.price).toFixed(2).replace(".", ",")}
						</p>
						{product.availableStock >= 1 && product.availableStock <= 5 ? (
							<span className="inline-flex items-center gap-1 rounded-full border border-orange-400 bg-orange-100 px-3 py-1 font-semibold text-orange-700 text-sm">
								🔥{" "}
								{product.availableStock === 1
									? "Último disponível!"
									: `Corra! Apenas ${product.availableStock} disponíveis`}
							</span>
						) : product.availableStock > 5 ? (
							<span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 font-medium text-green-700 text-sm">
								✓ {product.availableStock} disponíveis
							</span>
						) : null}
					</div>
					{product.availableStock > 0 ? (
						<Button
							disabled={cartQuantity >= product.availableStock}
							onClick={() =>
								onAddToCart({
									productId: product.id,
									name: product.name,
									price: product.price,
								})
							}
						>
							Adicionar
						</Button>
					) : hasInterest ? (
						<Button
							className="text-muted-foreground"
							disabled
							variant="outline"
						>
							✓ Interesse registrado
						</Button>
					) : (
						<Button onClick={() => setModalOpen(true)} variant="outline">
							Quero esse item
						</Button>
					)}
				</div>
			</div>
			<InterestModal
				onClose={() => setModalOpen(false)}
				open={modalOpen}
				productId={product.id}
				productName={product.name}
			/>
		</>
	);
}
