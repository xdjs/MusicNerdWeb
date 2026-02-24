import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { getUserById } from "@/server/utils/queries/userQueries";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await requireAuth();

    if (!auth.authenticated) {
      return auth.response;
    }

    // Users can only fetch their own data
    if (auth.session.user.id !== id) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const user = await getUserById(id);

    if (!user) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    return Response.json(user);
  } catch (error) {
    console.error("[API] get user error", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
