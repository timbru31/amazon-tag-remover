# Change Log

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

<a name="0.5.0"></a>

# 0.5.0 (2019-01-13)

### Bug Fixes

-   amazon.com.tr support ([9fc87c0](https://github.com/timbru31/amazon-tag-remover/commit/9fc87c06db60ee58d914f37aa0baa2761294a1e5))

### Features

-   add native notification, options page and minor app refactoring. ([257f27a](https://github.com/timbru31/amazon-tag-remover/commit/257f27aedb52da0d27f7a43ba53975570078a809))

<a name="0.4.0"></a>

# 0.4.0 (2018-09-27)

### Bug Fixes

-   check if URL matches a tag, replace only then. Fixes AWS login ([a0cf102](https://github.com/timbru31/amazon-tag-remover/commit/a0cf102))
-   correct indentation in style.css ([5dbfd0f](https://github.com/timbru31/amazon-tag-remover/commit/5dbfd0f))
-   do not redirect when URL did not change, preserves preflight, fixes [#2](https://github.com/timbru31/amazon-tag-remover/issues/2) ([8dda56c](https://github.com/timbru31/amazon-tag-remover/commit/8dda56c))
-   remove outdated longurl code ([d478d1e](https://github.com/timbru31/amazon-tag-remover/commit/d478d1e))
-   spelling ([57ea119](https://github.com/timbru31/amazon-tag-remover/commit/57ea119))

### Features

-   add firefox logo ([1c95760](https://github.com/timbru31/amazon-tag-remover/commit/1c95760))
-   add icons ([d097c86](https://github.com/timbru31/amazon-tag-remover/commit/d097c86))
-   add support for ascsubtag, closes [#6](https://github.com/timbru31/amazon-tag-remover/issues/6) ([60dc68e](https://github.com/timbru31/amazon-tag-remover/commit/60dc68e))
-   add webstore icon ([66d14d7](https://github.com/timbru31/amazon-tag-remover/commit/66d14d7))
-   increase minimum chrome version ([ad68e44](https://github.com/timbru31/amazon-tag-remover/commit/ad68e44))
-   make extension compatible with Firefox and Edge ([115e7cc](https://github.com/timbru31/amazon-tag-remover/commit/115e7cc))

# Changelog

#### 0.3.2 (Chrome only)

-   Republish from Chrome
    -   Items violated against the poilicy: "Do not use irrelevant, misleading, or excessive keywords in app descriptions, titles, or metadata"

#### 0.3.1

-   Improved check if URL should be altered
    -   Fixes e.g. AWS login

#### 0.3.0

-   Add support for ascsubtag, refactor RegExp code to use URLSearchParams instead
    -   Edge currently has no support for this, but isn't accepting submissions to the store either

#### 0.2.0

-   Make extension compatible with Firefox and Edge

#### 0.1.1

-   Fix Amazon Instant Video

#### 0.1

-   initial release
