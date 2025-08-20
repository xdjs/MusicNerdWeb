import { NextRequest, NextResponse } from "next/server";
import { getServerAuthSession } from "@/server/auth";
import { getUserById } from "@/server/utils/queries/userQueries";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const start = performance.now();
  try {
    console.debug('[API] User fetch request for ID:', params.id);
    const session = await getServerAuthSession();
    
    console.debug('[API] Session state:', { 
      hasSession: !!session, 
      sessionUserId: session?.user?.id,
      requestedId: params.id 
    });
    
    // Check if user is authenticated and requesting their own data
    if (!session || session.user.id !== params.id) {
      console.debug('[API] Unauthorized access attempt');
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.debug('[API] Fetching user from database...');
    const user = await getUserById(params.id);
    
    if (!user) {
      console.debug('[API] User not found in database');
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    console.debug('[API] User found:', { id: user.id, username: user.username });
    return NextResponse.json(user);
  } catch (error) {
    console.error('[API] Error fetching user:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  } finally {
    const end = performance.now();
    console.debug(`[API] User fetch took ${end - start}ms`);
  }
}
