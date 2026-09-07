# Website boundary

The website is a separate publication surface. It does not compile the language,
change compiler authority, or gate another repository. Main publishes through
GitHub Pages; pull requests check and package but cannot deploy.

Core content is semantic HTML. Astryx 0.4.1 provides the theme styles and an
optional React 19.2 status card using its documented CDN integration. No Astro
framework is implied: Astryx and Astro are different projects. Static content
remains available if external scripts fail. CDN availability and full visual
accessibility are not established by the structural CI check.

The site uses a Go-inspired restrained teal palette, documentation navigation,
readable code and explicit experimental status, not Go branding or mascots.

CI has no package installation, compiler invocation or dependency cache to warm.
It emits exact file digests, page/link counts, first-party bytes, time and RSS.
External font/React/Astryx transfer sizes are excluded from first-party bytes.
Future optimization requires comparable before/after measurements.

Astryx integration reference: https://github.com/facebook/astryx/tree/main/packages/core
