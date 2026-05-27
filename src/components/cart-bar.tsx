"use client";

import { useRouter } from "next/navigation";
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
		<div
			className="fixed right-0 bottom-0 left-0 z-40 flex items-center justify-between border-[#8b3a24] border-t-[2.5px] px-6 py-4"
			style={{
				backgroundColor: "#d96c4a",
				boxShadow: "0 -3px 0 #8b3a24",
			}}
		>
			<span className="font-bold text-[#fff5f0]">
				{count} {count === 1 ? "item" : "itens"} —{" "}
				<strong>R$ {total.toFixed(2).replace(".", ",")}</strong>
			</span>
			<button
				onClick={() => router.push("/pedido")}
				onMouseDown={(e) => {
					(e.currentTarget as HTMLButtonElement).style.transform =
						"translateY(3px)";
					(e.currentTarget as HTMLButtonElement).style.boxShadow = "none";
				}}
				onMouseLeave={(e) => {
					(e.currentTarget as HTMLButtonElement).style.transform = "";
					(e.currentTarget as HTMLButtonElement).style.boxShadow =
						"0 3px 0 rgba(0,0,0,0.2)";
				}}
				onMouseUp={(e) => {
					(e.currentTarget as HTMLButtonElement).style.transform = "";
					(e.currentTarget as HTMLButtonElement).style.boxShadow =
						"0 3px 0 rgba(0,0,0,0.2)";
				}}
				style={{
					backgroundColor: "rgba(255, 245, 240, 0.2)",
					border: "2px solid rgba(255, 245, 240, 0.4)",
					color: "#fff5f0",
					boxShadow: "0 3px 0 rgba(0,0,0,0.2)",
					borderRadius: "var(--radius)",
					padding: "0.4rem 1.25rem",
					fontWeight: 700,
					fontSize: "0.875rem",
					cursor: "pointer",
					transition: "transform 0.08s, box-shadow 0.08s",
				}}
				type="button"
			>
				Ver pedido
			</button>
		</div>
	);
}
