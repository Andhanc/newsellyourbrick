**Comparison Target**

- Source visual truth: `/var/folders/c8/gpqh9xf946vd864n2qjcts640000gp/T/codex-clipboard-7edd6985-b791-4fa7-869b-4ec2e87519e1.png`
- Implementation screenshot: `/private/tmp/debt-risk-mobile.png`
- Combined comparison: `/private/tmp/debt-risk-comparison.png`
- Viewport: 390 × 844, mobile, authenticated buyer state
- State: medium debt risk card visible above the title; fixed bid action visible; PRO dialog closed for the main capture

**Findings**

- No actionable P0, P1, or P2 mismatch remains. The implementation preserves the source card hierarchy, white rounded surface, amber semantic color, shield icon, title/body copy, compact “Нажмите” affordance, lightning accent, border, and elevation while fitting the narrower product viewport.
- Fonts and typography: existing product font is retained; title, supporting copy, and CTA weights match the reference hierarchy without clipping.
- Spacing and layout rhythm: the card is 350 × 109 px with 20 px page margins; internal tracks remain aligned and no horizontal overflow occurs.
- Colors and visual tokens: medium risk uses an amber icon tile, border, CTA, and accent consistently with the source semantic state.
- Image quality and asset fidelity: the card contains standard library icons rather than placeholder or handcrafted assets. Listing-image failures visible in the test data are outside this component and this change.
- Copy and content: “Средний риск”, the yellow-risk explanation, and “Нажмите” match the selected source card’s meaning and structure.

**Open Questions**

- None for this component.

**Full-view Comparison Evidence**

- The combined image shows the full reference card set beside the rendered 390 × 844 property page. The selected medium-risk card replaces both former badges and keeps the page title and auction controls readable.

**Focused Region Comparison Evidence**

- No additional crop was needed because the card text, iconography, border, radius, and action treatment are legible in the combined comparison at original resolution.

**Interaction and Responsive Checks**

- One risk card rendered; the old property-type badge is absent for debt objects.
- “Сделать ставку” is visible in the fixed mobile action bar.
- Tapping the card opens “Полный анализ долга” with the “Купить PRO” action.
- Document width equals the 390 px viewport; no horizontal overflow.
- Fresh browser run reported no console or page errors.

**Comparison History**

- Initial implementation exposed an unavailable icon export, which blanked the page. Replaced it with the installed `Pointer` icon and recaptured the implementation.
- Source-copy drift (“Подробнее” and generic risk descriptions) was corrected to “Нажмите” and the source-aligned red/yellow/green explanations before the passing comparison.

**Implementation Checklist**

- [x] Replace the two mobile badges with one semantic risk card.
- [x] Preserve responsive width and fixed bid action.
- [x] Open the existing PRO subscription dialog from the card.
- [x] Verify 390 × 844 rendering, interaction, overflow, and browser console.

**Follow-up Polish**

- None required for acceptance.

final result: passed
