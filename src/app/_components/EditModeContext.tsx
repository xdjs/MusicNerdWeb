"use client"

import { createContext, ReactNode } from "react";

export type EditModeContextType = {
    isEditing: boolean;
    toggle: () => void;
    canEdit: boolean;
};

export const EditModeContext = createContext<EditModeContextType>({
    isEditing: false,
    toggle: () => {},
    canEdit: false,
});

export function EditModeProvider({ children }: { children: ReactNode; canEdit?: boolean }) {
    // Authentication disabled - always read-only mode
    return (
        <EditModeContext.Provider value={{ isEditing: false, toggle: () => {}, canEdit: false }}>
            {children}
        </EditModeContext.Provider>
    );
} 