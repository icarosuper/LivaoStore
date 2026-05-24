import { relations, sql } from "drizzle-orm";
import {
	boolean,
	integer,
	numeric,
	pgEnum,
	pgTable,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";

export const orderStatusEnum = pgEnum("order_status", [
	"pending",
	"confirmed",
	"cancelled",
]);

export const products = pgTable("products", {
	id: uuid("id").primaryKey().defaultRandom(),
	name: text("name").notNull(),
	description: text("description"),
	price: numeric("price", { precision: 10, scale: 2 }).notNull(),
	quantity: integer("quantity").notNull().default(0),
	imageUrl: text("image_url"),
	active: boolean("active").notNull().default(true),
	createdAt: timestamp("created_at").default(sql`now()`),
	stockRestockedAt: timestamp("stock_restocked_at"),
});

export const productInterests = pgTable("product_interests", {
	id: uuid("id").primaryKey().defaultRandom(),
	productId: uuid("product_id")
		.notNull()
		.references(() => products.id),
	customerName: text("customer_name").notNull(),
	whatsapp: text("whatsapp").notNull(),
	createdAt: timestamp("created_at").default(sql`now()`),
});

export const orders = pgTable("orders", {
	id: uuid("id").primaryKey().defaultRandom(),
	createdAt: timestamp("created_at").default(sql`now()`),
	status: orderStatusEnum("status").notNull().default("pending"),
	whatsapp: text("whatsapp"),
	customerName: text("customer_name"),
	total: numeric("total", { precision: 10, scale: 2 }).notNull(),
});

export const orderItems = pgTable("order_items", {
	id: uuid("id").primaryKey().defaultRandom(),
	orderId: uuid("order_id")
		.notNull()
		.references(() => orders.id),
	productId: uuid("product_id")
		.notNull()
		.references(() => products.id),
	quantity: integer("quantity").notNull(),
	unitPrice: numeric("unit_price", { precision: 10, scale: 2 }).notNull(),
});

export const ordersRelations = relations(orders, ({ many }) => ({
	items: many(orderItems),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
	order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
	product: one(products, {
		fields: [orderItems.productId],
		references: [products.id],
	}),
}));

export const productsRelations = relations(products, ({ many }) => ({
	items: many(orderItems),
	interests: many(productInterests),
}));

export const productInterestsRelations = relations(
	productInterests,
	({ one }) => ({
		product: one(products, {
			fields: [productInterests.productId],
			references: [products.id],
		}),
	}),
);
