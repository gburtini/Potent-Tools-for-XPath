const expect = require('chai').expect;

const XPathNode = require('../src/types/XPathNode');

describe('XPathNode', () => {
  it('should be constructable', () => {
    expect(
      new XPathNode({
        tag: 'html',
      })
    ).to.be.an.instanceOf(XPathNode);
  });

  describe('from string', () => {
    it('should be constructable from string', () => {
      const nodeFromString = XPathNode.fromString('html[1]');
      expect(nodeFromString).to.be.an.instanceOf(XPathNode);

      expect(nodeFromString.index).to.be.eq(1);
      expect(nodeFromString.tag).to.be.eq('html');
      expect(nodeFromString.toString()).to.be.eq('html');
    });

    it('should support from string attributes', () => {
      const nodeFromString = XPathNode.fromString("html[@lang='en']");
      expect(nodeFromString).to.be.an.instanceOf(XPathNode);
      expect(nodeFromString.attributes).to.be.deep.eq({
        lang: 'en',
      });
    });

    it('should support from string attributes with existence selector', () => {
      const nodeFromString = XPathNode.fromString('html[@lang]');
      expect(nodeFromString).to.be.an.instanceOf(XPathNode);
      expect(nodeFromString.attributes).to.be.deep.eq({
        lang: true,
      });
    });

    it('should support from string attributes with subset class selector', () => {
      const nodeFromString = XPathNode.fromString(
        "html[contains(concat(' ', normalize-space(@class), ' '), ' world ')]"
      );
      expect(nodeFromString).to.be.an.instanceOf(XPathNode);
      expect(nodeFromString.attributes).to.be.deep.eq({
        class: ['world'],
      });
    });

    it('should fail on fromString from an invalid selector node', () => {
      expect(() => {
        XPathNode.fromString('/h/t/m/l');
      }).to.throw(
        'XPathNode initialized with something that appears to be 4 XPath nodes. Expected 1.'
      );
    });
  });

  describe('to string', () => {
    it('should be serializable to string', () => {
      expect(
        new XPathNode({
          tag: 'html',
        }).toString()
      ).to.eq('html');
    });

    it('should support constructor attributes', () => {
      const node = new XPathNode({ tag: 'html', attributes: { lang: 'en' } });
      expect(node).to.be.an.instanceOf(XPathNode);

      expect(node.attributes).to.be.deep.equal({
        lang: 'en',
      });

      expect(node.toString()).to.be.eq("html[@lang='en']");
    });
  });
});
