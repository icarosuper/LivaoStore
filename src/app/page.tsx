"use client";

import { useEffect, useRef, useState } from "react";
import { HeartSprite, LeafSprite, StarSprite } from "~/app/_components/sprites";
import { CartBar } from "~/components/cart-bar";
import { ProductCard } from "~/components/product-card";
import { useCart } from "~/hooks/use-cart";
import { useCustomer } from "~/hooks/use-customer";
import { createSupabaseBrowserClient } from "~/lib/supabase";
import { api } from "~/trpc/react";

function StoreDivider() {
	return (
		<div className="my-5 flex items-center justify-center gap-2.5">
			<div
				className="h-0.5 max-w-20 flex-1"
				style={{
					background:
						"repeating-linear-gradient(to right, #f0c0aa 0px, #f0c0aa 6px, transparent 6px, transparent 10px)",
				}}
			/>
			<div className="flex items-center gap-2">
				<HeartSprite />
				<StarSprite />
				<LeafSprite />
			</div>
			<div
				className="h-0.5 max-w-20 flex-1"
				style={{
					background:
						"repeating-linear-gradient(to right, #f0c0aa 0px, #f0c0aa 6px, transparent 6px, transparent 10px)",
				}}
			/>
		</div>
	);
}

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
			<main className="flex min-h-screen flex-col items-center justify-center p-8">
				<p className="font-bold text-[#c4907a]">Carregando...</p>
			</main>
		);
	}

	const cartQuantityMap = new Map(
		cart.items.map((i) => [i.productId, i.quantity]),
	);

	return (
		<main className="min-h-screen p-6 pb-28">
			{/* Logo */}
			<header className="mb-2 flex flex-col items-center">
				<div className="text-center">
					<div
						style={{
							fontFamily: "var(--font-baloo), cursive",
							fontSize: "clamp(1.75rem, 6vw, 2.25rem)",
							fontWeight: 800,
							color: "#d96c4a",
							lineHeight: 1,
							letterSpacing: "-0.5px",
						}}
					>
						Livão<span style={{ color: "#3d1f14" }}>Store</span> 🍰
					</div>
					<span
						style={{
							fontFamily: "var(--font-nunito), sans-serif",
							fontSize: "9px",
							fontWeight: 700,
							color: "#c4907a",
							letterSpacing: "3px",
							textTransform: "uppercase",
							display: "block",
							marginTop: "-2px",
							paddingLeft: "2px",
						}}
					>
						doces artesanais
					</span>
				</div>
				{customer && (
					<div className="mt-3 flex items-center gap-2 text-[#8a5040] text-sm">
						<span>
							Olá, <strong>{customer.name}</strong>!
						</span>
						<button
							className="text-[#c4907a] text-xs underline"
							onClick={clearCustomer}
							type="button"
						>
							Não é você?
						</button>
					</div>
				)}
			</header>

			<StoreDivider />

			{/* Aviso de remoção */}
			{removedNotice.length > 0 && (
				<div className="mb-4 flex items-start justify-between rounded-lg border-2 border-[#f0c0aa] bg-[#fff8f4] p-3 text-[#8a5040] text-sm shadow-[4px_4px_0_#c4907a]">
					<span>
						{removedNotice.length === 1
							? `"${removedNotice[0]}" foi removido do carrinho pois esgotou.`
							: `${removedNotice.length} itens foram removidos do carrinho pois esgotaram.`}
					</span>
					<button
						aria-label="Fechar aviso"
						className="ml-4 shrink-0 text-[#c4907a]"
						onClick={() => setRemovedNotice([])}
						type="button"
					>
						✕
					</button>
				</div>
			)}

			{/* Título da seção */}
			<div className="mb-6 flex items-center justify-center gap-2">
				<StarSprite />
				<h1
					style={{
						fontFamily: "var(--font-baloo), cursive",
						fontWeight: 700,
						fontSize: "1.4rem",
						color: "#3d1f14",
					}}
				>
					Nossos doces
				</h1>
				<StarSprite />
			</div>

			{/* Grade de produtos */}
			{products && products.length === 0 ? (
				<div className="flex flex-col items-center gap-3 py-20 text-[#c4907a]">
					<span className="text-5xl">🍬</span>
					<p className="font-bold text-[#3d1f14] text-lg">
						Nenhum produto disponível no momento
					</p>
					<p className="text-[#8a5040] text-sm">
						Volte em breve para ver nossas novidades!
					</p>
				</div>
			) : (
				<div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
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
			)}

			<CartBar items={cart.items} total={cart.total} />
		</main>
	);
}
