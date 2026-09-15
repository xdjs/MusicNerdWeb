import React from "react";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { useSession } from "next-auth/react";

const mockTrackEvent = jest.fn();
jest.mock("@/lib/analytics/trackEvent", () => ({ trackEvent: (...a: unknown[]) => mockTrackEvent(...a) }));
jest.mock("next-auth/react", () => ({ useSession: jest.fn() }));
jest.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: jest.fn() }) }));
const mockClaim = jest.fn();
jest.mock("@/app/actions/dashboardActions", () => ({ claimArtistProfile: (...a: unknown[]) => mockClaim(...a) }));

import ClaimButton from "../ClaimButton";
import { LOGIN_TRIGGER_KEY } from "@/lib/analytics/events";

const props = { artistId: "a1", isClaimed: false, isClaimedByUser: false };

describe("ClaimButton claim events", () => {
    beforeEach(() => { mockTrackEvent.mockReset(); mockClaim.mockReset(); sessionStorage.clear(); document.body.innerHTML = ""; });
    afterEach(cleanup);

    it("reports login_required and asks for login when signed out", () => {
        (useSession as jest.Mock).mockReturnValue({ data: null, status: "unauthenticated" });
        const loginBtn = document.createElement("button");
        loginBtn.id = "login-btn";
        const onClick = jest.fn();
        loginBtn.addEventListener("click", onClick);
        document.body.appendChild(loginBtn);

        render(<ClaimButton {...props} />);
        fireEvent.click(screen.getByRole("button", { name: /claim/i }));

        expect(mockTrackEvent).toHaveBeenCalledWith("claim", { step: "login_required" });
        expect(sessionStorage.getItem(LOGIN_TRIGGER_KEY)).toBe("claim");
        expect(onClick).toHaveBeenCalledTimes(1);
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("reports start when the dialog opens and submitted when the claim is accepted", async () => {
        (useSession as jest.Mock).mockReturnValue({ data: { user: { id: "u1" } }, status: "authenticated" });
        mockClaim.mockResolvedValue({ success: true, referenceCode: "MN-1234" });

        render(<ClaimButton {...props} />);
        fireEvent.click(screen.getByRole("button", { name: /claim/i }));
        expect(mockTrackEvent).toHaveBeenCalledWith("claim", { step: "start" });

        fireEvent.click(screen.getByRole("button", { name: "Submit Claim" }));
        await waitFor(() => expect(mockTrackEvent).toHaveBeenCalledWith("claim", { step: "submitted" }));
        expect(mockClaim).toHaveBeenCalledWith("a1");
    });

    it("reports already_claimed and error outcomes", async () => {
        (useSession as jest.Mock).mockReturnValue({ data: { user: { id: "u1" } }, status: "authenticated" });
        mockClaim.mockResolvedValueOnce({ success: false, alreadyClaimed: true });
        const { unmount } = render(<ClaimButton {...props} />);
        fireEvent.click(screen.getByRole("button", { name: /claim/i }));
        fireEvent.click(screen.getByRole("button", { name: "Submit Claim" }));
        await waitFor(() => expect(mockTrackEvent).toHaveBeenCalledWith("claim", { step: "already_claimed" }));
        unmount();

        mockClaim.mockRejectedValueOnce(new Error("network"));
        render(<ClaimButton {...props} />);
        fireEvent.click(screen.getByRole("button", { name: /claim/i }));
        fireEvent.click(screen.getByRole("button", { name: "Submit Claim" }));
        await waitFor(() => expect(mockTrackEvent).toHaveBeenCalledWith("claim", { step: "error" }));
    });
});
