import { NextResponse } from "next/server";
import { createCredential } from "@/app/(vault)/actions";

export async function GET() {
  try {
    const seedData = {
      title: "My Awesome Repo (Seed)",
      type: "env" as const,
      website_url: "https://github.com/my-user/my-awesome-repo",
      environment: "dev" as const,
      secret: "DATABASE_URL=postgres://user:pass@localhost:5432/db\nAPI_KEY=sk_test_123456789\nPORT=3000\nNODE_ENV=development",
      notes: "This is a seed environment file created automatically.",
      favorite: true,
    };

    const result = await createCredential(seedData);

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: "Successfully seeded an Env file!",
        data: result.credential,
      });
    } else {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
