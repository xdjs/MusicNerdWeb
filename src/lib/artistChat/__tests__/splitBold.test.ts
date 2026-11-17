import { splitBold } from "../splitBold";

describe("splitBold", () => {
    it("returns plain text unchanged", () => {
        expect(splitBold("He is from Cali.")).toEqual([{ text: "He is from Cali.", bold: false }]);
    });

    it("turns **text** into a bold run without the asterisks", () => {
        expect(splitBold("- **XUE RECORDS.** He is the founder")).toEqual([
            { text: "- ", bold: false },
            { text: "XUE RECORDS.", bold: true },
            { text: " He is the founder", bold: false },
        ]);
    });

    it("handles several bold runs", () => {
        expect(splitBold("**A** and **B**")).toEqual([
            { text: "A", bold: true },
            { text: " and ", bold: false },
            { text: "B", bold: true },
        ]);
    });

    it("drops a ** with no partner, as while the answer is still streaming", () => {
        expect(splitBold("- **L.I.V. (Life")).toEqual([{ text: "- L.I.V. (Life", bold: false }]);
    });

    it("does not bold across a line break", () => {
        expect(splitBold("**one\ntwo**")).toEqual([{ text: "one\ntwo", bold: false }]);
    });

    it("returns nothing for an empty string", () => {
        expect(splitBold("")).toEqual([]);
    });
});
