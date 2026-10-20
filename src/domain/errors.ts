export class DomainError extends Error {
  constructor(message: string, public status = 400) {super(message);}
}
export function invariant(ok: unknown, message: string, status = 400): asserts ok {
  if (!ok) throw new DomainError(message, status);
}
