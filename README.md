# Amazon Tag Remover

[![Security](https://github.com/timbru31/amazon-tag-remover/workflows/Security/badge.svg)](https://github.com/timbru31/amazon-tag-remover/actions?query=workflow%3ASecurity)
[![Linting](https://github.com/timbru31/amazon-tag-remover/workflows/Linting/badge.svg)](https://github.com/timbru31/amazon-tag-remover/actions?query=workflow%3ALinting)

[![Dependency Status](https://david-dm.org/timbru31/amazon-tag-remover.svg)](https://david-dm.org/timbru31/amazon-tag-remover)
[![devDependency Status](https://david-dm.org/timbru31/amazon-tag-remover/dev-status.svg)](https://david-dm.org/timbru31/amazon-tag-remover#info=devDependencies)

[![Known Vulnerabilities](https://snyk.io/test/github/timbru31/amazon-tag-remover/badge.svg)](https://snyk.io/test/github/timbru31/amazon-tag-remover)

[![Chrome Web Store](https://img.shields.io/chrome-web-store/v/mmajdhfdokfcaiadahjnffhbfjfkmcnc.svg)](https://chrome.google.com/webstore/detail/amazon-tag-remover/mmajdhfdokfcaiadahjnffhbfjfkmcnc)
[![Opera Add-ons](https://img.shields.io/badge/Opera%20Add--ons-v0.5.3-orange.svg)](https://addons.opera.com/extensions/details/amazon-tag-remover/)
[![Add-Ons for Firefox](https://img.shields.io/amo/v/amazon-tag-remover.svg)](https://addons.mozilla.org/firefox/addon/amazon-tag-remover/)
[![Microsoft Store](https://img.shields.io/badge/Microsoft%20Store-v0.7.2.0-orange.svg)](https://www.microsoft.com/store/apps/9NVBVZB6QH92)
[![Microsoft Edge Addongs](https://img.shields.io/badge/Microsoft%20Edge%20Addons-v0.8.0-orange.svg)](https://microsoftedge.microsoft.com/addons/detail/mgomlnlopahnglkdhmneklogokbmhden)

[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)
[![Dependabot Status](https://api.dependabot.com/badges/status?host=github&repo=timbru31/amazon-tag-remover)](https://dependabot.com)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE.md)

## Info

Are you tired that each banner or ad linking to amazon is silently injecting their affiliate tracking ID and receive a small revenue of what you bought? And more importantly they know what you bought? (even if it's not directly linked, it's still possible to de-anonymize the data)  
This extension removes the tracking ID before the browser is performing the request, ensuring that you are not being tracked.

**Note: if you have a partner cookie on your computer, you might still be tracked**

[![Amazon Tag Remover @Chrome Web Store](https://developer.chrome.com/webstore/images/ChromeWebStore_Badge_v2_206x58.png 'Amazon Tag Remover @Chrome Web Store')](https://chrome.google.com/webstore/detail/amazon-tag-remover/mmajdhfdokfcaiadahjnffhbfjfkmcnc)
[<img alt="Amazon Tag Remover @Opera add-ons" src="https://dev.opera.com/extensions/branding-guidelines/addons_206x58_en@2x.png" height="58" width="206">](https://addons.opera.com/extensions/details/amazon-tag-remover/)
[<img alt="Amazon Tag Remover @Add-Ons for Firefox" src="https://addons.cdn.mozilla.net/static/img/addons-buttons/AMO-button_1.png" height="58">](https://addons.mozilla.org/firefox/addon/amazon-tag-remover/)
[<img alt="Amazon Tag Remover @Microsoft Store" src="https://assets.windowsphone.com/85864462-9c82-451e-9355-a3d5f874397a/English_get-it-from-MS_InvariantCulture_Default.png" height="58">](https://www.microsoft.com/store/apps/9NVBVZB6QH92)
[<img alt="Amazon Tag Remover @Microsoft Edge Addons" src="docs/Microsoft_Edge_logo_(2019).svg" height="58">](https://microsoftedge.microsoft.com/addons/detail/mgomlnlopahnglkdhmneklogokbmhden)

## Features

-   Visual feedback which tag was removed
-   Works on starting parameter (?tag) and appended parameter (&tag)
-   Support for ascsubtags
-   Full support for all amazon sites (e.g. from Germany, Mexico or UK to China and Italy)
    -   amazn.to links are supported, too, since the expanded request to the amazon site is intercepted

## Changelog

Please visit [CHANGELOG.md](CHANGELOG.md) for a complete changelog.

## Upcoming Features

-   Options to whitelist specific tags (charity, friends of you, ...) (#9)

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
