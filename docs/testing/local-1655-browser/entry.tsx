import React from "react";
import { createRoot } from "react-dom/client";
import BlurbSection from "../../../src/app/artist/[id]/_components/BlurbSection";
import { EditModeContext } from "../../../src/app/_components/EditModeContext";

createRoot(document.getElementById("root")!).render(
  <EditModeContext.Provider
    value={{
      isEditing: true,
      canEdit: true,
      toggle: () => {},
      refreshProfile: () => {
        document.getElementById("refresh")!.textContent = "refreshed";
      },
    }}
  >
    <h1>Local synthetic About acceptance</h1>
    <BlurbSection
      artistId="00000000-0000-4000-8000-000000000001"
      artistName="Synthetic artist"
      initialBio={
        new URLSearchParams(location.search).has("publicReload")
          ? undefined
          : (window as unknown as { syntheticInitialBio: string })
              .syntheticInitialBio
      }
    />
  </EditModeContext.Provider>,
);
