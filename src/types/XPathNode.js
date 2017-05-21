const { splitAttributes } = require('separated-attributes');
const xPathParser = require('js-xpath');

function attributesToXPath(attributes) {
  let ret = '';
  const processedAttributes = splitAttributes(attributes);

  Object.keys(processedAttributes).forEach((i) => {
    const attribute = processedAttributes[i];

    if (Array.isArray(attribute)) {
      // TODO: this still seems wrong as it isn't clear if we're anding or oring.
      ret += attribute
        .map(
          a => `[contains(concat(' ', normalize-space(@${i}), ' '), ' ${a} ')]`
        )
        .join('');
    } else {
      ret += `[@${i}='${attribute}']`;
    }
  });

  return ret;
}

function indexToXPath(index, forceOutput = false) {
  if ((!index || index === 1) && !forceOutput) return '';
  return `[${index}]`;
}

class XPathNode {
  constructor(obj) {
    this.data = {};
    this.data.index = obj.index;
    this.data.attributes = Object.assign({}, obj.attributes);
    this.data.tag = obj.tag;
    this.data.elements = obj.elements; // TODO: copy?
    this.meta = Object.assign({}, obj.meta);
  }

  get index() {
    return this.data.index;
  }

  get attributes() {
    return this.data.attributes;
  }

  get tag() {
    return this.data.tag;
  }

  get elements() {
    return this.data.elements;
  }

  static fromString(row) {
    // TODO: maybe the way to do this elegantly is to push it back on the generator code.
    // Instead of allowing fromString, only allow fromDom. This method isn't documented
    // and shouldn't be used by anyone outside of Potent.

    const trialParsed = xPathParser.parse(row).steps;
    if (trialParsed.length !== 1) {
      throw new Error(
        `XPathNode initialized with ${trialParsed.length} XPath nodes. Expected 1.`
      );
    }
    const parsed = trialParsed[0];

    function extractAttributesFromSelector(field) {
      return field.predicates.reduce(
        (accumulator, predicate) => {
          let valueMap;
          try {
            if (predicate.steps) {
              valueMap = predicate.steps
                .filter(i => i.axis === 'attribute')
                .reduce(
                  (acc, i) => {
                    return Object.assign({}, acc, { [i.name]: true });
                  },
                  {}
                );
            } else if (predicate.type && predicate.type === '==') {
              valueMap = {
                [predicate.left.steps[0].name]: predicate.right.value,
              };
            } else if (predicate.id && predicate.id === 'contains') {
              // NOTE: these are weird special cases to handle the only forms we generate.
              // a more general solution is welcome.

              const key = predicate.args[0].args[1].args[0].steps[0].name;
              const value = predicate.args[1].value.trim();
              valueMap = { [key]: [value] };
            }

            // TODO: there's an else case here we should probably error in.
          } catch (e) {
            throw new Error(
              "XPathNode::fromString is only partial. We can't parse this. Submit a pull request!"
            );
          }

          return Object.assign({}, accumulator, valueMap);
        },
        {}
      );
    }

    function extractIndexFromSelector(selector) {
      const indexSelector = /\[([0-9]*)\]/.exec(selector);
      if (!indexSelector) return undefined;
      return parseInt(indexSelector[1], 10);
    }

    return new XPathNode({
      index: extractIndexFromSelector(row),
      attributes: extractAttributesFromSelector(parsed),
      tag: /^[a-zA-Z]*/.exec(row)[0],
    });
  }

  toString() {
    const indexString = indexToXPath(
      this.data.index,
      this.meta.hasFollowingSiblings
    );

    const attributesString = this.data.attributes
      ? attributesToXPath(this.data.attributes)
      : '';

    // TODO: how to know if we should drop the attributes string?
    return this.tag +
      indexString +
      (this.meta.hasFollowingSiblings !== false ? attributesString : '');
  }
}

module.exports = XPathNode;
