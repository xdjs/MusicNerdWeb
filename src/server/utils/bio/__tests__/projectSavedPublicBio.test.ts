import { createHash } from "node:crypto";
import { projectSavedPublicBio } from "../projectSavedPublicBio";
import { vaultSourceRevision } from "@/server/utils/artistDoc/vaultSourceRevision";
const evidence = {
  id: "source",
  url: "https://example.org/source",
  publication: "inherit",
  extractedText: "Evidence",
  activityId: "event",
  origin: "upload",
};
const bio = "New biography.";
const provenance = {
  version: 1,
  kind: "generated",
  bioHash: createHash("sha256").update(bio).digest("hex"),
  claimId: null,
  sources: [{ id: 1, kind: "vault", url: evidence.url, revision: vaultSourceRevision(evidence) }],
};
it("publishes trusted unclaimed output and preserves it through claiming", () => {
  expect(projectSavedPublicBio({ bio, provenance, claimId: null, evidence: [evidence] })).toBe(bio);
  expect(projectSavedPublicBio({ bio, provenance, claimId: "claim", evidence: [evidence] })).toBe(
    bio,
  );
});
it.each([
  null,
  { kind: "unknown" },
  { ...provenance, bioHash: "wrong" },
  { ...provenance, claimId: "revoked" },
  { ...provenance, sources: [] },
  { ...provenance, sources: [{ kind: "interview", url: null }] },
])("fails closed unclaimed for %j", p =>
  expect(
    projectSavedPublicBio({ bio, provenance: p, claimId: null, evidence: [evidence] }),
  ).toBeNull(),
);
it("withholds legacy claimed text without inferring authorship", () => {
  expect(projectSavedPublicBio({ bio, provenance: null, claimId: "claim", evidence: [] })).toBeNull();
  expect(
    projectSavedPublicBio({ bio, provenance: { kind: "unknown" }, claimId: "claim", evidence: [] }),
  ).toBeNull();
});
it("withholds changed, rejected or private evidence and changed text", () => {
  for (const current of [
    [],
    [{ ...evidence, publication: "private" }],
    [{ ...evidence, extractedText: "changed" }],
  ])
    expect(projectSavedPublicBio({ bio, provenance, claimId: null, evidence: current })).toBeNull();
  expect(
    projectSavedPublicBio({ bio: "Edited text", provenance, claimId: null, evidence: [evidence] }),
  ).toBeNull();
});
it("claim scoped evidence never crosses revocation or replacement", () => {
  const p = { ...provenance, claimId: "original" };
  expect(
    projectSavedPublicBio({ bio, provenance: p, claimId: "original", evidence: [evidence] }),
  ).toBe(bio);
  expect(
    projectSavedPublicBio({ bio, provenance: p, claimId: "replacement", evidence: [evidence] }),
  ).toBeNull();
});

it("artist-authored echo stays bound to its approved claim and evidence", () => {
  const p = { ...provenance, kind: "authored", claimId: "claim" };
  expect(
    projectSavedPublicBio({ bio, provenance: p, claimId: "claim", evidence: [evidence] }),
  ).toBe(bio);
  expect(
    projectSavedPublicBio({ bio, provenance: p, claimId: null, evidence: [evidence] }),
  ).toBeNull();
  expect(
    projectSavedPublicBio({
      bio,
      provenance: { ...p, claimId: null },
      claimId: null,
      evidence: [evidence],
    }),
  ).toBeNull();
});
it("rejects array-coerced provenance and source kinds", () => {
  for (const invalid of [
    { ...provenance, kind: ["generated"], claimId: "claim", sources: [] },
    { ...provenance, claimId: "claim", sources: [{ id: 1, kind: ["vault"], url: evidence.url }] },
  ]) expect(projectSavedPublicBio({ bio, provenance: invalid, claimId: "claim", evidence: [] })).toBeNull();
});

it("requires evidence for generated claimed text but allows explicit same-claim authored text", () => {
  const p = {...provenance, claimId: "claim", sources: []};
  expect(projectSavedPublicBio({bio, provenance:p, claimId:"claim", evidence:[]})).toBeNull();
  expect(projectSavedPublicBio({bio, provenance:{...p,kind:"authored"}, claimId:"claim", evidence:[]})).toBe(bio);
  expect(projectSavedPublicBio({bio, provenance:{...p,kind:"authored"}, claimId:"replacement", evidence:[]})).toBeNull();
});

it('permits only an exact explicitly recorded legacy publication, never unknown provenance', () => {
 const bio='An explicitly retained legacy biography.';
 const hash=createHash('sha256').update(bio).digest('hex');
 const row={bio,provenance:null,claimId:'claim',evidence:[],legacyPublication:{claimId:'claim',bioHash:hash}};
 expect(projectSavedPublicBio(row)).toBe(bio);
 expect(projectSavedPublicBio({...row,claimId:null})).toBeNull();
 expect(projectSavedPublicBio({...row,bio:bio+' changed'})).toBeNull();
 expect(projectSavedPublicBio({...row,provenance:{version:1,kind:'unknown',bioHash:hash}})).toBeNull();
 expect(projectSavedPublicBio({...row,provenance:{}})).toBeNull();
 expect(projectSavedPublicBio({...row,legacyPublication:{claimId:'other',bioHash:hash}})).toBeNull();
});
