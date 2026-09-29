export class DevHubError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DevHubError";
  }
}

