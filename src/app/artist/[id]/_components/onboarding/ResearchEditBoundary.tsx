"use client";

import { useContext, type ReactNode } from "react";
import { EditModeContext } from "@/app/_components/EditModeContext";
import { OnboardingProgressContext } from "./OnboardingProgressContext";

/** Suspend editing only while the build view is active, without ending its saved edit session. */
export default function ResearchEditBoundary({ children }: { children: ReactNode }) {
    const edit = useContext(EditModeContext);
    const research = useContext(OnboardingProgressContext);
    const blocked = !!research && !research.complete;
    return <EditModeContext.Provider value={blocked ? {
        ...edit, editingBlocked: true, isEditing: false, canEdit: false, toggle: () => {},
        suspendedEditMode: edit.isEditing ? edit : undefined,
    } : edit}>{children}</EditModeContext.Provider>;
}
