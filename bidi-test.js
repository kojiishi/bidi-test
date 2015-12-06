'use strict'

var BidiTest = (function () {
  var ctor = function (expect, input, bitset) {
    this.expect = expect;
    this.input = input;
    this.bitset = bitset;
  };
  var proto = ctor.prototype;
  ctor.bitsets = [
    { tagName: "PA" },
    { tagName: "PL" },
    { tagName: "PR" },
  ];
  proto.createElement = function (parent) {
    var html = this.html();
    if (!html)
      return false;
    var doc = parent.ownerDocument;
    var self = this;
    for (var i = 0, bits = this.bitset; i < BidiTest.bitsets.length; i++, bits >>= 1) {
      if (!(bits & 1))
        continue
      var bitset = BidiTest.bitsets[i];
      var child = new BidiTest(this.expect, this.input, undefined);
      child.tagName = bitset.tagName;
      var element = doc.createElement(bitset.tagName);
      element.innerHTML = html;
      element.bidiTest = child;
      parent.appendChild(element);
    }
    return true;
  };
  proto.description = function () {
    return '"' + this.input + '" (' + this.tagName + ')';
  };
  proto.html = function () {
    return BidiTest.toHtml(this.input);
  };
  ctor.map = {
    "L": { html: "a" },
    "R": { html: String.fromCharCode(0x05D0) }, // HEBREW ALEF
    "EN": { html: "3" },
    "ES": { html: "-" },
    "ET": { html: "%" },
    "AN": { html: String.fromCharCode(0x0660) }, // ARABIC 0
    "CS": { html: "," },
    "B": { html: String.fromCharCode(0x0A), nonSpacing: true },
    "S": { html: String.fromCharCode(0x09) },
    "WS": { html: " " },
    "ON": { html: "=" },
    "NSM": { html: String.fromCharCode(0x05BF), nonSpacing: true }, // HEBREW POINT RAFE
    "AL": { html: String.fromCharCode(0x0608) }, // ARABIC RAY
    "BN": { html: String.fromCharCode(0x00AD) }, // SOFT HYPHEN
    "LRE": { html: "<LRE>", close: "</LRE>", closeBy: "PDF" },
    "RLE": { html: "<RLE>", close: "</RLE>", closeBy: "PDF" },
    "LRO": { html: "<LRO>", close: "</LRO>", closeBy: "PDF" },
    "RLO": { html: "<RLO>", close: "</RLO>", closeBy: "PDF" },
    "PDF": { close: true },
    "LRI": { html: "<LRI>", close: "</LRI>", closeBy: "PDI" },
    "RLI": { html: "<RLI>", close: "</RLI>", closeBy: "PDI" },
    "FSI": { html: "<FSI>", close: "</FSI>", closeBy: "PDI" },
    "PDI": { close: true },
  };
  ctor.toHtml = function (input) {
    var items = input.split(" ");
    var results = [];
    var stack = [];
    var spacing = 0;
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      var result = this.map[item];
      if (!result) {
        results.push(item);
        continue;
      }
      if (result.closeBy) {
        results.push(result.html);
        stack.push(result);
      } else if (result.close) {
        if (!stack.length || stack[stack.length - 1].closeBy !== item)
          return null;
        results.push(stack.pop().close);
      } else {
        results.push(result.html);
        if (!result.nonSpacing)
          spacing++;
      }
    }
    if (spacing <= 1)
      return null;
    while (stack.length)
      results.push(stack.pop().close);
    return results.join("");
  };
  proto.testElement = function (element) {
    var actual = this.actual = BidiTest.visualOrder(element);
    var expect = this.expect.reorder;
    if (actual.length != expect.length)
      return -1;
    for (var i = 0; i < actual.length; i++) {
      if (actual[i] != expect[i])
        return 0;
    }
    return 1;
  };
  proto.result = function () {
    var actual = this.actual;
    if (!actual)
      return this.input;
    var expect = this.expect.reorder;
    if (actual.length != expect.length)
      return "Length differ for " + this.description() + ": " + actual + " but expects " + expect;
    for (var i = 0; i < actual.length; i++) {
      if (actual[i] != expect[i])
        return "[" + i + "] differ for " + this.description() + ": " + actual + " but expects " + expect;
    }
    return "Pass: " + this.description() + " is " + actual + " (expects "+ expect + ")";
  }
  // Get visual order of charaters in a node.
  // <span dir=rtl>ABC</span> returns [2, 1, 0].
  ctor.visualOrder = function (node) {
    function collectX(node, results, range, offset) {
      switch (node.nodeType) {
        case Node.ELEMENT_NODE:
          for (var i = 0; i < node.childNodes.length; i++)
            offset = collectX(node.childNodes[i], results, range, offset);
          break;
        case Node.TEXT_NODE:
          var length = node.textContent.length;
          for (var i = 0; i < length; i++) {
            range.setStart(node, i);
            range.setEnd(node, i + 1);
            var bounds = range.getBoundingClientRect();
            if (!bounds.width)
              continue;
            results.push({ x: bounds.left, index: i + offset });
          }
          offset += length;
          break;
      }
      return offset;
    }

    var results = [];
    var range = node.ownerDocument.createRange();
    collectX(node, results, range, 0);
    results.sort(function (a, b) { return a.x > b.x ? 1 : -1; });
    results = results.map(function (r) { return r.index; });
    BidiTest.makeSequene(results);
    return results;
  };
  // Make values of an int array seuquential without breaking the order.
  // [5, 1, 3] returns  [2, 0, 1].
  ctor.makeSequene = function (list) {
    var values = [];
    for (var i = 0; i < list.length; i++)
      values[list[i]] = i;
    for (var i = 0, value = 0; i < values.length; i++) {
      if (values[i] !== undefined)
        list[values[i]] = value++;
    }
    return list;
  };
  return ctor;
})();

