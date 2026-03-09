export function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "The model stream failed.";
}

export function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}
