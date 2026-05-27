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
		<div className="fixed right-0 bottom-0 left-0 z-40 flex items-center justify-between border-t bg-white px-6 py-4 shadow-xl">
			<span className="font-semibold">
				{count} {count === 1 ? "item" : "itens"} —{" "}
				<strong>R$ {total.toFixed(2).replace(".", ",")}</strong>
			</span>
			<Button onClick={() => router.push("/pedido")} size="lg">
				Ver pedido
			</Button>
		</div>
	);
}
