const XPathNode = require('./XPathNode');

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
    // TODO: this explode is bad. Instead, use the parser.
    const rows = xPath.replace(/\/\//, /\//).split('/').slice(1);

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
