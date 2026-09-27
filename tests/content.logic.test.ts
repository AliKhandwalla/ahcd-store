import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { describe, it } from "node:test";

import { FALLBACK_PRODUCTS } from "../lib/products/fallback.ts";
import { isProductVisibility, PRODUCT_VISIBILITIES } from "../lib/products/types.ts";
import { slugCandidates, slugify } from "../lib/updates/slug.ts";
import {
  EVENT_TIME_ZONE,
  formatEventRange,
  isEventExpired,
  utcToZonedLocalInput,
  zonedLocalToUtcISO,
} from "../lib/updates/time.ts";

/**
 * Pure logic behind the public pages: product data, update slugs and event
 * times. No network, no database, no server.
 */

describe("update slugs", () => {
  it("makes a URL-safe slug from a real title", () => {
    assert.equal(
      slugify("AHCD is coming to the Bellaire Open Air Fall Market!"),
      "ahcd-is-coming-to-the-bellaire-open-air-fall-market",
    );
  });

  it("keeps possessives readable rather than splitting them", () => {
    // "Ali's" must not become "ali-s".
    assert.equal(slugify("Ali's Heat Crunch Delight"), "alis-heat-crunch-delight");
    assert.equal(slugify("Ali’s Chilli Oil"), "alis-chilli-oil");
  });

  it("strips accents instead of dropping the letters", () => {
    assert.equal(slugify("Jalapeño Crunch"), "jalapeno-crunch");
  });

  it("never returns an empty slug", () => {
    for (const title of ["!!!", "   ", "???", "你好"]) {
      assert.equal(slugify(title), "update", JSON.stringify(title));
    }
  });

  it("collapses separators and trims to a sane length", () => {
    assert.equal(slugify("a   b---c"), "a-b-c");
    const long = slugify("x".repeat(200));
    assert.ok(long.length <= 80);
    assert.ok(!long.endsWith("-"));
  });

  it("offers distinct collision candidates, base first", () => {
    const candidates = slugCandidates("Market Day", 4);
    assert.deepEqual(candidates, [
      "market-day",
      "market-day-2",
      "market-day-3",
      "market-day-4",
    ]);
    assert.equal(new Set(candidates).size, candidates.length);
  });
});

describe("event times", () => {
  it("round-trips a wall-clock time through UTC and back", () => {
    const local = "2026-10-03T09:30";
    const utc = zonedLocalToUtcISO(local);
    assert.ok(utc, "conversion should succeed");
    assert.equal(utcToZonedLocalInput(utc), local);
  });

  it("handles both sides of the DST boundary correctly", () => {
    // US DST ended 2026-11-01. A 10:00 market in Chicago is 15:00Z in summer
    // and 16:00Z in winter; getting this wrong shifts events by an hour.
    const summer = zonedLocalToUtcISO("2026-10-10T10:00");
    const winter = zonedLocalToUtcISO("2026-11-14T10:00");
    assert.equal(summer, "2026-10-10T15:00:00.000Z");
    assert.equal(winter, "2026-11-14T16:00:00.000Z");

    // And the reverse direction agrees, which is what the admin form relies on.
    assert.equal(utcToZonedLocalInput(summer), "2026-10-10T10:00");
    assert.equal(utcToZonedLocalInput(winter), "2026-11-14T10:00");
  });

  it("rejects unparseable input rather than inventing a date", () => {
    // new Date() has a lenient fallback parser that turns "not-a-date:00Z"
    // into 1 Jan 2000. Without an explicit shape check the admin form would
    // silently save a real-looking but wrong event date.
    for (const bad of ["", "not-a-date", "abc", "2026-10-03", "2026-13-45T99:99", " "]) {
      assert.equal(zonedLocalToUtcISO(bad), null, JSON.stringify(bad));
    }
  });

  it("formats a same-day range without repeating the date or zone", () => {
    const start = zonedLocalToUtcISO("2026-10-03T09:00");
    const end = zonedLocalToUtcISO("2026-10-03T14:00");
    const text = formatEventRange(start, end);
    assert.match(text, /Oct/);
    assert.match(text, /9:00/);
    assert.match(text, /2:00/);
    // The date appears once, not once per endpoint.
    assert.equal(text.match(/Oct/g)?.length, 1);
  });

  it("shows both dates for a range that spans days", () => {
    const start = zonedLocalToUtcISO("2026-10-03T20:00");
    const end = zonedLocalToUtcISO("2026-10-04T02:00");
    const text = formatEventRange(start, end);
    assert.equal(text.match(/Oct/g)?.length, 2);
  });

  it("degrades honestly on bad input", () => {
    assert.equal(formatEventRange(null, null), "");
    assert.equal(formatEventRange("nonsense", null), "");
    // A bad end time still shows the start rather than blanking the event.
    assert.match(formatEventRange(zonedLocalToUtcISO("2026-10-03T09:00"), "nonsense"), /Oct/);
  });

  it("treats an event as expired only after it has finished", () => {
    const start = "2026-10-03T14:00:00.000Z";
    const end = "2026-10-03T19:00:00.000Z";
    // Mid-event is NOT expired — the end time governs, not the start.
    assert.equal(isEventExpired(start, end, new Date("2026-10-03T16:00:00Z")), false);
    assert.equal(isEventExpired(start, end, new Date("2026-10-03T20:00:00Z")), true);
    // With no end time the start governs.
    assert.equal(isEventExpired(start, null, new Date("2026-10-03T15:00:00Z")), true);
    // An event with no dates at all is never expired.
    assert.equal(isEventExpired(null, null), false);
  });

  it("pins the event zone so times do not follow the server's locale", () => {
    assert.equal(EVENT_TIME_ZONE, "America/Chicago");
  });
});

