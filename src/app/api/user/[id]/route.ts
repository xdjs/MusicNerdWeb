import { NextRequest, NextResponse } from "next/server";
import { getUserById } from "@/server/utils/queries/userQueries";
import { getServerAuthSession } from "@/server/auth";
import { unauthorizedResponse, forbiddenResponse } from "@/lib/apiErrors";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerAuthSession();

    if (!session?.user?.id) {
      return unauthorizedResponse();
    }

    // Users can only fetch their own data, unless they're admin
    if (session.user.id !== id) {
      const currentUser = await getUserById(session.user.id);
      if (!currentUser?.isAdmin) {
        return forbiddenResponse("You can only view your own profile");
      }
    }

    const userData = await getUserById(id);

    if (!userData) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(userData);
  } catch (error) {
    console.error("[API] get user error", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
