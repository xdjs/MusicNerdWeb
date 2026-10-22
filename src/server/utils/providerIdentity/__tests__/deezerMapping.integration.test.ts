/** @jest-environment node */
import { sql, type SQL } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import * as schema from "@/server/db/schema";
let MappingConflictError: typeof import("@/server/utils/idMappingService").MappingConflictError;
let MappingNotFoundError: typeof import("@/server/utils/idMappingService").MappingNotFoundError;
let MappingValidationError: typeof import("@/server/utils/idMappingService").MappingValidationError;
const { PGlite: PGliteClient } = process
  .getBuiltinModule("module")
  .createRequire(__filename)(
  "@electric-sql/pglite",
) as typeof import("@electric-sql/pglite");
const pg = { client: new PGliteClient() };
const database = drizzle(pg.client, { schema });
let activeTx: { execute: (q: SQL) => Promise<unknown> };
function adapt(executor: Pick<typeof database, "query" | "execute">) {
  return {
    query: executor.query,
    execute: async (q: SQL) => (await executor.execute(q)).rows,
  };
}
const adapter = {
  ...adapt(database),
  transaction: (fn: (tx: ReturnType<typeof adapt>) => Promise<unknown>) =>
    database.transaction((tx) => {
      activeTx = adapt(tx);
      return fn(adapt(tx));
    }),
};
const locks = jest.fn<Promise<void>, [unknown, string, string, string]>(
  async () => {},
);
jest.mock("@/server/db/drizzle", () => ({
  get db() {
    return adapter;
  },
}));
jest.mock("@/server/utils/artistIdentityLocks", () => ({
  acquireArtistPlatformWriteLocks: (
    ...args: [unknown, string, string, string]
  ) => locks(...args),
}));
let resolveArtistMapping: typeof import("@/server/utils/idMappingService").resolveArtistMapping;
const originalFetch = global.fetch;
beforeAll(async () => {
  jest.resetModules();
  ({
    resolveArtistMapping,
    MappingConflictError,
    MappingNotFoundError,
    MappingValidationError,
  } = await import("@/server/utils/idMappingService"));
});

const a1 = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const a2 = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const unknownId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

// Reduced local schema for mapping constraints; no live database is accessed.
beforeAll(async () => {
  await pg.client.exec(`
    create table artists (id uuid primary key, spotify text, deezer text);
    create type confidence_level as enum ('high', 'medium', 'low', 'manual');
    create table artist_id_mappings (
      id uuid primary key default gen_random_uuid(),
      artist_id uuid not null references artists(id),
      platform text not null, platform_id text not null, confidence confidence_level not null,
      source text not null, reasoning text, api_key_hash text,
      resolved_at timestamptz not null default now(),
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      constraint artist_id_mappings_artist_platform_uniq unique (artist_id, platform),
      constraint artist_id_mappings_platform_id_uniq unique (platform, platform_id)
    );
  `);
}, 30000);
beforeEach(async () => {
  locks.mockClear();
  global.fetch = jest.fn(
    async () =>
      ({
        ok: true,
        json: async () => ({
          results: {
            bindings: [
              {
                item: { value: "https://www.wikidata.org/entity/Q1" },
                sourceId: { value: "0y9DJxRh3j84i13hctQcFx" },
                targetId: { value: "123" },
              },
            ],
          },
        }),
      }) as Response,
  );

  await pg.client.exec(
    `delete from artist_id_mappings; delete from artists;
     insert into artists values ('${a1}', '0y9DJxRh3j84i13hctQcFx', null), ('${a2}', null, null);`,
  );
});
afterAll(async () => pg.client.close());
afterEach(() => {
  global.fetch = originalFetch;
});

type Row = {
  artist_id: string;
  platform: string;
  platform_id: string;
  confidence: string;
  source: string;
  reasoning: string | null;
  api_key_hash: string | null;
  resolved_at: Date;
  updated_at: Date;
};
const rows = async () =>
  (
    await pg.client.query<Row>(
      "select artist_id, platform, platform_id, confidence, source, reasoning, api_key_hash, resolved_at, updated_at from artist_id_mappings order by artist_id, platform",
    )
  ).rows;
const seed = (
  artistId: string,
  platform: string,
  platformId: string,
  confidence: string,
) =>
  pg.client.exec(
    `insert into artist_id_mappings (artist_id, platform, platform_id, confidence, source, reasoning, api_key_hash, resolved_at, updated_at)
     values ('${artistId}', '${platform}', '${platformId}', '${confidence}', 'manual', 'old', 'old-hash', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z')`,
  );

