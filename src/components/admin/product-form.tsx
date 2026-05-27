"use client";

import { ImageIcon, Loader2, Upload, X } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { createSupabaseBrowserClient } from "~/lib/supabase";

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
	const [uploadingImage, setUploadingImage] = useState(false);
	const [uploadError, setUploadError] = useState<string | null>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);

	function set<K extends keyof ProductFormValues>(
		k: K,
		v: ProductFormValues[K],
	) {
		setValues((prev) => ({ ...prev, [k]: v }));
	}

	async function handleImageUpload(file: File) {
		setUploadError(null);
		setUploadingImage(true);
		try {
			const supabase = createSupabaseBrowserClient();
			const ext = file.name.split(".").pop() ?? "jpg";
			const path = `${crypto.randomUUID()}.${ext}`;
			const { error } = await supabase.storage
				.from("product-images")
				.upload(path, file);
			if (error) throw error;
			const { data } = supabase.storage
				.from("product-images")
				.getPublicUrl(path);
			set("imageUrl", data.publicUrl);
		} catch {
			setUploadError("Erro ao enviar imagem. Tente novamente.");
		} finally {
			setUploadingImage(false);
		}
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
			<div className="flex flex-col gap-2">
				<Label>Imagem</Label>
				<div className="flex items-center gap-3">
					<div className="flex h-20 w-20 flex-shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted">
						{values.imageUrl ? (
							<img
								alt="Preview"
								className="h-full w-full object-cover"
								src={values.imageUrl}
							/>
						) : (
							<ImageIcon className="h-8 w-8 text-muted-foreground" />
						)}
					</div>
					<div className="flex flex-col gap-2">
						<input
							accept="image/*"
							className="hidden"
							onChange={(e) => {
								const file = e.target.files?.[0];
								if (file) void handleImageUpload(file);
								e.target.value = "";
							}}
							ref={fileInputRef}
							type="file"
						/>
						<Button
							disabled={uploadingImage ?? loading}
							onClick={() => fileInputRef.current?.click()}
							size="sm"
							type="button"
							variant="outline"
						>
							{uploadingImage ? (
								<>
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									Enviando...
								</>
							) : (
								<>
									<Upload className="mr-2 h-4 w-4" />
									{values.imageUrl ? "Alterar imagem" : "Enviar imagem"}
								</>
							)}
						</Button>
						{values.imageUrl && (
							<Button
								className="text-destructive hover:text-destructive"
								disabled={uploadingImage ?? loading}
								onClick={() => set("imageUrl", "")}
								size="sm"
								type="button"
								variant="ghost"
							>
								<X className="mr-2 h-4 w-4" />
								Remover
							</Button>
						)}
					</div>
				</div>
				{uploadError && (
					<p className="text-destructive text-sm">{uploadError}</p>
				)}
			</div>
			<Button disabled={loading ?? uploadingImage} type="submit">
				{loading ? "Salvando..." : submitLabel}
			</Button>
		</form>
	);
}
