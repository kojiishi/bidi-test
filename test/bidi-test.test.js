'use strict';
var assert = require("assert");
var target = require("../bidi-test.js");

describe("BidiTest", function () {
  describe("makeSequene", function () {
    [
      [[0], [0]],
      [[1], [0]],
      [[1, 2, 3], [0, 1, 2]],
      [[5, 1, 3], [2, 0, 1]],
    ].forEach(function (arg) {
      it("[" + arg[0] + "] => [" + arg[1] + "]", function () {
        assert.deepEqual(target.BidiTest.makeSequene(arg[0]), arg[1]);
      });
    });
  });

  describe("toHtml", function () {
    [
      ["L", null],
      ["L NSM", null],
      ["L L", "aa"],
      ["LRE L L", "<LRE>aa</LRE>"],
      ["LRE L L PDF", "<LRE>aa</LRE>"],
      ["LRE L PDF L", "<LRE>a</LRE>a"],
      ["L L PDF", null],
    ].forEach(function (arg) {
      it("[" + arg[0] + "] => [" + arg[1] + "]", function () {
        assert.equal(target.BidiTest.toHtml(arg[0]), arg[1]);
      });
    });
  });
});
