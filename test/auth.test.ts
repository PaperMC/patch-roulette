import { describe, expect, it } from "vitest";
import { extractAccessIdentity } from "../src/lib/server/auth";

const payload = (claims: unknown) => {
  const encoded = btoa(JSON.stringify(claims)).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
  return `header.${encoded}.signature`;
};

describe("Access identity extraction", () => {
  it("extracts issuer and subject from the Access assertion", () => {
    const request = new Request("https://patch-roulette.test/api/me", {
      headers: {
        "Cf-Access-Jwt-Assertion": payload({
          iss: "https://team.cloudflareaccess.com",
          sub: "user-123",
        }),
      },
    });
    expect(extractAccessIdentity(request)).toEqual({
      issuer: "https://team.cloudflareaccess.com",
      subject: "user-123",
    });
  });

  it("rejects missing, malformed, and incomplete assertions", () => {
    expect(extractAccessIdentity(new Request("https://patch-roulette.test/api/me"))).toBeNull();
    expect(
      extractAccessIdentity(
        new Request("https://patch-roulette.test/api/me", {
          headers: { "Cf-Access-Jwt-Assertion": "not-a-jwt" },
        }),
      ),
    ).toBeNull();
    expect(
      extractAccessIdentity(
        new Request("https://patch-roulette.test/api/me", {
          headers: { "Cf-Access-Jwt-Assertion": payload({ email: "user@example.com" }) },
        }),
      ),
    ).toBeNull();
  });
});
