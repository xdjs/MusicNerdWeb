"use client"

import { useContext } from "react";
import { Pencil, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EditModeContext } from "./EditModeContext";

export default function EditModeToggle() {
    const { isEditing, toggle, canEdit, isSaving } = useContext(EditModeContext);
    if (!canEdit) return null;

    return (
        <Button
            variant={isEditing ? "pink" : "glass"}
            onClick={toggle}
            disabled={isSaving}
            data-testid="edit-mode-toggle"
        >
            {isEditing ? <Check size={16} aria-hidden="true" /> : <Pencil size={16} aria-hidden="true" />}
            {isSaving ? "Saving…" : isEditing ? "Done" : "Edit"}
        </Button>
    );
}
