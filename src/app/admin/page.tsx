"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { OrdersTab } from "~/components/admin/orders-tab";
import { ProductsTab } from "~/components/admin/products-tab";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";

const VALID_TABS = ["products", "orders"] as const;
type TabValue = (typeof VALID_TABS)[number];

function AdminTabs() {
	const searchParams = useSearchParams();
	const router = useRouter();

	const raw = searchParams.get("tab");
	const tab: TabValue = VALID_TABS.includes(raw as TabValue)
		? (raw as TabValue)
		: "products";

	function handleTabChange(value: string) {
		router.push(`?tab=${value}`, { scroll: false });
	}

	return (
		<Tabs onValueChange={handleTabChange} value={tab}>
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

export default function AdminPage() {
	return (
		<Suspense>
			<AdminTabs />
		</Suspense>
	);
}
