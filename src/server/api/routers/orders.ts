import { TRPCError } from "@trpc/server";
import {
	and,
	asc,
	desc,
	eq,
	gte,
	ilike,
	inArray,
	lte,
	or,
	sql,
} from "drizzle-orm";
import { z } from "zod";
import { isValidBrazilianPhone } from "~/lib/phone";
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

const orderOutputSchema = z.object({
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
});

export const ordersRouter = createTRPCRouter({
	create: publicProcedure
		.input(
			z.object({
				customerName: z.string().min(2).max(100).optional(),
				whatsapp: z
					.string()
					.refine(
						(v) => !v || isValidBrazilianPhone(v),
						"Número de telefone inválido",
					)
					.optional(),
				total: z.string().regex(/^\d+(\.\d{1,2})?$/),
				items: z.array(orderItemSchema).min(1),
			}),
		)
		.output(z.object({ id: z.string().uuid() }))
		.mutation(async ({ ctx, input }) => {
			return ctx.db.transaction(async (tx) => {
				const productIds = input.items.map((i) => i.productId);

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
		.input(
			z.object({
				page: z.number().int().min(1).default(1),
				pageSize: z.number().int().min(1).max(100).default(20),
				status: z
					.enum(["pending", "paid", "delivered", "cancelled"])
					.optional(),
				customer: z.string().optional(),
				dateFrom: z.string().optional(),
				dateTo: z.string().optional(),
				sortField: z.enum(["createdAt", "total"]).default("createdAt"),
				sortDir: z.enum(["asc", "desc"]).default("desc"),
			}),
		)
		.output(
			z.object({
				items: z.array(orderOutputSchema),
				total: z.number(),
				page: z.number(),
				pageSize: z.number(),
				totalPages: z.number(),
			}),
		)
		.query(async ({ ctx, input }) => {
			const conditions = [];

			if (input.status) {
				conditions.push(eq(orders.status, input.status));
			}
			if (input.customer?.trim()) {
				const q = `%${input.customer.trim()}%`;
				const customerCondition = or(
					ilike(orders.customerName, q),
					ilike(orders.whatsapp, q),
				);
				if (customerCondition) conditions.push(customerCondition);
			}
			if (input.dateFrom) {
				conditions.push(gte(orders.createdAt, new Date(input.dateFrom)));
			}
			if (input.dateTo) {
				const end = new Date(input.dateTo);
				end.setHours(23, 59, 59, 999);
				conditions.push(lte(orders.createdAt, end));
			}

			const where = conditions.length > 0 ? and(...conditions) : undefined;

			const sortCol =
				input.sortField === "total" ? orders.total : orders.createdAt;
			const sortExpr = input.sortDir === "asc" ? asc(sortCol) : desc(sortCol);

			const [countRow] = await ctx.db
				.select({ total: sql<number>`count(*)::int` })
				.from(orders)
				.where(where);

			const total = countRow?.total ?? 0;
			const totalPages = Math.ceil(total / input.pageSize);
			const offset = (input.page - 1) * input.pageSize;

			const idRows = await ctx.db
				.select({ id: orders.id })
				.from(orders)
				.where(where)
				.orderBy(sortExpr)
				.limit(input.pageSize)
				.offset(offset);

			if (idRows.length === 0) {
				return {
					items: [],
					total,
					page: input.page,
					pageSize: input.pageSize,
					totalPages,
				};
			}

			const ids = idRows.map((r) => r.id);

			const rows = await ctx.db
				.select({
					id: orders.id,
					createdAt: orders.createdAt,
					status: orders.status,
					customerName: orders.customerName,
					whatsapp: orders.whatsapp,
					total: orders.total,
					itemId: orderItems.id,
					productId: orderItems.productId,
					quantity: orderItems.quantity,
					unitPrice: orderItems.unitPrice,
					productName: products.name,
				})
				.from(orders)
				.leftJoin(orderItems, eq(orderItems.orderId, orders.id))
				.leftJoin(products, eq(products.id, orderItems.productId))
				.where(inArray(orders.id, ids))
				.orderBy(sortExpr);

			// Group rows by order
			const orderMap = new Map<string, z.infer<typeof orderOutputSchema>>();
			for (const r of rows) {
				if (!orderMap.has(r.id)) {
					orderMap.set(r.id, {
						id: r.id,
						createdAt: r.createdAt,
						status: r.status,
						customerName: r.customerName,
						whatsapp: r.whatsapp,
						total: r.total,
						items: [],
					});
				}
				if (r.itemId) {
					orderMap.get(r.id)!.items.push({
						id: r.itemId,
						productId: r.productId ?? "",
						productName: r.productName ?? "Produto removido",
						quantity: r.quantity ?? 0,
						unitPrice: r.unitPrice ?? "0",
					});
				}
			}

			// Preserve sort order from idRows
			const items = ids
				.map((id) => orderMap.get(id))
				.filter((o): o is z.infer<typeof orderOutputSchema> => !!o);

			return {
				items,
				total,
				page: input.page,
				pageSize: input.pageSize,
				totalPages,
			};
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

	createManual: adminProcedure
		.input(
			z.object({
				customerName: z.string().min(2).max(100).optional(),
				whatsapp: z
					.string()
					.refine(
						(v) => !v || isValidBrazilianPhone(v),
						"Número de telefone inválido",
					)
					.optional(),
				items: z.array(orderItemSchema).min(1),
			}),
		)
		.output(z.object({ id: z.string().uuid() }))
		.mutation(async ({ ctx, input }) => {
			return ctx.db.transaction(async (tx) => {
				const productIds = input.items.map((i) => i.productId);

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

				const total = input.items.reduce(
					(acc, i) => acc + parseFloat(i.unitPrice) * i.quantity,
					0,
				);

				const [order] = await tx
					.insert(orders)
					.values({
						customerName: input.customerName ?? null,
						whatsapp: input.whatsapp ?? null,
						total: total.toFixed(2),
						status: "paid",
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
});
