# Amazon Tag Remover
[![Code Climate](https://codeclimate.com/github/timbru31/amazon-tag-remover/badges/gpa.svg)](https://codeclimate.com/github/timbru31/amazon-tag-remover)

## Info
Are you tired that each banner or ad linking to amazon is silently injecting their affiliate tracking ID and receive a small revenue of what you bought? And more importantly they know what you bought? (even if it's not directly linked, it's still possible to de-anonymize the data)  
This extension removes the tracking ID before Chrome is performing the request, ensuring that you are not being tracked.

**Note: if you have a partner cookie on your computer, you might still be tracked**

![Amazon Tag Remover @Chrome Web Store](https://developer.chrome.com/webstore/images/ChromeWebStore_Badge_v2_206x58.png "Amazon Tag Remover @Chrome Web Store")
(soon)

## Features
* Visual feedback which tag was removed
* Works on starting parameter (?tag) and appended parameter (&tag)
* Full support for all amazon sites (e.g. from Germany, Mexico or UK to China and Italy)
  * amazn.to links are supported, too, since the expanded request to the amazon site is intercepted

## License
This plugin is released under the
*Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)* license.

Please see [LICENSE.md](LICENSE.md) for more information.

## Changelog

**0.1**
* initial release

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

![BitCoin](https://dl.dropboxusercontent.com/u/26476995/bitcoin_logo.png "Donation via BitCoins")
Address: 1NnrRgdy7CfiYN63vKHiypSi3MSctCP55C
