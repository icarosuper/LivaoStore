"use client";

import { useEffect } from "react";
import { CartBar } from "~/components/cart-bar";
import { ProductCard } from "~/components/product-card";
import { useCart } from "~/hooks/use-cart";
import { createSupabaseBrowserClient } from "~/lib/supabase";
import { api } from "~/trpc/react";

export default function HomePage() {
	const utils = api.useUtils();
	const { data: products, isLoading } = api.products.list.useQuery();
	const cart = useCart();

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

	if (isLoading) {
		return (
			<main className="min-h-screen p-8">
				<p className="text-center text-gray-500">Carregando...</p>
			</main>
		);
	}

	return (
		<main className="min-h-screen p-6 pb-28">
			<h1 className="mb-8 text-center font-bold text-3xl text-gray-900">
				Nossa loja
			</h1>
			<div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
				{products?.map((product) => (
					<ProductCard
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
