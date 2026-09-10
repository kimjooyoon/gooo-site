# Gooo language website

[Official site](https://kimjooyoon.github.io/gooo-site/) | [Compiler](https://github.com/kimjooyoon/meta-ontology-go) | [Website Actions](https://github.com/kimjooyoon/gooo-site/actions/workflows/site.yml)

Gooo is an experimental language connecting declared intent, generated code and inspectable evidence. This public repository owns its documentation website, independently of compiler releases.

## Reading paths

- [Overview](https://kimjooyoon.github.io/gooo-site/): purpose and entry points.
- [Learn](https://kimjooyoon.github.io/gooo-site/learn.html): starting path.
- [Language](https://kimjooyoon.github.io/gooo-site/language.html): language explanation.
- [Evidence](https://kimjooyoon.github.io/gooo-site/evidence.html): status and boundaries.

## Architecture and presentation

Essential content is static HTML with shared CSS. Astryx (`@astryxdesign/core`) progressively enhances the status card; failure to load that enhancement leaves the static documentation available. Astryx is not the compiler or a requirement for reading documentation.

Keep the presentation documentation-first, in the spirit of the Go website: clear navigation, readable code and direct explanations. Do not substitute decorative motion or passing badges for evidence of language capability.

## Independent delivery loop

1. Make a small website-only pull request.
2. GitHub Actions runs `scripts/check.mjs`, produces the static artifact and reports cost.
3. Merge only after the website check succeeds.
4. The main-branch workflow publishes that artifact through GitHub Pages.

The website does not require a sibling compiler checkout or a successful live compiler pipeline. Compiler CI waiting time can therefore be used for documentation work without changing compiler inputs. Documentation describing a feature must distinguish released support, candidate support and unresolved behavior.

The workflow cancels superseded checks for the same branch or PR. Production publication is serialized without cancelling an in-progress deployment. Check and deploy jobs each have a five-minute timeout; these are limits, not observed execution times. The website workflow does not run Go builds or tests.

## Cost and evidence rules

Record execution time with its workflow run and commit. Keep queue time, build/test time and publication time separate. A cache hit is reuse of inputs, not proof of semantic correctness. A lower duration from different source or runner conditions is an observation, not an established improvement.

Static structure checks do not establish browser rendering quality, accessibility completeness or successful loading of the optional remote Astryx modules. Those remain separate verification tasks.

## Interactive dogfood candidate

[Relay Lab](https://kimjooyoon.github.io/gooo-site/relay.html) is a client-only
exploration game with human, deterministic-planner and manual external-AI
inputs. Its candidate Gooo request contract has a separate, manually triggered
CI observation. Browser gameplay is currently JavaScript-only, not Gooo runtime
execution or evidence of completed language adoption.
