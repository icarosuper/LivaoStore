"use client";

import { OrdersTab } from "~/components/admin/orders-tab";
import { ProductsTab } from "~/components/admin/products-tab";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";

export default function AdminPage() {
	return (
		<Tabs defaultValue="products">
			<TabsList className="w-full">
				<TabsTrigger className="flex-1" value="products">
					Produtos
				</TabsTrigger>
				<TabsTrigger className="flex-1" value="orders">
					Pedidos
				</TabsTrigger>
			</TabsList>
			<TabsContent className="mt-6" value="products">
				<ProductsTab />
			</TabsContent>
			<TabsContent className="mt-6" value="orders">
				<OrdersTab />
			</TabsContent>
		</Tabs>
	);
}
