import type { ProfileView } from "@/lib/onboarding/buildStages";
import ResearchAvatar from "./ResearchAvatar";

/** One profile the build found: its image (else the platform logo, else its
 *  first letter), the platform, and the handle. Opens the profile when there
 *  is a URL for it. */
export default function ResearchProfileCard({ profile }: { profile: ProfileView }) {
    const body = (
        <>
            <ResearchAvatar
                images={[{ src: profile.previewImage }, { src: profile.logoUrl, inset: true }]}
                letter={profile.displayName.charAt(0).toLowerCase()}
            />
            <span className="flex min-w-0 flex-col">
                <span className="flex items-center gap-1.5 text-[15px] font-medium lowercase text-foreground">
                    {profile.logoUrl && (
                        // eslint-disable-next-line @next/next/no-img-element -- the platform's icon from urlmap
                        <img src={profile.logoUrl} alt="" className="h-3.5 w-3.5 object-contain" />
                    )}
                    {profile.displayName}
                </span>
                <span className="truncate text-sm text-[hsl(var(--muted-foreground))]">{profile.value}</span>
            </span>
        </>
    );
    const box = "flex items-center gap-3 rounded-xl p-3 shadow-[0_0_0_1px_hsl(var(--border))]";
    return (
        <li className="min-w-0">
            {profile.profileUrl
                ? <a href={profile.profileUrl} target="_blank" rel="noopener noreferrer" className={`${box} transition-colors hover:bg-muted/40`}>{body}</a>
                : <div className={box}>{body}</div>}
        </li>
    );
}
