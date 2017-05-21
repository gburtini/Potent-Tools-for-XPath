const expect = require('chai').expect;

const XPathNodes = require('../src/types/XPathNodes');
const XPathNode = require('../src/types/XPathNode');

const htmlTag = new XPathNode({
  tag: 'html',
});
const bodyTag = new XPathNode({
  tag: 'body',
});
const paragraphTag = new XPathNode({
  tag: 'p',
  index: 2,
  attributes: {
    id: 'main-text',
  },
});

/**
 * XPathNodes is not exposed by the package at the moment.
 * This is internal use and development only.
 */
describe('XPathNodes', () => {
  it('should be constructable with an empty array', () => {
    expect(new XPathNodes([])).to.be.an.instanceOf(XPathNodes);
  });

  it('should be constructable with valid values', () => {
    expect(
      new XPathNodes([htmlTag, bodyTag, paragraphTag])
    ).to.be.an.instanceOf(XPathNodes);
  });
  it('should not be constructable with invalid values', () => {
    expect(() => new XPathNodes([1, 'a', null])).to.throw('Expecting array of XPathNode elements');
  });

  it('should be serializable to string', () => {
    // NOTE: this test uses the toString methods of the XPathNode directly so as to not test the
    // to string failures of XPathNode. Those tests belong in the singular test file.

    const paraSelector = new XPathNodes([htmlTag, bodyTag, paragraphTag]);
    expect(paraSelector.toString()).to.be.eq(
      `/${htmlTag.toString()}/${bodyTag.toString()}/${paragraphTag.toString()}`
    );
  });

  it('should be loadable from string', () => {
    const paraSelector = XPathNodes.fromString(
      "/html/body/p[@id='main-text'][2]"
    );
    expect(paraSelector.toString()).to.be.eq(
      `/${htmlTag.toString()}/${bodyTag.toString()}/${paragraphTag.toString()}`
    );
  });
});
