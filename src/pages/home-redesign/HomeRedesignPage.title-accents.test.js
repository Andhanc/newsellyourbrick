import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const newsJsx = await readFile(new URL('./HomeRedesignNewsSection.jsx', import.meta.url), 'utf8')
const newsCss = await readFile(new URL('./HomeRedesignNewsSection.css', import.meta.url), 'utf8')
const questionsJsx = await readFile(
  new URL('../../components/InvestorQuestionsSection.jsx', import.meta.url),
  'utf8',
)
const homeCss = await readFile(new URL('./HomeRedesignPage.css', import.meta.url), 'utf8')

test('highlights the localized news word inside the news heading', () => {
  assert.match(newsJsx, /splitTitleAccent\(t\('sybLandingNewsTitle'\), t\('news'\)\)/)
  assert.match(newsJsx, /className="hr-editorial-news__title-accent"/)
  assert.match(
    newsCss,
    /\.hr-editorial-news__title-accent\s*\{[\s\S]*?display:\s*inline-block[\s\S]*?margin:\s*0 0\.08em[\s\S]*?padding:\s*0\.08em 0\.52em 0\.14em[\s\S]*?border-radius:\s*999px[\s\S]*?background:\s*var\(--hr-brand-gradient\)[\s\S]*?color:\s*#ffffff[\s\S]*?font-weight:\s*800[\s\S]*?line-height:\s*1\.05[\s\S]*?box-shadow:\s*var\(--hr-brand-shadow\), inset 0 1px 0 var\(--hr-brand-ring\)[\s\S]*?transform:\s*rotate\(-2deg\)/,
  )
})

test('highlights only the word questions on the redesigned home page', () => {
  assert.match(
    questionsJsx,
    /Остались\{' '\}<span className="invest-questions__title-accent">вопросы\?<\/span>/,
  )
  assert.match(
    homeCss,
    /\.hr-page \.invest-questions__title-accent\s*\{[\s\S]*?display:\s*inline-block[\s\S]*?margin:\s*0 0\.08em[\s\S]*?padding:\s*0\.08em 0\.52em 0\.14em[\s\S]*?border-radius:\s*999px[\s\S]*?background:\s*var\(--hr-brand-gradient\)[\s\S]*?color:\s*#ffffff[\s\S]*?font-weight:\s*800[\s\S]*?line-height:\s*1\.05[\s\S]*?box-shadow:\s*var\(--hr-brand-shadow\), inset 0 1px 0 var\(--hr-brand-ring\)[\s\S]*?transform:\s*rotate\(-2deg\)/,
  )
})
