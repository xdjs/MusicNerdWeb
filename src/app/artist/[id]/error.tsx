"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function ArtistRouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Log the error to help debugging in the console and any monitoring you may have
    // eslint-disable-next-line no-console
    console.error("[ArtistRouteError]", error);
  }, [error]);

  return (
    <div className="min-h-[40vh] flex flex-col items-center justify-center gap-4 px-6 text-center">
      <h2 className="text-2xl font-semibold">Something went wrong loading this artist</h2>
      <p className="text-gray-600">A client-side error occurred. You can try again.</p>
      <div className="flex items-center gap-3">
        <Button onClick={() => reset()} className="bg-pastypink text-white hover:bg-pastypink/90">Try again</Button>
        <Button variant="outline" onClick={() => window.location.reload()}>Reload page</Button>
      </div>
      {error?.digest && (
        <p className="text-xs text-gray-400">Error ID: {error.digest}</p>
      )}
    </div>
  );
}


