# Mobile Hero Search Drawer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a compact mobile hero catalog action with an inline animated filters drawer while preserving the desktop search.

**Architecture:** `HeroSearchBar` renders separate desktop and mobile forms so their defaults and responsive layouts remain independent. Both reuse `buildHeroSearchNavigation`, which treats an empty mobile selection as an unfiltered catalog request.

**Tech Stack:** React 19, React Router, react-icons, CSS media queries, Node test runner.

## Global Constraints

- Do not change the desktop search experience.
- Do not add free-text search semantics to the empty mobile field.
- Do not start test, build, preview, or development processes; the user will test.

---

### Task 1: Define the mobile search contract

**Files:**
- Modify: `src/pages/home-redesign/HomeRedesignPage.mobile-search.test.js`

**Interfaces:**
- Consumes: `HomeRedesignPage.jsx`, `HomeRedesignPage.css`, `buildHeroSearchNavigation(filters)`
- Produces: assertions for mobile copy, drawer accessibility, animation selectors, and empty-filter catalog state

- [ ] Replace the old one-row mobile assertions with the new mobile form and drawer contract.
- [ ] Add a runtime assertion that empty filters produce blank catalog constraints.
- [ ] Do not run the test process per the user’s instruction.

### Task 2: Implement independent mobile search behavior

**Files:**
- Modify: `src/pages/home-redesign/HomeRedesignPage.jsx`
- Modify: `src/utils/heroSearchFilters.js`

**Interfaces:**
- Consumes: the existing filter option arrays and `onNavigate(pathname, options)` callback
- Produces: desktop form with existing defaults; mobile form with empty defaults and accessible drawer state

- [ ] Add separate empty mobile filter state and drawer open state.
- [ ] Keep the existing desktop form and submit behavior.
- [ ] Add the read-only search shell, “Найдём всё!” action, filter toggle, four selects, and “Найти” action.
- [ ] Make empty price selection produce blank price bounds.

### Task 3: Style responsive layout and motion

**Files:**
- Modify: `src/pages/home-redesign/HomeRedesignPage.css`

**Interfaces:**
- Consumes: `hr-search-bar--desktop`, `hr-search-bar--mobile`, and `hr-search-mobile__*` class names
- Produces: desktop/mobile visibility split and animated inline drawer below 600px

- [ ] Hide the mobile form by default and show it below 600px.
- [ ] Replace the old four-cell mobile layout with the primary row, toggle, two-column field grid, and drawer footer.
- [ ] Add open/closed transitions and reduced-motion overrides.
- [ ] Do not run visual or automated verification processes per the user’s instruction.
