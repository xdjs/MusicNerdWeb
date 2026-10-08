import { and, eq, sql } from "drizzle-orm";
import { artistInterviewAnswers } from "@/server/db/schema";
import { withScopedArtistWrite } from "./ownershipWrites";

/** Save an offered answer without replacing an already answered or revised response. */
export async function upsertInterviewAnswer(input: {
    artistId: string;
    questionKey: string;
    question: string;
    answer: string | null;
    /** Used only if this is the INSERT side of the upsert. The conflict update
     *  deliberately never changes the sitting already stored on the row. */
    sitting: number;
    /** "offered" is a question we PUT to them that they have not dealt with
     *  yet — the boundary of a sitting. It becomes "followup" the moment they
     *  answer it or skip it. Without it there is no way to tell a sitting
     *  somebody abandoned from one they finished, because a lifetime row count
     *  cannot see where one offer ended and the next began. */
    source: "onboarding" | "followup" | "offered";
}): Promise<void> {
    await withScopedArtistWrite(input.artistId, async tx => { const saved = await tx
        .insert(artistInterviewAnswers)
        .values(input)
        .onConflictDoUpdate({
            target: [artistInterviewAnswers.artistId, artistInterviewAnswers.questionKey],
            setWhere: eq(artistInterviewAnswers.source, "offered"),
            set: {
                question: input.question,
                answer: input.answer,
                source: input.source,
                // `createdAt` is answer chronology. `offeredAt`, deliberately
                // absent from this update, is the immutable material watermark
                // established by the first insert. That also makes duplicate
                // submits/two-tab retries unable to advance the cutoff.
                createdAt: sql`(now() AT TIME ZONE 'utc'::text)`,
                // `sitting` IS DELIBERATELY ABSENT FROM THIS SET LIST. Answering
                // a question must leave its stored membership intact.
            },
        }).returning({ id: artistInterviewAnswers.id });
        if (saved.length === 0) {
            const [existing] = await tx.select({answer:artistInterviewAnswers.answer}).from(artistInterviewAnswers).where(and(eq(artistInterviewAnswers.artistId,input.artistId),eq(artistInterviewAnswers.questionKey,input.questionKey))).limit(1);
            if (!existing || existing.answer !== input.answer) throw new Error("This question already has a saved response. Edit it from Questions in your profile.");
        }
    });
}

