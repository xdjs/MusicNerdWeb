/** @jest-environment node */
import { publicLinkRevision } from "../publicLinkRevision";
import type { Artist } from "@/server/db/DbTypes";
const artist = { spotify: null, deezer: "123", bio: "private draft" } as Artist;
const source = {
  id: "s1",
  url: "https://music.apple.com/us/artist/test/123",
  type: "profile",
  status: "approved",
  title: "Private title",
  extractedText: "private passage",
};
it("changes for saved destinations before job completion, including source-backed destinations", () => {
  const original = publicLinkRevision(artist, [], [], []);
  expect(
    publicLinkRevision({ ...artist, spotify: "abc" }, [], [], []),
  ).not.toBe(original);
  expect(publicLinkRevision(artist, [], [source], [])).not.toBe(original);
});
it("ignores private text, hidden destinations, pending sources and unrelated Lore", () => {
  const original = publicLinkRevision(artist, [], [], []);
  const changedArtist = { ...artist, bio: "another draft" };
  const changedSource = { ...source, extractedText: "changed" };
  expect(
    publicLinkRevision(
      changedArtist,
      [],
      [{ ...source, status: "pending" }],
      [],
    ),
  ).toBe(original);
  expect(publicLinkRevision(artist, [], [source], ["s1"])).toBe(original);
  expect(
    publicLinkRevision(
      artist,
      [],
      [{ ...source, url: "https://example.com/interview", type: "article" }],
      [],
    ),
  ).toBe(original);
  expect(publicLinkRevision(artist, [], [source], [])).toBe(
    publicLinkRevision(artist, [], [changedSource], []),
  );
});
