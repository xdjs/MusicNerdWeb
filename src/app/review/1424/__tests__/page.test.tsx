import ChatFlow1424ReviewPage from "../page";
import { notFound } from "next/navigation";

jest.mock("next/navigation", () => ({ notFound: jest.fn(() => { throw new Error("404"); }) }));
jest.mock("../preview", () => ({ __esModule: true, default: () => <div>preview</div> }));

const original = { ...process.env };
afterEach(() => {
  process.env = { ...original };
  jest.clearAllMocks();
});

it.each(["production", "development", undefined])("hides the review route outside local dev and Vercel preview (%s)", vercelEnv => {
  Object.assign(process.env, { NODE_ENV: "production" });
  if (vercelEnv) process.env.VERCEL_ENV = vercelEnv;
  else delete process.env.VERCEL_ENV;
  expect(() => ChatFlow1424ReviewPage()).toThrow("404");
  expect(notFound).toHaveBeenCalledTimes(1);
});

it.each([["production", "preview"], ["development", undefined]])("allows review in %s/%s", (nodeEnv, vercelEnv) => {
  Object.assign(process.env, { NODE_ENV: nodeEnv });
  if (vercelEnv) process.env.VERCEL_ENV = vercelEnv;
  else delete process.env.VERCEL_ENV;
  expect(ChatFlow1424ReviewPage()).toBeTruthy();
  expect(notFound).not.toHaveBeenCalled();
});
