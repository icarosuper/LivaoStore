import { and, count, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import {
	adminProcedure,
	createTRPCRouter,
	publicProcedure,
} from "~/server/api/trpc";
import { customers, productInterests } from "~/server/db/schema";
import { isValidBrazilianPhone } from "~/lib/phone";

export const interestsRouter = createTRPCRouter({
	register: publicProcedure
		.input(
			z.object({
				productId: z.string().uuid(),
				customerName: z.string().min(2).max(100),
				whatsapp: z.string().refine(isValidBrazilianPhone, "Número de telefone inválido"),
			}),
		)
		.output(z.object({ id: z.string().uuid() }))
		.mutation(async ({ ctx, input }) => {
			await ctx.db
				.insert(customers)
				.values({ whatsapp: input.whatsapp, name: input.customerName })
				.onConflictDoUpdate({
					target: customers.whatsapp,
					set: { name: input.customerName, updatedAt: new Date() },
				});

			const existing = await ctx.db.query.productInterests.findFirst({
				where: and(
					eq(productInterests.productId, input.productId),
					eq(productInterests.whatsapp, input.whatsapp),
					isNull(productInterests.archivedAt),
				),
				columns: { id: true },
			});
			if (existing) return { id: existing.id };

			const [interest] = await ctx.db
				.insert(productInterests)
				.values(input)
				.returning({ id: productInterests.id });
			return interest!;
		}),

	allCounts: adminProcedure
		.output(
			z.array(z.object({ productId: z.string().uuid(), count: z.number() })),
		)
		.query(async ({ ctx }) => {
			const rows = await ctx.db
				.select({ productId: productInterests.productId, count: count() })
				.from(productInterests)
				.where(isNull(productInterests.archivedAt))
				.groupBy(productInterests.productId);
			return rows.map((r) => ({ productId: r.productId, count: r.count }));
		}),

	listByProduct: adminProcedure
		.input(z.object({ productId: z.string().uuid() }))
		.output(
			z.array(
				z.object({
					id: z.string().uuid(),
					customerName: z.string(),
					whatsapp: z.string(),
					createdAt: z.date().nullable(),
					notifiedAt: z.date().nullable(),
				}),
			),
		)
		.query(async ({ ctx, input }) => {
			return ctx.db.query.productInterests.findMany({
				where: and(
					eq(productInterests.productId, input.productId),
					isNull(productInterests.archivedAt),
				),
				orderBy: (t, { desc }) => [desc(t.createdAt)],
				columns: {
					id: true,
					customerName: true,
					whatsapp: true,
					createdAt: true,
					notifiedAt: true,
				},
			});
		}),

	lookupCustomer: publicProcedure
		.input(z.object({ whatsapp: z.string() }))
		.output(z.object({ name: z.string() }).nullable())
		.query(async ({ ctx, input }) => {
			const found = await ctx.db.query.customers.findFirst({
				where: eq(customers.whatsapp, input.whatsapp),
				columns: { name: true },
			});
			return found ?? null;
		}),

	activeProductIds: publicProcedure
		.input(z.object({ whatsapp: z.string() }))
		.output(z.array(z.string().uuid()))
		.query(async ({ ctx, input }) => {
			const rows = await ctx.db
				.select({ productId: productInterests.productId })
				.from(productInterests)
				.where(
					and(
						eq(productInterests.whatsapp, input.whatsapp),
						isNull(productInterests.archivedAt),
					),
				);
			return rows.map((r) => r.productId);
		}),

	markNotified: adminProcedure
		.input(z.object({ id: z.string().uuid() }))
		.output(z.object({ id: z.string().uuid() }))
		.mutation(async ({ ctx, input }) => {
			const [updated] = await ctx.db
				.update(productInterests)
				.set({ notifiedAt: new Date() })
				.where(eq(productInterests.id, input.id))
				.returning({ id: productInterests.id });
			return updated!;
		}),
});
