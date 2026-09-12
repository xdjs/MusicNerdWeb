"use client"

import { useContext } from "react";
import { Pencil, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EditModeContext } from "./EditModeContext";

export default function EditModeToggle({ compactOnMobile = false }: { compactOnMobile?: boolean } = {}) {
    const { isEditing, toggle, canEdit, isSaving } = useContext(EditModeContext);
    if (!canEdit) return null;

    return (
        <Button
            variant={isEditing ? "pink" : "glass"}
            onClick={toggle}
            disabled={isSaving}
            data-testid="edit-mode-toggle"
            className={compactOnMobile ? "w-11 px-0 sm:w-auto sm:px-4" : undefined}
            aria-label={compactOnMobile ? (isSaving ? "Saving profile" : isEditing ? "Done editing profile" : "Edit profile") : undefined}
            title={isSaving ? "Saving profile" : isEditing ? "Done editing profile" : "Edit profile"}
        >
            {isEditing ? <Check size={16} aria-hidden="true" /> : <Pencil size={16} aria-hidden="true" />}
            <span className={compactOnMobile ? "hidden sm:inline" : undefined}>{isSaving ? "Saving…" : isEditing ? "Done" : "Edit"}</span>
        </Button>
    );
}
