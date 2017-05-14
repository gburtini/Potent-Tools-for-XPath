const expect = require('chai').expect;
const jsdom = require('jsdom');
const evaluators = require('../src/evaluators');
const { XPathResult } = require('xpath');
function newDocument() {
  const options = {};
  const doc = jsdom.jsdom(null, options);
  doc.parent = doc.defaultView;
  return doc;
}

const document = newDocument();
const div = document.createElement('div');

const parentDiv = document.createElement('div');
const childDiv1 = document.createElement('div');
const childDiv2 = document.createElement('div');
childDiv1.innerHTML = 'Hello world.';
childDiv1.className = 'test';
childDiv2.id = 'test';

parentDiv.appendChild(childDiv1);
parentDiv.appendChild(childDiv2);
document.body.appendChild(parentDiv);

describe('evaluators', () => {
  describe('evaluateXPath', () => {
    it('should return STRING_TYPE from a simple DOM query.', () => {
      const xpath = evaluators.evaluateXPath(
        document,
        '/html/body/div/div[1]',
        document,
        XPathResult.STRING_TYPE
      );
      expect(xpath).to.be.equal(
        'Hello world.',
        'Expected inner string to be returned'
      );
    });

    it('should return Node from a simple DOM query.', () => {
      const xpath = evaluators.evaluateXPath(
        document,
        '/html/body/div/div[1]',
        document
      );
      expect(xpath).to.be.deep.equal(
        [childDiv1],
        'Expected array of matching elements to be returned'
      );
    });
  });

  describe('getElementsBySelector', () => {
    it('should support a similar lookup by CSS rule', () => {
      const result = evaluators.getElementsBySelector(document, '.test');
      expect(result).to.have.length(1);
      expect(result[0].className).to.be.eq('test');
    });
  });

  describe('getElementsByXPath', () => {
    it('should support a similar lookup by XPath rule', () => {
      const result = evaluators.getElementsByXPath(document, '//*[@id="test"]');
      expect(result).to.have.length(1);
      expect(result[0].id).to.be.eq('test');
    });
    it('should work in the no results case', () => {
      const result = evaluators.getElementsByXPath(document, '//*[@id="abc"]');
      expect(result).to.have.length(0);
    });
    it('should work in the invalid selector', () => {
      const result = evaluators.getElementsByXPath(document, '/1!@*#');
      expect(result).to.have.length(0);
    });
  });

  describe('getRuleMatchingElements', () => {
    it('should support a similar lookup by CSS rule', () => {
      // NOTE: opposite parameter order originates in Mozilla code.
      const result = evaluators.getRuleMatchingElements(
        { selectorText: '.test' },
        document
      );
      expect(result).to.have.length(1);
      expect(result[0].className).to.be.eq('test');
    });
  });
});
