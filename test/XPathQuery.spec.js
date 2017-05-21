const expect = require('chai').expect;

const XPathQuery = require('../src/types/XPathQuery');
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


describe('XPathQuery', () => {
  it('should be constructable with an empty array', () => {
    expect(new XPathQuery([])).to.be.an.instanceOf(XPathQuery);
  });

  it('should be constructable with valid values', () => {
    expect(
      new XPathQuery([htmlTag, bodyTag, paragraphTag])
    ).to.be.an.instanceOf(XPathQuery);
  });
  it('should not be constructable with invalid values', () => {
    expect(() => new XPathQuery([1, 'a', null])).to.throw('Expecting array of XPathNode elements');
  });

  it('should be serializable to string', () => {
    // NOTE: this test uses the toString methods of the XPathNode directly so as to not test the
    // to string failures of XPathNode. Those tests belong in the singular test file.

    const paraSelector = new XPathQuery([htmlTag, bodyTag, paragraphTag]);
    expect(paraSelector.toString()).to.be.eq(
      `/${htmlTag.toString()}/${bodyTag.toString()}/${paragraphTag.toString()}`
    );
  });

  it('should be loadable from string', () => {
    const paraSelector = XPathQuery.fromString(
      "/html/body/p[@id='main-text'][2]"
    );
    expect(paraSelector.toString()).to.be.eq(
      `/${htmlTag.toString()}/${bodyTag.toString()}/${paragraphTag.toString()}`
    );
  });
});
