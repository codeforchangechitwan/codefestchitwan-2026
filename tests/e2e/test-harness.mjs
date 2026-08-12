/*
 * E2E Test Harness & Assertion Library for Codefest Chitwan 2026
 */

import fs from "node:fs";
import path from "node:path";

export class TestRunner {
  constructor() {
    this.totalTests = 0;
    this.passedTests = 0;
    this.failedTests = 0;
    this.totalAssertions = 0;
    this.passedAssertions = 0;
    this.failedAssertions = 0;
    this.errors = [];
    this.currentSuite = "";
  }

  suite(name, fn) {
    this.currentSuite = name;
    console.log(`\n\x1b[36m=== Suite: ${name} ===\x1b[0m`);
    try {
      fn(this);
    } catch (err) {
      console.error(`\x1b[31m[SUITE ERROR] ${name}: ${err.message}\x1b[0m`);
      this.errors.push({ suite: name, test: "Suite Execution", error: err.message });
    }
  }

  async asyncSuite(name, fn) {
    this.currentSuite = name;
    console.log(`\n\x1b[36m=== Suite: ${name} ===\x1b[0m`);
    try {
      await fn(this);
    } catch (err) {
      console.error(`\x1b[31m[SUITE ERROR] ${name}: ${err.message}\x1b[0m`);
      this.errors.push({ suite: name, test: "Suite Execution", error: err.message });
    }
  }

  test(name, fn) {
    this.totalTests++;
    let testPassed = true;
    try {
      fn();
      this.passedTests++;
      console.log(`  \x1b[32m✔\x1b[0m ${name}`);
    } catch (err) {
      this.failedTests++;
      testPassed = false;
      console.error(`  \x1b[31m✖\x1b[0m ${name}`);
      console.error(`    \x1b[31mError: ${err.message}\x1b[0m`);
      this.errors.push({ suite: this.currentSuite, test: name, error: err.message });
    }
    return testPassed;
  }

  async asyncTest(name, fn) {
    this.totalTests++;
    let testPassed = true;
    try {
      await fn();
      this.passedTests++;
      console.log(`  \x1b[32m✔\x1b[0m ${name}`);
    } catch (err) {
      this.failedTests++;
      testPassed = false;
      console.error(`  \x1b[31m✖\x1b[0m ${name}`);
      console.error(`    \x1b[31mError: ${err.message}\x1b[0m`);
      this.errors.push({ suite: this.currentSuite, test: name, error: err.message });
    }
    return testPassed;
  }

  assert(condition, message) {
    this.totalAssertions++;
    if (condition) {
      this.passedAssertions++;
    } else {
      this.failedAssertions++;
      throw new Error(message || "Assertion failed");
    }
  }

  assertEquals(actual, expected, message) {
    this.totalAssertions++;
    if (actual === expected) {
      this.passedAssertions++;
    } else {
      this.failedAssertions++;
      throw new Error(
        `${message || "Expected equality"} — Expected: ${JSON.stringify(expected)}, Got: ${JSON.stringify(actual)}`
      );
    }
  }

  assertIncludes(actual, substring, message) {
    this.totalAssertions++;
    const str = typeof actual === "string" ? actual : String(actual);
    if (str.includes(substring)) {
      this.passedAssertions++;
    } else {
      this.failedAssertions++;
      throw new Error(
        `${message || "Expected string inclusion"} — Substring: "${substring}" not found in output`
      );
    }
  }

  assertMatches(actual, regex, message) {
    this.totalAssertions++;
    const str = typeof actual === "string" ? actual : String(actual);
    if (regex.test(str)) {
      this.passedAssertions++;
    } else {
      this.failedAssertions++;
      throw new Error(
        `${message || "Expected pattern match"} — Pattern ${regex} failed on "${str}"`
      );
    }
  }

  assertFileExists(filePath, message) {
    this.totalAssertions++;
    if (fs.existsSync(filePath)) {
      this.passedAssertions++;
    } else {
      this.failedAssertions++;
      throw new Error(`${message || "Expected file to exist"}: ${filePath}`);
    }
  }
}

/** Check if project source file exists */
export function checkFile(relPath) {
  const root = path.resolve(process.cwd());
  const full = path.join(root, relPath);
  return fs.existsSync(full);
}

/** Read text of project source file */
export function readFileContent(relPath) {
  const root = path.resolve(process.cwd());
  const full = path.join(root, relPath);
  return fs.readFileSync(full, "utf8");
}
