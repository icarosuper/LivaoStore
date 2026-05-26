"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "~/components/ui/button";
import { Separator } from "~/components/ui/separator";
import type { CartItem } from "~/hooks/use-cart";
import { generatePixQRCode } from "~/lib/pix";
import { buildWhatsAppUrl } from "~/lib/whatsapp";
import { api } from "~/trpc/react";

export default function PedidoPage() {
	const router = useRouter();
	const [items, setItems] = useState<CartItem[]>([]);
	const [qrUrl, setQrUrl] = useState<string | null>(null);
	const [confirmed, setConfirmed] = useState(false);
	const [errorMsg, setErrorMsg] = useState<string | null>(null);

	const createOrder = api.orders.create.useMutation();

	const total = items.reduce((s, i) => s + parseFloat(i.price) * i.quantity, 0);

	useEffect(() => {
		const raw = sessionStorage.getItem("cart");
		if (raw) setItems(JSON.parse(raw) as CartItem[]);
	}, []);

	if (items.length === 0) {
		return (
			<main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
				<p className="text-gray-500">Seu pedido está vazio.</p>
				<Button onClick={() => router.push("/")}>Voltar à loja</Button>
			</main>
		);
	}

	async function handleConfirm() {
		setErrorMsg(null);
		try {
			await createOrder.mutateAsync({
				total: total.toFixed(2),
				items: items.map((i) => ({
					productId: i.productId,
					quantity: i.quantity,
					unitPrice: i.price,
				})),
			});
			const url = await generatePixQRCode(total);
			setQrUrl(url);
			setConfirmed(true);
		} catch (err) {
			const msg =
				err instanceof Error
					? err.message
					: "Erro ao registrar pedido. Tente novamente.";
			setErrorMsg(msg);
		}
	}

	function handleWhatsApp() {
		window.open(buildWhatsAppUrl(items, total), "_blank");
	}

	function handleFinish() {
		sessionStorage.removeItem("cart");
		router.push("/");
	}

	return (
		<main className="mx-auto max-w-lg p-6">
			<h1 className="mb-6 font-bold text-2xl">Seu pedido</h1>

			<div className="flex flex-col gap-3">
				{items.map((item) => (
					<div className="flex justify-between text-sm" key={item.productId}>
						<span>
							{item.quantity}x {item.name}
						</span>
						<span>
							R${" "}
							{(parseFloat(item.price) * item.quantity)
								.toFixed(2)
								.replace(".", ",")}
						</span>
					</div>
				))}
			</div>

			<Separator className="my-4" />

			<div className="flex justify-between font-bold">
				<span>Total</span>
				<span>R$ {total.toFixed(2).replace(".", ",")}</span>
			</div>

			{!confirmed ? (
				<>
					{errorMsg && (
						<p className="mt-4 rounded border border-red-300 bg-red-50 p-3 text-red-700 text-sm">
							{errorMsg}
						</p>
					)}
					<Button
						className="mt-8 w-full"
						disabled={createOrder.isPending}
						onClick={handleConfirm}
					>
						{createOrder.isPending
							? "Registrando pedido..."
							: "Confirmar pedido"}
					</Button>
				</>
			) : (
				<div className="mt-8 flex flex-col items-center gap-6">
					{qrUrl && (
						<div className="flex flex-col items-center gap-2">
							<p className="font-medium text-gray-700">QR Code Pix</p>
							<p className="text-center text-gray-500 text-sm">
								Escaneie para pagar R$ {total.toFixed(2).replace(".", ",")}
							</p>
							<Image alt="QR Code Pix" height={200} src={qrUrl} width={200} />
						</div>
					)}

					<div className="flex w-full flex-col gap-3">
						<p className="text-center text-gray-500 text-sm">
							Entre em contato para garantir seu pedido
						</p>
						<Button className="w-full" onClick={handleWhatsApp}>
							Enviar pedido pelo WhatsApp
						</Button>
						<Button className="w-full" onClick={handleFinish} variant="outline">
							Concluir pedido
						</Button>
					</div>
				</div>
			)}
		</main>
	);
}
