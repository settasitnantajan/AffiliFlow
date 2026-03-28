// Edge-compatible auth token utilities (no Node.js crypto)

const AUTH_SECRET = process.env.AUTH_SECRET ?? process.env.AUTH_PASSWORD ?? "change-me";

async function hmacSha256(secret: string, data: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function randomHex(bytes: number): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function signAuthToken(): Promise<string> {
  const nonce = randomHex(16);
  const sig = await hmacSha256(AUTH_SECRET, nonce);
  return `${nonce}.${sig}`;
}

export async function verifyAuthToken(token: string): Promise<boolean> {
  const [nonce, sig] = token.split(".");
  if (!nonce || !sig) return false;
  const expected = await hmacSha256(AUTH_SECRET, nonce);
  return sig === expected;
}
