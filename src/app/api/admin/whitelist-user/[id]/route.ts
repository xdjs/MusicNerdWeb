import { NextRequest, NextResponse } from "next/server";
import { updateWhitelistedUser } from "@/server/utils/queries/userQueries";
import { getServerAuthSession } from "@/server/auth";
import { getUserById } from "@/server/utils/queries/userQueries";

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const body = await request.json();
    const { wallet, email, username, isAdmin, isWhiteListed, isHidden } = body ?? {};

    // Check if roles are being updated and validate admin permissions
    if (isAdmin !== undefined || isWhiteListed !== undefined || isHidden !== undefined) {
      const session = await getServerAuthSession();
      if (!session?.user?.id) {
        return NextResponse.json({ status: "error", message: "Not authenticated" }, { status: 401 });
      }
      
      const currentUser = await getUserById(session.user.id);
      if (!currentUser?.isAdmin) {
        return NextResponse.json({ status: "error", message: "Only admins can edit user roles" }, { status: 403 });
      }
    }

    const resp = await updateWhitelistedUser(id, { wallet, email, username, isAdmin, isWhiteListed, isHidden });
    const statusCode = resp.status === "success" ? 200 : 400;
    return NextResponse.json(resp, { status: statusCode });
  } catch (e) {
    console.error("update whitelist user error", e);
    return NextResponse.json({ status: "error", message: "Server error" }, { status: 500 });
  }
} 