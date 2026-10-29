/** Translate the existing API error envelope into readable preview feedback. */
export function getCanvasError(error: Error): string {
  try {
    const value: unknown = JSON.parse(error.message);
    if (
      value &&
      typeof value === "object" &&
      "error" in value &&
      typeof value.error === "string"
    )
      return value.error;
  } catch {
    /* Plain stream errors already carry a readable message. */
  }
  return error.message.length <= 300
    ? error.message
    : "This turn could not finish. Please try a smaller refinement.";
}
