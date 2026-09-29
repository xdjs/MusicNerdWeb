import { getUserDisplayName } from "../userQueries";

describe("getUserDisplayName", () => {
    it("prefers username when all fields are present", () => {
        expect(getUserDisplayName({ username: "alice", email: "a@b.com", wallet: "0x1" }))
            .toBe("alice");
    });

    it("uses Anonymous instead of an email prefix when username is null", () => {
        expect(getUserDisplayName({ username: null, email: "fan@example.com", wallet: "0x1" }))
            .toBe("Anonymous");
    });

    it("uses Anonymous instead of a wallet when username is null", () => {
        expect(getUserDisplayName({ username: null, email: null, wallet: "0xABC" }))
            .toBe("Anonymous");
    });

    it('falls back to "Anonymous" when all fields are null', () => {
        expect(getUserDisplayName({ username: null, email: null, wallet: null }))
            .toBe("Anonymous");
    });

    it("does not derive a public name from email", () => {
        expect(getUserDisplayName({ username: null, email: "hello.world@gmail.com", wallet: null }))
            .toBe("Anonymous");
    });

    it("treats empty-string username as falsy", () => {
        expect(getUserDisplayName({ username: "", email: "fb@test.com", wallet: null }))
            .toBe("Anonymous");
    });

    it("handles undefined fields", () => {
        expect(getUserDisplayName({})).toBe("Anonymous");
    });
});

// These database values can remain while optional allocation is deferred.
it.each([
    { username: 'listener@example.test' },
    { username: '  listener@example.test  ', email: 'listener@example.test' },
    { username: ' 0xAbC ', wallet: '0xabc' },
    { username: '   ', email: 'listener@example.test', wallet: '0xabc' },
])('does not expose a stored private identifier: %j', user => {
    expect(getUserDisplayName(user)).toBe('Anonymous');
});
