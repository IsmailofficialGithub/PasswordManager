// NOTE: Do not import from this file in client components!
// Client components should import directly from "./client"
// Server components should import directly from "./server"

// Server-side exports (only use in Server Components, Server Actions, API routes)
export { createClient, getServerUser } from "./server";
export { createAdminClient } from "./admin";

// Client-side exports (only use in Client Components)
// Import directly: import { createClient } from "@/lib/supabase/client"
export { createClient as createBrowserClient } from "./client";

