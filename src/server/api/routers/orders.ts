import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import {
	adminProcedure,
	createTRPCRouter,
	publicProcedure,
} from "~/server/api/trpc";
import { orderItems, orders } from "~/server/db/schema";

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
			const [order] = await ctx.db
				.insert(orders)
				.values({
					customerName: input.customerName ?? null,
					whatsapp: input.whatsapp ?? null,
					total: input.total,
					status: "pending",
				})
				.returning({ id: orders.id });

			await ctx.db.insert(orderItems).values(
				input.items.map((item) => ({
					orderId: order!.id,
					productId: item.productId,
					quantity: item.quantity,
					unitPrice: item.unitPrice,
				})),
			);

			return order!;
		}),

	list: adminProcedure
		.output(
			z.array(
				z.object({
					id: z.string().uuid(),
					createdAt: z.date().nullable(),
					status: z.enum(["pending", "confirmed", "cancelled"]),
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

	confirm: adminProcedure
		.input(z.object({ id: z.string().uuid() }))
		.output(z.object({ id: z.string().uuid() }))
		.mutation(async ({ ctx, input }) => {
			await ctx.db
				.update(orders)
				.set({ status: "confirmed" })
				.where(eq(orders.id, input.id));

			const items = await ctx.db.query.orderItems.findMany({
				where: eq(orderItems.orderId, input.id),
			});

			for (const item of items) {
				await ctx.db.execute(
					sql`UPDATE products SET quantity = GREATEST(0, quantity - ${item.quantity}) WHERE id = ${item.productId}`,
				);
			}

			return { id: input.id };
		}),

	cancel: adminProcedure
		.input(z.object({ id: z.string().uuid() }))
		.output(z.object({ id: z.string().uuid() }))
		.mutation(async ({ ctx, input }) => {
			await ctx.db
				.update(orders)
				.set({ status: "cancelled" })
				.where(eq(orders.id, input.id));
			return { id: input.id };
		}),
});
