import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { installBrowserMock } from "./browser-mock.js";

installBrowserMock();
const background = await import("../src/js/background.js");

interface QueryKeyValue {
  key: string;
  value: string;
  replaceOnly?: boolean;
}

interface DnrRule {
  id: number;
  priority?: number;
  action: {
    type: "allow" | "block" | "redirect" | "upgradeScheme" | "modifyHeaders";
    redirect?: {
      regexSubstitution?: string;
      transform?: {
        query?: string;
        queryTransform?: {
          addOrReplaceParams?: QueryKeyValue[];
          removeParams?: string[];
        };
      };
    };
  };
  condition: {
    urlFilter?: string;
    regexFilter?: string;
    resourceTypes?: string[];
  };
}

const staticRules = JSON.parse(readFileSync(resolve(import.meta.dirname, "../src/rules.json"), "utf8")) as DnrRule[];

// --- Minimal emulation of the DNR rule model (see MDN "Matching precedence") ---

function urlFilterToRegExp(urlFilter: string): RegExp {
  const pattern = urlFilter
    .split("")
    .map((char, index) => {
      if (char === "*") return ".*";
      if (char === "?") return ".";
      if (char === "|" && index === 0) return "^";
      return char.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
    })
    .join("");
  return new RegExp(pattern);
}

function ruleMatches(rule: DnrRule, url: string): boolean {
  if (rule.condition.urlFilter !== undefined && !urlFilterToRegExp(rule.condition.urlFilter).test(url)) {
    return false;
  }
  if (rule.condition.regexFilter !== undefined && !new RegExp(rule.condition.regexFilter).test(url)) {
    return false;
  }
  return true;
}

const actionPrecedence: Record<DnrRule["action"]["type"], number> = {
  allow: 0,
  block: 1,
  upgradeScheme: 2,
  redirect: 3,
  modifyHeaders: 4,
};

function resolveRule(rules: DnrRule[], url: string): DnrRule | undefined {
  const matching = rules.filter((rule) => ruleMatches(rule, url));
  if (matching.length === 0) {
    return undefined;
  }
  matching.sort(
    (a, b) => (b.priority ?? 1) - (a.priority ?? 1) || actionPrecedence[a.action.type] - actionPrecedence[b.action.type] || a.id - b.id,
  );
  return matching[0];
}

function applyRedirect(url: string, rule: DnrRule): string {
  const redirect = rule.action.redirect;

  // redirect.regexSubstitution: the first match of condition.regexFilter is
  // replaced with the substitution. DNR uses \1 for capture groups, JS $1.
  if (redirect?.regexSubstitution !== undefined && rule.condition.regexFilter !== undefined) {
    const substitution = redirect.regexSubstitution.replace(/\\([1-9])/gu, (_match, digit) => `$${digit}`);
    return url.replace(new RegExp(rule.condition.regexFilter), substitution);
  }

  const transformed = new URL(url);
  // transform.query: an empty string clears the whole query string
  if (redirect?.transform?.query === "") {
    transformed.search = "";
  }
  const queryTransform = redirect?.transform?.queryTransform;
  for (const key of queryTransform?.removeParams ?? []) {
    transformed.searchParams.delete(key);
  }
  for (const param of queryTransform?.addOrReplaceParams ?? []) {
    // replaceOnly: only touch the key when it is already present
    if (param.replaceOnly === true && !transformed.searchParams.has(param.key)) {
      continue;
    }
    transformed.searchParams.set(param.key, param.value);
  }
  return transformed.toString();
}

/** URL after the resolved rule is applied (a no-op transform leaves it untouched). */
function effectiveUrl(rule: DnrRule | undefined, url: string): string {
  return rule?.action.type === "redirect" ? applyRedirect(url, rule) : url;
}

const cartAddUrl =
  "https://www.amazon.de/gp/aws/cart/add.html?ASIN.1=B012NH05UW&Quantity.1=1&ASIN.2=B012M8LXQW&Quantity.2=1&tag=partner-21";

