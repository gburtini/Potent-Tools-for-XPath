const cssToXPath = require('./cssToXPath');

// This is the weirdest line in the entire product, but this supports node environment and
// web browser environment without conditionally including the xpath module, which is important
// because otherwise the variable reference is strange.
if (typeof XPathResult === 'undefined') {
  const xpath = require('xpath');
  evaluate = xpath.evaluate;
  XPathResult = xpath.XPathResult;
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
 * - XPathResult.BOOLEAN_TYP: returns a boolean
 * - XPathResult.UNORDERED_NODE_ITERATOR_TYPE or XPathResult.ORDERED_NODE_SNAPSHOT_TYPE: returns an array of nodes
 * - XPathResult.ORDERED_NODE_SNAPSHOT_TYPE or XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE: returns an array of nodes
 * - XPathResult.ANY_UNORDERED_NODE_TYPE or XPathResult.FIRST_ORDERED_NODE_TYPE: returns a single node
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
  }
}

function getRuleMatchingElements(rule, doc) {
  const css = rule.selectorText;
  const xpath = cssToXPath(css);
  return getElementsByXPath(doc, xpath);
}

function getElementsBySelector(doc, css) {
  const xpath = cssToXPath(css);
  return getElementsByXPath(doc, xpath);
}

function getElementsByXPath(doc, xpath) {
  try {
    return evaluateXPath(doc, xpath);
  } catch (ex) {
    return [];
  }
}

module.exports = {
  evaluateXPath,
  getElementsByXPath,
  getElementsBySelector,
  getRuleMatchingElements,
};
