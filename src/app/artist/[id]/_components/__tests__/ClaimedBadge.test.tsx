import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import ClaimedBadge from "../ClaimedBadge";

const explanation = "This profile has been claimed by the artist.";

describe("ClaimedBadge", () => {
    afterEach(cleanup);

    it("explains the status on hover outside the clipped hero", async () => {
        const { container } = render(<div style={{ overflow: "hidden" }}><ClaimedBadge /></div>);
        fireEvent.pointerMove(screen.getByRole("button", { name: "Claimed artist profile" }));
        const tooltip = await screen.findByRole("tooltip");
        expect(tooltip).toHaveTextContent(explanation);
        expect(container).not.toContainElement(tooltip);
    });

    it("describes the focused badge and dismisses with Escape or blur", async () => {
        render(<ClaimedBadge />);
        const badge = screen.getByRole("button", { name: "Claimed artist profile" });
        fireEvent.focus(badge);
        expect(await screen.findByRole("tooltip")).toHaveTextContent(explanation);
        expect(badge).toHaveAccessibleDescription(explanation);
        fireEvent.keyDown(badge, { key: "Escape" });
        await waitFor(() => expect(screen.queryByRole("tooltip")).not.toBeInTheDocument());
        fireEvent.focus(badge);
        expect(await screen.findByRole("tooltip")).toBeInTheDocument();
        fireEvent.blur(badge);
        await waitFor(() => expect(screen.queryByRole("tooltip")).not.toBeInTheDocument());
    });

    it("opens on a tap and dismisses when tapping elsewhere", async () => {
        render(<><ClaimedBadge /><button>Outside</button></>);
        const badge = screen.getByRole("button", { name: "Claimed artist profile" });
        fireEvent.pointerDown(badge);
        fireEvent.pointerUp(badge);
        fireEvent.click(badge);
        expect(await screen.findByRole("tooltip")).toHaveTextContent(explanation);
        // Radix installs its outside-pointer listener on the next task.
        await new Promise(resolve => setTimeout(resolve, 0));
        fireEvent.pointerDown(screen.getByRole("button", { name: "Outside" }));
        await waitFor(() => expect(screen.queryByRole("tooltip")).not.toBeInTheDocument());
    });
});
