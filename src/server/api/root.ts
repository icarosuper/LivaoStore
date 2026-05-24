import { interestsRouter } from "~/server/api/routers/interests";
import { ordersRouter } from "~/server/api/routers/orders";
import { productsRouter } from "~/server/api/routers/products";
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";

export const appRouter = createTRPCRouter({
	products: productsRouter,
	orders: ordersRouter,
	interests: interestsRouter,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