describe("product catalogue", () => {
  it("ships fallback products so the shop is never empty", () => {
    assert.ok(FALLBACK_PRODUCTS.length > 0);
  });

  it("gives every product the fields the pages render", () => {
    for (const p of FALLBACK_PRODUCTS) {
      assert.ok(p.slug, "slug");
      assert.equal(p.slug, slugify(p.slug), `${p.slug} must already be URL-safe`);
      assert.ok(p.name, `${p.slug}: name`);
      assert.ok(p.summary, `${p.slug}: summary`);
      assert.ok(p.about, `${p.slug}: about`);
      assert.ok(Number.isInteger(p.priceCents) && p.priceCents > 0, `${p.slug}: price`);
      assert.equal(p.currency, "USD", `${p.slug}: currency`);
      assert.ok(Array.isArray(p.details), `${p.slug}: details`);
    }
  });

  it("uses unique slugs so routing cannot collide", () => {
    const slugs = FALLBACK_PRODUCTS.map((p) => p.slug);
    assert.equal(new Set(slugs).size, slugs.length);
  });

  it("points every local image at a file that actually exists", () => {
    // This is the check that fails if an image is renamed — as happened when
    // the photographs were converted to WebP. A product with no photograph is
    // legitimate; it renders the branded placeholder.
    let checked = 0;
    for (const p of FALLBACK_PRODUCTS) {
      const image = p.image;
      if (!image || !image.src.startsWith("/")) continue;
      checked += 1;
      assert.ok(
        existsSync(`public${image.src}`),
        `${p.slug}: missing file public${image.src}`,
      );
      assert.ok(image.alt && image.alt.length > 10, `${p.slug}: alt text too thin`);
      assert.ok(image.width > 0 && image.height > 0, `${p.slug}: dimensions`);
    }
    assert.ok(checked > 0, "expected at least one product photograph to verify");
  });

  it("recognises exactly the visibilities the database allows", () => {
    assert.deepEqual([...PRODUCT_VISIBILITIES], ["published", "hidden", "archived"]);
    assert.equal(isProductVisibility("published"), true);
    assert.equal(isProductVisibility("deleted"), false);
    assert.equal(isProductVisibility(""), false);
  });
});

describe("browse-only guarantee", () => {
  it("ships no checkout, cart or payment integration", async () => {
    // The family has not authorised online payments. This fails loudly if a
    // payment dependency is ever added.
    const pkg = JSON.parse(
      await import("node:fs/promises").then((fs) => fs.readFile("package.json", "utf8")),
    );
    const deps = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies });
    for (const banned of ["stripe", "square", "@stripe/stripe-js", "paypal"]) {
      assert.ok(
        !deps.some((d) => d === banned || d.startsWith(`${banned}/`)),
        `${banned} must not be a dependency — the site is browse-only`,
      );
    }
  });
});
