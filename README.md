Potent Tools for XPath and CSS
==============================
![Potent.js](https://d2ppvlu71ri8gs.cloudfront.net/items/1i3H1E3A2A0u0r1m0U44/potent-short-left.png)

[![Build Status](https://travis-ci.org/gburtini/Potent-Tools-for-XPath.svg?branch=master)](https://travis-ci.org/gburtini/Potent-Tools-for-XPath)

Tools for working with the DOM, CSS selectors and XPath 1.0 expressions. All functionality in this repository is derived from [Firebug](https://raw.githubusercontent.com/firebug/firebug/master/extension/content/firebug/lib/xpath.js), and has been modified for readability and to support pseudo-DOM, unit testing and ES6 standards.

This package solves four loosely related problems:
- Evaluating XPath expressions on arbitrary documents (including pseudo-DOM)
- Generating XPath expressions for paths in DOM structures
- Converting CSS selectors to XPath expressions (for evaluation or otherwise)
- Parsing CSS selectors for meaning (e.g. `"body.thing"` -> `{ element: body, class: thing }`).

Installation
------------
`yarn add potent-tools`

Usage
-----

```js
const generators = require('potent-tools').generators;
const xpath = generators.getElementXPath(domElement);
console.log(xpath); // /html/head/body/table/tr[2]/td/strong[@class='title']
```

Other usage is documented in our [tests](test), at the moment.

It should be possible to use our [builds](dist) on the web as well, as they simply ignore the polyfills if they're already present.

License
-------

As the code in this repository is derived from the Firebug source code, its [BSD 3-clause license](https://github.com/firebug/firebug/blob/master/extension/license.txt) applies.

Development
-----------

I will accept pull requests which do not deviate from the intent of the original Firebug code, as the intent of this repository is simply to cleanup, standardize and package the Firebug XPath library for reuse. 

- In general, readability will be preferred to conciseness. 
- Please ensure all unit tests pass (`yarn test`).
- Please ensure new code has sufficient coverage (`yarn run coverage`).
- Please ensure code has been linted to meet the formatting standards (I use [eslint-config-strawhouse](https://www.npmjs.com/package/eslint-config-strawhouse) and [Prettier](https://github.com/prettier/prettier)).

To build a web distribution, `yarn run build` should update the files in `dist/`.
