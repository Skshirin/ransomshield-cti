import crypto from "crypto";

const TOKEN_TTL_HOURS = 24;

// Same pattern as refresh tokens: the raw token is shown to the user once
// (as part of the installer link) and only its hash is stored in the DB.
// If the DB is ever leaked, the leaked hashes can't be replayed to activate
// endpoints on someone else's infrastructure.
export function generateActivationToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function hashActivationToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function activationTokenExpiry(): Date {
  return new Date(Date.now() + TOKEN_TTL_HOURS * 60 * 60 * 1000);
}