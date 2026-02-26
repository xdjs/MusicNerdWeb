import { getUserDisplayName } from "../userQueries";

describe("getUserDisplayName", () => {
    it("prefers username when all fields are present", () => {
        expect(getUserDisplayName({ username: "alice", email: "a@b.com", wallet: "0x1" }))
            .toBe("alice");
    });

    it("falls back to email prefix when username is null", () => {
        expect(getUserDisplayName({ username: null, email: "fan@example.com", wallet: "0x1" }))
            .toBe("fan");
    });

    it("falls back to wallet when username and email are null", () => {
        expect(getUserDisplayName({ username: null, email: null, wallet: "0xABC" }))
            .toBe("0xABC");
    });

    it('falls back to "Anonymous" when all fields are null', () => {
        expect(getUserDisplayName({ username: null, email: null, wallet: null }))
            .toBe("Anonymous");
    });

    it("extracts prefix before @ from email", () => {
        expect(getUserDisplayName({ username: null, email: "hello.world@gmail.com", wallet: null }))
            .toBe("hello.world");
    });

    it("treats empty-string username as falsy", () => {
        expect(getUserDisplayName({ username: "", email: "fb@test.com", wallet: null }))
            .toBe("fb");
    });

    it("handles undefined fields", () => {
        expect(getUserDisplayName({})).toBe("Anonymous");
    });
});
