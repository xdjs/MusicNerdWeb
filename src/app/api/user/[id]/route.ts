import { NextRequest, NextResponse } from "next/server";
import { getServerAuthSession } from "@/server/auth";
import { getUserById } from "@/server/utils/queries/userQueries";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.debug('[API /api/user/:id] Incoming request', {
      id: params.id,
      method: request.method,
      url: request.url
    });
    const session = await getServerAuthSession();
    console.debug('[API /api/user/:id] Session check', {
      hasSession: !!session,
      sessionUserId: session?.user?.id,
      matchesParam: session?.user?.id === params.id
    });
    
    // Check if user is authenticated and requesting their own data
    if (!session || session.user.id !== params.id) {
      console.warn('[API /api/user/:id] Unauthorized access attempt', {
        id: params.id,
        sessionUserId: session?.user?.id
      });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await getUserById(params.id);
    console.debug('[API /api/user/:id] DB fetch complete', { found: !!user });
    
    if (!user) {
      console.warn('[API /api/user/:id] User not found', { id: params.id });
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    console.debug('[API /api/user/:id] Responding with user data', { id: user.id });
    return NextResponse.json(user);
  } catch (error) {
    console.error('[API] Error fetching user:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
