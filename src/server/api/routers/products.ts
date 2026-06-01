import { and, eq, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import {
	adminProcedure,
	createTRPCRouter,
	publicProcedure,
} from "~/server/api/trpc";
import { orderItems, productInterests, products } from "~/server/db/schema";

export const productsRouter = createTRPCRouter({
	list: publicProcedure
		.output(
			z.array(
				z.object({
					id: z.string().uuid(),
					name: z.string(),
					description: z.string().nullable(),
					price: z.string(),
					quantity: z.number(),
					availableStock: z.number(),
					imageUrl: z.string().nullable(),
					active: z.boolean(),
					stockRestockedAt: z.date().nullable(),
				}),
			),
		)
		.query(async ({ ctx }) => {
			const rows = await ctx.db
				.select({
					id: products.id,
					name: products.name,
					description: products.description,
					price: products.price,
					quantity: products.quantity,
					imageUrl: products.imageUrl,
					active: products.active,
					stockRestockedAt: products.stockRestockedAt,
				})
				.from(products)
				.where(eq(products.active, true));

			return rows.map((r) => ({ ...r, availableStock: r.quantity }));
		}),

	adminList: adminProcedure
		.output(
			z.array(
				z.object({
					id: z.string().uuid(),
					name: z.string(),
					description: z.string().nullable(),
					price: z.string(),
					quantity: z.number(),
					availableStock: z.number(),
					imageUrl: z.string().nullable(),
					active: z.boolean(),
					stockRestockedAt: z.date().nullable(),
				}),
			),
		)
		.query(async ({ ctx }) => {
			const rows = await ctx.db
				.select({
					id: products.id,
					name: products.name,
					description: products.description,
					price: products.price,
					quantity: products.quantity,
					imageUrl: products.imageUrl,
					active: products.active,
					stockRestockedAt: products.stockRestockedAt,
				})
				.from(products);

			return rows.map((r) => ({ ...r, availableStock: r.quantity }));
		}),

	create: adminProcedure
		.input(
			z.object({
				name: z.string().min(1),
				description: z.string().optional(),
				price: z.string().regex(/^\d+(\.\d{1,2})?$/),
				quantity: z.number().int().min(0),
				imageUrl: z.string().url().optional(),
			}),
		)
		.output(z.object({ id: z.string().uuid() }))
		.mutation(async ({ ctx, input }) => {
			const [product] = await ctx.db
				.insert(products)
				.values({
					name: input.name,
					description: input.description ?? null,
					price: input.price,
					quantity: input.quantity,
					imageUrl: input.imageUrl ?? null,
				})
				.returning({ id: products.id });
			return product!;
		}),

	update: adminProcedure
		.input(
			z.object({
				id: z.string().uuid(),
				name: z.string().min(1).optional(),
				description: z.string().optional(),
				price: z
					.string()
					.regex(/^\d+(\.\d{1,2})?$/)
					.optional(),
				quantity: z.number().int().min(0).optional(),
				imageUrl: z.string().url().nullable().optional(),
			}),
		)
		.output(z.object({ id: z.string().uuid() }))
		.mutation(async ({ ctx, input }) => {
			const { id, quantity, ...rest } = input;

			const current = await ctx.db.query.products.findFirst({
				where: eq(products.id, id),
				columns: { quantity: true },
			});

			const stockRestockedAt =
				quantity !== undefined && current && quantity > current.quantity
					? new Date()
					: undefined;

			const [updated] = await ctx.db
				.update(products)
				.set({
					...rest,
					...(quantity !== undefined ? { quantity } : {}),
					...(stockRestockedAt ? { stockRestockedAt } : {}),
				})
				.where(eq(products.id, id))
				.returning({ id: products.id });

			return updated!;
		}),

	addStock: adminProcedure
		.input(
			z.object({
				id: z.string().uuid(),
				quantity: z.number().int().positive(),
			}),
		)
		.output(z.object({ id: z.string().uuid() }))
		.mutation(async ({ ctx, input }) => {
			await ctx.db
				.update(productInterests)
				.set({ archivedAt: new Date() })
				.where(
					and(
						eq(productInterests.productId, input.id),
						isNull(productInterests.archivedAt),
					),
				);

			const [updated] = await ctx.db
				.update(products)
				.set({
					quantity: sql`${products.quantity} + ${input.quantity}`,
					stockRestockedAt: new Date(),
				})
				.where(eq(products.id, input.id))
				.returning({ id: products.id });

			return updated!;
		}),

	toggleActive: adminProcedure
		.input(z.object({ id: z.string().uuid() }))
		.output(z.object({ active: z.boolean() }))
		.mutation(async ({ ctx, input }) => {
			const current = await ctx.db.query.products.findFirst({
				where: eq(products.id, input.id),
				columns: { active: true },
			});
			const [updated] = await ctx.db
				.update(products)
				.set({ active: !current?.active })
				.where(eq(products.id, input.id))
				.returning({ active: products.active });
			return updated!;
		}),

	delete: adminProcedure
		.input(z.object({ id: z.string().uuid() }))
		.output(z.object({ id: z.string().uuid() }))
		.mutation(async ({ ctx, input }) => {
			await ctx.db
				.delete(productInterests)
				.where(eq(productInterests.productId, input.id));
			await ctx.db
				.delete(orderItems)
				.where(eq(orderItems.productId, input.id));
			const [deleted] = await ctx.db
				.delete(products)
				.where(eq(products.id, input.id))
				.returning({ id: products.id });
			return deleted!;
		}),
});
