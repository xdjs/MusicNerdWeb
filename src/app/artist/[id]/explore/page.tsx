import { notFound } from "next/navigation";
import { z } from "zod";
import IntentExplorer from "@/app/dev/intent-preview/IntentExplorer";
import { evidenceSchema } from "@/lib/intent/applyCanvasUpdate";
import { previewApiUrl } from "@/lib/intent/previewApiUrl";
const schema = z.object({
  artist: z.object({
    id: z.string().uuid(),
    name: z.string(),
    profileUrl: z.string(),
  }),
  evidence: z.array(evidenceSchema).max(64),
  coverage: z.string(),
  sourceCount: z.number(),
  generationEnabled: z.boolean(),
  introduction: z
    .object({ text: z.string(), sourceUrl: z.string().url() })
    .nullable(),
  openingIds: z.array(z.string()).max(3),
  openingQuestion: z.string(),
  openingSuggestions: z
    .array(z.object({ label: z.string(), prompt: z.string() }))
    .max(2),
});
export default async function ArtistExplore({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const api = previewApiUrl();
  if (!api) notFound();
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  let data;
  try {
    const response = await fetch(`${api}/api/artist/${id}/canvas`, {
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
    if (response.status === 404) notFound();
    if (!response.ok) throw new Error("Unavailable");
    data = schema.parse(await response.json());
  } catch {
    return (
      <section className="p-8">
        <h1>Artist exploration is temporarily unavailable</h1>
        <p>Your artist profile is still available.</p>
        <a href={`/artist/${id}?view=profile`}>Open artist profile</a>
      </section>
    );
  }
  return (
    <IntentExplorer
      key={id}
      artistId={id}
      liveApiUrl={api}
      profile={data.artist}
      initialEvidence={data.evidence}
      coverage={data.coverage}
      generationEnabled={data.generationEnabled}
      introduction={data.introduction}
      openingIds={data.openingIds}
      openingQuestion={data.openingQuestion}
      openingSuggestions={data.openingSuggestions}
      embedded
    />
  );
}
