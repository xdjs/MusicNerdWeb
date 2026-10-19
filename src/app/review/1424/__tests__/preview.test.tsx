import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import ChatFlow1424Preview from "../preview";

it("renders the synthetic answer through the real chat and keeps follow-ups off live services", async () => {
  global.fetch = jest.fn();
  render(<ChatFlow1424Preview />);

  expect(screen.getByText(/Synthetic replay · no live research/)).toBeInTheDocument();
  expect(screen.getByText("Manual synthetic illustration · no live research")).toBeInTheDocument();
  expect(screen.queryByText("Written by AI from the sources above")).not.toBeInTheDocument();
  expect(screen.getAllByText(/These records don’t settle whether Dalen Moss played on Open Ferries/)).toHaveLength(2);

  fireEvent.click(screen.getByRole("button", { name: "H11 · Lumen Weft" }));
  expect(screen.getByTestId("answer")).toHaveTextContent(/A different unidentified voice says they will pay for transport/);
  fireEvent.click(screen.getByRole("button", { name: "H05 · Oriel Loom" }));
  expect(screen.getByTestId("answer")).toHaveTextContent(/Harrow Quay electronic performer’s 2025 edition/);
  fireEvent.click(screen.getByRole("button", { name: "H09 · Hush Compass" }));

  fireEvent.click(screen.getByRole("button", { name: "Read passage [1]" }));
  expect(await screen.findByText(/This short excerpt lists selected credits only/)).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "What credits does the sleeve include?" }));
  await waitFor(() => expect(screen.getByText(/does not provide the full engineering or additional instrumental personnel/)).toBeInTheDocument());
  expect(fetch).not.toHaveBeenCalled();
});


it("does not present a canned factual answer for an arbitrary question", async () => {
  global.fetch = jest.fn();
  render(<ChatFlow1424Preview />);
  fireEvent.change(screen.getByRole("textbox"), { target: { value: "Who produced another album?" } });
  fireEvent.submit(screen.getByRole("textbox").closest("form")!);
  expect(await screen.findByText(/This synthetic replay only supports the suggested follow-up/)).toBeInTheDocument();
  expect(fetch).not.toHaveBeenCalled();
});