describe("static rules (rules.json)", () => {
  it("strips tag and ascsubtag from all amazon navigations", () => {
    const base = staticRules.find((rule) => rule.condition.urlFilter === "*://*.amazon.*/*");
    expect(base).toBeDefined();
    expect(base?.action).toEqual({
      type: "redirect",
      redirect: { transform: { queryTransform: { removeParams: ["tag", "ascsubtag"] } } },
    });
    expect(base?.condition.resourceTypes).toEqual(["main_frame", "sub_frame"]);
  });

  it("neutralizes the tag on the cart add endpoint with a higher-priority rule", () => {
    const base = staticRules.find((rule) => rule.condition.urlFilter === "*://*.amazon.*/*");
    const cartAdd = staticRules.find((rule) => rule.condition.urlFilter === "*://*.amazon.*/gp/aws/cart/add.html*");
    expect(cartAdd).toBeDefined();
    // The endpoint rule must outrank the base rule, otherwise it would never apply
    expect(cartAdd?.priority).toBeGreaterThan(base?.priority ?? 0);
    expect(cartAdd?.action.redirect?.transform?.queryTransform).toEqual({
      // The endpoint requires the tag parameter to be present, so it is
      // replaced with a neutral placeholder instead of being removed. The
      // value does not resemble any real associate tag (no store ID, no
      // track number), so no commission can be credited to anyone.
      addOrReplaceParams: [{ key: "tag", value: "0", replaceOnly: true }],
      removeParams: ["ascsubtag"],
    });
    expect(cartAdd?.condition.resourceTypes).toEqual(["main_frame", "sub_frame"]);
  });

  it("uses unique rule ids", () => {
    const ids = staticRules.map((rule) => rule.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("rule resolution", () => {
  it("replaces the partner tag with the placeholder on the cart add endpoint", () => {
    const rule = resolveRule(staticRules, cartAddUrl);
    expect(rule?.action.type).toBe("redirect");
    expect(effectiveUrl(rule, cartAddUrl)).toBe(
      "https://www.amazon.de/gp/aws/cart/add.html?ASIN.1=B012NH05UW&Quantity.1=1&ASIN.2=B012M8LXQW&Quantity.2=1&tag=0",
    );
  });

  it("still removes ascsubtag on the cart add endpoint", () => {
    const url = `${cartAddUrl}&ascsubtag=partner-21`;
    const rule = resolveRule(staticRules, url);
    expect(effectiveUrl(rule, url)).toBe(
      "https://www.amazon.de/gp/aws/cart/add.html?ASIN.1=B012NH05UW&Quantity.1=1&ASIN.2=B012M8LXQW&Quantity.2=1&tag=0",
    );
  });

  it("leaves the cart add endpoint untouched when no tag is present", () => {
    const url = "https://www.amazon.de/gp/aws/cart/add.html?ASIN.1=B012NH05UW&Quantity.1=1";
    const rule = resolveRule(staticRules, url);
    expect(rule).toBeDefined(); // the endpoint rule matches
    expect(effectiveUrl(rule, url)).toBe(url); // but changes nothing
  });

  it("keeps the base rule for regular product pages", () => {
    const url = "https://www.amazon.de/dp/B012NH05UW?tag=partner-21&ascsubtag=partner-21&ref=xx";
    const base = staticRules.find((rule) => rule.condition.urlFilter === "*://*.amazon.*/*");
    expect(resolveRule(staticRules, url)?.id).toBe(base?.id);
    expect(effectiveUrl(resolveRule(staticRules, url), url)).toBe("https://www.amazon.de/dp/B012NH05UW?ref=xx");
  });

  it("lets allowed tags win on the cart add endpoint", () => {
    const url = "https://www.amazon.de/gp/aws/cart/add.html?ASIN.1=B012NH05UW&Quantity.1=1&tag=mytag-21";
    const rules = [...staticRules, ...background.createAmazonRules(["mytag-21"])];
    const rule = resolveRule(rules, url);
    expect(rule?.action.type).toBe("allow");
    expect(effectiveUrl(rule, url)).toBe(url);
  });

  it("lets allowed tags win on regular pages", () => {
    const url = "https://www.amazon.de/dp/B012NH05UW?tag=mytag-21";
    const rules = [...staticRules, ...background.createAmazonRules(["mytag-21"])];
    const rule = resolveRule(rules, url);
    expect(rule?.action.type).toBe("allow");
    expect(effectiveUrl(rule, url)).toBe(url);
  });

  it("does not match non-amazon URLs", () => {
    expect(resolveRule(staticRules, "https://www.example.com/gp/aws/cart/add.html?tag=partner-21")).toBeUndefined();
  });
});

describe("rule resolution with aggressive mode", () => {
  const aggressiveRules = background.createAggressiveRules();
  const issueUrl =
    "https://www.amazon.com/Mitutoyo-Advanced-Absolute-Digital-Caliper/dp/B00WMKUUAQ/ref=as_li_ss_tl?ie=UTF8&linkCode=sl1&linkId=0ca01780457ac001751b779809516530&language=en_US";

  it("canonicalizes the slugged issue example to the bare product URL", () => {
    const rule = resolveRule([...staticRules, ...aggressiveRules], issueUrl);
    expect(rule?.id).toBe(100001);
    expect(effectiveUrl(rule, issueUrl)).toBe("https://www.amazon.com/dp/B00WMKUUAQ");
  });

  it("canonicalizes /gp/product/ shapes to /dp/<ASIN>", () => {
    const url = "https://www.amazon.de/gp/product/B0GXB9QXR5";
    const rule = resolveRule([...staticRules, ...aggressiveRules], url);
    expect(rule?.id).toBe(100001);
    expect(effectiveUrl(rule, url)).toBe("https://www.amazon.de/dp/B0GXB9QXR5");
  });

  it("canonicalizes bare /product/ URLs via the separate bare product rule", () => {
    const url = "https://www.amazon.com/product/B0GXB9QXR5?th=1";
    const rule = resolveRule([...staticRules, ...aggressiveRules], url);
    expect(rule?.id).toBe(100003);
    expect(effectiveUrl(rule, url)).toBe("https://www.amazon.com/dp/B0GXB9QXR5");
  });

  it("strips the query from non-product URLs via the url rule", () => {
    const url = "https://www.amazon.de/s?k=caliper&page=2";
    const rule = resolveRule([...staticRules, ...aggressiveRules], url);
    expect(rule?.id).toBe(100002);
    expect(effectiveUrl(rule, url)).toBe("https://www.amazon.de/s");
  });

  it("leaves plain canonical product URLs untouched", () => {
    const url = "https://www.amazon.de/dp/B012NH05UW";
    const rule = resolveRule([...staticRules, ...aggressiveRules], url);
    // The base rule matches but changes nothing
    expect(effectiveUrl(rule, url)).toBe(url);
  });

  it("keeps the cart add endpoint on the neutralization rule", () => {
    const url = `${cartAddUrl}&linkCode=sl1`;
    const rule = resolveRule([...staticRules, ...aggressiveRules], url);
    expect(rule?.id).toBe(7919055);
    expect(effectiveUrl(rule, url)).toBe(
      "https://www.amazon.de/gp/aws/cart/add.html?ASIN.1=B012NH05UW&Quantity.1=1&ASIN.2=B012M8LXQW&Quantity.2=1&tag=0&linkCode=sl1",
    );
  });

  it("lets allowed tags win over aggressive mode", () => {
    const url = "https://www.amazon.de/dp/B012NH05UW/ref=as_li_ss_tl?tag=mytag-21&linkCode=sl1";
    const rules = [...staticRules, ...aggressiveRules, ...background.createAmazonRules(["mytag-21"])];
    const rule = resolveRule(rules, url);
    expect(rule?.action.type).toBe("allow");
    expect(effectiveUrl(rule, url)).toBe(url);
  });
});
