const expect = require('chai').expect;
const jsdom = require('jsdom');
const generators = require('../src/generators');

function newDocument() {
  const options = {};
  const doc = jsdom.jsdom(null, options);
  doc.parent = doc.defaultView;
  return doc;
}

function simpleDocument() {

}

describe('generators', () => {
  describe('getElementTreeXPath', () => {
    it('should work in simple DOM case', () => {
      const document = newDocument();

      const parentDiv = document.createElement('div');
      const childDiv1 = document.createElement('div');
      const childDiv2 = document.createElement('div');
      childDiv2.className = 'test';

      parentDiv.appendChild(childDiv1);
      parentDiv.appendChild(childDiv2);
      document.body.appendChild(parentDiv);

      let xpathResult;
      
      xpathResult = generators.getElementTreeXPath(childDiv1);
      expect(xpathResult).to.be.equal('/html/body/div/div[1]', 'Can\'t find nested div appropriately.');

      xpathResult = generators.getElementTreeXPath(childDiv2);
      expect(xpathResult).to.be.equal('/html/body/div/div[2]', 'Can\'t find nested div appropriately.');

      xpathResult = generators.getElementTreeXPath(parentDiv);
      expect(xpathResult).to.be.equal('/html/body/div', 'Can\'t find non-leaf div appropriately.');

      xpathResult = generators.getElementTreeXPath(document.body);
      expect(xpathResult).to.be.equal('/html/body', 'Can\'t find body appropriately.');
    });

    it('should support returning XPath as a tree', () => {
      const document = newDocument();

      const parentDiv = document.createElement('div');
      const childDiv1 = document.createElement('div');
      const childDiv2 = document.createElement('div');
      childDiv2.class = 'test';

      parentDiv.appendChild(childDiv1);
      parentDiv.appendChild(childDiv2);
      document.body.appendChild(parentDiv);

      let xpathResult;
      
      xpathResult = generators.getElementTreeXPath(childDiv1, false);
      expect(xpathResult).to.have.length(4);
      expect(xpathResult[0].tag).to.be.equal('html');

    });
  });
  describe('getElementAttributes', () => {
    it('should be able to get a single attribute from an element', () => {
        const document = newDocument();
        const childDiv2 = document.createElement('div');
        childDiv2.align = 'center';

        const attributes = generators.getElementAttributes(childDiv2);
        expect(attributes).to.have.property('align', 'center');
    });

    it('should work in the no attribute case', () => {
        const document = newDocument();
        const div = document.createElement('div');

        const attributes = generators.getElementAttributes(div);
        expect(attributes).to.be.empty;
    });
  });
  describe('getElementXPath', () => {
      it('should work in simple DOM case', () => {
      const document = newDocument();

      const parentDiv = document.createElement('div');
      const childDiv1 = document.createElement('div');
      const childDiv2 = document.createElement('div');
      childDiv2.class = 'test';
      childDiv2.id = 'identifier';

      parentDiv.appendChild(childDiv1);
      parentDiv.appendChild(childDiv2);
      document.body.appendChild(parentDiv);

      let xpathResult;
      
      xpathResult = generators.getElementXPath(childDiv2);
      expect(xpathResult).to.be.equal('//*[@id="identifier"]', 'Expected straight ID lookup.');

      xpathResult = generators.getElementXPath(childDiv2, true);
      expect(xpathResult).to.be.equal('/html/body/div/div[2]', 'Expected non-ID lookup.');
    });

  });

});
