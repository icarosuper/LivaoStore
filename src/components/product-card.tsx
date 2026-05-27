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
	const outOfStock = product.availableStock === 0;

	return (
		<>
			<div
				className={`relative flex flex-col overflow-hidden rounded-lg border-[#f0c0aa] border-[2.5px] bg-[#fff8f4] shadow-[4px_4px_0_#c4907a] transition-all hover:-translate-x-px hover:-translate-y-px hover:shadow-[5px_5px_0_#c4907a]${outOfStock ? " opacity-70" : ""}`}
			>
				{/* Badges de estoque — absolutos, empilhados */}
				<div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
					{restocked && (
						<span className="inline-flex items-center gap-1 rounded-full border border-[#8b3a24] bg-[#d96c4a] px-2 py-0.5 font-bold text-[#fff5f0] text-xs">
							✦ Voltou!
						</span>
					)}
					{product.availableStock > 5 && (
						<span className="inline-flex items-center gap-1 rounded-full border border-[#86d4a8] bg-[#d1f0dc] px-2 py-0.5 font-bold text-[#1a6b35] text-xs">
							✓ {product.availableStock} disponíveis
						</span>
					)}
					{product.availableStock >= 1 && product.availableStock <= 5 && (
						<span className="inline-flex items-center gap-1 rounded-full border border-[#e8956a] bg-[#fce4da] px-2 py-0.5 font-bold text-[#6b2010] text-xs">
							🔥{" "}
							{product.availableStock === 1
								? "Último disponível!"
								: `Corra! Apenas ${product.availableStock} disponíveis`}
						</span>
					)}
				</div>

				{/* Área da imagem */}
				<div className="relative aspect-video w-full shrink-0 bg-gradient-to-br from-[#fce4da] to-[#f4a261]">
					{product.imageUrl ? (
						<Image
							alt={product.name}
							className="object-cover"
							fill
							src={product.imageUrl}
						/>
					) : (
						<div className="flex h-full items-center justify-center text-5xl">
							🍬
						</div>
					)}
				</div>

				{/* Corpo do card */}
				<div className="flex flex-1 flex-col gap-1.5 p-3">
					<h3 className="font-bold text-[#3d1f14] text-base leading-tight">
						{product.name}
					</h3>
					{product.description && (
						<p className="text-[#8a5040] text-sm leading-relaxed">
							{product.description}
						</p>
					)}
					<div className="mt-auto flex items-center justify-between pt-1">
						<p className="font-black text-xl text-[#d96c4a]">
							R$ {parseFloat(product.price).toFixed(2).replace(".", ",")}
						</p>
					</div>
					{product.availableStock > 0 ? (
						<Button
							className="w-full"
							disabled={cartQuantity >= product.availableStock}
							onClick={() =>
								onAddToCart({
									productId: product.id,
									name: product.name,
									price: product.price,
								})
							}
						>
							{cartQuantity >= product.availableStock
								? "Máximo no carrinho"
								: cartQuantity > 0
									? `Adicionar (${cartQuantity} no carrinho)`
									: "Adicionar"}
						</Button>
					) : hasInterest ? (
						<Button className="w-full" variant="done">
							✓ Interesse registrado
						</Button>
					) : (
						<Button
							className="w-full"
							onClick={() => setModalOpen(true)}
							variant="interest"
						>
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
