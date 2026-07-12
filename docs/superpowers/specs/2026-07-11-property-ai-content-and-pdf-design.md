# Property AI Content and PDF Design

## Goal

Make Property AI useful for arbitrary listing questions, always surface concrete strengths and risks, and generate a richer SellYourBrick-branded PDF that reliably includes the listing's real images plus one clearly labelled AI-generated 3D concept.

## Current-State Findings

1. `requestPropertyAiModel` sends only image URLs beginning with `https://`. Most uploaded listing photos are stored as relative `/uploads/...` paths, so the vision model never receives them.
2. PDF HTML is loaded with Puppeteer's `page.setContent()`. Its document URL is `about:blank`, so relative `/uploads/...` and `/images/...` sources have no origin and cannot load.
3. The model may return a short generic `shortAnswer`; the chat renders only that string even though the normalized report already contains structured `strengths` and `risks`.
4. The current PDF has six mostly generic pages and no dedicated photo gallery or explicitly separated generated visual.
5. The screenshot showing the legacy yellow template was produced by a backend process started at 00:36, before the renderer changes at 16:35. Stored PDF bytes are immutable, so opening that history item continues to show the legacy design.

## Neighborhood and Infrastructure

- Parse listing coordinates from JSON arrays, objects, or comma-separated strings.
- Query the existing OpenStreetMap/Overpass nearby-place service for schools, transport, medical services, recreation, and shops within 1.5 km.
- Store names and approximate straight-line distances as verified infrastructure facts passed to the model.
- Permit detailed interpretations only when grounded in those facts. Prefix interpretive claims with `Возможный вывод:` and keep them separate from verified place names and distances.
- If coordinates or Overpass data are unavailable, say so and provide a checklist for manual neighborhood verification instead of inventing amenities.
- Add a dedicated `Район и инфраструктура` PDF page. Reports contain 8 pages without listing photos and 9 pages with a real-photo gallery.

## Answer Contract

- The model must answer the user's exact question first in 2–4 sentences.
- Every report must contain at least two strengths and two risks.
- Strengths must be supported by listing data. If the listing lacks qualitative advantages, factual data availability (for example, declared area or multiple real photos) may be presented as useful decision input, not as an invented property advantage.
- Risks are worded as checks, missing data, or assumptions rather than accusations.
- The chat renders the direct answer plus compact `Плюсы` and `Риски` groups from the normalized report.
- Custom questions continue through the same report pipeline and receive the same structured answer.

## Image Pipeline

- Normalize string and object photo entries at the property-loading boundary.
- Resolve relative listing image paths against `FRONTEND_URL`, falling back to the running server origin.
- Send up to four resolved real listing photos to the multimodal model.
- Add a safe `<base href>` to PDF HTML so relative listing images load under Puppeteer.
- Wait for image elements to reach a loaded or failed state before printing, rather than relying only on network-idle timing.
- Keep real listing photos and generated concepts in separate fields and presentation sections.

## Generated 3D Concept

- Ask the model for a short English `visualPrompt` grounded only in declared property type, layout, materials, and condition.
- Build one Pollinations URL using the existing image-generation helper.
- Never use the generated concept as the cover or as evidence about the listing.
- Render it on a dedicated page labelled `AI-КОНЦЕПТ · НЕ ФОТО ОБЪЕКТА` with an explanatory note.
- If the generated image fails to load, keep the page useful with a branded CSS placeholder; PDF creation must still succeed.

## PDF Structure

The normalized report contains seven or eight pages:

1. Cover with the first real listing photo.
2. Property passport with 4–8 metrics and a second real photo.
3. Strengths and risks with at least two items in each column.
4. Direct answer to the user's question with supporting bullets.
5. Real-photo gallery using up to four listing photos.
6. Detailed analysis and checks.
7. Labelled AI-generated 3D concept.
8. Conclusion, assumptions, and disclaimer.

When no listing image exists, the gallery is omitted and the report remains seven pages.

## Visual System

- Tiffany: `#0099A9`
- Ink: `#0F172A`
- Tiffany soft: `#F0FAFB`
- Surface: `#FFFFFF`
- Muted text: `#64748B`
- Lines: `#E2E8F0`
- White text and icons on solid Tiffany.
- Real photos remain visually dominant; generated imagery is isolated and labelled.

## Failure Handling

- A generated-visual failure does not fail the report.
- A single broken listing photo does not fail the report; other images and branded placeholders remain.
- Model output is normalized with deterministic fallbacks for missing strengths, risks, metrics, sections, and answer text.
- Existing PDF-generation failure handling remains unchanged.

## Verification

- Contract tests verify minimum strengths/risks, richer page composition, and safe real-image preservation.
- model-request tests verify relative listing paths become absolute multimodal image URLs.
- renderer tests verify the base URL, gallery, branded palette, generated-concept label, and image-settling logic.
- component source tests verify structured strengths and risks are rendered in chat.
- Run the focused Property AI test suite and the production build.
