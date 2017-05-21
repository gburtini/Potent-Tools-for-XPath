const XPathNode = require('./XPathNode');
const xPathParser = require('js-xpath');

class XPathNodes {
  constructor(nodes = []) {
    if (
      !Array.isArray(nodes) ||
      nodes.filter(i => !(i instanceof XPathNode)).length
    ) {
      throw new Error('Expecting array of XPathNode elements.');
    }

    this._nodes = nodes;
  }

  get nodes() {
    return this._nodes;
  }
  get length() {
    return this._nodes.length;
  }

  add(node) {
    if (!(node instanceof XPathNode)) {
      throw new Error('Expecting XPathNode element.');
    }

    this._nodes.push(node);
  }

  static fromString(xPath) {
    const parsed = xPathParser.parse(xPath);
    const rows = parsed.steps.map(i => i.toXPath());
    return new XPathNodes(
      rows.map((row) => {
        return XPathNode.fromString(row);
      })
    );
  }

  toString(relative = false) {
    if (!this.nodes || this.nodes.length < 1) return '';

    const result = this.nodes.reduce(
      (results, node) => {
        return [...results, node.toString()];
      },
      []
    );

    const initial = relative ? '//' : '/';
    return `${initial}${result.join('/')}`;
  }
}

module.exports = XPathNodes;
