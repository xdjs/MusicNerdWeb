"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { usePrivy } from "@privy-io/react-auth";
import { useToast } from "@/hooks/use-toast";

/**
 * The signed-in user's Privy access token, for `Authorization: Bearer` on the
 * Music Nerd API. Asks Privy only once it is ready and the user is signed in;
 * a missing token is an error, reported with a toast.
 */
export function useAccessToken() {
  const { getAccessToken, ready, authenticated } = usePrivy();
  const { toast } = useToast();

  const { data: accessToken, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["accessToken"],
    queryFn: async () => {
      const token = await getAccessToken();
      if (!token) throw new Error("Failed to get access token");
      return token;
    },
    enabled: ready && authenticated,
  });

  useEffect(() => {
    if (isError) {
      toast({ title: "Could not get your access token", variant: "destructive" });
      console.error(error);
    }
  }, [isError, error, toast]);

  return { accessToken, isLoading, isError, refetch, ready, authenticated };
}
