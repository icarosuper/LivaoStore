import type { CartItem } from "~/hooks/use-cart";

export function buildWhatsAppUrl(items: CartItem[], total: number): string {
	const number = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "";

	const lines = items
		.map(
			(i) =>
				`• ${i.quantity}x ${i.name} — R$ ${(parseFloat(i.price) * i.quantity).toFixed(2).replace(".", ",")}`,
		)
		.join("\n");

	const message = [
		"Olá! Gostaria de fazer um pedido:",
		"",
		lines,
		"",
		`Total: R$ ${total.toFixed(2).replace(".", ",")}`,
		"",
		"Vou pagar via Pix!",
	].join("\n");

	return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}
