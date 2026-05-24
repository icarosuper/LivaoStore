import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
	/**
	 * Specify your server-side environment variables schema here. This way you can ensure the app
	 * isn't built with invalid env vars.
	 */
	server: {
		DATABASE_URL: z.string(),
		NODE_ENV: z
			.enum(["development", "test", "production"])
			.default("development"),
	},

	client: {
		NEXT_PUBLIC_SUPABASE_URL: z.string(),
		NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
		NEXT_PUBLIC_WHATSAPP_NUMBER: z.string().min(1),
		NEXT_PUBLIC_PIX_CHAVE: z.string().min(1),
		NEXT_PUBLIC_PIX_NOME: z.string().min(1),
		NEXT_PUBLIC_PIX_CIDADE: z.string().min(1),
	},

	runtimeEnv: {
		DATABASE_URL: process.env.DATABASE_URL,
		NODE_ENV: process.env.NODE_ENV,
		NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
		NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
		NEXT_PUBLIC_WHATSAPP_NUMBER: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER,
		NEXT_PUBLIC_PIX_CHAVE: process.env.NEXT_PUBLIC_PIX_CHAVE,
		NEXT_PUBLIC_PIX_NOME: process.env.NEXT_PUBLIC_PIX_NOME,
		NEXT_PUBLIC_PIX_CIDADE: process.env.NEXT_PUBLIC_PIX_CIDADE,
	},
	/**
	 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially
	 * useful for Docker builds.
	 */
	skipValidation: !!process.env.SKIP_ENV_VALIDATION,
	/**
	 * Makes it so that empty strings are treated as undefined. `SOME_VAR: z.string()` and
	 * `SOME_VAR=''` will throw an error.
	 */
	emptyStringAsUndefined: true,
});
