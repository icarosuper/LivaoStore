"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "~/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Separator } from "~/components/ui/separator";
import type { CartItem } from "~/hooks/use-cart";
import { useCustomer } from "~/hooks/use-customer";
import { isValidBrazilianPhone } from "~/lib/phone";
import { generatePixQRCode } from "~/lib/pix";
import { buildWhatsAppUrl } from "~/lib/whatsapp";
import { api } from "~/trpc/react";

export default function PedidoPage() {
	const router = useRouter();
	const [items, setItems] = useState<CartItem[]>([]);
	const [itemsLoaded, setItemsLoaded] = useState(false);
	const [reconciled, setReconciled] = useState(false);
	const [cartNotice, setCartNotice] = useState<string | null>(null);
	const [qrUrl, setQrUrl] = useState<string | null>(null);
	const [confirmed, setConfirmed] = useState(false);
	const [errorMsg, setErrorMsg] = useState<string | null>(null);

	const { customer, saveCustomer } = useCustomer();
	const [customerModalOpen, setCustomerModalOpen] = useState(false);
	const [modalStep, setModalStep] = useState<"phone" | "name">("phone");
	const [modalPhone, setModalPhone] = useState("");
	const [modalName, setModalName] = useState("");
	const [modalPhoneError, setModalPhoneError] = useState("");
	const [modalError, setModalError] = useState<string | null>(null);

	const utils = api.useUtils();
	const { data: products } = api.products.list.useQuery();
	const createOrder = api.orders.create.useMutation();

	const lookupQuery = api.interests.lookupCustomer.useQuery(
		{ whatsapp: modalPhone },
		{ enabled: false, retry: false },
	);

	const total = items.reduce((s, i) => s + parseFloat(i.price) * i.quantity, 0);

	const stockMap = new Map(
		products?.map((p) => [p.id, p.availableStock]) ?? [],
	);

	useEffect(() => {
		try {
			const raw = localStorage.getItem("livao_cart");
			if (raw) setItems(JSON.parse(raw) as CartItem[]);
		} catch {}
		setItemsLoaded(true);
	}, []);

	useEffect(() => {
		if (itemsLoaded && !confirmed) {
			localStorage.setItem("livao_cart", JSON.stringify(items));
		}
	}, [items, itemsLoaded, confirmed]);

	function handleQuantityChange(productId: string, delta: number) {
		setItems((prev) => {
			const item = prev.find((i) => i.productId === productId);
			if (!item) return prev;
			const maxStock =
				products?.find((p) => p.id === productId)?.availableStock ?? 0;
			const newQty = item.quantity + delta;
			if (newQty <= 0) return prev.filter((i) => i.productId !== productId);
			if (newQty > maxStock) return prev;
			return prev.map((i) =>
				i.productId === productId ? { ...i, quantity: newQty } : i,
			);
		});
	}

	function handleRemoveItem(productId: string) {
		setItems((prev) => prev.filter((i) => i.productId !== productId));
	}

	useEffect(() => {
		if (reconciled || !itemsLoaded || !products) return;
		const stockMap = new Map(products.map((p) => [p.id, p.availableStock]));
		const kept: CartItem[] = [];
		const removed: string[] = [];
		const adjusted: string[] = [];
		for (const item of items) {
			const stock = stockMap.get(item.productId) ?? 0;
			if (stock === 0) {
				removed.push(item.name);
			} else if (item.quantity > stock) {
				kept.push({ ...item, quantity: stock });
				adjusted.push(item.name);
			} else {
				kept.push(item);
			}
		}
		setItems(kept);
		setReconciled(true);
		const parts: string[] = [];
		if (removed.length > 0)
			parts.push(
				removed.length === 1
					? `"${removed[0]}" foi removido pois esgotou`
					: `${removed.length} itens foram removidos pois esgotaram`,
			);
		if (adjusted.length > 0)
			parts.push(
				adjusted.length === 1
					? `a quantidade de "${adjusted[0]}" foi reduzida ao máximo disponível`
					: `a quantidade de ${adjusted.length} itens foi reduzida ao máximo disponível`,
			);
		if (parts.length > 0) setCartNotice(`${parts.join(" e ")}.`);
	}, [products, items, itemsLoaded, reconciled]);

	if (!itemsLoaded) {
		return (
			<main className="flex min-h-screen flex-col items-center justify-center p-8">
				<p className="text-gray-500">Carregando...</p>
			</main>
		);
	}

	if (items.length === 0) {
		return (
			<main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
				{cartNotice && (
					<div className="w-full max-w-sm rounded border border-amber-300 bg-amber-50 p-3 text-amber-800 text-sm">
						{cartNotice}
					</div>
				)}
				<p className="text-gray-500">Seu pedido está vazio.</p>
				<Button onClick={() => router.push("/")}>Voltar à loja</Button>
			</main>
		);
	}

	async function handleConfirm(customerName: string, customerWhatsapp: string) {
		setErrorMsg(null);
		try {
			await createOrder.mutateAsync({
				customerName,
				whatsapp: customerWhatsapp,
				total: total.toFixed(2),
				items: items.map((i) => ({
					productId: i.productId,
					quantity: i.quantity,
					unitPrice: i.price,
				})),
			});
			const url = await generatePixQRCode(total);
			localStorage.removeItem("livao_cart");
			setQrUrl(url);
			setConfirmed(true);
		} catch (err) {
			const msg =
				err instanceof Error
					? err.message
					: "Erro ao registrar pedido. Tente novamente.";
			setErrorMsg(msg);
			setReconciled(false);
			void utils.products.list.invalidate();
		}
	}

	function handleConfirmClick() {
		if (customer) {
			void handleConfirm(customer.name, customer.whatsapp);
		} else {
			setModalStep("phone");
			setModalPhone("");
			setModalName("");
			setModalPhoneError("");
			setModalError(null);
			setCustomerModalOpen(true);
		}
	}

	async function handleModalPhoneContinue(e: React.FormEvent) {
		e.preventDefault();
		setModalPhoneError("");
		if (!isValidBrazilianPhone(modalPhone)) {
			setModalPhoneError(
				"Número inválido. Informe um celular ou fixo brasileiro com DDD.",
			);
			return;
		}
		const result = await lookupQuery.refetch();
		if (result.data?.name) {
			saveCustomer({ name: result.data.name, whatsapp: modalPhone });
			setCustomerModalOpen(false);
			await handleConfirm(result.data.name, modalPhone);
		} else {
			setModalStep("name");
		}
	}

	async function handleModalNameSubmit(e: React.FormEvent) {
		e.preventDefault();
		setModalError(null);
		if (modalName.trim().length < 2) {
			setModalError("Nome deve ter pelo menos 2 caracteres.");
			return;
		}
		saveCustomer({ name: modalName.trim(), whatsapp: modalPhone });
		setCustomerModalOpen(false);
		await handleConfirm(modalName.trim(), modalPhone);
	}

	function handleWhatsApp() {
		window.open(buildWhatsAppUrl(items, total), "_blank");
	}

	function handleFinish() {
		localStorage.removeItem("livao_cart");
		router.push("/");
	}

	return (
		<main className="mx-auto max-w-lg p-6">
			<h1 className="mb-6 font-bold text-2xl">Seu pedido</h1>

			{cartNotice && (
				<div className="mb-4 flex items-start justify-between rounded border border-amber-300 bg-amber-50 p-3 text-amber-800 text-sm">
					<span>{cartNotice}</span>
					<button
						className="ml-4 shrink-0"
						onClick={() => setCartNotice(null)}
						type="button"
					>
						✕
					</button>
				</div>
			)}

			<div className="flex flex-col gap-3">
				{items.map((item) => {
					const maxStock = stockMap.get(item.productId) ?? 0;
					const itemTotal = parseFloat(item.price) * item.quantity;
					const controlsDisabled = confirmed || createOrder.isPending;
					return (
						<div
							className="flex items-center gap-2 text-sm"
							key={item.productId}
						>
							<div className="flex items-center gap-1">
								<button
									aria-label={`Diminuir quantidade de ${item.name}`}
									className="flex h-6 w-6 items-center justify-center rounded border leading-none disabled:opacity-40"
									disabled={controlsDisabled}
									onClick={() => handleQuantityChange(item.productId, -1)}
									type="button"
								>
									−
								</button>
								<span className="w-6 text-center font-medium">
									{item.quantity}
								</span>
								<button
									aria-label={`Aumentar quantidade de ${item.name}`}
									className="flex h-6 w-6 items-center justify-center rounded border leading-none disabled:opacity-40"
									disabled={controlsDisabled || item.quantity >= maxStock}
									onClick={() => handleQuantityChange(item.productId, 1)}
									type="button"
								>
									+
								</button>
							</div>
							<span className="flex-1 truncate">{item.name}</span>
							<span className="shrink-0">
								R$ {itemTotal.toFixed(2).replace(".", ",")}
							</span>
							<button
								aria-label={`Remover ${item.name}`}
								className="shrink-0 text-gray-400 hover:text-red-500 disabled:opacity-40"
								disabled={controlsDisabled}
								onClick={() => handleRemoveItem(item.productId)}
								type="button"
							>
								✕
							</button>
						</div>
					);
				})}
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
						disabled={createOrder.isPending || !reconciled}
						onClick={handleConfirmClick}
					>
						{createOrder.isPending
							? "Registrando pedido..."
							: "Confirmar pedido"}
					</Button>
					<Button
						className="mt-2 w-full"
						disabled={createOrder.isPending}
						onClick={() => router.push("/")}
						variant="outline"
					>
						Voltar à loja
					</Button>
				</>
			) : (
				<div className="mt-8 flex flex-col gap-6">
					{qrUrl && (
						<div className="flex flex-col gap-3">
							<div className="flex items-center gap-2">
								<span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-900 font-bold text-white text-xs">
									1
								</span>
								<p className="font-medium text-gray-900">Pague via Pix</p>
							</div>
							<div className="flex flex-col items-center gap-2 rounded-lg border p-4">
								<p className="text-center text-gray-500 text-sm">
									Escaneie o QR Code para pagar R${" "}
									{total.toFixed(2).replace(".", ",")}
								</p>
								<Image alt="QR Code Pix" height={200} src={qrUrl} width={200} />
							</div>
						</div>
					)}

					<div className="flex flex-col gap-3">
						<div className="flex items-center gap-2">
							<span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-900 font-bold text-white text-xs">
								{qrUrl ? "2" : "1"}
							</span>
							<p className="font-medium text-gray-900">
								Envie o pedido pelo WhatsApp
							</p>
						</div>
						<p className="text-gray-500 text-sm">
							Confirme seu pedido e envie o comprovante de pagamento.
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

			<Dialog onOpenChange={setCustomerModalOpen} open={customerModalOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Seus dados</DialogTitle>
					</DialogHeader>

					{modalStep === "phone" && (
						<form
							className="flex flex-col gap-4"
							onSubmit={handleModalPhoneContinue}
						>
							<p className="text-muted-foreground text-sm">
								Informe seu WhatsApp para registrar o pedido.
							</p>
							<div>
								<Label htmlFor="modal-phone">WhatsApp (com DDD)</Label>
								<Input
									id="modal-phone"
									inputMode="numeric"
									maxLength={13}
									onChange={(e) =>
										setModalPhone(e.target.value.replace(/\D/g, ""))
									}
									placeholder="31999999999"
									required
									value={modalPhone}
								/>
								{modalPhoneError && (
									<p className="mt-1 text-red-600 text-xs">{modalPhoneError}</p>
								)}
							</div>
							<Button
								disabled={lookupQuery.isFetching || createOrder.isPending}
								type="submit"
							>
								{lookupQuery.isFetching || createOrder.isPending
									? "Verificando..."
									: "Continuar"}
							</Button>
						</form>
					)}

					{modalStep === "name" && (
						<form
							className="flex flex-col gap-4"
							onSubmit={handleModalNameSubmit}
						>
							<p className="text-muted-foreground text-sm">
								Qual é o seu nome?
							</p>
							<div>
								<Label htmlFor="modal-name">Nome</Label>
								<Input
									id="modal-name"
									maxLength={100}
									minLength={2}
									onChange={(e) => setModalName(e.target.value)}
									required
									value={modalName}
								/>
							</div>
							{modalError && (
								<p className="rounded border border-red-300 bg-red-50 p-3 text-red-700 text-sm">
									{modalError}
								</p>
							)}
							<Button disabled={createOrder.isPending} type="submit">
								{createOrder.isPending ? "Registrando pedido..." : "Confirmar"}
							</Button>
							<button
								className="text-muted-foreground text-xs underline"
								onClick={() => {
									setModalStep("phone");
									setModalPhoneError("");
									setModalError(null);
								}}
								type="button"
							>
								Voltar
							</button>
						</form>
					)}
				</DialogContent>
			</Dialog>
		</main>
	);
}
