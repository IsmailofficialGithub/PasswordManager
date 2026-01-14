import { NextRequest, NextResponse } from "next/server";
import { decryptSecret } from "../../actions";

/**
 * API endpoint for on-demand decryption
 * Requires master password unlock (checked in decryptSecret)
 */
export async function POST(request: NextRequest) {
  try {
    const { credentialId } = await request.json();

    if (!credentialId || typeof credentialId !== "string") {
      return NextResponse.json(
        { success: false, error: "Invalid credential ID" },
        { status: 400 }
      );
    }

    const result = await decryptSecret(credentialId);

    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

