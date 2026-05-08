import { createHmac, timingSafeEqual } from "node:crypto";

// Vapi sends a header (configurable; we use x-vapi-signature) that is an HMAC-SHA256
// of the raw request body using our shared secret. We verify it before trusting the
// payload.
export function verifyVapiSignature(args: {
  rawBody: string;
  headerSignature: string | null;
  secret: string;
}): boolean {
  if (!args.headerSignature) return false;
  const expected = createHmac("sha256", args.secret).update(args.rawBody).digest("hex");
  const provided = args.headerSignature.replace(/^sha256=/, "").toLowerCase();
  if (expected.length !== provided.length) return false;
  try {
    return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(provided, "hex"));
  } catch {
    return false;
  }
}

// Some Vapi setups send the secret as a plain bearer in `x-vapi-secret` instead of
// signing the body. Support both.
export function verifyVapiBearer(headerSecret: string | null, expected: string): boolean {
  if (!headerSecret) return false;
  if (headerSecret.length !== expected.length) return false;
  try {
    return timingSafeEqual(Buffer.from(headerSecret), Buffer.from(expected));
  } catch {
    return false;
  }
}

export function verifyTelegramSecret(headerSecret: string | null, expected: string): boolean {
  if (!headerSecret) return false;
  if (headerSecret.length !== expected.length) return false;
  try {
    return timingSafeEqual(Buffer.from(headerSecret), Buffer.from(expected));
  } catch {
    return false;
  }
}
