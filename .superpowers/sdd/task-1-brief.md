### Task 1: Lock the component contract with a failing structure test

**Files:**
- Create: `src/components/HomeSaleFormats.layout.test.js`
- Create: `src/components/HomeSaleFormats.jsx`
- Create: `src/components/HomeSaleFormats.css`

**Interfaces:**
- Consumes: `modes: Array<{ id, number, eyebrow, benefit, proof, to, image }>`.
- Produces: `HomeSaleFormats({ modes })`, a section with one route link per mode.

- [ ] **Step 1: Write the failing test**

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const jsx = await readFile(new URL('./HomeSaleFormats.jsx', import.meta.url), 'utf8')
const css = await readFile(new URL('./HomeSaleFormats.css', import.meta.url), 'utf8')

test('renders each format as one fully clickable route card', () => {
  assert.match(jsx, /sale-formats__card/)
  assert.match(jsx, /to=\{mode\.to\}/)
  assert.match(jsx, /Смотреть объекты/)
})

test('provides mobile scroll snap, focus visibility, and reduced motion', () => {
  assert.match(css, /scroll-snap-type:\s*x mandatory/)
  assert.match(css, /\.sale-formats__card:focus-visible/)
  assert.match(css, /prefers-reduced-motion:\s*reduce/)
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test src/components/HomeSaleFormats.layout.test.js`

Expected: FAIL because `HomeSaleFormats.jsx` and `HomeSaleFormats.css` do not exist.

- [ ] **Step 3: Create the minimal semantic component and stylesheet**

Implement one `<Link className="sale-formats__card" to={mode.to}>` per mode, semantic heading order, benefit/proof text, a decorative image with meaningful alt text, CTA label, focus styles, mobile scroll snap, and reduced-motion rules.

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test src/components/HomeSaleFormats.layout.test.js`

Expected: 2 tests pass.

