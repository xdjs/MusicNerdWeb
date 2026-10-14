import { fireEvent, render, screen } from "@testing-library/react";
import FollowHint from "../FollowHint";

describe("FollowHint", () => {
    it("asks the artist to tap to follow along, with a bouncing arrow", () => {
        const { container } = render(<FollowHint onFollow={jest.fn()} />);
        expect(screen.getByText("Tap to follow along")).toBeInTheDocument();
        expect(container.querySelector("svg")).toHaveClass("motion-safe:animate-bounce");
    });

    it("follows when tapped", () => {
        const onFollow = jest.fn();
        render(<FollowHint onFollow={onFollow} />);
        fireEvent.click(screen.getByText("Tap to follow along"));
        expect(onFollow).toHaveBeenCalledTimes(1);
    });

    it("stays out of the tab order and away from screen readers, the pill being the one control", () => {
        render(<FollowHint onFollow={jest.fn()} />);
        const hint = screen.getByText("Tap to follow along").closest("button");
        expect(hint).toHaveAttribute("tabindex", "-1");
        expect(hint).toHaveAttribute("aria-hidden", "true");
    });
});
