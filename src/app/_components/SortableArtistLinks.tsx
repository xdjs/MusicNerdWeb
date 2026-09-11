"use client";

import { useContext, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, GripVertical } from 'lucide-react';
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, rectSortingStrategy, sortableKeyboardCoordinates, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { EditModeContext } from './EditModeContext';
import EditableLinkIcon from './EditableLinkIcon';
import { useToast } from '@/hooks/use-toast';
import type { LinkSection, ProfileLink } from '@/lib/artistProfileLinks';

function LinkItem({ link, artistId, canEdit, editing, index, count, move }: {
    link: ProfileLink; artistId: string; canEdit: boolean; editing: boolean; index: number; count: number;
    move: (from: number, to: number) => void;
}) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: link.siteName, disabled: !editing });
    return <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={`min-w-0 rounded-xl ${isDragging ? 'relative z-20 bg-pastypink/20' : ''}`}>
        <EditableLinkIcon href={link.href} siteName={link.siteName} artistId={artistId} iconSrc={link.iconSrc} label={link.label} canEdit={canEdit} />
        {editing && <div className="mt-1 flex flex-wrap items-center justify-center">
            <button type="button" onClick={() => move(index, index - 1)} disabled={index === 0} aria-label={`Move ${link.label} earlier`} className="flex h-9 w-7 items-center justify-center rounded hover:bg-pastypink/25 disabled:opacity-25"><ArrowLeft size={14} /></button>
            <button type="button" {...attributes} {...listeners} aria-label={`Drag ${link.label} to reorder`} className="flex h-9 w-7 touch-none items-center justify-center rounded hover:bg-pastypink/25"><GripVertical size={16} /></button>
            <button type="button" onClick={() => move(index, index + 1)} disabled={index === count - 1} aria-label={`Move ${link.label} later`} className="flex h-9 w-7 items-center justify-center rounded hover:bg-pastypink/25 disabled:opacity-25"><ArrowRight size={14} /></button>
        </div>}
    </div>;
}

export default function SortableArtistLinks({ artistId, section, links, canEdit }: { artistId: string; section: LinkSection; links: ProfileLink[]; canEdit: boolean }) {
    const { isEditing } = useContext(EditModeContext);
    const [items, setItems] = useState(links);
    const [saving, setSaving] = useState(false);
    const savingRef = useRef(false);
    const router = useRouter();
    const { toast } = useToast();
    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
    const editing = canEdit && isEditing && !saving;
    const dirty = items.some((item, index) => item.siteName !== links[index]?.siteName);
    // Discard uncommitted ordering when leaving edit mode; saved order is public.
    const displayed = canEdit && isEditing ? items : links;
    const [wasEditing, setWasEditing] = useState(isEditing);
    if (wasEditing !== isEditing) {
        setWasEditing(isEditing);
        if (!isEditing) setItems(links);
    }
    function move(from: number, to: number) {
        if (!editing || to < 0 || to >= items.length) return;
        setItems(current => arrayMove(current, from, to));
    }
    function onDragEnd({ active, over }: DragEndEvent) {
        if (over && active.id !== over.id) move(items.findIndex(item => item.siteName === active.id), items.findIndex(item => item.siteName === over.id));
    }
    async function save() {
        if (savingRef.current) return;
        savingRef.current = true;
        setSaving(true);
        try {
            const response = await fetch('/api/artist/link-order', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ artistId, section, order: items.map(item => item.siteName) }) });
            if (!response.ok) throw new Error((await response.json()).error || 'Please try again.');
            toast({ title: 'Link order saved' });
            router.refresh();
        } catch (error) {
            toast({ title: 'Could not save link order', description: error instanceof Error ? error.message : 'Please try again.', variant: 'destructive' });
        } finally { savingRef.current = false; setSaving(false); }
    }
    return <div className="space-y-3">
        {canEdit && isEditing && <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">Drag links or use the arrows to reorder.</p>
            <div className="flex gap-2">
                {dirty && <button type="button" disabled={saving} onClick={() => setItems(links)} className="min-h-11 rounded-full px-3 text-sm disabled:opacity-50">Discard order</button>}
                <button type="button" disabled={!dirty || saving} onClick={save} className="min-h-11 rounded-full bg-pastypink px-4 text-sm font-semibold text-gray-950 disabled:opacity-40">{saving ? 'Saving…' : 'Save order'}</button>
            </div>
        </div>}
        <DndContext id={`artist-links-${section}`} sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={displayed.map(item => item.siteName)} strategy={rectSortingStrategy}>
                <div className={`grid gap-3 ${canEdit && isEditing ? 'grid-cols-3 sm:grid-cols-5 md:grid-cols-6' : 'grid-cols-4 sm:grid-cols-6 md:grid-cols-7'}`}>
                    {displayed.map((link, index) => <LinkItem key={link.siteName} link={link} artistId={artistId} canEdit={canEdit && !saving} editing={editing} index={index} count={displayed.length} move={move} />)}
                </div>
            </SortableContext>
        </DndContext>
    </div>;
}
