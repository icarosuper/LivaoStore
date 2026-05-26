"use client";

import { useEffect } from "react";
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

	if (isLoading) {
		return (
			<main className="min-h-screen p-8">
				<p className="text-center text-gray-500">Carregando...</p>
			</main>
		);
	}

	return (
		<main className="min-h-screen p-6 pb-28">
			<div className="mb-8 flex flex-col items-center gap-1">
				<h1 className="text-center font-bold text-3xl text-gray-900">
					Nossa loja
				</h1>
				{customer && (
					<div className="flex items-center gap-2 text-sm text-gray-500">
						<span>
							Olá, <strong>{customer.name}</strong>!
						</span>
						<button
							className="underline text-xs"
							onClick={clearCustomer}
							type="button"
						>
							Não é você?
						</button>
					</div>
				)}
			</div>
			<div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
				{products?.map((product) => (
					<ProductCard
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
