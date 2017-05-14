/**
 * This file's primary purpose is to turn a bunch of hard-to-read regular expressions
 * in to self-documenting functions with appropriate named capture groups and minimal
 * meaning parsing.
 */

/**
 * `element(string)` matches the pieces of an initial CSS selector and returns a parsed set of fields.
 * e.g., #id, .class or body
 *
 * It also parses out the piped namespace piece: https://www.w3.org/TR/css3-selectors/#univnmsp
 */
function element(string) {
  const CSS_ELEMENT_PATTERN = /^([#.]?)([a-z0-9\\*_-]*)((\|)([a-z0-9\\*_-]*))?/i;
  const matches = CSS_ELEMENT_PATTERN.exec(string);
  if (!matches) return matches;

  const retVal = {
    fullGroup: matches[0],
    fullNamespaceGroup: matches[3],
    namespace: matches[5], // TODO: this is backwards, handle namespace standardization here.
  };

  // either "#" or "." to indicate id or class selector
  if (matches[1] === '#' || matches[1] === '.') {
    retVal.specialSelectorType = matches[1];
    retVal.specialSelectorValue = matches[2];
  } else if (matches[1] === '') {
    retVal.elementName = matches[2];
  }

  return retVal;
}

/**
 * `attributePresence(string)` matches the pieces of a CSS selector that represent a attribute presence requirement.
 *  e.g., [disabled], [x-anything-here]
 */
function attributePresence(string) {
  const CSS_ATTRIBUTE_PRESENCE_PATTERN = /^\[([^\]]*)\]/i;
  const matches = CSS_ATTRIBUTE_PRESENCE_PATTERN.exec(string);
  if (!matches) return matches;

  return {
    fullGroup: matches[0],
    attributeName: matches[1],
  };
}

/**
 * `attributeValue(string)` matches the pieces of a CSS selector that represent a attribute selector.
 *  e.g., [disabled='disabled'], [class~='alphaghettis'], [type != 'number']
 *
 * TODO: this pattern fails on single or unquoted things. Bad!
 */
function attributeValue(string) {
  const CSS_ATTRIBUTE_VALUE_PATTERN = /^\[\s*([^~=\s]+)\s*(~?=)\s*"([^"]+)"\s*\]/i;
  const matches = CSS_ATTRIBUTE_VALUE_PATTERN.exec(string);
  if (!matches) return matches;

  return {
    fullGroup: matches[0],
    field: matches[1],
    value: matches[3],
    isContains: matches[2] === '~=',
  };
}

/**
 * `pseudo(string)` matches the pieces of a CSS selector that represent a pseudo selector.
 *  e.g., :first-child, :visited
 */
// TODO: verify this works with parentheses, e.g., nth-child(2).
function pseudo(string) {
  const CSS_PSEUDO_PATTERN = /^:([a-z_-])+/i;
  const matches = CSS_PSEUDO_PATTERN.exec(string);
  if (!matches) return matches;

  return {
    fullGroup: matches[0],
    selector: matches[1],
  };
}

/**
 * `combinator(string)` matches the pieces of a CSS selector that represent a combinator.
 *  e.g., + or >
 */
function combinator(string) {
  const CSS_COMBINATOR_PATTERN = /^(\s*[>+\s])?/i;
  const matches = CSS_COMBINATOR_PATTERN.exec(string);
  if (!matches) return matches;

  return {
    fullGroup: matches[0],
  };
}

/**
 * `comma(string)` matches commas in a CSS selector; used for disjunction.
 */
function comma(string) {
  const COMMA_PATTERN = /^\s*,/i;
  const matches = COMMA_PATTERN.exec(string);
  if (!matches) return matches;

  return {
    fullGroup: matches[0],
  };
}

module.exports = {
  element,
  attributePresence,
  attributeValue,
  pseudo,
  combinator,
  comma,
};
