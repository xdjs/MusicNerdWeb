"use client";

import { createContext, useCallback, useRef, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

type SaveEdit = () => Promise<void>;
export type EditModeContextType = {
    isEditing: boolean;
    toggle: () => void;
    canEdit: boolean;
    isSaving?: boolean;
    registerSave?: (key: string, save: SaveEdit) => () => void;
    refreshProfile?: () => void;
    revision?: number;
};
export const EditModeContext = createContext<EditModeContextType>({ isEditing: false, toggle: () => {}, canEdit: false });

export function EditModeProvider({ children, canEdit = false }: { children: ReactNode; canEdit?: boolean }) {
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [revision, setRevision] = useState(0);
    const saves = useRef(new Map<string, SaveEdit>());
    const savingRef = useRef(false);
    const router = useRouter();
    const { toast } = useToast();
    const refreshProfile = useCallback(() => {
        setRevision(value => value + 1);
        router.refresh();
    }, [router]);
    const registerSave = useCallback((key: string, save: SaveEdit) => {
        saves.current.set(key, save);
        return () => { if (saves.current.get(key) === save) saves.current.delete(key); };
    }, []);
    async function toggle() {
        if (!canEdit || savingRef.current) return;
        if (!isEditing) { setIsEditing(true); return; }
        savingRef.current = true;
        setIsSaving(true);
        try {
            for (const save of [...saves.current.values()]) await save();
            setIsEditing(false);
            refreshProfile();
        } catch (error) {
            toast({ title: 'Could not finish editing', description: error instanceof Error ? error.message : 'Your changes are still here. Try Done again.', variant: 'destructive' });
        } finally { savingRef.current = false; setIsSaving(false); }
    }
    return <EditModeContext.Provider value={{ isEditing: canEdit && isEditing, toggle, canEdit, isSaving, registerSave, refreshProfile, revision }}>{children}</EditModeContext.Provider>;
}
