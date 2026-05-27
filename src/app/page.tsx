"use client";

import { useEffect, useRef, useState } from "react";
import { CartBar } from "~/components/cart-bar";
import { ProductCard } from "~/components/product-card";
import { useCart } from "~/hooks/use-cart";
import { useCustomer } from "~/hooks/use-customer";
import { createSupabaseBrowserClient } from "~/lib/supabase";
import { api } from "~/trpc/react";

export default function HomePage() {
	const utils = api.useUtils();
	const { data: products, isLoading } = api.products.list.useQuery();
	const cart = useCart();
	const { customer, clearCustomer } = useCustomer();

	const [removedNotice, setRemovedNotice] = useState<string[]>([]);
	const cartItemsRef = useRef(cart.items);
	cartItemsRef.current = cart.items;

	const { data: myInterests } = api.interests.activeProductIds.useQuery(
		{ whatsapp: customer?.whatsapp ?? "" },
		{ enabled: !!customer },
	);
	const myInterestSet = new Set(myInterests ?? []);

	useEffect(() => {
		const supabase = createSupabaseBrowserClient();
		const channel = supabase
			.channel("store-products")
			.on(
				"postgres_changes",
				{ event: "*", schema: "public", table: "products" },
				() => {
					void utils.products.list.invalidate();
				},
			)
			.on(
				"postgres_changes",
				{ event: "*", schema: "public", table: "orders" },
				() => {
					void utils.products.list.invalidate();
				},
			)
			.subscribe();

		return () => {
			void supabase.removeChannel(channel);
		};
	}, [utils]);

	useEffect(() => {
		if (!products) return;
		const stockMap = new Map(products.map((p) => [p.id, p.availableStock]));
		const removed: string[] = [];
		for (const item of cartItemsRef.current) {
			const stock = stockMap.get(item.productId) ?? 0;
			if (stock === 0) {
				cart.removeItem(item.productId);
				removed.push(item.name);
			} else if (item.quantity > stock) {
				cart.updateQuantity(item.productId, stock);
			}
		}
		if (removed.length > 0) setRemovedNotice(removed);
	}, [products, cart.removeItem, cart.updateQuantity]);

	if (isLoading) {
		return (
			<main className="min-h-screen p-8">
				<p className="text-center text-gray-500">Carregando...</p>
			</main>
		);
	}

	const cartQuantityMap = new Map(
		cart.items.map((i) => [i.productId, i.quantity]),
	);

	return (
		<main className="min-h-screen p-6 pb-28">
			<div className="mb-8 flex flex-col items-center gap-1">
				<h1 className="text-center font-bold text-3xl text-gray-900">
					Nossa loja
				</h1>
				{customer && (
					<div className="flex items-center gap-2 text-gray-500 text-sm">
						<span>
							Olá, <strong>{customer.name}</strong>!
						</span>
						<button
							className="text-xs underline"
							onClick={clearCustomer}
							type="button"
						>
							Não é você?
						</button>
					</div>
				)}
			</div>
			{removedNotice.length > 0 && (
				<div className="mb-4 flex items-start justify-between rounded border border-amber-300 bg-amber-50 p-3 text-amber-800 text-sm">
					<span>
						{removedNotice.length === 1
							? `"${removedNotice[0]}" foi removido do carrinho pois esgotou.`
							: `${removedNotice.length} itens foram removidos do carrinho pois esgotaram.`}
					</span>
					<button
						aria-label="Fechar aviso"
						className="ml-4 shrink-0"
						onClick={() => setRemovedNotice([])}
						type="button"
					>
						✕
					</button>
				</div>
			)}
			<div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
				{products?.map((product) => (
					<ProductCard
						cartQuantity={cartQuantityMap.get(product.id) ?? 0}
						hasInterest={myInterestSet.has(product.id)}
						key={product.id}
						onAddToCart={cart.addItem}
						product={product}
					/>
				))}
			</div>
			<CartBar items={cart.items} total={cart.total} />
		</main>
	);
}
