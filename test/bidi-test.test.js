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
      ["L", null, [true]],
      ["L NSM", null, [true]],
      ["L L", "aa", [true, true]],
      ["LRE L L", "<LRE>aa</LRE>", [, true, true]],
      ["LRE L L PDF", "<LRE>aa</LRE>", [, true, true]],
      ["LRE L PDF L", "<LRE>a</LRE>a", [, true, , true]],
      ["L L PDF", null, [true, true]],
    ].forEach(function (arg) {
      it("[" + arg[0] + "] => [" + arg[1] + "]", function () {
        var indexOfSpacingCharacters = [];
        assert.equal(target.BidiTest.toHtml(arg[0], indexOfSpacingCharacters), arg[1]);
        assert.deepEqual(arg[2], indexOfSpacingCharacters);
      });
    });
  });

  describe("removeNonSpacing", function () {
    [
      [[0, 1, 2], [true, true, true], [0, 1, 2]],
      [[0, 1, 2], [], []],
      [[0, 1, 2], [true, , true], [0, 2]],
      [[2, 1, 0], [true, true], [1, 0]],
    ].forEach(function (arg) {
      it("[" + arg[0] + "] + [" + arg[1] + "] => [" + arg[2] + "]", function () {
        assert.deepEqual(target.BidiTest.removeNonSpacing(arg[0], arg[1]), arg[2]);
      });
    });
  });
});
