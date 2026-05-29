import "~/styles/globals.css";

import type { Metadata } from "next";
import { Baloo_2, Nunito } from "next/font/google";
import { TooltipProvider } from "~/components/ui/tooltip";
import { WhatsAppFab } from "~/components/whatsapp-fab";
import { TRPCReactProvider } from "~/trpc/react";

export const metadata: Metadata = {
	title: "Doces da Kiki",
	description: "Doces artesanais com encanto de bruxa",
	icons: [{ rel: "icon", url: "/favicon.ico" }],
};

const baloo = Baloo_2({
	subsets: ["latin"],
	weight: ["700", "800"],
	variable: "--font-baloo",
});

const nunito = Nunito({
	subsets: ["latin"],
	weight: ["400", "700", "900"],
	variable: "--font-nunito",
});

export default function RootLayout({
	children,
}: Readonly<{ children: React.ReactNode }>) {
	return (
		<html className={`light ${baloo.variable} ${nunito.variable}`} lang="pt-BR">
			<body suppressHydrationWarning>
				<TRPCReactProvider>
					<TooltipProvider>
						{children}
						<WhatsAppFab />
					</TooltipProvider>
				</TRPCReactProvider>
			</body>
		</html>
	);
}
