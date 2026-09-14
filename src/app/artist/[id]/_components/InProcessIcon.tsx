import Image from 'next/image';

/** The In Process scribble mark at icon size, for the Latest card badge (white on the badge's dark chip in both themes); the same file the Support links use. */
export default function InProcessIcon({ size = 12 }: { size?: number }) {
    return <Image src="/siteIcons/inprocess_icon.svg" alt="" width={size} height={size} aria-hidden="true" className="invert" />;
}
