import "~/styles/globals.css";

import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { TooltipProvider } from "~/components/ui/tooltip";
import { WhatsAppFab } from "~/components/whatsapp-fab";
import { TRPCReactProvider } from "~/trpc/react";

export const metadata: Metadata = {
	title: "Livão Store",
	description: "Loja de doces artesanais",
	icons: [{ rel: "icon", url: "/favicon.ico" }],
};

const geist = Geist({
	subsets: ["latin"],
	variable: "--font-geist-sans",
});

export default function RootLayout({
	children,
}: Readonly<{ children: React.ReactNode }>) {
	return (
		<html className={`${geist.variable}`} lang="pt-BR">
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