const base = {
  artistId: a1,
  platform: "deezer",
  platformId: "123",
  confidence: "high",
  source: "wikidata",
  apiKeyHash: "hash",
};

describe("resolveArtistMapping", () => {
  it("refuses an invalid platform, source, confidence or empty platformId before any transaction", async () => {
    for (const [patch, message] of [
      [{ platform: "myspace" }, "Invalid platform: myspace"],
      [{ platform: "spotify" }, "Invalid platform: spotify"],
      [{ source: "guess" }, "Invalid source: guess"],
      [{ confidence: "sure" }, "Invalid confidence level: sure"],
      [{ platformId: "  " }, "platformId cannot be empty"],
    ] as const) {
      await expect(resolveArtistMapping({ ...base, ...patch })).rejects.toThrow(
        new MappingValidationError(message),
      );
    }
    expect(locks).not.toHaveBeenCalled();
    expect(await rows()).toEqual([]);
  });

  it("takes the platform write locks inside the transaction", async () => {
    await resolveArtistMapping(base);
    expect(locks).toHaveBeenCalledWith(expect.anything(), a1, "deezer", "123");
  });

  it("throws MappingNotFoundError for an unknown artist", async () => {
    await expect(
      resolveArtistMapping({ ...base, artistId: unknownId }),
    ).rejects.toThrow(
      new MappingNotFoundError(`Artist not found: ${unknownId}`),
    );
    expect(await rows()).toEqual([]);
  });

  it("for deezer, refuses an id another artist holds in its deezer column", async () => {
    await pg.client.exec(`update artists set deezer = 'D1' where id = '${a2}'`);
    await expect(
      resolveArtistMapping({ ...base, platformId: "D1" }),
    ).rejects.toThrow(
      new MappingConflictError(
        "platformId D1 on deezer is already owned by a different artist",
      ),
    );
    expect(await rows()).toEqual([]);
  });

  it("for deezer, refuses an id that differs from the artist's own deezer column", async () => {
    await pg.client.exec(
      `update artists set deezer = '999' where id = '${a1}'`,
    );
    await expect(resolveArtistMapping(base)).rejects.toThrow(
      new MappingConflictError(
        "The artist's deezer field already contains a different platform ID",
      ),
    );
    expect(await rows()).toEqual([]);
  });

  it("inserts when there is no mapping, nulling the omitted reasoning and key", async () => {
    expect(
      await resolveArtistMapping({ ...base, apiKeyHash: undefined }),
    ).toEqual({
      created: true,
      updated: false,
      skipped: false,
    });
    expect(await rows()).toMatchObject([
      {
        artist_id: a1,
        platform: "deezer",
        platform_id: "123",
        confidence: "high",
        source: "wikidata",
        reasoning: null,
        api_key_hash: null,
      },
    ]);
  });

  it("skips a lower-confidence submission and leaves the stored mapping alone", async () => {
    await seed(a1, "deezer", "old", "manual");
    expect(await resolveArtistMapping(base)).toEqual({
      created: false,
      updated: false,
      skipped: true,
      previousMapping: { platformId: "old", confidence: "manual" },
    });
    expect(await rows()).toMatchObject([
      { platform_id: "old", confidence: "manual" },
    ]);
  });

  it("updates at equal or higher confidence: every field replaced, an omitted one nulled, resolved_at and updated_at now", async () => {
    await seed(a1, "deezer", "old", "high");
    expect(
      await resolveArtistMapping({ ...base, apiKeyHash: undefined }),
    ).toEqual({
      created: false,
      updated: true,
      skipped: false,
      previousMapping: { platformId: "old", confidence: "high" },
    });
    const [row] = await rows();
    expect(row).toMatchObject({
      platform_id: "123",
      confidence: "high",
      source: "wikidata",
      reasoning: null,
      api_key_hash: null,
    });
    expect(row.resolved_at.getTime()).toBeGreaterThan(
      Date.parse("2026-01-02T00:00:00Z"),
    );
    expect(row.updated_at.getTime()).toBeGreaterThan(
      Date.parse("2026-01-02T00:00:00Z"),
    );
  });

  it("maps the platform-id unique violation to a conflict, on insert and on update", async () => {
    await seed(a2, "tidal", "T1", "high");
    const tidal = { ...base, platform: "tidal", platformId: "T1" };
    await expect(resolveArtistMapping(tidal)).rejects.toThrow(
      new MappingConflictError(
        "platformId T1 on tidal is already mapped to a different artist",
      ),
    );
    await seed(a1, "tidal", "T0", "low");
    await expect(resolveArtistMapping(tidal)).rejects.toThrow(
      MappingConflictError,
    );
    expect(
      (await rows()).map((row) => [row.artist_id, row.platform_id]),
    ).toEqual([
      [a1, "T0"],
      [a2, "T1"],
    ]);
  });
});

