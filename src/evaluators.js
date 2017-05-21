/* eslint-disable no-undef */
const cssToXPath = require('css-xpath');

// This supports node environment and web browser environment without conditionally
// including the xpath module, which is important because otherwise the variable
// reference is strange. Consider it a partial polyfill.
if (typeof XPathResult === 'undefined') {
  // eslint-disable-next-line global-require
  const xPath = require('xpath');

  evaluate = xPath.evaluate;
  XPathResult = xPath.XPathResult;
}

/**
 * Evaluates an XPath expression.
 *
 * @param {Document} doc
 * @param {String} xpath The XPath expression.
 * @param {Node} contextNode The context node.
 * @param {int} resultType
 *
 * @returns {*} The result of the XPath expression, depending on resultType:
 * - XPathResult.NUMBER_TYPE: returns a Number
 * - XPathResult.STRING_TYPE: returns a String
 * - XPathResult.BOOLEAN_TYPE: returns a boolean
 * - XPathResult.UNORDERED_NODE_ITERATOR_TYPE: returns an array of nodes
 * - XPathResult.ORDERED_NODE_SNAPSHOT_TYPE: returns an array of nodes
 * - XPathResult.ORDERED_NODE_SNAPSHOT_TYPE: returns an array of nodes
 * - XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE: returns an array of nodes
 * - XPathResult.ANY_UNORDERED_NODE_TYPE: returns a single node
 * - XPathResult.FIRST_ORDERED_NODE_TYPE: returns a single node
 */
function evaluateXPath(
  doc,
  xpath,
  contextNode = doc,
  resultType = XPathResult.ANY_TYPE
) {
  const evaluateMethod = doc.evaluate || evaluate;
  const result = evaluateMethod(xpath, contextNode, null, resultType, null);

  const nodes = [];
  switch (result.resultType) {
    case XPathResult.NUMBER_TYPE:
      return result.numberValue;

    case XPathResult.STRING_TYPE:
      return result.stringValue;

    case XPathResult.BOOLEAN_TYPE:
      return result.booleanValue;

    case XPathResult.UNORDERED_NODE_ITERATOR_TYPE:
    case XPathResult.ORDERED_NODE_ITERATOR_TYPE:
      for (let item = result.iterateNext(); item; item = result.iterateNext()) {
        nodes.push(item);
      }
      return nodes;

    case XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE:
    case XPathResult.ORDERED_NODE_SNAPSHOT_TYPE:
      for (let i = 0; i < result.snapshotLength; ++i) {
        nodes.push(result.snapshotItem(i));
      }
      return nodes;

    case XPathResult.ANY_UNORDERED_NODE_TYPE:
    case XPathResult.FIRST_ORDERED_NODE_TYPE:
      return result.singleNodeValue;

    default:
      throw new Error(`Unexpected resultType passed to evaluateXPath: ${resultType}.`);
  }
}

/**
 * Get a list of elements matching a given XPath.
 *
 * @param {Document} doc
 * @param {String} xpath The XPath expression.
 * @returns {Array} An array of matching elements, in their natural XPath type:
 * DOM nodes, strings, etc.
 */
function getElementsByXPath(doc, xPath) {
  try {
    return evaluateXPath(doc, xPath);
  } catch (ex) {
    return [];
  }
}

/**
 * Get a list of elements matching a given CSS rule. Note the parameters are inverted
 * to retain the mapping from the original library.
 *
 * @param {object} rule The `CSSStyleRule` object, containing at least a `selectorText`
 *   https://developer.mozilla.org/en-US/docs/Web/API/CSSStyleRule/selectorText
 * @param {Document} doc
 * @returns {Array} An array of matching elements.
 */
function getRuleMatchingElements(rule, doc) {
  const css = rule.selectorText;
  const xPath = cssToXPath(css);
  return getElementsByXPath(doc, xPath);
}

/**
 * Get a list of elements matching a given CSS rule. Note the parameters are inverted
 * to retain the mapping from the original library.
 *
 * @param {Document} doc
 * @param {String} css The CSS rule, as a string.
 * @returns {Array} An array of matching elements.
 */
function getElementsBySelector(doc, css) {
  const xPath = cssToXPath(css);
  return getElementsByXPath(doc, xPath);
}

module.exports = {
  evaluateXPath,
  getElementsByXPath,
  getElementsBySelector,
  getRuleMatchingElements,
};
