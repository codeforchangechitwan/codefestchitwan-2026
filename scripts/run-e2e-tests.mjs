#!/usr/bin/env node

/*
 * Codefest Chitwan 2026 — Master E2E Test Suite Runner
 * Executes all 4 coverage tiers per Dual Track Quality Assurance Methodology.
 */

import { TestRunner } from "../tests/e2e/test-harness.mjs";
import { runTier1Tests } from "../tests/e2e/tier1-feature-coverage.test.mjs";
import { runTier2Tests } from "../tests/e2e/tier2-boundary-cases.test.mjs";
import { runTier3Tests } from "../tests/e2e/tier3-cross-feature.test.mjs";
import { runTier4Tests } from "../tests/e2e/tier4-user-scenarios.test.mjs";

async function main() {
  const startTime = Date.now();
  console.log("\n======================================================================");
  console.log("   CODEFEST CHITWAN 2026 — END-TO-END (E2E) AUTOMATED TEST SUITE   ");
  console.log("   Methodology: Dual Track Quality Assurance Architecture             ");
  console.log("======================================================================\n");

  const runner = new TestRunner();

  // Execute Tier 1 Feature Coverage
  runTier1Tests(runner);

  // Execute Tier 2 Boundary & Corner Cases
  runTier2Tests(runner);

  // Execute Tier 3 Cross-Feature Combinations
  runTier3Tests(runner);

  // Execute Tier 4 Real-World Application Scenarios
  runTier4Tests(runner);

  const durationMs = Date.now() - startTime;

  console.log("\n======================================================================");
  console.log("                     E2E TEST EXECUTION SUMMARY                       ");
  console.log("======================================================================");
  console.log(`  Total Test Cases Evaluated : ${runner.totalTests}`);
  console.log(`  Passed Test Cases          : \x1b[32m${runner.passedTests}\x1b[0m`);
  console.log(`  Failed Test Cases          : ${runner.failedTests > 0 ? `\x1b[31m${runner.failedTests}\x1b[0m` : "0"}`);
  console.log(`  Total Assertions Checked   : ${runner.totalAssertions}`);
  console.log(`  Passed Assertions          : \x1b[32m${runner.passedAssertions}\x1b[0m`);
  console.log(`  Failed Assertions          : ${runner.failedAssertions > 0 ? `\x1b[31m${runner.failedAssertions}\x1b[0m` : "0"}`);
  console.log(`  Total Execution Time       : ${durationMs} ms`);
  console.log("======================================================================\n");

  if (runner.failedTests > 0 || runner.failedAssertions > 0) {
    console.error(`\x1b[31mE2E TEST SUITE FAILED with ${runner.failedTests} failed test(s).\x1b[0m\n`);
    for (const err of runner.errors) {
      console.error(` - [${err.suite}] ${err.test}: ${err.error}`);
    }
    process.exit(1);
  } else {
    console.log("\x1b[32m✔ ALL STATIC SOURCE CHECKS PASSED\x1b[0m");
    console.log("\x1b[2m  These assert against file contents; they do not run the app.\x1b[0m\n");
    process.exit(0);
  }
}

main().catch((err) => {
  console.error("Unhandled error running E2E tests:", err);
  process.exit(1);
});
