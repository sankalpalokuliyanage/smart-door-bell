import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let supabase;
if (supabaseUrl && supabaseAnonKey) {
	supabase = createClient(supabaseUrl, supabaseAnonKey);
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
