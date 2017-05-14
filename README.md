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
const { generators, evaluators, cssToXPath } = require('potent-tools');

{ // generators: generate XPath queries from elements.
  /*
  * Get the XPath string for a given DOM element: getElememtXPath(element)
  */
  const xpath = generators.getElementXPath(domElement);
  console.log(xpath); // /html/head/body/table/tr[2]/td/strong[@class='title']


  /*
  * Get the fully qualified XPath string for a DOM element that has an ID: generators.getElementXPath(element, skipId)
  * e.g., `<html><body><div id='bob'></div></body></html>` - if you were to target the 'bob' element
  * a simple, valid xpath is `//*[@id='bob']` as IDs are expected to be unique.
  */
  const xpath = generators.getElementXPath(bobElement, skipId = true);
  console.log(xpath); // /html/body/div[1]


  /*
  * Get all the HTML attributes on an element: generators.getElementAttributes(element)
  * This is exposed, but it is really just a support method for the XPath generator.
  */
  const attributes = generators.getElementAttributes(bobElement);
  console.log(bobElement); // { id: 'bob' }
}

{ // evaluators: run XPath queries or CSS selectors to find elements
  /*
   * Get elements by XPath: evaluators.getElementsByXPath(document, xpathQuery)
   */
  const elements = evaluators.getElementsByXPath(document, '/html/body/div');
  console.log(elements); // [ DOMElement ]

  const elements = evaluators.getElementsByXPath(document, '/html/body/div/text()');
  console.log(elements); // [ "Hello world" ]

  /*
   * Get elements by CSS selector: getElementsBySelector(document, rule)
   */
  const elements = evaluators.getElementsBySelector(document, 'html > body > div#id');
  console.log(elements); // [ DOMElement ]

  /*
   * Execute a query on a document: evaluators.evaluateXPath(doc, xpath, contextNode, resultType)
   * e.g., <html><body><div id='bob'>Hello world</div></body></html>
   */
  const doc = document;
  const xpath = '/html/body/div'
  const contextNode = document; // optional, defaults to the document
  const resultType = XPathResult.STRING_TYPE; // optional, defaults to ANY_TYPE.
  const stringResult = evaluators.evaluateXPath(doc, xpath, contextNode, resultType);
  console.log(stringResult); // "Hello world"
}

{ // cssToXPath: convert CSS queries to XPath queries
  console.log(cssToXPath('html > body')); // //html>body
}


```

We have some [tests](test) that document this functionality as well. It should be possible to use our [builds](dist) on the web as well, as they simply ignore the polyfills if they're already present.

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
