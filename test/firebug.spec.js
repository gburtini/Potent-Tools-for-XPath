const expect = require('chai').expect;
const jsdom = require('jsdom');
const generators = require('../src/generators');

function newDocument() {
  const options = {};
  const doc = jsdom.jsdom(null, options);
  doc.parent = doc.defaultView;
  return doc;
}

describe('Original Firebug tests', () => {
  it('should be able to generate an XPath for a simple DOM structure', () => {
    const document = newDocument();
    const div = document.createElement('div');

    const parentDiv = document.createElement('div');
    const childDiv1 = document.createElement('div');
    const childDiv2 = document.createElement('div');

    parentDiv.appendChild(childDiv1);
    parentDiv.appendChild(childDiv2);
    document.body.appendChild(parentDiv);

    const xpath = generators.getElementTreeXPath(childDiv1);
    expect(xpath).to.be.equal('/html/body/div/div[1]', 'Incorrect XPath');
  })
});
