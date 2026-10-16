/** A known shared provider deadline; callers must not retry before it. */
export class SpotifyCooldownError extends Error {
  readonly response = { status: 429 };
  constructor(readonly retryAtMs: number) {
    super('Spotify is temporarily rate limited');
    this.name = 'SpotifyCooldownError';
  }
}