var BidiTestTextParser = (function () {
  var ctor = function () {
    this.lineNumber = 0;
    this.levels = null;
    this.reorder = null;
    this.expect = null;
    this.tests = [];
  };
  var proto = ctor.prototype;
  proto.parseUrl = function (url, callback) {
    var rq = new XMLHttpRequest();
    var self = this;
    rq.addEventListener("loadend", function (e) {
      self.parseString(rq.responseText);
      if (callback)
        callback(self.tests);
    });
    rq.open("get", url);
    rq.send();
  };
  proto.parseString = function (str) {
    var lines = str.split("\n");
    for (var index = 0; index < lines.length; index++) {
      this.parseLine(lines[index]);
    }
  };
  proto.parseLine = function (line) {
    this.lineNumber++;
    if (!line || line[0] == "#")
      return;
    if (line[0] == "@") {
      var keyValue = line.slice(1).split(":", 2);
      if (keyValue[0] == "Levels") {
        this.levels = keyValue[1].trim().split(" ");
        this.expect = null;
        return;
      }
      if (keyValue[0] == "Reorder") {
        this.reorder = keyValue[1].trim().split(" ")
          .map(function (i) { return parseInt(i); });
        BidiTest.makeSequene(this.reorder);
        this.expect = null;
        return;
      }
      return;
    }
    if (!this.levels || !this.reorder || this.reorder.length < 2)
      return;
    var values = line.split(";");
    if (values.length < 2)
      return;
    if (!this.expect)
      this.expect = { levels: this.levels, reorder: this.reorder };
    this.tests.push(new BidiTest(this.expect, values[0], parseInt(values[1])));
  };
  return ctor;
})();

var BidiTestRunner = (function () {
  var ctor = function () {
    this.pass = 0;
    this.start = performance.now();
  };
  var proto = ctor.prototype;
  proto.loadUrl = function (url, callback) {
    (new BidiTestTextParser).parseUrl(url, callback);
  };
  proto.elapsed = function () {
    return performance.now() - this.start;
  };
  proto.create = function (tests, container) {
    for (var test of tests) {
      if (!test.createElement(container)) {
        this.onIgnore(test);
      }
    }
  };
  proto.run = function (elements) {
    var self = this;
    Array.prototype.forEach.call(elements, function (element) {
      var test = element.bidiTest;
      var result = test.testElement(element);
      if (result < 0) {
        self.onInconclusive(test, element);
      } else if (!result) {
        self.onFail(test, element);
      } else {
        self.pass++;
      }
    });
  };
  return ctor;
})();
