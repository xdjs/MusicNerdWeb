import React from "react";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { useMusicNerdUser } from "@/hooks/useMusicNerdUser";

const mockTrackEvent = jest.fn();
jest.mock("@/lib/analytics/trackEvent", () => ({ trackEvent: (...a: unknown[]) => mockTrackEvent(...a) }));
jest.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: jest.fn() }) }));
const mockClaim = jest.fn();
jest.mock("@/lib/claims/requestArtistClaim", () => ({ requestArtistClaim: (...a: unknown[]) => mockClaim(...a) }));

import ClaimButton from "../ClaimButton";
import { LOGIN_TRIGGER_KEY } from "@/lib/analytics/events";

const props = { artistId: "a1", isClaimed: false, isClaimedByUser: false };

describe("ClaimButton claim events", () => {
    beforeEach(() => { mockTrackEvent.mockReset(); mockClaim.mockReset(); sessionStorage.clear(); document.body.innerHTML = ""; });
    afterEach(cleanup);

    it("reports login_required and asks for login when signed out", () => {
        (useMusicNerdUser as jest.Mock).mockReturnValue({ user: null, status: "unauthenticated" });
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
        (useMusicNerdUser as jest.Mock).mockReturnValue({ user: { id: "u1" }, status: "authenticated" });
        mockClaim.mockResolvedValue({ success: true, referenceCode: "MN-1234" });

        render(<ClaimButton {...props} />);
        fireEvent.click(screen.getByRole("button", { name: /claim/i }));
        expect(mockTrackEvent).toHaveBeenCalledWith("claim", { step: "start" });

        fireEvent.click(screen.getByRole("button", { name: "Submit Claim" }));
        await waitFor(() => expect(mockTrackEvent).toHaveBeenCalledWith("claim", { step: "submitted" }));
        expect(mockClaim).toHaveBeenCalledWith("a1");
    });

    it("directs the claimant to the confirmed inbox before and after submitting", async () => {
        (useMusicNerdUser as jest.Mock).mockReturnValue({ user: { id: "u1" }, status: "authenticated" });
        mockClaim.mockResolvedValue({ success: true, referenceCode: "MN-TEST" });
        render(<ClaimButton {...props} />);
        fireEvent.click(screen.getByRole("button", { name: /claim/i }));
        expect(screen.getByText("@musicnerdnet")).toBeInTheDocument();
        expect(screen.queryByText(/musicnerdxyz/)).not.toBeInTheDocument();
        expect(mockClaim).not.toHaveBeenCalled();

        fireEvent.click(screen.getByRole("button", { name: "Submit Claim" }));
        const inbox = await screen.findByRole("link", { name: "Open @musicnerdnet on Instagram" });
        expect(inbox).toHaveAttribute("href", "https://www.instagram.com/musicnerdnet/");
        expect(inbox).toHaveAttribute("rel", "noopener noreferrer");
        expect(screen.getByText("@musicnerdnet")).toBeInTheDocument();
        expect(screen.getByText("MN-TEST")).toBeInTheDocument();
        expect(screen.getByText("We'll review your claim and approve it once verified.")).toBeInTheDocument();
        expect(screen.queryByText(/musicnerdxyz/)).not.toBeInTheDocument();
    });

    it("allows a claim without a saved Instagram link and shows no missing-link warning", async () => {
        (useMusicNerdUser as jest.Mock).mockReturnValue({ user: { id: "u1" }, status: "authenticated" });
        mockClaim.mockResolvedValue({ success: true, referenceCode: "MN-NOIG" });
        // No Instagram data is required by the claim dialog.
        render(<ClaimButton {...props} />);
        fireEvent.click(screen.getByRole("button", { name: /claim/i }));
        expect(screen.queryByText(/You can submit a claim without an Instagram link/)).not.toBeInTheDocument();
        expect(screen.queryByText(/doesn.t have an Instagram link/)).not.toBeInTheDocument();
        expect(screen.getByText("@musicnerdnet")).toBeInTheDocument();
        expect(screen.queryByRole("alert")).not.toBeInTheDocument();
        expect(screen.queryByText(/Consider adding/)).not.toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Submit Claim" })).toBeEnabled();
        fireEvent.click(screen.getByRole("button", { name: "Submit Claim" }));
        expect(await screen.findByText("MN-NOIG")).toBeInTheDocument();
        expect(mockClaim).toHaveBeenCalledTimes(1);
    });

    it("does not replay the claim after an uncertain network failure", async () => {
        (useMusicNerdUser as jest.Mock).mockReturnValue({ user: { id: "u1" }, status: "authenticated" });
        mockClaim.mockRejectedValue(new Error("Failed to fetch"));
        render(<ClaimButton {...props} />);
        fireEvent.click(screen.getByRole("button", { name: /claim/i }));
        fireEvent.click(screen.getByRole("button", { name: "Submit Claim" }));
        await waitFor(() => expect(mockTrackEvent).toHaveBeenCalledWith("claim", { step: "error" }));
        expect(screen.getByRole("button", { name: "Submit Claim" })).toBeEnabled();
        expect(mockClaim).toHaveBeenCalledTimes(1);
    });

    it("reports already_claimed and error outcomes", async () => {
        (useMusicNerdUser as jest.Mock).mockReturnValue({ user: { id: "u1" }, status: "authenticated" });
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

describe('claim status visibility', () => {
    afterEach(cleanup);
    beforeEach(() => { mockTrackEvent.mockReset(); mockClaim.mockReset(); });
    it.each([
        ['anonymous', null, false],
        ['another account', {id: 'other'}, false],
        ['claim owner', {id: 'owner'}, true],
    ])('offers no claim action to %s on an approved profile', (_viewer, user, isClaimedByUser) => {
        (useMusicNerdUser as jest.Mock).mockReturnValue({user});
        render(<ClaimButton {...props} isClaimed isClaimedByUser={isClaimedByUser as boolean} compactOnMobile />);
        expect(screen.queryByRole('button', {name: 'Claimed artist profile'})).not.toBeInTheDocument();
        expect(screen.queryByRole('button', {name: 'Claim profile'})).not.toBeInTheDocument();
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        expect(mockClaim).not.toHaveBeenCalled();
        expect(mockTrackEvent).not.toHaveBeenCalled();
    });
    it('keeps another account’s pending claim private', () => {
        (useMusicNerdUser as jest.Mock).mockReturnValue({user: null});
        const {container} = render(<ClaimButton {...props} isPending />);
        expect(container).toBeEmptyDOMElement();
    });
    it('shows pending verification only to its requester', () => {
        (useMusicNerdUser as jest.Mock).mockReturnValue({user: {id: 'owner'}});
        render(<ClaimButton {...props} isPending isPendingByUser />);
        expect(screen.getByLabelText('Pending verification')).toBeInTheDocument();
        expect(screen.queryByRole('button', {name: 'Claimed artist profile'})).not.toBeInTheDocument();
    });
});
