if (typeof Node === 'undefined') {
  // Non-browser polyfill for https://developer.mozilla.org/en/docs/Web/API/Node/nodeType
  Node = { DOCUMENT_TYPE_NOTE: 10 };
}

/**
 * Produces an object containing the attributes of a DOM element.
 *
 * @param {DOMElement} element
 * @returns {object} An object of attribute names to values. e.g., in
 * `<img src='url' alt='text' />`, we return an object `{ src: 'url', alt: 'text' }`
 */
function getElementAttributes(element) {
  const attributes = element.attributes;
  const ret = {};
  for (let i = 0; i < attributes.length; i++) {
    const attribute = attributes.item(i);
    ret[attribute.nodeName] = attribute.nodeValue;
  }

  return ret;
}

/**
 * Parses a tree starting from `element` to produce an XPath expression.
 *
 * TODO: it seems awkward that this has `asString` instead of being cast in the
 * getElementXPath method; but this is the original design. A solution to this
 * is to always return the object with a nice toString method attached. This is
 * a breaking change and needs a promote major though.
 *
 * @param {DOMElement} element the element to identify with the expression 
 * @param {boolean} asString return a string XPath query or an object representing the query?
 * @returns {*} Either a string query or an object representing the string query.
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
      if (sibling.nodeType === Node.DOCUMENT_TYPE_NODE) continue;
      if (sibling.nodeName === element.nodeName) index += 1;
    }

    const tagName = (element.prefix ? `${element.prefix}:` : '') +
      element.localName;

    const attributes = getElementAttributes(element);
    let hasFollowingSiblingsWithSameTag = false;
    for (
      let sibling = element.nextSibling;
      sibling && !hasFollowingSiblingsWithSameTag;
      sibling = sibling.nextSibling
    ) {
      if (sibling.nodeName === element.nodeName) hasFollowingSiblingsWithSameTag = true;
    }

    const node = {
      tag: tagName,
      index,
      attributes,
      elements: [element], // the list of things that made up this node
      meta: {
        hasFollowingSiblings: hasFollowingSiblingsWithSameTag,
      },
    };

    const pathIndex = index || hasFollowingSiblingsWithSameTag
      ? `[${index + 1}]`
      : '';
    const returnValue = asString ? tagName + pathIndex : node;

    // push to front of array.
    paths.splice(0, 0, returnValue);
  }

  if (asString) return paths.length ? `/${paths.join('/')}` : null;
  return paths.length ? paths : null;
}


/**
 * Gets an XPath expression for an element which describes its hierarchical location.
 */
function getElementXPath(element, skipId = false) {
  if (element && element.id && !skipId) return `//*[@id="${element.id}"]`;
  return getElementTreeXPath(element);
}

// TODO: XPath string to Object? I think this belongs in generaotrs or the class, too.
function xPathToObject(xPath) {
  const rows = xPath.replace(/\/\//, /\//).split('/');

  return rows.map((row) => {
    return {
      index: /\[([0-9]*)\]/.exec(row),
      attributes: {}, // TODO 
      tag: /^[a-zA-Z]*/.exec(row),
      elements: 'TODO'
    };
  });
}


module.exports = {
  getElementXPath,
  getElementTreeXPath,
  getElementAttributes,
};
