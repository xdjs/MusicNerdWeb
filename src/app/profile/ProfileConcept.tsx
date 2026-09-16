"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import styles from './ProfileConcept.module.css';
import ArtistUpdateFilter from './ArtistUpdateFilter';
import ShareLinkDialog from './ShareLinkDialog';
import { ArrowUpRight, Bookmark, Camera, Check, Clock, Pencil, Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import type { User } from '@/server/db/DbTypes';
import LatestCards from '@/app/artist/[id]/_components/LatestCards';
import type { ArtistLatestItem } from '@/lib/artist/artistLatest';
import UserEntriesTable, { type UserEntry } from './UserEntriesTable';

type SavedArtist = { artistId: string; artistName: string; imageUrl?: string | null; sample?: boolean };


const sampleNames = ['Velvet Current', 'Mira Sol', 'Night Orchard', 'Soft Signal', 'June Arcade', 'Low Tide Club', 'Solara', 'Paper Satellites', 'Echo District', 'Luna Vale', 'Static Bloom', 'Blue Meridian', 'After Hours', 'Cedar House', 'Golden Hour', 'Noma', 'Glass Harbor', 'Sunday Radio'];
const sampleArtists: SavedArtist[] = sampleNames.map((artistName, i) => ({ artistId: `sample-${i}`, artistName, sample: true }));
const sampleColors = ['#4b3d64', '#8b493f', '#315f60', '#665c35', '#624e6b', '#3d536e'];
const sampleContributions: UserEntry[] = Array.from({length: 24}, (_, i) => ({id: `sample-contribution-${i}`, artistName: sampleNames[i % sampleNames.length]!, siteName: ['spotify', 'soundcloud', 'deezer', 'website'][i % 4]!, accepted: i % 5 !== 0, ugcUrl: null, createdAt: `2026-09-${String(15 - Math.floor(i / 3)).padStart(2, '0')}T12:00:00Z`}));
const releaseArtwork = 'https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/24/c4/e6/24c4e619-06da-f25b-78ae-1de931c032ae/663918991343.jpg/600x600bb.jpg';
type PreviewUpdate = {artist: string; type: string; title: string; detail: string; date: string; media?: string; actualRelease?: boolean};
const peteRelease: PreviewUpdate = {artist: 'Pete Rango', type: 'Release', title: 'crying on the floor (pete rango mix)', detail: 'Dame Atlas · Pete Rango mix', date: '', actualRelease: true};
const releaseDestinations = [
  {siteName: 'deezer', label: 'Deezer', href: 'https://www.deezer.com/album/970786431', iconSrc: '/siteIcons/deezer_icon.svg'},
  {siteName: 'spotify', label: 'Spotify', href: 'https://open.spotify.com/album/4Kka2weHW2U3B2oPqNe397', iconSrc: '/siteIcons/spotify_icon.svg'},
  {siteName: 'applemusic', label: 'Apple Music', href: 'https://music.apple.com/us/album/crying-on-the-floor-pete-rango-mix-single/1895667270', iconSrc: ''},
];
const sampleUpdates: PreviewUpdate[] = [
  {artist: 'Velvet Current', type: 'Release', title: 'After the last train', detail: 'A new EP', date: 'Sep 15'},
  {artist: 'Velvet Current', type: 'Instagram', media: 'Post', title: 'Behind the record', detail: 'Sample studio photos and notes', date: 'Sep 13'},
  {artist: 'Mira Sol', type: 'Instagram', media: 'Post', title: 'A quiet moment on the road', detail: 'Sample tour diary', date: 'Sep 12'},
  {artist: 'Mira Sol', type: 'Interview', title: 'The sounds that shaped my first record', detail: 'An artist’s story, in their own words', date: 'Sep 14'},
  {artist: 'Night Orchard', type: 'In-Process', media: 'Video', title: 'Live from the studio', detail: 'A performance from the latest sessions', date: 'Sep 14'},
  {artist: 'Night Orchard', type: 'Instagram', media: 'Post', title: 'Inside the making of a debut album', detail: 'A glimpse behind the scenes', date: 'Sep 13'},
  {artist: 'Night Orchard', type: 'In-Process', media: 'Audio', title: 'A melody before the lyrics', detail: 'A work-in-progress demo', date: 'Sep 12'},
  {artist: 'Velvet Current', type: 'Release', title: 'Side streets', detail: 'A new single', date: 'Sep 12'},
];

/** Development-only visual study. No account writes, uploads or new research. */
export default function ProfileConcept({ user, showcase = false, emptyPreview = false, emptyCollection = false }: { user: Pick<User, 'id' | 'email' | 'wallet' | 'isAdmin' | 'isWhiteListed' | 'isHidden'>; showcase?: boolean; emptyPreview?: boolean; emptyCollection?: boolean }) {
  const [findingArtists, setFindingArtists] = useState(false);
  const [previewBookmarks, setPreviewBookmarks] = useState<SavedArtist[]>([]);
  const [bookmarkNotice, setBookmarkNotice] = useState('');
  const [collectionOpen, setCollectionOpen] = useState(false);
  const [sharingLink, setSharingLink] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyFilter, setHistoryFilter] = useState({value: 'all'});
  const [collectionQuery, setCollectionQuery] = useState('');
  const [updateFilter, setUpdateFilter] = useState('All');
  const [artists, setArtists] = useState<SavedArtist[]>(showcase ? [{artistId: 'showcase-pete', artistName: 'Pete Rango', sample: true}, {artistId: 'showcase-spearfisher', artistName: 'Spearfisher', sample: true}] : []);
  const [name, setName] = useState('Pete Rango');
  const [draftName, setDraftName] = useState(name);
  const [photo, setPhoto] = useState<string | null>('/demo/pete-rango-logo.png');
  const [draftPhoto, setDraftPhoto] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [photoError, setPhotoError] = useState('');
  useEffect(() => {
    if (showcase) return;
    try {
      const saved = JSON.parse(localStorage.getItem(`bookmarks_${user.id}`) || '[]');
      if (Array.isArray(saved)) setArtists(saved);
    } catch { /* The empty collection retains its search entry. */ }
  }, [user.id, showcase]);
  const featured = artists.find(artist => artist.artistName.toLowerCase() === 'pete rango');

  const linkedArtists = artists.filter(artist => !artist.sample);
  const artistUrls = Object.fromEntries(linkedArtists.map(artist => [artist.artistName, `/artist/${artist.artistId}`]));
  const contributions = emptyPreview ? [] : sampleContributions.map((entry, index) => linkedArtists[index] ? {...entry, artistName: linkedArtists[index].artistName} : entry);
  const bookmarks = [...previewBookmarks, ...(emptyCollection ? [] : [...artists, ...sampleArtists])];
  // Preview contribution fixtures stand in for the future added/updated artist query.
  const contributedArtists = contributions.filter(entry => entry.accepted && entry.artistName).map(entry =>
    [...artists, ...sampleArtists].find(artist => artist.artistName === entry.artistName)
  ).filter((artist): artist is SavedArtist => Boolean(artist));
  const collection = bookmarks.filter((artist, index, all) => all.findIndex(item => item.artistId === artist.artistId) === index);
  const suggestedArtists = emptyCollection ? contributedArtists.filter((artist, index, all) => all.findIndex(item => item.artistId === artist.artistId) === index && !collection.some(saved => saved.artistId === artist.artistId)).slice(0, 3) : [];
  const matchingArtists = collection.filter(artist => artist.artistName.toLowerCase().includes(collectionQuery.toLowerCase()));

  const updateGroups = [
    ...(featured ? [{name: 'Pete Rango', image: featured.imageUrl || '/musicNerdLogo.png', updates: [peteRelease]}] : []),
    ...['Velvet Current', 'Mira Sol', 'Night Orchard'].map(name => ({name, image: '/musicNerdLogo.png', updates: sampleUpdates.filter(update => update.artist === name)})),
  ].map((group, groupIndex) => ({...group, id: `profile-latest-${groupIndex}`, items: group.updates.filter(update => updateFilter === 'All' || update.type === updateFilter).map((update, index): ArtistLatestItem => ({
    id: `${groupIndex}-${index}-${update.title}`, kind: update.type === 'Release' ? 'release' : update.type === 'Instagram' ? 'instagram' : update.type === 'Interview' ? 'interview' : 'moment',
    title: update.title, text: update.actualRelease ? 'Dame Atlas · Pete Rango mix' : `${update.detail}. Fictional sample update.`, date: update.actualRelease ? '2026-05-13' : `2026-09-${update.date.slice(-2)}`,
    imageUrl: update.actualRelease ? releaseArtwork : null, imageCaption: update.actualRelease ? 'Release cover' : 'Sample artwork', sourceUrl: update.actualRelease ? 'https://www.deezer.com/album/970786431' : null, sourceLabel: update.actualRelease ? 'Listen on Deezer' : '',
    listeningLinks: update.actualRelease ? releaseDestinations : [], ...(update.type === 'In-Process' ? {momentKind: update.media === 'Audio' ? 'audio' as const : 'video' as const} : {}),
  })).sort((a, b) => b.date.localeCompare(a.date))})).filter(group => group.items.length);

  const mixedUpdates = updateGroups.flatMap(group => group.items.slice(0, 2)).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 12);

  const updateArtistNames = Object.fromEntries(updateGroups.flatMap(group => group.items.map(item => [item.id, group.name])));

  const updateArtistUrls = Object.fromEntries(updateGroups.flatMap(group => {
    const saved = artists.find(artist => artist.artistName === group.name);
    return saved && !saved.sample ? group.items.map(item => [item.id, `/artist/${saved.artistId}`]) : [];
  }));

  const artistCard = (artist: SavedArtist) => (artist.sample ? <div><div className="aspect-square rounded-xl flex items-center justify-center overflow-hidden" style={{backgroundColor: sampleColors[Math.max(0, sampleArtists.findIndex(item => item.artistId === artist.artistId)) % sampleColors.length]}}><span className="text-2xl sm:text-4xl font-semibold tracking-tighter text-white/80" aria-hidden="true">{artist.artistName.split(' ').map(word => word[0]).join('')}</span></div><h3 className="text-xs sm:text-base font-semibold mt-2 break-words line-clamp-2">{artist.artistName}</h3></div> : <Link href={`/artist/${artist.artistId}`} className="block group"><div className="aspect-square w-full overflow-hidden rounded-xl bg-[#292529] flex items-center justify-center">{artist.imageUrl && !/default|placeholder|musicnerdlogo/i.test(artist.imageUrl) ? <img src={artist.imageUrl} alt="" className={artist.artistName.toLowerCase() === 'pete rango' ? "h-1/2 w-1/2 object-contain invert mix-blend-screen opacity-80" : "h-full w-full object-cover"} /> : <img src="/musicNerdLogo.png" alt="" className="h-20 w-20 object-contain opacity-80" />}</div><h3 className="text-xs sm:text-base font-semibold mt-2 break-words line-clamp-2 group-hover:underline">{artist.artistName}</h3></Link>);

  return <main className={`${styles.concept} mx-auto w-full min-w-0 max-w-6xl px-5 sm:px-10 pb-16 text-foreground`}>

    <header className="flex flex-wrap items-center gap-3 sm:gap-5 py-5 sm:py-6">
      <div className="h-16 w-16 sm:h-20 sm:w-20 shrink-0 overflow-hidden rounded-full bg-[#ff75d8] flex items-center justify-center text-[#000]">
        {photo ? <img src={photo} alt="Preview profile photo" className={`h-full w-full object-cover ${photo === '/demo/pete-rango-logo.png' ? 'invert' : ''}`} /> : <span className="text-4xl font-semibold">PR</span>}
      </div>
      <div className="min-w-0 flex-1">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight break-words">{name}</h1>
        <div className="mt-1 space-y-0.5 text-xs sm:text-sm break-words">
          <p>{user.email || user.wallet || 'Signed-in account'}</p>
          <p className="text-muted-foreground">{[user.isAdmin && 'Admin', user.isWhiteListed && 'Whitelisted', user.isHidden && 'Hidden'].filter(Boolean).join(', ') || 'Member'}</p>
        </div>
      </div>
      <Button variant="outline" aria-label="Edit profile" className="rounded-full shrink-0 w-10 h-10 sm:w-auto px-0 sm:px-4 bg-neutral-100 dark:bg-[#242424] border-neutral-300 dark:border-white/15 text-foreground hover:bg-neutral-200 dark:hover:bg-[#303030] hover:text-foreground" onClick={() => { setDraftName(name); setDraftPhoto(photo); setPhotoError(''); setEditing(true); }}><Pencil size={16} className="sm:mr-2" /><span className="hidden sm:inline">Edit profile</span></Button>
    </header>

    <section aria-labelledby="concept-impact" className="border-t border-b border-border py-4 sm:py-6 mb-8">
      <div className="flex items-center justify-between gap-3 mb-3"><h2 id="concept-impact" className="flex items-center gap-2 text-xl sm:text-2xl font-semibold tracking-tight">Your impact
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/music-nerd-shades.png" alt="" className="h-4 w-5 shrink-0 object-contain dark:invert" /></h2><span className="text-xs text-muted-foreground">Sample activity</span></div>
      {contributions.length ? <>
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] sm:gap-8">
        <div>
          <button type="button" onClick={() => { setHistoryFilter({value: 'approved'}); setHistoryOpen(true); }} className="flex flex-col items-start gap-1 text-left rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-pink-400">
            <span className="text-5xl sm:text-6xl font-semibold tracking-tight tabular-nums">{contributions.filter(entry => entry.accepted).length}</span>
            <span className="text-sm font-medium leading-snug">Approved contributions</span>
          </button>
          <p className="mt-2 text-sm text-muted-foreground">You’re helping fans discover more.</p>
          <button type="button" onClick={() => { setHistoryFilter({value: 'pending'}); setHistoryOpen(true); }} className="mt-2 inline-flex items-center gap-1.5 text-xs text-muted-foreground underline underline-offset-4"><Clock size={13} />{contributions.filter(entry => !entry.accepted).length} awaiting review</button>
        </div>
        <div className="min-w-0 border-t border-border pt-4 sm:border-t-0 sm:border-l sm:pl-6 sm:pt-0">
          <h3 className="text-sm font-semibold mb-1">Recent contributions</h3>
          <ul className="divide-y divide-border">{contributions.slice(0, 3).map(entry => <li key={entry.id} className="flex items-center justify-between gap-3 py-2.5">
            <div className="min-w-0"><p className="text-sm font-medium truncate">{entry.artistName && artistUrls[entry.artistName] ? <Link href={artistUrls[entry.artistName]} className="underline decoration-current/25 underline-offset-4 hover:decoration-pink-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-pink-400">{entry.artistName}</Link> : entry.artistName}</p><p className="text-xs text-muted-foreground mt-0.5">{entry.siteName === 'spotify' ? 'Spotify' : entry.siteName === 'soundcloud' ? 'SoundCloud' : 'Deezer'} link · Sep 15</p></div>
            <span className={`inline-flex shrink-0 items-center gap-1 text-[11px] font-medium ${entry.accepted ? 'text-[#92236e] dark:text-[#ff9ce4]' : 'text-muted-foreground'}`}>{entry.accepted ? <span className="rounded-full bg-[#ff75d8]/15 p-1"><Check size={12} aria-hidden="true" /></span> : <Clock size={13} aria-hidden="true" />}{entry.accepted ? 'Approved' : 'Pending'}</span>
          </li>)}</ul>
        </div>
      </div>
      <div className="mt-4 pt-3 border-t border-border flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button type="button" onClick={() => { setHistoryFilter({value: 'all'}); setHistoryOpen(true); }} className="inline-flex items-center gap-1.5 text-sm font-medium underline underline-offset-4">View all contributions<ArrowUpRight size={14} /></button>
        <Link href="/leaderboard" className="text-xs text-muted-foreground hover:underline">Community leaderboard</Link>
      </div>
      </> : <div className="py-1 sm:py-3 max-w-lg">
        <h3 className="text-2xl sm:text-3xl font-semibold tracking-tight leading-tight">Help someone discover their next favorite artist.</h3>
        <p className="mt-3 text-sm text-muted-foreground">Add someone new or help complete an artist’s profile. Your contributions will appear here.</p>
        <div className="mt-5 flex flex-wrap gap-2"><Button className="rounded-full bg-[#ff75d8] text-black hover:bg-[#ff75d8]/80" onClick={() => (document.querySelector('button[aria-label="Add new artist"]') as HTMLButtonElement | null)?.click()}><Plus size={15} className="mr-1.5" />Add an artist</Button><Button variant="outline" className="rounded-full bg-transparent" onClick={() => setSharingLink(true)}><Pencil size={15} className="mr-1.5" />Update an artist</Button></div>
      </div>}
    </section>

        {contributions.length > 0 && <section className="min-w-0 w-full border border-[#ff75d8]/40 rounded-2xl p-4 sm:p-5 mb-8">
          <h2 className="text-xl font-semibold leading-tight">Know something we don’t?</h2><p className="mt-3 text-sm text-muted-foreground leading-relaxed">Help fill in an artist’s story. Add a link or introduce someone new.</p>
          <div className="mt-4 flex flex-wrap gap-2"><Button variant="outline" className="rounded-full bg-transparent" onClick={() => setSharingLink(true)}>Share a link</Button><Button className="rounded-full bg-[#ff75d8] text-[#000] hover:bg-[#ff75d8]/80" onClick={() => (document.querySelector('button[aria-label="Add new artist"]') as HTMLButtonElement | null)?.click()}><Plus size={15} className="mr-1.5" />Add an artist</Button></div>
        </section>}

    <div className="min-w-0 w-full">
      <div className="min-w-0 space-y-9">
        <section aria-labelledby="concept-artists">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
            <h2 id="concept-artists" className="flex items-center gap-2.5 text-2xl font-semibold tracking-tight">Your artists <span className="inline-flex min-w-7 h-7 items-center justify-center rounded-full bg-black/5 px-2 text-xs font-medium tabular-nums tracking-normal text-muted-foreground dark:bg-white/10">{collection.length}</span></h2>
            {collection.length > 0 && <button type="button" className="inline-flex items-center gap-2 text-sm underline underline-offset-4" onClick={() => { setCollectionQuery(''); setCollectionOpen(true); }}><Search size={15} />Search collection</button>}
          </div>
          {collection.length > 0 ? <>
          <ul aria-label="Bookmarked artists" tabIndex={0} className="flex gap-3 sm:gap-5 overflow-x-auto scrollbar-hide overscroll-x-contain snap-x snap-mandatory pb-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-pink-400" onKeyDown={event => { if (event.target !== event.currentTarget) return; if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') { event.preventDefault(); event.currentTarget.scrollBy({left: (event.currentTarget.firstElementChild?.getBoundingClientRect().width || 100) * (event.key === 'ArrowRight' ? 1 : -1), behavior: 'auto'}); } }}>
            {collection.map((artist) => <li key={artist.artistId} className="w-[calc((100%_-_24px)/3)] sm:w-[calc((100%_-_80px)/5)] min-w-0 shrink-0 snap-start">{artistCard(artist)}</li>)}
          </ul>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2"><button type="button" className="text-sm underline underline-offset-4" onClick={() => { setCollectionQuery(''); setCollectionOpen(true); }}>View all {collection.length} artists</button><button type="button" className="text-sm underline underline-offset-4" onClick={() => setFindingArtists(true)}>Find artists</button><span className="text-xs text-muted-foreground">Swipe to browse</span></div>
          <p className="mt-3 text-xs text-muted-foreground">{emptyCollection ? 'Bookmarks added in this preview.' : showcase ? 'Demonstration collection' : 'Your bookmarks + 18 fictional sample artists'}</p>
          </> : <div className="py-2 max-w-md">
            <h3 className="text-lg font-semibold">Keep your favorite artists close.</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Bookmark artists to keep them here and follow their latest updates.</p>
            <Button variant="outline" className="mt-4 rounded-full bg-transparent" onClick={() => setFindingArtists(true)}><Search size={16} className="mr-2" />Find artists</Button>
          </div>}
          {suggestedArtists.length > 0 && <div className="mt-6 border-t border-border pt-5">
            <h3 className="text-sm font-semibold">Start with artists you’ve helped</h3>
            <p className="mt-1 text-xs text-muted-foreground">Suggestions from your sample contributions.</p>
            <ul className="mt-3 divide-y divide-border">{suggestedArtists.map(artist => <li key={artist.artistId} className="flex items-center justify-between gap-3 py-3">
              <div className="flex min-w-0 items-center gap-3">
                {artist.imageUrl ? <img src={artist.imageUrl} alt="" className="h-11 w-11 shrink-0 rounded-full object-cover" /> : <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium text-muted-foreground">{artist.artistName.split(' ').map(part => part[0]).slice(0, 2).join('')}</span>}
                <span className="text-sm font-medium break-words">{artist.artistName}</span>
              </div>
              <Button variant="outline" className="shrink-0 rounded-full bg-transparent" aria-label={`Bookmark ${artist.artistName}`} onClick={() => {
                setPreviewBookmarks(current => current.some(saved => saved.artistId === artist.artistId) ? current : [...current, artist]);
                setBookmarkNotice(`${artist.artistName} added to your artists.`);
              }}><Bookmark size={15} className="mr-1.5" />Bookmark</Button>
            </li>)}</ul>
          </div>}

        </section>

        {!emptyCollection && collection.length > 0 && <section aria-labelledby="concept-latest" className="border-t border-border pt-7">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4"><h2 id="concept-latest" className="text-2xl font-semibold tracking-tight">Your artists lately</h2><span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">Sample updates</span></div>
          <p className="text-sm text-muted-foreground mb-5">Sample releases, Instagram posts, In-Process moments and artist answers.</p>
          <div className="mb-5"><ArtistUpdateFilter value={updateFilter} onValueChange={setUpdateFilter} /></div>
          <LatestCards sectionId="profile-lately" heading="Latest updates" hideHeading itemArtistNames={updateArtistNames} itemArtistUrls={updateArtistUrls} artistName="Your artists" artistImage="/musicNerdLogo.png" items={mixedUpdates} unavailable={false} showFilters={false} />
        </section>}
      </div>


    </div>

    <Dialog open={historyOpen} onOpenChange={setHistoryOpen}><DialogContent className="mn-themed-dialog w-[calc(100%_-_2rem)] max-w-4xl max-h-[85dvh] overflow-y-auto rounded-2xl bg-background p-5 sm:p-6">
      <DialogHeader className="text-left"><DialogTitle>All contributions</DialogTitle><DialogDescription>Sample activity for this design preview. Your real history is unchanged.</DialogDescription></DialogHeader>
      <UserEntriesTable concept statusFilter={historyFilter} sampleEntries={contributions} artistUrls={artistUrls} artistImages={Object.fromEntries(artists.filter(artist => artist.imageUrl).map(artist => [artist.artistName, artist.imageUrl!]))} />
    </DialogContent></Dialog>

    <Dialog open={collectionOpen} onOpenChange={setCollectionOpen}><DialogContent className="mn-themed-dialog !top-auto !bottom-0 !translate-y-0 w-full max-w-2xl h-[85dvh] flex flex-col gap-4 rounded-t-3xl rounded-b-none sm:!top-1/2 sm:!bottom-auto sm:!-translate-y-1/2 sm:rounded-2xl bg-background/95 backdrop-blur-2xl p-5 sm:p-6">
      <DialogHeader className="shrink-0 text-left"><DialogTitle className="flex items-center gap-2.5">Your artists <span className="inline-flex min-w-7 h-7 items-center justify-center rounded-full bg-black/5 px-2 text-xs font-medium tabular-nums tracking-normal text-muted-foreground dark:bg-white/10">{collection.length}</span></DialogTitle><DialogDescription>Browse and search your bookmarked artists. Includes labeled sample artists for this preview.</DialogDescription></DialogHeader>
      <Input aria-label="Search bookmarked artists" placeholder="Search your collection" value={collectionQuery} onChange={event => setCollectionQuery(event.target.value)} className="shrink-0 rounded-full bg-neutral-100 dark:bg-white/5" />
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1" aria-label="Full artist collection"><p className="text-xs text-muted-foreground mb-4" aria-live="polite">{matchingArtists.length} {matchingArtists.length === 1 ? 'artist' : 'artists'}</p><ul className="grid grid-cols-2 sm:grid-cols-3 gap-5 pb-5">{matchingArtists.map((artist) => <li key={artist.artistId} className="min-w-0">{artistCard(artist)}{artist.sample && <span className="text-xs text-muted-foreground">Sample artist</span>}</li>)}</ul>{!matchingArtists.length && <p className="py-8 text-muted-foreground">No bookmarked artists match “{collectionQuery}”.</p>}</div>
    </DialogContent></Dialog>

    <ShareLinkDialog open={findingArtists} onOpenChange={setFindingArtists} title="Find artists" bookmarkedIds={bookmarks.map(artist => artist.artistId)} onBookmark={artist => {
      setPreviewBookmarks(current => current.some(item => item.artistId === artist.id) ? current : [...current, {artistId: artist.id, artistName: artist.name, imageUrl: artist.imageUrl}]);
      setBookmarkNotice(`${artist.name} added to your artists.`);
    }} />
    <span role="status" className="sr-only">{bookmarkNotice}</span>
    <ShareLinkDialog title={emptyPreview ? "Update an artist" : "Share a link"} open={sharingLink} onOpenChange={setSharingLink} />

    <Dialog open={editing} onOpenChange={setEditing}><DialogContent className="mn-themed-dialog max-w-md"><DialogHeader className="text-left pr-7"><DialogTitle className="text-xl">Edit profile</DialogTitle><DialogDescription>Update your name and photo for this preview.</DialogDescription></DialogHeader>
      <form className="space-y-5" onSubmit={event => { event.preventDefault(); setName(draftName.trim() || name); setPhoto(draftPhoto); setEditing(false); }}>
        <div><label htmlFor="concept-name" className="block text-sm mb-2">Display name</label><Input className="min-h-12 rounded-xl bg-transparent border-border focus-visible:ring-pastypink/50" id="concept-name" maxLength={50} value={draftName} onChange={event => setDraftName(event.target.value)} /></div>
        <div><label htmlFor="concept-photo" className="flex items-center gap-2 text-sm mb-2"><Camera size={16} />Profile photo</label><input id="concept-photo" type="file" accept="image/jpeg,image/png,image/webp" className="block w-full min-w-0 text-xs text-muted-foreground file:mr-3 file:rounded-full file:border file:border-border file:bg-transparent file:px-4 file:py-2.5 file:text-sm file:font-medium file:text-foreground hover:file:bg-pastypink/10" onChange={event => { const file = event.target.files?.[0]; if (!file) return; if (file.size > 2 * 1024 * 1024 || !['image/jpeg','image/png','image/webp'].includes(file.type)) { setPhotoError('Choose a JPG, PNG or WebP under 2 MB.'); return; } setPhotoError(''); const reader = new FileReader(); reader.onload = () => setDraftPhoto(String(reader.result)); reader.readAsDataURL(file); }} />{photoError && <p role="alert" className="text-sm mt-2">{photoError}</p>}{draftPhoto && <img src={draftPhoto} alt="Selected preview photo" className={`h-16 w-16 rounded-full object-cover mt-3 ${draftPhoto === '/demo/pete-rango-logo.png' ? 'invert' : ''}`} />}</div>
        <div className="flex justify-end gap-2 border-t border-border pt-4"><Button className="rounded-full" type="button" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button><Button type="submit" className="rounded-full bg-[#ff75d8] text-[#000] hover:bg-[#ff75d8]/80">Apply to preview</Button></div>
      </form>
    </DialogContent></Dialog>
  </main>;
}
