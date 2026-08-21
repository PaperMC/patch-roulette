export interface ExternalIdentity {
  issuer: string;
  subject: string;
}

const decodeBase64Url = (value: string): string => {
  const base64 = value
    .replaceAll("-", "+")
    .replaceAll("_", "/")
    .padEnd(Math.ceil(value.length / 4) * 4, "=");
  return atob(base64);
};

/**
 * Access has already authenticated the request and added this signed assertion.
 * We only decode the identity here; the deployment must ensure every reachable
 * hostname is protected by the same Access application.
 */
export function extractAccessIdentity(request: Request): ExternalIdentity | null {
  const token = request.headers.get("Cf-Access-Jwt-Assertion");
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  try {
    const claims: unknown = JSON.parse(decodeBase64Url(parts[1]));
    if (
      typeof claims !== "object" ||
      claims === null ||
      !("iss" in claims) ||
      !("sub" in claims) ||
      typeof claims.iss !== "string" ||
      typeof claims.sub !== "string" ||
      !claims.iss ||
      !claims.sub
    )
      return null;
    return { issuer: claims.iss, subject: claims.sub };
  } catch {
    return null;
  }
}
