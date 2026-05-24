import { TRPCError } from "@trpc/server";
import { eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import {
	adminProcedure,
	createTRPCRouter,
	publicProcedure,
} from "~/server/api/trpc";
import { orderItems, orders, products } from "~/server/db/schema";

const orderItemSchema = z.object({
	productId: z.string().uuid(),
	quantity: z.number().int().min(1),
	unitPrice: z.string().regex(/^\d+(\.\d{1,2})?$/),
});

export const ordersRouter = createTRPCRouter({
	create: publicProcedure
		.input(
			z.object({
				customerName: z.string().optional(),
				whatsapp: z.string().optional(),
				total: z.string().regex(/^\d+(\.\d{1,2})?$/),
				items: z.array(orderItemSchema).min(1),
			}),
		)
		.output(z.object({ id: z.string().uuid() }))
		.mutation(async ({ ctx, input }) => {
			return ctx.db.transaction(async (tx) => {
				const productIds = input.items.map((i) => i.productId);

				// Lock rows to prevent concurrent overselling
				const productRows = await tx
					.select({
						id: products.id,
						name: products.name,
						quantity: products.quantity,
					})
					.from(products)
					.where(inArray(products.id, productIds))
					.for("update");

				for (const item of input.items) {
					const product = productRows.find((p) => p.id === item.productId);
					if (!product || product.quantity < item.quantity) {
						throw new TRPCError({
							code: "BAD_REQUEST",
							message: `Estoque insuficiente para ${product?.name ?? "produto"}`,
						});
					}
				}

				for (const item of input.items) {
					await tx
						.update(products)
						.set({ quantity: sql`quantity - ${item.quantity}` })
						.where(eq(products.id, item.productId));
				}

				const [order] = await tx
					.insert(orders)
					.values({
						customerName: input.customerName ?? null,
						whatsapp: input.whatsapp ?? null,
						total: input.total,
						status: "pending",
					})
					.returning({ id: orders.id });

				await tx.insert(orderItems).values(
					input.items.map((item) => ({
						orderId: order!.id,
						productId: item.productId,
						quantity: item.quantity,
						unitPrice: item.unitPrice,
					})),
				);

				return order!;
			});
		}),

	list: adminProcedure
		.output(
			z.array(
				z.object({
					id: z.string().uuid(),
					createdAt: z.date().nullable(),
					status: z.enum(["pending", "paid", "delivered", "cancelled"]),
					customerName: z.string().nullable(),
					whatsapp: z.string().nullable(),
					total: z.string(),
					items: z.array(
						z.object({
							id: z.string().uuid(),
							productId: z.string().uuid(),
							productName: z.string(),
							quantity: z.number(),
							unitPrice: z.string(),
						}),
					),
				}),
			),
		)
		.query(async ({ ctx }) => {
			const orderRows = await ctx.db.query.orders.findMany({
				orderBy: (o, { desc }) => [desc(o.createdAt)],
				with: {
					items: {
						with: { product: { columns: { name: true } } },
					},
				},
			});

			return orderRows.map((o) => ({
				id: o.id,
				createdAt: o.createdAt,
				status: o.status,
				customerName: o.customerName,
				whatsapp: o.whatsapp,
				total: o.total,
				items: o.items.map((i) => ({
					id: i.id,
					productId: i.productId,
					productName: i.product?.name ?? "Produto removido",
					quantity: i.quantity,
					unitPrice: i.unitPrice,
				})),
			}));
		}),

	setStatus: adminProcedure
		.input(
			z.object({
				id: z.string().uuid(),
				status: z.enum(["paid", "delivered", "cancelled"]),
			}),
		)
		.output(z.object({ id: z.string().uuid() }))
		.mutation(async ({ ctx, input }) => {
			return ctx.db.transaction(async (tx) => {
				const order = await tx.query.orders.findFirst({
					where: eq(orders.id, input.id),
					with: { items: true },
				});

				if (!order) {
					throw new TRPCError({
						code: "NOT_FOUND",
						message: "Pedido não encontrado",
					});
				}

				if (order.status === "cancelled" || order.status === "delivered") {
					throw new TRPCError({
						code: "BAD_REQUEST",
						message: "Pedido já finalizado e não pode ser alterado",
					});
				}

				if (input.status === "delivered" && order.status !== "paid") {
					throw new TRPCError({
						code: "BAD_REQUEST",
						message:
							"Pedido precisa estar pago antes de ser marcado como entregue",
					});
				}

				if (input.status === "cancelled") {
					for (const item of order.items) {
						await tx
							.update(products)
							.set({ quantity: sql`quantity + ${item.quantity}` })
							.where(eq(products.id, item.productId));
					}
				}

				await tx
					.update(orders)
					.set({ status: input.status })
					.where(eq(orders.id, input.id));

				return { id: input.id };
			});
		}),
});
