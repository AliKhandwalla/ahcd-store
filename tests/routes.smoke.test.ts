import assert from "node:assert/strict";
import { describe, it } from "node:test";

/**
 * Smoke tests for the public routes, run against a real server.
 *
 * SKIPPED unless SMOKE_BASE_URL is set, because it needs a running app:
 *
 *   npm run build && npm start
 *   SMOKE_BASE_URL=http://localhost:3000 NEWSLETTER_RPC_TESTS=0 npm test
 *
 * These are deliberately shallow. They check that each public page renders,
 * that the browse-only promise holds, and that nothing private leaks — not
 * that the copy reads well.
 */

const base = process.env.SMOKE_BASE_URL?.replace(/\/$/, "");
const skip = base ? false : "set SMOKE_BASE_URL to run route smoke tests";

async function get(path: string) {
  const response = await fetch(`${base}${path}`, { redirect: "manual" });
  const body = response.status < 400 ? await response.text() : "";
  return { status: response.status, body, headers: response.headers };
}

const PUBLIC_PAGES = [
  ["/", "homepage"],
  ["/products", "catalogue"],
  ["/products/original", "product detail"],
  ["/updates", "updates index"],
  ["/privacy", "privacy notice"],
  ["/login", "sign in"],
] as const;

describe("public routes render", { skip }, () => {
  for (const [path, label] of PUBLIC_PAGES) {
    it(`${label} (${path}) returns 200`, async () => {
      const { status } = await get(path);
      assert.equal(status, 200, `${path} returned ${status}`);
    });
  }

  it("an unknown product is a 404, not a crash or a blank page", async () => {
    const { status } = await get("/products/no-such-product");
    assert.equal(status, 404);
  });

  it("an unknown update is a 404", async () => {
    const { status } = await get("/updates/no-such-update");
    assert.equal(status, 404);
  });
});

describe("the site stays browse-only", { skip }, () => {
  it("shows prices but offers no way to buy", async () => {
    const { body } = await get("/products/original");
    assert.match(body, /\$12/, "the price should still be shown");
    // No cart, checkout or payment affordance anywhere in the markup.
    for (const banned of [
      /add to cart/i,
      /add to basket/i,
      /buy now/i,
      /checkout/i,
      /proceed to pay/i,
      /stripe/i,
      /squareup\.com/i,
      /paypal/i,
    ]) {
      assert.ok(!banned.test(body), `product page must not contain ${banned}`);
    }
  });

  it("says plainly that ordering is not open", async () => {
    const { body } = await get("/products");
    assert.match(body, /coming soon|in person/i);
  });
});

describe("private areas are not publicly reachable", { skip }, () => {
  for (const path of ["/admin", "/admin/newsletter", "/admin/products", "/account"]) {
    it(`${path} does not serve content to a signed-out visitor`, async () => {
      const { status, body } = await get(path);
      assert.ok(
        status === 302 || status === 307 || status === 401 || status === 403 || status === 404,
        `${path} returned ${status} to an anonymous visitor`,
      );
      assert.ok(!/Confirmed subscribers/i.test(body), `${path} leaked admin content`);
    });
  }

  it("no server-only secret appears in the homepage markup", async () => {
    const { body } = await get("/");
    for (const needle of ["RESEND_API_KEY", "RESEND_CONTACTS_API_KEY", "NEWSLETTER_RPC_SECRET", "ADMIN_EMAIL", "re_"]) {
      assert.ok(!body.includes(needle), `homepage markup contains ${needle}`);
    }
  });
});

describe("images referenced by the pages actually exist", { skip }, () => {
  it("serves every image the homepage references", async () => {
    const { body } = await get("/");
    // next/image rewrites srcs through /_next/image?url=…; pull the originals.
    const referenced = new Set(
      [...body.matchAll(/url=%2F([^&"]+)/g)].map((m) => `/${decodeURIComponent(m[1])}`),
    );
    assert.ok(referenced.size > 0, "expected the homepage to reference images");

    for (const src of referenced) {
      const response = await fetch(`${base}${src}`);
      assert.equal(response.status, 200, `${src} returned ${response.status}`);
    }
  });
});
