import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { getUserById, updateUsername } from "@/server/utils/queries/userQueries";

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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await requireAuth();

    if (!auth.authenticated) {
      return auth.response;
    }

    // Users can only update their own username
    if (auth.session.user.id !== id) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { username } = body;

    if (typeof username !== "string" || username.trim().length === 0) {
      return Response.json(
        { status: "error", message: "Username is required" },
        { status: 400 }
      );
    }

    const result = await updateUsername(id, username.trim());

    if (result.status === "success") {
      return Response.json({ status: "success", message: result.message });
    }

    return Response.json(
      { status: "error", message: result.message },
      { status: 400 }
    );
  } catch (error) {
    console.error("[API] update username error", error);
    return Response.json(
      { status: "error", message: "Internal server error" },
      { status: 500 }
    );
  }
}
