(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory();
	else if(typeof define === 'function' && define.amd)
		define("potentTools", [], factory);
	else if(typeof exports === 'object')
		exports["potentTools"] = factory();
	else
		root["potentTools"] = factory();
})(this, function() {
return /******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// identity function for calling harmony imports with the correct context
/******/ 	__webpack_require__.i = function(value) { return value; };
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, {
/******/ 				configurable: false,
/******/ 				enumerable: true,
/******/ 				get: getter
/******/ 			});
/******/ 		}
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 7);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, exports, __webpack_require__) {

const { splitAttributes } = __webpack_require__(10);
const xPathParser = __webpack_require__(3);

function attributesToXPath(attributes) {
  let ret = '';
  const processedAttributes = splitAttributes(attributes);

  Object.keys(processedAttributes).forEach((i) => {
    const attribute = processedAttributes[i];

    if (Array.isArray(attribute)) {
      // TODO: this still seems wrong as it isn't clear if we're anding or oring.
      ret += attribute
        .map(
          a => `[contains(concat(' ', normalize-space(@${i}), ' '), ' ${a} ')]`
        )
        .join('');
    } else {
      ret += `[@${i}='${attribute}']`;
    }
  });

  return ret;
}

function indexToXPath(index, forceOutput = false) {
  if ((!index || index === 1) && !forceOutput) return '';
  return `[${index}]`;
}

class XPathNode {
  constructor(obj) {
    this.data = {};
    this.data.index = obj.index;
    this.data.attributes = Object.assign({}, obj.attributes);
    this.data.tag = obj.tag;
    this.data.elements = obj.elements; // TODO: copy?
    this.meta = Object.assign({}, obj.meta);
  }

  get index() {
    return this.data.index;
  }

  get attributes() {
    return this.data.attributes;
  }

  get tag() {
    return this.data.tag;
  }

  get elements() {
    return this.data.elements;
  }

  static fromString(row) {
    // TODO: maybe the way to do this elegantly is to push it back on the generator code. Instead of allowing fromString, only allow fromDom.
    // I think for now, we don't need to worry about it. This method isn't exposed yet and thus doesn't affect any users of the package.

    const trialParsed = xPathParser.parse(row).steps;
    if (trialParsed.length !== 1) {
      throw new Error(
        `XPathNode initialized with something that appears to be ${trialParsed.length} XPath nodes. Expected 1.`
      );
    }
    const parsed = trialParsed[0];

    function extractAttributesFromSelector(field) {
      return field.predicates.reduce(
        (accumulator, predicate) => {
          let valueMap;
          try {
            if (predicate.steps) {
              valueMap = predicate.steps
                .filter(i => i.axis === 'attribute')
                .reduce(
                  (acc, i) => {
                    return Object.assign({}, acc, { [i.name]: true });
                  },
                  {}
                );
            } else if (predicate.type && predicate.type === '==') {
              valueMap = {
                [predicate.left.steps[0].name]: predicate.right.value,
              };
            } else if (predicate.id && predicate.id === 'contains') {
              // NOTE: these are weird special cases to handle the only forms we generate.
              // a more general solution is welcome.

              const key = predicate.args[0].args[1].args[0].steps[0].name;
              const value = predicate.args[1].value.trim();
              valueMap = { [key]: [value] };
            }

            // TODO: there's an else case here we should probably error in.
          } catch (e) {
            throw new Error(
              "XPathNode::fromString is only partially implemented. We can't parse this XPath. Submit a pull request!"
            );
          }

          return Object.assign({}, accumulator, valueMap);
        },
        {}
      );
    }

    function extractIndexFromSelector(selector) {
      const indexSelector = /\[([0-9]*)\]/.exec(selector);
      if (!indexSelector) return undefined;
      return parseInt(indexSelector[1], 10);
    }

    return new XPathNode({
      index: extractIndexFromSelector(row),
      attributes: extractAttributesFromSelector(parsed),
      tag: /^[a-zA-Z]*/.exec(row)[0],
    });
  }

  toString() {
    const indexString = indexToXPath(
      this.data.index,
      this.meta.hasFollowingSiblings
    );

    const attributesString = this.data.attributes
      ? attributesToXPath(this.data.attributes)
      : '';

    // TODO: how to know if we should drop the attributes string?
    return this.tag +
      indexString +
      (this.meta.hasFollowingSiblings !== false ? attributesString : '');
  }
}

module.exports = XPathNode;


/***/ }),
/* 1 */
/***/ (function(module, exports, __webpack_require__) {

module.exports = __webpack_require__(8);


/***/ }),
/* 2 */
/***/ (function(module, exports, __webpack_require__) {

const XPathNode = __webpack_require__(0);
const xPathParser = __webpack_require__(3);

class XPathQuery {
  constructor(nodes = []) {
    // TODO: support XPathNode construction here.
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
    return new XPathQuery(
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

module.exports = XPathQuery;


/***/ }),
/* 3 */
/***/ (function(module, exports, __webpack_require__) {

var require;var require;(function(f){if(true){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.xpath = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return require(o,!0);if(i)return require(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
// Scheme numerical tower in JavaScript.  Described in README.
// Copyright (c) 2011 by John Tobey <John.Tobey@gmail.com>

/*
    File: schemeNumber.js

    Exports:

        <SchemeNumber>

    Depends:

        <biginteger.js> for <BigInteger>
 */

// Grab the BigInteger library.
var BigInteger;
if (!this.BigInteger && typeof require !== "undefined")
    BigInteger = require("biginteger").BigInteger;
else
    BigInteger = this.BigInteger;

if (!BigInteger) {
    if (typeof load !== "undefined")
        load("biginteger.js");
    else if (this.readFile)
        eval(this.readFile("biginteger.js"));
    else
        throw new Error("BigInteger is not defined.");
}

/*
    Class: SchemeNumber
    A number object as <defined by the Scheme language at
    http://www.r6rs.org/>.

    Scheme supports *exact* arithmetic and mixing exact with standard
    (*inexact*) numbers.  Several basic operations, including
    addition, subtraction, multiplication, and division, when given
    only exact arguments, must return an exact, numerically correct
    result.

    These operations are allowed to fail due to running out of memory,
    but they are not allowed to return approximations the way
    ECMAScript operators may, unless given one or more inexact
    arguments.

    For example, adding exact *1/100* to exact *0* one hundred times
    produces exactly *1*, not 1.0000000000000007 as in JavaScript.
    Raising exact *2* to the power of exact *1024* returns a 308-digit
    integer with complete precision, not *Infinity* as in ECMAScript.

    This implementation provides all functions listed in the <R6RS
    Scheme specification at http://www.r6rs.org/>, Section 11.7, along
    with <eqv?> from Section 11.5.  (<eqv?> uses JavaScript's *===* to
    compare non-numbers.)

    Exact numbers support the standard ECMA Number formatting methods
    (toFixed, toExponential, and toPrecision) without a fixed upper
    limit to precision.

    The schemeNumber.js file exports an object <SchemeNumber>.  It
    contains a property <fn>, which in turn contains the functions
    implementing the numeric types.

    The <SchemeNumber> object is in fact a function that converts its
    argument to a Scheme number: similar to a constructor, but it may
    not always return an object, let alone a unique object.

    Parameters:

        obj - Object to be converted to a Scheme number.

    *obj* may have any of the following
    types:

        Scheme number - returned unchanged.
        String        - converted as if by *string->number*.
        Native ECMAScript number - treated as an inexact real.

    Returns:

        A Scheme number.

    Exceptions:

        If *obj* can not be parsed, <SchemeNumber> will <raise> an
        exception with condition type *&assertion*.

    See Also:

        <fn>, <raise>, <R6RS Chapter 3: Numbers at http://www.r6rs.org/final/html/r6rs/r6rs-Z-H-6.html#node_chap_3>
*/
var SchemeNumber = (function() {

function assert(x) { if (!x) throw new Error("assertion failed"); }

var abs      = Math.abs;
var floor    = Math.floor;
var ceil     = Math.ceil;
var round    = Math.round;
var pow      = Math.pow;
var sqrt     = Math.sqrt;
var atan2    = Math.atan2;
var log      = Math.log;
var exp      = Math.exp;
var atan     = Math.atan;
var cos      = Math.cos;
var sin      = Math.sin;
var tan      = Math.tan;
var LN2      = Math.LN2;
var LN10     = Math.LN10;
var _isFinite = isFinite;
var _isNaN    = isNaN;
var _parseInt = parseInt;
var _parseFloat = parseFloat;

function retFalse()   { return false; }
function retTrue()    { return true;  }
function retFirst(a)  { return a; }
function retThis()    { return this; }

function unimpl() {
    throw new Error("BUG: unimplemented");
}
function pureVirtual() {
    throw new Error("BUG: Abstract method not overridden");
}

function N() {}   N.prototype = new Number();  // Scheme numbers.
function C() {}   C.prototype = new N();       // Complex numbers.
function R() {}   R.prototype = new C();       // Reals.
function ER() {} ER.prototype = new R();       // Exact reals.
function EQ() {} EQ.prototype = new ER();      // Exact rationals.
function EI() {} EI.prototype = new EQ();      // Exact integers.

// How to split a rectangular literal into real and imaginary components:
var decimalComplex = /^(.*[^a-zA-Z]|)([-+].*)i$/;
var radixComplex = /^(.*)([-+].*)i$/;

var nanInfPattern = /^[-+](nan|inf)\.0$/;
var exponentMarkerPattern = /[eEsSfFdDlL]/;
var decimal10Pattern = /^([0-9]+\.?|[0-9]*\.[0-9]+)([eEsSfFdDlL][-+]?[0-9]+)?$/;

var uintegerPattern = {
    2: /^[01]+$/, 8: /^[0-7]+$/, 10: /^[0-9]+$/, 16: /^[0-9a-fA-F]+$/
};

function retZero()    { return ZERO; }
function retOne()     { return ONE; }

function divisionByExactZero() {
    raise("&assertion", "division by exact zero");
}

// Is the Flonum class simply the native Number?  In that case we will
// add methods to Number.prototype.

var Flonum;

// Users who wish to optimize the library by stripping support for
// Number.prototype cleanliness may simply replace "toFlonum("
// globally with "(" and change false to true here.

if (false) {  // XXX Should expose a way to choose this branch.
    // Flonum is Number.
    Flonum = Number;
}
else {
    // Flonum is a regular class in the hierarchy.
    Flonum = function(x) {
        this._ = x;
    };
}

var toFlonum, isNumber;
var flo = {};
var FLO_FUNCS = [[],
                 ["log", "floor", "ceil", "sqrt", "abs", "atan",
                  "cos", "sin", "tan", "exp"],
                 ["pow", "atan2"]];

if (Flonum === Number) {
    toFlonum = retFirst;

    isNumber = function(x) {
        return x instanceof Number || typeof x === "number";
    };
    FLO_FUNCS[1].concat(FLO_FUNCS[2]).forEach(function(name) {
            flo[name] = Math[name];
        });
}
else {
    Flonum.prototype = new R();

    (function() {
        var inexactZero = new Flonum(0);
        toFlonum = function(x) {
            //assert(typeof x === "number");
            return (x === 0 ? inexactZero : new Flonum(x));
        };
    })();

    isNumber = function(x) {
        return x instanceof N;
    };
    FLO_FUNCS[1].forEach(function(name) {
            var math = Math[name];
            flo[name] = function(a) {
                return toFlonum(math(a));
            };
        });
    FLO_FUNCS[2].forEach(function(name) {
            var math = Math[name];
            flo[name] = function(a, b) {
                return toFlonum(math(a, b));
            };
        });
    ["toFixed", "toExponential", "toPrecision"].forEach(function(name) {
            var number = Number.prototype[name];
            Flonum.prototype[name] = function(a) {
                return number.call(this._, a);
            };
        });
    Flonum.prototype.valueOf = function() {
        return this._;
    };
}

/* Internal class hierarchy:

   Number
     ^
     N
     ^
     C  <----  Rectangular
                   |
                   `--  R  <----  Flonum[1]
                             |
                             `--  ER  <---  EQ  <----  EQFraction
                                                  |
                                                  `--  EI  <----  EINative
                                                             |
                                                             `--  EIBig

   [1] In some configurations, the Flonum class actually equals Number
   for reasons of efficiency.  Logically, Flonum should be a direct
   subclass of R.  Initialization code populates missing slots in
   Flonum.prototype as if that were the case.

   The concrete classes are:

   Flonum      - inexact real as a native number, possibly NaN or infinite.
   Rectangular - complex number as real and imaginary parts of same exactness.
   EQFraction  - exact rational as numerator and denominator in lowest terms.
   EINative    - exact integer as (wrapped) native number.
   EIBig       - exact integer as BigInteger.

   The abstract C, R, ER, EQ, and EI classes hold information about
   the respective number types (complex, real, exact real, exact
   rational, and exact integer) and stimulate thought about new
   concrete classes.

   Possible future classes:
   C <-- Polar - possibly exact complex number in polar coordinates;
   EQ <-- EQNative - exact rational as native number (power-of-2 denominator);
   EQ <-- EQDecimal - exact rational as BigInteger times a power of 10;
   R <-- BigFloat - inexact real of non-standard precision.
*/

// SN: private alias for the public SchemeNumber object.
function SN(obj) {
    if (obj instanceof N) {
        return obj;
    }

    var ret = obj;

    if (typeof ret !== "string") {
        if (typeof ret === "number") {
            return toFlonum(ret);
        }
        if (ret instanceof Number) {
            return toFlonum(+ret);
        }

        if (ret == null) {
            // XXX Rethink this.
            return (ret === null ? INEXACT_ZERO : NAN);
        }

        ret = ret.valueOf();
        if (typeof ret === "number") {
            return toFlonum(ret);
        }
        ret = String(ret);
    }
    ret = stringToNumber(ret);
    if (ret === false) {
        raise("&assertion", "not a number", obj);
    }
    return ret;
}
// For NaturalDocs:
var SchemeNumber = SN;

/*
    Property: VERSION
    Library version as an array of integers.

    For example, *[1,2,4]* corresponds to Version 1.2.4.
*/
SchemeNumber.VERSION = [1,1,4];

var floPow   = flo.pow;
var floLog   = flo.log;
var floFloor = flo.floor;
var floCeil  = flo.ceil;
var floSqrt  = flo.sqrt;
var floAtan2 = flo.atan2;
var floAbs   = flo.abs;
var floAtan  = flo.atan;
var floCos   = flo.cos;
var floSin   = flo.sin;
var floTan   = flo.tan;
var floExp   = flo.exp;

var HIERARCHY = {
    C: ["Rectangular", "R"],
    R: ["Flonum", "ER"],
    ER: ["EQ"],
    EQ: ["EQFraction", "EI"],
    EI: ["EINative", "EIBig"]
};

var CLASSES = {
    C:C, R:R, ER:ER, EQ:EQ, EI:EI,
    Rectangular:Rectangular, Flonum:Flonum,
    EQFraction:EQFraction, EINative:EINative, EIBig:EIBig
};

var DISP = {};
for (var className in CLASSES) {
    DISP[className] = {};  // Contents will go into class prototype.
}

//
// Input functions.
//

var PARSE_ERROR = new Object();

// Scheme number syntaxes, e.g. #e1.1@-2d19, 2/3
function stringToNumber(s, radix, exact) {
    function lose() {
        throw PARSE_ERROR;
    }
    function setExact(value) {
        if (exact !== undefined) lose();
        exact = value;
    }
    function setRadix(value) {
        if (radix) lose();
        radix = value;
    }
    function parseUinteger(s, sign) {
        if (!uintegerPattern[radix].test(s))
            lose();

        if (exact === false)
            return toFlonum(sign * _parseInt(s, radix));

        return parseEI(sign, s, radix);
    }
    function parseReal(s) {
        if (nanInfPattern.test(s)) {
            if (exact)
                lose();
            switch (s) {
            case "+inf.0": return INFINITY;
            case "-inf.0": return M_INFINITY;
            default: return NAN;
            }
        }

        var sign = 1;
        switch (s[0]) {
        case '-': sign = -1;  // fall through
        case '+': s = s.substring(1);
        }

        var slash = s.indexOf('/');
        if (slash != -1)
            return parseUinteger(s.substring(0, slash), sign)
                .SN_divide(parseUinteger(s.substring(slash + 1), 1));

        if (radix !== 10)
            lose();

        var pipe = s.indexOf('|');
        if (pipe !== -1) {

            // WHOA!!!  Explicit mantissa width!  Somebody really
            // cares about correctness.  However, I haven't got all
            // day, so execution speed loses.

            var afterPipe = s.substring(pipe + 1);
            if (!uintegerPattern[10].test(afterPipe))
                lose();

            s = s.substring(0, pipe);
            var precision = _parseInt(afterPipe);

            if (precision === 0)
                s = "0.0";
            else if (precision < 53)
                return parseWithWidth(s, precision, exact);
        }

        // We have only one floating point width.
        s = s.replace(exponentMarkerPattern, 'e');

        var dot = s.indexOf('.');
        var e = s.indexOf('e');
        if (dot === -1 && e === -1)
            return parseUinteger(s, sign);

        if (!decimal10Pattern.test(s))
            lose();

        if (!exact)
            return toFlonum(sign * _parseFloat(s));

        var integer = s.substring(0, dot === -1 ? e : dot);
        var exponent = 0;
        var fraction;

        if (e === -1)
            fraction = s.substring(dot + 1);
        else {
            if (dot === -1)
                fraction = "";
            else
                fraction = s.substring(dot + 1, e);
            exponent = _parseInt(s.substring(e + 1));
        }

        return parseDecimal(sign, integer + fraction,
                            exponent - fraction.length);
    }
    function parseComplex(s) {
        var a = s.indexOf('@');
        if (a !== -1) {
            var ret = makePolar(parseReal(s.substring(0, a)),
                                parseReal(s.substring(a + 1)));
            if (exact && ret.SN_isInexact())
                ret = ret.SN_toExact();  // XXX is this right?
            return ret;
        }

        if (s[s.length - 1] !== "i")
            return parseReal(s);

        if (s === "i") {
            if (exact === false)
                return inexactRectangular(INEXACT_ZERO, toFlonum(1));
            return I;
        }
        if (s === "-i") {
            if (exact === false)
                return inexactRectangular(INEXACT_ZERO, toFlonum(-1));
            return M_I;
        }

        var match = (radix === 10 ? decimalComplex : radixComplex).exec(s);
        var x, y;
        if (match) {
            x = match[1];
            y = match[2];
            x = (x ? parseReal(x) : (exact === false ? INEXACT_ZERO : ZERO));
            y = (y === "+" ? ONE : (y === "-" ? M_ONE : parseReal(y)));
        }
        else {
            // Could be "3i" for example.
            x = (exact === false ? INEXACT_ZERO : ZERO);
            y = parseReal(s.substring(0, s.length - 1));
        }

        return makeRectangular(x, y);
    }

    // Parse a real that had a |p attached.
    // See the second half of R6RS Section 4.2.8 and also
    // http://www.mail-archive.com/r6rs-discuss@lists.r6rs.org/msg01676.html.
    function parseWithWidth(s, precision) {

        // First, parse it as exact.
        var x = stringToNumber(s, radix, true);
        if (x === false || !x.SN_isReal())
            lose();

        if (!x.SN_isZero()) {
            var xabs = x.SN_abs();

            var shift = precision - floor(xabs.SN_log() / LN2) - 1;
            var scale = TWO.SN_expt(toEINative(abs(shift)));
            if (shift < 0)
                scale = scale.SN_reciprocal();
            var shifted = xabs.SN_multiply(scale);

            // Correct for log() imprecision.
            var denom = TWO.SN_expt(toEINative(precision));
            while (shifted.SN_ge(denom)) {
                shifted = shifted.SN_divide(TWO);
                scale = scale.SN_divide(TWO);
            }
            for (var twiceShifted = shifted.SN_add(shifted);
                 twiceShifted.SN_lt(denom);
                 twiceShifted = shifted.SN_add(shifted)) {
                shifted = twiceShifted;
                scale = scale.SN_add(scale);
            }

            // 0.5 <= shifted/denom < 1.
            var rounded = shifted.SN_round().SN_divide(scale);
            if (x.SN_isNegative())
                rounded = rounded.SN_negate();
            x = rounded;
        }

        // Then make it inexact unless there is #e.
        if (!exact)
            x = x.SN_toInexact();

        return x;
    }

    // Common cases first.
    if (!radix || radix == 10) {
        if (/^-?[0-9]{1,15}$/.test(s)) {
            if (exact === false)
                return toFlonum(_parseInt(s));
            return toEINative(_parseInt(s));
        }
        radix = 10;
    }

    var i = 0;

    try {
        while (s[i] === "#") {
            switch (s[i+1]) {
            case 'i': case 'I': setExact(false); break;
            case 'e': case 'E': setExact(true ); break;
            case 'b': case 'B': setRadix( 2); break;
            case 'o': case 'O': setRadix( 8); break;
            case 'd': case 'D': setRadix(10); break;
            case 'x': case 'X': setRadix(16); break;
            default: return false;
            }
            i += 2;
        }
        return parseComplex(s.substring(i));
    }
    catch (e) {
        if (e === PARSE_ERROR)
            return false;
        if (s == undefined)
            raise("&assertion", "missing argument");
        throw e;
    }
}

function makeRectangular(x, y) {
    if (x.SN_isExact() && y.SN_isExact())
        return exactRectangular(x, y);
    return inexactRectangular(x.SN_toInexact(), y.SN_toInexact());
}

function makePolar(r, theta) {
    return inexactRectangular(r.SN_multiply(theta.SN_cos()),
                              r.SN_multiply(theta.SN_sin()));
}

function assertReal(x) {
    if (!x.SN_isReal())
        raise("&assertion", "not a real number", x);
    return x;
}

function toReal(x) {
    x = SN(x);
    x.SN_isReal() || assertReal(x);
    return x;
}

function assertInteger(n) {
    n = SN(n);
    if (!n.SN_isInteger())
        raise("&assertion", "not an integer", n);
    return n;
}

function toInteger(n) {
    n = SN(n);
    n.SN_isInteger() || assertInteger(n);
    return n;
}

function assertRational(q) {
    if (!q.SN_isRational())
        raise("&assertion", "not a rational number", q);
    return q;
}

function assertNonNegative(n) {
    if (n.SN_isNegative())
        raise("&assertion", "negative number", n);
    return n;
}

function assertExact(z) {
    if (z.SN_isInexact())
        raise("&assertion", "inexact number", z);
    return z;
}

/*
    Property: raise
    Function that translates a Scheme exception to ECMAScript.

    When a library function encounters a situation where the Scheme
    specification requires it to raise an exception with a certain
    condition type, the function calls <SchemeNumber.raise>.

    Programs may assign a custom function to <SchemeNumber.raise> to
    intercept such exceptions.

    Parameters:

        conditionType - The specified condition, for example, "&assertion".
        message       - A string describing the error.
        irritants...  - Zero or more erroneous data arguments.

    Returns:

        The default <SchemeNumber.raise> function simply throws an
        *Error*.

    See Also:

        <fn>, <SchemeNumber>
*/
SchemeNumber.raise = defaultRaise;

function defaultRaise(conditionType, message, irritant) {
    var msg = "SchemeNumber: " + conditionType + ": " + message;
    if (arguments.length > 2) {
        if (isNumber(irritant))
            irritant = irritant.SN_numberToString();
        msg += ": " + irritant;
    }
    throw new Error(msg);
}

function raise() {
    var len = arguments.length;
    var args = new Array(len);
    while (len--)
        args[len] = arguments[len];

    // Call the exception hook.
    SN.raise.apply(SN, args);

    // Oops, it returned.  Fall back to our known good raiser.
    defaultRaise.apply(this, args);
}

/*
    Property: maxIntegerDigits
    Maximum size of integers created by the <fn.expt(z1, z2)>
    function.

    To avoid using up all system memory, exact results of a call to
    <fn.expt(z1, z2)> are capped at a configurable number of digits,
    by default one million.  <SchemeNumber.maxIntegerDigits> holds
    this limit.

    The size limit does *not* currently protect against other means of
    creating large exact integers.  For example, when passed
    "#e1e9999999", the <SchemeNumber> function tries to allocate 10
    million digits, regardless of <maxIntegerDigits>.

    In a future release, cases such as the preceeding example may be
    checked.  If there is any possibility of legitimately creating
    such large integers, either as number objects or components
    thereof, code should increase <maxIntegerDigits>.

    Default Value:

        - 1000000 (1e6 or 1 million)
*/

// Configurable maximum integer magnitude.
SN.maxIntegerDigits = 1e6;  // 1 million digits.

/*
    Method: toString(radix)
    Converts this Scheme number to a string.

    The *toString* method converts inexact numbers as in JavaScript
    and exact numbers as if by <fn["number->string"](z, radix)>.

    Method: toFixed(fractionDigits)
    Returns this Scheme number as a string with *fractionDigits*
    digits after the decimal point.

    Examples:

    > SchemeNumber("#e1.2").toFixed(2)  // "1.20"
    > SchemeNumber("1/7").toFixed(24)   // "0.142857142857142857142857"

    Specified by: <ECMA-262, 5th edition at http://www.ecma-international.org/publications/standards/Ecma-262.htm>

    Method: toExponential(fractionDigits)
    Converts this Scheme number to scientific "e" notation with
    *fractionDigits* digits after the decimal point.

    Examples:

    > SchemeNumber("1/11").toExponential(3)  // "9.091e-2"
    > SchemeNumber("1/2").toExponential(2)   // "5.00e-1"

    Specified by: <ECMA-262, 5th edition at http://www.ecma-international.org/publications/standards/Ecma-262.htm>

    Method: toPrecision(precision)
    Converts this Scheme number to decimal (possibly "e" notation)
    with *precision* significant digits.

    Examples:

    > SchemeNumber("12300").toPrecision(2)  // "1.2e+4"
    > SchemeNumber("12300").toPrecision(4)  // "1.230e+4"
    > SchemeNumber("12300").toPrecision(5)  // "12300"
    > SchemeNumber("12300").toPrecision(6)  // "12300.0"

    Specified by: <ECMA-262, 5th edition at http://www.ecma-international.org/publications/standards/Ecma-262.htm>
 */

/*
    Property: fn
    Container of <Scheme functions>.

    The <SchemeNumber> object contains a property, <SchemeNumber.fn>,
    which in turn contains the functions implementing the Scheme
    numeric types.

    These functions are stored in <fn> under their Scheme names, so
    ["quotation"] is needed where the names contain characters that
    are incompatible with dot.notation.  (In JavaScript, *X.Y* and
    *X["Y"]* are equivalent expressions where Y is a valid identifier.
    Not all Scheme function names are valid JavaScript identifiers, so
    one needs the second syntax to extract them from <fn>.)

    You may find it convenient to copy <SchemeNumber>, <fn>, and the
    output function <number->string> into short-named variables, by
    convention *sn*, *fn*, and *ns*.  The rest of this section assumes
    you have done this:

    > var sn = SchemeNumber;
    > var fn = sn.fn;
    > var ns = fn["number->string"];

    Functions that require a Scheme number argument automatically
    filter the argument through <SchemeNumber>.

    For example, *"2"* (string) would be exact (parsed as Scheme) but
    *2* (equal to *2.0*) would be inexact, as demonstrated:

    > a1 = fn["exact?"]("2");       // a1 === true
    > a1 = fn["exact?"](sn("2"));   // same
    > 
    > a2 = fn["exact?"](2);         // a2 === false
    > a2 = fn["exact?"]("2.0");     // same
    > a2 = fn["exact?"](sn("2.0")); // same

    Note that the following functions accept arguments of any type and
    therefore do not apply <SchemeNumber> to their arguments:

    - <eqv?>
    - <number?>
    - <complex?>
    - <real?>
    - <rational?>
    - <integer?>
    - <real-valued?>
    - <rational-valued?>
    - <integer-valued?>

    Here, for example, is 2 to the 1,024th power, as a decimal
    string:

    > a3 = ns(fn.expt("2", "1024"));

    Fractional
    arithmetic:

    > a4 = fn["+"]("1/3", "4/5");  // 17/15

    Numerator and denominator of a floating-point value,
    hexadecimal:

    > a5 = ns(fn.numerator(1/3), "16");    // "#i15555555555555"
    > a6 = ns(fn.denominator(1/3), "16");  // "#i40000000000000"

    The *#i* prefix denotes an inexact number, as detailed in <R6RS at
    http://www.r6rs.org/>.  Since 1/3 is a native JavaScript number,
    the library regards it as inexact, and operations such as
    numerator yield inexact integer results.  If we used *"1/3"*
    (quoted) instead of *1/3*, the numerator and denominator would be
    the mathematically correct 1 and 3.

    Functions specified to return two values (such as <div-and-mod>
    and <exact-integer-sqrt>) return a two-element array as per
    JavaScript conventions.

    Caveats:

      o Arcane features such as explicit mantissa widths or complex
        transcendental functions, while believed complete, are
        unoptimized.

      o The library exhibits other visible behaviors besides those
        described herein.  However, they are not part of its public
        API and may change or disappear from one release to the next.

      o In particular, Scheme numbers' *toString* property sometimes
        produces output that is incorrect in the Scheme sense.  (This
        stems from the decision to represent inexact reals as
        unadorned native numbers.)

    To serialize numbers as Scheme would, use
    <SchemeNumber.fn["number->string"]>.

    > "" + SchemeNumber(2);                  // "2"
    > SchemeNumber.fn["number->string"](2);  // "2."

    To test a Scheme number for numerical equality with another Scheme
    number or a native value, use <fn["="]>.  Likewise for <fn[">"]>
    etc.

    See Also:

        <Scheme functions>
*/
SchemeNumber.fn = {

/*
    About: Function list

    All <Scheme functions> are specified by <R6RS at
    http://www.r6rs.org/>.  In the list below, argument names indicate
    applicable types as follows:

    obj - any value
    z - any Scheme number
    x - a real number
    y - a real number
    q - a rational number (excludes infinities and NaN)
    n - an integer
    k - an exact, non-negative integer
    radix - an exact integer, either 2, 8, 10, or 16
    precision - an exact, positive integer

    Functions: Scheme functions
    Elements of <fn>.

    Refer to the argument type key under <Function list>.

    fn["number?"](obj)   - Returns true if *obj* is a Scheme number.
    Specified by: <R6RS at http://www.r6rs.org/final/html/r6rs/r6rs-Z-H-14.html#node_idx_440>.

    fn["complex?"](obj)  - Returns true if *obj* is a Scheme complex number.
    Specified by: <R6RS at http://www.r6rs.org/final/html/r6rs/r6rs-Z-H-14.html#node_idx_442>.

    fn["real?"](obj)     - Returns true if *obj* is a Scheme real number.
    Specified by: <R6RS at http://www.r6rs.org/final/html/r6rs/r6rs-Z-H-14.html#node_idx_444>.

    fn["rational?"](obj) - Returns true if *obj* is a Scheme rational number.
    Specified by: <R6RS at http://www.r6rs.org/final/html/r6rs/r6rs-Z-H-14.html#node_idx_446>.

    fn["integer?"](obj)  - Returns true if *obj* is a Scheme integer.
    Specified by: <R6RS at http://www.r6rs.org/final/html/r6rs/r6rs-Z-H-14.html#node_idx_448>.

    fn["real-valued?"](obj) - Returns true if *obj* is a Scheme complex number
                              and *fn["imag-part"](obj)* is zero.
    Specified by: <R6RS at http://www.r6rs.org/final/html/r6rs/r6rs-Z-H-14.html#node_idx_450>.

    fn["rational-valued?"](obj) - Returns true if *obj* is real-valued and
                                  *fn["real-part"](obj)* is rational.
    Specified by: <R6RS at http://www.r6rs.org/final/html/r6rs/r6rs-Z-H-14.html#node_idx_452>.

    fn["integer-valued?"](obj)  - Returns true if *obj* is real-valued and
                                  *fn["real-part"](obj)* is an integer.
    Specified by: <R6RS at http://www.r6rs.org/final/html/r6rs/r6rs-Z-H-14.html#node_idx_454>.

    fn["exact?"](z)   - Returns true if *z* is exact.
    Specified by: <R6RS at http://www.r6rs.org/final/html/r6rs/r6rs-Z-H-14.html#node_idx_456>.

    fn["inexact?"](z) - Returns true if *z* is inexact.
    Specified by: <R6RS at http://www.r6rs.org/final/html/r6rs/r6rs-Z-H-14.html#node_idx_458>.

    fn.inexact(z) - Returns an inexact number equal to *z*.
    Specified by: <R6RS at http://www.r6rs.org/final/html/r6rs/r6rs-Z-H-14.html#node_idx_460>.

    fn.exact(z)   - Returns an exact number equal to *z*.
    Specified by: <R6RS at http://www.r6rs.org/final/html/r6rs/r6rs-Z-H-14.html#node_idx_462>.

    fn["eqv?"](obj1, obj2) - Returns true if *obj1 === obj2* or both arguments
                             are Scheme numbers and behave identically.
                             Specified by <R6RS at http://www.r6rs.org/final/html/r6rs/r6rs-Z-H-14.html#node_idx_428>.

    fn["="](z, z, z...) - Returns true if all arguments are mathematically
                          equal, though perhaps differing in exactness.
    Specified by: <R6RS at http://www.r6rs.org/final/html/r6rs/r6rs-Z-H-14.html#node_idx_464>.

    fn["<"](x, x, x...) - Returns true if arguments increase monotonically.
    Specified by: <R6RS at http://www.r6rs.org/final/html/r6rs/r6rs-Z-H-14.html#node_idx_466>.

    fn[">"](x, x, x...) - Returns true if arguments decrease monotonically.
    Specified by: <R6RS at http://www.r6rs.org/final/html/r6rs/r6rs-Z-H-14.html#node_idx_468>.

    fn["<="](x, x, x...) - Returns true if arguments are monotonically
                           nondecreasing.
    Specified by: <R6RS at http://www.r6rs.org/final/html/r6rs/r6rs-Z-H-14.html#node_idx_470>.

    fn[">="](x, x, x...) - Returns true if arguments are monotonically
                           nonincreasing.
    Specified by: <R6RS at http://www.r6rs.org/final/html/r6rs/r6rs-Z-H-14.html#node_idx_472>.

    fn["zero?"](z)      - Returns true if *z* equals zero.
    Specified by: <R6RS at http://www.r6rs.org/final/html/r6rs/r6rs-Z-H-14.html#node_idx_474>.

    fn["positive?"](x)  - Returns true if *x* is positive.
    Specified by: <R6RS at http://www.r6rs.org/final/html/r6rs/r6rs-Z-H-14.html#node_idx_476>.

    fn["negative?"](x)  - Returns true if *x* is negative.
    Specified by: <R6RS at http://www.r6rs.org/final/html/r6rs/r6rs-Z-H-14.html#node_idx_478>.

    fn["odd?"](n)       - Returns true if *n* is odd.
    Specified by: <R6RS at http://www.r6rs.org/final/html/r6rs/r6rs-Z-H-14.html#node_idx_480>.

    fn["even?"](n)      - Returns true if *n* is even.
    Specified by: <R6RS at http://www.r6rs.org/final/html/r6rs/r6rs-Z-H-14.html#node_idx_482>.

    fn["finite?"](x)    - Returns true if *x* is finite.
    Specified by: <R6RS at http://www.r6rs.org/final/html/r6rs/r6rs-Z-H-14.html#node_idx_484>.

    fn["infinite?"](x)  - Returns true if *x* is plus or minus infinity.
    Specified by: <R6RS at http://www.r6rs.org/final/html/r6rs/r6rs-Z-H-14.html#node_idx_486>.

    fn["nan?"](x)       - Returns true if *x* is a NaN.
    Specified by: <R6RS at http://www.r6rs.org/final/html/r6rs/r6rs-Z-H-14.html#node_idx_488>.

    fn.max(x, x...)     - Returns the greatest argument.
    Specified by: <R6RS at http://www.r6rs.org/final/html/r6rs/r6rs-Z-H-14.html#node_idx_490>.

    fn.min(x, x...)     - Returns the least argument.
    Specified by: <R6RS at http://www.r6rs.org/final/html/r6rs/r6rs-Z-H-14.html#node_idx_492>.

    fn["+"](z...)       - Returns the sum of the arguments.
    Specified by: <R6RS at http://www.r6rs.org/final/html/r6rs/r6rs-Z-H-14.html#node_idx_494>.

    fn["*"](z...)       - Returns the product of the arguments.
    Specified by: <R6RS at http://www.r6rs.org/final/html/r6rs/r6rs-Z-H-14.html#node_idx_496>.

    fn["-"](z)          - Returns the negation of *z* (-*z*).
    Specified by: <R6RS at http://www.r6rs.org/final/html/r6rs/r6rs-Z-H-14.html#node_idx_498>.

    fn["-"](z1, z2...)  - Returns *z1* minus the sum of the number(s) *z2*.
    Specified by: <R6RS at http://www.r6rs.org/final/html/r6rs/r6rs-Z-H-14.html#node_idx_500>.

    fn["/"](z)          - Returns the reciprocal of *z* (1 / *z*).
    Specified by: <R6RS at http://www.r6rs.org/final/html/r6rs/r6rs-Z-H-14.html#node_idx_502>.

    fn["/"](z1, z2...)  - Returns *z1* divided by the product of the number(s)
    *z2*.
    Specified by: <R6RS at http://www.r6rs.org/final/html/r6rs/r6rs-Z-H-14.html#node_idx_504>.

    fn.abs(x)           - Returns the absolute value of *x*.
    Specified by: <R6RS at http://www.r6rs.org/final/html/r6rs/r6rs-Z-H-14.html#node_idx_506>.

    fn["div-and-mod"](x, y) - Returns *fn.div(x, y)* and *fn.mod(x, y)*.
    Specified by: <R6RS at http://www.r6rs.org/final/html/r6rs/r6rs-Z-H-14.html#node_idx_508>.

    fn.div(x, y)        - Returns the greatest integer less than or equal to
                          *x* / *y*.
    Specified by: <R6RS at http://www.r6rs.org/final/html/r6rs/r6rs-Z-H-14.html#node_idx_510>.

    fn.mod(x, y)        - Returns *x* - (*y* * fn.div(*x*, *y*)).
    Specified by: <R6RS at http://www.r6rs.org/final/html/r6rs/r6rs-Z-H-14.html#node_idx_512>.

    fn["div0-and-mod0"](x, y) - Returns *fn.div0(x, y)* and *fn.mod0(x, y)*.
    Specified by: <R6RS at http://www.r6rs.org/final/html/r6rs/r6rs-Z-H-14.html#node_idx_514>.

    fn.div0(x, y)       - Returns the integer nearest *x* / *y*, ties go lower.
    Specified by: <R6RS at http://www.r6rs.org/final/html/r6rs/r6rs-Z-H-14.html#node_idx_516>.

    fn.mod0(x, y)       - Returns *x* - (*y* * fn.div0(*x*, *y*)).
    Specified by: <R6RS at http://www.r6rs.org/final/html/r6rs/r6rs-Z-H-14.html#node_idx_518>.

    fn.gcd(n...) - Returns the arguments' greatest common non-negative divisor.
    Specified by: <R6RS at http://www.r6rs.org/final/html/r6rs/r6rs-Z-H-14.html#node_idx_520>.

    fn.lcm(n...) - Returns the arguments' least common positive multiple.
    Specified by: <R6RS at http://www.r6rs.org/final/html/r6rs/r6rs-Z-H-14.html#node_idx_522>.

    fn.numerator(q)     - Returns *q* * *fn.denominator(q)*.
    Specified by: <R6RS at http://www.r6rs.org/final/html/r6rs/r6rs-Z-H-14.html#node_idx_524>.

    fn.denominator(q)   - Returns the smallest positive integer which when
                          multiplied by *q* yields an integer.
    Specified by: <R6RS at http://www.r6rs.org/final/html/r6rs/r6rs-Z-H-14.html#node_idx_526>.

    fn.floor(x)         - Returns the greatest integer not greater than *x*.
    Specified by: <R6RS at http://www.r6rs.org/final/html/r6rs/r6rs-Z-H-14.html#node_idx_528>.

    fn.ceiling(x)       - Returns the least integer not less than *x*.
    Specified by: <R6RS at http://www.r6rs.org/final/html/r6rs/r6rs-Z-H-14.html#node_idx_530>.

    fn.truncate(x)      - Returns the closest integer between 0 and *x*.
    Specified by: <R6RS at http://www.r6rs.org/final/html/r6rs/r6rs-Z-H-14.html#node_idx_532>.

    fn.round(x)         - Returns the closest integer to *x*, ties go even.
    Specified by: <R6RS at http://www.r6rs.org/final/html/r6rs/r6rs-Z-H-14.html#node_idx_534>.

    fn.rationalize(x, y) - Returns the simplest fraction within *y* of *x*.
    Specified by: <R6RS at http://www.r6rs.org/final/html/r6rs/r6rs-Z-H-14.html#node_idx_536>.

    fn.exp(z)           - Returns e to the *z*.
    Specified by: <R6RS at http://www.r6rs.org/final/html/r6rs/r6rs-Z-H-14.html#node_idx_540>.

    fn.log(z)           - Returns the natural logarithm of *z*.
    Specified by: <R6RS at http://www.r6rs.org/final/html/r6rs/r6rs-Z-H-14.html#node_idx_542>.

    fn.log(z1, z2)      - Returns the base-*z2* logarithm of *z1*.
    Specified by: <R6RS at http://www.r6rs.org/final/html/r6rs/r6rs-Z-H-14.html#node_idx_544>.

    fn.sin(z)           - Returns the sine of *z*.
    Specified by: <R6RS at http://www.r6rs.org/final/html/r6rs/r6rs-Z-H-14.html#node_idx_546>.

    fn.cos(z)           - Returns the cosine of *z*.
    Specified by: <R6RS at http://www.r6rs.org/final/html/r6rs/r6rs-Z-H-14.html#node_idx_548>.

    fn.tan(z)           - Returns the tangent of *z*.
    Specified by: <R6RS at http://www.r6rs.org/final/html/r6rs/r6rs-Z-H-14.html#node_idx_550>.

    fn.asin(z)          - Returns a number whose sine is *z*.
    Specified by: <R6RS at http://www.r6rs.org/final/html/r6rs/r6rs-Z-H-14.html#node_idx_552>.

    fn.acos(z)          - Returns a number whose cosine is *z*.
    Specified by: <R6RS at http://www.r6rs.org/final/html/r6rs/r6rs-Z-H-14.html#node_idx_554>.

    fn.atan(z)          - Returns a number whose tangent is *z*.
    Specified by: <R6RS at http://www.r6rs.org/final/html/r6rs/r6rs-Z-H-14.html#node_idx_556>.

    fn.atan(y, x)       - Returns the angle that passes through *(x,y)*.
    Specified by: <R6RS at http://www.r6rs.org/final/html/r6rs/r6rs-Z-H-14.html#node_idx_558>.

    fn.sqrt(z)          - Returns the square root of *z*.
    Specified by: <R6RS at http://www.r6rs.org/final/html/r6rs/r6rs-Z-H-14.html#node_idx_560>.

    fn["exact-integer-sqrt"](k) - Returns maximal exact s and non-negative r
                                  such that s*s + r = *k*.
    Specified by: <R6RS at http://www.r6rs.org/final/html/r6rs/r6rs-Z-H-14.html#node_idx_562>.

    fn.expt(z1, z2) - Returns *z1* to the power *z2*.
    Specified by: <R6RS at http://www.r6rs.org/final/html/r6rs/r6rs-Z-H-14.html#node_idx_564>.

    fn["make-rectangular"](x, y) - Returns the complex number *x + iy*.
    Specified by: <R6RS at http://www.r6rs.org/final/html/r6rs/r6rs-Z-H-14.html#node_idx_566>.

    fn["make-polar"](r, theta) - Returns the complex number with magnitude *r*
                                 and angle *theta*.
    Specified by: <R6RS at http://www.r6rs.org/final/html/r6rs/r6rs-Z-H-14.html#node_idx_568>.

    fn["real-part"](z) - Returns x such that *z* = x + iy.
    Specified by: <R6RS at http://www.r6rs.org/final/html/r6rs/r6rs-Z-H-14.html#node_idx_570>.

    fn["imag-part"](z) - Returns y such that *z* = x + iy.
    Specified by: <R6RS at http://www.r6rs.org/final/html/r6rs/r6rs-Z-H-14.html#node_idx_572>.

    fn.magnitude(z)    - Returns the magnitude of *z*.
    Specified by: <R6RS at http://www.r6rs.org/final/html/r6rs/r6rs-Z-H-14.html#node_idx_574>.

    fn.angle(z)        - Returns *fn.atan(y,x)* where *z* = x + iy.
    Specified by: <R6RS at http://www.r6rs.org/final/html/r6rs/r6rs-Z-H-14.html#node_idx_576>.

    Function: fn["number->string"](z)
    Converts *z* to a string, base 10.

    For exact *z*, *number->string* retains full precision.  Exact
    fractions are expressed as numerator + "/" + denominator.
    Examples:

    > fn["number->string"](fn["string->number"]("#e1.2"))  // "6/5"
    > fn["number->string"](fn["/"]("12", "-8"))            // "-3/2"

    Infinities are "+inf.0" and "-inf.0".  NaN is "+nan.0".

    The result always yields a number equal to *z* (in the sense of
    <fn["eqv?"](obj1, obj2)>) when passed to
    <fn["string->number"](string)>.

    Specified by: <R6RS at
    http://www.r6rs.org/final/html/r6rs/r6rs-Z-H-14.html#node_idx_578>

    See Also: <fn["string->number"](string)>.

    Function: fn["number->string"](z, radix)
    Converts *z* to a string, base *radix*.
    *radix* must be exact 2, 8, 10, or 16.

    The output never contains an explicit radix prefix.

    The result always yields a value equal to *z* (in the sense of
    <fn["eqv?"](obj1, obj2)>) when converted back to a number by
    <fn["string->number"](string, radix)>.

    Specified by: <R6RS at
    http://www.r6rs.org/final/html/r6rs/r6rs-Z-H-14.html#node_idx_580>

    See Also: <fn["string->number"](string, radix)>.

    Function: fn["number->string"](z, radix, precision)
    Converts and suffixes *z* with a count of significant bits.

    Appends "|p" to each inexact real component of *z* where p is the
    smallest mantissa width not less than *precision* needed to
    represent the component exactly.

    Specified by: <R6RS at
    http://www.r6rs.org/final/html/r6rs/r6rs-Z-H-14.html#node_idx_582>

    Function: fn["string->number"](string)
    Parses *string* as a Scheme number.  Returns *false* if unable.

    Examples:

    > "1"       - exact 1.
    > "1."      - inexact 1, same as "1.0".
    > "1/2"     - exact one-half, same as "2/4" etc.
    > "0.5"     - inexact 0.5.
    > "12e3"    - inexact 12000.
    > "i"       - the imaginary unit.
    > "-2+1/2i" - exact complex number.
    > "2.@1"    - complex in polar coordinates, r=2.0, theta=1.0.
    > "+inf.0"  - positive infinity.
    > "-inf.0"  - negative infinity.
    > "+nan.0"  - IEEE NaN (not-a-number).
    > "#e0.5"   - exact one-half, forced exact by prefix #e.
    > "#i1/2"   - 0.5, inexact by prefix #i.
    > "#x22"    - exact 34; prefix #x hexadecimal.
    > "#o177"   - exact 127; prefix #o octal.
    > "#b101"   - exact 5; prefix #b binary.
    > "#i#b101" - inexact 5.0.
    > "#b#i101" - same.
    > "1.2345678|24" - rounded as if to single-precision (about 1.23456776).

    Specified by: <R6RS at
    http://www.r6rs.org/final/html/r6rs/r6rs-Z-H-14.html#node_idx_584>

    See Also: <fn["number->string"](z)>, <R6RS section 4.2.8: Lexical
    syntax: Numbers at
    http://www.r6rs.org/final/html/r6rs/r6rs-Z-H-7.html#node_sec_4.2.8>

    Function: fn["string->number"](string, radix)
    Parses *string* as a Scheme number using *radix* as default radix.

    *radix* must be exact 2, 8, 10, or 16.  If *string* contains a
    radix prefix, the prefix takes precedence over *radix*.

    Specified by: <R6RS at
    http://www.r6rs.org/final/html/r6rs/r6rs-Z-H-14.html#node_idx_586>

    See Also: <fn["number->string"](z, radix)>.
*/

    "eqv?"      : fn_isEqv,
    "number?"   : fn_isNumber,
    "complex?"  : fn_isComplex,
    "real?"     : fn_isReal,
    "rational?" : fn_isRational,
    "integer?"  : fn_isInteger,
    "real-valued?"     : fn_isRealValued,
    "rational-valued?" : fn_isRationalValued,
    "integer-valued?"  : fn_isIntegerValued,

    "exact?"   : makeUnary("SN_isExact"),
    "inexact?" : makeUnary("SN_isInexact"),

    inexact : makeUnary("SN_toInexact"),
    exact   : makeUnary("SN_toExact"),

    "="  : fn_equals,
    "<"  : makeComparator("SN_lt"),
    ">"  : makeComparator("SN_gt"),
    "<=" : makeComparator("SN_le"),
    ">=" : makeComparator("SN_ge"),

    "zero?"     : makeUnary("SN_isZero"),
    "positive?" : makeUnary("SN_isPositive"),
    "negative?" : makeUnary("SN_isNegative"),
    "odd?"      : makeUnary("SN_isOdd"),
    "even?"     : makeUnary("SN_isEven"),
    "finite?"   : makeUnary("SN_isFinite"),
    "infinite?" : makeUnary("SN_isInfinite"),
    "nan?"      : makeUnary("SN_isNaN"),

    max : makeMaxMin("SN_gt"),
    min : makeMaxMin("SN_lt"),

    "+" : function() {
        var ret = ZERO;
        var len = arguments.length;
        var i = 0;
        while (i < len)
            ret = ret.SN_add(SN(arguments[i++]));
        return ret;
    },

    "*" : function() {
        var ret = ONE;
        var len = arguments.length;
        var i = 0;
        while (i < len)
            ret = ret.SN_multiply(SN(arguments[i++]));
        return ret;
    },

    "-" : function(a) {
        var len = arguments.length;

        switch (len) {
        case 0: args1plus(arguments);
        case 1: return SN(a).SN_negate();
        }
        var ret = SN(a);
        var i = 1;
        while (i < len)
            ret = ret.SN_subtract(SN(arguments[i++]));
        return ret;
    },

    "/" : function(a) {
        var len = arguments.length;

        switch (len) {
        case 0: args1plus(arguments);
        case 1: return SN(a).SN_reciprocal();
        case 2: return SN(a).SN_divide(SN(arguments[1]));
        }
        var product = ONE;
        var i = 1;
        while (i < len)
            product = product.SN_multiply(SN(arguments[i++]));
        return SN(a).SN_divide(product);
    },

    abs             : makeUnary("SN_abs"),
    "div-and-mod"   : makeDivMod(false, 2),
    div             : makeDivMod(false, 0),
    mod             : makeDivMod(false, 1),
    "div0-and-mod0" : makeDivMod(true, 2),
    div0            : makeDivMod(true, 0),
    mod0            : makeDivMod(true, 1),

    gcd : function() {
        var ret = ZERO;
        var len = arguments.length;
        var exact = true;
        for (var i = 0; i < len; i++) {
            var arg = toInteger(arguments[i]);
            exact = exact && arg.SN_isExact();
            ret = gcdNonneg(ret, arg.SN_abs().SN_toExact());
        }
        ret = ret.SN_abs();
        return (exact ? ret : ret.SN_toInexact());
    },

    lcm : function() {
        var ret = ONE;
        var len = arguments.length;
        var exact = true;
        for (var i = 0; i < len; i++) {
            var arg = toInteger(arguments[i]);
            exact = exact && arg.SN_isExact();
            arg = arg.SN_abs().SN_toExact();
            ret = ret.SN_multiply(arg).SN_divide(gcdNonneg(ret, arg.SN_abs()));
        }
        return (exact ? ret : ret.SN_toInexact());
    },

    numerator   : makeUnary("SN_numerator"),
    denominator : makeUnary("SN_denominator"),
    floor       : makeUnary("SN_floor"),
    ceiling     : makeUnary("SN_ceiling"),
    truncate    : makeUnary("SN_truncate"),
    round       : makeUnary("SN_round"),
    rationalize : rationalize,
    exp         : makeUnary("SN_exp"),

    log : function(z, base) {
        var ret = SN(z).SN_log();
        switch (arguments.length) {
        case 2: ret = ret.SN_divide(SN(base).SN_log());  // fall through
        case 1: return ret;
        default: wrongArgCount("1-2", arguments);
        }
    },

    sin  : makeUnary("SN_sin"),
    cos  : makeUnary("SN_cos"),
    tan  : makeUnary("SN_tan"),
    asin : makeUnary("SN_asin"),
    acos : makeUnary("SN_acos"),

    atan : function(y, x) {
        switch (arguments.length) {
        case 1: return SN(y).SN_atan();
        case 2: return toReal(y).SN_atan2(toReal(x));
        default: wrongArgCount("1-2", arguments);
        }
    },

    sqrt : makeUnary("SN_sqrt"),
    "exact-integer-sqrt" : makeUnary("SN_exactIntegerSqrt"),
    expt : makeBinary("SN_expt"),

    "make-rectangular" : function(x, y) {
        arguments.length === 2 || args2(arguments);
        return makeRectangular(toReal(x), toReal(y));
    },

    "make-polar" : function(r, theta) {
        arguments.length === 2 || args2(arguments);
        return makePolar(toReal(r), toReal(theta));
    },

    "real-part" : makeUnary("SN_realPart"),
    "imag-part" : makeUnary("SN_imagPart"),
    magnitude   : makeUnary("SN_magnitude"),
    angle       : makeUnary("SN_angle"),

    "number->string" : function(z, radix, precision) {
        var r = radix;
        switch (arguments.length) {
        case 3:
            precision = toInteger(precision);
            assertExact(precision);
            // fall through
        case 2:
            r = assertExact(toInteger(r)).valueOf();
            if (!uintegerPattern[r])
                raise("&assertion", "invalid radix", radix);
            // fall through
        case 1: break;
        default: wrongArgCount("1-3", arguments);
        }
        return SN(z).SN_numberToString(r, precision);
    },

    "string->number" : function(s, radix) {
        switch (arguments.length) {
        case 1:
        case 2: return stringToNumber(String(s), radix);
        default: wrongArgCount("1-2", arguments);
        }
    }
};

// Scheme function helpers.

function wrongArgCount(expected, a) {
    var msg = "Function"

    for (name in fn) {
        if (fn[name] === a.callee) {
            msg += " '" + name + "'";
            break;
        }
    }
    raise("&assertion", msg + " expected " + expected +
          " argument" + (expected == "1" ? "" : "s") + ", got " + a.length);
}

function args1(a) { a.length === 1 || wrongArgCount(1, a); }
function args2(a) { a.length === 2 || wrongArgCount(2, a); }

function args1plus(a) { a.length > 0 || wrongArgCount("1 or more", a); }
function args2plus(a) { a.length > 1 || wrongArgCount("2 or more", a); }

function fn_isEqv(a, b) {
    arguments.length === 2 || args2(arguments);
    if (a === b)
        return true;
    a = SN(a);
    b = SN(b);
    return (a.SN_eq(b) && a.SN_isExact() === b.SN_isExact());
}

function fn_isNumber(x) {
    arguments.length === 1 || args1(arguments);
    return isNumber(x);
}

function fn_isComplex(x) {
    arguments.length === 1 || args1(arguments);
    return isNumber(x) && x.SN_isComplex();
}

function fn_isReal(x) {
    arguments.length === 1 || args1(arguments);
    return isNumber(x) && x.SN_isReal();
}

function fn_isRational(x) {
    arguments.length === 1 || args1(arguments);
    return isNumber(x) && x.SN_isRational();
}

function fn_isInteger(x) {
    arguments.length === 1 || args1(arguments);
    return isNumber(x) && x.SN_isInteger();
}

function fn_isRealValued(x) {
    arguments.length === 1 || args1(arguments);
    return isNumber(x) && x.SN_imagPart().SN_isZero();
}

function fn_isRationalValued(x) {
    arguments.length === 1 || args1(arguments);
    return fn_isRealValued(x) && x.SN_realPart().SN_isRational();
}

function fn_isIntegerValued(x) {
    arguments.length === 1 || args1(arguments);
    return fn_isRealValued(x) && x.SN_realPart().SN_isInteger();
}

function fn_equals(a, b) {
    var len = arguments.length;
    len > 1 || args2plus(arguments);
    a = SN(a);
    for (var i = 1; i < len; i++) {
        if (!a.SN_eq(SN(arguments[i])))
            return false;
    }
    return true;
}

function makeUnary(method) {
    function unary(a) {
        arguments.length === 1 || args1(arguments);
        return SN(a)[method]();
    }
    return unary;
}

function makeBinary(method) {
    function binary(a, b) {
        arguments.length === 2 || args2(arguments);
        return SN(a)[method](SN(b));
    }
    return binary;
}

function makeComparator(cmp) {
    function comparator(a, b) {
        var len = arguments.length;
        len > 1 || args2plus(arguments);
        b = toReal(b);
        if (!toReal(a)[cmp](b))
            return false;
        for (var i = 2; i < len; i++) {
            var c = toReal(arguments[i]);
            if (!b[cmp](c))
                return false;
            b = c;
        }
        return true;
    }
    return comparator;
}

function makeMaxMin(cmp) {
    function maxMin(a) {
        var len = arguments.length;
        len > 0 || args1plus(arguments);

        var ret = toReal(a);
        var exact = ret.SN_isExact();

        for (var i = 1; i < len; i++) {
            var x = toReal(arguments[i]);
            if (x.SN_isNaN())
                return x;
            if (exact) {
                exact = x.SN_isExact();
                if (!exact)
                    ret = ret.SN_toInexact();  // XXX Cheaper comparisons?
            }
            if (x[cmp](ret) !== false) {
                ret = x;
            }
        }
        return exact ? ret : ret.SN_toInexact();
    }
    return maxMin;
}

function divModArg2Zero(arg) {
    raise("&assertion", "div/mod second argument is zero", arg);
}

function makeDivMod(is0, which) {
    function divMod(x, y) {
        arguments.length === 2 || args2(arguments);
        x = toReal(x);
        y = toReal(y);

        if (!x.SN_isFinite())
            raise("&assertion", "div/mod first argument is not finite", x);
        if (y.SN_isZero())
            divModArg2Zero(y);

        if (!is0) {
            switch (which) {
            case 0: return x.SN_div(y);
            case 1: return x.SN_mod(y);
            case 2: default: return x.SN_divAndMod(y);
            }
        }

        var dm = x.SN_divAndMod(y);
        var m = dm[1];
        var yabs = y.SN_abs();

        if (m.SN_add(m).SN_ge(yabs)) {
            switch (which) {
            case 0: return dm[0].SN_add(y.SN_isNegative() ? M_ONE : ONE);
            case 1: return m.SN_subtract(yabs);
            case 2: default: return [dm[0].SN_add(y.SN_isNegative() ?
                                                  M_ONE : ONE),
                                     m.SN_subtract(yabs)];
            }
        }
        switch (which) {
        case 0: return dm[0];
        case 1: return m;
        case 2: default: return dm;
        }
    }
    return divMod;
}

function rationalize(x, delta) {
    args2(arguments);
    x = SN(x);
    delta = SN(delta);

    // Handle weird cases first.
    if (!x.SN_isFinite() || !delta.SN_isFinite()) {
        assertReal(x);
        assertReal(delta);
        if (delta.SN_isInfinite())
            return (x.SN_isFinite() ? INEXACT_ZERO : NAN);
        if (delta.SN_isNaN())
            return delta;
        return x;
    }

    if (delta.SN_isZero())
        return x;

    delta = delta.SN_abs();  // It's what PLT and Mosh seem to do.

    var x0 = x.SN_subtract(delta);
    var x1 = x.SN_add(delta);
    var a = x0.SN_floor();
    var b = x1.SN_floor();

    if (a.SN_ne(b)) {
        var negative = a.SN_isNegative();
        if (b.SN_isNegative() != negative)
            return (a.SN_isExact() ? ZERO : INEXACT_ZERO);
        return (negative ? b : x0.SN_ceiling());
    }
    var cf = [];  // Continued fraction, b implied.

    while (true) {
        x0 = x0.SN_subtract(a);
        if (x0.SN_isZero())
            break;
        x1 = x1.SN_subtract(a);
        if (x1.SN_isZero())
            break;

        x0 = x0.SN_reciprocal();
        x1 = x1.SN_reciprocal();
        a = x0.SN_floor();

        switch (a.SN_compare(x1.SN_floor())) {
        case -1: cf.push(x0.SN_ceiling()); break;
        case  1: cf.push(x1.SN_ceiling()); break;
        case 0: default:
            cf.push(a);
            continue;
        }
        break;
    }
    var ret = ZERO;
    var i = cf.length;
    while (i--)
        ret = ret.SN_add(cf[i]).SN_reciprocal();
    return ret.SN_add(b);
}

//
// Flonum: Inexact real as a native number.
//

DISP.Flonum.SN_isExact    = retFalse;
DISP.Flonum.SN_isInexact  = retTrue;
DISP.Flonum.SN_isComplex  = retTrue;
DISP.Flonum.SN_isReal     = retTrue;

DISP.Flonum.SN_debug = function() {
    return "Flonum(" + this.SN_numberToString() + ")";
};

// Return a string of "0" and "1" characters, possibly including a "."
// and possibly a leading "-", that in base 2 equals x.  This works by
// calling Number.prototype.toString with a radix of 2.  Specification
// ECMA-262 Edition 5 (December 2009) does not strongly assert that
// this works.  As an alternative, should this prove non-portable,
// nativeDenominator could instead do:
// for (d = 1; x !== floor(x); d *= 2) { x *= 2; } return d;
function numberToBinary(x) {
    return x.toString(2);
}

function nativeDenominatorLog2(x) {
    //assert(typeof x === "number");
    //assert(_isFinite(x));
    var s = numberToBinary(abs(x));
    var i = s.indexOf(".");
    if (i === -1)
        return 0;
    return s.length - i - 1;
}

function nativeDenominator(x) {
    // Get the "denominator" of a floating point value.
    // The result will be a power of 2.
    //assert(_isFinite(x));
    return pow(2, nativeDenominatorLog2(x));
}

DISP.Flonum.SN_numberToString = function(radix, precision) {
    if (radix && radix != 10 && _isFinite(this))
        return "#i" + this.SN_toExact().SN_numberToString(radix);

    if (!_isFinite(this)) {
        if (_isNaN(this))
            return("+nan.0");
        return (this > 0 ? "+inf.0" : "-inf.0");
    }

    var s = (+this).toString();

    if (s.indexOf('.') === -1) {
        // Force the result to contain a decimal point as per R6RS.
        var e = s.indexOf('e');
        if (e === -1)
            s += ".";
        else
            s = s.substring(0, e) + "." + s.substring(e);
    }

    if (precision != undefined) {
        if (precision < 53) {
            var bits = numberToBinary(+this).replace(/[-+.]/g, "")
                .replace(/^0+/, "").replace(/0+$/, "").length;
            if (precision < bits)
                precision = bits;
        }
        s += "|" + precision;
    }

    return s;
};

DISP.Flonum.SN_realPart = retThis;

DISP.Flonum.SN_imagPart = function() {
    return ZERO;
};

DISP.Flonum.SN_denominator = function() {
    return floPow(2, nativeDenominatorLog2(+assertRational(this)));
};

DISP.Flonum.SN_numerator = function() {
    return toFlonum(this * nativeDenominator(+assertRational(this)));
};

DISP.Flonum.SN_isInteger = function() {
    return _isFinite(this) && this == floor(this);
};

DISP.Flonum.SN_isFinite = function() {
    return _isFinite(this);
};
DISP.Flonum.SN_isRational = DISP.Flonum.SN_isFinite;

DISP.Flonum.SN_isZero = function() {
    return this == 0;
};

DISP.Flonum.SN_isPositive = function() {
    return this > 0;
};

DISP.Flonum.SN_isNegative = function() {
    return this < 0;
};

DISP.Flonum.SN_sign = function() {
    return (this == 0 ? 0 : (this > 0 ? 1 : -1));
};

// XXX I think we can do without SN_isUnit.
DISP.Flonum.SN_isUnit = function() {
    return this == 1 || this == -1;
};

DISP.Flonum.SN_isInfinite = function() {
    return !_isFinite(this) && !_isNaN(this);
};

DISP.Flonum.SN_isNaN = function() {
    return _isNaN(this);
};

DISP.Flonum.SN_isEven = function() {
    //assert(this == floor(this));
    return (this & 1) === 0;
};

DISP.Flonum.SN_isOdd = function() {
    //assert(this == floor(this));
    return (this & 1) === 1;
};

DISP.Flonum.SN_eq = function(z) { return z.SN__eq_Flonum(this); };
DISP.Flonum.SN_ne = function(z) { return z.SN__ne_Flonum(this); };
DISP.Flonum.SN_gt = function(x) { return assertReal(x).SN__gt_Flonum(this); };
DISP.Flonum.SN_lt = function(x) { return assertReal(x).SN__lt_Flonum(this); };
DISP.Flonum.SN_ge = function(x) { return assertReal(x).SN__ge_Flonum(this); };
DISP.Flonum.SN_le = function(x) { return assertReal(x).SN__le_Flonum(this); };

// XXX I think we can do without SN_compare and SN__compare_*.
DISP.Flonum.SN_compare = function(x) {
    return assertReal(x).SN__compare_Flonum(this);
};

// Note operand order!
DISP.Flonum.SN__eq_R = function(x) { return +x == this; };
DISP.Flonum.SN__ne_R = function(x) { return +x != this; };
DISP.Flonum.SN__gt_R = function(x) { return x > this; };
DISP.Flonum.SN__lt_R = function(x) { return x < this; };
DISP.Flonum.SN__ge_R = function(x) { return x >= this; };
DISP.Flonum.SN__le_R = function(x) { return x <= this; };

DISP.Flonum.SN__compare_R = function(x) {
    if (+x == this) return 0;
    if (x < this) return -1;
    if (x > this) return 1;
    return NaN;
};

function numberToEI(n) {
    if (n < 9007199254740992 && n > -9007199254740992)
        return toEINative(n);
    return new EIBig(numberToBigInteger(n));
}

function nativeToExact(x) {
    if (!_isFinite(x))
        raise("&implementation-violation",
              "inexact argument has no reasonably close exact equivalent", x);

    var d = nativeDenominator(x);
    var n;

    if (d === 1)
        return numberToEI(x);

    if (_isFinite(d)) {
        n = x * d;
        d = numberToEI(d);
    }
    else {
        // Denormal x.
        var dl2 = nativeDenominatorLog2(x);
        n = x * 9007199254740992;
        n *= pow(2, dl2 - 53);
        d = TWO.SN_expt(toEINative(dl2));
    }
    //assert(_isFinite(n));
    return canonicalEQ(numberToEI(n), d);
}

DISP.Flonum.SN_toExact = function() {
    return nativeToExact(+this);
};

DISP.Flonum.SN_toInexact = retThis;

DISP.Flonum.SN_add = function(z) {
    return z.SN__add_Flonum(this);
};
DISP.Flonum.SN_subtract = function(z) {
    return z.SN__subtract_Flonum(this);
};
DISP.Flonum.SN_multiply = function(z) {
    return z.SN__multiply_Flonum(this);
};
DISP.Flonum.SN_divide = function(z) {
    return z.SN__divide_Flonum(this);
};

DISP.Flonum.SN__add_R = function(x) {
    return toFlonum(x + this);
};
DISP.Flonum.SN__subtract_R = function(x) {
    return toFlonum(x - this);
};
DISP.Flonum.SN__multiply_R = function(x) {
    return toFlonum(x * this);
};
DISP.Flonum.SN__divide_R = function(x) {
    return toFlonum(x / this);
};

DISP.Flonum.SN_negate = function() {
    return toFlonum(-this);
};

DISP.Flonum.SN_abs = function() {
    return (this < 0 ? toFlonum(-this) : this);
};

DISP.Flonum.SN_reciprocal = function() {
    return toFlonum(1 / this);
};

function div_Flonum_R(x, y) {
    if (y > 0)
        return floor(x / y);
    if (y < 0)
        return ceil(x / y);
    if (y == 0)
        divModArg2Zero(toFlonum(y));
    return NaN;
}
DISP.Flonum.SN_divAndMod = function(x) {
    x = +x;
    var div = div_Flonum_R(this, x);
    return [toFlonum(div), toFlonum(this - (x * div))];
};
DISP.Flonum.SN_div = function(x) {
    return toFlonum(div_Flonum_R(this, x));
};
DISP.Flonum.SN_mod = function(x) {
    return toFlonum(this - x * div_Flonum_R(this, x));
};

DISP.Flonum.SN_square = function() {
    return toFlonum(this * this);
};

DISP.Flonum.SN_round = function() {
    var ret = floor(this);
    var diff = this - ret;
    if (diff < 0.5) return toFlonum(ret);
    if (diff > 0.5) return toFlonum(ret + 1);
    return toFlonum(2 * round(this / 2));
};

DISP.Flonum.SN_truncate = function() {
    return this < 0 ? floCeil(this) : floFloor(this);
};

DISP.Flonum.SN_ceiling = function() {
    return floCeil(this);
};

function funcToMeth(fn) {
    return function() {
        return fn(this);
    };
}
DISP.Flonum.SN_abs   = funcToMeth(floAbs);
DISP.Flonum.SN_atan  = funcToMeth(floAtan);
DISP.Flonum.SN_cos   = funcToMeth(floCos);
DISP.Flonum.SN_exp   = funcToMeth(floExp);
DISP.Flonum.SN_floor = funcToMeth(floFloor);
DISP.Flonum.SN_sin   = funcToMeth(floSin);
DISP.Flonum.SN_tan   = funcToMeth(floTan);

function cplxFuncToMeth(mathFunc, complexFunc) {
    return function() {
        var ret = mathFunc(this);
        if (_isNaN(ret))
            return complexFunc(this);
        return toFlonum(ret);
    };
}
DISP.Flonum.SN_acos = cplxFuncToMeth(Math.acos, complexAcos);
DISP.Flonum.SN_asin = cplxFuncToMeth(Math.asin, complexAsin);

DISP.Flonum.SN_log = function() {
    if (this < 0)
        return complexLog(this);
    return floLog(this);
};

DISP.Flonum.SN_sqrt = function() {
    if (this >= 0)
        return toFlonum(sqrt(this));
    if (_isNaN(this))
        return this;
    return inexactRectangular(INEXACT_ZERO, floSqrt(-this));
};

DISP.Flonum.SN_atan2 = function(x) {
    return floAtan2(this, x);
};

DISP.Flonum.SN_expt = function(z) {
    return z.SN__expt_Flonum(this);
};

// Some famous flonums:

var INEXACT_ZERO = toFlonum(0);

var INFINITY     = toFlonum(Number.POSITIVE_INFINITY);
var M_INFINITY   = toFlonum(Number.NEGATIVE_INFINITY);
var NAN          = toFlonum(Number.NaN);

var PI           = toFlonum(Math.PI);

//
// C: Complex abstract base class.
//

DISP.C.SN_isReal     = retFalse;
DISP.C.SN_isRational = retFalse;
DISP.C.SN_isInteger  = retFalse;
DISP.C.SN_isZero     = retFalse;
DISP.C.SN_isUnit     = retFalse;

DISP.C.SN_isComplex  = retTrue;

DISP.C.SN_numberToString = pureVirtual;

DISP.C.toString = function(radix) {
    return this.SN_numberToString(radix);
};
DISP.C.valueOf = function() {
    if (this.SN_imagPart().SN_isZero())
        return this.SN_realPart().valueOf();
    return NaN;
};

DISP.C.toFixed = pureVirtual;
DISP.C.toExponential = pureVirtual;
DISP.C.toPrecision = pureVirtual;

DISP.C.toLocaleString = function() {
    return this.toString();
};

DISP.C.SN_debug = function() { return "C"; };

// vvvv You shouldn't need this if you use only real numbers. vvvv

DISP.C.SN_sqrt = function() {
    return makePolar(this.SN_magnitude().SN_sqrt(),
                     this.SN_angle().SN_divide(TWO));
};

// Complex transcendental functions here for completeness, not optimized.

function complexLog(z) {
    return makeRectangular(z.SN_magnitude().SN_log(), z.SN_angle());
};

function complexAsin(z) {
    return M_I.SN_multiply(I.SN_multiply(z)
                           .SN_add(ONE.SN_subtract(z.SN_square()).SN_sqrt())
                           .SN_log());
}

function complexAcos(z) {
    return PI.SN_divide(TWO).SN_subtract(complexAsin(z));
}

function complexAtan(z) {
    var iz = I.SN_multiply(z);
    return ONE.SN_add(iz).SN_log().SN_subtract(ONE.SN_subtract(iz).SN_log())
        .SN_divide(TWO).SN_divide(I);
}

DISP.C.SN_log  = function() { return complexLog (this); };
DISP.C.SN_asin = function() { return complexAsin(this); };
DISP.C.SN_acos = function() { return complexAcos(this); };
DISP.C.SN_atan = function() { return complexAtan(this); };

DISP.C.SN_sin = function() {
    var iz = I.SN_multiply(this);
    return iz.SN_exp().SN_subtract(iz.SN_negate().SN_exp())
        .SN_divide(TWO).SN_divide(I);
};

DISP.C.SN_cos = function() {
    var iz = I.SN_multiply(this);
    return iz.SN_exp().SN_add(iz.SN_negate().SN_exp()).SN_divide(TWO);
};

DISP.C.SN_tan = function() {
    return this.SN_sin().SN_divide(this.SN_cos());
};

// ^^^^ You shouldn't need this if you use only real numbers. ^^^^

//
// R: Real abstract base class.
//

DISP.R.SN_isReal = retTrue;

DISP.R.SN_debug = function() { return "R"; };

DISP.R.SN_realPart = retThis;

// Methods implemented generically using more basic operations.

DISP.R.SN_magnitude = function() {
    return this.SN_abs();
};

DISP.R.SN_angle = function() {
    return this.SN_isNegative() ? PI : ZERO;
};

// Commented because they are always overridden.
// DISP.R.SN_isPositive = function() {
//     return this.SN_sign() > 0;
// };
// DISP.R.SN_isNegative = function() {
//     return this.SN_sign() < 0;
// };
// DISP.R.SN_sign = function() {
//     return this.SN_compare(ZERO);
// };

// Dispatches.

DISP.R.SN__eq_Flonum = DISP.Flonum.SN__eq_R;
DISP.R.SN__ne_Flonum = DISP.Flonum.SN__ne_R;

DISP.R.SN__eq_Rectangular = function(z) {
    return z._y.SN_isZero() && z._x.SN_eq(this);
};
DISP.R.SN__ne_Rectangular = function(z) {
    return !z._y.SN_isZero() || z._x.SN_ne(this);
};

DISP.R.SN__gt_Flonum = DISP.Flonum.SN__gt_R;
DISP.R.SN__lt_Flonum = DISP.Flonum.SN__lt_R;
DISP.R.SN__ge_Flonum = DISP.Flonum.SN__ge_R;
DISP.R.SN__le_Flonum = DISP.Flonum.SN__le_R;
DISP.R.SN__compare_Flonum = DISP.Flonum.SN__compare_R;

DISP.R.SN_compare = pureVirtual;
DISP.R.SN_gt = function(x) { return this.SN_compare(x) > 0; };
DISP.R.SN_lt = function(x) { return this.SN_compare(x) < 0; };
DISP.R.SN_ge = function(x) { return this.SN_compare(x) >= 0; };
DISP.R.SN_le = function(x) { return this.SN_compare(x) <= 0; };

DISP.R.SN_add = function(z) {
    return z.SN__add_R(this);
};
DISP.R.SN__add_Flonum = DISP.Flonum.SN__add_R;

DISP.R.SN_subtract = function(z) {
    return z.SN__subtract_R(this);
};
DISP.R.SN__subtract_Flonum = DISP.Flonum.SN__subtract_R;

DISP.R.SN_multiply = function(z) {
    return z.SN__multiply_R(this);
};
DISP.R.SN__multiply_Flonum = DISP.Flonum.SN__multiply_R;

DISP.R.SN_divide = function(z) {
    return z.SN__divide_R(this);
};
DISP.R.SN__divide_Flonum = DISP.Flonum.SN__divide_R;

function complexExpt(b, p) {
    if (b.SN_isZero()) {
        if (p.SN_isZero())
            return toFlonum(1);
        if (p.SN_realPart().SN_isPositive())
            return INEXACT_ZERO;
        raise("&implementation-restriction", "invalid power for zero expt", p);
    }
    return b.SN_log().SN_multiply(p).SN_exp();
}

DISP.R.SN__expt_R = function(x) {
    // Return x to the power of this number.
    if (x.SN_isNegative())
        return complexExpt(x, this);
    return floPow(x, this);
};

DISP.R.SN__expt_EI = DISP.R.SN__expt_R;

DISP.R.SN__expt_EQ = function(q) {
    // Return q to the power of this number.
    if (q.SN_isNegative())
        return complexExpt(q, this);
    var num = q.SN_numerator().SN_expt(this);
    var den = q.SN_denominator().SN_expt(this);

    if (num.SN_isExact() && num.SN_isInteger() &&
        den.SN_isExact() && den.SN_isInteger())
        return new EQFraction(num, den);  // Known to be in lowest terms.

    return num.SN_divide(den);
};

function divAndMod_R_R(x, y) {
    var div = div_R_R(x, y);
    return [div, x.SN_subtract(div.SN_multiply(y))];
}
function div_R_R(x, y) {
    return (y.SN_isNegative()
            ? x.SN_divide(y).SN_ceiling()
            : x.SN_divide(y).SN_floor());
}
function mod_R_R(x, y) {
    return x.SN_subtract(div_R_R(x, y).SN_multiply(y));
}

DISP.R.SN_divAndMod = function(x) {
    return divAndMod_R_R(this, x);
};
DISP.R.SN_div = function(x) {
    return div_R_R(this, x);
};
DISP.R.SN_mod = function(x) {
    return mod_R_R(this, x);
};

DISP.R.SN__divAndMod_R = function(x) {
    return divAndMod_R_R(x, this);
};
DISP.R.SN__div_R = function(x) {
    return div_R_R(x, this);
};
DISP.R.SN__mod_R = function(x) {
    return mod_R_R(x, this);
};

// These functions are always allowed to return inexact.  We, however,
// override a few of these in ZERO and ONE.
["sqrt", "exp", "log", "sin", "cos", "tan", "asin", "acos", "atan", "atan2"]
.forEach(function(name) { DISP.R["SN_" + name] = DISP.Flonum["SN_" + name]; });

// vvvv You shouldn't need this if you use only real numbers. vvvv

//
// Rectangular: Complex numbers as xy-coordinate pairs.
//

function exactRectangular(x, y) {
    //assert(x.SN_isExact());
    //assert(y.SN_isExact());
    if (y.SN_isZero())
        return x;
    if (x.SN_isZero() && y.SN_isUnit())
        return (y.SN_isPositive() ? I : M_I);
    return new Rectangular(x, y);
}

function inexactRectangular(x, y) {
    //assert(x.SN_isInexact());
    //assert(y.SN_isInexact());
    return new Rectangular(x, y);
}

function toRectangular(x, y) {
    //assert(x.SN_isExact() === y.SN_isExact())
    if (x.SN_isExact())
        return exactRectangular(x, y);
    return new Rectangular(x, y);
}

function Rectangular(x, y) {
    this._x = x;
    this._y = y;
}

Rectangular.prototype = new C();

function xyToString(xString, yString) {
    if (yString[0] === '-' || yString[0] === '+')
        return xString + yString + "i";
    return xString + "+" + yString + "i";
}

DISP.Rectangular.SN_numberToString = function(radix, precision) {
    return xyToString(this._x.SN_numberToString(radix, precision),
                      this._y.SN_numberToString(radix, precision));
};

DISP.Rectangular.toString = function(radix) {
    radix = radix || 10;
    return xyToString(this._x.toString(radix), this._y.toString(radix));
};

DISP.Rectangular.SN_debug = function() {
    return "Rectangular(" + this._x.SN_debug()
        + ", " + this._y.SN_debug() + ")";
};

DISP.Rectangular.toFixed = function(dig) {
    return xyToString(this._x.toFixed(dig), this._y.toFixed(dig));
};
DISP.Rectangular.toExponential = function(dig) {
    return xyToString(this._x.toExponential(dig), this._y.toExponential(dig));
};
DISP.Rectangular.toPrecision = function(prec) {
    return xyToString(this._x.toPrecision(prec), this._y.toPrecision(prec));
};

DISP.Rectangular.SN_realPart = function() { return this._x; };
DISP.Rectangular.SN_imagPart = function() { return this._y; };

DISP.Rectangular.SN_isExact   = function() { return this._x.SN_isExact(); };
DISP.Rectangular.SN_isInexact = function() { return this._x.SN_isInexact(); };

DISP.Rectangular.SN_toInexact = function() {
    if (this._x.SN_isInexact())
        return this;
    return inexactRectangular(this._x.SN_toInexact(), this._y.SN_toInexact());
};

DISP.Rectangular.SN_toExact = function() {
    if (this._x.SN_isExact())
        return this;
    return exactRectangular(this._x.SN_toExact(), this._y.SN_toExact());
};

DISP.Rectangular.SN_isZero = function() {
    return this._x.SN_isZero() && this._y.SN_isZero();
};

function rectMagnitude2(z) {
    return z._x.SN_square().SN_add(z._y.SN_square());
}

DISP.Rectangular.SN_isUnit = function() {
    return rectMagnitude2(this).SN_eq(ONE);
};

DISP.Rectangular.SN_magnitude = function() {
    if (this._x.SN_isZero())
        return this._y.SN_abs();
    return rectMagnitude2(this).SN_sqrt();
};

DISP.Rectangular.SN_angle = function() {
    return this._y.SN_atan2(this._x);
};

DISP.C.SN__eq_Rectangular = pureVirtual;
DISP.Rectangular.SN_eq = function(z) {
    return z.SN__eq_Rectangular(this);
};
DISP.Rectangular.SN__eq_Rectangular = function(z) {
    return z._x.SN_eq(this._x) && z._y.SN_eq(this._y);
};
DISP.Rectangular.SN__eq_R = function(x) {
    return this._y.SN_isZero() && x.SN_eq(this._x);
};

DISP.C.SN__ne_Rectangular = pureVirtual;
DISP.Rectangular.SN_ne = function(z) {
    return z.SN__ne_Rectangular(this);
};
DISP.Rectangular.SN__ne_Rectangular = function(z) {
    return z._x.SN_ne(this._x) || z._y.SN_ne(this._y);
};
DISP.Rectangular.SN__ne_R = function(x) {
    return !this._y.SN_isZero() || x.SN_ne(this._x);
};

// Arithmetic where the left operand is Rectangular and the right is
// this Flonum.

DISP.Flonum.SN__add_Rectangular = function(z) {
    return inexactRectangular(toFlonum(z._x + this), z._y.SN_toInexact());
};
DISP.Flonum.SN__subtract_Rectangular = function(z) {
    return inexactRectangular(toFlonum(z._x - this), z._y.SN_toInexact());
};
DISP.Flonum.SN__multiply_Rectangular = function(z) {
    return inexactRectangular(toFlonum(z._x * this), toFlonum(z._y * this));
};
DISP.Flonum.SN__divide_Rectangular = function(z) {
    return inexactRectangular(toFlonum(z._x / this), toFlonum(z._y / this));
};
DISP.Flonum.SN__expt_Rectangular = function(z) {
    // XXX Is this any cheaper than complexExpt??
    return makePolar(floPow(rectMagnitude2(z), this / 2),
                     toFlonum(atan2(z._y, z._x) * this));
};

// Arithmetic where the left operand is Rectangular and the right is
// this real number.

DISP.R.SN__add_Rectangular = function(z) {
    return makeRectangular(z._x.SN_add(this), z._y);
};

DISP.R.SN__subtract_Rectangular = function(z) {
    return makeRectangular(z._x.SN_subtract(this), z._y);
};

DISP.R.SN__multiply_Rectangular = function(z) {
    return toRectangular(z._x.SN_multiply(this), z._y.SN_multiply(this));
};

DISP.R.SN__divide_Rectangular = function(z) {
    return toRectangular(z._x.SN_divide(this), z._y.SN_divide(this));
};

DISP.C.SN__add_Rectangular = pureVirtual;
DISP.Rectangular.SN_add = function(z) {
    return z.SN__add_Rectangular(this);
};
DISP.Rectangular.SN__add_R = function(x) {
    return makeRectangular(x.SN_add(this._x), this._y);
};
DISP.Rectangular.SN__add_Rectangular = function(z) {
    var x = z._x.SN_add(this._x);
    var y = z._y.SN_add(this._y);
    return (x.SN_isExact() ? exactRectangular : inexactRectangular)(x, y);
};

DISP.Rectangular.SN_negate = function() {
    return toRectangular(this._x.SN_negate(), this._y.SN_negate());
};

DISP.C.SN__subtract_Rectangular = pureVirtual;
DISP.Rectangular.SN_subtract = function(z) {
    return z.SN__subtract_Rectangular(this);
};
DISP.Rectangular.SN__subtract_R = function(x) {
    return makeRectangular(x.SN_subtract(this._x), this._y.SN_negate());
};
DISP.Rectangular.SN__subtract_Rectangular = function(z) {
    var x = z._x.SN_subtract(this._x);
    var y = z._y.SN_subtract(this._y);
    return (x.SN_isExact() ? exactRectangular : inexactRectangular)(x, y);
};

DISP.C.SN__multiply_Rectangular = pureVirtual;
DISP.Rectangular.SN_multiply = function(z) {
    return z.SN__multiply_Rectangular(this);
};
DISP.Rectangular.SN__multiply_R = function(x) {
    return toRectangular(x.SN_multiply(this._x), x.SN_multiply(this._y));
};
function complexMultiply(ax, ay, bx, by) {
    return toRectangular(ax.SN_multiply(bx).SN_subtract(ay.SN_multiply(by)),
                         ax.SN_multiply(by).SN_add(ay.SN_multiply(bx)));
}
DISP.Rectangular.SN__multiply_Rectangular = function(z) {
    return complexMultiply(z._x, z._y, this._x, this._y);
};

DISP.Rectangular.SN_square = function() {
    return toRectangular(this._x.SN_square().SN_subtract(this._y.SN_square()),
                         this._x.SN_multiply(this._y).SN_multiply(TWO));
};

DISP.Rectangular.SN_reciprocal = function() {
    var m2 = rectMagnitude2(this);
    return toRectangular(this._x.SN_divide(m2),
                         this._y.SN_divide(m2).SN_negate());
};

DISP.C.SN__divide_Rectangular = pureVirtual;
DISP.Rectangular.SN_divide = function(z) {
    return z.SN__divide_Rectangular(this);
};
function complexDivide(x, y, z) {  // returns (x + iy) / z
    var m2 = rectMagnitude2(z);
    return complexMultiply(x, y,
                           z._x.SN_divide(m2),
                           z._y.SN_divide(m2).SN_negate());
}
DISP.Rectangular.SN__divide_R = function(x) {
    return complexDivide(x, x.SN_isExact() ? ZERO : INEXACT_ZERO, this);
};
DISP.Rectangular.SN__divide_Rectangular = function(z) {
    return complexDivide(z._x, z._y, this);
};

DISP.Rectangular.SN_expt = function(z) {
    return z.SN__expt_Rectangular(this);
};
DISP.Rectangular.SN__expt_C = function(z) {
    return complexExpt(z, this);
};
DISP.C.SN__expt_Rectangular = DISP.Rectangular.SN__expt_C;

DISP.Rectangular.SN_exp = function() {
    return makePolar(this._x.SN_exp(), this._y);
};

// ^^^^ You shouldn't need this if you use only real numbers. ^^^^

//
// ER: Exact real abstract base class.
//

DISP.ER.SN_isExact    = retTrue;
DISP.ER.SN_isInexact  = retFalse;

DISP.ER.SN_toExact    = retThis;
DISP.ER.SN_toInexact  = function() { return toFlonum(+this); };

DISP.ER.SN_isNaN      = retFalse;
DISP.ER.SN_isFinite   = retTrue;
DISP.ER.SN_isInfinite = retFalse;

DISP.ER.SN_imagPart   = retZero;

function zeroes(count) {
    var ret = "000000000000000".substring(0, count & 15);
    if (count > 15)
        ret += new Array((count >> 4) + 1).join("0000000000000000");
    return ret;
}

// Specified by ECMA-262, 5th edition, 15.7.4.5.
DISP.ER.toFixed = function(fractionDigits) {
    var f = (fractionDigits === undefined ? 0 : _parseInt(fractionDigits));
    if (f > SN.maxIntegerDigits)
        throw new RangeError("fractionDigits exceeds " +
                             "SchemeNumber.maxIntegerDigits: " +
                             fractionDigits);

    var x = this;
    var s = "";
    if (x.SN_isNegative()) {
        x = x.SN_negate();
        s = "-";
    }

    var p = ONE.SN__exp10(-f);
    var dm = x.SN_divAndMod(p);
    var n = dm[0];
    if (dm[1].SN_add(dm[1]).SN_ge(p))
        n = ONE.SN_add(n);
    if (n.SN_isZero())
        return s + "0" +
            (fractionDigits > 0 ? "." + zeroes(fractionDigits) : "");
    n = n.SN_numberToString();
    if (f === 0)
        return s + n;

    var z = f - n.length;
    if (f > 0) {
        if (z >= 0)
            n = zeroes(z + 1) + n;
        var point = n.length - f;
        return s + n.substring(0, point) + "." + n.substring(point);
    }
    return s + n + zeroes(-f);
};

DISP.ER.toExponential = function(fractionDigits) {
    var f = (fractionDigits === undefined ? 20 : _parseInt(fractionDigits));
    if (f < 0)
        throw new RangeError("SchemeNumber toExponential: negative " +
                             "argument: " + f);
    if (f > SN.maxIntegerDigits)
        throw new RangeError("fractionDigits exceeds " +
                             "SchemeNumber.maxIntegerDigits: " +
                             fractionDigits);

    var x = this;
    var s = "";
    if (x.SN_isNegative()) {
        x = x.SN_negate();
        s = "-";
    }
    else if (x.SN_isZero())
        return "0" + (fractionDigits > 0 ? "." + zeroes(f) : "") + "e+0";

    var e = floor(x.SN_log() / LN10);
    var p = ONE.SN__exp10(e - f);
    var dm = x.SN_divAndMod(p);
    var n = dm[0];
    if (dm[1].SN_add(dm[1]).SN_ge(p))
        n = ONE.SN_add(n);
    n = n.SN_numberToString();

    // Adjust for inaccuracy in log().
    if (n.length != f + 1) {
        //print("Guessed wrong length: " + n.length + " != " + (f + 1));
        e += n.length - (f + 1);
        p = ONE.SN__exp10(e - f);
        dm = x.SN_divAndMod(p);
        n = dm[0];
        if (dm[1].SN_add(dm[1]).SN_ge(p))
            n = ONE.SN_add(n);
        n = n.SN_numberToString();
        if (n.length != f + 1)
            throw new Error("Can not format as exponential: "
                            + this.SN_numberToString());
    }

    if (fractionDigits === undefined)
        n = n.replace(/(\d)0+$/, "$1");
    if (n.length > 1)
        n = n[0] + "." + n.substring(1);
    return s + n + "e" + (e < 0 ? "" : "+") + e;
};

DISP.ER.toPrecision = function(precision) {
    var p, x;
    if (precision === undefined) {
        x = this.SN_toInexact();
        if (x.SN_isFinite())
            return (+x).toString();
        p = 21;
    }
    else {
        p = _parseInt(precision);
        if (p < 1)
            throw new RangeError("SchemeNumber toPrecision: expected a " +
                                 "positive precision, got: " + precision);
        if (p > SN.maxIntegerDigits)
            throw new RangeError("precision exceeds " +
                                 "SchemeNumber.maxIntegerDigits: " +
                                 precision);
    }

    x = this;
    var s = "";
    if (x.SN_isNegative()) {
        x = x.SN_negate();
        s = "-";
    }
    else if (x.SN_isZero())
        return "0" + (p > 1 ? "." + zeroes(p - 1) : "");

    var ret = x.toExponential(p - 1);
    var eIndex = ret.indexOf('e');
    var exponent = _parseInt(ret.substring(eIndex + 1));
    if (exponent >= -6 && exponent < p) {
        if (exponent === 0)
            ret = ret.substring(0, eIndex);
        else {
            ret = ret.substring(0, 1)
                + (ret.indexOf('.') === -1 ? "" : ret.substring(2, eIndex));
            if (exponent < 0)
                ret = "0." + zeroes(-1 - exponent) + ret;
            else if (exponent < p - 1)
                ret = ret.substring(0, exponent + 1) + "." +
                    ret.substring(exponent + 1);
        }
    }
    else if (precision === undefined) {
        ret = ret.substring(0, eIndex).replace(/\.?0+/, "")
            + ret.substring(eIndex);
    }

    return s + ret;
};

//
// EQ: Exact rational abstract base class.
//

function parseDecimal(sign, significand, exponent) {
    return parseEI(sign, significand).SN__exp10(exponent);
}

DISP.EQ.SN_isRational = retTrue;

DISP.EQ.SN_eq = function(z) {
    return z.SN__eq_EQ(this);
};
DISP.EQ.SN__eq_EQ = pureVirtual;

DISP.EQ.SN_ne = function(z) {
    return z.SN__ne_EQ(this);
};
DISP.EQ.SN__ne_EQ = pureVirtual;

DISP.EQ.SN_compare = function(x) {
    return x.SN__compare_EQ(this);
};
DISP.EQ.SN__compare_EQ = pureVirtual;

DISP.EQ.SN_add = function(z) {
    return z.SN__add_EQ(this);
};
DISP.EQ.SN__add_EQ = pureVirtual;

DISP.EQ.SN_subtract = function(z) {
    return z.SN__subtract_EQ(this);
};
DISP.EQ.SN__subtract_EQ = pureVirtual;

DISP.EQ.SN_multiply = function(z) {
    return z.SN__multiply_EQ(this);
};
DISP.EQ.SN__multiply_EQ = pureVirtual;

DISP.EQ.SN_divide = function(z) {
    return z.SN__divide_EQ(this);
};
DISP.EQ.SN__divide_EQ = pureVirtual;

DISP.EQ.SN_expt = function(z) {
    return z.SN__expt_EQ(this);
};

function reduceEQ(n, d) {
    if (d.SN_isZero())
        divisionByExactZero();

    var g = gcdNonneg(n.SN_abs(), d.SN_abs());

    n = n.SN_div(g);
    d = d.SN_div(g);

    if (d.SN_isNegative())
        return canonicalEQ(n.SN_negate(), d.SN_negate());
    return canonicalEQ(n, d);
}

function canonicalEQ(n, d) {
    return (d === ONE ? n : new EQFraction(n, d));
}

//
// EQFraction: Exact rational as numerator (exact integer) and
// denominator (exact positive integer) with no factors in common.
//

function EQFraction(n, d) {
    //assert(d.SN_gt(ONE));
    //assert(gcdNonneg(n.SN_abs(), d).SN_eq(ONE));
    this._n = n;
    this._d = d;
}

EQFraction.prototype = new EQ();

DISP.EQFraction.SN_numberToString = function(radix, precision) {
    return (this._n.SN_numberToString(radix) +
            "/" + this._d.SN_numberToString(radix));
};

DISP.EQFraction.valueOf = function() {
    var n = this._n;
    var d = this._d;
    var ret = n / d;
    if (!_isNaN(ret))
        return ret;
    if (n.SN_isNegative())
        return -exp(n.SN_negate().SN_log() - d.SN_log());
    return exp(n.SN_log() - d.SN_log());
};

DISP.EQFraction.SN_debug = function() {
    return "EQFraction(" + this._n.SN_debug()
        + " / " + this._d.SN_debug() + ")";
};

DISP.EQFraction.SN_numerator = function () {
    return this._n;
};

DISP.EQFraction.SN_denominator = function() {
    return this._d;
};

DISP.EQFraction.SN_isPositive = function() {
    return this._n.SN_isPositive();
};

DISP.EQFraction.SN_isNegative = function() {
    return this._n.SN_isNegative();
};

DISP.EQFraction.SN__eq_EQ = function(q) {
    return (q.SN_numerator().SN_eq(this._n) &&
            q.SN_denominator().SN_eq(this._d));
};

DISP.EQFraction.SN__ne_EQ = function(q) {
    return (q.SN_numerator().SN_ne(this._n) ||
            q.SN_denominator().SN_ne(this._d));
};

DISP.EQFraction.SN__compare_EQ = function(q) {
    var qn = q.SN_numerator();
    var signDiff = q.SN_sign() - this._n.SN_sign();
    if (signDiff !== 0)
        return (signDiff > 0 ? 1 : -1);
    var qd = q.SN_denominator();
    if (qd === this._d)
        return qn.SN_compare(this._n);
    return qn.SN_multiply(this._d).SN_compare(qd.SN_multiply(this._n));
};

DISP.EQFraction.SN_negate = function() {
    return new EQFraction(this._n.SN_negate(), this._d);
};

DISP.EQFraction.SN_square = function() {
    return new EQFraction(this._n.SN_square(), this._d.SN_square());
};

DISP.EQFraction.SN_reciprocal = function() {
    switch (this._n.SN_sign()) {
    case -1: return canonicalEQ(this._d.SN_negate(), this._n.SN_negate());
    case 1: return canonicalEQ(this._d, this._n);
    case 0: default: divisionByExactZero();
    }
};

DISP.EQFraction.SN_floor = function() {
    return this._n.SN_div(this._d);
};

DISP.EQFraction.SN_ceiling = function() {
    //assert(this._d.SN_gt(ONE));
    return this._n.SN_div(this._d).SN_add(ONE);
};

DISP.EQFraction.SN_round = function() {
    if (this._d.SN_eq(TWO)) {
        var ret = this._n.SN_div(TWO);
        return ret.SN_isEven() ? ret : ret.SN_add(ONE);
    }
    var dm = this._n.SN_divAndMod(this._d);
    var mod = dm[1];
    if (mod.SN_add(mod).SN_lt(this._d))
        return dm[0];
    return dm[0].SN_add(ONE);
};

DISP.EQFraction.SN_truncate = function() {
    if (this._n.SN_isPositive())
        return this._n.SN_div(this._d);
    return this._d.SN_isUnit() ? this._n : this._n.SN_div(this._d).SN_add(ONE);
};

DISP.EQFraction.SN_sign = function() {
    return this._n.SN_sign();
};

DISP.EQFraction.SN_abs = function() {
    if (this._n.SN_sign() >= 0)
        return this;
    return this.SN_negate();
};

DISP.EQFraction.SN__add_EQ = function(q) {
    var n1 = q.SN_numerator();
    var d1 = q.SN_denominator();
    var n2 = this._n;
    var d2 = this._d;
    return reduceEQ(n1.SN_multiply(d2).SN_add(n2.SN_multiply(d1)),
                    d1.SN_multiply(d2));
};

DISP.EQFraction.SN__subtract_EQ = function(q) {
    var n1 = q.SN_numerator();
    var d1 = q.SN_denominator();
    var n2 = this._n;
    var d2 = this._d;
    return reduceEQ(n1.SN_multiply(d2).SN_subtract(n2.SN_multiply(d1)),
                    d1.SN_multiply(d2));
};

DISP.EQFraction.SN__multiply_EQ = function(q) {
    return reduceEQ(q.SN_numerator().SN_multiply(this._n),
                    q.SN_denominator().SN_multiply(this._d));
};

DISP.EQFraction.SN__divide_EQ = function(q) {
    return reduceEQ(q.SN_numerator().SN_multiply(this._d),
                    q.SN_denominator().SN_multiply(this._n));
};

DISP.EQFraction.SN__add_EI = function(n) {
    return canonicalEQ(n.SN_multiply(this._d).SN_add(this._n), this._d);
};

DISP.EQFraction.SN__subtract_EI = function(n) {
    return canonicalEQ(n.SN_multiply(this._d).SN_subtract(this._n), this._d);
};

DISP.EQFraction.SN__multiply_EI = function(n) {
    return reduceEQ(n.SN_multiply(this._n), this._d);
};

DISP.EQFraction.SN__divide_EI = function(n) {
    return reduceEQ(n.SN_multiply(this._d), this._n);
};

DISP.EQFraction.SN_sqrt = function() {
    // This EQ may be too big for toValue(), but its square root may not be.
    return this._n.SN_sqrt().SN_divide(this._d.SN_sqrt());
};

DISP.EQFraction.SN_log = function() {
    return this._n.SN_log().SN_subtract(this._d.SN_log());
};

//
// EI: Exact integer abstract base class.
//

function parseEI(sign, string, radix) {
    var n = _parseInt(string, radix);

    if (n < 9007199254740992)
        return toEINative(sign * n);

    return parseEIBig(string, sign, radix);
}

DISP.EI.SN_isInteger = retTrue;

DISP.EI.SN_debug = function() { return "EI"; };

DISP.EI.SN_numerator   = retThis;
DISP.EI.SN_denominator = function() { return ONE; };
DISP.EI.SN_floor       = retThis;
DISP.EI.SN_ceiling     = retThis;
DISP.EI.SN_round       = retThis;
DISP.EI.SN_truncate    = retThis;

DISP.EI.SN__toBigInteger = pureVirtual;

DISP.EI.SN_eq = function(z) {
    return z.SN__eq_EI(this);
};
DISP.EI.SN__eq_EI = function(n) {
    return n.SN__toBigInteger().compare(this.SN__toBigInteger()) === 0;
};
DISP.EI.SN__eq_EQ = function(q) {
    return q.SN_numerator().SN_eq(this) && q.SN_denominator().SN_eq(ONE);
};

DISP.EI.SN_ne = function(z) {
    return z.SN__ne_EI(this);
};
DISP.EI.SN__ne_EI = function(n) {
    return n.SN__toBigInteger().compare(this.SN__toBigInteger()) !== 0;
};
DISP.EI.SN__ne_EQ = function(q) {
    return q.SN_numerator().SN_ne(this) || q.SN_denominator().SN_ne(ONE);
};

DISP.EI.SN_compare = function(x) {
    return x.SN__compare_EI(this);
};
DISP.EI.SN__compare_EQ = function(q) {
    return q.SN_numerator().SN_compare(q.SN_denominator().SN_multiply(this));
};
DISP.EI.SN__compare_EI = function(n) {
    return n.SN__toBigInteger().compare(this.SN__toBigInteger());
};

DISP.EI.SN_add = function(z) {
    return z.SN__add_EI(this);
};
DISP.EI.SN_subtract = function(z) {
    return z.SN__subtract_EI(this);
};
DISP.EI.SN_multiply = function(z) {
    return z.SN__multiply_EI(this);
};
//DISP.EI.SN_divide = function(z) {
//    return z.SN__divide_EI(this);
//};

DISP.EI.SN_reciprocal = function() {
    if (this.SN_isNegative())
        return canonicalEQ(M_ONE, this.SN_negate());
    return canonicalEQ(ONE, this);
};

DISP.EI.SN_divAndMod = function(x) {
    return x.SN__divAndMod_EI(this);
};
DISP.EI.SN_div = function(x) {
    return x.SN__div_EI(this);
};
DISP.EI.SN_mod = function(x) {
    return x.SN__mod_EI(this);
};

DISP.EI.SN__add_EI = function(n) {
    return reduceBigInteger(n.SN__toBigInteger()
                            .add(this.SN__toBigInteger()));
};
DISP.EI.SN__subtract_EI = function(n) {
    return reduceBigInteger(n.SN__toBigInteger()
                            .subtract(this.SN__toBigInteger()));
};
DISP.EI.SN__multiply_EI = function(n) {
    return reduceBigInteger(n.SN__toBigInteger()
                            .multiply(this.SN__toBigInteger()));
};
DISP.EI.SN__divAndMod_EI = function(n) {
    var t = this.SN__toBigInteger();
    var dm = n.SN__toBigInteger().divRem(t);
    var div = dm[0];
    var mod = dm[1];

    if (mod.isNegative()) {
        mod = mod.add(t);
        div = div.prev();
    }
    return [reduceBigInteger(div), reduceBigInteger(mod)];
};
DISP.EI.SN__div_EI = function(n) {
    return this.SN__divAndMod_EI(n)[0];
};
DISP.EI.SN__mod_EI = function(n) {
    return this.SN__divAndMod_EI(n)[1];
};

DISP.EI.SN__add_EQ = function(q) {
    var d = q.SN_denominator();
    return canonicalEQ(q.SN_numerator().SN_add(d.SN_multiply(this)), d);
};

DISP.EI.SN__subtract_EQ = function(q) {
    var d = q.SN_denominator();
    return canonicalEQ(q.SN_numerator().SN_subtract(d.SN_multiply(this)), d);
};

DISP.EI.SN__multiply_EQ = function(q) {
    return reduceEQ(q.SN_numerator().SN_multiply(this), q.SN_denominator());
};

DISP.EI.SN__divide_EQ = function(q) {
    return reduceEQ(q.SN_numerator(), q.SN_denominator().SN_multiply(this));
};

DISP.EI.SN_expt = function(z) {
    return z.SN__expt_EI(this);
};

DISP.EI.SN__expt_EI = function(n) {
    // Return n to the power of this integer.

    var s = this.SN_sign();
    var p = this.SN_abs().valueOf();

    // If p != this due to inexactness, our result would exhaust memory,
    // since |n| is at least 2.  (expt is specialized for -1, 0, and 1.)
    //assert(n.SN_abs().SN_ge(2));

    var result = pow(n, p);
    var a;
    if (result > -9007199254740992 && result < 9007199254740992) {
        a = toEINative(result);
    }
    else {
        var newLog = n.SN_log() * p;
        if (newLog > SN.maxIntegerDigits * LN10)
            raise("&implementation-restriction",
                  "exact integer would exceed limit of " +
                  (+SN.maxIntegerDigits) +
                  " digits; adjust SchemeNumber.maxIntegerDigits",
                  newLog / LN10);

        a = new EIBig(n.SN__toBigInteger().pow(p));
    }
    return (s > 0 ? a : a.SN_reciprocal());
};

function expt_E_EI(z, n) {
    // Return z raised to the power of this integer.
    // We don't get here if either z or this is 0, 1, or -1.
    //assert(this.SN_abs().SN_gt(ONE));
    //assert(z.SN_magnitude().SN_gt(ONE) || !z.SN_isInteger());
    var bits = n.SN_abs();
    var squarer = z;
    var ret = ONE;
    while (bits.SN_isPositive()) {
        if (bits.SN_isOdd())
            ret = ret.SN_multiply(squarer);
        squarer = squarer.SN_square();
        bits = bits.SN_div(TWO);
    }
    return (n.SN_isNegative() ? ret.SN_reciprocal() : ret);
}

DISP.EI.SN__expt_ER = function(x) {
    return expt_E_EI(x, this);
};

DISP.EI.SN__expt_C = function(z) {
    if (z.SN_isExact())
        return expt_E_EI(z, this);
    return complexExpt(z, this);
};

//
// EINative: Exact integers as native numbers.
//

function EINative(x) {
    //assert(x === floor(x));
    this._ = x;
}

EINative.prototype = new EI();

var ZERO  = SN.ZERO  = new EINative(0);
var ONE   = SN.ONE   = new EINative(1);
var M_ONE = SN.M_ONE = new EINative(-1);
var TWO   = SN.TWO   = new EINative(2);

var EINativeSmall    = [ ZERO, ONE, TWO ];

var I     = SN.I   = new Rectangular(ZERO, ONE);
var M_I   = SN.M_I = new Rectangular(ZERO, M_ONE);

function toEINative(n) {
    //assert(floor(n) === n);
    return EINativeSmall[n] || (n == -1 ? M_ONE : new EINative(n));
}

ZERO.SN_isZero     = retTrue;
ZERO.SN_isPositive = retFalse;
ZERO.SN_isNegative = retFalse;

ZERO.SN_compare = function(x) {
    return -x.SN_sign();
};

ZERO.SN_add        = SN;
ZERO.SN_negate     = retThis;
ZERO.SN_abs        = retThis;
ZERO.SN_multiply   = retThis;
ZERO.SN_square     = retThis;
ZERO.SN_reciprocal = divisionByExactZero;

ZERO.SN_subtract = function(z) {
    return z.SN_negate();
};

ZERO.SN_divide   = function(z) {
    if (z.SN_isZero() && z.SN_isExact())
        divisionByExactZero();
    return this;
};

ZERO.SN_expt = function(z) {
    switch (z.SN_realPart().SN_sign()) {
    case 1: return this;
    case 0: return ONE;
    case -1: default: divisionByExactZero();
    }
};

ZERO.SN_sqrt = retThis;
ZERO.SN_exp = retOne;
ZERO.SN_sin = retThis;
ZERO.SN_cos = retOne;
ZERO.SN_tan = retThis;
ZERO.SN_asin = retThis;
ZERO.SN_atan = retThis;

ONE.SN_isUnit     = retTrue;
ONE.SN_abs        = retThis;
ONE.SN_multiply   = SN;
ONE.SN_reciprocal = retThis;
ONE.SN_square     = retThis;
ONE.SN_expt       = ZERO.SN_multiply;
ONE.SN_sqrt       = retThis;
ONE.SN_log        = retZero;
ONE.SN_acos       = retZero;

M_ONE.SN_isUnit     = retTrue;
M_ONE.SN_abs        = retOne;
M_ONE.SN_multiply   = ZERO.SN_subtract;
M_ONE.SN_reciprocal = retThis;
M_ONE.SN_square     = retOne;
M_ONE.SN_sqrt       = function() { return I; };

M_ONE.SN_expt = function(z) {
    if (!z.SN_isInteger())
        return complexExpt(this, z);
    var ret = (z.SN_isEven() ? ONE : M_ONE);
    if (z.SN_isExact())
        return ret;
    return ret.SN_toInexact();
}

function negate(z) {
    return z.SN_negate();
}
function reciprocal(z) {
    return z.SN_reciprocal();
}

for (className in CLASSES) {
    ZERO["SN__add_"      + className] = retFirst;
    ZERO["SN__subtract_" + className] = retFirst;
    ZERO["SN__multiply_" + className] = retThis;
    ZERO["SN__divide_"   + className] = divisionByExactZero;
    ZERO["SN__expt_"     + className] = retOne;
    ONE["SN__multiply_" + className] = retFirst;
    ONE["SN__divide_"   + className] = retFirst;
    ONE["SN__expt_"     + className] = retFirst;
    M_ONE["SN__multiply_" + className] = negate;
    M_ONE["SN__divide_"   + className] = negate;
    M_ONE["SN__expt_"     + className] = reciprocal;
}

DISP.EINative.valueOf = function() {
    return this._;
};

DISP.EINative.SN_numberToString = function(radix, precision) {
    return this._.toString(radix || 10);
};

DISP.EINative.SN_debug = function() {
    return "EINative(" + this._ + ")";
};

DISP.EINative.SN__toBigInteger = function() {
    return BigInteger(this._);
};

DISP.EINative.SN_isPositive = function() {
    return this._ > 0;
};

DISP.EINative.SN_isNegative = function() {
    return this._ < 0;
};

DISP.EINative.SN_sign = function() {
    return (this._ > 0 ? 1 : (this._ == 0 ? 0 : -1));
};

DISP.EINative.SN_isEven = function() {
    return (this._ & 1) === 0;
};

DISP.EINative.SN_isOdd = function() {
    return (this._ & 1) === 1;
};

DISP.EINative.SN_eq = function(z) {
    return z.SN__eq_EINative(this);
};
DISP.EINative.SN__eq_EINative = function(n) {
    return n._ === this._;
};

DISP.EINative.SN_ne = function(z) {
    return z.SN__ne_EINative(this);
};
DISP.EINative.SN__ne_EINative = function(n) {
    return n._ !== this._;
};

DISP.EINative.SN_compare = function(x) {
    return x.SN__compare_EINative(this);
};
DISP.EINative.SN__compare_EINative = function(n) {
    return (n._ === this._ ? 0 : (n._ > this._ ? 1 : -1));
};

function add_EINative_EINative(a, b) {
    var ret = a + b;
    if (ret > -9007199254740992 && ret < 9007199254740992)
        return toEINative(ret);
    return new EIBig(BigInteger.add(a, b));
}

DISP.EINative.SN_add = function(z) {
    return z.SN__add_EINative(this);
};
DISP.EINative.SN__add_EINative = function(n) {
    return add_EINative_EINative(n._, this._);
};

DISP.EINative.SN_negate = function() {
    return toEINative(-this._);
};

DISP.EINative.SN_abs = function() {
    return (this._ < 0 ? toEINative(-this._) : this);
};

DISP.EINative.SN_subtract = function(z) {
    return z.SN__subtract_EINative(this);
};
DISP.EINative.SN__subtract_EINative = function(n) {
    return add_EINative_EINative(n._, -this._);
};

DISP.EINative.SN_multiply = function(z) {
    return z.SN__multiply_EINative(this);
};
DISP.EINative.SN__multiply_EINative = function(n) {
    var ret = n._ * this._;
    if (ret > -9007199254740992 && ret < 9007199254740992)
        return toEINative(ret);
    return new EIBig(BigInteger(n._).multiply(this._));
};

DISP.EINative.SN_square = function() {
    var ret = this._ * this._;
    if (ret < 9007199254740992)
        return toEINative(ret);
    return new EIBig(BigInteger(this._).square());
};

DISP.EINative.SN_reciprocal = function() {
    var x = this._;
    assert(x !== 0);
    /*
    if (x === 0)  // Removed this check, since ZERO overrides.
        throw divisionByExactZero();
    if (x === 1 || x === -1)  // Removed this optimization, similar reason.
        return this;
    */
    if (x < 0)
        return canonicalEQ(M_ONE, toEINative(-x));
    return canonicalEQ(ONE, this);
};

function divAndMod_EINative(t, x, which) {
    if (x === 0)
        divisionByExactZero();

    var div = (x > 0 ? floor(t / x) : ceil(t / x));
    if (which === 0)
        return toEINative(div);

    var tmp = x * div;
    var mod;

    if (tmp > -9007199254740992)
        mod = t - tmp;
    else if (div > 0)
        mod = (t - x) - (x * (div - 1));
    else
        mod = (t + x) - (x * (div + 1));

    mod = toEINative(mod);
    if (which === 1)
        return mod;

    return [toEINative(div), mod];
};

DISP.EINative.SN_div = function(x) {
    return x.SN__div_EINative(this);
};
DISP.EINative.SN__div_EINative = function(n) {
    return divAndMod_EINative(n._, this._, 0);
};

DISP.EINative.SN_mod = function(x) {
    return x.SN__mod_EINative(this);
};
DISP.EINative.SN__mod_EINative = function(n) {
    return divAndMod_EINative(n._, this._, 1);
};

DISP.EINative.SN_divAndMod = function(x) {
    return x.SN__divAndMod_EINative(this);
};
DISP.EINative.SN__divAndMod_EINative = function(n) {
    return divAndMod_EINative(n._, this._, 2);
};

DISP.EINative.SN__exp10 = function(n) {
    if (this._ === 0 || n === 0)
        return this;

    if (n < 0) {
        var num = String(this._);
        var i = num.length - 1;

        if (num[i] === '0') {
            while (num[i] === '0' && n < 0) {
                n += 1;
                i -= 1;
            }
            num = toEINative(Number(num.substring(0, i + 1)));
            if (n === 0)
                return num;
        }
        else {
            num = this;
        }

        var den;
        if (n < -15)
            den = new EIBig(BigInteger.ONE.exp10(-n));
        else
            // Could make this an array lookup.
            den = toEINative(Number("1000000000000000".substring(0, 1 - n)));
        return reduceEQ(num, den);
    }
    if (n < 16) {
        // Could make substring+parseInt an array lookup.
        var result = _parseInt("1000000000000000".substring(0, n + 1)) * this._;
        if (result > -9007199254740992 && result < 9007199254740992)
            return toEINative(result);
    }
    return new EIBig(BigInteger(this._).exp10(n));
};

DISP.EINative.SN_exactIntegerSqrt = function() {
    var n = floor(sqrt(assertNonNegative(this)._));
    return [toEINative(n), toEINative(this._ - n * n)];
};

//
// EIBig: Exact integer as a BigInteger.
//

// 2 to the power 53, top of the range of consecutive integers
// representable exactly as native numbers.
var FIRST_BIG_INTEGER = BigInteger(9007199254740992);

function reduceBigInteger(n) {
    if (n.compareAbs(FIRST_BIG_INTEGER) >= 0)
        return new EIBig(n);
    return toEINative(n.toJSValue());
}

function EIBig(n) {
    this._ = n;
}

EIBig.prototype = new EI();

function parseEIBig(s, sign, radix) {
    n = BigInteger.parse(s, radix);
    if (sign < 0)
        n = n.negate();
    return new EIBig(n);
}

DISP.EIBig.SN_numberToString = function(radix) {
    return this._.toString(radix);
};

DISP.EIBig.valueOf = function() {
    return this._.valueOf();
};

["isZero", "isEven", "isOdd", "sign", "isUnit", "isPositive", "isNegative"]
    .forEach(function(fn) {
            DISP.EIBig["SN_" + fn] = function() {
                return this._[fn]();
            };
        });

DISP.EIBig.SN_log = function() {
    var x = toFlonum(this._.abs().log());
    return this._.isPositive() ? x : inexactRectangular(x, PI);
};

DISP.EIBig.SN_debug = function() {
    return "EIBig(" + this._.toString() + ")";
};

DISP.EIBig.SN__toBigInteger = function() {
    return this._;
};

DISP.EIBig.SN_add = function(z) {
    return z.SN__add_EIBig(this);
};

DISP.EIBig.SN_negate = function() {
    return new EIBig(this._.negate());
};

DISP.EIBig.SN_abs = function() {
    return new EIBig(this._.abs());
};

DISP.EIBig.SN_subtract = function(z) {
    return z.SN__subtract_EIBig(this);
};

DISP.EIBig.SN_multiply = function(z) {
    return z.SN__multiply_EIBig(this);
};

DISP.EIBig.SN_square = function() {
    return new EIBig(this._.square());
};

DISP.EIBig.SN__exp10 = function(n) {
    //assert(n === floor(n));
    if (n === 0)
        return this;
    if (n > 0)
        return new EIBig(this._.exp10(n));
    return reduceEQ(this, ONE.SN__exp10(-n));
};

DISP.EIBig.SN_sqrt = function() {
    //assert(!this.SN_isZero());
    var mag = toFlonum(exp(this._.abs().log() / 2));
    return (this._.isNegative() ? inexactRectangular(INEXACT_ZERO, mag) : mag);
};

DISP.EIBig.SN_exactIntegerSqrt = function() {

    // I know of no use cases for this.  Be stupid.  Be correct.

    //assert(this._.compareAbs(FIRST_BIG_INTEGER) >= 0);

    function doit(n, a) {
        while (true) {
            var dm = n.divRem(a);
            var b = dm[0];
            var diff = a.subtract(b); // n == b*b + b*diff + dm[1], dm[1] < b+1

            if (diff.isZero())
                return [ b, dm[1] ]; // n == b*b + dm[1]

            if (diff.isUnit()) {
                if (diff.isPositive())
                    // n == b*b + b + dm[1], dm[1] < b+1
                    return [ b, b.add(dm[1]) ];

                // n == b*b - b + dm[1] == (b-1)^2 + b - 1 + dm[1]
                return [ a, a.add(dm[1]) ];
            }

            a = b.add(diff.quotient(2));
        }
    }

    var l = assertNonNegative(this)._.log() / 2 / LN10;
    var a = BigInteger(pow(10, l - floor(l)).toString()
                       + "e" + floor(l));
    return doit(this._, a).map(reduceBigInteger);
};

function gcdNative(a, b) {
    //assert(a >= 0 && b >= 0)
    var c;
    while (a !== 0) {
        c = a;
        a = b % a;
        b = c;
    }
    return toEINative(b);
}

// a and b must be nonnegative, exact integers.
function gcdNonneg(a, b) {
    //assert(!a.SN_isNegative());
    //assert(!b.SN_isNegative());
    //assert(a instanceof EI);
    //assert(b instanceof EI);
    if (a instanceof EINative && b instanceof EINative)
        return gcdNative(a.valueOf(), b.valueOf());

    a = a.SN__toBigInteger();
    if (a.isZero())
        return b;

    b = b.SN__toBigInteger();
    var c;

    while (true) {
        c = a;
        a = b.remainder(a);
        if (a.isZero())
            return new EIBig(c);
        b = c;
        if (b.compareAbs(FIRST_BIG_INTEGER) < 0)
            return gcdNative(a.valueOf(), b.valueOf());
    }
}

function numberToBigInteger(n) {
    return BigInteger.parse(n.toString(16), 16);
}

//
// Inheritance plumbing.
//

/*
function showMethodClasses() {
    var map = {};
    for (var className in DISP)
        for (var methName in DISP[className])
            (map[methName] = map[methName] || {})[className] = DISP[className][methName];
    for (var methName in map)
        for (var className in map[methName])
            print(className + "." + methName + (map[methName][className] === pureVirtual ? " =0" : ""));
}
showMethodClasses();
*/

function resolveOverload(className) {
    var proto = DISP[className];
    var newMethods = {};

    function resolve(subclasses, prefix, method) {
        function resolveSub(subclass) {
            if (proto[prefix + subclass])
                return;
            //print(className + "." + prefix + subclass + " -> " + oldName);
            newMethods[prefix + subclass] = method;
            resolve(HIERARCHY[subclass], prefix, method);
        }
        if (subclasses)
            subclasses.forEach(resolveSub);
    }

    for (var oldName in proto) {
        if (!/^SN_/.test(oldName))
            continue;

        var underscore = oldName.lastIndexOf("_");
        if (underscore === -1)
            continue;

        var oldMethod = proto[oldName];
        if (!oldMethod) {
            //print("Bogus " + className + ".prototype." + oldName);
            continue;
        }

        var oldClass = oldName.substring(underscore + 1);

        resolve(HIERARCHY[oldClass],
                oldName.substring(0, underscore + 1),
                oldMethod);
    }

    for (var methodName in newMethods) {
        proto[methodName] = newMethods[methodName];
    }
}

for (var className in CLASSES)
    resolveOverload(className);

if (Flonum === Number) {
    // Workaround for Flonum not inheriting from R.
    for (var methodName in DISP.R) {
        if (/^SN_/.test(methodName) && !DISP.Flonum[methodName])
            DISP.Flonum[methodName] = DISP.R[methodName];
    }

    // Workaround for Flonum not inheriting from C.
    for (var methodName in DISP.C) {
        if (/^SN_/.test(methodName) && !DISP.Flonum[methodName])
            DISP.Flonum[methodName] = DISP.C[methodName];
    }

    // Workaround for C inheriting from Flonum.
    for (var methodName in DISP.Flonum) {
        if (!DISP.C[methodName])
            DISP.C[methodName] = unimpl;
    }
}

// Install methods.
for (var className in CLASSES) {
    for (var methodName in DISP[className]) {
        CLASSES[className].prototype[methodName] = DISP[className][methodName];
    }
}

function checkPureVirtual(handler) {
    var e = "";
    for (var className in CLASSES) {
        if (!/[a-z]/.test(className)) {
            // Not a concrete class.
            continue;
        }
        var proto = CLASSES[className].prototype;
        for (methodName in proto) {
            if (proto[methodName] === pureVirtual)
                e += "Pure virtual: " + className + "." + methodName + "\n";
        }
    }
    if (e) {
        handler(e);
    }
}
checkPureVirtual(this.alert || this.print || function(e) {throw e;});

return SN;

})();

if (typeof exports !== "undefined") {
    exports.SchemeNumber = SchemeNumber;
    for (var name in SchemeNumber.fn)
        exports[name] = SchemeNumber.fn[name];
}

// load for testing: load("biginteger.js");load("schemeNumber.js");sn=SchemeNumber;fn=sn.fn;ns=fn["number->string"];1

/*
  Export to plugins: N C R ER EQ EI pureVirtual <everything gotten from plugins>
  raise

  Get from plugins: toFlonum parseEI toEINative
  parseDecimal exactRectangular inexactRectangular makePolar
 */

},{"biginteger":3}],2:[function(require,module,exports){

/*
 * These models are very heavily based on their JavaRosa counterparts, which live at:
 * https://bitbucket.org/javarosa/javarosa/src/tip/core/src/org/javarosa/xpath/expr/
 *
 */

var SchemeNumber = require('./lib/schemeNumber.js').SchemeNumber;

if (!Function.prototype.bind) {
    // PhantomJS doesn't support bind yet
    Function.prototype.bind = function(oThis) {
        if (typeof this !== 'function') {
            // closest thing possible to the ECMAScript 5
            // internal IsCallable function
            throw new TypeError('Function.prototype.bind - what is trying to be bound is not callable');
        }

        var aArgs   = Array.prototype.slice.call(arguments, 1),
            fToBind = this,
            fNOP    = function() {},
            fBound  = function() {
                return fToBind.apply(this instanceof fNOP ? this : oThis,
                                     aArgs.concat(Array.prototype.slice.call(arguments)));
            };

        fNOP.prototype = this.prototype;
        fBound.prototype = new fNOP();

        return fBound;
    };
}

var defaultHashtagConfig = {
    // @param namespace - the namespace used in hashtag
    // @return - truthy value
    isValidNamespace: function (namespace) {
        return false;
    },
    // @param hashtagExpr - text of hashtag ex. #form/question
    // @return - the XPath or falsy value if no corresponding XPath found
    hashtagToXPath: function (hashtagExpr) {
        throw new Error("This should be overridden");
    },
    // @param xpath_ - XPath object (can be any of the objects defined in xpm
    // @returns - text representation of XPath in hashtag format (default
    //            implementation is to just return the XPath)
    toHashtag: function (xpath_) {
        return xpath_.toXPath();
    },
};

var makeXPathModels = function(hashtagConfig) {
    var xpm = {};
    xpm.DEBUG_MODE = false;
    hashtagConfig = hashtagConfig || defaultHashtagConfig;

    xpm.debuglog = function () {
        if (xpm.DEBUG_MODE) {
            var string = "";
            Array.prototype.slice.call(arguments).forEach(function (value) {
                string += value + ", ";
            });
            console.log(string);
        }
    };

    xpm.validateAxisName = function(name) {
        for (var i in xpm.XPathAxisEnum) {
            if (xpm.XPathAxisEnum.hasOwnProperty(i) && xpm.XPathAxisEnum[i] === name) {
                return xpm.XPathAxisEnum[i];
            }
        }
        throw name + " is not a valid axis name!";
    };

    // helper function
    var objToXPath = function(something) {
        return something.toXPath();
    };

    var objToHashtag = function (xpath_) {
        if (xpath_ instanceof xpm.HashtagExpr) {
            return xpath_.toHashtag();
        }
        return hashtagConfig.toHashtag(xpath_) || xpath_.toHashtag();
    };

    var objToHashtagWithCombine = function(self, combineFunc) {
        return function () {
            return hashtagConfig.toHashtag(self) || combineFunc(objToHashtag).bind(self)();
        };
    };

    xpm.XPathNumericLiteral = function(value) {
        /*
         * This is shockingly complicated for what should be simple thanks to
         * javascript number arithmetic.
         *
         * Use the big number library to hold the value, which will hold
         * large integers properly. For everything else, do the best rounding
         * we can when exporting, since xpath doesn't like scientific notation
         *
         */
        this.value = SchemeNumber(value);
        this.toString = function() {
            return "{num:" + this.value.toString() + "}";
        };
        this.toXPath = function() {
            // helper function
            var toFixed = function (x) {
              /*
               * Convert scientific notation formatted numbers to their decimal
               * counterparts
               *
               * HT: http://stackoverflow.com/questions/1685680/how-to-avoid-scientific-notation-for-large-numbers-in-javascript
               */
              var e;
              if (x < 1.0) {
                e = parseInt(x.toString().split('e-')[1]);
                if (e) {
                    x *= Math.pow(10,e-1);
                    x = '0.' + (new Array(e)).join('0') + x.toString().substring(2);
                }
              } else {
                e = parseInt(x.toString().split('+')[1]);
                if (e > 20) {
                    e -= 20;
                    x /= Math.pow(10,e);
                    x += (new Array(e+1)).join('0');
                }
              }
              return x;
            };
            return toFixed(this.value.toString());
        };
        this.toHashtag = this.toXPath;
        this.getChildren = function () {
           return [];
        };
        return this;
    };

    xpm.XPathStringLiteral = function(value) {
        var stringDelim = value[0];
        this.value = value = value.substr(1, value.length-2);
        this.stringDelim = stringDelim;

        var toXPathString = function(value) {
            return stringDelim + value + stringDelim;
        };

        this.valueDisplay = toXPathString(value);
        this.toString = function() {
            return "{str:" + this.valueDisplay + "}";
        };
        this.toXPath = function() {
            return this.valueDisplay;
        };
        this.toHashtag = this.toXPath;
        this.getChildren = function () {
           return [];
        };
        return this;
    };

    xpm.XPathVariableReference = function(value) {
        this.value = value;
        this.toString = function() {
            return "{var:" + String(this.value) + "}";
        };
        this.toXPath = function() {
            return "$" + String(this.value);
        };
        this.toHashtag = this.toXPath;
        this.getChildren = function () {
           return [];
        };
    };

    xpm.XPathAxisEnum = {
        CHILD: "child",
        DESCENDANT: "descendant",
        PARENT: "parent",
        ANCESTOR: "ancestor",
        FOLLOWING_SIBLING: "following-sibling",
        PRECEDING_SIBLING: "preceding-sibling",
        FOLLOWING: "following",
        PRECEDING: "preceding",
        ATTRIBUTE: "attribute",
        NAMESPACE: "namespace",
        SELF: "self",
        DESCENDANT_OR_SELF: "descendant-or-self",
        ANCESTOR_OR_SELF: "ancestor-or-self"
    };

    xpm.XPathTestEnum = {
        NAME: "name",
        NAME_WILDCARD: "*",
        NAMESPACE_WILDCARD: ":*",
        TYPE_NODE: "node()",
        TYPE_TEXT: "text()",
        TYPE_COMMENT: "comment()",
        TYPE_PROCESSING_INSTRUCTION: "processing-instruction"

    };

    xpm.XPathStep = function(definition) {
        /*
         * A step (part of a path)
         *
         */
        this.axis = definition.axis;
        this.test = definition.test;
        this.predicates = definition.predicates || [];
        this.name = definition.name;
        this.namespace = definition.namespace;
        this.literal = definition.literal;

        this.testString = function () {
             switch(this.test) {
                case xpm.XPathTestEnum.NAME:
                    return String(this.name);
                case xpm.XPathTestEnum.TYPE_PROCESSING_INSTRUCTION:
                    return "processing-instruction(" + (this.literal || "") + ")";
                case xpm.XPathTestEnum.NAMESPACE_WILDCARD:
                    return this.namespace + ":*";
                default:
                    return this.test || null;
             }
        };

        this.toString = function() {
            var stringArray = [];

            stringArray.push("{step:");
            stringArray.push(String(this.axis));
            stringArray.push(",");
            stringArray.push(this.testString());
            if (this.predicates.length > 0) {
                stringArray.push(",{");
                stringArray.push(this.predicates.join(","));
                stringArray.push("}");
            }

            stringArray.push("}");
            return stringArray.join("");
        };

        this.mainXPath = function () {
            var axisPrefix = this.axis + "::"; // this is the default
            // Use the abbreviated syntax to shorten the axis
            // or in some cases the whole thing
            switch (this.axis) {
                case xpm.XPathAxisEnum.DESCENDANT_OR_SELF:
                    if (this.test === xpm.XPathTestEnum.TYPE_NODE) {
                        return "//";
                    }
                    break;
                case xpm.XPathAxisEnum.CHILD:
                    axisPrefix = ""; // this is the default
                    break;
                case xpm.XPathAxisEnum.ATTRIBUTE:
                    axisPrefix = "@";
                    break;
                case xpm.XPathAxisEnum.SELF:
                    if (this.test === xpm.XPathTestEnum.TYPE_NODE) {
                        return ".";
                    }
                    break;
                case xpm.XPathAxisEnum.PARENT:
                    if (this.test === xpm.XPathTestEnum.TYPE_NODE) {
                        return "..";
                    }
                    break;
                default:
                   break;
            }
            return axisPrefix + this.testString();
        };
        this.predicateXPath = function (func) {
            if (this.predicates.length > 0) {
                return "[" + this.predicates.map(func).join("][") + "]";
            }
            return "";
        };
        function _combine (transFunc) {
            return function() {
                return this.mainXPath() + this.predicateXPath(transFunc);
            };
        }
        this.toXPath = _combine(objToXPath);
        this.toHashtag = objToHashtagWithCombine(this, _combine);
        this.getChildren = function () {
           return [];
        };

        return this;
    };

    xpm.XPathInitialContextEnum = {
        HASHTAG: "hashtag",
        ROOT: "abs",
        RELATIVE: "rel",
        EXPR: "expr"
    };

    xpm.XPathPathExpr = function(definition) {
        /**
         * an XPath path, which consists mainly of steps
         */
        var self = this;
        this.initial_context = definition.initial_context;
        this.steps = definition.steps || [];
        this.filter = definition.filter;
        this.toString = function() {
            var stringArray = [];
            stringArray.push("{path-expr:");
            stringArray.push(this.initial_context === xpm.XPathInitialContextEnum.EXPR ?
                             String(this.filter) : this.initial_context);
            stringArray.push(",{");
            stringArray.push(this.steps.join(","));
            stringArray.push("}}");
            return stringArray.join("");
        };
        var _combine = function (func) {
            return function () {
                // this helper function only exists so that
                // the two methods below it can call itx
                var parts = self.steps.map(func), ret = [], curPart, prevPart, sep;
                var root = (self.initial_context === xpm.XPathInitialContextEnum.ROOT) ? "/" : "";
                if (self.filter) {
                    parts.splice(0, 0, func(self.filter));
                }
                if (parts.length === 0) {
                    return root;
                }
                for (var i = 0; i < parts.length; i ++) {
                    curPart = parts[i];
                    if (curPart !== "//" && prevPart !== "//") {
                        // unless the current part starts with a slash, put slashes between
                        // parts. the only exception to this rule is at the beginning,
                        // when we only use a slash if it's an absolute path
                        sep = (i === 0) ? root : "/";
                        ret.push(sep);
                    }
                    ret.push(curPart);
                    prevPart = curPart;
                }
                return ret.join("");
            };
        };
        this.toXPath = _combine(objToXPath);
        this.toHashtag = objToHashtagWithCombine(this, _combine);
        // custom function to pull out any filters and just return the root path
        this.pathWithoutPredicates = _combine(function (step) { return step.mainXPath(); });

        this.getChildren = function () {
           return this.steps;
        };

        return this;
    };

    xpm.XPathFuncExpr = function (definition) {
        /**
         * Representation of an xpath function expression.
         */
        this.id = definition.id;                 //name of the function
        this.args = definition.args || [];       //argument list
        this.toString = function() {
            var stringArray = [];
            stringArray.push("{func-expr:", String(this.id), ",{");
            stringArray.push(this.args.join(","));
            stringArray.push("}}");
            return stringArray.join("");
        };
        function _combine (transFunc) {
            return function () {
                return this.id + "(" + this.args.map(transFunc).join(", ") + ")";
            };
        }
        this.toXPath = _combine(objToXPath);
        this.toHashtag = objToHashtagWithCombine(this, _combine);
        this.getChildren = function () {
           return this.args;
        };
        return this;
    };

    xpm.XPathFilterExpr = function (definition) {
        /**
         * Representation of an xpath filter expression.
         */
        this.expr = definition.expr;
        this.predicates = definition.predicates || [];
        this.toString = function() {
            var stringArray = [];
            stringArray.push("{filt-expr:", this.expr.toString(), ",{");
            stringArray.push(this.predicates.join(","));
            stringArray.push("}}");
            return stringArray.join("");
        };
        function _combine(transFunc) {
            return function() {
                var predicates = "";
                if (this.predicates.length > 0) {
                    predicates = "[" + this.predicates.map(transFunc).join("][") + "]";
                }
                var expr = objToXPath(this.expr);
                // FIXME should all non-function expressions be parenthesized?
                if (!(this.expr instanceof xpm.XPathFuncExpr)) {
                    expr = "(" + expr + ")";
                }
                return expr + predicates;
            };
        }
        this.toXPath = _combine(objToXPath);
        this.toHashtag = objToHashtagWithCombine(this, _combine);
        this.getChildren = function () {
           return this.predicates;
        };
        return this;
    };

    xpm.HashtagExpr = function (definition) {
        /**
         * an extension of xpath that's not really an xpath
         */
        var self = this;
        this.initial_context = definition.initial_context;
        if (!hashtagConfig.isValidNamespace(definition.namespace)) {
            throw new Error(definition.namespace + " is not a valid # expression");
        }
        this.namespace = definition.namespace;
        this.steps = definition.steps || [];
        this.toString = function() {
            var stringArray = [];
            stringArray.push("{hashtag-expr:");
            stringArray.push(this.namespace);
            stringArray.push(",{");
            stringArray.push(this.steps.join(","));
            stringArray.push("}}");
            return stringArray.join("");
        };
        var _combine = function () {
            var parts = [self.namespace].concat(self.steps),
                ret = [];
            for (var i = 0; i < parts.length; i ++) {
                // hashtag to start then /
                ret.push((i === 0) ? '#' : "/");
                ret.push(parts[i]);
            }
            return ret.join("");
        };
        this.toXPath = function () {
            return hashtagConfig.hashtagToXPath(this.toHashtag());
        };
        this.toHashtag = _combine;
        this.getChildren = function () {
           return [];
        };

        return this;
    };

    // expressions
    xpm.XPathExpressionTypeEnum = {
        /*
         * These aren't yet really used anywhere, but they are correct.
         * They correlate with the "type" field in the parser for ops.
         *
         */
        AND: "and",
        OR: "or",
        EQ: "==",
        NEQ: "!=",
        LT: "<",
        LTE: "<=",
        GT: ">",
        GTE: ">=",
        PLUS: "+",
        MINUS: "-",
        MULT: "*",
        DIV: "/",
        MOD: "%",
        UMINUS: "num-neg",
        UNION: "union"
    };

    var expressionTypeEnumToXPathLiteral = xpm.expressionTypeEnumToXPathLiteral = function (val) {
        switch (val) {
            case xpm.XPathExpressionTypeEnum.EQ:
                return "=";
            case xpm.XPathExpressionTypeEnum.MOD:
                return "mod";
            case xpm.XPathExpressionTypeEnum.DIV:
                return "div";
            case xpm.XPathExpressionTypeEnum.UMINUS:
                return "-";
            case xpm.XPathExpressionTypeEnum.UNION:
                return "|";
            default:
                return val;
        }
    };

    var binOpToString = function() {
        return "{binop-expr:" + this.type + "," + String(this.left) + "," + String(this.right) + "}";
    };

    var isOp = xpm.isOp = function(someToken) {
        /*
         * Whether something is an operation
         */
        // this is probably breaking an abstraction layer.
        var str = someToken.toString();
        return str.indexOf("{binop-expr:") === 0 || str.indexOf("{unop-expr:") === 0;
    };

    var isLiteral = xpm.isLiteral = function(someToken) {
        return (someToken instanceof xpm.XPathNumericLiteral ||
                someToken instanceof xpm.XPathStringLiteral ||
                someToken instanceof xpm.XPathPathExpr);
    };

    var isSimpleOp = xpm.isSimpleOp = function(someToken) {
        return isOp(someToken) && isLiteral(someToken.left) && isLiteral(someToken.right);
    };

    function printBinOp (func) {
        return function () {
            var ret = func(this.left) + " " + expressionTypeEnumToXPathLiteral(this.type) + " " + func(this.right);
            if (this.parens === true) {
                return "(" + ret + ")";
            }
            return ret;
        };
    }

    var binOpToXPath = printBinOp(objToXPath);
    var binOpToHashtag = printBinOp(objToHashtag);

    var binOpChildren = function () {
        return [this.left, this.right];
    };

    xpm.XPathBoolExpr = function(definition) {
        this.type = definition.type;
        this.left = definition.left;
        this.right = definition.right;
        this.toString = binOpToString;
        this.toXPath = binOpToXPath;
        this.toHashtag = binOpToHashtag.bind(this);
        this.getChildren = binOpChildren;
        return this;
    };

    xpm.XPathEqExpr = function(definition) {
        this.type = definition.type;
        this.left = definition.left;
        this.right = definition.right;
        this.toString = binOpToString;
        this.toXPath = binOpToXPath;
        this.toHashtag = binOpToHashtag.bind(this);
        this.getChildren = binOpChildren;
        return this;
    };

    xpm.XPathCmpExpr = function(definition) {
        this.type = definition.type;
        this.left = definition.left;
        this.right = definition.right;
        this.toString = binOpToString;
        this.toXPath = binOpToXPath;
        this.toHashtag = binOpToHashtag.bind(this);
        this.getChildren = binOpChildren;
        return this;
    };

    xpm.XPathArithExpr = function(definition) {
        this.type = definition.type;
        this.left = definition.left;
        this.right = definition.right;
        this.toString = binOpToString;
        this.toXPath = binOpToXPath;
        this.toHashtag = binOpToHashtag.bind(this);
        this.getChildren = binOpChildren;
        return this;
    };

    xpm.XPathUnionExpr = function(definition) {
        this.type = definition.type;
        this.left = definition.left;
        this.right = definition.right;
        this.toString = binOpToString;
        this.toXPath = binOpToXPath;
        this.toHashtag = binOpToHashtag.bind(this);
        this.getChildren = binOpChildren;
        return this;
    };

    xpm.XPathNumNegExpr = function(definition) {
        this.type = definition.type;
        this.value = definition.value;
        this.toString = function() {
            return "{unop-expr:" + this.type + "," + String(this.value) + "}";
        };
        function _combine(transFunc) {
            return function() {
                return "-" + transFunc(this.value);
            };
        }
        this.toXPath = _combine(objToXPath);
        this.toHashtag = _combine(objToHashtag);
        this.getChildren = function () {
           return [this.value];
        };
        return this;
    };

    return xpm;
};

if (typeof require !== 'undefined' && typeof exports !== 'undefined') {
    exports.makeXPathModels = makeXPathModels;
}

},{"./lib/schemeNumber.js":1}],3:[function(require,module,exports){
/*
	JavaScript BigInteger library version 0.9
	http://silentmatt.com/biginteger/

	Copyright (c) 2009 Matthew Crumley <email@matthewcrumley.com>
	Copyright (c) 2010,2011 by John Tobey <John.Tobey@gmail.com>
	Licensed under the MIT license.

	Support for arbitrary internal representation base was added by
	Vitaly Magerya.
*/

/*
	File: biginteger.js

	Exports:

		<BigInteger>
*/
(function(exports) {
"use strict";
/*
	Class: BigInteger
	An arbitrarily-large integer.

	<BigInteger> objects should be considered immutable. None of the "built-in"
	methods modify *this* or their arguments. All properties should be
	considered private.

	All the methods of <BigInteger> instances can be called "statically". The
	static versions are convenient if you don't already have a <BigInteger>
	object.

	As an example, these calls are equivalent.

	> BigInteger(4).multiply(5); // returns BigInteger(20);
	> BigInteger.multiply(4, 5); // returns BigInteger(20);

	> var a = 42;
	> var a = BigInteger.toJSValue("0b101010"); // Not completely useless...
*/

var CONSTRUCT = {}; // Unique token to call "private" version of constructor

/*
	Constructor: BigInteger()
	Convert a value to a <BigInteger>.

	Although <BigInteger()> is the constructor for <BigInteger> objects, it is
	best not to call it as a constructor. If *n* is a <BigInteger> object, it is
	simply returned as-is. Otherwise, <BigInteger()> is equivalent to <parse>
	without a radix argument.

	> var n0 = BigInteger();      // Same as <BigInteger.ZERO>
	> var n1 = BigInteger("123"); // Create a new <BigInteger> with value 123
	> var n2 = BigInteger(123);   // Create a new <BigInteger> with value 123
	> var n3 = BigInteger(n2);    // Return n2, unchanged

	The constructor form only takes an array and a sign. *n* must be an
	array of numbers in little-endian order, where each digit is between 0
	and BigInteger.base.  The second parameter sets the sign: -1 for
	negative, +1 for positive, or 0 for zero. The array is *not copied and
	may be modified*. If the array contains only zeros, the sign parameter
	is ignored and is forced to zero.

	> new BigInteger([5], -1): create a new BigInteger with value -5

	Parameters:

		n - Value to convert to a <BigInteger>.

	Returns:

		A <BigInteger> value.

	See Also:

		<parse>, <BigInteger>
*/
function BigInteger(n, s, token) {
	if (token !== CONSTRUCT) {
		if (n instanceof BigInteger) {
			return n;
		}
		else if (typeof n === "undefined") {
			return ZERO;
		}
		return BigInteger.parse(n);
	}

	n = n || [];  // Provide the nullary constructor for subclasses.
	while (n.length && !n[n.length - 1]) {
		--n.length;
	}
	this._d = n;
	this._s = n.length ? (s || 1) : 0;
}

BigInteger._construct = function(n, s) {
	return new BigInteger(n, s, CONSTRUCT);
};

// Base-10 speedup hacks in parse, toString, exp10 and log functions
// require base to be a power of 10. 10^7 is the largest such power
// that won't cause a precision loss when digits are multiplied.
var BigInteger_base = 10000000;
var BigInteger_base_log10 = 7;

BigInteger.base = BigInteger_base;
BigInteger.base_log10 = BigInteger_base_log10;

var ZERO = new BigInteger([], 0, CONSTRUCT);
// Constant: ZERO
// <BigInteger> 0.
BigInteger.ZERO = ZERO;

var ONE = new BigInteger([1], 1, CONSTRUCT);
// Constant: ONE
// <BigInteger> 1.
BigInteger.ONE = ONE;

var M_ONE = new BigInteger(ONE._d, -1, CONSTRUCT);
// Constant: M_ONE
// <BigInteger> -1.
BigInteger.M_ONE = M_ONE;

// Constant: _0
// Shortcut for <ZERO>.
BigInteger._0 = ZERO;

// Constant: _1
// Shortcut for <ONE>.
BigInteger._1 = ONE;

/*
	Constant: small
	Array of <BigIntegers> from 0 to 36.

	These are used internally for parsing, but useful when you need a "small"
	<BigInteger>.

	See Also:

		<ZERO>, <ONE>, <_0>, <_1>
*/
BigInteger.small = [
	ZERO,
	ONE,
	/* Assuming BigInteger_base > 36 */
	new BigInteger( [2], 1, CONSTRUCT),
	new BigInteger( [3], 1, CONSTRUCT),
	new BigInteger( [4], 1, CONSTRUCT),
	new BigInteger( [5], 1, CONSTRUCT),
	new BigInteger( [6], 1, CONSTRUCT),
	new BigInteger( [7], 1, CONSTRUCT),
	new BigInteger( [8], 1, CONSTRUCT),
	new BigInteger( [9], 1, CONSTRUCT),
	new BigInteger([10], 1, CONSTRUCT),
	new BigInteger([11], 1, CONSTRUCT),
	new BigInteger([12], 1, CONSTRUCT),
	new BigInteger([13], 1, CONSTRUCT),
	new BigInteger([14], 1, CONSTRUCT),
	new BigInteger([15], 1, CONSTRUCT),
	new BigInteger([16], 1, CONSTRUCT),
	new BigInteger([17], 1, CONSTRUCT),
	new BigInteger([18], 1, CONSTRUCT),
	new BigInteger([19], 1, CONSTRUCT),
	new BigInteger([20], 1, CONSTRUCT),
	new BigInteger([21], 1, CONSTRUCT),
	new BigInteger([22], 1, CONSTRUCT),
	new BigInteger([23], 1, CONSTRUCT),
	new BigInteger([24], 1, CONSTRUCT),
	new BigInteger([25], 1, CONSTRUCT),
	new BigInteger([26], 1, CONSTRUCT),
	new BigInteger([27], 1, CONSTRUCT),
	new BigInteger([28], 1, CONSTRUCT),
	new BigInteger([29], 1, CONSTRUCT),
	new BigInteger([30], 1, CONSTRUCT),
	new BigInteger([31], 1, CONSTRUCT),
	new BigInteger([32], 1, CONSTRUCT),
	new BigInteger([33], 1, CONSTRUCT),
	new BigInteger([34], 1, CONSTRUCT),
	new BigInteger([35], 1, CONSTRUCT),
	new BigInteger([36], 1, CONSTRUCT)
];

// Used for parsing/radix conversion
BigInteger.digits = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

/*
	Method: toString
	Convert a <BigInteger> to a string.

	When *base* is greater than 10, letters are upper case.

	Parameters:

		base - Optional base to represent the number in (default is base 10).
		       Must be between 2 and 36 inclusive, or an Error will be thrown.

	Returns:

		The string representation of the <BigInteger>.
*/
BigInteger.prototype.toString = function(base) {
	base = +base || 10;
	if (base < 2 || base > 36) {
		throw new Error("illegal radix " + base + ".");
	}
	if (this._s === 0) {
		return "0";
	}
	if (base === 10) {
		var str = this._s < 0 ? "-" : "";
		str += this._d[this._d.length - 1].toString();
		for (var i = this._d.length - 2; i >= 0; i--) {
			var group = this._d[i].toString();
			while (group.length < BigInteger_base_log10) group = '0' + group;
			str += group;
		}
		return str;
	}
	else {
		var numerals = BigInteger.digits;
		base = BigInteger.small[base];
		var sign = this._s;

		var n = this.abs();
		var digits = [];
		var digit;

		while (n._s !== 0) {
			var divmod = n.divRem(base);
			n = divmod[0];
			digit = divmod[1];
			// TODO: This could be changed to unshift instead of reversing at the end.
			// Benchmark both to compare speeds.
			digits.push(numerals[digit.valueOf()]);
		}
		return (sign < 0 ? "-" : "") + digits.reverse().join("");
	}
};

// Verify strings for parsing
BigInteger.radixRegex = [
	/^$/,
	/^$/,
	/^[01]*$/,
	/^[012]*$/,
	/^[0-3]*$/,
	/^[0-4]*$/,
	/^[0-5]*$/,
	/^[0-6]*$/,
	/^[0-7]*$/,
	/^[0-8]*$/,
	/^[0-9]*$/,
	/^[0-9aA]*$/,
	/^[0-9abAB]*$/,
	/^[0-9abcABC]*$/,
	/^[0-9a-dA-D]*$/,
	/^[0-9a-eA-E]*$/,
	/^[0-9a-fA-F]*$/,
	/^[0-9a-gA-G]*$/,
	/^[0-9a-hA-H]*$/,
	/^[0-9a-iA-I]*$/,
	/^[0-9a-jA-J]*$/,
	/^[0-9a-kA-K]*$/,
	/^[0-9a-lA-L]*$/,
	/^[0-9a-mA-M]*$/,
	/^[0-9a-nA-N]*$/,
	/^[0-9a-oA-O]*$/,
	/^[0-9a-pA-P]*$/,
	/^[0-9a-qA-Q]*$/,
	/^[0-9a-rA-R]*$/,
	/^[0-9a-sA-S]*$/,
	/^[0-9a-tA-T]*$/,
	/^[0-9a-uA-U]*$/,
	/^[0-9a-vA-V]*$/,
	/^[0-9a-wA-W]*$/,
	/^[0-9a-xA-X]*$/,
	/^[0-9a-yA-Y]*$/,
	/^[0-9a-zA-Z]*$/
];

/*
	Function: parse
	Parse a string into a <BigInteger>.

	*base* is optional but, if provided, must be from 2 to 36 inclusive. If
	*base* is not provided, it will be guessed based on the leading characters
	of *s* as follows:

	- "0x" or "0X": *base* = 16
	- "0c" or "0C": *base* = 8
	- "0b" or "0B": *base* = 2
	- else: *base* = 10

	If no base is provided, or *base* is 10, the number can be in exponential
	form. For example, these are all valid:

	> BigInteger.parse("1e9");              // Same as "1000000000"
	> BigInteger.parse("1.234*10^3");       // Same as 1234
	> BigInteger.parse("56789 * 10 ** -2"); // Same as 567

	If any characters fall outside the range defined by the radix, an exception
	will be thrown.

	Parameters:

		s - The string to parse.
		base - Optional radix (default is to guess based on *s*).

	Returns:

		a <BigInteger> instance.
*/
BigInteger.parse = function(s, base) {
	// Expands a number in exponential form to decimal form.
	// expandExponential("-13.441*10^5") === "1344100";
	// expandExponential("1.12300e-1") === "0.112300";
	// expandExponential(1000000000000000000000000000000) === "1000000000000000000000000000000";
	function expandExponential(str) {
		str = str.replace(/\s*[*xX]\s*10\s*(\^|\*\*)\s*/, "e");

		return str.replace(/^([+\-])?(\d+)\.?(\d*)[eE]([+\-]?\d+)$/, function(x, s, n, f, c) {
			c = +c;
			var l = c < 0;
			var i = n.length + c;
			x = (l ? n : f).length;
			c = ((c = Math.abs(c)) >= x ? c - x + l : 0);
			var z = (new Array(c + 1)).join("0");
			var r = n + f;
			return (s || "") + (l ? r = z + r : r += z).substr(0, i += l ? z.length : 0) + (i < r.length ? "." + r.substr(i) : "");
		});
	}

	s = s.toString();
	if (typeof base === "undefined" || +base === 10) {
		s = expandExponential(s);
	}

	var prefixRE;
	if (typeof base === "undefined") {
		prefixRE = '0[xcb]';
	}
	else if (base == 16) {
		prefixRE = '0x';
	}
	else if (base == 8) {
		prefixRE = '0c';
	}
	else if (base == 2) {
		prefixRE = '0b';
	}
	else {
		prefixRE = '';
	}
	var parts = new RegExp('^([+\\-]?)(' + prefixRE + ')?([0-9a-z]*)(?:\\.\\d*)?$', 'i').exec(s);
	if (parts) {
		var sign = parts[1] || "+";
		var baseSection = parts[2] || "";
		var digits = parts[3] || "";

		if (typeof base === "undefined") {
			// Guess base
			if (baseSection === "0x" || baseSection === "0X") { // Hex
				base = 16;
			}
			else if (baseSection === "0c" || baseSection === "0C") { // Octal
				base = 8;
			}
			else if (baseSection === "0b" || baseSection === "0B") { // Binary
				base = 2;
			}
			else {
				base = 10;
			}
		}
		else if (base < 2 || base > 36) {
			throw new Error("Illegal radix " + base + ".");
		}

		base = +base;

		// Check for digits outside the range
		if (!(BigInteger.radixRegex[base].test(digits))) {
			throw new Error("Bad digit for radix " + base);
		}

		// Strip leading zeros, and convert to array
		digits = digits.replace(/^0+/, "").split("");
		if (digits.length === 0) {
			return ZERO;
		}

		// Get the sign (we know it's not zero)
		sign = (sign === "-") ? -1 : 1;

		// Optimize 10
		if (base == 10) {
			var d = [];
			while (digits.length >= BigInteger_base_log10) {
				d.push(parseInt(digits.splice(digits.length-BigInteger.base_log10, BigInteger.base_log10).join(''), 10));
			}
			d.push(parseInt(digits.join(''), 10));
			return new BigInteger(d, sign, CONSTRUCT);
		}

		// Do the conversion
		var d = ZERO;
		base = BigInteger.small[base];
		var small = BigInteger.small;
		for (var i = 0; i < digits.length; i++) {
			d = d.multiply(base).add(small[parseInt(digits[i], 36)]);
		}
		return new BigInteger(d._d, sign, CONSTRUCT);
	}
	else {
		throw new Error("Invalid BigInteger format: " + s);
	}
};

/*
	Function: add
	Add two <BigIntegers>.

	Parameters:

		n - The number to add to *this*. Will be converted to a <BigInteger>.

	Returns:

		The numbers added together.

	See Also:

		<subtract>, <multiply>, <quotient>, <next>
*/
BigInteger.prototype.add = function(n) {
	if (this._s === 0) {
		return BigInteger(n);
	}

	n = BigInteger(n);
	if (n._s === 0) {
		return this;
	}
	if (this._s !== n._s) {
		n = n.negate();
		return this.subtract(n);
	}

	var a = this._d;
	var b = n._d;
	var al = a.length;
	var bl = b.length;
	var sum = new Array(Math.max(al, bl) + 1);
	var size = Math.min(al, bl);
	var carry = 0;
	var digit;

	for (var i = 0; i < size; i++) {
		digit = a[i] + b[i] + carry;
		sum[i] = digit % BigInteger_base;
		carry = (digit / BigInteger_base) | 0;
	}
	if (bl > al) {
		a = b;
		al = bl;
	}
	for (i = size; carry && i < al; i++) {
		digit = a[i] + carry;
		sum[i] = digit % BigInteger_base;
		carry = (digit / BigInteger_base) | 0;
	}
	if (carry) {
		sum[i] = carry;
	}

	for ( ; i < al; i++) {
		sum[i] = a[i];
	}

	return new BigInteger(sum, this._s, CONSTRUCT);
};

/*
	Function: negate
	Get the additive inverse of a <BigInteger>.

	Returns:

		A <BigInteger> with the same magnatude, but with the opposite sign.

	See Also:

		<abs>
*/
BigInteger.prototype.negate = function() {
	return new BigInteger(this._d, (-this._s) | 0, CONSTRUCT);
};

/*
	Function: abs
	Get the absolute value of a <BigInteger>.

	Returns:

		A <BigInteger> with the same magnatude, but always positive (or zero).

	See Also:

		<negate>
*/
BigInteger.prototype.abs = function() {
	return (this._s < 0) ? this.negate() : this;
};

/*
	Function: subtract
	Subtract two <BigIntegers>.

	Parameters:

		n - The number to subtract from *this*. Will be converted to a <BigInteger>.

	Returns:

		The *n* subtracted from *this*.

	See Also:

		<add>, <multiply>, <quotient>, <prev>
*/
BigInteger.prototype.subtract = function(n) {
	if (this._s === 0) {
		return BigInteger(n).negate();
	}

	n = BigInteger(n);
	if (n._s === 0) {
		return this;
	}
	if (this._s !== n._s) {
		n = n.negate();
		return this.add(n);
	}

	var m = this;
	// negative - negative => -|a| - -|b| => -|a| + |b| => |b| - |a|
	if (this._s < 0) {
		m = new BigInteger(n._d, 1, CONSTRUCT);
		n = new BigInteger(this._d, 1, CONSTRUCT);
	}

	// Both are positive => a - b
	var sign = m.compareAbs(n);
	if (sign === 0) {
		return ZERO;
	}
	else if (sign < 0) {
		// swap m and n
		var t = n;
		n = m;
		m = t;
	}

	// a > b
	var a = m._d;
	var b = n._d;
	var al = a.length;
	var bl = b.length;
	var diff = new Array(al); // al >= bl since a > b
	var borrow = 0;
	var i;
	var digit;

	for (i = 0; i < bl; i++) {
		digit = a[i] - borrow - b[i];
		if (digit < 0) {
			digit += BigInteger_base;
			borrow = 1;
		}
		else {
			borrow = 0;
		}
		diff[i] = digit;
	}
	for (i = bl; i < al; i++) {
		digit = a[i] - borrow;
		if (digit < 0) {
			digit += BigInteger_base;
		}
		else {
			diff[i++] = digit;
			break;
		}
		diff[i] = digit;
	}
	for ( ; i < al; i++) {
		diff[i] = a[i];
	}

	return new BigInteger(diff, sign, CONSTRUCT);
};

(function() {
	function addOne(n, sign) {
		var a = n._d;
		var sum = a.slice();
		var carry = true;
		var i = 0;

		while (true) {
			var digit = (a[i] || 0) + 1;
			sum[i] = digit % BigInteger_base;
			if (digit <= BigInteger_base - 1) {
				break;
			}
			++i;
		}

		return new BigInteger(sum, sign, CONSTRUCT);
	}

	function subtractOne(n, sign) {
		var a = n._d;
		var sum = a.slice();
		var borrow = true;
		var i = 0;

		while (true) {
			var digit = (a[i] || 0) - 1;
			if (digit < 0) {
				sum[i] = digit + BigInteger_base;
			}
			else {
				sum[i] = digit;
				break;
			}
			++i;
		}

		return new BigInteger(sum, sign, CONSTRUCT);
	}

	/*
		Function: next
		Get the next <BigInteger> (add one).

		Returns:

			*this* + 1.

		See Also:

			<add>, <prev>
	*/
	BigInteger.prototype.next = function() {
		switch (this._s) {
		case 0:
			return ONE;
		case -1:
			return subtractOne(this, -1);
		// case 1:
		default:
			return addOne(this, 1);
		}
	};

	/*
		Function: prev
		Get the previous <BigInteger> (subtract one).

		Returns:

			*this* - 1.

		See Also:

			<next>, <subtract>
	*/
	BigInteger.prototype.prev = function() {
		switch (this._s) {
		case 0:
			return M_ONE;
		case -1:
			return addOne(this, -1);
		// case 1:
		default:
			return subtractOne(this, 1);
		}
	};
})();

/*
	Function: compareAbs
	Compare the absolute value of two <BigIntegers>.

	Calling <compareAbs> is faster than calling <abs> twice, then <compare>.

	Parameters:

		n - The number to compare to *this*. Will be converted to a <BigInteger>.

	Returns:

		-1, 0, or +1 if *|this|* is less than, equal to, or greater than *|n|*.

	See Also:

		<compare>, <abs>
*/
BigInteger.prototype.compareAbs = function(n) {
	if (this === n) {
		return 0;
	}

	if (!(n instanceof BigInteger)) {
		if (!isFinite(n)) {
			return(isNaN(n) ? n : -1);
		}
		n = BigInteger(n);
	}

	if (this._s === 0) {
		return (n._s !== 0) ? -1 : 0;
	}
	if (n._s === 0) {
		return 1;
	}

	var l = this._d.length;
	var nl = n._d.length;
	if (l < nl) {
		return -1;
	}
	else if (l > nl) {
		return 1;
	}

	var a = this._d;
	var b = n._d;
	for (var i = l-1; i >= 0; i--) {
		if (a[i] !== b[i]) {
			return a[i] < b[i] ? -1 : 1;
		}
	}

	return 0;
};

/*
	Function: compare
	Compare two <BigIntegers>.

	Parameters:

		n - The number to compare to *this*. Will be converted to a <BigInteger>.

	Returns:

		-1, 0, or +1 if *this* is less than, equal to, or greater than *n*.

	See Also:

		<compareAbs>, <isPositive>, <isNegative>, <isUnit>
*/
BigInteger.prototype.compare = function(n) {
	if (this === n) {
		return 0;
	}

	n = BigInteger(n);

	if (this._s === 0) {
		return -n._s;
	}

	if (this._s === n._s) { // both positive or both negative
		var cmp = this.compareAbs(n);
		return cmp * this._s;
	}
	else {
		return this._s;
	}
};

/*
	Function: isUnit
	Return true iff *this* is either 1 or -1.

	Returns:

		true if *this* compares equal to <BigInteger.ONE> or <BigInteger.M_ONE>.

	See Also:

		<isZero>, <isNegative>, <isPositive>, <compareAbs>, <compare>,
		<BigInteger.ONE>, <BigInteger.M_ONE>
*/
BigInteger.prototype.isUnit = function() {
	return this === ONE ||
		this === M_ONE ||
		(this._d.length === 1 && this._d[0] === 1);
};

/*
	Function: multiply
	Multiply two <BigIntegers>.

	Parameters:

		n - The number to multiply *this* by. Will be converted to a
		<BigInteger>.

	Returns:

		The numbers multiplied together.

	See Also:

		<add>, <subtract>, <quotient>, <square>
*/
BigInteger.prototype.multiply = function(n) {
	// TODO: Consider adding Karatsuba multiplication for large numbers
	if (this._s === 0) {
		return ZERO;
	}

	n = BigInteger(n);
	if (n._s === 0) {
		return ZERO;
	}
	if (this.isUnit()) {
		if (this._s < 0) {
			return n.negate();
		}
		return n;
	}
	if (n.isUnit()) {
		if (n._s < 0) {
			return this.negate();
		}
		return this;
	}
	if (this === n) {
		return this.square();
	}

	var r = (this._d.length >= n._d.length);
	var a = (r ? this : n)._d; // a will be longer than b
	var b = (r ? n : this)._d;
	var al = a.length;
	var bl = b.length;

	var pl = al + bl;
	var partial = new Array(pl);
	var i;
	for (i = 0; i < pl; i++) {
		partial[i] = 0;
	}

	for (i = 0; i < bl; i++) {
		var carry = 0;
		var bi = b[i];
		var jlimit = al + i;
		var digit;
		for (var j = i; j < jlimit; j++) {
			digit = partial[j] + bi * a[j - i] + carry;
			carry = (digit / BigInteger_base) | 0;
			partial[j] = (digit % BigInteger_base) | 0;
		}
		if (carry) {
			digit = partial[j] + carry;
			carry = (digit / BigInteger_base) | 0;
			partial[j] = digit % BigInteger_base;
		}
	}
	return new BigInteger(partial, this._s * n._s, CONSTRUCT);
};

// Multiply a BigInteger by a single-digit native number
// Assumes that this and n are >= 0
// This is not really intended to be used outside the library itself
BigInteger.prototype.multiplySingleDigit = function(n) {
	if (n === 0 || this._s === 0) {
		return ZERO;
	}
	if (n === 1) {
		return this;
	}

	var digit;
	if (this._d.length === 1) {
		digit = this._d[0] * n;
		if (digit >= BigInteger_base) {
			return new BigInteger([(digit % BigInteger_base)|0,
					(digit / BigInteger_base)|0], 1, CONSTRUCT);
		}
		return new BigInteger([digit], 1, CONSTRUCT);
	}

	if (n === 2) {
		return this.add(this);
	}
	if (this.isUnit()) {
		return new BigInteger([n], 1, CONSTRUCT);
	}

	var a = this._d;
	var al = a.length;

	var pl = al + 1;
	var partial = new Array(pl);
	for (var i = 0; i < pl; i++) {
		partial[i] = 0;
	}

	var carry = 0;
	for (var j = 0; j < al; j++) {
		digit = n * a[j] + carry;
		carry = (digit / BigInteger_base) | 0;
		partial[j] = (digit % BigInteger_base) | 0;
	}
	if (carry) {
		partial[j] = carry;
	}

	return new BigInteger(partial, 1, CONSTRUCT);
};

/*
	Function: square
	Multiply a <BigInteger> by itself.

	This is slightly faster than regular multiplication, since it removes the
	duplicated multiplcations.

	Returns:

		> this.multiply(this)

	See Also:
		<multiply>
*/
BigInteger.prototype.square = function() {
	// Normally, squaring a 10-digit number would take 100 multiplications.
	// Of these 10 are unique diagonals, of the remaining 90 (100-10), 45 are repeated.
	// This procedure saves (N*(N-1))/2 multiplications, (e.g., 45 of 100 multiplies).
	// Based on code by Gary Darby, Intellitech Systems Inc., www.DelphiForFun.org

	if (this._s === 0) {
		return ZERO;
	}
	if (this.isUnit()) {
		return ONE;
	}

	var digits = this._d;
	var length = digits.length;
	var imult1 = new Array(length + length + 1);
	var product, carry, k;
	var i;

	// Calculate diagonal
	for (i = 0; i < length; i++) {
		k = i * 2;
		product = digits[i] * digits[i];
		carry = (product / BigInteger_base) | 0;
		imult1[k] = product % BigInteger_base;
		imult1[k + 1] = carry;
	}

	// Calculate repeating part
	for (i = 0; i < length; i++) {
		carry = 0;
		k = i * 2 + 1;
		for (var j = i + 1; j < length; j++, k++) {
			product = digits[j] * digits[i] * 2 + imult1[k] + carry;
			carry = (product / BigInteger_base) | 0;
			imult1[k] = product % BigInteger_base;
		}
		k = length + i;
		var digit = carry + imult1[k];
		carry = (digit / BigInteger_base) | 0;
		imult1[k] = digit % BigInteger_base;
		imult1[k + 1] += carry;
	}

	return new BigInteger(imult1, 1, CONSTRUCT);
};

/*
	Function: quotient
	Divide two <BigIntegers> and truncate towards zero.

	<quotient> throws an exception if *n* is zero.

	Parameters:

		n - The number to divide *this* by. Will be converted to a <BigInteger>.

	Returns:

		The *this* / *n*, truncated to an integer.

	See Also:

		<add>, <subtract>, <multiply>, <divRem>, <remainder>
*/
BigInteger.prototype.quotient = function(n) {
	return this.divRem(n)[0];
};

/*
	Function: divide
	Deprecated synonym for <quotient>.
*/
BigInteger.prototype.divide = BigInteger.prototype.quotient;

/*
	Function: remainder
	Calculate the remainder of two <BigIntegers>.

	<remainder> throws an exception if *n* is zero.

	Parameters:

		n - The remainder after *this* is divided *this* by *n*. Will be
		    converted to a <BigInteger>.

	Returns:

		*this* % *n*.

	See Also:

		<divRem>, <quotient>
*/
BigInteger.prototype.remainder = function(n) {
	return this.divRem(n)[1];
};

/*
	Function: divRem
	Calculate the integer quotient and remainder of two <BigIntegers>.

	<divRem> throws an exception if *n* is zero.

	Parameters:

		n - The number to divide *this* by. Will be converted to a <BigInteger>.

	Returns:

		A two-element array containing the quotient and the remainder.

		> a.divRem(b)

		is exactly equivalent to

		> [a.quotient(b), a.remainder(b)]

		except it is faster, because they are calculated at the same time.

	See Also:

		<quotient>, <remainder>
*/
BigInteger.prototype.divRem = function(n) {
	n = BigInteger(n);
	if (n._s === 0) {
		throw new Error("Divide by zero");
	}
	if (this._s === 0) {
		return [ZERO, ZERO];
	}
	if (n._d.length === 1) {
		return this.divRemSmall(n._s * n._d[0]);
	}

	// Test for easy cases -- |n1| <= |n2|
	switch (this.compareAbs(n)) {
	case 0: // n1 == n2
		return [this._s === n._s ? ONE : M_ONE, ZERO];
	case -1: // |n1| < |n2|
		return [ZERO, this];
	}

	var sign = this._s * n._s;
	var a = n.abs();
	var b_digits = this._d;
	var b_index = b_digits.length;
	var digits = n._d.length;
	var quot = [];
	var guess;

	var part = new BigInteger([], 0, CONSTRUCT);
	part._s = 1;

	while (b_index) {
		part._d.unshift(b_digits[--b_index]);

		if (part.compareAbs(n) < 0) {
			quot.push(0);
			continue;
		}
		if (part._s === 0) {
			guess = 0;
		}
		else {
			var xlen = part._d.length, ylen = a._d.length;
			var highx = part._d[xlen-1]*BigInteger_base + part._d[xlen-2];
			var highy = a._d[ylen-1]*BigInteger_base + a._d[ylen-2];
			if (part._d.length > a._d.length) {
				// The length of part._d can either match a._d length,
				// or exceed it by one.
				highx = (highx+1)*BigInteger_base;
			}
			guess = Math.ceil(highx/highy);
		}
		do {
			var check = a.multiplySingleDigit(guess);
			if (check.compareAbs(part) <= 0) {
				break;
			}
			guess--;
		} while (guess);

		quot.push(guess);
		if (!guess) {
			continue;
		}
		var diff = part.subtract(check);
		part._d = diff._d.slice();
		if (part._d.length === 0) {
			part._s = 0;
		}
	}

	return [new BigInteger(quot.reverse(), sign, CONSTRUCT),
		   new BigInteger(part._d, this._s, CONSTRUCT)];
};

// Throws an exception if n is outside of (-BigInteger.base, -1] or
// [1, BigInteger.base).  It's not necessary to call this, since the
// other division functions will call it if they are able to.
BigInteger.prototype.divRemSmall = function(n) {
	var r;
	n = +n;
	if (n === 0) {
		throw new Error("Divide by zero");
	}

	var n_s = n < 0 ? -1 : 1;
	var sign = this._s * n_s;
	n = Math.abs(n);

	if (n < 1 || n >= BigInteger_base) {
		throw new Error("Argument out of range");
	}

	if (this._s === 0) {
		return [ZERO, ZERO];
	}

	if (n === 1 || n === -1) {
		return [(sign === 1) ? this.abs() : new BigInteger(this._d, sign, CONSTRUCT), ZERO];
	}

	// 2 <= n < BigInteger_base

	// divide a single digit by a single digit
	if (this._d.length === 1) {
		var q = new BigInteger([(this._d[0] / n) | 0], 1, CONSTRUCT);
		r = new BigInteger([(this._d[0] % n) | 0], 1, CONSTRUCT);
		if (sign < 0) {
			q = q.negate();
		}
		if (this._s < 0) {
			r = r.negate();
		}
		return [q, r];
	}

	var digits = this._d.slice();
	var quot = new Array(digits.length);
	var part = 0;
	var diff = 0;
	var i = 0;
	var guess;

	while (digits.length) {
		part = part * BigInteger_base + digits[digits.length - 1];
		if (part < n) {
			quot[i++] = 0;
			digits.pop();
			diff = BigInteger_base * diff + part;
			continue;
		}
		if (part === 0) {
			guess = 0;
		}
		else {
			guess = (part / n) | 0;
		}

		var check = n * guess;
		diff = part - check;
		quot[i++] = guess;
		if (!guess) {
			digits.pop();
			continue;
		}

		digits.pop();
		part = diff;
	}

	r = new BigInteger([diff], 1, CONSTRUCT);
	if (this._s < 0) {
		r = r.negate();
	}
	return [new BigInteger(quot.reverse(), sign, CONSTRUCT), r];
};

/*
	Function: isEven
	Return true iff *this* is divisible by two.

	Note that <BigInteger.ZERO> is even.

	Returns:

		true if *this* is even, false otherwise.

	See Also:

		<isOdd>
*/
BigInteger.prototype.isEven = function() {
	var digits = this._d;
	return this._s === 0 || digits.length === 0 || (digits[0] % 2) === 0;
};

/*
	Function: isOdd
	Return true iff *this* is not divisible by two.

	Returns:

		true if *this* is odd, false otherwise.

	See Also:

		<isEven>
*/
BigInteger.prototype.isOdd = function() {
	return !this.isEven();
};

/*
	Function: sign
	Get the sign of a <BigInteger>.

	Returns:

		* -1 if *this* < 0
		* 0 if *this* == 0
		* +1 if *this* > 0

	See Also:

		<isZero>, <isPositive>, <isNegative>, <compare>, <BigInteger.ZERO>
*/
BigInteger.prototype.sign = function() {
	return this._s;
};

/*
	Function: isPositive
	Return true iff *this* > 0.

	Returns:

		true if *this*.compare(<BigInteger.ZERO>) == 1.

	See Also:

		<sign>, <isZero>, <isNegative>, <isUnit>, <compare>, <BigInteger.ZERO>
*/
BigInteger.prototype.isPositive = function() {
	return this._s > 0;
};

/*
	Function: isNegative
	Return true iff *this* < 0.

	Returns:

		true if *this*.compare(<BigInteger.ZERO>) == -1.

	See Also:

		<sign>, <isPositive>, <isZero>, <isUnit>, <compare>, <BigInteger.ZERO>
*/
BigInteger.prototype.isNegative = function() {
	return this._s < 0;
};

/*
	Function: isZero
	Return true iff *this* == 0.

	Returns:

		true if *this*.compare(<BigInteger.ZERO>) == 0.

	See Also:

		<sign>, <isPositive>, <isNegative>, <isUnit>, <BigInteger.ZERO>
*/
BigInteger.prototype.isZero = function() {
	return this._s === 0;
};

/*
	Function: exp10
	Multiply a <BigInteger> by a power of 10.

	This is equivalent to, but faster than

	> if (n >= 0) {
	>     return this.multiply(BigInteger("1e" + n));
	> }
	> else { // n <= 0
	>     return this.quotient(BigInteger("1e" + -n));
	> }

	Parameters:

		n - The power of 10 to multiply *this* by. *n* is converted to a
		javascipt number and must be no greater than <BigInteger.MAX_EXP>
		(0x7FFFFFFF), or an exception will be thrown.

	Returns:

		*this* * (10 ** *n*), truncated to an integer if necessary.

	See Also:

		<pow>, <multiply>
*/
BigInteger.prototype.exp10 = function(n) {
	n = +n;
	if (n === 0) {
		return this;
	}
	if (Math.abs(n) > Number(MAX_EXP)) {
		throw new Error("exponent too large in BigInteger.exp10");
	}
	if (n > 0) {
		var k = new BigInteger(this._d.slice(), this._s, CONSTRUCT);

		for (; n >= BigInteger_base_log10; n -= BigInteger_base_log10) {
			k._d.unshift(0);
		}
		if (n == 0)
			return k;
		k._s = 1;
		k = k.multiplySingleDigit(Math.pow(10, n));
		return (this._s < 0 ? k.negate() : k);
	} else if (-n >= this._d.length*BigInteger_base_log10) {
		return ZERO;
	} else {
		var k = new BigInteger(this._d.slice(), this._s, CONSTRUCT);

		for (n = -n; n >= BigInteger_base_log10; n -= BigInteger_base_log10) {
			k._d.shift();
		}
		return (n == 0) ? k : k.divRemSmall(Math.pow(10, n))[0];
	}
};

/*
	Function: pow
	Raise a <BigInteger> to a power.

	In this implementation, 0**0 is 1.

	Parameters:

		n - The exponent to raise *this* by. *n* must be no greater than
		<BigInteger.MAX_EXP> (0x7FFFFFFF), or an exception will be thrown.

	Returns:

		*this* raised to the *nth* power.

	See Also:

		<modPow>
*/
BigInteger.prototype.pow = function(n) {
	if (this.isUnit()) {
		if (this._s > 0) {
			return this;
		}
		else {
			return BigInteger(n).isOdd() ? this : this.negate();
		}
	}

	n = BigInteger(n);
	if (n._s === 0) {
		return ONE;
	}
	else if (n._s < 0) {
		if (this._s === 0) {
			throw new Error("Divide by zero");
		}
		else {
			return ZERO;
		}
	}
	if (this._s === 0) {
		return ZERO;
	}
	if (n.isUnit()) {
		return this;
	}

	if (n.compareAbs(MAX_EXP) > 0) {
		throw new Error("exponent too large in BigInteger.pow");
	}
	var x = this;
	var aux = ONE;
	var two = BigInteger.small[2];

	while (n.isPositive()) {
		if (n.isOdd()) {
			aux = aux.multiply(x);
			if (n.isUnit()) {
				return aux;
			}
		}
		x = x.square();
		n = n.quotient(two);
	}

	return aux;
};

/*
	Function: modPow
	Raise a <BigInteger> to a power (mod m).

	Because it is reduced by a modulus, <modPow> is not limited by
	<BigInteger.MAX_EXP> like <pow>.

	Parameters:

		exponent - The exponent to raise *this* by. Must be positive.
		modulus - The modulus.

	Returns:

		*this* ^ *exponent* (mod *modulus*).

	See Also:

		<pow>, <mod>
*/
BigInteger.prototype.modPow = function(exponent, modulus) {
	var result = ONE;
	var base = this;

	while (exponent.isPositive()) {
		if (exponent.isOdd()) {
			result = result.multiply(base).remainder(modulus);
		}

		exponent = exponent.quotient(BigInteger.small[2]);
		if (exponent.isPositive()) {
			base = base.square().remainder(modulus);
		}
	}

	return result;
};

/*
	Function: log
	Get the natural logarithm of a <BigInteger> as a native JavaScript number.

	This is equivalent to

	> Math.log(this.toJSValue())

	but handles values outside of the native number range.

	Returns:

		log( *this* )

	See Also:

		<toJSValue>
*/
BigInteger.prototype.log = function() {
	switch (this._s) {
	case 0:	 return -Infinity;
	case -1: return NaN;
	default: // Fall through.
	}

	var l = this._d.length;

	if (l*BigInteger_base_log10 < 30) {
		return Math.log(this.valueOf());
	}

	var N = Math.ceil(30/BigInteger_base_log10);
	var firstNdigits = this._d.slice(l - N);
	return Math.log((new BigInteger(firstNdigits, 1, CONSTRUCT)).valueOf()) + (l - N) * Math.log(BigInteger_base);
};

/*
	Function: valueOf
	Convert a <BigInteger> to a native JavaScript integer.

	This is called automatically by JavaScipt to convert a <BigInteger> to a
	native value.

	Returns:

		> parseInt(this.toString(), 10)

	See Also:

		<toString>, <toJSValue>
*/
BigInteger.prototype.valueOf = function() {
	return parseInt(this.toString(), 10);
};

/*
	Function: toJSValue
	Convert a <BigInteger> to a native JavaScript integer.

	This is the same as valueOf, but more explicitly named.

	Returns:

		> parseInt(this.toString(), 10)

	See Also:

		<toString>, <valueOf>
*/
BigInteger.prototype.toJSValue = function() {
	return parseInt(this.toString(), 10);
};

var MAX_EXP = BigInteger(0x7FFFFFFF);
// Constant: MAX_EXP
// The largest exponent allowed in <pow> and <exp10> (0x7FFFFFFF or 2147483647).
BigInteger.MAX_EXP = MAX_EXP;

(function() {
	function makeUnary(fn) {
		return function(a) {
			return fn.call(BigInteger(a));
		};
	}

	function makeBinary(fn) {
		return function(a, b) {
			return fn.call(BigInteger(a), BigInteger(b));
		};
	}

	function makeTrinary(fn) {
		return function(a, b, c) {
			return fn.call(BigInteger(a), BigInteger(b), BigInteger(c));
		};
	}

	(function() {
		var i, fn;
		var unary = "toJSValue,isEven,isOdd,sign,isZero,isNegative,abs,isUnit,square,negate,isPositive,toString,next,prev,log".split(",");
		var binary = "compare,remainder,divRem,subtract,add,quotient,divide,multiply,pow,compareAbs".split(",");
		var trinary = ["modPow"];

		for (i = 0; i < unary.length; i++) {
			fn = unary[i];
			BigInteger[fn] = makeUnary(BigInteger.prototype[fn]);
		}

		for (i = 0; i < binary.length; i++) {
			fn = binary[i];
			BigInteger[fn] = makeBinary(BigInteger.prototype[fn]);
		}

		for (i = 0; i < trinary.length; i++) {
			fn = trinary[i];
			BigInteger[fn] = makeTrinary(BigInteger.prototype[fn]);
		}

		BigInteger.exp10 = function(x, n) {
			return BigInteger(x).exp10(n);
		};
	})();
})();

exports.BigInteger = BigInteger;
})(typeof exports !== 'undefined' ? exports : this);

},{}],4:[function(require,module,exports){
(function (process){
/* parser generated by jison 0.4.16 */
/*
  Returns a Parser object of the following structure:

  Parser: {
    yy: {}
  }

  Parser.prototype: {
    yy: {},
    trace: function(),
    symbols_: {associative list: name ==> number},
    terminals_: {associative list: number ==> name},
    productions_: [...],
    performAction: function anonymous(yytext, yyleng, yylineno, yy, yystate, $$, _$),
    table: [...],
    defaultActions: {...},
    parseError: function(str, hash),
    parse: function(input),

    lexer: {
        EOF: 1,
        parseError: function(str, hash),
        setInput: function(input),
        input: function(),
        unput: function(str),
        more: function(),
        less: function(n),
        pastInput: function(),
        upcomingInput: function(),
        showPosition: function(),
        test_match: function(regex_match_array, rule_index),
        next: function(),
        lex: function(),
        begin: function(condition),
        popState: function(),
        _currentRules: function(),
        topState: function(),
        pushState: function(condition),

        options: {
            ranges: boolean           (optional: true ==> token location info will include a .range[] member)
            flex: boolean             (optional: true ==> flex-like lexing behaviour where the rules are tested exhaustively to find the longest match)
            backtrack_lexer: boolean  (optional: true ==> lexer regexes are tested in order and for each matching regex the action code is invoked; the lexer terminates the scan when a token is returned by the action code)
        },

        performAction: function(yy, yy_, $avoiding_name_collisions, YY_START),
        rules: [...],
        conditions: {associative list: name ==> set},
    }
  }


  token location info (@$, _$, etc.): {
    first_line: n,
    last_line: n,
    first_column: n,
    last_column: n,
    range: [start_number, end_number]       (where the numbers are indexes into the input string, regular zero-based)
  }


  the parseError function receives a 'hash' object with these members for lexer and parser errors: {
    text:        (matched text)
    token:       (the produced terminal token, if any)
    line:        (yylineno)
  }
  while parser (grammar) errors will also provide these members, i.e. parser errors deliver a superset of attributes: {
    loc:         (yylloc)
    expected:    (string describing the set of expected tokens)
    recoverable: (boolean: TRUE when the parser has a error recovery rule available for this particular error)
  }
*/
var parser = (function(){
var o=function(k,v,o,l){for(o=o||{},l=k.length;l--;o[k[l]]=v);return o},$V0=[1,8],$V1=[1,10],$V2=[1,12],$V3=[1,15],$V4=[1,19],$V5=[1,20],$V6=[1,14],$V7=[1,23],$V8=[1,24],$V9=[1,34],$Va=[1,28],$Vb=[1,29],$Vc=[1,30],$Vd=[1,31],$Ve=[1,32],$Vf=[1,33],$Vg=[1,16],$Vh=[1,17],$Vi=[1,36],$Vj=[1,37],$Vk=[1,38],$Vl=[1,39],$Vm=[1,40],$Vn=[1,41],$Vo=[1,42],$Vp=[1,43],$Vq=[1,44],$Vr=[1,45],$Vs=[1,46],$Vt=[1,47],$Vu=[1,48],$Vv=[1,49],$Vw=[5,12,16,17,18,19,20,21,22,23,24,25,26,27,28,29,32,41],$Vx=[1,53],$Vy=[5,12,16,17,18,19,20,21,22,23,24,25,26,27,28,29,32,34,36,40,41],$Vz=[2,58],$VA=[1,61],$VB=[1,62],$VC=[1,63],$VD=[1,65],$VE=[5,12,16,17,18,19,20,21,22,23,24,25,26,27,28,29,32,34,36,41],$VF=[30,51,52,53,54,55,56],$VG=[5,12,16,17,18,19,20,21,22,23,24,25,26,27,28,32,41],$VH=[5,12,16,17,18,19,32,41],$VI=[5,12,16,17,18,19,20,21,22,23,32,41],$VJ=[5,12,16,17,18,19,20,21,22,23,24,25,32,41],$VK=[12,32],$VL=[5,12,16,17,18,19,20,21,22,23,24,25,26,27,28,29,32,34,41];
var parser = {trace: function trace() { },
yy: {},
symbols_: {"error":2,"xpath_expr":3,"expr":4,"EOF":5,"base_expr":6,"op_expr":7,"path_expr":8,"filter_expr":9,"hashtag_expr":10,"LPAREN":11,"RPAREN":12,"func_call":13,"VAR":14,"literal":15,"OR":16,"AND":17,"EQ":18,"NEQ":19,"LT":20,"LTE":21,"GT":22,"GTE":23,"PLUS":24,"MINUS":25,"MULT":26,"DIV":27,"MOD":28,"UNION":29,"QNAME":30,"arg_list":31,"COMMA":32,"loc_path":33,"SLASH":34,"rel_loc_path":35,"DBL_SLASH":36,"predicate":37,"HASH":38,"hashtag_path":39,"LBRACK":40,"RBRACK":41,"step":42,"step_unabbr":43,"DOT":44,"DBL_DOT":45,"step_body":46,"node_test":47,"axis_specifier":48,"DBL_COLON":49,"AT":50,"WILDCARD":51,"NSWILDCARD":52,"NODETYPE_NODE":53,"NODETYPE_TEXT":54,"NODETYPE_COMMENT":55,"NODETYPE_PROCINSTR":56,"STR":57,"NUM":58,"$accept":0,"$end":1},
terminals_: {2:"error",5:"EOF",11:"LPAREN",12:"RPAREN",14:"VAR",16:"OR",17:"AND",18:"EQ",19:"NEQ",20:"LT",21:"LTE",22:"GT",23:"GTE",24:"PLUS",25:"MINUS",26:"MULT",27:"DIV",28:"MOD",29:"UNION",30:"QNAME",32:"COMMA",34:"SLASH",36:"DBL_SLASH",38:"HASH",40:"LBRACK",41:"RBRACK",44:"DOT",45:"DBL_DOT",49:"DBL_COLON",50:"AT",51:"WILDCARD",52:"NSWILDCARD",53:"NODETYPE_NODE",54:"NODETYPE_TEXT",55:"NODETYPE_COMMENT",56:"NODETYPE_PROCINSTR",57:"STR",58:"NUM"},
productions_: [0,[3,2],[4,1],[4,1],[4,1],[4,1],[4,1],[6,3],[6,1],[6,1],[6,1],[7,3],[7,3],[7,3],[7,3],[7,3],[7,3],[7,3],[7,3],[7,3],[7,3],[7,3],[7,3],[7,3],[7,2],[7,3],[13,4],[13,3],[31,3],[31,1],[8,1],[8,3],[8,3],[8,3],[8,3],[9,2],[9,2],[10,4],[10,2],[39,1],[39,3],[37,3],[33,1],[33,2],[33,2],[33,1],[35,1],[35,3],[35,3],[42,1],[42,1],[42,1],[43,2],[43,1],[46,1],[46,2],[48,2],[48,1],[47,1],[47,1],[47,1],[47,3],[47,3],[47,3],[47,3],[47,4],[15,1],[15,1]],
performAction: function anonymous(yytext, yyleng, yylineno, yy, yystate /* action[1] */, $$ /* vstack */, _$ /* lstack */) {
/* this == yyval */

var $0 = $$.length - 1;
switch (yystate) {
case 1:
 return $$[$0-1]; 
break;
case 2: case 3: case 4: case 5: case 6:
  this.$ = $$[$0]; 
break;
case 7:
 $$[$0-1].parens = true; this.$ = $$[$0-1]; 
break;
case 9:
 this.$ = new yy.xpathmodels.XPathVariableReference($$[$0]); 
break;
case 11:
 this.$ = new yy.xpathmodels.XPathBoolExpr({"type": "or", "left": $$[$0-2], "right": $$[$0]}); 
break;
case 12:
 this.$ = new yy.xpathmodels.XPathBoolExpr({"type": "and", "left": $$[$0-2], "right": $$[$0]}); 
break;
case 13:
 this.$ = new yy.xpathmodels.XPathEqExpr({"type": "==", "left": $$[$0-2], "right": $$[$0]}); 
break;
case 14:
 this.$ = new yy.xpathmodels.XPathEqExpr({"type": "!=", "left": $$[$0-2], "right": $$[$0]}); 
break;
case 15:
 this.$ = new yy.xpathmodels.XPathCmpExpr({"type": "<", "left":$$[$0-2], "right": $$[$0]}); 
break;
case 16:
 this.$ = new yy.xpathmodels.XPathCmpExpr({"type": "<=", "left":$$[$0-2], "right": $$[$0]}); 
break;
case 17:
 this.$ = new yy.xpathmodels.XPathCmpExpr({"type": ">", "left":$$[$0-2], "right": $$[$0]}); 
break;
case 18:
 this.$ = new yy.xpathmodels.XPathCmpExpr({"type": ">=", "left":$$[$0-2], "right": $$[$0]}); 
break;
case 19:
 this.$ = new yy.xpathmodels.XPathArithExpr({"type": "+", "left":$$[$0-2], "right": $$[$0]}); 
break;
case 20:
 this.$ = new yy.xpathmodels.XPathArithExpr({"type": "-", "left":$$[$0-2], "right": $$[$0]}); 
break;
case 21:
 this.$ = new yy.xpathmodels.XPathArithExpr({"type": "*", "left":$$[$0-2], "right": $$[$0]}); 
break;
case 22:
 this.$ = new yy.xpathmodels.XPathArithExpr({"type": "/", "left":$$[$0-2], "right": $$[$0]}); 
break;
case 23:
 this.$ = new yy.xpathmodels.XPathArithExpr({"type": "%", "left":$$[$0-2], "right": $$[$0]}); 
break;
case 24:
 this.$ = new yy.xpathmodels.XPathNumNegExpr({"type": "num-neg", "value":$$[$0]}); 
break;
case 25:
 this.$ = new yy.xpathmodels.XPathUnionExpr({"type": "union", "left":$$[$0-2], "right": $$[$0]}); 
break;
case 26:
 this.$ = new yy.xpathmodels.XPathFuncExpr({id: $$[$0-3], args: $$[$0-1]}); 
break;
case 27:
 this.$ = new yy.xpathmodels.XPathFuncExpr({id: $$[$0-2], args: []}); 
break;
case 28:
 var args = $$[$0-2];
                                      args.push($$[$0]);
                                      this.$ = args; 
break;
case 29:
 this.$ = [$$[$0]]; 
break;
case 31:
 this.$ = new yy.xpathmodels.XPathPathExpr({
                                                                    initial_context: yy.xpathmodels.XPathInitialContextEnum.EXPR,
                                                                    filter: $$[$0-2], steps: $$[$0]}); 
break;
case 32:
 var steps = $$[$0];
                                                      steps.splice(0, 0, new yy.xpathmodels.XPathStep({
                                                                                axis: yy.xpathmodels.XPathAxisEnum.DESCENDANT_OR_SELF, 
                                                                                test: yy.xpathmodels.XPathTestEnum.TYPE_NODE}));
                                                      this.$ = new yy.xpathmodels.XPathPathExpr({
                                                                    initial_context: yy.xpathmodels.XPathInitialContextEnum.EXPR,
                                                                    filter: $$[$0-2], steps: steps}); 
break;
case 33:
 // could eliminate filterExpr wrapper, but this makes tests pass as-is
                                                      var filterExpr = new yy.xpathmodels.XPathFilterExpr({expr: $$[$0-2]});
                                                      this.$ = new yy.xpathmodels.XPathPathExpr({
                                                                    initial_context: yy.xpathmodels.XPathInitialContextEnum.EXPR,
                                                                    filter: filterExpr, steps: $$[$0]}); 
break;
case 34:
 var steps = $$[$0];
                                                      // could eliminate filterExpr wrapper, but this makes tests pass as-is
                                                      var filterExpr = new yy.xpathmodels.XPathFilterExpr({expr: $$[$0-2]});
                                                      steps.splice(0, 0, new yy.xpathmodels.XPathStep({
                                                                                axis: yy.xpathmodels.XPathAxisEnum.DESCENDANT_OR_SELF, 
                                                                                test: yy.xpathmodels.XPathTestEnum.TYPE_NODE}));
                                                      this.$ = new yy.xpathmodels.XPathPathExpr({
                                                                    initial_context: yy.xpathmodels.XPathInitialContextEnum.EXPR,
                                                                    filter: filterExpr, steps: steps}); 
break;
case 35:
 this.$ = new yy.xpathmodels.XPathFilterExpr({expr: $$[$0-1], predicates: [$$[$0]]}); 
break;
case 36:
 var filterExpr = $$[$0-1];
                                        filterExpr.predicates.push($$[$0]);
                                        this.$ = filterExpr; 
break;
case 37:
 this.$ = new yy.xpathmodels.HashtagExpr({initial_context: yy.xpathmodels.XPathInitialContextEnum.HASHTAG,
                                                                      namespace: $$[$0-2],
                                                                      steps: $$[$0]}); 
break;
case 38:
 this.$ = new yy.xpathmodels.HashtagExpr({initial_context: yy.xpathmodels.XPathInitialContextEnum.HASHTAG,
                                                                      namespace: $$[$0],
                                                                      steps: []}); 
break;
case 39:
this.$ = [$$[$0]];
break;
case 40:
var path = $$[$0-2]; path.push($$[$0]); this.$ = path;
break;
case 41:
 this.$ = $$[$0-1]; 
break;
case 42:
 this.$ = new yy.xpathmodels.XPathPathExpr({initial_context: yy.xpathmodels.XPathInitialContextEnum.RELATIVE,
                                                                      steps: $$[$0]}); 
break;
case 43:
 this.$ = new yy.xpathmodels.XPathPathExpr({initial_context: yy.xpathmodels.XPathInitialContextEnum.ROOT,
                                                                      steps: $$[$0]}); 
break;
case 44:
 var steps = $$[$0];
                                              // insert descendant step into beginning
                                              steps.splice(0, 0, new yy.xpathmodels.XPathStep({axis: yy.xpathmodels.XPathAxisEnum.DESCENDANT_OR_SELF, 
                                                                                test: yy.xpathmodels.XPathTestEnum.TYPE_NODE}));
                                              this.$ = new yy.xpathmodels.XPathPathExpr({initial_context: yy.xpathmodels.XPathInitialContextEnum.ROOT,
                                                                      steps: steps}); 
break;
case 45:
 this.$ = new yy.xpathmodels.XPathPathExpr({initial_context: yy.xpathmodels.XPathInitialContextEnum.ROOT,
                                                              steps: []});
break;
case 46:
 this.$ = [$$[$0]];
break;
case 47:
 var path = $$[$0-2];
                                            path.push($$[$0]);
                                            this.$ = path; 
break;
case 48:
 var path = $$[$0-2];
                                            path.push(new yy.xpathmodels.XPathStep({axis: yy.xpathmodels.XPathAxisEnum.DESCENDANT_OR_SELF, 
                                                                     test: yy.xpathmodels.XPathTestEnum.TYPE_NODE}));
                                            path.push($$[$0]);
                                            this.$ = path; 
break;
case 49: case 53:
 this.$ = $$[$0]; 
break;
case 50:
 this.$ = new yy.xpathmodels.XPathStep({axis: yy.xpathmodels.XPathAxisEnum.SELF, 
                                                          test: yy.xpathmodels.XPathTestEnum.TYPE_NODE}); 
break;
case 51:
 this.$ = new yy.xpathmodels.XPathStep({axis: yy.xpathmodels.XPathAxisEnum.PARENT, 
                                                          test: yy.xpathmodels.XPathTestEnum.TYPE_NODE}); 
break;
case 52:
 var step = $$[$0-1];
                                            step.predicates.push($$[$0]);
                                            this.$ = step; 
break;
case 54:
 var nodeTest = $$[$0]; // temporary dict with appropriate args
                                          nodeTest.axis = yy.xpathmodels.XPathAxisEnum.CHILD;
                                          this.$ = new yy.xpathmodels.XPathStep(nodeTest); 
break;
case 55:
 var nodeTest = $$[$0];  // temporary dict with appropriate args
                                          nodeTest.axis = $$[$0-1]; // add axis
                                          this.$ = new yy.xpathmodels.XPathStep(nodeTest); 
break;
case 56:
 this.$ = yy.xpathmodels.validateAxisName($$[$0-1]); 
break;
case 57:
 this.$ = yy.xpathmodels.XPathAxisEnum.ATTRIBUTE; 
break;
case 58:
 this.$ = {"test": yy.xpathmodels.XPathTestEnum.NAME, "name": $$[$0]}; 
break;
case 59:
 this.$ = {"test": yy.xpathmodels.XPathTestEnum.NAME_WILDCARD}; 
break;
case 60:
 this.$ = {"test": yy.xpathmodels.XPathTestEnum.NAMESPACE_WILDCARD, "namespace": $$[$0]}; 
break;
case 61:
 this.$ = {"test": yy.xpathmodels.XPathTestEnum.TYPE_NODE}; 
break;
case 62:
 this.$ = {"test": yy.xpathmodels.XPathTestEnum.TYPE_TEXT}; 
break;
case 63:
 this.$ = {"test": yy.xpathmodels.XPathTestEnum.TYPE_COMMENT}; 
break;
case 64:
 this.$ = {"test": yy.xpathmodels.XPathTestEnum.TYPE_PROCESSING_INSTRUCTION, "literal": null}; 
break;
case 65:
 this.$ = {"test": yy.xpathmodels.XPathTestEnum.TYPE_PROCESSING_INSTRUCTION, "literal": $$[$0-1]}; 
break;
case 66:
 this.$ = new yy.xpathmodels.XPathStringLiteral($$[$0]); 
break;
case 67:
 this.$ = new yy.xpathmodels.XPathNumericLiteral($$[$0]); 
break;
}
},
table: [{3:1,4:2,6:3,7:4,8:5,9:6,10:7,11:$V0,13:9,14:$V1,15:11,25:$V2,30:$V3,33:13,34:$V4,35:18,36:$V5,38:$V6,42:21,43:22,44:$V7,45:$V8,46:25,47:26,48:27,50:$V9,51:$Va,52:$Vb,53:$Vc,54:$Vd,55:$Ve,56:$Vf,57:$Vg,58:$Vh},{1:[3]},{5:[1,35],16:$Vi,17:$Vj,18:$Vk,19:$Vl,20:$Vm,21:$Vn,22:$Vo,23:$Vp,24:$Vq,25:$Vr,26:$Vs,27:$Vt,28:$Vu,29:$Vv},o($Vw,[2,2],{37:52,34:[1,50],36:[1,51],40:$Vx}),o($Vw,[2,3]),o($Vw,[2,4]),o($Vw,[2,5],{37:56,34:[1,54],36:[1,55],40:$Vx}),o($Vw,[2,6]),{4:57,6:3,7:4,8:5,9:6,10:7,11:$V0,13:9,14:$V1,15:11,25:$V2,30:$V3,33:13,34:$V4,35:18,36:$V5,38:$V6,42:21,43:22,44:$V7,45:$V8,46:25,47:26,48:27,50:$V9,51:$Va,52:$Vb,53:$Vc,54:$Vd,55:$Ve,56:$Vf,57:$Vg,58:$Vh},o($Vy,[2,8]),o($Vy,[2,9]),o($Vy,[2,10]),{4:58,6:3,7:4,8:5,9:6,10:7,11:$V0,13:9,14:$V1,15:11,25:$V2,30:$V3,33:13,34:$V4,35:18,36:$V5,38:$V6,42:21,43:22,44:$V7,45:$V8,46:25,47:26,48:27,50:$V9,51:$Va,52:$Vb,53:$Vc,54:$Vd,55:$Ve,56:$Vf,57:$Vg,58:$Vh},o($Vw,[2,30]),{30:[1,59]},o($Vy,$Vz,{11:[1,60],49:$VA}),o($Vy,[2,66]),o($Vy,[2,67]),o($Vw,[2,42],{34:$VB,36:$VC}),o($Vw,[2,45],{42:21,43:22,46:25,47:26,48:27,35:64,30:$VD,44:$V7,45:$V8,50:$V9,51:$Va,52:$Vb,53:$Vc,54:$Vd,55:$Ve,56:$Vf}),{30:$VD,35:66,42:21,43:22,44:$V7,45:$V8,46:25,47:26,48:27,50:$V9,51:$Va,52:$Vb,53:$Vc,54:$Vd,55:$Ve,56:$Vf},o($VE,[2,46]),o($VE,[2,49],{37:67,40:$Vx}),o($VE,[2,50]),o($VE,[2,51]),o($Vy,[2,53]),o($Vy,[2,54]),{30:[1,69],47:68,51:$Va,52:$Vb,53:$Vc,54:$Vd,55:$Ve,56:$Vf},o($Vy,[2,59]),o($Vy,[2,60]),{11:[1,70]},{11:[1,71]},{11:[1,72]},{11:[1,73]},o($VF,[2,57]),{1:[2,1]},{4:74,6:3,7:4,8:5,9:6,10:7,11:$V0,13:9,14:$V1,15:11,25:$V2,30:$V3,33:13,34:$V4,35:18,36:$V5,38:$V6,42:21,43:22,44:$V7,45:$V8,46:25,47:26,48:27,50:$V9,51:$Va,52:$Vb,53:$Vc,54:$Vd,55:$Ve,56:$Vf,57:$Vg,58:$Vh},{4:75,6:3,7:4,8:5,9:6,10:7,11:$V0,13:9,14:$V1,15:11,25:$V2,30:$V3,33:13,34:$V4,35:18,36:$V5,38:$V6,42:21,43:22,44:$V7,45:$V8,46:25,47:26,48:27,50:$V9,51:$Va,52:$Vb,53:$Vc,54:$Vd,55:$Ve,56:$Vf,57:$Vg,58:$Vh},{4:76,6:3,7:4,8:5,9:6,10:7,11:$V0,13:9,14:$V1,15:11,25:$V2,30:$V3,33:13,34:$V4,35:18,36:$V5,38:$V6,42:21,43:22,44:$V7,45:$V8,46:25,47:26,48:27,50:$V9,51:$Va,52:$Vb,53:$Vc,54:$Vd,55:$Ve,56:$Vf,57:$Vg,58:$Vh},{4:77,6:3,7:4,8:5,9:6,10:7,11:$V0,13:9,14:$V1,15:11,25:$V2,30:$V3,33:13,34:$V4,35:18,36:$V5,38:$V6,42:21,43:22,44:$V7,45:$V8,46:25,47:26,48:27,50:$V9,51:$Va,52:$Vb,53:$Vc,54:$Vd,55:$Ve,56:$Vf,57:$Vg,58:$Vh},{4:78,6:3,7:4,8:5,9:6,10:7,11:$V0,13:9,14:$V1,15:11,25:$V2,30:$V3,33:13,34:$V4,35:18,36:$V5,38:$V6,42:21,43:22,44:$V7,45:$V8,46:25,47:26,48:27,50:$V9,51:$Va,52:$Vb,53:$Vc,54:$Vd,55:$Ve,56:$Vf,57:$Vg,58:$Vh},{4:79,6:3,7:4,8:5,9:6,10:7,11:$V0,13:9,14:$V1,15:11,25:$V2,30:$V3,33:13,34:$V4,35:18,36:$V5,38:$V6,42:21,43:22,44:$V7,45:$V8,46:25,47:26,48:27,50:$V9,51:$Va,52:$Vb,53:$Vc,54:$Vd,55:$Ve,56:$Vf,57:$Vg,58:$Vh},{4:80,6:3,7:4,8:5,9:6,10:7,11:$V0,13:9,14:$V1,15:11,25:$V2,30:$V3,33:13,34:$V4,35:18,36:$V5,38:$V6,42:21,43:22,44:$V7,45:$V8,46:25,47:26,48:27,50:$V9,51:$Va,52:$Vb,53:$Vc,54:$Vd,55:$Ve,56:$Vf,57:$Vg,58:$Vh},{4:81,6:3,7:4,8:5,9:6,10:7,11:$V0,13:9,14:$V1,15:11,25:$V2,30:$V3,33:13,34:$V4,35:18,36:$V5,38:$V6,42:21,43:22,44:$V7,45:$V8,46:25,47:26,48:27,50:$V9,51:$Va,52:$Vb,53:$Vc,54:$Vd,55:$Ve,56:$Vf,57:$Vg,58:$Vh},{4:82,6:3,7:4,8:5,9:6,10:7,11:$V0,13:9,14:$V1,15:11,25:$V2,30:$V3,33:13,34:$V4,35:18,36:$V5,38:$V6,42:21,43:22,44:$V7,45:$V8,46:25,47:26,48:27,50:$V9,51:$Va,52:$Vb,53:$Vc,54:$Vd,55:$Ve,56:$Vf,57:$Vg,58:$Vh},{4:83,6:3,7:4,8:5,9:6,10:7,11:$V0,13:9,14:$V1,15:11,25:$V2,30:$V3,33:13,34:$V4,35:18,36:$V5,38:$V6,42:21,43:22,44:$V7,45:$V8,46:25,47:26,48:27,50:$V9,51:$Va,52:$Vb,53:$Vc,54:$Vd,55:$Ve,56:$Vf,57:$Vg,58:$Vh},{4:84,6:3,7:4,8:5,9:6,10:7,11:$V0,13:9,14:$V1,15:11,25:$V2,30:$V3,33:13,34:$V4,35:18,36:$V5,38:$V6,42:21,43:22,44:$V7,45:$V8,46:25,47:26,48:27,50:$V9,51:$Va,52:$Vb,53:$Vc,54:$Vd,55:$Ve,56:$Vf,57:$Vg,58:$Vh},{4:85,6:3,7:4,8:5,9:6,10:7,11:$V0,13:9,14:$V1,15:11,25:$V2,30:$V3,33:13,34:$V4,35:18,36:$V5,38:$V6,42:21,43:22,44:$V7,45:$V8,46:25,47:26,48:27,50:$V9,51:$Va,52:$Vb,53:$Vc,54:$Vd,55:$Ve,56:$Vf,57:$Vg,58:$Vh},{4:86,6:3,7:4,8:5,9:6,10:7,11:$V0,13:9,14:$V1,15:11,25:$V2,30:$V3,33:13,34:$V4,35:18,36:$V5,38:$V6,42:21,43:22,44:$V7,45:$V8,46:25,47:26,48:27,50:$V9,51:$Va,52:$Vb,53:$Vc,54:$Vd,55:$Ve,56:$Vf,57:$Vg,58:$Vh},{4:87,6:3,7:4,8:5,9:6,10:7,11:$V0,13:9,14:$V1,15:11,25:$V2,30:$V3,33:13,34:$V4,35:18,36:$V5,38:$V6,42:21,43:22,44:$V7,45:$V8,46:25,47:26,48:27,50:$V9,51:$Va,52:$Vb,53:$Vc,54:$Vd,55:$Ve,56:$Vf,57:$Vg,58:$Vh},{30:$VD,35:88,42:21,43:22,44:$V7,45:$V8,46:25,47:26,48:27,50:$V9,51:$Va,52:$Vb,53:$Vc,54:$Vd,55:$Ve,56:$Vf},{30:$VD,35:89,42:21,43:22,44:$V7,45:$V8,46:25,47:26,48:27,50:$V9,51:$Va,52:$Vb,53:$Vc,54:$Vd,55:$Ve,56:$Vf},o($Vy,[2,35]),{4:90,6:3,7:4,8:5,9:6,10:7,11:$V0,13:9,14:$V1,15:11,25:$V2,30:$V3,33:13,34:$V4,35:18,36:$V5,38:$V6,42:21,43:22,44:$V7,45:$V8,46:25,47:26,48:27,50:$V9,51:$Va,52:$Vb,53:$Vc,54:$Vd,55:$Ve,56:$Vf,57:$Vg,58:$Vh},{30:$VD,35:91,42:21,43:22,44:$V7,45:$V8,46:25,47:26,48:27,50:$V9,51:$Va,52:$Vb,53:$Vc,54:$Vd,55:$Ve,56:$Vf},{30:$VD,35:92,42:21,43:22,44:$V7,45:$V8,46:25,47:26,48:27,50:$V9,51:$Va,52:$Vb,53:$Vc,54:$Vd,55:$Ve,56:$Vf},o($Vy,[2,36]),{12:[1,93],16:$Vi,17:$Vj,18:$Vk,19:$Vl,20:$Vm,21:$Vn,22:$Vo,23:$Vp,24:$Vq,25:$Vr,26:$Vs,27:$Vt,28:$Vu,29:$Vv},o($VG,[2,24],{29:$Vv}),o($Vw,[2,38],{34:[1,94]}),{4:97,6:3,7:4,8:5,9:6,10:7,11:$V0,12:[1,96],13:9,14:$V1,15:11,25:$V2,30:$V3,31:95,33:13,34:$V4,35:18,36:$V5,38:$V6,42:21,43:22,44:$V7,45:$V8,46:25,47:26,48:27,50:$V9,51:$Va,52:$Vb,53:$Vc,54:$Vd,55:$Ve,56:$Vf,57:$Vg,58:$Vh},o($VF,[2,56]),{30:$VD,42:98,43:22,44:$V7,45:$V8,46:25,47:26,48:27,50:$V9,51:$Va,52:$Vb,53:$Vc,54:$Vd,55:$Ve,56:$Vf},{30:$VD,42:99,43:22,44:$V7,45:$V8,46:25,47:26,48:27,50:$V9,51:$Va,52:$Vb,53:$Vc,54:$Vd,55:$Ve,56:$Vf},o($Vw,[2,43],{34:$VB,36:$VC}),o($Vy,$Vz,{49:$VA}),o($Vw,[2,44],{34:$VB,36:$VC}),o($Vy,[2,52]),o($Vy,[2,55]),o($Vy,$Vz),{12:[1,100]},{12:[1,101]},{12:[1,102]},{12:[1,103],57:[1,104]},o([5,12,32,41],[2,11],{16:$Vi,17:$Vj,18:$Vk,19:$Vl,20:$Vm,21:$Vn,22:$Vo,23:$Vp,24:$Vq,25:$Vr,26:$Vs,27:$Vt,28:$Vu,29:$Vv}),o([5,12,16,32,41],[2,12],{17:$Vj,18:$Vk,19:$Vl,20:$Vm,21:$Vn,22:$Vo,23:$Vp,24:$Vq,25:$Vr,26:$Vs,27:$Vt,28:$Vu,29:$Vv}),o($VH,[2,13],{20:$Vm,21:$Vn,22:$Vo,23:$Vp,24:$Vq,25:$Vr,26:$Vs,27:$Vt,28:$Vu,29:$Vv}),o($VH,[2,14],{20:$Vm,21:$Vn,22:$Vo,23:$Vp,24:$Vq,25:$Vr,26:$Vs,27:$Vt,28:$Vu,29:$Vv}),o($VI,[2,15],{24:$Vq,25:$Vr,26:$Vs,27:$Vt,28:$Vu,29:$Vv}),o($VI,[2,16],{24:$Vq,25:$Vr,26:$Vs,27:$Vt,28:$Vu,29:$Vv}),o($VI,[2,17],{24:$Vq,25:$Vr,26:$Vs,27:$Vt,28:$Vu,29:$Vv}),o($VI,[2,18],{24:$Vq,25:$Vr,26:$Vs,27:$Vt,28:$Vu,29:$Vv}),o($VJ,[2,19],{26:$Vs,27:$Vt,28:$Vu,29:$Vv}),o($VJ,[2,20],{26:$Vs,27:$Vt,28:$Vu,29:$Vv}),o($VG,[2,21],{29:$Vv}),o($VG,[2,22],{29:$Vv}),o($VG,[2,23],{29:$Vv}),o($Vw,[2,25]),o($Vw,[2,33],{34:$VB,36:$VC}),o($Vw,[2,34],{34:$VB,36:$VC}),{16:$Vi,17:$Vj,18:$Vk,19:$Vl,20:$Vm,21:$Vn,22:$Vo,23:$Vp,24:$Vq,25:$Vr,26:$Vs,27:$Vt,28:$Vu,29:$Vv,41:[1,105]},o($Vw,[2,31],{34:$VB,36:$VC}),o($Vw,[2,32],{34:$VB,36:$VC}),o($Vy,[2,7]),{30:[1,107],39:106},{12:[1,108],32:[1,109]},o($Vy,[2,27]),o($VK,[2,29],{16:$Vi,17:$Vj,18:$Vk,19:$Vl,20:$Vm,21:$Vn,22:$Vo,23:$Vp,24:$Vq,25:$Vr,26:$Vs,27:$Vt,28:$Vu,29:$Vv}),o($VE,[2,47]),o($VE,[2,48]),o($Vy,[2,61]),o($Vy,[2,62]),o($Vy,[2,63]),o($Vy,[2,64]),{12:[1,110]},o($Vy,[2,41]),o($Vw,[2,37],{34:[1,111]}),o($VL,[2,39]),o($Vy,[2,26]),{4:112,6:3,7:4,8:5,9:6,10:7,11:$V0,13:9,14:$V1,15:11,25:$V2,30:$V3,33:13,34:$V4,35:18,36:$V5,38:$V6,42:21,43:22,44:$V7,45:$V8,46:25,47:26,48:27,50:$V9,51:$Va,52:$Vb,53:$Vc,54:$Vd,55:$Ve,56:$Vf,57:$Vg,58:$Vh},o($Vy,[2,65]),{30:[1,113]},o($VK,[2,28],{16:$Vi,17:$Vj,18:$Vk,19:$Vl,20:$Vm,21:$Vn,22:$Vo,23:$Vp,24:$Vq,25:$Vr,26:$Vs,27:$Vt,28:$Vu,29:$Vv}),o($VL,[2,40])],
defaultActions: {35:[2,1]},
parseError: function parseError(str, hash) {
    if (hash.recoverable) {
        this.trace(str);
    } else {
        function _parseError (msg, hash) {
            this.message = msg;
            this.hash = hash;
        }
        _parseError.prototype = new Error();

        throw new _parseError(str, hash);
    }
},
parse: function parse(input) {
    var self = this, stack = [0], tstack = [], vstack = [null], lstack = [], table = this.table, yytext = '', yylineno = 0, yyleng = 0, recovering = 0, TERROR = 2, EOF = 1;
    var args = lstack.slice.call(arguments, 1);
    var lexer = Object.create(this.lexer);
    var sharedState = { yy: {} };
    for (var k in this.yy) {
        if (Object.prototype.hasOwnProperty.call(this.yy, k)) {
            sharedState.yy[k] = this.yy[k];
        }
    }
    lexer.setInput(input, sharedState.yy);
    sharedState.yy.lexer = lexer;
    sharedState.yy.parser = this;
    if (typeof lexer.yylloc == 'undefined') {
        lexer.yylloc = {};
    }
    var yyloc = lexer.yylloc;
    lstack.push(yyloc);
    var ranges = lexer.options && lexer.options.ranges;
    if (typeof sharedState.yy.parseError === 'function') {
        this.parseError = sharedState.yy.parseError;
    } else {
        this.parseError = Object.getPrototypeOf(this).parseError;
    }
    function popStack(n) {
        stack.length = stack.length - 2 * n;
        vstack.length = vstack.length - n;
        lstack.length = lstack.length - n;
    }
    _token_stack:
        var lex = function () {
            var token;
            token = lexer.lex() || EOF;
            if (typeof token !== 'number') {
                token = self.symbols_[token] || token;
            }
            return token;
        };
    var symbol, preErrorSymbol, state, action, a, r, yyval = {}, p, len, newState, expected;
    while (true) {
        state = stack[stack.length - 1];
        if (this.defaultActions[state]) {
            action = this.defaultActions[state];
        } else {
            if (symbol === null || typeof symbol == 'undefined') {
                symbol = lex();
            }
            action = table[state] && table[state][symbol];
        }
                    if (typeof action === 'undefined' || !action.length || !action[0]) {
                var errStr = '';
                expected = [];
                for (p in table[state]) {
                    if (this.terminals_[p] && p > TERROR) {
                        expected.push('\'' + this.terminals_[p] + '\'');
                    }
                }
                if (lexer.showPosition) {
                    errStr = 'Parse error on line ' + (yylineno + 1) + ':\n' + lexer.showPosition() + '\nExpecting ' + expected.join(', ') + ', got \'' + (this.terminals_[symbol] || symbol) + '\'';
                } else {
                    errStr = 'Parse error on line ' + (yylineno + 1) + ': Unexpected ' + (symbol == EOF ? 'end of input' : '\'' + (this.terminals_[symbol] || symbol) + '\'');
                }
                this.parseError(errStr, {
                    text: lexer.match,
                    token: this.terminals_[symbol] || symbol,
                    line: lexer.yylineno,
                    loc: yyloc,
                    expected: expected
                });
            }
        if (action[0] instanceof Array && action.length > 1) {
            throw new Error('Parse Error: multiple actions possible at state: ' + state + ', token: ' + symbol);
        }
        switch (action[0]) {
        case 1:
            stack.push(symbol);
            vstack.push(lexer.yytext);
            lstack.push(lexer.yylloc);
            stack.push(action[1]);
            symbol = null;
            if (!preErrorSymbol) {
                yyleng = lexer.yyleng;
                yytext = lexer.yytext;
                yylineno = lexer.yylineno;
                yyloc = lexer.yylloc;
                if (recovering > 0) {
                    recovering--;
                }
            } else {
                symbol = preErrorSymbol;
                preErrorSymbol = null;
            }
            break;
        case 2:
            len = this.productions_[action[1]][1];
            yyval.$ = vstack[vstack.length - len];
            yyval._$ = {
                first_line: lstack[lstack.length - (len || 1)].first_line,
                last_line: lstack[lstack.length - 1].last_line,
                first_column: lstack[lstack.length - (len || 1)].first_column,
                last_column: lstack[lstack.length - 1].last_column
            };
            if (ranges) {
                yyval._$.range = [
                    lstack[lstack.length - (len || 1)].range[0],
                    lstack[lstack.length - 1].range[1]
                ];
            }
            r = this.performAction.apply(yyval, [
                yytext,
                yyleng,
                yylineno,
                sharedState.yy,
                action[1],
                vstack,
                lstack
            ].concat(args));
            if (typeof r !== 'undefined') {
                return r;
            }
            if (len) {
                stack = stack.slice(0, -1 * len * 2);
                vstack = vstack.slice(0, -1 * len);
                lstack = lstack.slice(0, -1 * len);
            }
            stack.push(this.productions_[action[1]][0]);
            vstack.push(yyval.$);
            lstack.push(yyval._$);
            newState = table[stack[stack.length - 2]][stack[stack.length - 1]];
            stack.push(newState);
            break;
        case 3:
            return true;
        }
    }
    return true;
}};
/* generated by jison-lex 0.3.4 */
var lexer = (function(){
var lexer = ({

EOF:1,

parseError:function parseError(str, hash) {
        if (this.yy.parser) {
            this.yy.parser.parseError(str, hash);
        } else {
            throw new Error(str);
        }
    },

// resets the lexer, sets new input
setInput:function (input, yy) {
        this.yy = yy || this.yy || {};
        this._input = input;
        this._more = this._backtrack = this.done = false;
        this.yylineno = this.yyleng = 0;
        this.yytext = this.matched = this.match = '';
        this.conditionStack = ['INITIAL'];
        this.yylloc = {
            first_line: 1,
            first_column: 0,
            last_line: 1,
            last_column: 0
        };
        if (this.options.ranges) {
            this.yylloc.range = [0,0];
        }
        this.offset = 0;
        return this;
    },

// consumes and returns one char from the input
input:function () {
        var ch = this._input[0];
        this.yytext += ch;
        this.yyleng++;
        this.offset++;
        this.match += ch;
        this.matched += ch;
        var lines = ch.match(/(?:\r\n?|\n).*/g);
        if (lines) {
            this.yylineno++;
            this.yylloc.last_line++;
        } else {
            this.yylloc.last_column++;
        }
        if (this.options.ranges) {
            this.yylloc.range[1]++;
        }

        this._input = this._input.slice(1);
        return ch;
    },

// unshifts one char (or a string) into the input
unput:function (ch) {
        var len = ch.length;
        var lines = ch.split(/(?:\r\n?|\n)/g);

        this._input = ch + this._input;
        this.yytext = this.yytext.substr(0, this.yytext.length - len);
        //this.yyleng -= len;
        this.offset -= len;
        var oldLines = this.match.split(/(?:\r\n?|\n)/g);
        this.match = this.match.substr(0, this.match.length - 1);
        this.matched = this.matched.substr(0, this.matched.length - 1);

        if (lines.length - 1) {
            this.yylineno -= lines.length - 1;
        }
        var r = this.yylloc.range;

        this.yylloc = {
            first_line: this.yylloc.first_line,
            last_line: this.yylineno + 1,
            first_column: this.yylloc.first_column,
            last_column: lines ?
                (lines.length === oldLines.length ? this.yylloc.first_column : 0)
                 + oldLines[oldLines.length - lines.length].length - lines[0].length :
              this.yylloc.first_column - len
        };

        if (this.options.ranges) {
            this.yylloc.range = [r[0], r[0] + this.yyleng - len];
        }
        this.yyleng = this.yytext.length;
        return this;
    },

// When called from action, caches matched text and appends it on next action
more:function () {
        this._more = true;
        return this;
    },

// When called from action, signals the lexer that this rule fails to match the input, so the next matching rule (regex) should be tested instead.
reject:function () {
        if (this.options.backtrack_lexer) {
            this._backtrack = true;
        } else {
            return this.parseError('Lexical error on line ' + (this.yylineno + 1) + '. You can only invoke reject() in the lexer when the lexer is of the backtracking persuasion (options.backtrack_lexer = true).\n' + this.showPosition(), {
                text: "",
                token: null,
                line: this.yylineno
            });

        }
        return this;
    },

// retain first n characters of the match
less:function (n) {
        this.unput(this.match.slice(n));
    },

// displays already matched input, i.e. for error messages
pastInput:function () {
        var past = this.matched.substr(0, this.matched.length - this.match.length);
        return (past.length > 20 ? '...':'') + past.substr(-20).replace(/\n/g, "");
    },

// displays upcoming input, i.e. for error messages
upcomingInput:function () {
        var next = this.match;
        if (next.length < 20) {
            next += this._input.substr(0, 20-next.length);
        }
        return (next.substr(0,20) + (next.length > 20 ? '...' : '')).replace(/\n/g, "");
    },

// displays the character position where the lexing error occurred, i.e. for error messages
showPosition:function () {
        var pre = this.pastInput();
        var c = new Array(pre.length + 1).join("-");
        return pre + this.upcomingInput() + "\n" + c + "^";
    },

// test the lexed token: return FALSE when not a match, otherwise return token
test_match:function (match, indexed_rule) {
        var token,
            lines,
            backup;

        if (this.options.backtrack_lexer) {
            // save context
            backup = {
                yylineno: this.yylineno,
                yylloc: {
                    first_line: this.yylloc.first_line,
                    last_line: this.last_line,
                    first_column: this.yylloc.first_column,
                    last_column: this.yylloc.last_column
                },
                yytext: this.yytext,
                match: this.match,
                matches: this.matches,
                matched: this.matched,
                yyleng: this.yyleng,
                offset: this.offset,
                _more: this._more,
                _input: this._input,
                yy: this.yy,
                conditionStack: this.conditionStack.slice(0),
                done: this.done
            };
            if (this.options.ranges) {
                backup.yylloc.range = this.yylloc.range.slice(0);
            }
        }

        lines = match[0].match(/(?:\r\n?|\n).*/g);
        if (lines) {
            this.yylineno += lines.length;
        }
        this.yylloc = {
            first_line: this.yylloc.last_line,
            last_line: this.yylineno + 1,
            first_column: this.yylloc.last_column,
            last_column: lines ?
                         lines[lines.length - 1].length - lines[lines.length - 1].match(/\r?\n?/)[0].length :
                         this.yylloc.last_column + match[0].length
        };
        this.yytext += match[0];
        this.match += match[0];
        this.matches = match;
        this.yyleng = this.yytext.length;
        if (this.options.ranges) {
            this.yylloc.range = [this.offset, this.offset += this.yyleng];
        }
        this._more = false;
        this._backtrack = false;
        this._input = this._input.slice(match[0].length);
        this.matched += match[0];
        token = this.performAction.call(this, this.yy, this, indexed_rule, this.conditionStack[this.conditionStack.length - 1]);
        if (this.done && this._input) {
            this.done = false;
        }
        if (token) {
            return token;
        } else if (this._backtrack) {
            // recover context
            for (var k in backup) {
                this[k] = backup[k];
            }
            return false; // rule action called reject() implying the next rule should be tested instead.
        }
        return false;
    },

// return next match in input
next:function () {
        if (this.done) {
            return this.EOF;
        }
        if (!this._input) {
            this.done = true;
        }

        var token,
            match,
            tempMatch,
            index;
        if (!this._more) {
            this.yytext = '';
            this.match = '';
        }
        var rules = this._currentRules();
        for (var i = 0; i < rules.length; i++) {
            tempMatch = this._input.match(this.rules[rules[i]]);
            if (tempMatch && (!match || tempMatch[0].length > match[0].length)) {
                match = tempMatch;
                index = i;
                if (this.options.backtrack_lexer) {
                    token = this.test_match(tempMatch, rules[i]);
                    if (token !== false) {
                        return token;
                    } else if (this._backtrack) {
                        match = false;
                        continue; // rule action called reject() implying a rule MISmatch.
                    } else {
                        // else: this is a lexer rule which consumes input without producing a token (e.g. whitespace)
                        return false;
                    }
                } else if (!this.options.flex) {
                    break;
                }
            }
        }
        if (match) {
            token = this.test_match(match, rules[index]);
            if (token !== false) {
                return token;
            }
            // else: this is a lexer rule which consumes input without producing a token (e.g. whitespace)
            return false;
        }
        if (this._input === "") {
            return this.EOF;
        } else {
            return this.parseError('Lexical error on line ' + (this.yylineno + 1) + '. Unrecognized text.\n' + this.showPosition(), {
                text: "",
                token: null,
                line: this.yylineno
            });
        }
    },

// return next match that has a token
lex:function lex() {
        var r = this.next();
        if (r) {
            return r;
        } else {
            return this.lex();
        }
    },

// activates a new lexer condition state (pushes the new lexer condition state onto the condition stack)
begin:function begin(condition) {
        this.conditionStack.push(condition);
    },

// pop the previously active lexer condition state off the condition stack
popState:function popState() {
        var n = this.conditionStack.length - 1;
        if (n > 0) {
            return this.conditionStack.pop();
        } else {
            return this.conditionStack[0];
        }
    },

// produce the lexer rule set which is active for the currently active lexer condition state
_currentRules:function _currentRules() {
        if (this.conditionStack.length && this.conditionStack[this.conditionStack.length - 1]) {
            return this.conditions[this.conditionStack[this.conditionStack.length - 1]].rules;
        } else {
            return this.conditions["INITIAL"].rules;
        }
    },

// return the currently active lexer condition state; when an index argument is provided it produces the N-th previous condition state, if available
topState:function topState(n) {
        n = this.conditionStack.length - 1 - Math.abs(n || 0);
        if (n >= 0) {
            return this.conditionStack[n];
        } else {
            return "INITIAL";
        }
    },

// alias for begin(condition)
pushState:function pushState(condition) {
        this.begin(condition);
    },

// return the number of states currently on the stack
stateStackSize:function stateStackSize() {
        return this.conditionStack.length;
    },
options: {},
performAction: function anonymous(yy,yy_,$avoiding_name_collisions,YY_START) {
var YYSTATE=YY_START;
switch($avoiding_name_collisions) {
case 0:/* ignore whitespace */ 
break;
case 1: yy.xpathmodels.debuglog("NODETYPE", yy_.yytext); return "NODETYPE_NODE"; 
break;
case 2: yy.xpathmodels.debuglog("NODETYPE", yy_.yytext); return "NODETYPE_TEXT"; 
break;
case 3: yy.xpathmodels.debuglog("NODETYPE", yy_.yytext); return "NODETYPE_COMMENT"; 
break;
case 4: yy.xpathmodels.debuglog("NODETYPE", yy_.yytext); return "NODETYPE_PROCINSTR"; 
break;
case 5: this.begin("OP_CONTEXT"); yy_.yytext = yy_.yytext.substr(1,yy_.yyleng-1); yy.xpathmodels.debuglog("VAR", yy_.yytext); return "VAR"; 
break;
case 6: this.begin("OP_CONTEXT"); 
                                     yy_.yytext = yy_.yytext.substr(0, yy_.yyleng-2);
                                     yy.xpathmodels.debuglog("NSWILDCARD", yy_.yytext); return "NSWILDCARD"; 
break;
case 7: this.begin("OP_CONTEXT"); yy.xpathmodels.debuglog("QNAME", yy_.yytext); return "QNAME"; 
break;
case 8: this.begin("OP_CONTEXT"); yy.xpathmodels.debuglog("WILDCARD", yy_.yytext); return "WILDCARD"; 
break;
case 9: this.begin("VAL_CONTEXT"); yy.xpathmodels.debuglog("MULT", yy_.yytext); return "MULT"; 
break;
case 10: this.begin("VAL_CONTEXT"); yy.xpathmodels.debuglog("AND", yy_.yytext); return "AND"; 
break;
case 11: this.begin("VAL_CONTEXT"); yy.xpathmodels.debuglog("OR", yy_.yytext); return "OR"; 
break;
case 12: this.begin("VAL_CONTEXT"); yy.xpathmodels.debuglog("DIV", yy_.yytext); return "DIV"; 
break;
case 13: this.begin("VAL_CONTEXT"); yy.xpathmodels.debuglog("MOD", yy_.yytext); return "MOD"; 
break;
case 14: this.begin("OP_CONTEXT"); yy.xpathmodels.debuglog("NUM", yy_.yytext); return "NUM"; 
break;
case 15: this.begin("VAL_CONTEXT"); yy.xpathmodels.debuglog("EQ", yy_.yytext); return "EQ"; 
break;
case 16: this.begin("VAL_CONTEXT"); yy.xpathmodels.debuglog("NEQ", yy_.yytext); return "NEQ"; 
break;
case 17: this.begin("VAL_CONTEXT"); yy.xpathmodels.debuglog("LTE", yy_.yytext); return "LTE"; 
break;
case 18: this.begin("VAL_CONTEXT"); yy.xpathmodels.debuglog("LT", yy_.yytext); return "LT"; 
break;
case 19: this.begin("VAL_CONTEXT"); yy.xpathmodels.debuglog("GTE", yy_.yytext); return "GTE"; 
break;
case 20: this.begin("VAL_CONTEXT"); yy.xpathmodels.debuglog("GT", yy_.yytext); return "GT"; 
break;
case 21: this.begin("VAL_CONTEXT"); yy.xpathmodels.debuglog("PLUS", yy_.yytext); return "PLUS"; 
break;
case 22: this.begin("VAL_CONTEXT"); yy.xpathmodels.debuglog("MINUS", yy_.yytext); return "MINUS"; 
break;
case 23: this.begin("VAL_CONTEXT"); yy.xpathmodels.debuglog("UNION", yy_.yytext); return "UNION"; 
break;
case 24: this.begin("VAL_CONTEXT"); yy.xpathmodels.debuglog("DBL", yy_.yytext); return "DBL_SLASH"; 
break;
case 25: this.begin("VAL_CONTEXT"); yy.xpathmodels.debuglog("SLASH", yy_.yytext); return "SLASH"; 
break;
case 26: this.begin("VAL_CONTEXT"); yy.xpathmodels.debuglog("LBRACK", yy_.yytext); return "LBRACK"; 
break;
case 27: this.begin("OP_CONTEXT");  yy.xpathmodels.debuglog("RBRACK", yy_.yytext); return "RBRACK"; 
break;
case 28: this.begin("VAL_CONTEXT"); yy.xpathmodels.debuglog("LPAREN", yy_.yytext); return "LPAREN"; 
break;
case 29: this.begin("OP_CONTEXT");  yy.xpathmodels.debuglog("RPAREN", yy_.yytext); return "RPAREN"; 
break;
case 30: this.begin("OP_CONTEXT");  yy.xpathmodels.debuglog("DBL", yy_.yytext); return "DBL_DOT"; 
break;
case 31: this.begin("OP_CONTEXT");  yy.xpathmodels.debuglog("DOT", yy_.yytext); return "DOT"; 
break;
case 32: this.begin("VAL_CONTEXT"); yy.xpathmodels.debuglog("AT", yy_.yytext); return "AT"; 
break;
case 33: this.begin("VAL_CONTEXT"); yy.xpathmodels.debuglog("DBL", yy_.yytext); return "DBL_COLON"; 
break;
case 34: this.begin("VAL_CONTEXT"); yy.xpathmodels.debuglog("COMMA", yy_.yytext); return "COMMA"; 
break;
case 35: this.begin("VAL_CONTEXT"); yy.xpathmodels.debuglog("HASH", yy_.yytext); return "HASH"; 
break;
case 36: this.begin("OP_CONTEXT"); yy.xpathmodels.debuglog("STR", yy_.yytext); return "STR"; 
break;
case 37:return 5;
break;
}
},
rules: [/^(?:((\s+)))/,/^(?:node(?=(((\s+))?\()))/,/^(?:text(?=(((\s+))?\()))/,/^(?:comment(?=(((\s+))?\()))/,/^(?:processing-instruction(?=(((\s+))?\()))/,/^(?:\$([A-Za-z_][A-Za-z0-9._-]*(:[A-Za-z_][A-Za-z0-9._-]*)?))/,/^(?:([A-Za-z_][A-Za-z0-9._-]*):\*)/,/^(?:([A-Za-z_][A-Za-z0-9._-]*(:[A-Za-z_][A-Za-z0-9._-]*)?))/,/^(?:\*)/,/^(?:\*)/,/^(?:(and))/,/^(?:(or))/,/^(?:(div))/,/^(?:(mod))/,/^(?:(([0-9])+(\.([0-9])*)?|(\.([0-9])+)))/,/^(?:=)/,/^(?:!=)/,/^(?:<=)/,/^(?:<)/,/^(?:>=)/,/^(?:>)/,/^(?:\+)/,/^(?:-)/,/^(?:\|)/,/^(?:\/\/)/,/^(?:\/)/,/^(?:\[)/,/^(?:\])/,/^(?:\()/,/^(?:\))/,/^(?:\.\.)/,/^(?:\.)/,/^(?:@)/,/^(?:::)/,/^(?:,)/,/^(?:#)/,/^(?:("[^"\""]*"|'[^'\'']*'))/,/^(?:$)/],
conditions: {"INITIAL":{"rules":[0,1,2,3,4,5,6,7,8,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37],"inclusive":true},"OP_CONTEXT":{"rules":[0,1,2,3,4,5,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37],"inclusive":true},"VAL_CONTEXT":{"rules":[0,1,2,3,4,5,6,7,8,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37],"inclusive":true}}
});
return lexer;
})();
parser.lexer = lexer;
function Parser () {
  this.yy = {};
}
Parser.prototype = parser;parser.Parser = Parser;
return new Parser;
})();


if (typeof require !== 'undefined' && typeof exports !== 'undefined') {
exports.parser = parser;
exports.Parser = parser.Parser;
exports.parse = function () { return parser.parse.apply(parser, arguments); };
exports.main = function commonjsMain(args) {
    if (!args[1]) {
        console.log('Usage: '+args[0]+' FILE');
        process.exit(1);
    }
    var source = require('fs').readFileSync(require('path').normalize(args[1]), "utf8");
    return exports.parser.parse(source);
};
if (typeof module !== 'undefined' && require.main === module) {
  exports.main(process.argv.slice(1));
}
}
}).call(this,require('_process'))
},{"_process":7,"fs":5,"path":6}],5:[function(require,module,exports){

},{}],6:[function(require,module,exports){
(function (process){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// resolves . and .. elements in a path array with directory names there
// must be no slashes, empty elements, or device names (c:\) in the array
// (so also no leading and trailing slashes - it does not distinguish
// relative and absolute paths)
function normalizeArray(parts, allowAboveRoot) {
  // if the path tries to go above the root, `up` ends up > 0
  var up = 0;
  for (var i = parts.length - 1; i >= 0; i--) {
    var last = parts[i];
    if (last === '.') {
      parts.splice(i, 1);
    } else if (last === '..') {
      parts.splice(i, 1);
      up++;
    } else if (up) {
      parts.splice(i, 1);
      up--;
    }
  }

  // if the path is allowed to go above the root, restore leading ..s
  if (allowAboveRoot) {
    for (; up--; up) {
      parts.unshift('..');
    }
  }

  return parts;
}

// Split a filename into [root, dir, basename, ext], unix version
// 'root' is just a slash, or nothing.
var splitPathRe =
    /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
var splitPath = function(filename) {
  return splitPathRe.exec(filename).slice(1);
};

// path.resolve([from ...], to)
// posix version
exports.resolve = function() {
  var resolvedPath = '',
      resolvedAbsolute = false;

  for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
    var path = (i >= 0) ? arguments[i] : process.cwd();

    // Skip empty and invalid entries
    if (typeof path !== 'string') {
      throw new TypeError('Arguments to path.resolve must be strings');
    } else if (!path) {
      continue;
    }

    resolvedPath = path + '/' + resolvedPath;
    resolvedAbsolute = path.charAt(0) === '/';
  }

  // At this point the path should be resolved to a full absolute path, but
  // handle relative paths to be safe (might happen when process.cwd() fails)

  // Normalize the path
  resolvedPath = normalizeArray(filter(resolvedPath.split('/'), function(p) {
    return !!p;
  }), !resolvedAbsolute).join('/');

  return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
};

// path.normalize(path)
// posix version
exports.normalize = function(path) {
  var isAbsolute = exports.isAbsolute(path),
      trailingSlash = substr(path, -1) === '/';

  // Normalize the path
  path = normalizeArray(filter(path.split('/'), function(p) {
    return !!p;
  }), !isAbsolute).join('/');

  if (!path && !isAbsolute) {
    path = '.';
  }
  if (path && trailingSlash) {
    path += '/';
  }

  return (isAbsolute ? '/' : '') + path;
};

// posix version
exports.isAbsolute = function(path) {
  return path.charAt(0) === '/';
};

// posix version
exports.join = function() {
  var paths = Array.prototype.slice.call(arguments, 0);
  return exports.normalize(filter(paths, function(p, index) {
    if (typeof p !== 'string') {
      throw new TypeError('Arguments to path.join must be strings');
    }
    return p;
  }).join('/'));
};


// path.relative(from, to)
// posix version
exports.relative = function(from, to) {
  from = exports.resolve(from).substr(1);
  to = exports.resolve(to).substr(1);

  function trim(arr) {
    var start = 0;
    for (; start < arr.length; start++) {
      if (arr[start] !== '') break;
    }

    var end = arr.length - 1;
    for (; end >= 0; end--) {
      if (arr[end] !== '') break;
    }

    if (start > end) return [];
    return arr.slice(start, end - start + 1);
  }

  var fromParts = trim(from.split('/'));
  var toParts = trim(to.split('/'));

  var length = Math.min(fromParts.length, toParts.length);
  var samePartsLength = length;
  for (var i = 0; i < length; i++) {
    if (fromParts[i] !== toParts[i]) {
      samePartsLength = i;
      break;
    }
  }

  var outputParts = [];
  for (var i = samePartsLength; i < fromParts.length; i++) {
    outputParts.push('..');
  }

  outputParts = outputParts.concat(toParts.slice(samePartsLength));

  return outputParts.join('/');
};

exports.sep = '/';
exports.delimiter = ':';

exports.dirname = function(path) {
  var result = splitPath(path),
      root = result[0],
      dir = result[1];

  if (!root && !dir) {
    // No dirname whatsoever
    return '.';
  }

  if (dir) {
    // It has a dirname, strip trailing slash
    dir = dir.substr(0, dir.length - 1);
  }

  return root + dir;
};


exports.basename = function(path, ext) {
  var f = splitPath(path)[2];
  // TODO: make this comparison case-insensitive on windows?
  if (ext && f.substr(-1 * ext.length) === ext) {
    f = f.substr(0, f.length - ext.length);
  }
  return f;
};


exports.extname = function(path) {
  return splitPath(path)[3];
};

function filter (xs, f) {
    if (xs.filter) return xs.filter(f);
    var res = [];
    for (var i = 0; i < xs.length; i++) {
        if (f(xs[i], i, xs)) res.push(xs[i]);
    }
    return res;
}

// String.prototype.substr - negative index don't work in IE8
var substr = 'ab'.substr(-1) === 'b'
    ? function (str, start, len) { return str.substr(start, len) }
    : function (str, start, len) {
        if (start < 0) start = str.length + start;
        return str.substr(start, len);
    }
;

}).call(this,require('_process'))
},{"_process":7}],7:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = setTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            currentQueue[queueIndex].run();
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    clearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (!draining) {
        setTimeout(drainQueue, 0);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],8:[function(require,module,exports){
var parser = require('./parser.js').parser,
    makeXPathModels = require('./models.js').makeXPathModels;

parser.makeXPathModels = makeXPathModels;

parser.setXPathModels = function(models) {
    parser.yy.xpathmodels = models;
};

parser.setXPathModels(makeXPathModels());

module.exports = parser;

},{"./models.js":2,"./parser.js":4}]},{},[8])(8)
});

/***/ }),
/* 4 */
/***/ (function(module, exports, __webpack_require__) {

const cssToXPath = __webpack_require__(1);

// This supports node environment and web browser environment without conditionally
// including the xpath module, which is important because otherwise the variable
// reference is strange. Consider it a partial polyfill.
if (typeof XPathResult === 'undefined') {
  const xPath = __webpack_require__(11);
  evaluate = xPath.evaluate;
  XPathResult = xPath.XPathResult;
}

/**
 * Evaluates an XPath expression.
 *
 * @param {Document} doc
 * @param {String} xpath The XPath expression.
 * @param {Node} contextNode The context node.
 * @param {int} resultType
 *
 * @returns {*} The result of the XPath expression, depending on resultType:
 * - XPathResult.NUMBER_TYPE: returns a Number
 * - XPathResult.STRING_TYPE: returns a String
 * - XPathResult.BOOLEAN_TYPE: returns a boolean
 * - XPathResult.UNORDERED_NODE_ITERATOR_TYPE or XPathResult.ORDERED_NODE_SNAPSHOT_TYPE: returns an array of nodes
 * - XPathResult.ORDERED_NODE_SNAPSHOT_TYPE or XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE: returns an array of nodes
 * - XPathResult.ANY_UNORDERED_NODE_TYPE or XPathResult.FIRST_ORDERED_NODE_TYPE: returns a single node
 */
function evaluateXPath(
  doc,
  xpath,
  contextNode = doc,
  resultType = XPathResult.ANY_TYPE
) {
  const evaluateMethod = doc.evaluate || evaluate;
  const result = evaluateMethod(xpath, contextNode, null, resultType, null);

  const nodes = [];
  switch (result.resultType) {
    case XPathResult.NUMBER_TYPE:
      return result.numberValue;

    case XPathResult.STRING_TYPE:
      return result.stringValue;

    case XPathResult.BOOLEAN_TYPE:
      return result.booleanValue;

    case XPathResult.UNORDERED_NODE_ITERATOR_TYPE:
    case XPathResult.ORDERED_NODE_ITERATOR_TYPE:
      for (let item = result.iterateNext(); item; item = result.iterateNext()) {
        nodes.push(item);
      }
      return nodes;

    case XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE:
    case XPathResult.ORDERED_NODE_SNAPSHOT_TYPE:
      for (let i = 0; i < result.snapshotLength; ++i) {
        nodes.push(result.snapshotItem(i));
      }
      return nodes;

    case XPathResult.ANY_UNORDERED_NODE_TYPE:
    case XPathResult.FIRST_ORDERED_NODE_TYPE:
      return result.singleNodeValue;
  }

  throw new Error('Unmatched XPathResult resultType in evaluateXPath.');
}

/**
 * Get a list of elements matching a given XPath.
 *
 * @param {Document} doc
 * @param {String} xpath The XPath expression.
 * @returns {Array} An array of matching elements, in their natural XPath type: DOM nodes, strings, etc.
 */
function getElementsByXPath(doc, xPath) {
  try {
    return evaluateXPath(doc, xPath);
  } catch (ex) {
    return [];
  }
}


/**
 * Get a list of elements matching a given CSS rule. Note the parameters are inverted
 * to retain the mapping from the original library.
 *
 * @param {object} rule The `CSSStyleRule` object, containing at least a `selectorText`
 *   https://developer.mozilla.org/en-US/docs/Web/API/CSSStyleRule/selectorText
 * @param {Document} doc
 * @returns {Array} An array of matching elements.
 */
function getRuleMatchingElements(rule, doc) {
  const css = rule.selectorText;
  const xPath = cssToXPath(css);
  return getElementsByXPath(doc, xPath);
}

/**
 * Get a list of elements matching a given CSS rule. Note the parameters are inverted
 * to retain the mapping from the original library.
 *
 * @param {Document} doc
 * @param {String} css The CSS rule, as a string.
 * @returns {Array} An array of matching elements.
 */
function getElementsBySelector(doc, css) {
  const xPath = cssToXPath(css);
  return getElementsByXPath(doc, xPath);
}

module.exports = {
  evaluateXPath,
  getElementsByXPath,
  getElementsBySelector,
  getRuleMatchingElements,
};


/***/ }),
/* 5 */
/***/ (function(module, exports, __webpack_require__) {

const XPathQuery = __webpack_require__(2);
const XPathNode = __webpack_require__(0);

if (typeof Node === 'undefined') {
  // Non-browser polyfill for https://developer.mozilla.org/en/docs/Web/API/Node/nodeType
  Node = { DOCUMENT_TYPE_NOTE: 10 };
}

/**
 * Produces an object containing the attributes of a DOM element.
 *
 * @param {DOMElement} element
 * @returns {object} An object of attribute names to values. e.g., in
 * `<img src='url' alt='text' />`, we return an object `{ src: 'url', alt: 'text' }`
 */
function getElementAttributes(element) {
  const attributes = element.attributes;
  const ret = {};
  for (let i = 0; i < attributes.length; i++) {
    const attribute = attributes.item(i);
    ret[attribute.nodeName] = attribute.nodeValue;
  }

  return ret;
}

/**
 * Parses a tree starting from `element` to produce an XPath expression.
 *
 * TODO: it seems awkward that this has `asString` instead of being cast in the
 * getElementXPath method; but this is the original design. A solution to this
 * is to always return the object with a nice toString method attached. This is
 * a breaking change and needs a promote major though.
 *
 * @param {DOMElement} element the element to identify with the expression
 * @param {boolean} asString return a string XPath query or an object representing the query?
 * @returns {*} Either a string query or an object representing the string query.
 */
function getElementTreeXPath(startingElement, asString = true) {
  const nodes = [];
  // Use nodeName (instead of localName) so namespace prefix is included (if any).
  for (
    let element = startingElement;
    element && element.nodeType === 1;
    element = element.parentNode
  ) {
    let index = 0;
    for (
      let sibling = element.previousSibling;
      sibling;
      sibling = sibling.previousSibling
    ) {
      // Ignore document type declaration.
      if (sibling.nodeType === Node.DOCUMENT_TYPE_NODE) continue;
      if (sibling.nodeName === element.nodeName) index += 1;
    }

    const tagName = (element.prefix ? `${element.prefix}:` : '') +
      element.localName;

    const attributes = getElementAttributes(element);
    let hasFollowingSiblingsWithSameTag = false;
    for (
      let sibling = element.nextSibling;
      sibling && !hasFollowingSiblingsWithSameTag;
      sibling = sibling.nextSibling
    ) {
      if (sibling.nodeName === element.nodeName) hasFollowingSiblingsWithSameTag = true;
    }

    const node = new XPathNode({
      tag: tagName,
      index: index + 1,
      attributes,
      elements: [element], // the list of things that made up this node
      meta: {
        hasFollowingSiblings: hasFollowingSiblingsWithSameTag,
      },
    });

    nodes.push(node);
  }

  const paths = new XPathQuery(nodes.reverse());
  if (asString) return paths.toString();
  return paths;
}


/**
 * Gets an XPath expression for an element which describes its hierarchical location.
 */
function getElementXPath(element, skipId = false) {
  if (element && element.id && !skipId) return `//*[@id="${element.id}"]`;
  return getElementTreeXPath(element);
}

module.exports = {
  getElementXPath,
  getElementTreeXPath,
  getElementAttributes,
};


/***/ }),
/* 6 */
/***/ (function(module, exports) {

/**
 * This file's primary purpose is to turn a bunch of hard-to-read regular expressions
 * in to self-documenting functions with appropriate named capture groups and minimal
 * meaning parsing.
 */

/**
 * `element(string)` matches the pieces of an initial CSS selector and returns a parsed set of fields.
 * e.g., #id, .class or body
 *
 * It also parses out the piped namespace piece: https://www.w3.org/TR/css3-selectors/#univnmsp
 */
function element(string) {
  const CSS_ELEMENT_PATTERN = /^([#.]?)([a-z0-9\\*_-]*)((\|)([a-z0-9\\*_-]*))?/i;
  const matches = CSS_ELEMENT_PATTERN.exec(string);
  if (!matches) return matches;

  const retVal = {
    fullGroup: matches[0],
    fullNamespaceGroup: matches[3],
    namespace: matches[5], // TODO: this is backwards, handle namespace standardization here.
  };

  // either "#" or "." to indicate id or class selector
  if (matches[1] === '#' || matches[1] === '.') {
    retVal.specialSelectorType = matches[1];
    retVal.specialSelectorValue = matches[2];
  } else if (matches[1] === '') {
    retVal.elementName = matches[2];
  }

  return retVal;
}

/**
 * `attributePresence(string)` matches the pieces of a CSS selector that represent a attribute presence requirement.
 *  e.g., [disabled], [x-anything-here]
 */
function attributePresence(string) {
  const CSS_ATTRIBUTE_PRESENCE_PATTERN = /^\[([^\]]*)\]/i;
  const matches = CSS_ATTRIBUTE_PRESENCE_PATTERN.exec(string);
  if (!matches) return matches;

  return {
    fullGroup: matches[0],
    attributeName: matches[1],
  };
}

/**
 * `attributeValue(string)` matches the pieces of a CSS selector that represent a attribute selector.
 *  e.g., [disabled='disabled'], [class~='alphaghettis'], [type != 'number']
 *
 * TODO: this pattern fails on single or unquoted things. Bad!
 */
function attributeValue(string) {
  const CSS_ATTRIBUTE_VALUE_PATTERN = /^\[\s*([^~=\s]+)\s*(~?=)\s*"([^"]+)"\s*\]/i;
  const matches = CSS_ATTRIBUTE_VALUE_PATTERN.exec(string);
  if (!matches) return matches;

  return {
    fullGroup: matches[0],
    field: matches[1],
    value: matches[3],
    isContains: matches[2] === '~=',
  };
}

/**
 * `pseudo(string)` matches the pieces of a CSS selector that represent a pseudo selector.
 *  e.g., :first-child, :visited
 */
// TODO: verify this works with parentheses, e.g., nth-child(2).
function pseudo(string) {
  const CSS_PSEUDO_PATTERN = /^:([a-z_-])+/i;
  const matches = CSS_PSEUDO_PATTERN.exec(string);
  if (!matches) return matches;

  return {
    fullGroup: matches[0],
    selector: matches[1],
  };
}

/**
 * `combinator(string)` matches the pieces of a CSS selector that represent a combinator.
 *  e.g., + or >
 */
function combinator(string) {
  const CSS_COMBINATOR_PATTERN = /^(\s*[>+\s])?/i;
  const matches = CSS_COMBINATOR_PATTERN.exec(string);
  if (!matches) return matches;

  return {
    fullGroup: matches[0],
  };
}

/**
 * `comma(string)` matches commas in a CSS selector; used for disjunction.
 */
function comma(string) {
  const COMMA_PATTERN = /^\s*,/i;
  const matches = COMMA_PATTERN.exec(string);
  if (!matches) return matches;

  return {
    fullGroup: matches[0],
  };
}

module.exports = {
  element,
  attributePresence,
  attributeValue,
  pseudo,
  combinator,
  comma,
};


/***/ }),
/* 7 */
/***/ (function(module, exports, __webpack_require__) {

module.exports = {
  cssToXPath: __webpack_require__(1),
  evaluators: __webpack_require__(4),
  generators: __webpack_require__(5),
  patterns: __webpack_require__(6),
  types: {
    XPathNode: __webpack_require__(0),
    XPathQuery: __webpack_require__(2),
  }
};


/***/ }),
/* 8 */
/***/ (function(module, exports, __webpack_require__) {

const patterns = __webpack_require__(9);

function specialSelectorToXPathPiece(element) {
  switch (element.specialSelectorType) {
    case '#': // ID
      return `[@id='${element.specialSelectorValue}']`;
    case '.': // class
      return `[contains(concat(' ',normalize-space(@class),' '), ' ${element.specialSelectorValue} ')]`;
    default:
      throw new Error(
        `Invalid special selector type: ${element.specialSelectorType}.`
      );
  }
}

function cssXPath(rule) {
  let index = 1;
  const parts = ['//', '*'];
  let lastRule = null;

  while (rule.length && rule !== lastRule) {
    lastRule = rule;

    // Trim leading whitespace
    rule = rule.trim(rule); // TODO: wtf?
    if (!rule.length) break;

    // Match the element identifier, matches rules of the form "body", ".class" and "#id"
    const element = patterns.element(rule);
    if (element) {
      if (element.specialSelectorType) {
        parts.push(specialSelectorToXPathPiece(element));
      } else if (element.namespace) {
        // TODO: can we change these to just be parts.push and put everything in a elementToXPathPiece function?
        // probably not, as they're replacing the // rule, initially. If not, leave documentation comment here.
        parts[index] = element.namespace;
      } else {
        parts[index] = element.elementName;
      }

      rule = rule.substr(element.fullGroup.length);
    }

    // Match attribute selectors
    const attribute = patterns.attributeValue(rule);
    if (attribute) {
      // matched a rule like [field~='thing'] or [name='Title']
      if (attribute.isContains) {
        parts.push(`[contains(@${attribute.field}, '${attribute.value}')]`);
      } else {
        parts.push(`[@${attribute.field}='${attribute.value}']`);
      }

      rule = rule.substr(attribute.fullGroup.length);
    } else {
      // matches rules like [mustExist], e.g., [disabled].
      const attributePresence = patterns.attributePresence(rule);
      if (attributePresence) {
        parts.push(`[@${attributePresence.attributeName}]`);

        rule = rule.substr(attributePresence.fullGroup.length);
      }
    }

    // Skip over pseudo-classes and pseudo-elements, which are of no use to us
    // e.g., :nth-child and :visited.
    let pseudoGroups = patterns.pseudo(rule);
    while (pseudoGroups) {
      rule = rule.substr(pseudoGroups.fullGroup.length);

      // if there are many, just skip them all right now.
      pseudoGroups = patterns.pseudo(rule);
    }

    // Match combinators, e.g. html > body or html + body.
    const combinator = patterns.combinator(rule);
    if (combinator && combinator.fullGroup.length) {
      if (combinator.fullGroup.indexOf('>') !== -1) {
        parts.push('/');
      } else if (combinator.fullGroup.indexOf('+') !== -1) {
        parts.push('/following-sibling::');
      } else {
        parts.push('//');
      }

      index = parts.length;
      parts.push('*');
      rule = rule.substr(combinator.fullGroup.length);
    }

    // Match comma delimited disjunctions ("or" rules), e.g., html, body
    const disjunction = patterns.comma(rule);
    if (disjunction) {
      parts.push(' | ', '//', '*');
      index = parts.length - 1;
      rule = rule.substr(disjunction.fullGroup.length);
    }
  }

  const xPath = parts.join('');
  return xPath;
}

module.exports = cssXPath;


/***/ }),
/* 9 */
/***/ (function(module, exports) {

/**
 * This file's primary purpose is to turn a bunch of hard-to-read regular expressions
 * in to self-documenting functions with appropriate named capture groups and minimal
 * meaning parsing.
 */

/**
 * `element(string)` matches the pieces of an initial CSS selector and returns a parsed set of fields.
 * e.g., #id, .class or body
 *
 * It also parses out the piped namespace piece: https://www.w3.org/TR/css3-selectors/#univnmsp
 */
function element(string) {
  const CSS_ELEMENT_PATTERN = /^([#.]?)([a-z0-9\\*_-]*)((\|)([a-z0-9\\*_-]*))?/i;
  const matches = CSS_ELEMENT_PATTERN.exec(string);
  if (!matches) return matches;

  const retVal = {
    fullGroup: matches[0],
    fullNamespaceGroup: matches[3],
    namespace: matches[5], // TODO: this is backwards, handle namespace standardization here.
  };

  // either "#" or "." to indicate id or class selector
  if (matches[1] === '#' || matches[1] === '.') {
    retVal.specialSelectorType = matches[1];
    retVal.specialSelectorValue = matches[2];
  } else if (matches[1] === '') {
    retVal.elementName = matches[2];
  }

  return retVal;
}

/**
 * `attributePresence(string)` matches the pieces of a CSS selector that represent a attribute presence requirement.
 *  e.g., [disabled], [x-anything-here]
 */
function attributePresence(string) {
  const CSS_ATTRIBUTE_PRESENCE_PATTERN = /^\[([^\]]*)\]/i;
  const matches = CSS_ATTRIBUTE_PRESENCE_PATTERN.exec(string);
  if (!matches) return matches;

  return {
    fullGroup: matches[0],
    attributeName: matches[1],
  };
}

/**
 * `attributeValue(string)` matches the pieces of a CSS selector that represent a attribute selector.
 *  e.g., [disabled='disabled'], [class~='alphaghettis'], [type != 'number']
 *
 * TODO: this pattern fails on single or unquoted things. Bad!
 */
function attributeValue(string) {
  const CSS_ATTRIBUTE_VALUE_PATTERN = /^\[\s*([^~=\s]+)\s*(~?=)\s*"([^"]+)"\s*\]/i;
  const matches = CSS_ATTRIBUTE_VALUE_PATTERN.exec(string);
  if (!matches) return matches;

  return {
    fullGroup: matches[0],
    field: matches[1],
    value: matches[3],
    isContains: matches[2] === '~=',
  };
}

/**
 * `pseudo(string)` matches the pieces of a CSS selector that represent a pseudo selector.
 *  e.g., :first-child, :visited
 */
// TODO: verify this works with parentheses, e.g., nth-child(2).
function pseudo(string) {
  const CSS_PSEUDO_PATTERN = /^:([a-z_-])+/i;
  const matches = CSS_PSEUDO_PATTERN.exec(string);
  if (!matches) return matches;

  return {
    fullGroup: matches[0],
    selector: matches[1],
  };
}

/**
 * `combinator(string)` matches the pieces of a CSS selector that represent a combinator.
 *  e.g., + or >
 */
function combinator(string) {
  const CSS_COMBINATOR_PATTERN = /^(\s*[>+\s])?/i;
  const matches = CSS_COMBINATOR_PATTERN.exec(string);
  if (!matches) return matches;

  return {
    fullGroup: matches[0],
  };
}

/**
 * `comma(string)` matches commas in a CSS selector; used for disjunction.
 */
function comma(string) {
  const COMMA_PATTERN = /^\s*,/i;
  const matches = COMMA_PATTERN.exec(string);
  if (!matches) return matches;

  return {
    fullGroup: matches[0],
  };
}

module.exports = {
  element,
  attributePresence,
  attributeValue,
  pseudo,
  combinator,
  comma,
};


/***/ }),
/* 10 */
/***/ (function(module, exports) {

const ATTRIBUTE_SEPARATORS = {
  class: ' ',
  rel: ' ',
  rev: ' ',
  style: ';',
  media: ','
};

function isSeparatedAttribute(name) {
  if (ATTRIBUTE_SEPARATORS[name] !== undefined)
    return ATTRIBUTE_SEPARATORS[name];
  return false;
}

function splitAttribute(name, value) {
  const splitter = isSeparatedAttribute(name);
  if (!splitter) return value;
  return value.split(splitter).map(i => i.trim());
}

function splitAttributes(map) {
  const retVal = Object.assign({}, map);

  for (const key in retVal) {
    retVal[key] = splitAttribute(key, retVal[key])
  }

  return retVal;
}

module.exports = {
  isSeparatedAttribute,
  splitAttribute,
  splitAttributes,
};


/***/ }),
/* 11 */
/***/ (function(module, exports, __webpack_require__) {

/*
 * xpath.js
 *
 * An XPath 1.0 library for JavaScript.
 *
 * Cameron McCormack <cam (at) mcc.id.au>
 *
 * This work is licensed under the Creative Commons Attribution-ShareAlike
 * License. To view a copy of this license, visit
 *
 *   http://creativecommons.org/licenses/by-sa/2.0/
 *
 * or send a letter to Creative Commons, 559 Nathan Abbott Way, Stanford,
 * California 94305, USA.
 *
 * Revision 20: April 26, 2011
 *   Fixed a typo resulting in FIRST_ORDERED_NODE_TYPE results being wrong,
 *   thanks to <shi_a009 (at) hotmail.com>.
 *
 * Revision 19: November 29, 2005
 *   Nodesets now store their nodes in a height balanced tree, increasing
 *   performance for the common case of selecting nodes in document order,
 *   thanks to S閎astien Cramatte <contact (at) zeninteractif.com>.
 *   AVL tree code adapted from Raimund Neumann <rnova (at) gmx.net>.
 *
 * Revision 18: October 27, 2005
 *   DOM 3 XPath support.  Caveats:
 *     - namespace prefixes aren't resolved in XPathEvaluator.createExpression,
 *       but in XPathExpression.evaluate.
 *     - XPathResult.invalidIteratorState is not implemented.
 *
 * Revision 17: October 25, 2005
 *   Some core XPath function fixes and a patch to avoid crashing certain
 *   versions of MSXML in PathExpr.prototype.getOwnerElement, thanks to
 *   S閎astien Cramatte <contact (at) zeninteractif.com>.
 *
 * Revision 16: September 22, 2005
 *   Workarounds for some IE 5.5 deficiencies.
 *   Fixed problem with prefix node tests on attribute nodes.
 *
 * Revision 15: May 21, 2005
 *   Fixed problem with QName node tests on elements with an xmlns="...".
 *
 * Revision 14: May 19, 2005
 *   Fixed QName node tests on attribute node regression.
 *
 * Revision 13: May 3, 2005
 *   Node tests are case insensitive now if working in an HTML DOM.
 *
 * Revision 12: April 26, 2005
 *   Updated licence.  Slight code changes to enable use of Dean
 *   Edwards' script compression, http://dean.edwards.name/packer/ .
 *
 * Revision 11: April 23, 2005
 *   Fixed bug with 'and' and 'or' operators, fix thanks to
 *   Sandy McArthur <sandy (at) mcarthur.org>.
 *
 * Revision 10: April 15, 2005
 *   Added support for a virtual root node, supposedly helpful for
 *   implementing XForms.  Fixed problem with QName node tests and
 *   the parent axis.
 *
 * Revision 9: March 17, 2005
 *   Namespace resolver tweaked so using the document node as the context
 *   for namespace lookups is equivalent to using the document element.
 *
 * Revision 8: February 13, 2005
 *   Handle implicit declaration of 'xmlns' namespace prefix.
 *   Fixed bug when comparing nodesets.
 *   Instance data can now be associated with a FunctionResolver, and
 *     workaround for MSXML not supporting 'localName' and 'getElementById',
 *     thanks to Grant Gongaware.
 *   Fix a few problems when the context node is the root node.
 *
 * Revision 7: February 11, 2005
 *   Default namespace resolver fix from Grant Gongaware
 *   <grant (at) gongaware.com>.
 *
 * Revision 6: February 10, 2005
 *   Fixed bug in 'number' function.
 *
 * Revision 5: February 9, 2005
 *   Fixed bug where text nodes not getting converted to string values.
 *
 * Revision 4: January 21, 2005
 *   Bug in 'name' function, fix thanks to Bill Edney.
 *   Fixed incorrect processing of namespace nodes.
 *   Fixed NamespaceResolver to resolve 'xml' namespace.
 *   Implemented union '|' operator.
 *
 * Revision 3: January 14, 2005
 *   Fixed bug with nodeset comparisons, bug lexing < and >.
 *
 * Revision 2: October 26, 2004
 *   QName node test namespace handling fixed.  Few other bug fixes.
 *
 * Revision 1: August 13, 2004
 *   Bug fixes from William J. Edney <bedney (at) technicalpursuit.com>.
 *   Added minimal licence.
 *
 * Initial version: June 14, 2004
 */

// non-node wrapper
var xpath = ( false) ? {} : exports;

(function(exports) {
"use strict";

// XPathParser ///////////////////////////////////////////////////////////////

XPathParser.prototype = new Object();
XPathParser.prototype.constructor = XPathParser;
XPathParser.superclass = Object.prototype;

function XPathParser() {
	this.init();
}

XPathParser.prototype.init = function() {
	this.reduceActions = [];

	this.reduceActions[3] = function(rhs) {
		return new OrOperation(rhs[0], rhs[2]);
	};
	this.reduceActions[5] = function(rhs) {
		return new AndOperation(rhs[0], rhs[2]);
	};
	this.reduceActions[7] = function(rhs) {
		return new EqualsOperation(rhs[0], rhs[2]);
	};
	this.reduceActions[8] = function(rhs) {
		return new NotEqualOperation(rhs[0], rhs[2]);
	};
	this.reduceActions[10] = function(rhs) {
		return new LessThanOperation(rhs[0], rhs[2]);
	};
	this.reduceActions[11] = function(rhs) {
		return new GreaterThanOperation(rhs[0], rhs[2]);
	};
	this.reduceActions[12] = function(rhs) {
		return new LessThanOrEqualOperation(rhs[0], rhs[2]);
	};
	this.reduceActions[13] = function(rhs) {
		return new GreaterThanOrEqualOperation(rhs[0], rhs[2]);
	};
	this.reduceActions[15] = function(rhs) {
		return new PlusOperation(rhs[0], rhs[2]);
	};
	this.reduceActions[16] = function(rhs) {
		return new MinusOperation(rhs[0], rhs[2]);
	};
	this.reduceActions[18] = function(rhs) {
		return new MultiplyOperation(rhs[0], rhs[2]);
	};
	this.reduceActions[19] = function(rhs) {
		return new DivOperation(rhs[0], rhs[2]);
	};
	this.reduceActions[20] = function(rhs) {
		return new ModOperation(rhs[0], rhs[2]);
	};
	this.reduceActions[22] = function(rhs) {
		return new UnaryMinusOperation(rhs[1]);
	};
	this.reduceActions[24] = function(rhs) {
		return new BarOperation(rhs[0], rhs[2]);
	};
	this.reduceActions[25] = function(rhs) {
		return new PathExpr(undefined, undefined, rhs[0]);
	};
	this.reduceActions[27] = function(rhs) {
		rhs[0].locationPath = rhs[2];
		return rhs[0];
	};
	this.reduceActions[28] = function(rhs) {
		rhs[0].locationPath = rhs[2];
		rhs[0].locationPath.steps.unshift(new Step(Step.DESCENDANTORSELF, new NodeTest(NodeTest.NODE, undefined), []));
		return rhs[0];
	};
	this.reduceActions[29] = function(rhs) {
		return new PathExpr(rhs[0], [], undefined);
	};
	this.reduceActions[30] = function(rhs) {
		if (Utilities.instance_of(rhs[0], PathExpr)) {
			if (rhs[0].filterPredicates == undefined) {
				rhs[0].filterPredicates = [];
			}
			rhs[0].filterPredicates.push(rhs[1]);
			return rhs[0];
		} else {
			return new PathExpr(rhs[0], [rhs[1]], undefined);
		}
	};
	this.reduceActions[32] = function(rhs) {
		return rhs[1];
	};
	this.reduceActions[33] = function(rhs) {
		return new XString(rhs[0]);
	};
	this.reduceActions[34] = function(rhs) {
		return new XNumber(rhs[0]);
	};
	this.reduceActions[36] = function(rhs) {
		return new FunctionCall(rhs[0], []);
	};
	this.reduceActions[37] = function(rhs) {
		return new FunctionCall(rhs[0], rhs[2]);
	};
	this.reduceActions[38] = function(rhs) {
		return [ rhs[0] ];
	};
	this.reduceActions[39] = function(rhs) {
		rhs[2].unshift(rhs[0]);
		return rhs[2];
	};
	this.reduceActions[43] = function(rhs) {
		return new LocationPath(true, []);
	};
	this.reduceActions[44] = function(rhs) {
		rhs[1].absolute = true;
		return rhs[1];
	};
	this.reduceActions[46] = function(rhs) {
		return new LocationPath(false, [ rhs[0] ]);
	};
	this.reduceActions[47] = function(rhs) {
		rhs[0].steps.push(rhs[2]);
		return rhs[0];
	};
	this.reduceActions[49] = function(rhs) {
		return new Step(rhs[0], rhs[1], []);
	};
	this.reduceActions[50] = function(rhs) {
		return new Step(Step.CHILD, rhs[0], []);
	};
	this.reduceActions[51] = function(rhs) {
		return new Step(rhs[0], rhs[1], rhs[2]);
	};
	this.reduceActions[52] = function(rhs) {
		return new Step(Step.CHILD, rhs[0], rhs[1]);
	};
	this.reduceActions[54] = function(rhs) {
		return [ rhs[0] ];
	};
	this.reduceActions[55] = function(rhs) {
		rhs[1].unshift(rhs[0]);
		return rhs[1];
	};
	this.reduceActions[56] = function(rhs) {
		if (rhs[0] == "ancestor") {
			return Step.ANCESTOR;
		} else if (rhs[0] == "ancestor-or-self") {
			return Step.ANCESTORORSELF;
		} else if (rhs[0] == "attribute") {
			return Step.ATTRIBUTE;
		} else if (rhs[0] == "child") {
			return Step.CHILD;
		} else if (rhs[0] == "descendant") {
			return Step.DESCENDANT;
		} else if (rhs[0] == "descendant-or-self") {
			return Step.DESCENDANTORSELF;
		} else if (rhs[0] == "following") {
			return Step.FOLLOWING;
		} else if (rhs[0] == "following-sibling") {
			return Step.FOLLOWINGSIBLING;
		} else if (rhs[0] == "namespace") {
			return Step.NAMESPACE;
		} else if (rhs[0] == "parent") {
			return Step.PARENT;
		} else if (rhs[0] == "preceding") {
			return Step.PRECEDING;
		} else if (rhs[0] == "preceding-sibling") {
			return Step.PRECEDINGSIBLING;
		} else if (rhs[0] == "self") {
			return Step.SELF;
		}
		return -1;
	};
	this.reduceActions[57] = function(rhs) {
		return Step.ATTRIBUTE;
	};
	this.reduceActions[59] = function(rhs) {
		if (rhs[0] == "comment") {
			return new NodeTest(NodeTest.COMMENT, undefined);
		} else if (rhs[0] == "text") {
			return new NodeTest(NodeTest.TEXT, undefined);
		} else if (rhs[0] == "processing-instruction") {
			return new NodeTest(NodeTest.PI, undefined);
		} else if (rhs[0] == "node") {
			return new NodeTest(NodeTest.NODE, undefined);
		}
		return new NodeTest(-1, undefined);
	};
	this.reduceActions[60] = function(rhs) {
		return new NodeTest(NodeTest.PI, rhs[2]);
	};
	this.reduceActions[61] = function(rhs) {
		return rhs[1];
	};
	this.reduceActions[63] = function(rhs) {
		rhs[1].absolute = true;
		rhs[1].steps.unshift(new Step(Step.DESCENDANTORSELF, new NodeTest(NodeTest.NODE, undefined), []));
		return rhs[1];
	};
	this.reduceActions[64] = function(rhs) {
		rhs[0].steps.push(new Step(Step.DESCENDANTORSELF, new NodeTest(NodeTest.NODE, undefined), []));
		rhs[0].steps.push(rhs[2]);
		return rhs[0];
	};
	this.reduceActions[65] = function(rhs) {
		return new Step(Step.SELF, new NodeTest(NodeTest.NODE, undefined), []);
	};
	this.reduceActions[66] = function(rhs) {
		return new Step(Step.PARENT, new NodeTest(NodeTest.NODE, undefined), []);
	};
	this.reduceActions[67] = function(rhs) {
		return new VariableReference(rhs[1]);
	};
	this.reduceActions[68] = function(rhs) {
		return new NodeTest(NodeTest.NAMETESTANY, undefined);
	};
	this.reduceActions[69] = function(rhs) {
		var prefix = rhs[0].substring(0, rhs[0].indexOf(":"));
		return new NodeTest(NodeTest.NAMETESTPREFIXANY, prefix);
	};
	this.reduceActions[70] = function(rhs) {
		return new NodeTest(NodeTest.NAMETESTQNAME, rhs[0]);
	};
};

XPathParser.actionTable = [
	" s s        sssssssss    s ss  s  ss",
	"                 s                  ",
	"r  rrrrrrrrr         rrrrrrr rr  r  ",
	"                rrrrr               ",
	" s s        sssssssss    s ss  s  ss",
	"rs  rrrrrrrr s  sssssrrrrrr  rrs rs ",
	" s s        sssssssss    s ss  s  ss",
	"                            s       ",
	"                            s       ",
	"r  rrrrrrrrr         rrrrrrr rr rr  ",
	"r  rrrrrrrrr         rrrrrrr rr rr  ",
	"r  rrrrrrrrr         rrrrrrr rr rr  ",
	"r  rrrrrrrrr         rrrrrrr rr rr  ",
	"r  rrrrrrrrr         rrrrrrr rr rr  ",
	"  s                                 ",
	"                            s       ",
	" s           s  sssss          s  s ",
	"r  rrrrrrrrr         rrrrrrr rr  r  ",
	"a                                   ",
	"r       s                    rr  r  ",
	"r      sr                    rr  r  ",
	"r   s  rr            s       rr  r  ",
	"r   rssrr            rss     rr  r  ",
	"r   rrrrr            rrrss   rr  r  ",
	"r   rrrrrsss         rrrrr   rr  r  ",
	"r   rrrrrrrr         rrrrr   rr  r  ",
	"r   rrrrrrrr         rrrrrs  rr  r  ",
	"r   rrrrrrrr         rrrrrr  rr  r  ",
	"r   rrrrrrrr         rrrrrr  rr  r  ",
	"r  srrrrrrrr         rrrrrrs rr sr  ",
	"r  srrrrrrrr         rrrrrrs rr  r  ",
	"r  rrrrrrrrr         rrrrrrr rr rr  ",
	"r  rrrrrrrrr         rrrrrrr rr rr  ",
	"r  rrrrrrrrr         rrrrrrr rr rr  ",
	"r   rrrrrrrr         rrrrrr  rr  r  ",
	"r   rrrrrrrr         rrrrrr  rr  r  ",
	"r  rrrrrrrrr         rrrrrrr rr  r  ",
	"r  rrrrrrrrr         rrrrrrr rr  r  ",
	"                sssss               ",
	"r  rrrrrrrrr         rrrrrrr rr sr  ",
	"r  rrrrrrrrr         rrrrrrr rr  r  ",
	"r  rrrrrrrrr         rrrrrrr rr rr  ",
	"r  rrrrrrrrr         rrrrrrr rr rr  ",
	"                             s      ",
	"r  srrrrrrrr         rrrrrrs rr  r  ",
	"r   rrrrrrrr         rrrrr   rr  r  ",
	"              s                     ",
	"                             s      ",
	"                rrrrr               ",
	" s s        sssssssss    s sss s  ss",
	"r  srrrrrrrr         rrrrrrs rr  r  ",
	" s s        sssssssss    s ss  s  ss",
	" s s        sssssssss    s ss  s  ss",
	" s s        sssssssss    s ss  s  ss",
	" s s        sssssssss    s ss  s  ss",
	" s s        sssssssss    s ss  s  ss",
	" s s        sssssssss    s ss  s  ss",
	" s s        sssssssss    s ss  s  ss",
	" s s        sssssssss    s ss  s  ss",
	" s s        sssssssss    s ss  s  ss",
	" s s        sssssssss    s ss  s  ss",
	" s s        sssssssss    s ss  s  ss",
	" s s        sssssssss    s ss  s  ss",
	" s s        sssssssss    s ss  s  ss",
	" s s        sssssssss      ss  s  ss",
	" s s        sssssssss    s ss  s  ss",
	" s           s  sssss          s  s ",
	" s           s  sssss          s  s ",
	"r  rrrrrrrrr         rrrrrrr rr rr  ",
	" s           s  sssss          s  s ",
	" s           s  sssss          s  s ",
	"r  rrrrrrrrr         rrrrrrr rr sr  ",
	"r  rrrrrrrrr         rrrrrrr rr sr  ",
	"r  rrrrrrrrr         rrrrrrr rr  r  ",
	"r  rrrrrrrrr         rrrrrrr rr rr  ",
	"                             s      ",
	"r  rrrrrrrrr         rrrrrrr rr rr  ",
	"r  rrrrrrrrr         rrrrrrr rr rr  ",
	"                             rr     ",
	"                             s      ",
	"                             rs     ",
	"r      sr                    rr  r  ",
	"r   s  rr            s       rr  r  ",
	"r   rssrr            rss     rr  r  ",
	"r   rssrr            rss     rr  r  ",
	"r   rrrrr            rrrss   rr  r  ",
	"r   rrrrr            rrrss   rr  r  ",
	"r   rrrrr            rrrss   rr  r  ",
	"r   rrrrr            rrrss   rr  r  ",
	"r   rrrrrsss         rrrrr   rr  r  ",
	"r   rrrrrsss         rrrrr   rr  r  ",
	"r   rrrrrrrr         rrrrr   rr  r  ",
	"r   rrrrrrrr         rrrrr   rr  r  ",
	"r   rrrrrrrr         rrrrr   rr  r  ",
	"r   rrrrrrrr         rrrrrr  rr  r  ",
	"                                 r  ",
	"                                 s  ",
	"r  srrrrrrrr         rrrrrrs rr  r  ",
	"r  srrrrrrrr         rrrrrrs rr  r  ",
	"r  rrrrrrrrr         rrrrrrr rr  r  ",
	"r  rrrrrrrrr         rrrrrrr rr  r  ",
	"r  rrrrrrrrr         rrrrrrr rr  r  ",
	"r  rrrrrrrrr         rrrrrrr rr  r  ",
	"r  rrrrrrrrr         rrrrrrr rr rr  ",
	"r  rrrrrrrrr         rrrrrrr rr rr  ",
	" s s        sssssssss    s ss  s  ss",
	"r  rrrrrrrrr         rrrrrrr rr rr  ",
	"                             r      "
];

XPathParser.actionTableNumber = [
	" 1 0        /.-,+*)('    & %$  #  \"!",
	"                 J                  ",
	"a  aaaaaaaaa         aaaaaaa aa  a  ",
	"                YYYYY               ",
	" 1 0        /.-,+*)('    & %$  #  \"!",
	"K1  KKKKKKKK .  +*)('KKKKKK  KK# K\" ",
	" 1 0        /.-,+*)('    & %$  #  \"!",
	"                            N       ",
	"                            O       ",
	"e  eeeeeeeee         eeeeeee ee ee  ",
	"f  fffffffff         fffffff ff ff  ",
	"d  ddddddddd         ddddddd dd dd  ",
	"B  BBBBBBBBB         BBBBBBB BB BB  ",
	"A  AAAAAAAAA         AAAAAAA AA AA  ",
	"  P                                 ",
	"                            Q       ",
	" 1           .  +*)('          #  \" ",
	"b  bbbbbbbbb         bbbbbbb bb  b  ",
	"                                    ",
	"!       S                    !!  !  ",
	"\"      T\"                    \"\"  \"  ",
	"$   V  $$            U       $$  $  ",
	"&   &ZY&&            &XW     &&  &  ",
	")   )))))            )))\\[   ))  )  ",
	".   ....._^]         .....   ..  .  ",
	"1   11111111         11111   11  1  ",
	"5   55555555         55555`  55  5  ",
	"7   77777777         777777  77  7  ",
	"9   99999999         999999  99  9  ",
	":  c::::::::         ::::::b :: a:  ",
	"I  fIIIIIIII         IIIIIIe II  I  ",
	"=  =========         ======= == ==  ",
	"?  ?????????         ??????? ?? ??  ",
	"C  CCCCCCCCC         CCCCCCC CC CC  ",
	"J   JJJJJJJJ         JJJJJJ  JJ  J  ",
	"M   MMMMMMMM         MMMMMM  MM  M  ",
	"N  NNNNNNNNN         NNNNNNN NN  N  ",
	"P  PPPPPPPPP         PPPPPPP PP  P  ",
	"                +*)('               ",
	"R  RRRRRRRRR         RRRRRRR RR aR  ",
	"U  UUUUUUUUU         UUUUUUU UU  U  ",
	"Z  ZZZZZZZZZ         ZZZZZZZ ZZ ZZ  ",
	"c  ccccccccc         ccccccc cc cc  ",
	"                             j      ",
	"L  fLLLLLLLL         LLLLLLe LL  L  ",
	"6   66666666         66666   66  6  ",
	"              k                     ",
	"                             l      ",
	"                XXXXX               ",
	" 1 0        /.-,+*)('    & %$m #  \"!",
	"_  f________         ______e __  _  ",
	" 1 0        /.-,+*)('    & %$  #  \"!",
	" 1 0        /.-,+*)('    & %$  #  \"!",
	" 1 0        /.-,+*)('    & %$  #  \"!",
	" 1 0        /.-,+*)('    & %$  #  \"!",
	" 1 0        /.-,+*)('    & %$  #  \"!",
	" 1 0        /.-,+*)('    & %$  #  \"!",
	" 1 0        /.-,+*)('    & %$  #  \"!",
	" 1 0        /.-,+*)('    & %$  #  \"!",
	" 1 0        /.-,+*)('    & %$  #  \"!",
	" 1 0        /.-,+*)('    & %$  #  \"!",
	" 1 0        /.-,+*)('    & %$  #  \"!",
	" 1 0        /.-,+*)('    & %$  #  \"!",
	" 1 0        /.-,+*)('    & %$  #  \"!",
	" 1 0        /.-,+*)('      %$  #  \"!",
	" 1 0        /.-,+*)('    & %$  #  \"!",
	" 1           .  +*)('          #  \" ",
	" 1           .  +*)('          #  \" ",
	">  >>>>>>>>>         >>>>>>> >> >>  ",
	" 1           .  +*)('          #  \" ",
	" 1           .  +*)('          #  \" ",
	"Q  QQQQQQQQQ         QQQQQQQ QQ aQ  ",
	"V  VVVVVVVVV         VVVVVVV VV aV  ",
	"T  TTTTTTTTT         TTTTTTT TT  T  ",
	"@  @@@@@@@@@         @@@@@@@ @@ @@  ",
	"                             \x87      ",
	"[  [[[[[[[[[         [[[[[[[ [[ [[  ",
	"D  DDDDDDDDD         DDDDDDD DD DD  ",
	"                             HH     ",
	"                             \x88      ",
	"                             F\x89     ",
	"#      T#                    ##  #  ",
	"%   V  %%            U       %%  %  ",
	"'   'ZY''            'XW     ''  '  ",
	"(   (ZY((            (XW     ((  (  ",
	"+   +++++            +++\\[   ++  +  ",
	"*   *****            ***\\[   **  *  ",
	"-   -----            ---\\[   --  -  ",
	",   ,,,,,            ,,,\\[   ,,  ,  ",
	"0   00000_^]         00000   00  0  ",
	"/   /////_^]         /////   //  /  ",
	"2   22222222         22222   22  2  ",
	"3   33333333         33333   33  3  ",
	"4   44444444         44444   44  4  ",
	"8   88888888         888888  88  8  ",
	"                                 ^  ",
	"                                 \x8a  ",
	";  f;;;;;;;;         ;;;;;;e ;;  ;  ",
	"<  f<<<<<<<<         <<<<<<e <<  <  ",
	"O  OOOOOOOOO         OOOOOOO OO  O  ",
	"`  `````````         ``````` ``  `  ",
	"S  SSSSSSSSS         SSSSSSS SS  S  ",
	"W  WWWWWWWWW         WWWWWWW WW  W  ",
	"\\  \\\\\\\\\\\\\\\\\\         \\\\\\\\\\\\\\ \\\\ \\\\  ",
	"E  EEEEEEEEE         EEEEEEE EE EE  ",
	" 1 0        /.-,+*)('    & %$  #  \"!",
	"]  ]]]]]]]]]         ]]]]]]] ]] ]]  ",
	"                             G      "
];

XPathParser.gotoTable = [
	"3456789:;<=>?@ AB  CDEFGH IJ ",
	"                             ",
	"                             ",
	"                             ",
	"L456789:;<=>?@ AB  CDEFGH IJ ",
	"            M        EFGH IJ ",
	"       N;<=>?@ AB  CDEFGH IJ ",
	"                             ",
	"                             ",
	"                             ",
	"                             ",
	"                             ",
	"                             ",
	"                             ",
	"                             ",
	"                             ",
	"            S        EFGH IJ ",
	"                             ",
	"                             ",
	"                             ",
	"                             ",
	"                             ",
	"                             ",
	"                             ",
	"                             ",
	"                             ",
	"                             ",
	"                             ",
	"                             ",
	"              e              ",
	"                             ",
	"                             ",
	"                             ",
	"                             ",
	"                             ",
	"                             ",
	"                             ",
	"                             ",
	"                        h  J ",
	"              i          j   ",
	"                             ",
	"                             ",
	"                             ",
	"                             ",
	"                             ",
	"                             ",
	"                             ",
	"                             ",
	"                             ",
	"o456789:;<=>?@ ABpqCDEFGH IJ ",
	"                             ",
	"  r6789:;<=>?@ AB  CDEFGH IJ ",
	"   s789:;<=>?@ AB  CDEFGH IJ ",
	"    t89:;<=>?@ AB  CDEFGH IJ ",
	"    u89:;<=>?@ AB  CDEFGH IJ ",
	"     v9:;<=>?@ AB  CDEFGH IJ ",
	"     w9:;<=>?@ AB  CDEFGH IJ ",
	"     x9:;<=>?@ AB  CDEFGH IJ ",
	"     y9:;<=>?@ AB  CDEFGH IJ ",
	"      z:;<=>?@ AB  CDEFGH IJ ",
	"      {:;<=>?@ AB  CDEFGH IJ ",
	"       |;<=>?@ AB  CDEFGH IJ ",
	"       };<=>?@ AB  CDEFGH IJ ",
	"       ~;<=>?@ AB  CDEFGH IJ ",
	"         \x7f=>?@ AB  CDEFGH IJ ",
	"\x80456789:;<=>?@ AB  CDEFGH IJ\x81",
	"            \x82        EFGH IJ ",
	"            \x83        EFGH IJ ",
	"                             ",
	"                     \x84 GH IJ ",
	"                     \x85 GH IJ ",
	"              i          \x86   ",
	"              i          \x87   ",
	"                             ",
	"                             ",
	"                             ",
	"                             ",
	"                             ",
	"                             ",
	"                             ",
	"                             ",
	"                             ",
	"                             ",
	"                             ",
	"                             ",
	"                             ",
	"                             ",
	"                             ",
	"                             ",
	"                             ",
	"                             ",
	"                             ",
	"                             ",
	"                             ",
	"                             ",
	"                             ",
	"                             ",
	"                             ",
	"                             ",
	"                             ",
	"                             ",
	"                             ",
	"                             ",
	"                             ",
	"                             ",
	"o456789:;<=>?@ AB\x8cqCDEFGH IJ ",
	"                             ",
	"                             "
];

XPathParser.productions = [
	[1, 1, 2],
	[2, 1, 3],
	[3, 1, 4],
	[3, 3, 3, -9, 4],
	[4, 1, 5],
	[4, 3, 4, -8, 5],
	[5, 1, 6],
	[5, 3, 5, -22, 6],
	[5, 3, 5, -5, 6],
	[6, 1, 7],
	[6, 3, 6, -23, 7],
	[6, 3, 6, -24, 7],
	[6, 3, 6, -6, 7],
	[6, 3, 6, -7, 7],
	[7, 1, 8],
	[7, 3, 7, -25, 8],
	[7, 3, 7, -26, 8],
	[8, 1, 9],
	[8, 3, 8, -12, 9],
	[8, 3, 8, -11, 9],
	[8, 3, 8, -10, 9],
	[9, 1, 10],
	[9, 2, -26, 9],
	[10, 1, 11],
	[10, 3, 10, -27, 11],
	[11, 1, 12],
	[11, 1, 13],
	[11, 3, 13, -28, 14],
	[11, 3, 13, -4, 14],
	[13, 1, 15],
	[13, 2, 13, 16],
	[15, 1, 17],
	[15, 3, -29, 2, -30],
	[15, 1, -15],
	[15, 1, -16],
	[15, 1, 18],
	[18, 3, -13, -29, -30],
	[18, 4, -13, -29, 19, -30],
	[19, 1, 20],
	[19, 3, 20, -31, 19],
	[20, 1, 2],
	[12, 1, 14],
	[12, 1, 21],
	[21, 1, -28],
	[21, 2, -28, 14],
	[21, 1, 22],
	[14, 1, 23],
	[14, 3, 14, -28, 23],
	[14, 1, 24],
	[23, 2, 25, 26],
	[23, 1, 26],
	[23, 3, 25, 26, 27],
	[23, 2, 26, 27],
	[23, 1, 28],
	[27, 1, 16],
	[27, 2, 16, 27],
	[25, 2, -14, -3],
	[25, 1, -32],
	[26, 1, 29],
	[26, 3, -20, -29, -30],
	[26, 4, -21, -29, -15, -30],
	[16, 3, -33, 30, -34],
	[30, 1, 2],
	[22, 2, -4, 14],
	[24, 3, 14, -4, 23],
	[28, 1, -35],
	[28, 1, -2],
	[17, 2, -36, -18],
	[29, 1, -17],
	[29, 1, -19],
	[29, 1, -18]
];

XPathParser.DOUBLEDOT = 2;
XPathParser.DOUBLECOLON = 3;
XPathParser.DOUBLESLASH = 4;
XPathParser.NOTEQUAL = 5;
XPathParser.LESSTHANOREQUAL = 6;
XPathParser.GREATERTHANOREQUAL = 7;
XPathParser.AND = 8;
XPathParser.OR = 9;
XPathParser.MOD = 10;
XPathParser.DIV = 11;
XPathParser.MULTIPLYOPERATOR = 12;
XPathParser.FUNCTIONNAME = 13;
XPathParser.AXISNAME = 14;
XPathParser.LITERAL = 15;
XPathParser.NUMBER = 16;
XPathParser.ASTERISKNAMETEST = 17;
XPathParser.QNAME = 18;
XPathParser.NCNAMECOLONASTERISK = 19;
XPathParser.NODETYPE = 20;
XPathParser.PROCESSINGINSTRUCTIONWITHLITERAL = 21;
XPathParser.EQUALS = 22;
XPathParser.LESSTHAN = 23;
XPathParser.GREATERTHAN = 24;
XPathParser.PLUS = 25;
XPathParser.MINUS = 26;
XPathParser.BAR = 27;
XPathParser.SLASH = 28;
XPathParser.LEFTPARENTHESIS = 29;
XPathParser.RIGHTPARENTHESIS = 30;
XPathParser.COMMA = 31;
XPathParser.AT = 32;
XPathParser.LEFTBRACKET = 33;
XPathParser.RIGHTBRACKET = 34;
XPathParser.DOT = 35;
XPathParser.DOLLAR = 36;

XPathParser.prototype.tokenize = function(s1) {
	var types = [];
	var values = [];
	var s = s1 + '\0';

	var pos = 0;
	var c = s.charAt(pos++);
	while (1) {
		while (c == ' ' || c == '\t' || c == '\r' || c == '\n') {
			c = s.charAt(pos++);
		}
		if (c == '\0' || pos >= s.length) {
			break;
		}

		if (c == '(') {
			types.push(XPathParser.LEFTPARENTHESIS);
			values.push(c);
			c = s.charAt(pos++);
			continue;
		}
		if (c == ')') {
			types.push(XPathParser.RIGHTPARENTHESIS);
			values.push(c);
			c = s.charAt(pos++);
			continue;
		}
		if (c == '[') {
			types.push(XPathParser.LEFTBRACKET);
			values.push(c);
			c = s.charAt(pos++);
			continue;
		}
		if (c == ']') {
			types.push(XPathParser.RIGHTBRACKET);
			values.push(c);
			c = s.charAt(pos++);
			continue;
		}
		if (c == '@') {
			types.push(XPathParser.AT);
			values.push(c);
			c = s.charAt(pos++);
			continue;
		}
		if (c == ',') {
			types.push(XPathParser.COMMA);
			values.push(c);
			c = s.charAt(pos++);
			continue;
		}
		if (c == '|') {
			types.push(XPathParser.BAR);
			values.push(c);
			c = s.charAt(pos++);
			continue;
		}
		if (c == '+') {
			types.push(XPathParser.PLUS);
			values.push(c);
			c = s.charAt(pos++);
			continue;
		}
		if (c == '-') {
			types.push(XPathParser.MINUS);
			values.push(c);
			c = s.charAt(pos++);
			continue;
		}
		if (c == '=') {
			types.push(XPathParser.EQUALS);
			values.push(c);
			c = s.charAt(pos++);
			continue;
		}
		if (c == '$') {
			types.push(XPathParser.DOLLAR);
			values.push(c);
			c = s.charAt(pos++);
			continue;
		}

		if (c == '.') {
			c = s.charAt(pos++);
			if (c == '.') {
				types.push(XPathParser.DOUBLEDOT);
				values.push("..");
				c = s.charAt(pos++);
				continue;
			}
			if (c >= '0' && c <= '9') {
				var number = "." + c;
				c = s.charAt(pos++);
				while (c >= '0' && c <= '9') {
					number += c;
					c = s.charAt(pos++);
				}
				types.push(XPathParser.NUMBER);
				values.push(number);
				continue;
			}
			types.push(XPathParser.DOT);
			values.push('.');
			continue;
		}

		if (c == '\'' || c == '"') {
			var delimiter = c;
			var literal = "";
			while (pos < s.length && (c = s.charAt(pos)) !== delimiter) {
				literal += c;
                pos += 1;
			}
            if (c !== delimiter) {
                throw XPathException.fromMessage("Unterminated string literal: " + delimiter + literal);
            }
            pos += 1;
			types.push(XPathParser.LITERAL);
			values.push(literal);
			c = s.charAt(pos++);
			continue;
		}

		if (c >= '0' && c <= '9') {
			var number = c;
			c = s.charAt(pos++);
			while (c >= '0' && c <= '9') {
				number += c;
				c = s.charAt(pos++);
			}
			if (c == '.') {
				if (s.charAt(pos) >= '0' && s.charAt(pos) <= '9') {
					number += c;
					number += s.charAt(pos++);
					c = s.charAt(pos++);
					while (c >= '0' && c <= '9') {
						number += c;
						c = s.charAt(pos++);
					}
				}
			}
			types.push(XPathParser.NUMBER);
			values.push(number);
			continue;
		}

		if (c == '*') {
			if (types.length > 0) {
				var last = types[types.length - 1];
				if (last != XPathParser.AT
						&& last != XPathParser.DOUBLECOLON
						&& last != XPathParser.LEFTPARENTHESIS
						&& last != XPathParser.LEFTBRACKET
						&& last != XPathParser.AND
						&& last != XPathParser.OR
						&& last != XPathParser.MOD
						&& last != XPathParser.DIV
						&& last != XPathParser.MULTIPLYOPERATOR
						&& last != XPathParser.SLASH
						&& last != XPathParser.DOUBLESLASH
						&& last != XPathParser.BAR
						&& last != XPathParser.PLUS
						&& last != XPathParser.MINUS
						&& last != XPathParser.EQUALS
						&& last != XPathParser.NOTEQUAL
						&& last != XPathParser.LESSTHAN
						&& last != XPathParser.LESSTHANOREQUAL
						&& last != XPathParser.GREATERTHAN
						&& last != XPathParser.GREATERTHANOREQUAL) {
					types.push(XPathParser.MULTIPLYOPERATOR);
					values.push(c);
					c = s.charAt(pos++);
					continue;
				}
			}
			types.push(XPathParser.ASTERISKNAMETEST);
			values.push(c);
			c = s.charAt(pos++);
			continue;
		}

		if (c == ':') {
			if (s.charAt(pos) == ':') {
				types.push(XPathParser.DOUBLECOLON);
				values.push("::");
				pos++;
				c = s.charAt(pos++);
				continue;
			}
		}

		if (c == '/') {
			c = s.charAt(pos++);
			if (c == '/') {
				types.push(XPathParser.DOUBLESLASH);
				values.push("//");
				c = s.charAt(pos++);
				continue;
			}
			types.push(XPathParser.SLASH);
			values.push('/');
			continue;
		}

		if (c == '!') {
			if (s.charAt(pos) == '=') {
				types.push(XPathParser.NOTEQUAL);
				values.push("!=");
				pos++;
				c = s.charAt(pos++);
				continue;
			}
		}

		if (c == '<') {
			if (s.charAt(pos) == '=') {
				types.push(XPathParser.LESSTHANOREQUAL);
				values.push("<=");
				pos++;
				c = s.charAt(pos++);
				continue;
			}
			types.push(XPathParser.LESSTHAN);
			values.push('<');
			c = s.charAt(pos++);
			continue;
		}

		if (c == '>') {
			if (s.charAt(pos) == '=') {
				types.push(XPathParser.GREATERTHANOREQUAL);
				values.push(">=");
				pos++;
				c = s.charAt(pos++);
				continue;
			}
			types.push(XPathParser.GREATERTHAN);
			values.push('>');
			c = s.charAt(pos++);
			continue;
		}

		if (c == '_' || Utilities.isLetter(c.charCodeAt(0))) {
			var name = c;
			c = s.charAt(pos++);
			while (Utilities.isNCNameChar(c.charCodeAt(0))) {
				name += c;
				c = s.charAt(pos++);
			}
			if (types.length > 0) {
				var last = types[types.length - 1];
				if (last != XPathParser.AT
						&& last != XPathParser.DOUBLECOLON
						&& last != XPathParser.LEFTPARENTHESIS
						&& last != XPathParser.LEFTBRACKET
						&& last != XPathParser.AND
						&& last != XPathParser.OR
						&& last != XPathParser.MOD
						&& last != XPathParser.DIV
						&& last != XPathParser.MULTIPLYOPERATOR
						&& last != XPathParser.SLASH
						&& last != XPathParser.DOUBLESLASH
						&& last != XPathParser.BAR
						&& last != XPathParser.PLUS
						&& last != XPathParser.MINUS
						&& last != XPathParser.EQUALS
						&& last != XPathParser.NOTEQUAL
						&& last != XPathParser.LESSTHAN
						&& last != XPathParser.LESSTHANOREQUAL
						&& last != XPathParser.GREATERTHAN
						&& last != XPathParser.GREATERTHANOREQUAL) {
					if (name == "and") {
						types.push(XPathParser.AND);
						values.push(name);
						continue;
					}
					if (name == "or") {
						types.push(XPathParser.OR);
						values.push(name);
						continue;
					}
					if (name == "mod") {
						types.push(XPathParser.MOD);
						values.push(name);
						continue;
					}
					if (name == "div") {
						types.push(XPathParser.DIV);
						values.push(name);
						continue;
					}
				}
			}
			if (c == ':') {
				if (s.charAt(pos) == '*') {
					types.push(XPathParser.NCNAMECOLONASTERISK);
					values.push(name + ":*");
					pos++;
					c = s.charAt(pos++);
					continue;
				}
				if (s.charAt(pos) == '_' || Utilities.isLetter(s.charCodeAt(pos))) {
					name += ':';
					c = s.charAt(pos++);
					while (Utilities.isNCNameChar(c.charCodeAt(0))) {
						name += c;
						c = s.charAt(pos++);
					}
					if (c == '(') {
						types.push(XPathParser.FUNCTIONNAME);
						values.push(name);
						continue;
					}
					types.push(XPathParser.QNAME);
					values.push(name);
					continue;
				}
				if (s.charAt(pos) == ':') {
					types.push(XPathParser.AXISNAME);
					values.push(name);
					continue;
				}
			}
			if (c == '(') {
				if (name == "comment" || name == "text" || name == "node") {
					types.push(XPathParser.NODETYPE);
					values.push(name);
					continue;
				}
				if (name == "processing-instruction") {
					if (s.charAt(pos) == ')') {
						types.push(XPathParser.NODETYPE);
					} else {
						types.push(XPathParser.PROCESSINGINSTRUCTIONWITHLITERAL);
					}
					values.push(name);
					continue;
				}
				types.push(XPathParser.FUNCTIONNAME);
				values.push(name);
				continue;
			}
			types.push(XPathParser.QNAME);
			values.push(name);
			continue;
		}

		throw new Error("Unexpected character " + c);
	}
	types.push(1);
	values.push("[EOF]");
	return [types, values];
};

XPathParser.SHIFT = 's';
XPathParser.REDUCE = 'r';
XPathParser.ACCEPT = 'a';

XPathParser.prototype.parse = function(s) {
	var types;
	var values;
	var res = this.tokenize(s);
	if (res == undefined) {
		return undefined;
	}
	types = res[0];
	values = res[1];
	var tokenPos = 0;
	var state = [];
	var tokenType = [];
	var tokenValue = [];
	var s;
	var a;
	var t;

	state.push(0);
	tokenType.push(1);
	tokenValue.push("_S");

	a = types[tokenPos];
	t = values[tokenPos++];
	while (1) {
		s = state[state.length - 1];
		switch (XPathParser.actionTable[s].charAt(a - 1)) {
			case XPathParser.SHIFT:
				tokenType.push(-a);
				tokenValue.push(t);
				state.push(XPathParser.actionTableNumber[s].charCodeAt(a - 1) - 32);
				a = types[tokenPos];
				t = values[tokenPos++];
				break;
			case XPathParser.REDUCE:
				var num = XPathParser.productions[XPathParser.actionTableNumber[s].charCodeAt(a - 1) - 32][1];
				var rhs = [];
				for (var i = 0; i < num; i++) {
					tokenType.pop();
					rhs.unshift(tokenValue.pop());
					state.pop();
				}
				var s_ = state[state.length - 1];
				tokenType.push(XPathParser.productions[XPathParser.actionTableNumber[s].charCodeAt(a - 1) - 32][0]);
				if (this.reduceActions[XPathParser.actionTableNumber[s].charCodeAt(a - 1) - 32] == undefined) {
					tokenValue.push(rhs[0]);
				} else {
					tokenValue.push(this.reduceActions[XPathParser.actionTableNumber[s].charCodeAt(a - 1) - 32](rhs));
				}
				state.push(XPathParser.gotoTable[s_].charCodeAt(XPathParser.productions[XPathParser.actionTableNumber[s].charCodeAt(a - 1) - 32][0] - 2) - 33);
				break;
			case XPathParser.ACCEPT:
				return new XPath(tokenValue.pop());
			default:
				throw new Error("XPath parse error");
		}
	}
};

// XPath /////////////////////////////////////////////////////////////////////

XPath.prototype = new Object();
XPath.prototype.constructor = XPath;
XPath.superclass = Object.prototype;

function XPath(e) {
	this.expression = e;
}

XPath.prototype.toString = function() {
	return this.expression.toString();
};

XPath.prototype.evaluate = function(c) {
	c.contextNode = c.expressionContextNode;
	c.contextSize = 1;
	c.contextPosition = 1;
	c.caseInsensitive = false;
	if (c.contextNode != null) {
		var doc = c.contextNode;
		if (doc.nodeType != 9 /*Node.DOCUMENT_NODE*/) {
			doc = doc.ownerDocument;
		}
		try {
			c.caseInsensitive = doc.implementation.hasFeature("HTML", "2.0");
		} catch (e) {
			c.caseInsensitive = true;
		}
	}
	return this.expression.evaluate(c);
};

XPath.XML_NAMESPACE_URI = "http://www.w3.org/XML/1998/namespace";
XPath.XMLNS_NAMESPACE_URI = "http://www.w3.org/2000/xmlns/";

// Expression ////////////////////////////////////////////////////////////////

Expression.prototype = new Object();
Expression.prototype.constructor = Expression;
Expression.superclass = Object.prototype;

function Expression() {
}

Expression.prototype.init = function() {
};

Expression.prototype.toString = function() {
	return "<Expression>";
};

Expression.prototype.evaluate = function(c) {
	throw new Error("Could not evaluate expression.");
};

// UnaryOperation ////////////////////////////////////////////////////////////

UnaryOperation.prototype = new Expression();
UnaryOperation.prototype.constructor = UnaryOperation;
UnaryOperation.superclass = Expression.prototype;

function UnaryOperation(rhs) {
	if (arguments.length > 0) {
		this.init(rhs);
	}
}

UnaryOperation.prototype.init = function(rhs) {
	this.rhs = rhs;
};

// UnaryMinusOperation ///////////////////////////////////////////////////////

UnaryMinusOperation.prototype = new UnaryOperation();
UnaryMinusOperation.prototype.constructor = UnaryMinusOperation;
UnaryMinusOperation.superclass = UnaryOperation.prototype;

function UnaryMinusOperation(rhs) {
	if (arguments.length > 0) {
		this.init(rhs);
	}
}

UnaryMinusOperation.prototype.init = function(rhs) {
	UnaryMinusOperation.superclass.init.call(this, rhs);
};

UnaryMinusOperation.prototype.evaluate = function(c) {
	return this.rhs.evaluate(c).number().negate();
};

UnaryMinusOperation.prototype.toString = function() {
	return "-" + this.rhs.toString();
};

// BinaryOperation ///////////////////////////////////////////////////////////

BinaryOperation.prototype = new Expression();
BinaryOperation.prototype.constructor = BinaryOperation;
BinaryOperation.superclass = Expression.prototype;

function BinaryOperation(lhs, rhs) {
	if (arguments.length > 0) {
		this.init(lhs, rhs);
	}
}

BinaryOperation.prototype.init = function(lhs, rhs) {
	this.lhs = lhs;
	this.rhs = rhs;
};

// OrOperation ///////////////////////////////////////////////////////////////

OrOperation.prototype = new BinaryOperation();
OrOperation.prototype.constructor = OrOperation;
OrOperation.superclass = BinaryOperation.prototype;

function OrOperation(lhs, rhs) {
	if (arguments.length > 0) {
		this.init(lhs, rhs);
	}
}

OrOperation.prototype.init = function(lhs, rhs) {
	OrOperation.superclass.init.call(this, lhs, rhs);
};

OrOperation.prototype.toString = function() {
	return "(" + this.lhs.toString() + " or " + this.rhs.toString() + ")";
};

OrOperation.prototype.evaluate = function(c) {
	var b = this.lhs.evaluate(c).bool();
	if (b.booleanValue()) {
		return b;
	}
	return this.rhs.evaluate(c).bool();
};

// AndOperation //////////////////////////////////////////////////////////////

AndOperation.prototype = new BinaryOperation();
AndOperation.prototype.constructor = AndOperation;
AndOperation.superclass = BinaryOperation.prototype;

function AndOperation(lhs, rhs) {
	if (arguments.length > 0) {
		this.init(lhs, rhs);
	}
}

AndOperation.prototype.init = function(lhs, rhs) {
	AndOperation.superclass.init.call(this, lhs, rhs);
};

AndOperation.prototype.toString = function() {
	return "(" + this.lhs.toString() + " and " + this.rhs.toString() + ")";
};

AndOperation.prototype.evaluate = function(c) {
	var b = this.lhs.evaluate(c).bool();
	if (!b.booleanValue()) {
		return b;
	}
	return this.rhs.evaluate(c).bool();
};

// EqualsOperation ///////////////////////////////////////////////////////////

EqualsOperation.prototype = new BinaryOperation();
EqualsOperation.prototype.constructor = EqualsOperation;
EqualsOperation.superclass = BinaryOperation.prototype;

function EqualsOperation(lhs, rhs) {
	if (arguments.length > 0) {
		this.init(lhs, rhs);
	}
}

EqualsOperation.prototype.init = function(lhs, rhs) {
	EqualsOperation.superclass.init.call(this, lhs, rhs);
};

EqualsOperation.prototype.toString = function() {
	return "(" + this.lhs.toString() + " = " + this.rhs.toString() + ")";
};

EqualsOperation.prototype.evaluate = function(c) {
	return this.lhs.evaluate(c).equals(this.rhs.evaluate(c));
};

// NotEqualOperation /////////////////////////////////////////////////////////

NotEqualOperation.prototype = new BinaryOperation();
NotEqualOperation.prototype.constructor = NotEqualOperation;
NotEqualOperation.superclass = BinaryOperation.prototype;

function NotEqualOperation(lhs, rhs) {
	if (arguments.length > 0) {
		this.init(lhs, rhs);
	}
}

NotEqualOperation.prototype.init = function(lhs, rhs) {
	NotEqualOperation.superclass.init.call(this, lhs, rhs);
};

NotEqualOperation.prototype.toString = function() {
	return "(" + this.lhs.toString() + " != " + this.rhs.toString() + ")";
};

NotEqualOperation.prototype.evaluate = function(c) {
	return this.lhs.evaluate(c).notequal(this.rhs.evaluate(c));
};

// LessThanOperation /////////////////////////////////////////////////////////

LessThanOperation.prototype = new BinaryOperation();
LessThanOperation.prototype.constructor = LessThanOperation;
LessThanOperation.superclass = BinaryOperation.prototype;

function LessThanOperation(lhs, rhs) {
	if (arguments.length > 0) {
		this.init(lhs, rhs);
	}
}

LessThanOperation.prototype.init = function(lhs, rhs) {
	LessThanOperation.superclass.init.call(this, lhs, rhs);
};

LessThanOperation.prototype.evaluate = function(c) {
	return this.lhs.evaluate(c).lessthan(this.rhs.evaluate(c));
};

LessThanOperation.prototype.toString = function() {
	return "(" + this.lhs.toString() + " < " + this.rhs.toString() + ")";
};

// GreaterThanOperation //////////////////////////////////////////////////////

GreaterThanOperation.prototype = new BinaryOperation();
GreaterThanOperation.prototype.constructor = GreaterThanOperation;
GreaterThanOperation.superclass = BinaryOperation.prototype;

function GreaterThanOperation(lhs, rhs) {
	if (arguments.length > 0) {
		this.init(lhs, rhs);
	}
}

GreaterThanOperation.prototype.init = function(lhs, rhs) {
	GreaterThanOperation.superclass.init.call(this, lhs, rhs);
};

GreaterThanOperation.prototype.evaluate = function(c) {
	return this.lhs.evaluate(c).greaterthan(this.rhs.evaluate(c));
};

GreaterThanOperation.prototype.toString = function() {
	return "(" + this.lhs.toString() + " > " + this.rhs.toString() + ")";
};

// LessThanOrEqualOperation //////////////////////////////////////////////////

LessThanOrEqualOperation.prototype = new BinaryOperation();
LessThanOrEqualOperation.prototype.constructor = LessThanOrEqualOperation;
LessThanOrEqualOperation.superclass = BinaryOperation.prototype;

function LessThanOrEqualOperation(lhs, rhs) {
	if (arguments.length > 0) {
		this.init(lhs, rhs);
	}
}

LessThanOrEqualOperation.prototype.init = function(lhs, rhs) {
	LessThanOrEqualOperation.superclass.init.call(this, lhs, rhs);
};

LessThanOrEqualOperation.prototype.evaluate = function(c) {
	return this.lhs.evaluate(c).lessthanorequal(this.rhs.evaluate(c));
};

LessThanOrEqualOperation.prototype.toString = function() {
	return "(" + this.lhs.toString() + " <= " + this.rhs.toString() + ")";
};

// GreaterThanOrEqualOperation ///////////////////////////////////////////////

GreaterThanOrEqualOperation.prototype = new BinaryOperation();
GreaterThanOrEqualOperation.prototype.constructor = GreaterThanOrEqualOperation;
GreaterThanOrEqualOperation.superclass = BinaryOperation.prototype;

function GreaterThanOrEqualOperation(lhs, rhs) {
	if (arguments.length > 0) {
		this.init(lhs, rhs);
	}
}

GreaterThanOrEqualOperation.prototype.init = function(lhs, rhs) {
	GreaterThanOrEqualOperation.superclass.init.call(this, lhs, rhs);
};

GreaterThanOrEqualOperation.prototype.evaluate = function(c) {
	return this.lhs.evaluate(c).greaterthanorequal(this.rhs.evaluate(c));
};

GreaterThanOrEqualOperation.prototype.toString = function() {
	return "(" + this.lhs.toString() + " >= " + this.rhs.toString() + ")";
};

// PlusOperation /////////////////////////////////////////////////////////////

PlusOperation.prototype = new BinaryOperation();
PlusOperation.prototype.constructor = PlusOperation;
PlusOperation.superclass = BinaryOperation.prototype;

function PlusOperation(lhs, rhs) {
	if (arguments.length > 0) {
		this.init(lhs, rhs);
	}
}

PlusOperation.prototype.init = function(lhs, rhs) {
	PlusOperation.superclass.init.call(this, lhs, rhs);
};

PlusOperation.prototype.evaluate = function(c) {
	return this.lhs.evaluate(c).number().plus(this.rhs.evaluate(c).number());
};

PlusOperation.prototype.toString = function() {
	return "(" + this.lhs.toString() + " + " + this.rhs.toString() + ")";
};

// MinusOperation ////////////////////////////////////////////////////////////

MinusOperation.prototype = new BinaryOperation();
MinusOperation.prototype.constructor = MinusOperation;
MinusOperation.superclass = BinaryOperation.prototype;

function MinusOperation(lhs, rhs) {
	if (arguments.length > 0) {
		this.init(lhs, rhs);
	}
}

MinusOperation.prototype.init = function(lhs, rhs) {
	MinusOperation.superclass.init.call(this, lhs, rhs);
};

MinusOperation.prototype.evaluate = function(c) {
	return this.lhs.evaluate(c).number().minus(this.rhs.evaluate(c).number());
};

MinusOperation.prototype.toString = function() {
	return "(" + this.lhs.toString() + " - " + this.rhs.toString() + ")";
};

// MultiplyOperation /////////////////////////////////////////////////////////

MultiplyOperation.prototype = new BinaryOperation();
MultiplyOperation.prototype.constructor = MultiplyOperation;
MultiplyOperation.superclass = BinaryOperation.prototype;

function MultiplyOperation(lhs, rhs) {
	if (arguments.length > 0) {
		this.init(lhs, rhs);
	}
}

MultiplyOperation.prototype.init = function(lhs, rhs) {
	MultiplyOperation.superclass.init.call(this, lhs, rhs);
};

MultiplyOperation.prototype.evaluate = function(c) {
	return this.lhs.evaluate(c).number().multiply(this.rhs.evaluate(c).number());
};

MultiplyOperation.prototype.toString = function() {
	return "(" + this.lhs.toString() + " * " + this.rhs.toString() + ")";
};

// DivOperation //////////////////////////////////////////////////////////////

DivOperation.prototype = new BinaryOperation();
DivOperation.prototype.constructor = DivOperation;
DivOperation.superclass = BinaryOperation.prototype;

function DivOperation(lhs, rhs) {
	if (arguments.length > 0) {
		this.init(lhs, rhs);
	}
}

DivOperation.prototype.init = function(lhs, rhs) {
	DivOperation.superclass.init.call(this, lhs, rhs);
};

DivOperation.prototype.evaluate = function(c) {
	return this.lhs.evaluate(c).number().div(this.rhs.evaluate(c).number());
};

DivOperation.prototype.toString = function() {
	return "(" + this.lhs.toString() + " div " + this.rhs.toString() + ")";
};

// ModOperation //////////////////////////////////////////////////////////////

ModOperation.prototype = new BinaryOperation();
ModOperation.prototype.constructor = ModOperation;
ModOperation.superclass = BinaryOperation.prototype;

function ModOperation(lhs, rhs) {
	if (arguments.length > 0) {
		this.init(lhs, rhs);
	}
}

ModOperation.prototype.init = function(lhs, rhs) {
	ModOperation.superclass.init.call(this, lhs, rhs);
};

ModOperation.prototype.evaluate = function(c) {
	return this.lhs.evaluate(c).number().mod(this.rhs.evaluate(c).number());
};

ModOperation.prototype.toString = function() {
	return "(" + this.lhs.toString() + " mod " + this.rhs.toString() + ")";
};

// BarOperation //////////////////////////////////////////////////////////////

BarOperation.prototype = new BinaryOperation();
BarOperation.prototype.constructor = BarOperation;
BarOperation.superclass = BinaryOperation.prototype;

function BarOperation(lhs, rhs) {
	if (arguments.length > 0) {
		this.init(lhs, rhs);
	}
}

BarOperation.prototype.init = function(lhs, rhs) {
	BarOperation.superclass.init.call(this, lhs, rhs);
};

BarOperation.prototype.evaluate = function(c) {
	return this.lhs.evaluate(c).nodeset().union(this.rhs.evaluate(c).nodeset());
};

BarOperation.prototype.toString = function() {
	return this.lhs.toString() + " | " + this.rhs.toString();
};

// PathExpr //////////////////////////////////////////////////////////////////

PathExpr.prototype = new Expression();
PathExpr.prototype.constructor = PathExpr;
PathExpr.superclass = Expression.prototype;

function PathExpr(filter, filterPreds, locpath) {
	if (arguments.length > 0) {
		this.init(filter, filterPreds, locpath);
	}
}

PathExpr.prototype.init = function(filter, filterPreds, locpath) {
	PathExpr.superclass.init.call(this);
	this.filter = filter;
	this.filterPredicates = filterPreds;
	this.locationPath = locpath;
};

/**
 * Returns the topmost node of the tree containing node
 */
function findRoot(node) {
    while (node && node.parentNode) {
        node = node.parentNode;
    }

    return node;
}


PathExpr.prototype.evaluate = function(c) {
	var nodes;
	var xpc = new XPathContext();
	xpc.variableResolver = c.variableResolver;
	xpc.functionResolver = c.functionResolver;
	xpc.namespaceResolver = c.namespaceResolver;
	xpc.expressionContextNode = c.expressionContextNode;
	xpc.virtualRoot = c.virtualRoot;
	xpc.caseInsensitive = c.caseInsensitive;
	if (this.filter == null) {
		nodes = [ c.contextNode ];
	} else {
		var ns = this.filter.evaluate(c);
		if (!Utilities.instance_of(ns, XNodeSet)) {
			if (this.filterPredicates != null && this.filterPredicates.length > 0 || this.locationPath != null) {
				throw new Error("Path expression filter must evaluate to a nodset if predicates or location path are used");
			}
			return ns;
		}
		nodes = ns.toUnsortedArray();
		if (this.filterPredicates != null) {
			// apply each of the predicates in turn
			for (var j = 0; j < this.filterPredicates.length; j++) {
				var pred = this.filterPredicates[j];
				var newNodes = [];
				xpc.contextSize = nodes.length;
				for (xpc.contextPosition = 1; xpc.contextPosition <= xpc.contextSize; xpc.contextPosition++) {
					xpc.contextNode = nodes[xpc.contextPosition - 1];
					if (this.predicateMatches(pred, xpc)) {
						newNodes.push(xpc.contextNode);
					}
				}
				nodes = newNodes;
			}
		}
	}
	if (this.locationPath != null) {
		if (this.locationPath.absolute) {
			if (nodes[0].nodeType != 9 /*Node.DOCUMENT_NODE*/) {
				if (xpc.virtualRoot != null) {
					nodes = [ xpc.virtualRoot ];
				} else {
					if (nodes[0].ownerDocument == null) {
						// IE 5.5 doesn't have ownerDocument?
						var n = nodes[0];
						while (n.parentNode != null) {
							n = n.parentNode;
						}
						nodes = [ n ];
					} else {
						nodes = [ nodes[0].ownerDocument ];
					}
				}
			} else {
				nodes = [ nodes[0] ];
			}
		}
		for (var i = 0; i < this.locationPath.steps.length; i++) {
			var step = this.locationPath.steps[i];
			var newNodes = [];
			for (var j = 0; j < nodes.length; j++) {
				xpc.contextNode = nodes[j];
				switch (step.axis) {
					case Step.ANCESTOR:
						// look at all the ancestor nodes
						if (xpc.contextNode === xpc.virtualRoot) {
							break;
						}
						var m;
						if (xpc.contextNode.nodeType == 2 /*Node.ATTRIBUTE_NODE*/) {
							m = this.getOwnerElement(xpc.contextNode);
						} else {
							m = xpc.contextNode.parentNode;
						}
						while (m != null) {
							if (step.nodeTest.matches(m, xpc)) {
								newNodes.push(m);
							}
							if (m === xpc.virtualRoot) {
								break;
							}
							m = m.parentNode;
						}
						break;

					case Step.ANCESTORORSELF:
						// look at all the ancestor nodes and the current node
						for (var m = xpc.contextNode; m != null; m = m.nodeType == 2 /*Node.ATTRIBUTE_NODE*/ ? this.getOwnerElement(m) : m.parentNode) {
							if (step.nodeTest.matches(m, xpc)) {
								newNodes.push(m);
							}
							if (m === xpc.virtualRoot) {
								break;
							}
						}
						break;

					case Step.ATTRIBUTE:
						// look at the attributes
						var nnm = xpc.contextNode.attributes;
						if (nnm != null) {
							for (var k = 0; k < nnm.length; k++) {
								var m = nnm.item(k);
								if (step.nodeTest.matches(m, xpc)) {
									newNodes.push(m);
								}
							}
						}
						break;

					case Step.CHILD:
						// look at all child elements
						for (var m = xpc.contextNode.firstChild; m != null; m = m.nextSibling) {
							if (step.nodeTest.matches(m, xpc)) {
								newNodes.push(m);
							}
						}
						break;

					case Step.DESCENDANT:
						// look at all descendant nodes
						var st = [ xpc.contextNode.firstChild ];
						while (st.length > 0) {
							for (var m = st.pop(); m != null; ) {
								if (step.nodeTest.matches(m, xpc)) {
									newNodes.push(m);
								}
								if (m.firstChild != null) {
									st.push(m.nextSibling);
									m = m.firstChild;
								} else {
									m = m.nextSibling;
								}
							}
						}
						break;

					case Step.DESCENDANTORSELF:
						// look at self
						if (step.nodeTest.matches(xpc.contextNode, xpc)) {
							newNodes.push(xpc.contextNode);
						}
						// look at all descendant nodes
						var st = [ xpc.contextNode.firstChild ];
						while (st.length > 0) {
							for (var m = st.pop(); m != null; ) {
								if (step.nodeTest.matches(m, xpc)) {
									newNodes.push(m);
								}
								if (m.firstChild != null) {
									st.push(m.nextSibling);
									m = m.firstChild;
								} else {
									m = m.nextSibling;
								}
							}
						}
						break;

					case Step.FOLLOWING:
						if (xpc.contextNode === xpc.virtualRoot) {
							break;
						}
						var st = [];
						if (xpc.contextNode.firstChild != null) {
							st.unshift(xpc.contextNode.firstChild);
						} else {
							st.unshift(xpc.contextNode.nextSibling);
						}
						for (var m = xpc.contextNode.parentNode; m != null && m.nodeType != 9 /*Node.DOCUMENT_NODE*/ && m !== xpc.virtualRoot; m = m.parentNode) {
							st.unshift(m.nextSibling);
						}
						do {
							for (var m = st.pop(); m != null; ) {
								if (step.nodeTest.matches(m, xpc)) {
									newNodes.push(m);
								}
								if (m.firstChild != null) {
									st.push(m.nextSibling);
									m = m.firstChild;
								} else {
									m = m.nextSibling;
								}
							}
						} while (st.length > 0);
						break;

					case Step.FOLLOWINGSIBLING:
						if (xpc.contextNode === xpc.virtualRoot) {
							break;
						}
						for (var m = xpc.contextNode.nextSibling; m != null; m = m.nextSibling) {
							if (step.nodeTest.matches(m, xpc)) {
								newNodes.push(m);
							}
						}
						break;

					case Step.NAMESPACE:
						var n = {};
						if (xpc.contextNode.nodeType == 1 /*Node.ELEMENT_NODE*/) {
							n["xml"] = XPath.XML_NAMESPACE_URI;
							n["xmlns"] = XPath.XMLNS_NAMESPACE_URI;
							for (var m = xpc.contextNode; m != null && m.nodeType == 1 /*Node.ELEMENT_NODE*/; m = m.parentNode) {
								for (var k = 0; k < m.attributes.length; k++) {
									var attr = m.attributes.item(k);
									var nm = String(attr.name);
									if (nm == "xmlns") {
										if (n[""] == undefined) {
											n[""] = attr.value;
										}
									} else if (nm.length > 6 && nm.substring(0, 6) == "xmlns:") {
										var pre = nm.substring(6, nm.length);
										if (n[pre] == undefined) {
											n[pre] = attr.value;
										}
									}
								}
							}
							for (var pre in n) {
								var nsn = new XPathNamespace(pre, n[pre], xpc.contextNode);
								if (step.nodeTest.matches(nsn, xpc)) {
									newNodes.push(nsn);
								}
							}
						}
						break;

					case Step.PARENT:
						m = null;
						if (xpc.contextNode !== xpc.virtualRoot) {
							if (xpc.contextNode.nodeType == 2 /*Node.ATTRIBUTE_NODE*/) {
								m = this.getOwnerElement(xpc.contextNode);
							} else {
								m = xpc.contextNode.parentNode;
							}
						}
						if (m != null && step.nodeTest.matches(m, xpc)) {
							newNodes.push(m);
						}
						break;

					case Step.PRECEDING:
						var st;
						if (xpc.virtualRoot != null) {
							st = [ xpc.virtualRoot ];
						} else {
                            // cannot rely on .ownerDocument because the node may be in a document fragment
                            st = [findRoot(xpc.contextNode)];
						}
						outer: while (st.length > 0) {
							for (var m = st.pop(); m != null; ) {
								if (m == xpc.contextNode) {
									break outer;
								}
								if (step.nodeTest.matches(m, xpc)) {
									newNodes.unshift(m);
								}
								if (m.firstChild != null) {
									st.push(m.nextSibling);
									m = m.firstChild;
								} else {
									m = m.nextSibling;
								}
							}
						}
						break;

					case Step.PRECEDINGSIBLING:
						if (xpc.contextNode === xpc.virtualRoot) {
							break;
						}
						for (var m = xpc.contextNode.previousSibling; m != null; m = m.previousSibling) {
							if (step.nodeTest.matches(m, xpc)) {
								newNodes.push(m);
							}
						}
						break;

					case Step.SELF:
						if (step.nodeTest.matches(xpc.contextNode, xpc)) {
							newNodes.push(xpc.contextNode);
						}
						break;

					default:
				}
			}
			nodes = newNodes;
			// apply each of the predicates in turn
			for (var j = 0; j < step.predicates.length; j++) {
				var pred = step.predicates[j];
				var newNodes = [];
				xpc.contextSize = nodes.length;
				for (xpc.contextPosition = 1; xpc.contextPosition <= xpc.contextSize; xpc.contextPosition++) {
					xpc.contextNode = nodes[xpc.contextPosition - 1];
					if (this.predicateMatches(pred, xpc)) {
						newNodes.push(xpc.contextNode);
					} else {
					}
				}
				nodes = newNodes;
			}
		}
	}
	var ns = new XNodeSet();
	ns.addArray(nodes);
	return ns;
};

PathExpr.prototype.predicateMatches = function(pred, c) {
	var res = pred.evaluate(c);
	if (Utilities.instance_of(res, XNumber)) {
		return c.contextPosition == res.numberValue();
	}
	return res.booleanValue();
};

PathExpr.prototype.toString = function() {
	if (this.filter != undefined) {
		var s = this.filter.toString();
		if (Utilities.instance_of(this.filter, XString)) {
			s = "'" + s + "'";
		}
		if (this.filterPredicates != undefined) {
			for (var i = 0; i < this.filterPredicates.length; i++) {
				s = s + "[" + this.filterPredicates[i].toString() + "]";
			}
		}
		if (this.locationPath != undefined) {
			if (!this.locationPath.absolute) {
				s += "/";
			}
			s += this.locationPath.toString();
		}
		return s;
	}
	return this.locationPath.toString();
};

PathExpr.prototype.getOwnerElement = function(n) {
	// DOM 2 has ownerElement
	if (n.ownerElement) {
		return n.ownerElement;
	}
	// DOM 1 Internet Explorer can use selectSingleNode (ironically)
	try {
		if (n.selectSingleNode) {
			return n.selectSingleNode("..");
		}
	} catch (e) {
	}
	// Other DOM 1 implementations must use this egregious search
	var doc = n.nodeType == 9 /*Node.DOCUMENT_NODE*/
			? n
			: n.ownerDocument;
	var elts = doc.getElementsByTagName("*");
	for (var i = 0; i < elts.length; i++) {
		var elt = elts.item(i);
		var nnm = elt.attributes;
		for (var j = 0; j < nnm.length; j++) {
			var an = nnm.item(j);
			if (an === n) {
				return elt;
			}
		}
	}
	return null;
};

// LocationPath //////////////////////////////////////////////////////////////

LocationPath.prototype = new Object();
LocationPath.prototype.constructor = LocationPath;
LocationPath.superclass = Object.prototype;

function LocationPath(abs, steps) {
	if (arguments.length > 0) {
		this.init(abs, steps);
	}
}

LocationPath.prototype.init = function(abs, steps) {
	this.absolute = abs;
	this.steps = steps;
};

LocationPath.prototype.toString = function() {
	var s;
	if (this.absolute) {
		s = "/";
	} else {
		s = "";
	}
	for (var i = 0; i < this.steps.length; i++) {
		if (i != 0) {
			s += "/";
		}
		s += this.steps[i].toString();
	}
	return s;
};

// Step //////////////////////////////////////////////////////////////////////

Step.prototype = new Object();
Step.prototype.constructor = Step;
Step.superclass = Object.prototype;

function Step(axis, nodetest, preds) {
	if (arguments.length > 0) {
		this.init(axis, nodetest, preds);
	}
}

Step.prototype.init = function(axis, nodetest, preds) {
	this.axis = axis;
	this.nodeTest = nodetest;
	this.predicates = preds;
};

Step.prototype.toString = function() {
	var s;
	switch (this.axis) {
		case Step.ANCESTOR:
			s = "ancestor";
			break;
		case Step.ANCESTORORSELF:
			s = "ancestor-or-self";
			break;
		case Step.ATTRIBUTE:
			s = "attribute";
			break;
		case Step.CHILD:
			s = "child";
			break;
		case Step.DESCENDANT:
			s = "descendant";
			break;
		case Step.DESCENDANTORSELF:
			s = "descendant-or-self";
			break;
		case Step.FOLLOWING:
			s = "following";
			break;
		case Step.FOLLOWINGSIBLING:
			s = "following-sibling";
			break;
		case Step.NAMESPACE:
			s = "namespace";
			break;
		case Step.PARENT:
			s = "parent";
			break;
		case Step.PRECEDING:
			s = "preceding";
			break;
		case Step.PRECEDINGSIBLING:
			s = "preceding-sibling";
			break;
		case Step.SELF:
			s = "self";
			break;
	}
	s += "::";
	s += this.nodeTest.toString();
	for (var i = 0; i < this.predicates.length; i++) {
		s += "[" + this.predicates[i].toString() + "]";
	}
	return s;
};

Step.ANCESTOR = 0;
Step.ANCESTORORSELF = 1;
Step.ATTRIBUTE = 2;
Step.CHILD = 3;
Step.DESCENDANT = 4;
Step.DESCENDANTORSELF = 5;
Step.FOLLOWING = 6;
Step.FOLLOWINGSIBLING = 7;
Step.NAMESPACE = 8;
Step.PARENT = 9;
Step.PRECEDING = 10;
Step.PRECEDINGSIBLING = 11;
Step.SELF = 12;

// NodeTest //////////////////////////////////////////////////////////////////

NodeTest.prototype = new Object();
NodeTest.prototype.constructor = NodeTest;
NodeTest.superclass = Object.prototype;

function NodeTest(type, value) {
	if (arguments.length > 0) {
		this.init(type, value);
	}
}

NodeTest.prototype.init = function(type, value) {
	this.type = type;
	this.value = value;
};

NodeTest.prototype.toString = function() {
	switch (this.type) {
		case NodeTest.NAMETESTANY:
			return "*";
		case NodeTest.NAMETESTPREFIXANY:
			return this.value + ":*";
		case NodeTest.NAMETESTRESOLVEDANY:
			return "{" + this.value + "}*";
		case NodeTest.NAMETESTQNAME:
			return this.value;
		case NodeTest.NAMETESTRESOLVEDNAME:
			return "{" + this.namespaceURI + "}" + this.value;
		case NodeTest.COMMENT:
			return "comment()";
		case NodeTest.TEXT:
			return "text()";
		case NodeTest.PI:
			if (this.value != undefined) {
				return "processing-instruction(\"" + this.value + "\")";
			}
			return "processing-instruction()";
		case NodeTest.NODE:
			return "node()";
	}
	return "<unknown nodetest type>";
};

NodeTest.prototype.matches = function (n, xpc) {
    var nType = n.nodeType;

	switch (this.type) {
		case NodeTest.NAMETESTANY:
			if (nType === 2 /*Node.ATTRIBUTE_NODE*/
					|| nType === 1 /*Node.ELEMENT_NODE*/
					|| nType === XPathNamespace.XPATH_NAMESPACE_NODE) {
				return true;
			}
			return false;
		case NodeTest.NAMETESTPREFIXANY:
			if (nType === 2 /*Node.ATTRIBUTE_NODE*/ || nType === 1 /*Node.ELEMENT_NODE*/) {
				var ns = xpc.namespaceResolver.getNamespace(this.value, xpc.expressionContextNode);
				if (ns == null) {
					throw new Error("Cannot resolve QName " + this.value);
				}
				return ns === (n.namespaceURI || '');
			}
			return false;
		case NodeTest.NAMETESTQNAME:
			if (nType === 2 /*Node.ATTRIBUTE_NODE*/
					|| nType === 1 /*Node.ELEMENT_NODE*/
					|| nType === XPathNamespace.XPATH_NAMESPACE_NODE) {
				var test = Utilities.resolveQName(this.value, xpc.namespaceResolver, xpc.expressionContextNode, false);
				if (test[0] == null) {
					throw new Error("Cannot resolve QName " + this.value);
				}

				test[0] = String(test[0]) || null;
				test[1] = String(test[1]);

				var node = [
                    String(n.namespaceURI || '') || null,
                    // localName will be null if the node was created with DOM1 createElement()
                    String(n.localName || n.nodeName)
                ];

				if (xpc.caseInsensitive) {
					return test[0] === node[0] && test[1].toLowerCase() === node[1].toLowerCase();
				}

				return test[0] === node[0] && test[1] === node[1];
			}
			return false;
		case NodeTest.COMMENT:
			return nType === 8 /*Node.COMMENT_NODE*/;
		case NodeTest.TEXT:
			return nType === 3 /*Node.TEXT_NODE*/ || nType == 4 /*Node.CDATA_SECTION_NODE*/;
		case NodeTest.PI:
			return nType === 7 /*Node.PROCESSING_INSTRUCTION_NODE*/
				&& (this.value == null || n.nodeName == this.value);
		case NodeTest.NODE:
			return nType === 9 /*Node.DOCUMENT_NODE*/
				|| nType === 1 /*Node.ELEMENT_NODE*/
				|| nType === 2 /*Node.ATTRIBUTE_NODE*/
				|| nType === 3 /*Node.TEXT_NODE*/
				|| nType === 4 /*Node.CDATA_SECTION_NODE*/
				|| nType === 8 /*Node.COMMENT_NODE*/
				|| nType === 7 /*Node.PROCESSING_INSTRUCTION_NODE*/;
	}
	return false;
};

NodeTest.NAMETESTANY = 0;
NodeTest.NAMETESTPREFIXANY = 1;
NodeTest.NAMETESTQNAME = 2;
NodeTest.COMMENT = 3;
NodeTest.TEXT = 4;
NodeTest.PI = 5;
NodeTest.NODE = 6;

// VariableReference /////////////////////////////////////////////////////////

VariableReference.prototype = new Expression();
VariableReference.prototype.constructor = VariableReference;
VariableReference.superclass = Expression.prototype;

function VariableReference(v) {
	if (arguments.length > 0) {
		this.init(v);
	}
}

VariableReference.prototype.init = function(v) {
	this.variable = v;
};

VariableReference.prototype.toString = function() {
	return "$" + this.variable;
};

VariableReference.prototype.evaluate = function(c) {
    var parts = Utilities.resolveQName(this.variable, c.namespaceResolver, c.contextNode, false);

    if (parts[0] == null) {
        throw new Error("Cannot resolve QName " + fn);
    }
	var result = c.variableResolver.getVariable(parts[1], parts[0]);
    if (!result) {
        throw XPathException.fromMessage("Undeclared variable: " + this.toString());
    }
    return result;
};

// FunctionCall //////////////////////////////////////////////////////////////

FunctionCall.prototype = new Expression();
FunctionCall.prototype.constructor = FunctionCall;
FunctionCall.superclass = Expression.prototype;

function FunctionCall(fn, args) {
	if (arguments.length > 0) {
		this.init(fn, args);
	}
}

FunctionCall.prototype.init = function(fn, args) {
	this.functionName = fn;
	this.arguments = args;
};

FunctionCall.prototype.toString = function() {
	var s = this.functionName + "(";
	for (var i = 0; i < this.arguments.length; i++) {
		if (i > 0) {
			s += ", ";
		}
		s += this.arguments[i].toString();
	}
	return s + ")";
};

FunctionCall.prototype.evaluate = function(c) {
    var f = FunctionResolver.getFunctionFromContext(this.functionName, c);

    if (!f) {
		throw new Error("Unknown function " + this.functionName);
	}

    var a = [c].concat(this.arguments);
	return f.apply(c.functionResolver.thisArg, a);
};

// XString ///////////////////////////////////////////////////////////////////

XString.prototype = new Expression();
XString.prototype.constructor = XString;
XString.superclass = Expression.prototype;

function XString(s) {
	if (arguments.length > 0) {
		this.init(s);
	}
}

XString.prototype.init = function(s) {
	this.str = String(s);
};

XString.prototype.toString = function() {
	return this.str;
};

XString.prototype.evaluate = function(c) {
	return this;
};

XString.prototype.string = function() {
	return this;
};

XString.prototype.number = function() {
	return new XNumber(this.str);
};

XString.prototype.bool = function() {
	return new XBoolean(this.str);
};

XString.prototype.nodeset = function() {
	throw new Error("Cannot convert string to nodeset");
};

XString.prototype.stringValue = function() {
	return this.str;
};

XString.prototype.numberValue = function() {
	return this.number().numberValue();
};

XString.prototype.booleanValue = function() {
	return this.bool().booleanValue();
};

XString.prototype.equals = function(r) {
	if (Utilities.instance_of(r, XBoolean)) {
		return this.bool().equals(r);
	}
	if (Utilities.instance_of(r, XNumber)) {
		return this.number().equals(r);
	}
	if (Utilities.instance_of(r, XNodeSet)) {
		return r.compareWithString(this, Operators.equals);
	}
	return new XBoolean(this.str == r.str);
};

XString.prototype.notequal = function(r) {
	if (Utilities.instance_of(r, XBoolean)) {
		return this.bool().notequal(r);
	}
	if (Utilities.instance_of(r, XNumber)) {
		return this.number().notequal(r);
	}
	if (Utilities.instance_of(r, XNodeSet)) {
		return r.compareWithString(this, Operators.notequal);
	}
	return new XBoolean(this.str != r.str);
};

XString.prototype.lessthan = function(r) {
	if (Utilities.instance_of(r, XNodeSet)) {
		return r.compareWithNumber(this.number(), Operators.greaterthanorequal);
	}
	return this.number().lessthan(r.number());
};

XString.prototype.greaterthan = function(r) {
	if (Utilities.instance_of(r, XNodeSet)) {
		return r.compareWithNumber(this.number(), Operators.lessthanorequal);
	}
	return this.number().greaterthan(r.number());
};

XString.prototype.lessthanorequal = function(r) {
	if (Utilities.instance_of(r, XNodeSet)) {
		return r.compareWithNumber(this.number(), Operators.greaterthan);
	}
	return this.number().lessthanorequal(r.number());
};

XString.prototype.greaterthanorequal = function(r) {
	if (Utilities.instance_of(r, XNodeSet)) {
		return r.compareWithNumber(this.number(), Operators.lessthan);
	}
	return this.number().greaterthanorequal(r.number());
};

// XNumber ///////////////////////////////////////////////////////////////////

XNumber.prototype = new Expression();
XNumber.prototype.constructor = XNumber;
XNumber.superclass = Expression.prototype;

function XNumber(n) {
	if (arguments.length > 0) {
		this.init(n);
	}
}

XNumber.prototype.init = function(n) {
	this.num = typeof n === "string" ? this.parse(n) : Number(n);
};

XNumber.prototype.numberFormat = /^\s*-?[0-9]*\.?[0-9]+\s*$/;

XNumber.prototype.parse = function(s) {
    // XPath representation of numbers is more restrictive than what Number() or parseFloat() allow
    return this.numberFormat.test(s) ? parseFloat(s) : Number.NaN;
};

function padSmallNumber(numberStr) {
	var parts = numberStr.split('e-');
	var base = parts[0].replace('.', '');
	var exponent = Number(parts[1]);
	
	for (var i = 0; i < exponent - 1; i += 1) {
		base = '0' + base;
	}
	
	return '0.' + base;
}

function padLargeNumber(numberStr) {
	var parts = numberStr.split('e');
	var base = parts[0].replace('.', '');
	var exponent = Number(parts[1]);
	var zerosToAppend = exponent + 1 - base.length;
	
	for (var i = 0; i < zerosToAppend; i += 1){
		base += '0';
	}
	
	return base;
}

XNumber.prototype.toString = function() {
	var strValue = this.num.toString();

	if (strValue.indexOf('e-') !== -1) {
		return padSmallNumber(strValue);
	}
    
	if (strValue.indexOf('e') !== -1) {
		return padLargeNumber(strValue);
	}
	
	return strValue;
};

XNumber.prototype.evaluate = function(c) {
	return this;
};

XNumber.prototype.string = function() {
	
	
	return new XString(this.toString());
};

XNumber.prototype.number = function() {
	return this;
};

XNumber.prototype.bool = function() {
	return new XBoolean(this.num);
};

XNumber.prototype.nodeset = function() {
	throw new Error("Cannot convert number to nodeset");
};

XNumber.prototype.stringValue = function() {
	return this.string().stringValue();
};

XNumber.prototype.numberValue = function() {
	return this.num;
};

XNumber.prototype.booleanValue = function() {
	return this.bool().booleanValue();
};

XNumber.prototype.negate = function() {
	return new XNumber(-this.num);
};

XNumber.prototype.equals = function(r) {
	if (Utilities.instance_of(r, XBoolean)) {
		return this.bool().equals(r);
	}
	if (Utilities.instance_of(r, XString)) {
		return this.equals(r.number());
	}
	if (Utilities.instance_of(r, XNodeSet)) {
		return r.compareWithNumber(this, Operators.equals);
	}
	return new XBoolean(this.num == r.num);
};

XNumber.prototype.notequal = function(r) {
	if (Utilities.instance_of(r, XBoolean)) {
		return this.bool().notequal(r);
	}
	if (Utilities.instance_of(r, XString)) {
		return this.notequal(r.number());
	}
	if (Utilities.instance_of(r, XNodeSet)) {
		return r.compareWithNumber(this, Operators.notequal);
	}
	return new XBoolean(this.num != r.num);
};

XNumber.prototype.lessthan = function(r) {
	if (Utilities.instance_of(r, XNodeSet)) {
		return r.compareWithNumber(this, Operators.greaterthanorequal);
	}
	if (Utilities.instance_of(r, XBoolean) || Utilities.instance_of(r, XString)) {
		return this.lessthan(r.number());
	}
	return new XBoolean(this.num < r.num);
};

XNumber.prototype.greaterthan = function(r) {
	if (Utilities.instance_of(r, XNodeSet)) {
		return r.compareWithNumber(this, Operators.lessthanorequal);
	}
	if (Utilities.instance_of(r, XBoolean) || Utilities.instance_of(r, XString)) {
		return this.greaterthan(r.number());
	}
	return new XBoolean(this.num > r.num);
};

XNumber.prototype.lessthanorequal = function(r) {
	if (Utilities.instance_of(r, XNodeSet)) {
		return r.compareWithNumber(this, Operators.greaterthan);
	}
	if (Utilities.instance_of(r, XBoolean) || Utilities.instance_of(r, XString)) {
		return this.lessthanorequal(r.number());
	}
	return new XBoolean(this.num <= r.num);
};

XNumber.prototype.greaterthanorequal = function(r) {
	if (Utilities.instance_of(r, XNodeSet)) {
		return r.compareWithNumber(this, Operators.lessthan);
	}
	if (Utilities.instance_of(r, XBoolean) || Utilities.instance_of(r, XString)) {
		return this.greaterthanorequal(r.number());
	}
	return new XBoolean(this.num >= r.num);
};

XNumber.prototype.plus = function(r) {
	return new XNumber(this.num + r.num);
};

XNumber.prototype.minus = function(r) {
	return new XNumber(this.num - r.num);
};

XNumber.prototype.multiply = function(r) {
	return new XNumber(this.num * r.num);
};

XNumber.prototype.div = function(r) {
	return new XNumber(this.num / r.num);
};

XNumber.prototype.mod = function(r) {
	return new XNumber(this.num % r.num);
};

// XBoolean //////////////////////////////////////////////////////////////////

XBoolean.prototype = new Expression();
XBoolean.prototype.constructor = XBoolean;
XBoolean.superclass = Expression.prototype;

function XBoolean(b) {
	if (arguments.length > 0) {
		this.init(b);
	}
}

XBoolean.prototype.init = function(b) {
	this.b = Boolean(b);
};

XBoolean.prototype.toString = function() {
	return this.b.toString();
};

XBoolean.prototype.evaluate = function(c) {
	return this;
};

XBoolean.prototype.string = function() {
	return new XString(this.b);
};

XBoolean.prototype.number = function() {
	return new XNumber(this.b);
};

XBoolean.prototype.bool = function() {
	return this;
};

XBoolean.prototype.nodeset = function() {
	throw new Error("Cannot convert boolean to nodeset");
};

XBoolean.prototype.stringValue = function() {
	return this.string().stringValue();
};

XBoolean.prototype.numberValue = function() {
	return this.num().numberValue();
};

XBoolean.prototype.booleanValue = function() {
	return this.b;
};

XBoolean.prototype.not = function() {
	return new XBoolean(!this.b);
};

XBoolean.prototype.equals = function(r) {
	if (Utilities.instance_of(r, XString) || Utilities.instance_of(r, XNumber)) {
		return this.equals(r.bool());
	}
	if (Utilities.instance_of(r, XNodeSet)) {
		return r.compareWithBoolean(this, Operators.equals);
	}
	return new XBoolean(this.b == r.b);
};

XBoolean.prototype.notequal = function(r) {
	if (Utilities.instance_of(r, XString) || Utilities.instance_of(r, XNumber)) {
		return this.notequal(r.bool());
	}
	if (Utilities.instance_of(r, XNodeSet)) {
		return r.compareWithBoolean(this, Operators.notequal);
	}
	return new XBoolean(this.b != r.b);
};

XBoolean.prototype.lessthan = function(r) {
	if (Utilities.instance_of(r, XNodeSet)) {
		return r.compareWithNumber(this.number(), Operators.greaterthanorequal);
	}
	return this.number().lessthan(r.number());
};

XBoolean.prototype.greaterthan = function(r) {
	if (Utilities.instance_of(r, XNodeSet)) {
		return r.compareWithNumber(this.number(), Operators.lessthanorequal);
	}
	return this.number().greaterthan(r.number());
};

XBoolean.prototype.lessthanorequal = function(r) {
	if (Utilities.instance_of(r, XNodeSet)) {
		return r.compareWithNumber(this.number(), Operators.greaterthan);
	}
	return this.number().lessthanorequal(r.number());
};

XBoolean.prototype.greaterthanorequal = function(r) {
	if (Utilities.instance_of(r, XNodeSet)) {
		return r.compareWithNumber(this.number(), Operators.lessthan);
	}
	return this.number().greaterthanorequal(r.number());
};

// AVLTree ///////////////////////////////////////////////////////////////////

AVLTree.prototype = new Object();
AVLTree.prototype.constructor = AVLTree;
AVLTree.superclass = Object.prototype;

function AVLTree(n) {
	this.init(n);
}

AVLTree.prototype.init = function(n) {
	this.left = null;
    this.right = null;
	this.node = n;
	this.depth = 1;
};

AVLTree.prototype.balance = function() {
    var ldepth = this.left  == null ? 0 : this.left.depth;
    var rdepth = this.right == null ? 0 : this.right.depth;

	if (ldepth > rdepth + 1) {
        // LR or LL rotation
        var lldepth = this.left.left  == null ? 0 : this.left.left.depth;
        var lrdepth = this.left.right == null ? 0 : this.left.right.depth;

        if (lldepth < lrdepth) {
            // LR rotation consists of a RR rotation of the left child
            this.left.rotateRR();
            // plus a LL rotation of this node, which happens anyway
        }
        this.rotateLL();
    } else if (ldepth + 1 < rdepth) {
        // RR or RL rorarion
		var rrdepth = this.right.right == null ? 0 : this.right.right.depth;
		var rldepth = this.right.left  == null ? 0 : this.right.left.depth;

        if (rldepth > rrdepth) {
            // RR rotation consists of a LL rotation of the right child
            this.right.rotateLL();
            // plus a RR rotation of this node, which happens anyway
        }
        this.rotateRR();
    }
};

AVLTree.prototype.rotateLL = function() {
    // the left side is too long => rotate from the left (_not_ leftwards)
    var nodeBefore = this.node;
    var rightBefore = this.right;
    this.node = this.left.node;
    this.right = this.left;
    this.left = this.left.left;
    this.right.left = this.right.right;
    this.right.right = rightBefore;
    this.right.node = nodeBefore;
    this.right.updateInNewLocation();
    this.updateInNewLocation();
};

AVLTree.prototype.rotateRR = function() {
    // the right side is too long => rotate from the right (_not_ rightwards)
    var nodeBefore = this.node;
    var leftBefore = this.left;
    this.node = this.right.node;
    this.left = this.right;
    this.right = this.right.right;
    this.left.right = this.left.left;
    this.left.left = leftBefore;
    this.left.node = nodeBefore;
    this.left.updateInNewLocation();
    this.updateInNewLocation();
};

AVLTree.prototype.updateInNewLocation = function() {
    this.getDepthFromChildren();
};

AVLTree.prototype.getDepthFromChildren = function() {
    this.depth = this.node == null ? 0 : 1;
    if (this.left != null) {
        this.depth = this.left.depth + 1;
    }
    if (this.right != null && this.depth <= this.right.depth) {
        this.depth = this.right.depth + 1;
    }
};

function nodeOrder(n1, n2) {
	if (n1 === n2) {
		return 0;
	}

	if (n1.compareDocumentPosition) {
	    var cpos = n1.compareDocumentPosition(n2);

        if (cpos & 0x01) {
            // not in the same document; return an arbitrary result (is there a better way to do this)
            return 1;
        }
        if (cpos & 0x0A) {
            // n2 precedes or contains n1
            return 1;
        }
        if (cpos & 0x14) {
            // n2 follows or is contained by n1
            return -1;
        }

	    return 0;
	}

	var d1 = 0,
	    d2 = 0;
	for (var m1 = n1; m1 != null; m1 = m1.parentNode || m1.ownerElement) {
		d1++;
	}
	for (var m2 = n2; m2 != null; m2 = m2.parentNode || m2.ownerElement) {
		d2++;
	}

    // step up to same depth
	if (d1 > d2) {
		while (d1 > d2) {
			n1 = n1.parentNode || n1.ownerElement;
			d1--;
		}
		if (n1 === n2) {
			return 1;
		}
	} else if (d2 > d1) {
		while (d2 > d1) {
			n2 = n2.parentNode || n2.ownerElement;
			d2--;
		}
		if (n1 === n2) {
			return -1;
		}
	}

    var n1Par = n1.parentNode || n1.ownerElement,
        n2Par = n2.parentNode || n2.ownerElement;

    // find common parent
	while (n1Par !== n2Par) {
		n1 = n1Par;
		n2 = n2Par;
		n1Par = n1.parentNode || n1.ownerElement;
	    n2Par = n2.parentNode || n2.ownerElement;
	}
    
    var n1isAttr = Utilities.isAttribute(n1);
    var n2isAttr = Utilities.isAttribute(n2);
    
    if (n1isAttr && !n2isAttr) {
        return -1;
    }
    if (!n1isAttr && n2isAttr) {
        return 1;
    }
    
    if(n1Par) {
	    var cn = n1isAttr ? n1Par.attributes : n1Par.childNodes,
	        len = cn.length;
        for (var i = 0; i < len; i += 1) {
            var n = cn[i];
            if (n === n1) {
                return -1;
            }
            if (n === n2) {
                return 1;
            }
        }
    }        
    
    throw new Error('Unexpected: could not determine node order');
}

AVLTree.prototype.add = function(n)  {
	if (n === this.node) {
        return false;
    }

	var o = nodeOrder(n, this.node);

    var ret = false;
    if (o == -1) {
        if (this.left == null) {
            this.left = new AVLTree(n);
            ret = true;
        } else {
            ret = this.left.add(n);
            if (ret) {
                this.balance();
            }
        }
    } else if (o == 1) {
        if (this.right == null) {
            this.right = new AVLTree(n);
            ret = true;
        } else {
            ret = this.right.add(n);
            if (ret) {
                this.balance();
            }
        }
    }

    if (ret) {
        this.getDepthFromChildren();
    }
    return ret;
};

// XNodeSet //////////////////////////////////////////////////////////////////

XNodeSet.prototype = new Expression();
XNodeSet.prototype.constructor = XNodeSet;
XNodeSet.superclass = Expression.prototype;

function XNodeSet() {
	this.init();
}

XNodeSet.prototype.init = function() {
    this.tree = null;
	this.nodes = [];
	this.size = 0;
};

XNodeSet.prototype.toString = function() {
	var p = this.first();
	if (p == null) {
		return "";
	}
	return this.stringForNode(p);
};

XNodeSet.prototype.evaluate = function(c) {
	return this;
};

XNodeSet.prototype.string = function() {
	return new XString(this.toString());
};

XNodeSet.prototype.stringValue = function() {
	return this.toString();
};

XNodeSet.prototype.number = function() {
	return new XNumber(this.string());
};

XNodeSet.prototype.numberValue = function() {
	return Number(this.string());
};

XNodeSet.prototype.bool = function() {
	return new XBoolean(this.booleanValue());
};

XNodeSet.prototype.booleanValue = function() {
	return !!this.size;
};

XNodeSet.prototype.nodeset = function() {
	return this;
};

XNodeSet.prototype.stringForNode = function(n) {
	if (n.nodeType == 9   /*Node.DOCUMENT_NODE*/ || 
        n.nodeType == 1   /*Node.ELEMENT_NODE */ || 
        n.nodeType === 11 /*Node.DOCUMENT_FRAGMENT*/) {
		return this.stringForContainerNode(n);
	}
    if (n.nodeType === 2 /* Node.ATTRIBUTE_NODE */) {
        return n.value || n.nodeValue;
    }
	if (n.isNamespaceNode) {
		return n.namespace;
	}
	return n.nodeValue;
};

XNodeSet.prototype.stringForContainerNode = function(n) {
	var s = "";
	for (var n2 = n.firstChild; n2 != null; n2 = n2.nextSibling) {
        var nt = n2.nodeType;
        //  Element,    Text,       CDATA,      Document,   Document Fragment
        if (nt === 1 || nt === 3 || nt === 4 || nt === 9 || nt === 11) {
            s += this.stringForNode(n2);
        }
	}
	return s;
};

XNodeSet.prototype.buildTree = function () {
    if (!this.tree && this.nodes.length) {
        this.tree = new AVLTree(this.nodes[0]);
        for (var i = 1; i < this.nodes.length; i += 1) {
            this.tree.add(this.nodes[i]);
        }
    }

    return this.tree;
};

XNodeSet.prototype.first = function() {
	var p = this.buildTree();
	if (p == null) {
		return null;
	}
	while (p.left != null) {
		p = p.left;
	}
	return p.node;
};

XNodeSet.prototype.add = function(n) {
    for (var i = 0; i < this.nodes.length; i += 1) {
        if (n === this.nodes[i]) {
            return;
        }
    }

    this.tree = null;
    this.nodes.push(n);
    this.size += 1;
};

XNodeSet.prototype.addArray = function(ns) {
	for (var i = 0; i < ns.length; i += 1) {
		this.add(ns[i]);
	}
};

/**
 * Returns an array of the node set's contents in document order
 */
XNodeSet.prototype.toArray = function() {
	var a = [];
	this.toArrayRec(this.buildTree(), a);
	return a;
};

XNodeSet.prototype.toArrayRec = function(t, a) {
	if (t != null) {
		this.toArrayRec(t.left, a);
		a.push(t.node);
		this.toArrayRec(t.right, a);
	}
};

/**
 * Returns an array of the node set's contents in arbitrary order
 */
XNodeSet.prototype.toUnsortedArray = function () {
    return this.nodes.slice();
};

XNodeSet.prototype.compareWithString = function(r, o) {
	var a = this.toUnsortedArray();
	for (var i = 0; i < a.length; i++) {
		var n = a[i];
		var l = new XString(this.stringForNode(n));
		var res = o(l, r);
		if (res.booleanValue()) {
			return res;
		}
	}
	return new XBoolean(false);
};

XNodeSet.prototype.compareWithNumber = function(r, o) {
	var a = this.toUnsortedArray();
	for (var i = 0; i < a.length; i++) {
		var n = a[i];
		var l = new XNumber(this.stringForNode(n));
		var res = o(l, r);
		if (res.booleanValue()) {
			return res;
		}
	}
	return new XBoolean(false);
};

XNodeSet.prototype.compareWithBoolean = function(r, o) {
	return o(this.bool(), r);
};

XNodeSet.prototype.compareWithNodeSet = function(r, o) {
	var arr = this.toUnsortedArray();
	var oInvert = function (lop, rop) { return o(rop, lop); };
	
	for (var i = 0; i < arr.length; i++) {
		var l = new XString(this.stringForNode(arr[i]));

		var res = r.compareWithString(l, oInvert);
		if (res.booleanValue()) {
			return res;
		}
	}
	
	return new XBoolean(false);
};

XNodeSet.prototype.equals = function(r) {
	if (Utilities.instance_of(r, XString)) {
		return this.compareWithString(r, Operators.equals);
	}
	if (Utilities.instance_of(r, XNumber)) {
		return this.compareWithNumber(r, Operators.equals);
	}
	if (Utilities.instance_of(r, XBoolean)) {
		return this.compareWithBoolean(r, Operators.equals);
	}
	return this.compareWithNodeSet(r, Operators.equals);
};

XNodeSet.prototype.notequal = function(r) {
	if (Utilities.instance_of(r, XString)) {
		return this.compareWithString(r, Operators.notequal);
	}
	if (Utilities.instance_of(r, XNumber)) {
		return this.compareWithNumber(r, Operators.notequal);
	}
	if (Utilities.instance_of(r, XBoolean)) {
		return this.compareWithBoolean(r, Operators.notequal);
	}
	return this.compareWithNodeSet(r, Operators.notequal);
};

XNodeSet.prototype.lessthan = function(r) {
	if (Utilities.instance_of(r, XString)) {
		return this.compareWithNumber(r.number(), Operators.lessthan);
	}
	if (Utilities.instance_of(r, XNumber)) {
		return this.compareWithNumber(r, Operators.lessthan);
	}
	if (Utilities.instance_of(r, XBoolean)) {
		return this.compareWithBoolean(r, Operators.lessthan);
	}
	return this.compareWithNodeSet(r, Operators.lessthan);
};

XNodeSet.prototype.greaterthan = function(r) {
	if (Utilities.instance_of(r, XString)) {
		return this.compareWithNumber(r.number(), Operators.greaterthan);
	}
	if (Utilities.instance_of(r, XNumber)) {
		return this.compareWithNumber(r, Operators.greaterthan);
	}
	if (Utilities.instance_of(r, XBoolean)) {
		return this.compareWithBoolean(r, Operators.greaterthan);
	}
	return this.compareWithNodeSet(r, Operators.greaterthan);
};

XNodeSet.prototype.lessthanorequal = function(r) {
	if (Utilities.instance_of(r, XString)) {
		return this.compareWithNumber(r.number(), Operators.lessthanorequal);
	}
	if (Utilities.instance_of(r, XNumber)) {
		return this.compareWithNumber(r, Operators.lessthanorequal);
	}
	if (Utilities.instance_of(r, XBoolean)) {
		return this.compareWithBoolean(r, Operators.lessthanorequal);
	}
	return this.compareWithNodeSet(r, Operators.lessthanorequal);
};

XNodeSet.prototype.greaterthanorequal = function(r) {
	if (Utilities.instance_of(r, XString)) {
		return this.compareWithNumber(r.number(), Operators.greaterthanorequal);
	}
	if (Utilities.instance_of(r, XNumber)) {
		return this.compareWithNumber(r, Operators.greaterthanorequal);
	}
	if (Utilities.instance_of(r, XBoolean)) {
		return this.compareWithBoolean(r, Operators.greaterthanorequal);
	}
	return this.compareWithNodeSet(r, Operators.greaterthanorequal);
};

XNodeSet.prototype.union = function(r) {
	var ns = new XNodeSet();
    ns.addArray(this.toUnsortedArray());
	ns.addArray(r.toUnsortedArray());
	return ns;
};

// XPathNamespace ////////////////////////////////////////////////////////////

XPathNamespace.prototype = new Object();
XPathNamespace.prototype.constructor = XPathNamespace;
XPathNamespace.superclass = Object.prototype;

function XPathNamespace(pre, ns, p) {
	this.isXPathNamespace = true;
	this.ownerDocument = p.ownerDocument;
	this.nodeName = "#namespace";
	this.prefix = pre;
	this.localName = pre;
	this.namespaceURI = ns;
	this.nodeValue = ns;
	this.ownerElement = p;
	this.nodeType = XPathNamespace.XPATH_NAMESPACE_NODE;
}

XPathNamespace.prototype.toString = function() {
	return "{ \"" + this.prefix + "\", \"" + this.namespaceURI + "\" }";
};

// Operators /////////////////////////////////////////////////////////////////

var Operators = new Object();

Operators.equals = function(l, r) {
	return l.equals(r);
};

Operators.notequal = function(l, r) {
	return l.notequal(r);
};

Operators.lessthan = function(l, r) {
	return l.lessthan(r);
};

Operators.greaterthan = function(l, r) {
	return l.greaterthan(r);
};

Operators.lessthanorequal = function(l, r) {
	return l.lessthanorequal(r);
};

Operators.greaterthanorequal = function(l, r) {
	return l.greaterthanorequal(r);
};

// XPathContext //////////////////////////////////////////////////////////////

XPathContext.prototype = new Object();
XPathContext.prototype.constructor = XPathContext;
XPathContext.superclass = Object.prototype;

function XPathContext(vr, nr, fr) {
	this.variableResolver = vr != null ? vr : new VariableResolver();
	this.namespaceResolver = nr != null ? nr : new NamespaceResolver();
	this.functionResolver = fr != null ? fr : new FunctionResolver();
}

// VariableResolver //////////////////////////////////////////////////////////

VariableResolver.prototype = new Object();
VariableResolver.prototype.constructor = VariableResolver;
VariableResolver.superclass = Object.prototype;

function VariableResolver() {
}

VariableResolver.prototype.getVariable = function(ln, ns) {
	return null;
};

// FunctionResolver //////////////////////////////////////////////////////////

FunctionResolver.prototype = new Object();
FunctionResolver.prototype.constructor = FunctionResolver;
FunctionResolver.superclass = Object.prototype;

function FunctionResolver(thisArg) {
	this.thisArg = thisArg != null ? thisArg : Functions;
	this.functions = new Object();
	this.addStandardFunctions();
}

FunctionResolver.prototype.addStandardFunctions = function() {
	this.functions["{}last"] = Functions.last;
	this.functions["{}position"] = Functions.position;
	this.functions["{}count"] = Functions.count;
	this.functions["{}id"] = Functions.id;
	this.functions["{}local-name"] = Functions.localName;
	this.functions["{}namespace-uri"] = Functions.namespaceURI;
	this.functions["{}name"] = Functions.name;
	this.functions["{}string"] = Functions.string;
	this.functions["{}concat"] = Functions.concat;
	this.functions["{}starts-with"] = Functions.startsWith;
	this.functions["{}contains"] = Functions.contains;
	this.functions["{}substring-before"] = Functions.substringBefore;
	this.functions["{}substring-after"] = Functions.substringAfter;
	this.functions["{}substring"] = Functions.substring;
	this.functions["{}string-length"] = Functions.stringLength;
	this.functions["{}normalize-space"] = Functions.normalizeSpace;
	this.functions["{}translate"] = Functions.translate;
	this.functions["{}boolean"] = Functions.boolean_;
	this.functions["{}not"] = Functions.not;
	this.functions["{}true"] = Functions.true_;
	this.functions["{}false"] = Functions.false_;
	this.functions["{}lang"] = Functions.lang;
	this.functions["{}number"] = Functions.number;
	this.functions["{}sum"] = Functions.sum;
	this.functions["{}floor"] = Functions.floor;
	this.functions["{}ceiling"] = Functions.ceiling;
	this.functions["{}round"] = Functions.round;
};

FunctionResolver.prototype.addFunction = function(ns, ln, f) {
	this.functions["{" + ns + "}" + ln] = f;
};

FunctionResolver.getFunctionFromContext = function(qName, context) {
    var parts = Utilities.resolveQName(qName, context.namespaceResolver, context.contextNode, false);

    if (parts[0] === null) {
        throw new Error("Cannot resolve QName " + name);
    }

    return context.functionResolver.getFunction(parts[1], parts[0]);
};

FunctionResolver.prototype.getFunction = function(localName, namespace) {
	return this.functions["{" + namespace + "}" + localName];
};

// NamespaceResolver /////////////////////////////////////////////////////////

NamespaceResolver.prototype = new Object();
NamespaceResolver.prototype.constructor = NamespaceResolver;
NamespaceResolver.superclass = Object.prototype;

function NamespaceResolver() {
}

NamespaceResolver.prototype.getNamespace = function(prefix, n) {
	if (prefix == "xml") {
		return XPath.XML_NAMESPACE_URI;
	} else if (prefix == "xmlns") {
		return XPath.XMLNS_NAMESPACE_URI;
	}
	if (n.nodeType == 9 /*Node.DOCUMENT_NODE*/) {
		n = n.documentElement;
	} else if (n.nodeType == 2 /*Node.ATTRIBUTE_NODE*/) {
		n = PathExpr.prototype.getOwnerElement(n);
	} else if (n.nodeType != 1 /*Node.ELEMENT_NODE*/) {
		n = n.parentNode;
	}
	while (n != null && n.nodeType == 1 /*Node.ELEMENT_NODE*/) {
		var nnm = n.attributes;
		for (var i = 0; i < nnm.length; i++) {
			var a = nnm.item(i);
			var aname = a.name || a.nodeName;
			if ((aname === "xmlns" && prefix === "")
					|| aname === "xmlns:" + prefix) {
				return String(a.value || a.nodeValue);
			}
		}
		n = n.parentNode;
	}
	return null;
};

// Functions /////////////////////////////////////////////////////////////////

var Functions = new Object();

Functions.last = function() {
	var c = arguments[0];
	if (arguments.length != 1) {
		throw new Error("Function last expects ()");
	}
	return new XNumber(c.contextSize);
};

Functions.position = function() {
	var c = arguments[0];
	if (arguments.length != 1) {
		throw new Error("Function position expects ()");
	}
	return new XNumber(c.contextPosition);
};

Functions.count = function() {
	var c = arguments[0];
	var ns;
	if (arguments.length != 2 || !Utilities.instance_of(ns = arguments[1].evaluate(c), XNodeSet)) {
		throw new Error("Function count expects (node-set)");
	}
	return new XNumber(ns.size);
};

Functions.id = function() {
	var c = arguments[0];
	var id;
	if (arguments.length != 2) {
		throw new Error("Function id expects (object)");
	}
	id = arguments[1].evaluate(c);
	if (Utilities.instance_of(id, XNodeSet)) {
		id = id.toArray().join(" ");
	} else {
		id = id.stringValue();
	}
	var ids = id.split(/[\x0d\x0a\x09\x20]+/);
	var count = 0;
	var ns = new XNodeSet();
	var doc = c.contextNode.nodeType == 9 /*Node.DOCUMENT_NODE*/
			? c.contextNode
			: c.contextNode.ownerDocument;
	for (var i = 0; i < ids.length; i++) {
		var n;
		if (doc.getElementById) {
			n = doc.getElementById(ids[i]);
		} else {
			n = Utilities.getElementById(doc, ids[i]);
		}
		if (n != null) {
			ns.add(n);
			count++;
		}
	}
	return ns;
};

Functions.localName = function() {
	var c = arguments[0];
	var n;
	if (arguments.length == 1) {
		n = c.contextNode;
	} else if (arguments.length == 2) {
		n = arguments[1].evaluate(c).first();
	} else {
		throw new Error("Function local-name expects (node-set?)");
	}
	if (n == null) {
		return new XString("");
	}

	return new XString(n.localName ||     //  standard elements and attributes
	                   n.baseName  ||     //  IE
					   n.target    ||     //  processing instructions
                       n.nodeName  ||     //  DOM1 elements
					   "");               //  fallback
};

Functions.namespaceURI = function() {
	var c = arguments[0];
	var n;
	if (arguments.length == 1) {
		n = c.contextNode;
	} else if (arguments.length == 2) {
		n = arguments[1].evaluate(c).first();
	} else {
		throw new Error("Function namespace-uri expects (node-set?)");
	}
	if (n == null) {
		return new XString("");
	}
	return new XString(n.namespaceURI);
};

Functions.name = function() {
	var c = arguments[0];
	var n;
	if (arguments.length == 1) {
		n = c.contextNode;
	} else if (arguments.length == 2) {
		n = arguments[1].evaluate(c).first();
	} else {
		throw new Error("Function name expects (node-set?)");
	}
	if (n == null) {
		return new XString("");
	}
	if (n.nodeType == 1 /*Node.ELEMENT_NODE*/) {
		return new XString(n.nodeName);
	} else if (n.nodeType == 2 /*Node.ATTRIBUTE_NODE*/) {
		return new XString(n.name || n.nodeName);
	} else if (n.nodeType === 7 /*Node.PROCESSING_INSTRUCTION_NODE*/) {
	    return new XString(n.target || n.nodeName);
	} else if (n.localName == null) {
		return new XString("");
	} else {
		return new XString(n.localName);
	}
};

Functions.string = function() {
	var c = arguments[0];
	if (arguments.length == 1) {
		return new XString(XNodeSet.prototype.stringForNode(c.contextNode));
	} else if (arguments.length == 2) {
		return arguments[1].evaluate(c).string();
	}
	throw new Error("Function string expects (object?)");
};

Functions.concat = function() {
	var c = arguments[0];
	if (arguments.length < 3) {
		throw new Error("Function concat expects (string, string, string*)");
	}
	var s = "";
	for (var i = 1; i < arguments.length; i++) {
		s += arguments[i].evaluate(c).stringValue();
	}
	return new XString(s);
};

Functions.startsWith = function() {
	var c = arguments[0];
	if (arguments.length != 3) {
		throw new Error("Function startsWith expects (string, string)");
	}
	var s1 = arguments[1].evaluate(c).stringValue();
	var s2 = arguments[2].evaluate(c).stringValue();
	return new XBoolean(s1.substring(0, s2.length) == s2);
};

Functions.contains = function() {
	var c = arguments[0];
	if (arguments.length != 3) {
		throw new Error("Function contains expects (string, string)");
	}
	var s1 = arguments[1].evaluate(c).stringValue();
	var s2 = arguments[2].evaluate(c).stringValue();
	return new XBoolean(s1.indexOf(s2) !== -1);
};

Functions.substringBefore = function() {
	var c = arguments[0];
	if (arguments.length != 3) {
		throw new Error("Function substring-before expects (string, string)");
	}
	var s1 = arguments[1].evaluate(c).stringValue();
	var s2 = arguments[2].evaluate(c).stringValue();
	return new XString(s1.substring(0, s1.indexOf(s2)));
};

Functions.substringAfter = function() {
	var c = arguments[0];
	if (arguments.length != 3) {
		throw new Error("Function substring-after expects (string, string)");
	}
	var s1 = arguments[1].evaluate(c).stringValue();
	var s2 = arguments[2].evaluate(c).stringValue();
	if (s2.length == 0) {
		return new XString(s1);
	}
	var i = s1.indexOf(s2);
	if (i == -1) {
		return new XString("");
	}
	return new XString(s1.substring(i + s2.length));
};

Functions.substring = function() {
	var c = arguments[0];
	if (!(arguments.length == 3 || arguments.length == 4)) {
		throw new Error("Function substring expects (string, number, number?)");
	}
	var s = arguments[1].evaluate(c).stringValue();
	var n1 = Math.round(arguments[2].evaluate(c).numberValue()) - 1;
	var n2 = arguments.length == 4 ? n1 + Math.round(arguments[3].evaluate(c).numberValue()) : undefined;
	return new XString(s.substring(n1, n2));
};

Functions.stringLength = function() {
	var c = arguments[0];
	var s;
	if (arguments.length == 1) {
		s = XNodeSet.prototype.stringForNode(c.contextNode);
	} else if (arguments.length == 2) {
		s = arguments[1].evaluate(c).stringValue();
	} else {
		throw new Error("Function string-length expects (string?)");
	}
	return new XNumber(s.length);
};

Functions.normalizeSpace = function() {
	var c = arguments[0];
	var s;
	if (arguments.length == 1) {
		s = XNodeSet.prototype.stringForNode(c.contextNode);
	} else if (arguments.length == 2) {
		s = arguments[1].evaluate(c).stringValue();
	} else {
		throw new Error("Function normalize-space expects (string?)");
	}
	var i = 0;
	var j = s.length - 1;
	while (Utilities.isSpace(s.charCodeAt(j))) {
		j--;
	}
	var t = "";
	while (i <= j && Utilities.isSpace(s.charCodeAt(i))) {
		i++;
	}
	while (i <= j) {
		if (Utilities.isSpace(s.charCodeAt(i))) {
			t += " ";
			while (i <= j && Utilities.isSpace(s.charCodeAt(i))) {
				i++;
			}
		} else {
			t += s.charAt(i);
			i++;
		}
	}
	return new XString(t);
};

Functions.translate = function() {
	var c = arguments[0];
	if (arguments.length != 4) {
		throw new Error("Function translate expects (string, string, string)");
	}
	var s1 = arguments[1].evaluate(c).stringValue();
	var s2 = arguments[2].evaluate(c).stringValue();
	var s3 = arguments[3].evaluate(c).stringValue();
	var map = [];
	for (var i = 0; i < s2.length; i++) {
		var j = s2.charCodeAt(i);
		if (map[j] == undefined) {
			var k = i > s3.length ? "" : s3.charAt(i);
			map[j] = k;
		}
	}
	var t = "";
	for (var i = 0; i < s1.length; i++) {
		var c = s1.charCodeAt(i);
		var r = map[c];
		if (r == undefined) {
			t += s1.charAt(i);
		} else {
			t += r;
		}
	}
	return new XString(t);
};

Functions.boolean_ = function() {
	var c = arguments[0];
	if (arguments.length != 2) {
		throw new Error("Function boolean expects (object)");
	}
	return arguments[1].evaluate(c).bool();
};

Functions.not = function() {
	var c = arguments[0];
	if (arguments.length != 2) {
		throw new Error("Function not expects (object)");
	}
	return arguments[1].evaluate(c).bool().not();
};

Functions.true_ = function() {
	if (arguments.length != 1) {
		throw new Error("Function true expects ()");
	}
	return new XBoolean(true);
};

Functions.false_ = function() {
	if (arguments.length != 1) {
		throw new Error("Function false expects ()");
	}
	return new XBoolean(false);
};

Functions.lang = function() {
	var c = arguments[0];
	if (arguments.length != 2) {
		throw new Error("Function lang expects (string)");
	}
	var lang;
	for (var n = c.contextNode; n != null && n.nodeType != 9 /*Node.DOCUMENT_NODE*/; n = n.parentNode) {
		var a = n.getAttributeNS(XPath.XML_NAMESPACE_URI, "lang");
		if (a != null) {
			lang = String(a);
			break;
		}
	}
	if (lang == null) {
		return new XBoolean(false);
	}
	var s = arguments[1].evaluate(c).stringValue();
	return new XBoolean(lang.substring(0, s.length) == s
				&& (lang.length == s.length || lang.charAt(s.length) == '-'));
};

Functions.number = function() {
	var c = arguments[0];
	if (!(arguments.length == 1 || arguments.length == 2)) {
		throw new Error("Function number expects (object?)");
	}
	if (arguments.length == 1) {
		return new XNumber(XNodeSet.prototype.stringForNode(c.contextNode));
	}
	return arguments[1].evaluate(c).number();
};

Functions.sum = function() {
	var c = arguments[0];
	var ns;
	if (arguments.length != 2 || !Utilities.instance_of((ns = arguments[1].evaluate(c)), XNodeSet)) {
		throw new Error("Function sum expects (node-set)");
	}
	ns = ns.toUnsortedArray();
	var n = 0;
	for (var i = 0; i < ns.length; i++) {
		n += new XNumber(XNodeSet.prototype.stringForNode(ns[i])).numberValue();
	}
	return new XNumber(n);
};

Functions.floor = function() {
	var c = arguments[0];
	if (arguments.length != 2) {
		throw new Error("Function floor expects (number)");
	}
	return new XNumber(Math.floor(arguments[1].evaluate(c).numberValue()));
};

Functions.ceiling = function() {
	var c = arguments[0];
	if (arguments.length != 2) {
		throw new Error("Function ceiling expects (number)");
	}
	return new XNumber(Math.ceil(arguments[1].evaluate(c).numberValue()));
};

Functions.round = function() {
	var c = arguments[0];
	if (arguments.length != 2) {
		throw new Error("Function round expects (number)");
	}
	return new XNumber(Math.round(arguments[1].evaluate(c).numberValue()));
};

// Utilities /////////////////////////////////////////////////////////////////

var Utilities = new Object();

Utilities.isAttribute = function (val) {
    return val && (val.nodeType === 2 || val.ownerElement);
}

Utilities.splitQName = function(qn) {
	var i = qn.indexOf(":");
	if (i == -1) {
		return [ null, qn ];
	}
	return [ qn.substring(0, i), qn.substring(i + 1) ];
};

Utilities.resolveQName = function(qn, nr, n, useDefault) {
	var parts = Utilities.splitQName(qn);
	if (parts[0] != null) {
		parts[0] = nr.getNamespace(parts[0], n);
	} else {
		if (useDefault) {
			parts[0] = nr.getNamespace("", n);
			if (parts[0] == null) {
				parts[0] = "";
			}
		} else {
			parts[0] = "";
		}
	}
	return parts;
};

Utilities.isSpace = function(c) {
	return c == 0x9 || c == 0xd || c == 0xa || c == 0x20;
};

Utilities.isLetter = function(c) {
	return c >= 0x0041 && c <= 0x005A ||
		c >= 0x0061 && c <= 0x007A ||
		c >= 0x00C0 && c <= 0x00D6 ||
		c >= 0x00D8 && c <= 0x00F6 ||
		c >= 0x00F8 && c <= 0x00FF ||
		c >= 0x0100 && c <= 0x0131 ||
		c >= 0x0134 && c <= 0x013E ||
		c >= 0x0141 && c <= 0x0148 ||
		c >= 0x014A && c <= 0x017E ||
		c >= 0x0180 && c <= 0x01C3 ||
		c >= 0x01CD && c <= 0x01F0 ||
		c >= 0x01F4 && c <= 0x01F5 ||
		c >= 0x01FA && c <= 0x0217 ||
		c >= 0x0250 && c <= 0x02A8 ||
		c >= 0x02BB && c <= 0x02C1 ||
		c == 0x0386 ||
		c >= 0x0388 && c <= 0x038A ||
		c == 0x038C ||
		c >= 0x038E && c <= 0x03A1 ||
		c >= 0x03A3 && c <= 0x03CE ||
		c >= 0x03D0 && c <= 0x03D6 ||
		c == 0x03DA ||
		c == 0x03DC ||
		c == 0x03DE ||
		c == 0x03E0 ||
		c >= 0x03E2 && c <= 0x03F3 ||
		c >= 0x0401 && c <= 0x040C ||
		c >= 0x040E && c <= 0x044F ||
		c >= 0x0451 && c <= 0x045C ||
		c >= 0x045E && c <= 0x0481 ||
		c >= 0x0490 && c <= 0x04C4 ||
		c >= 0x04C7 && c <= 0x04C8 ||
		c >= 0x04CB && c <= 0x04CC ||
		c >= 0x04D0 && c <= 0x04EB ||
		c >= 0x04EE && c <= 0x04F5 ||
		c >= 0x04F8 && c <= 0x04F9 ||
		c >= 0x0531 && c <= 0x0556 ||
		c == 0x0559 ||
		c >= 0x0561 && c <= 0x0586 ||
		c >= 0x05D0 && c <= 0x05EA ||
		c >= 0x05F0 && c <= 0x05F2 ||
		c >= 0x0621 && c <= 0x063A ||
		c >= 0x0641 && c <= 0x064A ||
		c >= 0x0671 && c <= 0x06B7 ||
		c >= 0x06BA && c <= 0x06BE ||
		c >= 0x06C0 && c <= 0x06CE ||
		c >= 0x06D0 && c <= 0x06D3 ||
		c == 0x06D5 ||
		c >= 0x06E5 && c <= 0x06E6 ||
		c >= 0x0905 && c <= 0x0939 ||
		c == 0x093D ||
		c >= 0x0958 && c <= 0x0961 ||
		c >= 0x0985 && c <= 0x098C ||
		c >= 0x098F && c <= 0x0990 ||
		c >= 0x0993 && c <= 0x09A8 ||
		c >= 0x09AA && c <= 0x09B0 ||
		c == 0x09B2 ||
		c >= 0x09B6 && c <= 0x09B9 ||
		c >= 0x09DC && c <= 0x09DD ||
		c >= 0x09DF && c <= 0x09E1 ||
		c >= 0x09F0 && c <= 0x09F1 ||
		c >= 0x0A05 && c <= 0x0A0A ||
		c >= 0x0A0F && c <= 0x0A10 ||
		c >= 0x0A13 && c <= 0x0A28 ||
		c >= 0x0A2A && c <= 0x0A30 ||
		c >= 0x0A32 && c <= 0x0A33 ||
		c >= 0x0A35 && c <= 0x0A36 ||
		c >= 0x0A38 && c <= 0x0A39 ||
		c >= 0x0A59 && c <= 0x0A5C ||
		c == 0x0A5E ||
		c >= 0x0A72 && c <= 0x0A74 ||
		c >= 0x0A85 && c <= 0x0A8B ||
		c == 0x0A8D ||
		c >= 0x0A8F && c <= 0x0A91 ||
		c >= 0x0A93 && c <= 0x0AA8 ||
		c >= 0x0AAA && c <= 0x0AB0 ||
		c >= 0x0AB2 && c <= 0x0AB3 ||
		c >= 0x0AB5 && c <= 0x0AB9 ||
		c == 0x0ABD ||
		c == 0x0AE0 ||
		c >= 0x0B05 && c <= 0x0B0C ||
		c >= 0x0B0F && c <= 0x0B10 ||
		c >= 0x0B13 && c <= 0x0B28 ||
		c >= 0x0B2A && c <= 0x0B30 ||
		c >= 0x0B32 && c <= 0x0B33 ||
		c >= 0x0B36 && c <= 0x0B39 ||
		c == 0x0B3D ||
		c >= 0x0B5C && c <= 0x0B5D ||
		c >= 0x0B5F && c <= 0x0B61 ||
		c >= 0x0B85 && c <= 0x0B8A ||
		c >= 0x0B8E && c <= 0x0B90 ||
		c >= 0x0B92 && c <= 0x0B95 ||
		c >= 0x0B99 && c <= 0x0B9A ||
		c == 0x0B9C ||
		c >= 0x0B9E && c <= 0x0B9F ||
		c >= 0x0BA3 && c <= 0x0BA4 ||
		c >= 0x0BA8 && c <= 0x0BAA ||
		c >= 0x0BAE && c <= 0x0BB5 ||
		c >= 0x0BB7 && c <= 0x0BB9 ||
		c >= 0x0C05 && c <= 0x0C0C ||
		c >= 0x0C0E && c <= 0x0C10 ||
		c >= 0x0C12 && c <= 0x0C28 ||
		c >= 0x0C2A && c <= 0x0C33 ||
		c >= 0x0C35 && c <= 0x0C39 ||
		c >= 0x0C60 && c <= 0x0C61 ||
		c >= 0x0C85 && c <= 0x0C8C ||
		c >= 0x0C8E && c <= 0x0C90 ||
		c >= 0x0C92 && c <= 0x0CA8 ||
		c >= 0x0CAA && c <= 0x0CB3 ||
		c >= 0x0CB5 && c <= 0x0CB9 ||
		c == 0x0CDE ||
		c >= 0x0CE0 && c <= 0x0CE1 ||
		c >= 0x0D05 && c <= 0x0D0C ||
		c >= 0x0D0E && c <= 0x0D10 ||
		c >= 0x0D12 && c <= 0x0D28 ||
		c >= 0x0D2A && c <= 0x0D39 ||
		c >= 0x0D60 && c <= 0x0D61 ||
		c >= 0x0E01 && c <= 0x0E2E ||
		c == 0x0E30 ||
		c >= 0x0E32 && c <= 0x0E33 ||
		c >= 0x0E40 && c <= 0x0E45 ||
		c >= 0x0E81 && c <= 0x0E82 ||
		c == 0x0E84 ||
		c >= 0x0E87 && c <= 0x0E88 ||
		c == 0x0E8A ||
		c == 0x0E8D ||
		c >= 0x0E94 && c <= 0x0E97 ||
		c >= 0x0E99 && c <= 0x0E9F ||
		c >= 0x0EA1 && c <= 0x0EA3 ||
		c == 0x0EA5 ||
		c == 0x0EA7 ||
		c >= 0x0EAA && c <= 0x0EAB ||
		c >= 0x0EAD && c <= 0x0EAE ||
		c == 0x0EB0 ||
		c >= 0x0EB2 && c <= 0x0EB3 ||
		c == 0x0EBD ||
		c >= 0x0EC0 && c <= 0x0EC4 ||
		c >= 0x0F40 && c <= 0x0F47 ||
		c >= 0x0F49 && c <= 0x0F69 ||
		c >= 0x10A0 && c <= 0x10C5 ||
		c >= 0x10D0 && c <= 0x10F6 ||
		c == 0x1100 ||
		c >= 0x1102 && c <= 0x1103 ||
		c >= 0x1105 && c <= 0x1107 ||
		c == 0x1109 ||
		c >= 0x110B && c <= 0x110C ||
		c >= 0x110E && c <= 0x1112 ||
		c == 0x113C ||
		c == 0x113E ||
		c == 0x1140 ||
		c == 0x114C ||
		c == 0x114E ||
		c == 0x1150 ||
		c >= 0x1154 && c <= 0x1155 ||
		c == 0x1159 ||
		c >= 0x115F && c <= 0x1161 ||
		c == 0x1163 ||
		c == 0x1165 ||
		c == 0x1167 ||
		c == 0x1169 ||
		c >= 0x116D && c <= 0x116E ||
		c >= 0x1172 && c <= 0x1173 ||
		c == 0x1175 ||
		c == 0x119E ||
		c == 0x11A8 ||
		c == 0x11AB ||
		c >= 0x11AE && c <= 0x11AF ||
		c >= 0x11B7 && c <= 0x11B8 ||
		c == 0x11BA ||
		c >= 0x11BC && c <= 0x11C2 ||
		c == 0x11EB ||
		c == 0x11F0 ||
		c == 0x11F9 ||
		c >= 0x1E00 && c <= 0x1E9B ||
		c >= 0x1EA0 && c <= 0x1EF9 ||
		c >= 0x1F00 && c <= 0x1F15 ||
		c >= 0x1F18 && c <= 0x1F1D ||
		c >= 0x1F20 && c <= 0x1F45 ||
		c >= 0x1F48 && c <= 0x1F4D ||
		c >= 0x1F50 && c <= 0x1F57 ||
		c == 0x1F59 ||
		c == 0x1F5B ||
		c == 0x1F5D ||
		c >= 0x1F5F && c <= 0x1F7D ||
		c >= 0x1F80 && c <= 0x1FB4 ||
		c >= 0x1FB6 && c <= 0x1FBC ||
		c == 0x1FBE ||
		c >= 0x1FC2 && c <= 0x1FC4 ||
		c >= 0x1FC6 && c <= 0x1FCC ||
		c >= 0x1FD0 && c <= 0x1FD3 ||
		c >= 0x1FD6 && c <= 0x1FDB ||
		c >= 0x1FE0 && c <= 0x1FEC ||
		c >= 0x1FF2 && c <= 0x1FF4 ||
		c >= 0x1FF6 && c <= 0x1FFC ||
		c == 0x2126 ||
		c >= 0x212A && c <= 0x212B ||
		c == 0x212E ||
		c >= 0x2180 && c <= 0x2182 ||
		c >= 0x3041 && c <= 0x3094 ||
		c >= 0x30A1 && c <= 0x30FA ||
		c >= 0x3105 && c <= 0x312C ||
		c >= 0xAC00 && c <= 0xD7A3 ||
		c >= 0x4E00 && c <= 0x9FA5 ||
		c == 0x3007 ||
		c >= 0x3021 && c <= 0x3029;
};

Utilities.isNCNameChar = function(c) {
	return c >= 0x0030 && c <= 0x0039
		|| c >= 0x0660 && c <= 0x0669
		|| c >= 0x06F0 && c <= 0x06F9
		|| c >= 0x0966 && c <= 0x096F
		|| c >= 0x09E6 && c <= 0x09EF
		|| c >= 0x0A66 && c <= 0x0A6F
		|| c >= 0x0AE6 && c <= 0x0AEF
		|| c >= 0x0B66 && c <= 0x0B6F
		|| c >= 0x0BE7 && c <= 0x0BEF
		|| c >= 0x0C66 && c <= 0x0C6F
		|| c >= 0x0CE6 && c <= 0x0CEF
		|| c >= 0x0D66 && c <= 0x0D6F
		|| c >= 0x0E50 && c <= 0x0E59
		|| c >= 0x0ED0 && c <= 0x0ED9
		|| c >= 0x0F20 && c <= 0x0F29
		|| c == 0x002E
		|| c == 0x002D
		|| c == 0x005F
		|| Utilities.isLetter(c)
		|| c >= 0x0300 && c <= 0x0345
		|| c >= 0x0360 && c <= 0x0361
		|| c >= 0x0483 && c <= 0x0486
		|| c >= 0x0591 && c <= 0x05A1
		|| c >= 0x05A3 && c <= 0x05B9
		|| c >= 0x05BB && c <= 0x05BD
		|| c == 0x05BF
		|| c >= 0x05C1 && c <= 0x05C2
		|| c == 0x05C4
		|| c >= 0x064B && c <= 0x0652
		|| c == 0x0670
		|| c >= 0x06D6 && c <= 0x06DC
		|| c >= 0x06DD && c <= 0x06DF
		|| c >= 0x06E0 && c <= 0x06E4
		|| c >= 0x06E7 && c <= 0x06E8
		|| c >= 0x06EA && c <= 0x06ED
		|| c >= 0x0901 && c <= 0x0903
		|| c == 0x093C
		|| c >= 0x093E && c <= 0x094C
		|| c == 0x094D
		|| c >= 0x0951 && c <= 0x0954
		|| c >= 0x0962 && c <= 0x0963
		|| c >= 0x0981 && c <= 0x0983
		|| c == 0x09BC
		|| c == 0x09BE
		|| c == 0x09BF
		|| c >= 0x09C0 && c <= 0x09C4
		|| c >= 0x09C7 && c <= 0x09C8
		|| c >= 0x09CB && c <= 0x09CD
		|| c == 0x09D7
		|| c >= 0x09E2 && c <= 0x09E3
		|| c == 0x0A02
		|| c == 0x0A3C
		|| c == 0x0A3E
		|| c == 0x0A3F
		|| c >= 0x0A40 && c <= 0x0A42
		|| c >= 0x0A47 && c <= 0x0A48
		|| c >= 0x0A4B && c <= 0x0A4D
		|| c >= 0x0A70 && c <= 0x0A71
		|| c >= 0x0A81 && c <= 0x0A83
		|| c == 0x0ABC
		|| c >= 0x0ABE && c <= 0x0AC5
		|| c >= 0x0AC7 && c <= 0x0AC9
		|| c >= 0x0ACB && c <= 0x0ACD
		|| c >= 0x0B01 && c <= 0x0B03
		|| c == 0x0B3C
		|| c >= 0x0B3E && c <= 0x0B43
		|| c >= 0x0B47 && c <= 0x0B48
		|| c >= 0x0B4B && c <= 0x0B4D
		|| c >= 0x0B56 && c <= 0x0B57
		|| c >= 0x0B82 && c <= 0x0B83
		|| c >= 0x0BBE && c <= 0x0BC2
		|| c >= 0x0BC6 && c <= 0x0BC8
		|| c >= 0x0BCA && c <= 0x0BCD
		|| c == 0x0BD7
		|| c >= 0x0C01 && c <= 0x0C03
		|| c >= 0x0C3E && c <= 0x0C44
		|| c >= 0x0C46 && c <= 0x0C48
		|| c >= 0x0C4A && c <= 0x0C4D
		|| c >= 0x0C55 && c <= 0x0C56
		|| c >= 0x0C82 && c <= 0x0C83
		|| c >= 0x0CBE && c <= 0x0CC4
		|| c >= 0x0CC6 && c <= 0x0CC8
		|| c >= 0x0CCA && c <= 0x0CCD
		|| c >= 0x0CD5 && c <= 0x0CD6
		|| c >= 0x0D02 && c <= 0x0D03
		|| c >= 0x0D3E && c <= 0x0D43
		|| c >= 0x0D46 && c <= 0x0D48
		|| c >= 0x0D4A && c <= 0x0D4D
		|| c == 0x0D57
		|| c == 0x0E31
		|| c >= 0x0E34 && c <= 0x0E3A
		|| c >= 0x0E47 && c <= 0x0E4E
		|| c == 0x0EB1
		|| c >= 0x0EB4 && c <= 0x0EB9
		|| c >= 0x0EBB && c <= 0x0EBC
		|| c >= 0x0EC8 && c <= 0x0ECD
		|| c >= 0x0F18 && c <= 0x0F19
		|| c == 0x0F35
		|| c == 0x0F37
		|| c == 0x0F39
		|| c == 0x0F3E
		|| c == 0x0F3F
		|| c >= 0x0F71 && c <= 0x0F84
		|| c >= 0x0F86 && c <= 0x0F8B
		|| c >= 0x0F90 && c <= 0x0F95
		|| c == 0x0F97
		|| c >= 0x0F99 && c <= 0x0FAD
		|| c >= 0x0FB1 && c <= 0x0FB7
		|| c == 0x0FB9
		|| c >= 0x20D0 && c <= 0x20DC
		|| c == 0x20E1
		|| c >= 0x302A && c <= 0x302F
		|| c == 0x3099
		|| c == 0x309A
		|| c == 0x00B7
		|| c == 0x02D0
		|| c == 0x02D1
		|| c == 0x0387
		|| c == 0x0640
		|| c == 0x0E46
		|| c == 0x0EC6
		|| c == 0x3005
		|| c >= 0x3031 && c <= 0x3035
		|| c >= 0x309D && c <= 0x309E
		|| c >= 0x30FC && c <= 0x30FE;
};

Utilities.coalesceText = function(n) {
	for (var m = n.firstChild; m != null; m = m.nextSibling) {
		if (m.nodeType == 3 /*Node.TEXT_NODE*/ || m.nodeType == 4 /*Node.CDATA_SECTION_NODE*/) {
			var s = m.nodeValue;
			var first = m;
			m = m.nextSibling;
			while (m != null && (m.nodeType == 3 /*Node.TEXT_NODE*/ || m.nodeType == 4 /*Node.CDATA_SECTION_NODE*/)) {
				s += m.nodeValue;
				var del = m;
				m = m.nextSibling;
				del.parentNode.removeChild(del);
			}
			if (first.nodeType == 4 /*Node.CDATA_SECTION_NODE*/) {
				var p = first.parentNode;
				if (first.nextSibling == null) {
					p.removeChild(first);
					p.appendChild(p.ownerDocument.createTextNode(s));
				} else {
					var next = first.nextSibling;
					p.removeChild(first);
					p.insertBefore(p.ownerDocument.createTextNode(s), next);
				}
			} else {
				first.nodeValue = s;
			}
			if (m == null) {
				break;
			}
		} else if (m.nodeType == 1 /*Node.ELEMENT_NODE*/) {
			Utilities.coalesceText(m);
		}
	}
};

Utilities.instance_of = function(o, c) {
	while (o != null) {
		if (o.constructor === c) {
			return true;
		}
		if (o === Object) {
			return false;
		}
		o = o.constructor.superclass;
	}
	return false;
};

Utilities.getElementById = function(n, id) {
	// Note that this does not check the DTD to check for actual
	// attributes of type ID, so this may be a bit wrong.
	if (n.nodeType == 1 /*Node.ELEMENT_NODE*/) {
		if (n.getAttribute("id") == id
				|| n.getAttributeNS(null, "id") == id) {
			return n;
		}
	}
	for (var m = n.firstChild; m != null; m = m.nextSibling) {
		var res = Utilities.getElementById(m, id);
		if (res != null) {
			return res;
		}
	}
	return null;
};

// XPathException ////////////////////////////////////////////////////////////

var XPathException = (function () {
    function getMessage(code, exception) {
        var msg = exception ? ": " + exception.toString() : "";
        switch (code) {
            case XPathException.INVALID_EXPRESSION_ERR:
                return "Invalid expression" + msg;
            case XPathException.TYPE_ERR:
                return "Type error" + msg;
        }
        return null;
    }

    function XPathException(code, error, message) {
        var err = Error.call(this, getMessage(code, error) || message);

        err.code = code;
        err.exception = error;

        return err;
    }

    XPathException.prototype = Object.create(Error.prototype);
    XPathException.prototype.constructor = XPathException;
    XPathException.superclass = Error;

    XPathException.prototype.toString = function() {
        return this.message;
    };

    XPathException.fromMessage = function(message, error) {
        return new XPathException(null, error, message);
    };

    XPathException.INVALID_EXPRESSION_ERR = 51;
    XPathException.TYPE_ERR = 52;

    return XPathException;
})();

// XPathExpression ///////////////////////////////////////////////////////////

XPathExpression.prototype = {};
XPathExpression.prototype.constructor = XPathExpression;
XPathExpression.superclass = Object.prototype;

function XPathExpression(e, r, p) {
	this.xpath = p.parse(e);
	this.context = new XPathContext();
	this.context.namespaceResolver = new XPathNSResolverWrapper(r);
}

XPathExpression.prototype.evaluate = function(n, t, res) {
	this.context.expressionContextNode = n;
	var result = this.xpath.evaluate(this.context);
	return new XPathResult(result, t);
}

// XPathNSResolverWrapper ////////////////////////////////////////////////////

XPathNSResolverWrapper.prototype = {};
XPathNSResolverWrapper.prototype.constructor = XPathNSResolverWrapper;
XPathNSResolverWrapper.superclass = Object.prototype;

function XPathNSResolverWrapper(r) {
	this.xpathNSResolver = r;
}

XPathNSResolverWrapper.prototype.getNamespace = function(prefix, n) {
    if (this.xpathNSResolver == null) {
        return null;
    }
	return this.xpathNSResolver.lookupNamespaceURI(prefix);
};

// NodeXPathNSResolver ///////////////////////////////////////////////////////

NodeXPathNSResolver.prototype = {};
NodeXPathNSResolver.prototype.constructor = NodeXPathNSResolver;
NodeXPathNSResolver.superclass = Object.prototype;

function NodeXPathNSResolver(n) {
	this.node = n;
	this.namespaceResolver = new NamespaceResolver();
}

NodeXPathNSResolver.prototype.lookupNamespaceURI = function(prefix) {
	return this.namespaceResolver.getNamespace(prefix, this.node);
};

// XPathResult ///////////////////////////////////////////////////////////////

XPathResult.prototype = {};
XPathResult.prototype.constructor = XPathResult;
XPathResult.superclass = Object.prototype;

function XPathResult(v, t) {
	if (t == XPathResult.ANY_TYPE) {
		if (v.constructor === XString) {
			t = XPathResult.STRING_TYPE;
		} else if (v.constructor === XNumber) {
			t = XPathResult.NUMBER_TYPE;
		} else if (v.constructor === XBoolean) {
			t = XPathResult.BOOLEAN_TYPE;
		} else if (v.constructor === XNodeSet) {
			t = XPathResult.UNORDERED_NODE_ITERATOR_TYPE;
		}
	}
	this.resultType = t;
	switch (t) {
		case XPathResult.NUMBER_TYPE:
			this.numberValue = v.numberValue();
			return;
		case XPathResult.STRING_TYPE:
			this.stringValue = v.stringValue();
			return;
		case XPathResult.BOOLEAN_TYPE:
			this.booleanValue = v.booleanValue();
			return;
		case XPathResult.ANY_UNORDERED_NODE_TYPE:
		case XPathResult.FIRST_ORDERED_NODE_TYPE:
			if (v.constructor === XNodeSet) {
				this.singleNodeValue = v.first();
				return;
			}
			break;
		case XPathResult.UNORDERED_NODE_ITERATOR_TYPE:
		case XPathResult.ORDERED_NODE_ITERATOR_TYPE:
			if (v.constructor === XNodeSet) {
				this.invalidIteratorState = false;
				this.nodes = v.toArray();
				this.iteratorIndex = 0;
				return;
			}
			break;
		case XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE:
		case XPathResult.ORDERED_NODE_SNAPSHOT_TYPE:
			if (v.constructor === XNodeSet) {
				this.nodes = v.toArray();
				this.snapshotLength = this.nodes.length;
				return;
			}
			break;
	}
	throw new XPathException(XPathException.TYPE_ERR);
};

XPathResult.prototype.iterateNext = function() {
	if (this.resultType != XPathResult.UNORDERED_NODE_ITERATOR_TYPE
			&& this.resultType != XPathResult.ORDERED_NODE_ITERATOR_TYPE) {
		throw new XPathException(XPathException.TYPE_ERR);
	}
	return this.nodes[this.iteratorIndex++];
};

XPathResult.prototype.snapshotItem = function(i) {
	if (this.resultType != XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE
			&& this.resultType != XPathResult.ORDERED_NODE_SNAPSHOT_TYPE) {
		throw new XPathException(XPathException.TYPE_ERR);
	}
	return this.nodes[i];
};

XPathResult.ANY_TYPE = 0;
XPathResult.NUMBER_TYPE = 1;
XPathResult.STRING_TYPE = 2;
XPathResult.BOOLEAN_TYPE = 3;
XPathResult.UNORDERED_NODE_ITERATOR_TYPE = 4;
XPathResult.ORDERED_NODE_ITERATOR_TYPE = 5;
XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE = 6;
XPathResult.ORDERED_NODE_SNAPSHOT_TYPE = 7;
XPathResult.ANY_UNORDERED_NODE_TYPE = 8;
XPathResult.FIRST_ORDERED_NODE_TYPE = 9;

// DOM 3 XPath support ///////////////////////////////////////////////////////

function installDOM3XPathSupport(doc, p) {
	doc.createExpression = function(e, r) {
		try {
			return new XPathExpression(e, r, p);
		} catch (e) {
			throw new XPathException(XPathException.INVALID_EXPRESSION_ERR, e);
		}
	};
	doc.createNSResolver = function(n) {
		return new NodeXPathNSResolver(n);
	};
	doc.evaluate = function(e, cn, r, t, res) {
		if (t < 0 || t > 9) {
			throw { code: 0, toString: function() { return "Request type not supported"; } };
		}
        return doc.createExpression(e, r, p).evaluate(cn, t, res);
	};
};

// ---------------------------------------------------------------------------

// Install DOM 3 XPath support for the current document.
try {
	var shouldInstall = true;
	try {
		if (document.implementation
				&& document.implementation.hasFeature
				&& document.implementation.hasFeature("XPath", null)) {
			shouldInstall = false;
		}
	} catch (e) {
	}
	if (shouldInstall) {
		installDOM3XPathSupport(document, new XPathParser());
	}
} catch (e) {
}

// ---------------------------------------------------------------------------
// exports for node.js

installDOM3XPathSupport(exports, new XPathParser());

(function() {
    var parser = new XPathParser();

    var defaultNSResolver = new NamespaceResolver();
    var defaultFunctionResolver = new FunctionResolver();
    var defaultVariableResolver = new VariableResolver();

    function makeNSResolverFromFunction(func) {
        return {
            getNamespace: function (prefix, node) {
                var ns = func(prefix, node);

                return ns || defaultNSResolver.getNamespace(prefix, node);
            }
        };
    }

    function makeNSResolverFromObject(obj) {
        return makeNSResolverFromFunction(obj.getNamespace.bind(obj));
    }

    function makeNSResolverFromMap(map) {
        return makeNSResolverFromFunction(function (prefix) {
            return map[prefix];
        });
    }

    function makeNSResolver(resolver) {
        if (resolver && typeof resolver.getNamespace === "function") {
            return makeNSResolverFromObject(resolver);
        }

        if (typeof resolver === "function") {
            return makeNSResolverFromFunction(resolver);
        }

        // assume prefix -> uri mapping
        if (typeof resolver === "object") {
            return makeNSResolverFromMap(resolver);
        }

        return defaultNSResolver;
    }

    /** Converts native JavaScript types to their XPath library equivalent */
    function convertValue(value) {
        if (value === null ||
            typeof value === "undefined" ||
            value instanceof XString ||
            value instanceof XBoolean ||
            value instanceof XNumber ||
            value instanceof XNodeSet) {
            return value;
        }

        switch (typeof value) {
            case "string": return new XString(value);
            case "boolean": return new XBoolean(value);
            case "number": return new XNumber(value);
        }

        // assume node(s)
        var ns = new XNodeSet();
        ns.addArray([].concat(value));
        return ns;
    }

    function makeEvaluator(func) {
        return function (context) {
            var args = Array.prototype.slice.call(arguments, 1).map(function (arg) {
                return arg.evaluate(context);
            });
            var result = func.apply(this, [].concat(context, args));
            return convertValue(result);
        };
    }

    function makeFunctionResolverFromFunction(func) {
        return {
            getFunction: function (name, namespace) {
                var found = func(name, namespace);
                if (found) {
                    return makeEvaluator(found);
                }
                return defaultFunctionResolver.getFunction(name, namespace);
            }
        };
    }

    function makeFunctionResolverFromObject(obj) {
        return makeFunctionResolverFromFunction(obj.getFunction.bind(obj));
    }

    function makeFunctionResolverFromMap(map) {
        return makeFunctionResolverFromFunction(function (name) {
            return map[name];
        });
    }

    function makeFunctionResolver(resolver) {
        if (resolver && typeof resolver.getFunction === "function") {
            return makeFunctionResolverFromObject(resolver);
        }

        if (typeof resolver === "function") {
            return makeFunctionResolverFromFunction(resolver);
        }

        // assume map
        if (typeof resolver === "object") {
            return makeFunctionResolverFromMap(resolver);
        }

        return defaultFunctionResolver;
    }

    function makeVariableResolverFromFunction(func) {
        return {
            getVariable: function (name, namespace) {
                var value = func(name, namespace);
                return convertValue(value);
            }
        };
    }

    function makeVariableResolver(resolver) {
        if (resolver) {
            if (typeof resolver.getVariable === "function") {
                return makeVariableResolverFromFunction(resolver.getVariable.bind(resolver));
            }

            if (typeof resolver === "function") {
                return makeVariableResolverFromFunction(resolver);
            }

            // assume map
            if (typeof resolver === "object") {
                return makeVariableResolverFromFunction(function (name) {
                    return resolver[name];
                });
            }
        }

        return defaultVariableResolver;
    }

    function makeContext(options) {
        var context = new XPathContext();

        if (options) {
            context.namespaceResolver = makeNSResolver(options.namespaces);
            context.functionResolver = makeFunctionResolver(options.functions);
            context.variableResolver = makeVariableResolver(options.variables);
            context.expressionContextNode = options.node;
        } else {
            context.namespaceResolver = defaultNSResolver;
        }

        return context;
    }

    function evaluate(parsedExpression, options) {
        var context = makeContext(options);

        return parsedExpression.evaluate(context);
    }

    var evaluatorPrototype = {
        evaluate: function (options) {
            return evaluate(this.expression, options);
        }

        ,evaluateNumber: function (options) {
            return this.evaluate(options).numberValue();
        }

        ,evaluateString: function (options) {
            return this.evaluate(options).stringValue();
        }

        ,evaluateBoolean: function (options) {
            return this.evaluate(options).booleanValue();
        }

        ,evaluateNodeSet: function (options) {
            return this.evaluate(options).nodeset();
        }

        ,select: function (options) {
            return this.evaluateNodeSet(options).toArray()
        }

        ,select1: function (options) {
            return this.select(options)[0];
        }
    };

    function parse(xpath) {
        var parsed = parser.parse(xpath);

        return Object.create(evaluatorPrototype, {
            expression: {
                value: parsed
            }
        });
    }

    exports.parse = parse;
})();

exports.XPath = XPath;
exports.XPathParser = XPathParser;
exports.XPathResult = XPathResult;

exports.Step = Step;
exports.NodeTest = NodeTest;
exports.BarOperation = BarOperation;

exports.NamespaceResolver = NamespaceResolver;
exports.FunctionResolver = FunctionResolver;
exports.VariableResolver = VariableResolver;

exports.Utilities = Utilities;

exports.XPathContext = XPathContext;
exports.XNodeSet = XNodeSet;
exports.XBoolean = XBoolean;
exports.XString = XString;
exports.XNumber = XNumber;

// helper
exports.select = function(e, doc, single) {
	return exports.selectWithResolver(e, doc, null, single);
};

exports.useNamespaces = function(mappings) {
	var resolver = {
		mappings: mappings || {},
		lookupNamespaceURI: function(prefix) {
			return this.mappings[prefix];
		}
	};

	return function(e, doc, single) {
		return exports.selectWithResolver(e, doc, resolver, single);
	};
};

exports.selectWithResolver = function(e, doc, resolver, single) {
	var expression = new XPathExpression(e, resolver, new XPathParser());
	var type = XPathResult.ANY_TYPE;

	var result = expression.evaluate(doc, type, null);

	if (result.resultType == XPathResult.STRING_TYPE) {
		result = result.stringValue;
	}
	else if (result.resultType == XPathResult.NUMBER_TYPE) {
		result = result.numberValue;
	}
	else if (result.resultType == XPathResult.BOOLEAN_TYPE) {
		result = result.booleanValue;
	}
	else {
		result = result.nodes;
		if (single) {
			result = result[0];
		}
	}

	return result;
};

exports.select1 = function(e, doc) {
	return exports.select(e, doc, true);
};

// end non-node wrapper
})(xpath);


/***/ })
/******/ ]);
});
//# sourceMappingURL=potentTools-2.2.4.js.map