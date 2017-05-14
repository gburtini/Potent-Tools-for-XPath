const expect = require('chai').expect;
const cssToXPath = require('../src/cssToXPath');

describe('cssToXPath', () => {
  it('should be able to convert simple rule', () => {
    expect(cssToXPath('body')).to.be.equal('//body');
  });
  it('should be able to convert simple class rule', () => {
    expect(cssToXPath('.class')).to.be.equal(
      "//*[contains(concat(' ',normalize-space(@class),' '), ' class ')]"
    );
  });
  it('should be able to convert simple ID rule', () => {
    expect(cssToXPath('#id')).to.be.equal("//*[@id='id']");
  });
  it('should be able to convert html > body', () => {
    expect(cssToXPath('html > body')).to.be.equal('//html/body');
  });
  it('should be able to convert html + body', () => {
    expect(cssToXPath('html + body')).to.be.equal(
      '//html/following-sibling::body'
    );
  });
  it('should be able to convert html body', () => {
    expect(cssToXPath('html body')).to.be.equal('//html//body');
  });
  it('should not be sensitive to spacing', () => {
    expect(cssToXPath('html>body')).to.be.equal('//html/body');
  });
  it('should be able to mix rules', () => {
    expect(cssToXPath('html>body.funny')).to.be.equal(
      "//html/body[contains(concat(' ',normalize-space(@class),' '), ' funny ')]"
    );
  });
  it('should support comma options', () => {
    expect(cssToXPath('html, body')).to.be.equal('//html | //body');
  });
  it('should boolean attribute selectors', () => {
    expect(cssToXPath('html[doctype]')).to.be.equal('//html[@doctype]');
  });
  it('should equality attribute selectors', () => {
    expect(cssToXPath('html[doctype="test"]')).to.be.equal(
      "//html[@doctype='test']"
    );
  });
  it('should contains attribute selectors', () => {
    expect(cssToXPath('html[doctype~="test"]')).to.be.equal(
      "//html[contains(@doctype, 'test')]"
    );
  });
  it('should ignore pseudoselectors', () => {
    expect(cssToXPath('html:visited')).to.be.equal('//html');
  });
});
