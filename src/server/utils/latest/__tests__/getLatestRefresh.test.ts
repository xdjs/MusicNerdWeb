const mockExecute = jest.fn();
jest.mock("@/server/db/drizzle", () => ({ db: { execute: (...args: unknown[]) => mockExecute(...args) } }));
import { getLatestRefresh } from "../getLatestRefresh";
it.each(["no_new_posts", "older_posts_found", "instagram_unavailable"])("allows only safe Instagram detail %s", async detail => {
 mockExecute.mockResolvedValue([{id:"j",status:"done",created_at:"2026-10-17T00:00:00Z",state:{sources:{instagram:{status:"checked",detail,raw:"secret"}},instagramFailure:{reason:"private payload"}}}]);
 const result=await getLatestRefresh("artist");
 expect(result?.sources.instagram).toEqual({status:"checked",detail});
 expect(JSON.stringify(result)).not.toMatch(/secret|private payload/);
});
it("drops unexpected provider text",async()=>{
 mockExecute.mockResolvedValue([{id:"j",status:"done",created_at:"2026-10-17T00:00:00Z",state:{sources:{instagram:{status:"failed",detail:"secret raw provider text"}}}}]);
 expect((await getLatestRefresh("artist"))?.sources.instagram).toEqual({status:"failed"});
});
