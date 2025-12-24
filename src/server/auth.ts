// Stub for deleted authentication - always returns null

type Session = {
  user: {
    id: string;
  };
} | null;

export async function getServerAuthSession(): Promise<Session> {
  return null;
}

export const authOptions = {};
