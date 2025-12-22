"use client";

import BookmarkButton from "@/app/_components/BookmarkButton";
import EditModeToggle from "@/app/_components/EditModeToggle";
import { useSessionContext } from "./ClientSessionWrapper";

interface SessionDependentButtonsProps {
  artistId: string;
  artistName: string;
  imageUrl: string;
}

export default function SessionDependentButtons({
  artistId,
  artistName,
  imageUrl,
}: SessionDependentButtonsProps) {
  const { session, canEdit, isLoading } = useSessionContext();

  if (isLoading) {
    return null; // Or a loading spinner
  }

  return (
    <div className="flex items-center gap-2">
      {session && (
        <BookmarkButton
          artistId={artistId}
          artistName={artistName}
          imageUrl={imageUrl}
          userId={session.user.id}
        />
      )}
      {canEdit && <EditModeToggle />}
    </div>
  );
}

