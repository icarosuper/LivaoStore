"use client";

import { useRouter } from "next/navigation";
import { Button } from "~/components/ui/button";
import type { CartItem } from "~/hooks/use-cart";

interface Props {
	items: CartItem[];
	total: number;
}

export function CartBar({ items, total }: Props) {
	const router = useRouter();
	const count = items.reduce((s, i) => s + i.quantity, 0);

	if (count === 0) return null;

	return (
		<div className="fixed right-0 bottom-0 left-0 flex items-center justify-between border-t bg-white p-4 shadow-lg">
			<span className="font-medium text-sm">
				{count} {count === 1 ? "item" : "itens"} —{" "}
				<strong>R$ {total.toFixed(2).replace(".", ",")}</strong>
			</span>
			<Button
				onClick={() => {
					if (typeof window !== "undefined") {
						sessionStorage.setItem("cart", JSON.stringify(items));
					}
					router.push("/pedido");
				}}
			>
				Ver pedido
			</Button>
		</div>
	);
}