// Public incident IDs and recorded source/confidence; the response and reasoning are synthetic.
it.each([
  { source: "name_search", confidence: "medium" },
  { source: "manual", confidence: "manual" },
])(
  "rejects uncorroborated Rnd1/RNDN mapping despite caller labels: %j",
  async (labels) => {
    jest
      .mocked(fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: { bindings: [] } }),
      } as Response);
    await expect(
      resolveArtistMapping({
        ...base,
        ...labels,
        platformId: "87797542",
        reasoning:
          "Synthetic reconstruction: Rnd1/RNDN one-character name difference",
      }),
    ).rejects.toThrow("corroborated");
    expect(await rows()).toEqual([]);
  },
);
it("refuses an uncorroborated same-ID confidence upgrade without changing metadata", async () => {
  await seed(a1, "deezer", "123", "low");
  const before = await rows();
  jest
    .mocked(fetch)
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ results: { bindings: [] } }),
    } as Response);
  await expect(
    resolveArtistMapping({ ...base, confidence: "manual", source: "manual" }),
  ).rejects.toThrow("corroborated");
  expect(await rows()).toEqual(before);
});
it("keeps lower-confidence skips provider-free", async () => {
  await seed(a1, "deezer", "123", "manual");
  expect((await resolveArtistMapping(base)).skipped).toBe(true);
  expect(fetch).not.toHaveBeenCalled();
});
it.each(["spotify", "deezer"])(
  "rejects a changed %s slot after corroboration",
  async (column) => {
    jest.mocked(fetch).mockImplementationOnce(async () => {
      // Same-transaction mutation simulates a row change between observation and locking;
      // this is a snapshot regression, not real concurrent PostgreSQL evidence.
      const tx = activeTx;
      await tx.execute(
        sql`update artists set ${sql.identifier(column)} = 'changed' where id = ${a1}::uuid`,
      );
      return {
        ok: true,
        json: async () => ({
          results: {
            bindings: [
              {
                item: { value: "https://www.wikidata.org/entity/Q1" },
                sourceId: { value: "0y9DJxRh3j84i13hctQcFx" },
                targetId: { value: "123" },
              },
            ],
          },
        }),
      } as Response;
    });
    await expect(resolveArtistMapping(base)).rejects.toThrow("corroborated");
    expect(await rows()).toEqual([]);
  },
);

// Captured incident state and reasoning; verifier responses below are synthetic.
it.each([
  { confidence: "medium", source: "name_search" },
  { confidence: "manual", source: "manual" },
])(
  "rejects existing incident mapping metadata rewrites without fresh proof: %j",
  async (labels) => {
    const reasoning =
      "Deezer API search for 'Rnd1' returned 'RNDN' (ID 87797542) as best match with only 1 character difference";
    await seed(a1, "deezer", "87797542", "medium");
    await pg.client.query(
      "update artists set deezer = '87797542' where id = $1",
      [a1],
    );
    await pg.client.query(
      "update artist_id_mappings set source = 'name_search', reasoning = $1",
      [reasoning],
    );
    const before = await rows();
    jest
      .mocked(fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: { bindings: [] } }),
      } as Response);
    await expect(
      resolveArtistMapping({
        ...base,
        ...labels,
        platformId: "87797542",
        reasoning,
      }),
    ).rejects.toThrow("corroborated");
    expect(await rows()).toEqual(before);
  },
);
it("rejects Deezer persistence without a Spotify anchor and does not call a provider", async () => {
  await pg.client.query("update artists set spotify = null where id = $1", [
    a1,
  ]);
  await expect(resolveArtistMapping(base)).rejects.toThrow("corroborated");
  expect(fetch).not.toHaveBeenCalled();
  expect(await rows()).toEqual([]);
});
it("fails closed when the verifier is unavailable", async () => {
  jest.mocked(fetch).mockRejectedValueOnce(new Error("synthetic outage"));
  await expect(resolveArtistMapping(base)).rejects.toThrow("corroborated");
  expect(await rows()).toEqual([]);
});
it("keeps non-Deezer mapping writes provider-free", async () => {
  expect(
    (
      await resolveArtistMapping({
        ...base,
        platform: "tidal",
        platformId: "T1",
      })
    ).created,
  ).toBe(true);
  expect(fetch).not.toHaveBeenCalled();
});
