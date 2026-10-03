# Temporary security backport

Owner: FlightForge build/security module. Review/remove when upstream publishes a fixed version.

This is the MIT-licensed npm `braces@3.0.3` source, with its license preserved. It is not an official upstream release. `package.json` overrides every transitive braces dependency to this checked-in directory, so clean installs and ignore-scripts installs use the same reviewed code.

Reason: GHSA-vfj7-8cjw-p6xm / CVE-2026-93687 has no patched npm release as of October 3, 2026. Deep brace/parenthesis nesting exhausts the recursive AST walkers. We backport the depth cap proposed in https://github.com/micromatch/braces/pull/72 (open PR, commit d0d575e), preserving the original stringify parent-handling behavior rather than including its unrelated change. Parser nesting and all three AST walkers are capped at 100; options may tighten but cannot remove/increase that cap.

Regression coverage: `tests/unit/braces-security.test.ts`, including raw ASTs, direct internal API imports, escaped patterns, mixed nesting, invalid/unclosed patterns and attempted cap overrides. Normal application lint/build/test workflows exercise glob compatibility. A registry audit alone cannot assess a local fork; these tests and source review are required. No audit severity threshold or exception was added.

Retain this file and the upstream MIT license when changing the fork. Do not widen this package into a general-purpose fork; replace it with an audited fixed upstream version as soon as one is available.

The root devDependencies explicitly include `fill-range@7.1.1`: npm local-directory overrides are symlinks and do not reliably install their own dependencies. Remove that root pin when removing this backport.
