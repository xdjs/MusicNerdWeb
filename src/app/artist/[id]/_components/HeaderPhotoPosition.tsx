"use client";

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';

interface Props {
    artistId: string;
    imageUrl: string;
    position: number;
    onChange: (y: number) => void;
    onClose: () => void;
}

export default function HeaderPhotoPosition({ artistId, imageUrl, position, onChange, onClose }: Props) {
    const original = useRef(position);
    const [draft, setDraft] = useState(position);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [phone, setPhone] = useState(false);
    const slider = useRef<HTMLInputElement>(null);
    const drag = useRef<{ id: number; start: number; y: number; overflow: number } | null>(null);
    useEffect(() => { slider.current?.focus(); }, []);
    function change(y: number) {
        const next = Math.round(Math.max(0, Math.min(100, y)));
        setDraft(next);
        onChange(next);
    }
    function cancel() { onChange(original.current); onClose(); }
    async function save() {
        if (saving) return;
        setSaving(true);
        setError('');
        try {
            const res = await fetch('/api/artist/header-position', {
                method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ artistId, imageUrl, y: draft }),
            });
            if (!res.ok) throw new Error('Save failed');
            onClose();
        } catch {
            setError('Could not save the position. Your adjustment is still here—try again.');
        } finally { setSaving(false); }
    }
    return <div className="absolute inset-0 z-20" onKeyDown={e => { if (e.key === 'Escape' && !saving) { e.stopPropagation(); cancel(); } }}>
        <div aria-hidden="true" className={`absolute inset-0 touch-none select-none ${saving ? '' : 'cursor-grab active:cursor-grabbing'}`}
            onPointerDown={e => {
                if (saving || drag.current || !e.isPrimary || e.button !== 0) return;
                const frame = e.currentTarget.closest('[data-artist-portrait]');
                const photo = frame?.querySelector('img');
                if (!frame || !photo?.naturalWidth) return;
                const { width, height } = frame.getBoundingClientRect();
                const overflow = photo.naturalHeight * Math.max(width / photo.naturalWidth, height / photo.naturalHeight) - height;
                if (overflow < 1) return;
                drag.current = { id: e.pointerId, start: e.clientY, y: draft, overflow };
                e.currentTarget.setPointerCapture(e.pointerId);
            }}
            onPointerMove={e => {
                const d = drag.current;
                if (d?.id === e.pointerId) change(d.y - (e.clientY - d.start) * 100 / d.overflow);
            }}
            onPointerUp={e => { if (drag.current?.id === e.pointerId) { drag.current = null; e.currentTarget.releasePointerCapture(e.pointerId); } }}
            onPointerCancel={() => { drag.current = null; }} onLostPointerCapture={() => { drag.current = null; }} />
        <p className="pointer-events-none absolute inset-x-4 top-4 mx-auto w-fit rounded-full bg-black/75 px-4 py-2 text-center text-sm text-white">Drag photo up or down</p>
        <div className="absolute inset-x-3 bottom-3 rounded-xl border border-white/20 bg-[#111] p-4 text-white shadow-lg sm:inset-x-5 sm:bottom-5">
            {phone && <div className="mb-3 flex items-center gap-3">
                <div className="relative h-[147px] w-[130px] shrink-0 overflow-hidden rounded-lg border border-white/30">
                    <Image src={imageUrl} alt="Phone photo crop" fill unoptimized sizes="130px" className="object-cover" style={{ objectPosition: `50% ${draft}%` }} />
                </div><p className="text-xs text-white/75">Phone crop preview.<br />Framing varies with screen size and bio length.</p>
            </div>}
            <label className="flex items-center justify-between text-sm" htmlFor="header-photo-position">Vertical position <span aria-hidden="true" className="tabular-nums text-white/70">{draft}%</span></label>
            <input ref={slider} id="header-photo-position" type="range" min="0" max="100" step="1" value={draft} disabled={saving}
                onChange={e => change(Number(e.target.value))} className="my-2 h-8 w-full cursor-pointer accent-pastypink" />
            <p className="mb-3 text-xs text-white/65">Top to bottom. If the full image height is visible, there’s no vertical crop to adjust.</p>
            {error && <p role="alert" className="mb-3 text-sm text-red-200">{error}</p>}
            <div className="flex flex-wrap items-center justify-between gap-2">
                <button type="button" disabled={saving} aria-expanded={phone} onClick={() => setPhone(!phone)} className="min-h-11 text-xs underline underline-offset-4">{phone ? 'Hide phone crop' : 'Preview phone crop'}</button>
                <div className="flex gap-2"><Button type="button" variant="ghost" disabled={saving} onClick={cancel}>Cancel</Button><Button type="button" variant="pink" disabled={saving} onClick={() => void save()}>{saving ? 'Saving…' : 'Save position'}</Button></div>
            </div>
        </div>
    </div>;
}
