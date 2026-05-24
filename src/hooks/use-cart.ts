"use client";

import { useCallback, useState } from "react";

export type CartItem = {
	productId: string;
	name: string;
	price: string;
	quantity: number;
};

export function useCart() {
	const [items, setItems] = useState<CartItem[]>([]);

	const addItem = useCallback((product: Omit<CartItem, "quantity">) => {
		setItems((prev) => {
			const existing = prev.find((i) => i.productId === product.productId);
			if (existing) {
				return prev.map((i) =>
					i.productId === product.productId
						? { ...i, quantity: i.quantity + 1 }
						: i,
				);
			}
			return [...prev, { ...product, quantity: 1 }];
		});
	}, []);

	const removeItem = useCallback((productId: string) => {
		setItems((prev) => prev.filter((i) => i.productId !== productId));
	}, []);

	const updateQuantity = useCallback((productId: string, quantity: number) => {
		if (quantity <= 0) {
			setItems((prev) => prev.filter((i) => i.productId !== productId));
			return;
		}
		setItems((prev) =>
			prev.map((i) => (i.productId === productId ? { ...i, quantity } : i)),
		);
	}, []);

	const clear = useCallback(() => setItems([]), []);

	const total = items.reduce(
		(sum, i) => sum + parseFloat(i.price) * i.quantity,
		0,
	);

	return { items, addItem, removeItem, updateQuantity, clear, total };
}
