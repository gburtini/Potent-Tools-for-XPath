Xpath.getElementsBySelector = function(doc, css)
{
    var xpath = Xpath.cssToXPath(css);
    return Xpath.getElementsByXPath(doc, xpath);
};

Xpath.getElementsByXPath = function(doc, xpath)
{
    try
    {
        return Xpath.evaluateXPath(doc, xpath);
    }
    catch(ex)
    {
        return [];
    }
};

/**
 * Evaluates an XPath expression.
 *
 * @param {Document} doc
 * @param {String} xpath The XPath expression.
 * @param {Node} contextNode The context node.
 * @param {int} resultType
 *
 * @returns {*} The result of the XPath expression, depending on resultType :<br> <ul>
 *          <li>if it is XPathResult.NUMBER_TYPE, then it returns a Number</li>
 *          <li>if it is XPathResult.STRING_TYPE, then it returns a String</li>
 *          <li>if it is XPathResult.BOOLEAN_TYPE, then it returns a boolean</li>
 *          <li>if it is XPathResult.UNORDERED_NODE_ITERATOR_TYPE
 *              or XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, then it returns an array of nodes</li>
 *          <li>if it is XPathResult.ORDERED_NODE_SNAPSHOT_TYPE
 *              or XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, then it returns an array of nodes</li>
 *          <li>if it is XPathResult.ANY_UNORDERED_NODE_TYPE
 *              or XPathResult.FIRST_ORDERED_NODE_TYPE, then it returns a single node</li>
 *          </ul>
 */
Xpath.evaluateXPath = function(doc, xpath, contextNode, resultType)
{
    if (contextNode === undefined)
        contextNode = doc;

    if (resultType === undefined)
        resultType = XPathResult.ANY_TYPE;

    var result = doc.evaluate(xpath, contextNode, null, resultType, null);

    switch (result.resultType)
    {
        case XPathResult.NUMBER_TYPE:
            return result.numberValue;

        case XPathResult.STRING_TYPE:
            return result.stringValue;

        case XPathResult.BOOLEAN_TYPE:
            return result.booleanValue;

        case XPathResult.UNORDERED_NODE_ITERATOR_TYPE:
        case XPathResult.ORDERED_NODE_ITERATOR_TYPE:
            var nodes = [];
            for (var item = result.iterateNext(); item; item = result.iterateNext())
                nodes.push(item);
            return nodes;

        case XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE:
        case XPathResult.ORDERED_NODE_SNAPSHOT_TYPE:
            var nodes = [];
            for (var i = 0; i < result.snapshotLength; ++i)
                nodes.push(result.snapshotItem(i));
            return nodes;

        case XPathResult.ANY_UNORDERED_NODE_TYPE:
        case XPathResult.FIRST_ORDERED_NODE_TYPE:
            return result.singleNodeValue;
    }
};

Xpath.getRuleMatchingElements = function(rule, doc)
{
    var css = rule.selectorText;
    var xpath = Xpath.cssToXPath(css);
    return Xpath.getElementsByXPath(doc, xpath);
};

