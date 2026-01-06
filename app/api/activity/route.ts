import { NextRequest, NextResponse } from "next/server";
import { updateActivity } from "@/lib/auto-lock-server";
import { getServerUser } from "@/lib/supabase/server";

/**
 * API endpoint to update activity timestamp
 * Called by client-side activity tracking
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser();
    if (!user) {
      return NextResponse.json({ success: false }, { status: 401 });
    }

    await updateActivity();
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}

