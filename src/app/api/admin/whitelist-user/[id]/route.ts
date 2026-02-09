import { NextRequest, NextResponse } from "next/server";
import { updateWhitelistedUser } from "@/server/utils/queries/userQueries";
import { requireAdmin } from "@/lib/auth-helpers";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { wallet, email, username, isAdmin, isWhiteListed, isHidden } = body ?? {};

    // Require admin for role changes
    const auth = await requireAdmin();
    if (!auth.authenticated) {
      return auth.response;
    }

    const resp = await updateWhitelistedUser(id, { wallet, email, username, isAdmin, isWhiteListed, isHidden });
    const statusCode = resp.status === "success" ? 200 : 400;
    return NextResponse.json(resp, { status: statusCode });
  } catch (e) {
    console.error("update whitelist user error", e);
    return NextResponse.json({ status: "error", message: "Server error" }, { status: 500 });
  }
}
