# Task 1 report — Home sale formats component contract

## Status

DONE

## Commit

`1096da7` — `feat: add home sale formats component contract`

Only the three task files were included in the commit. Existing unrelated tracked and untracked workspace changes were left untouched.

## Files changed

- `src/components/HomeSaleFormats.layout.test.js`
  - Adds the requested source-level contract assertions for a fully clickable route card, CTA copy, mobile scroll snap, keyboard focus visibility, and reduced-motion handling.
- `src/components/HomeSaleFormats.jsx`
  - Adds `HomeSaleFormats({ modes })`.
  - Renders one full-card React Router `Link` per mode.
  - Includes the specified section heading, explanatory copy, trust line, ordered `h2`/`h3` headings, benefit/proof content, meaningful image alt text, and CTA.
- `src/components/HomeSaleFormats.css`
  - Adds a responsive asymmetric desktop grid.
  - Adds full-card imagery and readable overlay content.
  - Adds hover treatment, visible `:focus-visible` outline, a mobile horizontal scroll-snap rail with a partially visible next card, and reduced-motion overrides.

## RED evidence

Command:

```text
node --test src/components/HomeSaleFormats.layout.test.js
```

Observed exit code: `1`.

Expected failure:

```text
Error: ENOENT: no such file or directory, open '/Users/vtichonenko/newsellyourbrick/src/components/HomeSaleFormats.jsx'
...
ℹ pass 0
ℹ fail 1
```

This confirmed the test failed because the requested production component did not yet exist.

## GREEN evidence

Command:

```text
node --test src/components/HomeSaleFormats.layout.test.js
```

Observed exit code: `0`.

```text
✔ renders each format as one fully clickable route card
✔ provides mobile scroll snap, focus visibility, and reduced motion
ℹ tests 2
ℹ pass 2
ℹ fail 0
```

The final verification also ran `git diff --check` for the three task files successfully before commit.

## Self-review

- The public interface matches the brief: `modes` is mapped directly and every mode produces exactly one `Link` with `to={mode.to}`.
- The section has a labeled semantic container and sequential heading levels (`h2` then per-card `h3`).
- Card text remains present in normal layout rather than depending on hover.
- Mobile overflow is contained within the rail; the section itself hides overflow to avoid page-level horizontal scrolling.
- Keyboard focus and reduced-motion cases are explicitly styled.
- No image assets were generated, no existing assets were removed, and `MainPage.jsx` was not modified.
- The staged diff contained only the three files named by Task 1.

## Concerns

- The required test is a source-structure contract, not a rendered DOM or browser-layout test. Runtime routing, exact breakpoint appearance, text clipping, and cross-viewport behavior should be verified when the component is integrated in the later task.
- Integration into `MainPage.jsx` and assignment of the final four image assets are intentionally outside Task 1.

## Reviewer fix — valid heading wrapper

### Root cause

`HomeSaleFormats.jsx` used a phrasing-only `<span className="sale-formats__content">` as the parent of the block-level card `<h3>`. This violates the span element's HTML content model and can cause invalid DOM parsing or hydration behavior.

### RED evidence

Added a source-contract test requiring the content wrapper to be a `div` and rejecting the previous `span` wrapper.

Command:

```text
node --test src/components/HomeSaleFormats.layout.test.js
```

Observed exit code: `1`.

```text
✔ renders each format as one fully clickable route card
✖ uses a flow content wrapper for the card heading
✔ provides mobile scroll snap, focus visibility, and reduced motion
ℹ tests 3
ℹ pass 2
ℹ fail 1

AssertionError [ERR_ASSERTION]: The input did not match the regular expression /<div className="sale-formats__content">/.
```

The failure output showed the existing `<span className="sale-formats__content">`, confirming the test failed for the intended root cause.

### GREEN evidence

Changed only the content wrapper's opening and closing tags from `span` to `div`.

Command:

```text
node --test src/components/HomeSaleFormats.layout.test.js
```

Observed exit code: `0`.

```text
✔ renders each format as one fully clickable route card
✔ uses a flow content wrapper for the card heading
✔ provides mobile scroll snap, focus visibility, and reduced motion
ℹ tests 3
ℹ pass 3
ℹ fail 0
```

`git diff --check` also completed successfully for the two fix files.

### Fix commit

`66e8f01` — `fix: use valid sale format content wrapper`
