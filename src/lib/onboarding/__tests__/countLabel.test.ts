import { countLabel } from "../countLabel";

describe("countLabel", () => {
    it("uses the singular for one", () => {
        expect(countLabel(1, "profile")).toBe("1 profile");
    });

    it("adds an s otherwise", () => {
        expect(countLabel(9, "profile")).toBe("9 profiles");
        expect(countLabel(0, "source")).toBe("0 sources");
    });
});
