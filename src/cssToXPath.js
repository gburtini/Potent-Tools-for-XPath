const patterns = require('./patterns');

function specialSelectorToXPathPiece(element) {
  switch (element.specialSelectorType) {
    case '#': // ID
      return `[@id='${element.specialSelectorValue}']`;
      break;
    case '.': // class
      return `[contains(concat(' ',normalize-space(@class),' '), ' ${element.specialSelectorValue} ')]`;
      break;
    default:
      throw new Error(
        `Invalid special selector type: ${element.specialSelectorType}.`
      );
  }
}

function cssToXPath(rule) {
  let index = 1;
  const parts = ['//', '*'];
  let lastRule = null;

  while (rule.length && rule != lastRule) {
    lastRule = rule;

    // Trim leading whitespace
    rule = rule.trim(rule); // TODO: wtf?
    if (!rule.length) break;

    // Match the element identifier, matches rules of the form "body", ".class" and "#id"
    const element = patterns.element(rule);
    if (element) {
      if (element.specialSelectorType) {
        parts.push(specialSelectorToXPathPiece(element));
      } else if (element.namespace) {
        // TODO: can we change these to just be parts.push and put everything in a elementToXPathPiece function?
        // probably not, as they're replacing the // rule, initially. If not, leave documentation comment here.
        parts[index] = element.namespace;
      } else {
        parts[index] = element.elementName;
      }

      rule = rule.substr(element.fullMatch.length);
    }

    // Match attribute selectors
    const attribute = patterns.attributeValue(rule);
    if (attribute) {
      // matched a rule like [field~='thing'] or [name='Title']
      if (attribute.isContains) { parts.push(`[contains(@${attribute.field}, '${attribute.value}')]`); } else { parts.push(`[@${attribute.field}='${attribute.value}']`); }

      rule = rule.substr(attribute.fullMatch.length);
    } else {
      // matches rules like [mustExist], e.g., [disabled].
      const attributePresence = patterns.attributePresence(rule);
      if (attributePresence) {
        parts.push(`[@${attributePresence.attributeName}]`);

        rule = rule.substr(attributePresence.fullMatch.length);
      }
    }

    // Skip over pseudo-classes and pseudo-elements, which are of no use to us
    // e.g., :nth-child and :visited.
    let pseudoGroups = patterns.pseudo(rule);
    while (pseudoGroups) {
      rule = rule.substr(pseudoGroups.fullMatch.length);

      // if there are many, just skip them all right now.
      pseudoGroups = patterns.pseudo(rule);
    }

    // Match combinators, e.g. html > body or html + body.
    const combinator = patterns.combinator(rule);
    if (combinator && combinator.fullMatch.length) {
      if (combinator.fullMatch.indexOf('>') != -1) parts.push('/');
      else if (combinator.fullMatch.indexOf('+') != -1) { parts.push('/following-sibling::'); } else { parts.push('//'); }

      index = parts.length;
      parts.push('*');
      rule = rule.substr(combinator.fullMatch.length);
    }

    // Match comma delimited disjunctions ("or" rules), e.g., html, body
    const disjunction = patterns.comma(rule);
    if (disjunction) {
      parts.push(' | ', '//', '*');
      index = parts.length - 1;
      rule = rule.substr(disjunction.fullMatch.length);
    }
  }

  const xpath = parts.join('');
  return xpath;
}

module.exports = cssToXPath;
