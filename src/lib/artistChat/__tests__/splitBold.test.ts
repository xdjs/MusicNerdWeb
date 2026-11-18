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

    it("turns *text* and _text_ into italic runs without the symbols", () => {
        expect(splitBold("Their first album was *Metiendo Mano!* (1977) and _Siembra_ came next.")).toEqual([
            { text: "Their first album was ", bold: false },
            { text: "Metiendo Mano!", bold: false, italic: true },
            { text: " (1977) and ", bold: false },
            { text: "Siembra", bold: false, italic: true },
            { text: " came next.", bold: false },
        ]);
    });

    it("keeps bold and italic apart in one line", () => {
        expect(splitBold("**Siembra** (*1978*)")).toEqual([
            { text: "Siembra", bold: true },
            { text: " (", bold: false },
            { text: "1978", bold: false, italic: true },
            { text: ")", bold: false },
        ]);
    });

    it("leaves a lone * or _ that is ordinary text", () => {
        expect(splitBold("5 * 3 and file_name.pdf")).toEqual([{ text: "5 * 3 and file_name.pdf", bold: false }]);
    });
});
