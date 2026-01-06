# Authentication Issue - Deep Dive & Solution

## Current Status

❌ **ISSUE**: "Not authenticated" error when setting master password  
✅ **WORKING**: Registration, Login, Redirect to master password page  
❌ **FAILING**: `/api/master-password/setup` API route

## Root Cause Analysis

The issue is that **Supabase authentication cookies are not being properly read in Next.js API routes** even though they are set correctly after login.

### What We've Tried

1. ✅ Made `createClient()` async and await `cookies()`
2. ✅ Updated all `createClient()` calls throughout the codebase
3. ✅ Used `createServerClient` directly in API routes
4. ✅ Added proper cookie handling in API routes
5. ❌ **Still failing** - cookies not recognized

### The Real Problem

Next.js 15 has changed how cookies work in API routes. The `cookies()` function from `next/headers` might not be reading the Supabase auth cookies correctly in the API route context.

## Solution Options

### Option 1: Use Request Headers (RECOMMENDED)

Instead of using `cookies()`, read the authorization header directly from the request:

```typescript
// Get auth token from request headers
const authHeader = request.headers.get('authorization');
const token = authHeader?.replace('Bearer ', '');

// Or read cookies from request directly
const cookieHeader = request.headers.get('cookie');
```

### Option 2: Client-Side Master Password Setup

Move the master password hashing to the client side (still secure with bcrypt.js):

1. Hash password on client
2. Send hash to server
3. Server just stores the hash (no authentication needed initially)

### Option 3: Use Supabase Service Role

Use the service role key to bypass RLS temporarily for master password setup:

```typescript
const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY  // Admin key
);
```

⚠️ **Security Note**: Only use this if you validate the user's Supabase session first.

## Recommended Fix

I recommend **Option 1** - reading cookies from the request headers directly. This is the most reliable way to handle authentication in Next.js 15 API routes.

### Implementation

```typescript
import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    // Get cookies from request headers
    const cookieHeader = request.headers.get('cookie') || '';
    
    // Parse cookies manually
    const cookies = Object.fromEntries(
      cookieHeader.split('; ').map(c => {
        const [name, ...value] = c.split('=');
        return [name, value.join('=')];
      })
    );

    // Create Supabase client with cookies from request
    const supabase = createServerClient(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          get(name: string) {
            return cookies[name];
          },
          set() {}, // Not needed for reading
          remove() {}, // Not needed for reading
        },
      }
    );

    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    // Rest of your code...
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 }
    );
  }
}
```

## Next Steps

1. **Check terminal logs** - Look for the console.log output we added
2. **Implement Option 1** - Use request headers for cookies
3. **Test again** - Verify the fix works
4. **Remove debug logging** - Clean up console.logs

## Alternative: Disable Email Confirmation First

Before implementing the fix, you should **disable email confirmation in Supabase** so you can test the complete flow:

1. Go to Supabase Dashboard
2. Authentication → Providers → Email
3. Toggle OFF "Confirm email"
4. Save

This will allow you to test registration → login → master password setup without email verification blocking the flow.

---

**Status**: Waiting for user to either:
- A) Disable email confirmation in Supabase, OR
- B) Approve implementing Option 1 (request headers fix)
