import { NextRequest, NextResponse } from "next/server";
import { updateWhitelistedUser, getUserById } from "@/server/utils/queries/userQueries";
import { getServerAuthSession } from "@/server/auth";
import { unauthorizedResponse, forbiddenResponse } from "@/lib/apiErrors";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { wallet, email, username, isAdmin, isWhiteListed, isHidden } = body ?? {};

    // Check if roles are being updated - requires admin
    if (isAdmin !== undefined || isWhiteListed !== undefined || isHidden !== undefined) {
      const session = await getServerAuthSession();
      if (!session?.user?.id) {
        return unauthorizedResponse();
      }

      const currentUser = await getUserById(session.user.id);
      if (!currentUser?.isAdmin) {
        return forbiddenResponse("Only admins can edit user roles");
      }
    }

    const resp = await updateWhitelistedUser(id, {
      wallet,
      email,
      username,
      isAdmin,
      isWhiteListed,
      isHidden,
    });

    const statusCode = resp.status === "success" ? 200 : 400;
    return NextResponse.json(resp, { status: statusCode });
  } catch (e) {
    console.error("[API] update whitelist user error", e);
    return NextResponse.json(
      { status: "error", message: "Server error" },
      { status: 500 }
    );
  }
}
