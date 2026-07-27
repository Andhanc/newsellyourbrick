# Property AI Tiffany Accent Design

## Goal

Replace the yellow `#ffe000` accent in the Property AI experience and its generated PDF with the SellYourBrick Tiffany `#0099A9`.

## Scope

- Change every yellow accent owned by `PropertyAiExperience.css` to a local `--property-ai-accent` token.
- Use the same Tiffany value in `propertyAiPdfRenderer.js` so the downloaded report matches the chat UI.
- Keep dark text and icons on Tiffany because it has stronger contrast than white at this shade.
- Use a translucent Tiffany tint only for the picker hover on light/neutral surfaces; retain the solid accent for user messages, progress indicators, file icons, and primary download actions.
- Do not change unrelated yellow status colors elsewhere in the product.

## Implementation

Define `--property-ai-accent: #0099a9` and `--property-ai-accent-soft: rgba(0, 153, 169, 0.18)` on `.property-ai-experience`. Replace the component's `#ffe000` declarations with the solid token, except the picker action hover background, which uses the soft token. Replace `#ffe000` with `#0099a9` inside the server-side PDF CSS template.

## Verification

Add a source-level regression test that asserts the Property AI CSS and PDF renderer contain no legacy yellow accent and both contain the Tiffany value. Run the focused test and the production build.
