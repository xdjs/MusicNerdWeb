export class ArtistLinkConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ArtistLinkConflictError";
  }
}

