import { render } from "@testing-library/react";
import SkeletonShape from "../SkeletonShape";

describe("SkeletonShape", () => {
    it("draws seven profile tiles for Links", () => {
        const { container } = render(<SkeletonShape kind="links" />);
        expect(container.querySelectorAll("[data-skeleton=tile]")).toHaveLength(7);
    });

    it("draws three source cards for Lore", () => {
        const { container } = render(<SkeletonShape kind="sources" />);
        expect(container.querySelectorAll("[data-skeleton=card]")).toHaveLength(3);
    });

    it("draws three text lines for the About, in the hero's text colour", () => {
        const { container } = render(<SkeletonShape kind="about" />);
        const lines = container.querySelectorAll("[data-skeleton=line]");
        expect(lines).toHaveLength(3);
        lines.forEach(line => expect(line).toHaveClass("bg-current", "dark:bg-current"));
    });

    it("draws a still, dimmer placeholder for a section that is waiting", () => {
        const { container } = render(<SkeletonShape kind="links" still />);
        expect(container.querySelector("[data-still]")).not.toBeNull();
        expect(container.querySelectorAll(".motion-safe\\:animate-pulse")).toHaveLength(0);
    });

    it("pulses while its section is being researched", () => {
        const { container } = render(<SkeletonShape kind="links" />);
        expect(container.querySelector("[data-still]")).toBeNull();
        expect(container.querySelectorAll(".motion-safe\\:animate-pulse").length).toBeGreaterThan(0);
    });
});
