import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let supabase;
if (supabaseUrl && supabaseAnonKey) {
	supabase = createClient(supabaseUrl, supabaseAnonKey);

// Diagnostic: expose minimal init info to the console to help debug 403s.
try {
	// Avoid logging secrets; only show presence/absence and URL hostname.
	const urlHost = (() => {
		try {
			return new URL(supabaseUrl).host;
		} catch (e) {
			return supabaseUrl ? '[invalid-url]' : '[none]';
		}
	})();
	// This will appear in both server and browser consoles when the module runs client-side.
	// Helpful to verify the client was created with public keys (no secrets logged).
	// eslint-disable-next-line no-console
	console.debug('[supabaseClient] initialized', { urlHost, anonKeyPresent: !!supabaseAnonKey });
} catch (err) {
	// ignore
}
} else {
	// Provide a safe shim during build-time when env vars are not set.
	// This prevents Next.js prerender from failing; runtime actions will
	// fail with a clear message if Supabase isn't configured.
	supabase = {
		auth: {
			getUser: async () => ({ data: { user: null }, error: null }),
		},
		from: () => ({
			select: () => ({ data: [], error: null }),
			insert: async () => ({ data: null, error: new Error('Supabase not configured') }),
		}),
	};
}

export { supabase };
