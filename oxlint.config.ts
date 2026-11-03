import { defineConfig } from "oxlint";

export default defineConfig({
  categories: {
    correctness: "error",
    suspicious: "error",
    restriction: "error",
    perf: "error",
    pedantic: "error",
    // Style rules are too opinionated for a small codebase and clash with the
    // oxfmt formatter, so the formatter owns pure style.
    style: "off",
    nursery: "off",
  },
  rules: {
    "no-unused-vars": [
      "error",
      {
        args: "after-used",
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
        caughtErrors: "all",
        caughtErrorsIgnorePattern: "^_",
        ignoreRestSiblings: true,
      },
    ],
    // max-lines-per-function only trips on the test describe blocks, which are
    // long by nature; the 50-line limit is noise here.
    "eslint/max-lines-per-function": "off",
    // Every flagged async function awaits real async I/O (readFile, Probot.load,
    // receive, octokit.*); "remove the async keyword" would be a regression.
    "oxc/no-async-await": "off",
    // Named imports from node: built-ins are idiomatic on Node 26; the default
    // import form this rule suggests (import path from 'node:path') is not.
    "unicorn/import-style": "off",
    // `undefined` is a well-behaved reserved identifier on Node 26; the only
    // pre-ES2015 worry (a reassignable `undefined` global) no longer applies.
    "eslint/no-undefined": "off",
    // The extension background logs errors for debugging in the DevTools console;
    // stripping them would remove the only visibility into rule updates failing.
    "eslint/no-console": "off",
    // Optional chaining is the idiomatic way to handle the webextension API's
    // nullable results; the ternary/temp-var rewrites this rule demands are less readable.
    "oxc/no-optional-chaining": "off",
    // `void` marks the intentional fire-and-forget storage calls; a `.catch()`
    // replacement would need a no-op handler and changes nothing observable.
    "eslint/no-void": "off",
    // `_browser` is the shim name for "whichever webextension API is present".
    "no-underscore-dangle": ["error", { allow: ["_browser"] }],
  },
  env: {
    node: true,
  },
});
