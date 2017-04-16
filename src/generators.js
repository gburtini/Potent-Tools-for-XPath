const DOCUMENT_TYPE_NODE = 10; //https://developer.mozilla.org/en/docs/Web/API/Node/nodeType

/**
 * Produces an XPath expression for the attributes of an element.
 */
function getElementAttributes(element) {
  const attributes = element.attributes;
  const ret = {};
  for (let i = 0; i < attributes.length; i++) {
    const attribute = attributes.item(i);
    ret[attribute.nodeName] = attribute.nodeValue;
  }

  if (ret === {}) {
    return null;
  }
  return ret;
}

/**
 * Parses a tree starting from `startingElement` to produce an XPath expression.
 */
function getElementTreeXPath(startingElement, asString = true) {
  const paths = [];

  // Use nodeName (instead of localName) so namespace prefix is included (if any).
  for (
    let element = startingElement;
    element && element.nodeType === 1;
    element = element.parentNode
  ) {
    let index = 0;
    for (
      let sibling = element.previousSibling;
      sibling;
      sibling = sibling.previousSibling
    ) {
      // Ignore document type declaration.
      if (sibling.nodeType === DOCUMENT_TYPE_NODE) continue;
      if (sibling.nodeName === element.nodeName) index += 1;
    }

    const tagName = (element.prefix ? element.prefix + ':' : '') +
      element.localName;

    const attributes = getElementAttributes(element);
    let hasFollowingSiblings = false;
    for (
      let sibling = element.nextSibling;
      sibling && !hasFollowingSiblings;
      sibling = sibling.nextSibling
    ) {
      if (sibling.nodeName == element.nodeName) hasFollowingSiblings = true;
    }

    const node = {
      tag: tagName,
      index,
      attributes,
      elements: [element], // the list of things that made up this node
    };

    const pathIndex = index || hasFollowingSiblings
      ? '[' + (index + 1) + ']'
      : '';
    const returnValue = asString ? tagName + pathIndex : node;

    // push to front of array.
    paths.splice(0, 0, returnValue);
  }

  if (asString) return paths.length ? '/' + paths.join('/') : null;
  return paths.length ? paths : null;
}

/**
 * Gets an XPath expression for an element which describes its hierarchical location.
 */
function getElementXPath(element, skipId = false) {
  if (element && element.id && !skipId) return `//*[@id="${element.id}"]`;
  return getElementTreeXPath(element);
}

module.exports = {
  getElementXPath,
  getElementTreeXPath,
  getElementAttributes,
};
