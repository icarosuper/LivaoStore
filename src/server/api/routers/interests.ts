import { eq } from "drizzle-orm";
import { z } from "zod";
import {
	adminProcedure,
	createTRPCRouter,
	publicProcedure,
} from "~/server/api/trpc";
import { productInterests } from "~/server/db/schema";

export const interestsRouter = createTRPCRouter({
	register: publicProcedure
		.input(
			z.object({
				productId: z.string().uuid(),
				customerName: z.string().min(1),
				whatsapp: z.string().min(10),
			}),
		)
		.output(z.object({ id: z.string().uuid() }))
		.mutation(async ({ ctx, input }) => {
			const [interest] = await ctx.db
				.insert(productInterests)
				.values(input)
				.returning({ id: productInterests.id });
			return interest!;
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
				}),
			),
		)
		.query(async ({ ctx, input }) => {
			return ctx.db.query.productInterests.findMany({
				where: eq(productInterests.productId, input.productId),
				orderBy: (t, { desc }) => [desc(t.createdAt)],
				columns: {
					id: true,
					customerName: true,
					whatsapp: true,
					createdAt: true,
				},
			});
		}),
});
