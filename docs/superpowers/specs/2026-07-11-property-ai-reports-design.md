# Property AI reports

## Goal

Add an authenticated, property-specific AI experience to the property detail page. A user selects one of four analysis scenarios, receives a concise answer in a full-screen chat, waits up to roughly 40 seconds, and receives a polished 6–8 page PDF report built from the listing's real data and images.

## User experience

The property page ends with a black “Недвижимость AI” launcher matching the supplied references. It opens a black scenario picker with the property's thumbnails and these actions:

- Плюсы и риски
- Инвестиционный потенциал
- Подробный разбор
- Свой вопрос

Guests can see the launcher but must authenticate before generation. The selected action resumes after authentication.

The analysis opens in a light, full-screen chat. It shows the property card, user question, a concise AI response, real progress states, and finally a PDF card with open and download actions. History is scoped to the authenticated user and property. Existing completed reports reopen without another model request.

## AI and report generation

OpenRouter model: `google/gemini-3.5-flash` by default, configured independently from the general site assistant.

The server loads authoritative property data and passes the listing facts and a limited set of real listing photos to the model. The model returns strict structured JSON containing:

- concise chat answer;
- report title and summary;
- strengths and risks;
- metrics and explicitly labeled assumptions;
- page sections for a 6–8 page report;
- conclusion and follow-up questions.

The model never supplies executable HTML. The server validates and normalizes the JSON, escapes all content, and renders it through a controlled branded HTML/CSS template. Puppeteer prints the template to PDF. Generated or imaginary property imagery is prohibited; only listing photos, a map when available, and deterministic charts/graphics are used.

Investment calculations use listing data and transparent assumptions only. They are labeled as estimates and not financial or legal advice.

## Architecture

Frontend units:

- `PropertyAiExperience` owns launcher, scenario picker, chat, polling, history, and PDF actions.
- `propertyAiService` owns API calls and response normalization.
- Responsive CSS follows the supplied mobile references and integrates into the existing desktop detail composition.

Server units:

- property AI routes enforce existing authentication and ownership;
- a generation service builds the prompt, calls OpenRouter, validates the structured response, and advances job state;
- a PDF renderer owns safe HTML/CSS and Puppeteer output;
- a persistence module stores conversations, messages, report JSON, status, model metadata, errors, and PDF bytes.

The client starts a job and polls its status. Statuses are `queued`, `analyzing`, `rendering`, `completed`, and `failed`. The API may expose the short answer as soon as analysis completes, before PDF rendering finishes.

## Persistence and API

Data is scoped by numeric authenticated user ID and property ID. Initial storage uses PostgreSQL, including PDF bytes, so reports survive Railway restarts without an additional object-storage dependency. The storage boundary permits a later move to S3/R2.

Required operations:

- list property conversations/reports for the current user;
- load a conversation and its messages;
- start an analysis;
- poll report status;
- open or download a completed PDF.

The server reloads the property from the database and does not trust property facts sent by the browser. PDF routes require report ownership. External image URLs are allowlisted and fetched with timeouts and size limits.

## Failure handling

- Authentication failure opens the existing login flow.
- Provider timeouts or malformed JSON mark the job failed and show retry UI.
- PDF rendering failure preserves the generated answer and allows PDF-only retry without another model call.
- Missing images fall back to a branded property-data page.
- Duplicate starts for the same user, property, and question reuse an active or recently completed job.
- Model and renderer timeouts prevent indefinitely stuck jobs.

## Testing

- Unit tests cover category prompts, schema validation, escaping, report normalization, ownership checks, and status transitions.
- Route tests cover authentication, start, polling, history, and PDF access.
- Renderer tests assert a valid PDF signature and non-empty output.
- Frontend tests cover launcher, login gating, category selection, polling states, retry, history, and PDF actions.
- Manual responsive QA checks the supplied mobile interaction and desktop placement.

## Initial scope exclusions

- comparing with favorites;
- live external rental or market data;
- AI-generated property images;
- third-party presentation services;
- editing generated reports.
