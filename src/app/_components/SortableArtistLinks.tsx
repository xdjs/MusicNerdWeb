"use client";

import { useCallback, useContext, useEffect, useState } from 'react';
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, rectSortingStrategy, sortableKeyboardCoordinates, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { EditModeContext } from './EditModeContext';
import EditableLinkIcon from './EditableLinkIcon';
import { orderProfileLinks, type LinkSection, type ProfileLink } from '@/lib/artistProfileLinks';

function LinkItem({ link, artistId, canEdit, editing, saving }: {
    link: ProfileLink; artistId: string; canEdit: boolean; editing: boolean; saving: boolean;
}) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: link.siteName, disabled: !editing || saving });
    return <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={`min-w-0 rounded-xl ${isDragging ? 'relative z-20 scale-110' : ''}`}>
        <EditableLinkIcon href={link.href} siteName={link.siteName} artistId={artistId} iconSrc={link.iconSrc} label={link.label} canEdit={canEdit && !saving}
            dragHandleProps={editing ? { ...attributes, ...listeners, disabled: saving, 'aria-label': `Reorder ${link.label}` } : undefined} />
    </div>;
}

export default function SortableArtistLinks({ artistId, section, links, canEdit }: { artistId: string; section: LinkSection; links: ProfileLink[]; canEdit: boolean }) {
    const { isEditing, isSaving = false, registerSave } = useContext(EditModeContext);
    const [draftOrder, setDraftOrder] = useState<string[] | null>(null);
    const sourceOrder = JSON.stringify(links.map(link => link.siteName));
    const [previousSourceOrder, setPreviousSourceOrder] = useState(sourceOrder);
    // Keep a drag draft through link additions/deletions while editing. After
    // Done, refreshed public ordering becomes the source of truth again.
    if (previousSourceOrder !== sourceOrder) {
        setPreviousSourceOrder(sourceOrder);
        if (!isEditing) setDraftOrder(null);
    }
    const items = draftOrder ? orderProfileLinks(links, draftOrder) : links;
    const order = JSON.stringify(items.map(item => item.siteName));
    const editing = canEdit && isEditing;
    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
    const save = useCallback(async () => {
        if (!canEdit || order === sourceOrder) return;
        const response = await fetch('/api/artist/link-order', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ artistId, section, order: JSON.parse(order) }) });
        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            throw new Error(data.error || 'Could not save your link order. Try Done again.');
        }
    }, [artistId, section, order, sourceOrder, canEdit]);
    useEffect(() => registerSave?.(`links:${artistId}:${section}`, save), [registerSave, artistId, section, save]);
    function onDragEnd({ active, over }: DragEndEvent) {
        if (!editing || isSaving || !over || active.id === over.id) return;
        const from = items.findIndex(item => item.siteName === active.id);
        const to = items.findIndex(item => item.siteName === over.id);
        if (from >= 0 && to >= 0) setDraftOrder(arrayMove(items, from, to).map(item => item.siteName));
    }
    return <DndContext id={`artist-links-${section}`} sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={items.map(item => item.siteName)} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-4 gap-3 sm:grid-cols-6 md:grid-cols-7">
                {items.map(link => <LinkItem key={link.siteName} link={link} artistId={artistId} canEdit={canEdit} editing={editing} saving={isSaving} />)}
            </div>
        </SortableContext>
    </DndContext>;
}
