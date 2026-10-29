import { formatCanvasDate } from "../formatCanvasDate";
it("formats timestamps without converting publication into release dates", () => {
  expect(formatCanvasDate("2025-08-27T07:17:53.000Z")).toBe("Aug 27, 2025");
  expect(formatCanvasDate("1998")).toBe("1998");
  expect(formatCanvasDate("1997–2002")).toBe("1997–2002");
});
