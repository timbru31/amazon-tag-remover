# Amazon Tag Remover
[![Code Climate](https://codeclimate.com/github/timbru31/amazon-tag-remover/badges/gpa.svg)](https://codeclimate.com/github/timbru31/amazon-tag-remover)
[![bitHound Overall Score](https://www.bithound.io/github/timbru31/amazon-tag-remover/badges/score.svg)](https://www.bithound.io/github/timbru31/amazon-tag-remover)
[![bitHound Code](https://www.bithound.io/github/timbru31/amazon-tag-remover/badges/code.svg)](https://www.bithound.io/github/timbru31/amazon-tag-remover)

[![Chrome Web Store](https://img.shields.io/chrome-web-store/v/mmajdhfdokfcaiadahjnffhbfjfkmcnc.svg)](https://chrome.google.com/webstore/detail/amazon-tag-remover/mmajdhfdokfcaiadahjnffhbfjfkmcnc)
[![Opera Add-ons](https://img.shields.io/badge/Opera%20Add--ons-v0.3.1-orange.svg)](https://addons.opera.com/extensions/details/amazon-tag-remover/)
[![Add-Ons for Firefox](https://img.shields.io/amo/v/amazon-tag-remover.svg)](https://addons.mozilla.org/firefox/addon/amazon-tag-remover/)

[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE.md)

## Info
Are you tired that each banner or ad linking to amazon is silently injecting their affiliate tracking ID and receive a small revenue of what you bought? And more importantly they know what you bought? (even if it's not directly linked, it's still possible to de-anonymize the data)  
This extension removes the tracking ID before Chrome is performing the request, ensuring that you are not being tracked.

**Note: if you have a partner cookie on your computer, you might still be tracked**

[![Amazon Tag Remover @Chrome Web Store](https://developer.chrome.com/webstore/images/ChromeWebStore_Badge_v2_206x58.png "Amazon Tag Remover @Chrome Web Store")](https://chrome.google.com/webstore/detail/amazon-tag-remover/mmajdhfdokfcaiadahjnffhbfjfkmcnc)
[<img alt="Amazon Tag Remover @Opera add-ons" src="https://dev.opera.com/extensions/branding-guidelines/addons_206x58_en@2x.png" height="58" width="206">](https://addons.opera.com/extensions/details/amazon-tag-remover/)
[<img alt="Amazon Tag Remover @Add-Ons for Firefox" src="./images/firefox_logo-wordmark-horiz_RGB.png" height="58">](https://addons.mozilla.org/firefox/addon/amazon-tag-remover/)

## Features
* Visual feedback which tag was removed
* Works on starting parameter (?tag) and appended parameter (&tag)
* Support for ascsubtags
* Full support for all amazon sites (e.g. from Germany, Mexico or UK to China and Italy)
  * amazn.to links are supported, too, since the expanded request to the amazon site is intercepted

## Changelog
See [CHANGELOG.md](CHANGELOG.md) for a complete changelog.

## Upcoming Features
* Options to whitelist specific tags (charity, friends of you, ...)

## Support
For support please create an issue here at GitHub

## Pull Requests
Feel free to submit any PRs here, too. :)

Please indent using two spaces only, have a newline at the EOF and use UNIX line ending, thanks!
If possible use ES6 features, where available in Chrome, and single quotes ('). Make sure to run eslint on your feature branch.

## Donation
[![PayPal](https://www.paypalobjects.com/en_US/i/btn/btn_donateCC_LG.gif "Donation via PayPal")](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=T9TEV7Q88B9M2)

![BitCoin](https://dustplanet.de/wp-content/uploads/2015/01/bitcoin-logo-plain.png "Donation via BitCoins")  
1NnrRgdy7CfiYN63vKHiypSi3MSctCP55C

---
Built by (c) Tim Brust and contributors. Released under the MIT license.
