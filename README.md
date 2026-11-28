# Tag Remover for Amazon

<p>
  <a href="https://chrome.google.com/webstore/detail/amazon-tag-remover/mmajdhfdokfcaiadahjnffhbfjfkmcnc">
    <picture>
      <source srcset="https://i.imgur.com/XBIE9pk.png" media="(prefers-color-scheme: dark)" />
      <img height="58" src="https://i.imgur.com/oGxig2F.png" alt="Chrome Web Store" /></picture
  ></a>
  <a href="https://addons.mozilla.org/firefox/addon/amazon-tag-remover/">
    <picture>
      <source srcset="https://i.imgur.com/ZluoP7T.png" media="(prefers-color-scheme: dark)" />
      <img height="58" src="https://i.imgur.com/4PobQqE.png" alt="Firefox add-ons" /></picture
  ></a>
  <a href="https://microsoftedge.microsoft.com/addons/detail/mgomlnlopahnglkdhmneklogokbmhden">
    <picture>
      <source srcset="https://i.imgur.com/Jog9cQP.png" media="(prefers-color-scheme: dark)" />
      <img height="58" src="https://i.imgur.com/aiprUt8.png" alt="Microsoft Store" /></picture
  ></a>
  <a href="https://addons.opera.com/extensions/details/amazon-tag-remover">
    <picture>
      <source srcset="https://i.imgur.com/ziehy0f.png" media="(prefers-color-scheme: dark)" />
      <img height="58" src="https://i.imgur.com/ytVATu0.png" alt="Opera add-ons" /></picture
  ></a>
</p>
<p align="center">
  <a href="https://apps.apple.com/app/tag-remover-for-amazon/id6740751508">
    <picture>
      <source srcset="./docs/AppStore_Dark.svg" media="(prefers-color-scheme: dark)" />
      <img height="58" src="./docs/AppStore_Light.svg" alt="AppStore for macOS and iOS" /></picture
  ></a>
  <a href="https://testflight.apple.com/join/xUQ3H9S2">
    <picture>
      <source srcset="./docs/TestFlight_Dark.svg" media="(prefers-color-scheme: dark)" />
      <img height="58" src="./docs/TestFlight_Light.svg" alt="TestFlight beta for macOS and iOS" /></picture
  ></a>
</p>

[![Linting](https://github.com/timbru31/amazon-tag-remover/workflows/Linting/badge.svg)](https://github.com/timbru31/amazon-tag-remover/actions?query=workflow%3ALinting)
[![Known Vulnerabilities](https://snyk.io/test/github/timbru31/amazon-tag-remover/badge.svg)](https://snyk.io/test/github/timbru31/amazon-tag-remover)
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

A browser extension for Chrome, Firefox, Edge, Opera and Safari (macOS/iOS) that strips the Amazon affiliate tracking ID (`tag`) from links before the request is made.

## Contents

- [Info](#info)
- [How it works](#how-it-works)
- [Features](#features)
- [Options](#options)
- [Contributing](#contributing)
- [Testing](#testing)
- [Support](#support)

## Info

Are you tired that each banner or ad linking to amazon is silently injecting their affiliate tracking ID and receive a small revenue of what you bought? And more importantly they know what you bought? (even if it's not directly linked, it's still possible to de-anonymize the data)  
This extension removes the tracking ID before the browser is performing the request, ensuring that you are not being tracked.

**Note: if you have a partner cookie on your computer, you might still be tracked**

## How it works

The extension uses declarative network request rules, so the tag is removed inside the browser's network stack before anything is sent to Amazon. It does not read page content, collect data or talk to any third-party server.

| Before                                                  | After                                  |
| ------------------------------------------------------- | -------------------------------------- |
| `https://www.amazon.com/dp/B00WMKUUAQ?tag=some-site-20` | `https://www.amazon.com/dp/B00WMKUUAQ` |

With the optional aggressive mode, the same applies to the `/ref=...` part and the title slug.

## Features

- Visual feedback which tag was removed
- Works on starting parameter (?tag) and appended parameter (&tag)
- Support for ascsubtags
- Affiliate "Add to Cart" links (`/gp/aws/cart/add.html`) keep working: Amazon requires the tag parameter on that endpoint, so instead of removing it, its value is replaced with a neutral placeholder
- Optional aggressive mode, which removes all query parameters, the `/ref=...` part and the long title slug of Amazon links, leaving only the canonical product URL (e.g. `https://www.amazon.com/dp/B00WMKUUAQ`)
- Optional replacement tag: set your own affiliate tag, which is added to Amazon links after the existing tag was removed (combines with aggressive mode; the cart add endpoint keeps its neutral placeholder)
- Right-click any Amazon link on any page and choose "Copy link without tracking tag" to copy it without the tracking ID (in aggressive mode the copied link matches the canonical URL the extension navigates to; in Chrome/Edge this requires the browser's `clipboardWrite` support, i.e. Chrome 157+)
- Optional regional redirect: rewrite Amazon links from other regional sites to a regional site of your choice (e.g. `amazon.com` → `amazon.de`) — tracking tags are still removed. Note that not every product is available in every region: a 404 page means the product is not sold there
- Full support for all amazon sites (e.g. from Germany, Mexico or UK to China and Italy)
  - amazn.to links are supported, too, since the expanded request to the amazon site is intercepted

## Options

Open the extension's options page to configure:

| Option                    | Effect                                                                                      |
| ------------------------- | ------------------------------------------------------------------------------------------- |
| Disable notifications     | Hides the visual feedback when a tag was removed                                            |
| Aggressive mode           | Reduces links to the canonical product URL (off by default, may affect search results)      |
| Redirect to regional site | Rewrites links from other Amazon regions to the one you choose                              |
| Allowed tags              | Tags (one per line) that are left untouched                                                 |
| Replacement tag           | Your own affiliate tag, set after the original was removed; leave empty to only remove tags |

## Changelog

Please visit [CHANGELOG.md](CHANGELOG.md) for a complete changelog.

## Contributing

Requires [Node.js](https://nodejs.org/) and [pnpm](https://pnpm.io/).

1. Fork and clone the project
2. Run `pnpm install`
3. Run `pnpm build` to compile the extension into `dist`
4. Load the un-packaged addon from the `dist` folder (`chrome://extensions` with developer mode, or `about:debugging` in Firefox)
5. Run `pnpm lint` before opening a pull request; commits follow [Conventional Commits](https://www.conventionalcommits.org/) (Commitizen friendly)

`src/rules.json` holds the declarative rules, `src/js` the background logic and options page.

## Testing

- `pnpm test` — unit tests (Vitest) and linting
- `pnpm test:e2e` — end-to-end tests (Playwright). Builds the extension, then drives the real
  `dist/` build in a headless Chromium. `www.amazon.de` is resolved to a local TLS fixture via a
  launch argument, so the whole suite runs offline: the DNR redirect rewrites the URL in the
  browser's network stack before it reaches the fixture server. No Firefox coverage here —
  Playwright cannot load extensions in Firefox; Firefox is covered by the unit tests and
  `pnpm run lint:webext` (addons-linter).

## Support

For support please create an issue here at GitHub

## Donation

[![PayPal](https://www.paypalobjects.com/en_US/i/btn/btn_donateCC_LG.gif "Donation via PayPal")](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=T9TEV7Q88B9M2)

![BitCoin](https://dustplanet.de/wp-content/uploads/2015/01/bitcoin-logo-plain.png "Donation via BitCoins")  
1NnrRgdy7CfiYN63vKHiypSi3MSctCP55C

---

Built by (c) Tim Prüssing and contributors. Released under the MIT license.
