/** @jest-environment node */
import { fetchThumbnailResource } from "@/server/utils/instagram/fetchThumbnailResource";
const fetchMock = jest.fn();
beforeEach(() => {
  fetchMock.mockReset();
  global.fetch = fetchMock;
});
it("does not retry permanent responses", async () => {
  const response = { status: 403 };
  fetchMock.mockResolvedValue(response);
  expect(await fetchThumbnailResource("https://example.test", {})).toBe(response);
  expect(fetchMock).toHaveBeenCalledTimes(1);
});
it("does not retry an expired shared timeout", async () => {
  const controller = new AbortController();
  controller.abort();
  fetchMock.mockRejectedValue(new Error("private URL"));
  await expect(
    fetchThumbnailResource("https://example.test", { signal: controller.signal }),
  ).rejects.toThrow("request timeout");
  expect(fetchMock).toHaveBeenCalledTimes(1);
});
it("cancels a temporary response body before retrying and stops at two calls", async () => {
  const cancel = jest.fn();
  const response = { status: 503, body: { cancel } };
  fetchMock.mockResolvedValue(response);
  expect(await fetchThumbnailResource("https://example.test", {})).toBe(response);
  expect(cancel).toHaveBeenCalledTimes(1);
  expect(fetchMock).toHaveBeenCalledTimes(2);
});
