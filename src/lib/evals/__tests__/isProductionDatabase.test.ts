import { isProductionDatabase } from "@/lib/evals/isProductionDatabase";

describe("isProductionDatabase", () => {
    it("recognises the production project ref anywhere in the connection string", () => {
        expect(isProductionDatabase("postgresql://mnweb:pw@db.cbabvmebugudeuylronz.supabase.co:5432/postgres")).toBe(true);
        expect(isProductionDatabase("postgresql://mnweb:pw@aws-0-us-east-1.pooler.supabase.com:6543/postgres?ref=cbabvmebugudeuylronz")).toBe(true);
    });

    it("is false for any other database, including none at all", () => {
        expect(isProductionDatabase("postgresql://mnweb:pw@db.stagingref.supabase.co:5432/postgres")).toBe(false);
        expect(isProductionDatabase("")).toBe(false);
        expect(isProductionDatabase(undefined)).toBe(false);
    });
});
