"use client";

import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";

export type ProductFormValues = {
	name: string;
	description: string;
	price: string;
	quantity: number;
	imageUrl: string;
};

interface Props {
	initial?: Partial<ProductFormValues>;
	onSubmit: (values: ProductFormValues) => void;
	loading?: boolean;
	submitLabel?: string;
}

export function ProductForm({
	initial,
	onSubmit,
	loading,
	submitLabel = "Salvar",
}: Props) {
	const [values, setValues] = useState<ProductFormValues>({
		name: initial?.name ?? "",
		description: initial?.description ?? "",
		price: initial?.price ?? "",
		quantity: initial?.quantity ?? 0,
		imageUrl: initial?.imageUrl ?? "",
	});

	function set<K extends keyof ProductFormValues>(
		k: K,
		v: ProductFormValues[K],
	) {
		setValues((prev) => ({ ...prev, [k]: v }));
	}

	return (
		<form
			className="flex flex-col gap-4"
			onSubmit={(e) => {
				e.preventDefault();
				onSubmit(values);
			}}
		>
			<div>
				<Label htmlFor="name">Nome</Label>
				<Input
					id="name"
					onChange={(e) => set("name", e.target.value)}
					required
					value={values.name}
				/>
			</div>
			<div>
				<Label htmlFor="desc">Descrição</Label>
				<Textarea
					id="desc"
					onChange={(e) => set("description", e.target.value)}
					value={values.description}
				/>
			</div>
			<div>
				<Label htmlFor="price">Preço (ex: 6.50)</Label>
				<Input
					id="price"
					onChange={(e) => set("price", e.target.value)}
					pattern="\d+(\.\d{1,2})?"
					required
					value={values.price}
				/>
			</div>
			<div>
				<Label htmlFor="qty">Estoque</Label>
				<Input
					id="qty"
					min={0}
					onChange={(e) => set("quantity", parseInt(e.target.value, 10))}
					required
					type="number"
					value={values.quantity}
				/>
			</div>
			<div>
				<Label htmlFor="img">URL da imagem</Label>
				<Input
					id="img"
					onChange={(e) => set("imageUrl", e.target.value)}
					type="url"
					value={values.imageUrl}
				/>
			</div>
			<Button disabled={loading} type="submit">
				{loading ? "Salvando..." : submitLabel}
			</Button>
		</form>
	);
}
