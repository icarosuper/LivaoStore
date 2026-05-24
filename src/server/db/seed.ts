import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error("DATABASE_URL not set");

const conn = postgres(DATABASE_URL);
const db = drizzle(conn, { schema });

const now = new Date();
const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
const fiveHoursAgo = new Date(now.getTime() - 5 * 60 * 60 * 1000);

async function seed() {
	console.log("Cleaning existing data...");
	await db.delete(schema.productInterests);
	await db.delete(schema.orderItems);
	await db.delete(schema.orders);
	await db.delete(schema.products);

	console.log("Inserting products...");
	const [
		brigadeiro,
		brigadeirOreo,
		beijinho,
		bichosPe,
		churros,
		brownie,
		paoDeMel,
		pistache,
		doceleite,
		cocogourmet,
	] = await db
		.insert(schema.products)
		.values([
			{
				name: "Brigadeiro Tradicional",
				description:
					"Brigadeiro clássico de chocolate ao leite, coberto com granulado belga.",
				price: "3.50",
				quantity: 50,
				active: true,
			},
			{
				name: "Brigadeiro de Oreo",
				description:
					"Brigadeiro cremoso recheado com pedaços de biscoito Oreo.",
				price: "4.50",
				quantity: 30,
				active: true,
			},
			{
				name: "Beijinho de Coco",
				description: "Doce de coco ralado com cravo, tradição nas festas.",
				price: "3.50",
				quantity: 40,
				active: true,
			},
			{
				name: "Bicho de Pé",
				description:
					"Brigadeiro de morango com granulado colorido. Favorito das crianças!",
				price: "3.50",
				quantity: 25,
				active: true,
			},
			{
				name: "Churros Recheado",
				description:
					"Churros artesanal com recheio de doce de leite e açúcar canela.",
				price: "6.00",
				quantity: 20,
				active: true,
			},
			{
				name: "Brownie de Chocolate",
				description:
					"Brownie denso e fudgy de chocolate meio amargo. Serve 1 pessoa.",
				price: "8.00",
				quantity: 15,
				active: true,
			},
			{
				name: "Pão de Mel",
				description:
					"Pão de mel recheado com doce de leite e banhado em chocolate.",
				price: "7.00",
				quantity: 5,
				active: true,
				// recently restocked — shows "Voltou!" badge
				stockRestockedAt: fiveHoursAgo,
			},
			{
				name: "Brigadeiro Gourmet de Pistache",
				description:
					"Brigadeiro premium com pasta de pistache importada e granulado dourado.",
				price: "9.00",
				quantity: 0,
				active: true,
			},
			{
				name: "Doce de Leite Cremoso",
				description:
					"Doce de leite artesanal em pote de 250g. Feito no tacho de cobre.",
				price: "18.00",
				quantity: 12,
				active: true,
			},
			{
				name: "Beijinho Gourmet de Coco",
				description:
					"Versão gourmet com coco fresco ralado na hora e cream cheese.",
				price: "5.50",
				quantity: 20,
				active: true,
			},
		])
		.returning();

	console.log("Inserting orders...");
	const [orderPending1, orderPending2, orderPaid, orderCancelled] = await db
		.insert(schema.orders)
		.values([
			{
				status: "pending",
				customerName: "Ana Clara",
				whatsapp: "5531987654321",
				total: "28.00",
				createdAt: fiveHoursAgo,
			},
			{
				status: "pending",
				customerName: "Bruno Ferreira",
				whatsapp: "5511991234567",
				total: "54.50",
				createdAt: now,
			},
			{
				status: "paid",
				customerName: "Carla Mendes",
				whatsapp: "5521976543210",
				total: "46.00",
				createdAt: yesterday,
			},
			{
				status: "cancelled",
				customerName: "Diego Santos",
				whatsapp: "5541988887777",
				total: "17.50",
				createdAt: twoDaysAgo,
			},
		])
		.returning();

	if (
		!orderPending1 ||
		!orderPending2 ||
		!orderPaid ||
		!orderCancelled ||
		!brigadeiro ||
		!brigadeirOreo ||
		!beijinho ||
		!churros ||
		!brownie ||
		!paoDeMel ||
		!pistache ||
		!bichosPe ||
		!doceleite ||
		!cocogourmet
	) {
		throw new Error("Insert returned undefined rows");
	}

	console.log("Inserting order items...");
	await db.insert(schema.orderItems).values([
		// pending order 1: Ana Clara
		{
			orderId: orderPending1.id,
			productId: brigadeiro.id,
			quantity: 4,
			unitPrice: brigadeiro.price,
		},
		{
			orderId: orderPending1.id,
			productId: churros.id,
			quantity: 2,
			unitPrice: churros.price,
		},
		// pending order 2: Bruno Ferreira
		{
			orderId: orderPending2.id,
			productId: brigadeirOreo.id,
			quantity: 6,
			unitPrice: brigadeirOreo.price,
		},
		{
			orderId: orderPending2.id,
			productId: brownie.id,
			quantity: 3,
			unitPrice: brownie.price,
		},
		{
			orderId: orderPending2.id,
			productId: doceleite.id,
			quantity: 1,
			unitPrice: doceleite.price,
		},
		// confirmed order: Carla Mendes
		{
			orderId: orderPaid.id,
			productId: paoDeMel.id,
			quantity: 3,
			unitPrice: paoDeMel.price,
		},
		{
			orderId: orderPaid.id,
			productId: beijinho.id,
			quantity: 5,
			unitPrice: beijinho.price,
		},
		{
			orderId: orderPaid.id,
			productId: cocogourmet.id,
			quantity: 2,
			unitPrice: cocogourmet.price,
		},
		// cancelled order: Diego Santos
		{
			orderId: orderCancelled.id,
			productId: bichosPe.id,
			quantity: 5,
			unitPrice: bichosPe.price,
		},
	]);

	console.log("Inserting product interests (out-of-stock)...");
	await db.insert(schema.productInterests).values([
		{
			productId: pistache.id,
			customerName: "Fernanda Lima",
			whatsapp: "5531922223333",
		},
		{
			productId: pistache.id,
			customerName: "Gabriel Costa",
			whatsapp: "5521955556666",
		},
		{
			productId: pistache.id,
			customerName: "Helena Rocha",
			whatsapp: "5511944447777",
		},
	]);

	await conn.end();

	console.log("Seed complete.");
	console.log(`  Products: 10 (1 sem estoque, 1 recém-reposto)`);
	console.log(`  Orders: 4 (2 pending, 1 paid, 1 cancelled)`);
	console.log(`  Product interests: 3 (Pistache)`);
}

seed().catch((err) => {
	console.error(err);
	process.exit(1);
});
