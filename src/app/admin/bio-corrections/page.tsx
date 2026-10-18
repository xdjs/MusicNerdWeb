import { redirect } from 'next/navigation';

/** Preserve existing bookmarks while keeping reviews inside the admin workspace. */
export default function BioCorrectionsPage() {
  redirect('/admin?section=lore&reviewType=corrections');
}
