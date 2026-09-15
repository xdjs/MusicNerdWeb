import React from "react";
import { render, cleanup } from "@testing-library/react";
import type { BeforeSend, BeforeSendEvent } from "@vercel/analytics/next";

// Capture the props the real <Analytics /> would receive; it renders nothing itself.
const mockAnalyticsProps: { beforeSend?: BeforeSend } = {};
jest.mock("@vercel/analytics/next", () => ({
    Analytics: (props: { beforeSend?: BeforeSend }) => {
        mockAnalyticsProps.beforeSend = props.beforeSend;
        return null;
    },
}));

import SiteAnalytics from "../SiteAnalytics";

const ORIGIN = "https://www.musicnerd.xyz";
const view = (url: string): BeforeSendEvent => ({ type: "pageview", url });

describe("SiteAnalytics", () => {
    afterEach(cleanup);

    it("mounts Vercel Analytics with a beforeSend hook", () => {
        render(<SiteAnalytics />);
        expect(typeof mockAnalyticsProps.beforeSend).toBe("function");
    });

    it("reports the scrubbed URL and keeps the event type", () => {
        render(<SiteAnalytics />);
        expect(mockAnalyticsProps.beforeSend!(view(`${ORIGIN}/artist/6cb3d81a?search=abc`)))
            .toEqual({ type: "pageview", url: `${ORIGIN}/artist/6cb3d81a` });
    });

    it("drops admin page views", () => {
        render(<SiteAnalytics />);
        expect(mockAnalyticsProps.beforeSend!(view(`${ORIGIN}/admin/agent-work`))).toBeNull();
    });
});
