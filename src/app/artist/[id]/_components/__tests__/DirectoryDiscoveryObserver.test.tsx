import { act, render } from "@testing-library/react";
import DirectoryDiscoveryObserver from "../DirectoryDiscoveryObserver";
const refresh = jest.fn();
jest.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
jest.mock("@/app/_components/EditModeContext", () => {
  const React = jest.requireActual("react");
  return { EditModeContext: React.createContext({ isEditing: false }) };
});
const mockToken = jest.fn();
jest.mock("@privy-io/react-auth", () => ({ getAccessToken: () => mockToken() }));
jest.mock("@/lib/musicNerdApi/musicNerdApiUrl", () => ({
  musicNerdApiUrl: (path: string) => `https://api-preview.test${path}`,
}));
const response = (revision: string, state = "active") => ({
  ok: true,
  json: async () => ({ revision, state }),
});
const fetchMock = jest.fn();
beforeEach(() => {
  jest.useFakeTimers();
  global.fetch = fetchMock;
  fetchMock.mockReset();
  mockToken.mockReset().mockResolvedValue("private-token");
  refresh.mockClear();
  Object.defineProperty(document, "visibilityState", {
    value: "visible",
    configurable: true,
  });
});
afterEach(() => jest.useRealTimers());
async function tick(ms = 0) {
  await act(async () => {
    await jest.advanceTimersByTimeAsync(ms);
  });
}
it("refreshes changed links while discovery runs and includes the last terminal write", async () => {
  fetchMock
    .mockResolvedValueOnce(response("a"))
    .mockResolvedValueOnce(response("b"))
    .mockResolvedValueOnce(response("c", "complete"));
  render(<DirectoryDiscoveryObserver artistId="artist" initialRevision="a" />);
  await tick();
  expect(refresh).not.toHaveBeenCalled();
  await tick(5000);
  expect(refresh).toHaveBeenCalledTimes(1);
  await tick(5000);
  expect(refresh).toHaveBeenCalledTimes(2);
  await tick(30000);
  expect(fetchMock).toHaveBeenCalledTimes(3);
  expect(
    fetchMock.mock.calls.every(
      ([, options]) => !options.method || options.method === "GET",
    ),
  ).toBe(true);
});
it("keeps observing an active downstream job after unchanged links, without unnecessary refresh", async () => {
  fetchMock.mockResolvedValue(response("a"));
  render(<DirectoryDiscoveryObserver artistId="artist" initialRevision="a" />);
  await tick(20000);
  expect(fetchMock.mock.calls.length).toBeGreaterThan(1);
  expect(refresh).not.toHaveBeenCalled();
});
it("pauses while hidden and aborts on unmount; stale responses cannot refresh another artist", async () => {
  let resolve!: (value: unknown) => void;
  fetchMock.mockReturnValue(
    new Promise((r) => {
      resolve = r;
    }),
  );
  const view = render(
    <DirectoryDiscoveryObserver artistId="artist" initialRevision="a" />,
  );
  await tick();
  const signal = fetchMock.mock.calls[0][1].signal as AbortSignal;
  Object.defineProperty(document, "visibilityState", {
    value: "hidden",
    configurable: true,
  });
  act(() => document.dispatchEvent(new Event("visibilitychange")));
  expect(signal.aborted).toBe(true);
  view.unmount();
  await act(async () => resolve(response("changed")));
  expect(refresh).not.toHaveBeenCalled();
});
it("does not poll hidden pages and stops at ten minutes even if a downstream job is pending", async () => {
  Object.defineProperty(document, "visibilityState", {
    value: "hidden",
    configurable: true,
  });
  fetchMock.mockResolvedValue(response("a"));
  render(<DirectoryDiscoveryObserver artistId="artist" initialRevision="a" />);
  await tick(600001);
  Object.defineProperty(document, "visibilityState", {
    value: "visible",
    configurable: true,
  });
  act(() => document.dispatchEvent(new Event("visibilitychange")));
  await tick();
  expect(fetchMock).not.toHaveBeenCalled();
});
it("stops on lost access and repeated transport failures without retrying workers", async () => {
  fetchMock.mockResolvedValue({ ok: false, status: 403 });
  render(<DirectoryDiscoveryObserver artistId="artist" initialRevision="a" />);
  await tick(30000);
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(refresh).not.toHaveBeenCalled();
});

it("refreshes once on terminal completion even with unchanged links, to display saved Latest", async () => {
  fetchMock
    .mockResolvedValueOnce(response("a"))
    .mockResolvedValueOnce(response("a", "complete"));
  render(<DirectoryDiscoveryObserver artistId="artist" initialRevision="a" />);
  await tick(30000);
  expect(refresh).toHaveBeenCalledTimes(1);
  expect(fetchMock).toHaveBeenCalledTimes(2);
});

it("reads the status from MusicNerdAPI with the Privy token", async () => {
  fetchMock.mockResolvedValue({
    ok: true,
    json: async () => ({ status: "ok", revision: "a", state: "active" }),
  });
  render(<DirectoryDiscoveryObserver artistId="artist" initialRevision="a" />);
  await tick();
  expect(fetchMock).toHaveBeenCalledWith(
    "https://api-preview.test/api/artist/artist/directory-discovery",
    expect.objectContaining({
      credentials: "omit",
      headers: { Authorization: "Bearer private-token" },
    }),
  );
});

it("stops without a request when no account is signed in", async () => {
  mockToken.mockResolvedValue(null);
  render(<DirectoryDiscoveryObserver artistId="artist" initialRevision="a" />);
  await tick(30000);
  expect(fetchMock).not.toHaveBeenCalled();
  expect(mockToken).toHaveBeenCalledTimes(1);
});
