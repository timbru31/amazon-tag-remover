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
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE.md)

## Info

Are you tired that each banner or ad linking to amazon is silently injecting their affiliate tracking ID and receive a small revenue of what you bought? And more importantly they know what you bought? (even if it's not directly linked, it's still possible to de-anonymize the data)  
This extension removes the tracking ID before the browser is performing the request, ensuring that you are not being tracked.

**Note: if you have a partner cookie on your computer, you might still be tracked**

## Features

- Visual feedback which tag was removed
- Works on starting parameter (?tag) and appended parameter (&tag)
- Support for ascsubtags
- Affiliate "Add to Cart" links (`/gp/aws/cart/add.html`) keep working: Amazon requires the tag parameter on that endpoint, so instead of removing it, its value is replaced with a neutral placeholder
- Optional aggressive mode, which removes all query parameters, the `/ref=...` part and the long title slug of Amazon links, leaving only the canonical product URL (e.g. `https://www.amazon.com/dp/B00WMKUUAQ`)
- Full support for all amazon sites (e.g. from Germany, Mexico or UK to China and Italy)
  - amazn.to links are supported, too, since the expanded request to the amazon site is intercepted

## Changelog

Please visit [CHANGELOG.md](CHANGELOG.md) for a complete changelog.

## Contributing

1. Fork and clone the project
2. Run `pnpm install`
3. Run `pnpm run build:dev` and start hacking. The extension is automatically rebuilt on changes.
4. Load the un-packaged addon from the `dist` folder

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
