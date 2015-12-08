'use strict';

(function (exports) {
  exports.BidiTest = (function () {
    var ctor = function (reorder, input, bitset) {
      this.reorder = reorder;
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
        var child = new BidiTestElement(this, bitset.tagName);
        child.createElement(parent, doc, html);
      }
      return true;
    };
    proto.description = function () {
      return '"' + this.input + '"';
    };
    proto.html = function () {
      this.indexOfSpacingCharacters = [];
      return BidiTest.toHtml(this.input, this.indexOfSpacingCharacters);
    };
    proto.expectedReorder = function () {
      if (this._expectedReorder)
        return this._expectedReorder;
      var reorder = BidiTest.removeNonSpacing(this.reorder.slice(), this.indexOfSpacingCharacters);
      this._expectedReorder = BidiTest.makeSequene(reorder);
      return this._expectedReorder;
    };
    proto.result = function () {
      return this.input;
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
      "BN": { html: String.fromCharCode(0x00AD), nonSpacing: true }, // SOFT HYPHEN
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
    ctor.toHtml = function (input, indexOfSpacingCharacters) {
      var items = input.split(" ");
      var results = [];
      var stack = [];
      var spacing = 0;
      for (var i = 0; i < items.length; i++) {
        var item = items[i];
        var result = exports.BidiTest.map[item];
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
          if (!result.nonSpacing) {
            spacing++;
            if (indexOfSpacingCharacters)
              indexOfSpacingCharacters[i] = true;
          }
        }
      }
      if (spacing <= 1)
        return null;
      while (stack.length)
        results.push(stack.pop().close);
      return results.join("");
    };
    ctor.removeNonSpacing = function (reorder, indexOfSpacingCharacters) {
      for (var i = reorder.length - 1; i >= 0; i--) {
        if (!indexOfSpacingCharacters[reorder[i]])
          reorder.splice(i, 1);
      }
      return reorder;
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

  exports.BidiTestElement = (function () {
    var ctor = function (test, tagName) {
      this.test = test;
      this.tagName = tagName;
    };
    var proto = ctor.prototype;
    proto.description = function () {
      return this.test.description() + ' (' + this.tagName + ')';
    };
    proto.createElement = function (parent, doc, html) {
      var element = doc.createElement(this.tagName);
      element.innerHTML = html;
      element.bidiTest = this;
      parent.appendChild(element);
    };
    proto.testElement = function (element) {
      var actual = this.actual = BidiTestElement.visualOrder(element);
      var expect = this.test.expectedReorder();
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
        return this.test.input;
        var expect = this.test.expectedReorder();
      if (actual.length != expect.length)
        return "Length differ for " + this.description() + ": " + actual + " but expects " + expect + " (" + this.test.reorder + ")";
      for (var i = 0; i < actual.length; i++) {
        if (actual[i] != expect[i])
          return "[" + i + "] differ for " + this.description() + ": " + actual + " but expects " + expect + " (" + this.test.reorder + ")";
      }
      return "Pass: " + this.test.description() + " is " + actual + " (expects "+ expect + ")";
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
      return BidiTest.makeSequene(results);;
    };
    return ctor;
  })();

  exports.BidiTestTextParser = (function () {
    var ctor = function () {
      this.lineNumber = 0;
      this.levels = null;
      this.reorder = null;
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
          return;
        }
        if (keyValue[0] == "Reorder") {
          this.reorder = keyValue[1].trim().split(" ")
            .map(function (i) { return parseInt(i); });
          return;
        }
        return;
      }
      if (!this.levels || !this.reorder || this.reorder.length < 2)
        return;
      var values = line.split(";");
      if (values.length < 2)
        return;
      this.tests.push(new BidiTest(this.reorder, values[0], parseInt(values[1])));
    };
    return ctor;
  })();

  exports.BidiTestRunner = (function () {
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
})(this);
