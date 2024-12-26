# Amazon Tag Remover

<p>
  <a href="https://chrome.google.com/webstore/detail/amazon-tag-remover/mmajdhfdokfcaiadahjnffhbfjfkmcnc">
    <picture>
      <source srcset="https://i.imgur.com/XBIE9pk.png" media="(prefers-color-scheme: dark)" />
      <img height="58" src="https://i.imgur.com/oGxig2F.png" alt="Chrome Web Store"
    /></picture>
  </a>
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

[![Security](https://github.com/timbru31/amazon-tag-remover/workflows/Security/badge.svg)](https://github.com/timbru31/amazon-tag-remover/actions?query=workflow%3ASecurity)
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
- Full support for all amazon sites (e.g. from Germany, Mexico or UK to China and Italy)
  - amazn.to links are supported, too, since the expanded request to the amazon site is intercepted

## Changelog

Please visit [CHANGELOG.md](CHANGELOG.md) for a complete changelog.

## Upcoming Features

- Options to whitelist specific tags (charity, friends of you, ...) (#9)

## Contributing

1. Fork and clone the project
2. Run `npm install`
3. Run `npm run build:dev` and start hacking. The extension is automatically rebuilt on changes.
4. Load the un-packaged addon from the `dist` folder

## Support

For support please create an issue here at GitHub

## Donation

[![PayPal](https://www.paypalobjects.com/en_US/i/btn/btn_donateCC_LG.gif 'Donation via PayPal')](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=T9TEV7Q88B9M2)

![BitCoin](https://dustplanet.de/wp-content/uploads/2015/01/bitcoin-logo-plain.png 'Donation via BitCoins')  
1NnrRgdy7CfiYN63vKHiypSi3MSctCP55C

---

Built by (c) Tim Brust and contributors. Released under the MIT license.  
The `Get it for Microsoft Edge` logo is kindly offered for free by [Julien Muggli](https://gist.github.com/Liozon/cf898c47628bfecd9896f79e6c9a8db8)
