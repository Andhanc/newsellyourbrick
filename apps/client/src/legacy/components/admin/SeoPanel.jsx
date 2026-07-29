import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FaCheckCircle,
  FaChevronRight,
  FaDownload,
  FaHistory,
  FaInfoCircle,
  FaRedo,
  FaRoute,
  FaSave,
  FaSearch,
  FaSitemap,
  FaShareAlt,
  FaTable,
  FaUndo,
  FaUpload,
} from 'react-icons/fa';
import {
  createSeoRedirect,
  deleteSeoRedirect,
  exportSeoCsv,
  fetchSeoChecks,
  fetchSeoHistory,
  fetchSeoMeta,
  fetchSeoPage,
  fetchSeoPages,
  fetchSeoRedirects,
  fetchSeoTemplates,
  importSeoCsv,
  refreshSitemap,
  rollbackSeoHistory,
  saveSeoPage,
  saveSeoTemplate,
} from '../../utils/seoAdminApi';
import './SeoPanel.css';

const TAB_GROUPS = [
  {
    label: 'Страницы',
    tabs: [
      { id: 'pages', label: 'Страницы', icon: FaTable },
      { id: 'seo', label: 'Мета-теги', icon: FaSearch },
      { id: 'social', label: 'Соцсети', icon: FaShareAlt },
      { id: 'sitemap', label: 'Sitemap', icon: FaSitemap },
      { id: 'history', label: 'История', icon: FaHistory },
    ],
  },
  {
    label: 'Настройки сайта',
    tabs: [
      { id: 'templates', label: 'Шаблоны', icon: FaRedo },
      { id: 'redirects', label: 'Редиректы', icon: FaRoute },
    ],
  },
  {
    label: 'Инструменты',
    tabs: [
      { id: 'checks', label: 'Проверки', icon: FaCheckCircle },
      { id: 'bulk', label: 'CSV', icon: FaTable },
    ],
  },
];

const TAB_HELP = {
  pages: {
    title: 'Список всех страниц сайта',
    text: 'Здесь все URL, которые видит Google: главная, аукцион, объекты, новости, каталоги по городам. Кликните по строке — откроется редактирование мета-тегов.',
  },
  seo: {
    title: 'Мета-теги конкретной страницы',
    text: 'Title и description попадают в выдачу Google. H1 — заголовок на странице. Canonical указывает «главный» URL. noindex скрывает страницу от индексации.',
  },
  social: {
    title: 'Превью в соцсетях и мессенджерах',
    text: 'Когда ссылку кидают в Telegram, WhatsApp или Facebook — показывается эта карточка. Если поля пустые, подставляются обычные title и description.',
  },
  sitemap: {
    title: 'Участие страницы в sitemap.xml',
    text: 'Sitemap подсказывает Google, какие страницы индексировать и как часто они меняются. Можно исключить служебные URL или задать приоритет важным.',
  },
  history: {
    title: 'Журнал изменений',
    text: 'Кто и когда менял SEO-настройки страницы. Админ SEO может откатить к предыдущей версии.',
  },
  templates: {
    title: 'Автоматические правила для новых страниц',
    text: 'Шаблоны применяются ко всем страницам типа «объект», «новость» и т.д., если для конкретного URL нет ручной правки. Переменные в фигурных скобках подставляются из данных объекта.',
  },
  redirects: {
    title: 'Перенаправления URL',
    text: '301 — постоянный редирект (старый URL переехал). 302 — временный. Используйте при смене структуры ссылок, чтобы не терять позиции в поиске.',
  },
  checks: {
    title: 'Автоматическая диагностика',
    text: 'Проверяет длину title/description, дубли, пустые поля, noindex на важных страницах. Исправляйте ошибки (красные) в первую очередь.',
  },
  bulk: {
    title: 'Массовое редактирование через CSV',
    text: 'Экспортируйте текущие переопределения, отредактируйте в Excel/Google Sheets и загрузите обратно. Удобно для сотен страниц.',
  },
};

const TEMPLATE_META = {
  property: {
    title: 'Карточки объектов',
    subtitle: '/property/villa-costa-brava-123',
    example: 'Вилла в Барселоне, 120 м², €350 000 | Sellyourbrick',
    vars: ['type', 'city', 'area', 'price', 'name'],
  },
  news: {
    title: 'Статьи новостей',
    subtitle: '/news/kak-kupit-nedvizhimost',
    example: 'Как купить недвижимость в Испании | Sellyourbrick',
    vars: ['title', 'excerpt'],
  },
  catalog: {
    title: 'Каталог по городам',
    subtitle: '/spain/barcelona/apartments',
    example: 'Купить квартиру в Барселоне, Испания | Sellyourbrick',
    vars: ['type', 'city', 'country'],
  },
  static: {
    title: 'Разделы сайта',
    subtitle: '/auction, /debts, /co-investment',
    example: 'Аукцион недвижимости в Испании | Sellyourbrick',
    vars: ['title', 'description'],
  },
};

const PAGE_TYPE_LABELS = {
  static: 'Раздел',
  property: 'Объект',
  'co-investment': 'Доля',
  'property-test-drive': 'Тест-драйв',
  news: 'Новость',
  catalog: 'Каталог',
  unknown: 'Другое',
};

const PAGE_TYPES = [
  { value: '', label: 'Все типы' },
  { value: 'static', label: 'Разделы сайта' },
  { value: 'property', label: 'Объекты' },
  { value: 'co-investment', label: 'Долевая недвижимость' },
  { value: 'news', label: 'Новости' },
  { value: 'catalog', label: 'Каталог по городам' },
];

const EMPTY_FORM = {
  title: '',
  meta_description: '',
  h1: '',
  canonical_path: '',
  robotsIndex: 'index',
  target_keywords: '',
  seo_notes: '',
  og_title: '',
  og_description: '',
  og_image: '',
  twitter_card: 'summary_large_image',
  sitemap_include: true,
  sitemap_priority: '',
  sitemap_changefreq: 'weekly',
};

const PAGE_EDIT_TABS = new Set(['seo', 'social', 'sitemap', 'history']);

function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('ru-RU');
}

function lengthStatus(len, min, max) {
  if (len === 0) return 'empty';
  if (len < min || len > max) return 'warn';
  return 'ok';
}

function LengthHint({ value, min, max, ideal }) {
  const len = String(value || '').length;
  const status = lengthStatus(len, min, max);
  return (
    <small className={`seo-length seo-length--${status}`}>
      {len} симв. · рекомендуется {ideal}
    </small>
  );
}

function TabHelp({ tabId }) {
  const help = TAB_HELP[tabId];
  if (!help) return null;
  return (
    <div className="seo-panel__help">
      <FaInfoCircle className="seo-panel__help-icon" aria-hidden />
      <div>
        <strong>{help.title}</strong>
        <p>{help.text}</p>
      </div>
    </div>
  );
}

const SeoPanel = () => {
  const [activeTab, setActiveTab] = useState('pages');
  const [showGuide, setShowGuide] = useState(true);
  const [meta, setMeta] = useState(null);
  const [pages, setPages] = useState([]);
  const [pagesMeta, setPagesMeta] = useState({ total: 0, offset: 0, limit: 200 });
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [pageType, setPageType] = useState('');
  const [selectedPath, setSelectedPath] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [redirects, setRedirects] = useState([]);
  const [checks, setChecks] = useState(null);
  const [history, setHistory] = useState([]);
  const [redirectForm, setRedirectForm] = useState({ from_path: '', to_path: '', status_code: 301 });
  const [importText, setImportText] = useState('');
  const [message, setMessage] = useState('');

  const showMsg = (text) => {
    setMessage(text);
    setTimeout(() => setMessage(''), 4000);
  };

  const loadMeta = useCallback(async () => {
    const data = await fetchSeoMeta();
    setMeta(data);
  }, []);

  const loadPages = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchSeoPages({
        q: query,
        pageType,
        offset: pagesMeta.offset,
        limit: pagesMeta.limit,
      });
      setPages(res.data || []);
      setPagesMeta(res.meta || { total: 0, offset: 0, limit: 200 });
    } finally {
      setLoading(false);
    }
  }, [query, pageType, pagesMeta.offset, pagesMeta.limit]);

  const loadPageDetail = useCallback(async (path) => {
    const data = await fetchSeoPage(path);
    setForm({
      title: data.title || '',
      meta_description: data.description || '',
      h1: data.h1 || '',
      canonical_path: data.canonical || path,
      robotsIndex: data.robotsIndex || 'index',
      target_keywords: data.targetKeywords || '',
      seo_notes: data.seoNotes || '',
      og_title: data.ogTitle || data.title || '',
      og_description: data.ogDescription || data.description || '',
      og_image: data.ogImage || '',
      twitter_card: data.twitterCard || 'summary_large_image',
      sitemap_include: data.sitemapInclude !== false,
      sitemap_priority: data.sitemapPriority ?? '',
      sitemap_changefreq: data.sitemapChangefreq || 'weekly',
      pageType: data.pageType,
    });
  }, []);

  useEffect(() => {
    void loadMeta();
  }, [loadMeta]);

  useEffect(() => {
    void loadPages();
  }, [loadPages]);

  useEffect(() => {
    if (!selectedPath) return;
    void loadPageDetail(selectedPath);
    if (activeTab === 'history') {
      void fetchSeoHistory(selectedPath).then(setHistory).catch(() => setHistory([]));
    }
  }, [selectedPath, activeTab, loadPageDetail]);

  useEffect(() => {
    if (activeTab === 'templates') {
      void fetchSeoTemplates().then(setTemplates).catch(() => setTemplates([]));
    }
    if (activeTab === 'redirects') {
      void fetchSeoRedirects().then(setRedirects).catch(() => setRedirects([]));
    }
    if (activeTab === 'checks') {
      void fetchSeoChecks().then(setChecks).catch(() => setChecks(null));
    }
  }, [activeTab]);

  const handleSelectPage = (path) => {
    setSelectedPath(path);
    if (activeTab === 'pages') setActiveTab('seo');
  };

  const handleSavePage = async () => {
    if (!selectedPath || !meta?.canEditPages) return;
    setSaving(true);
    try {
      await saveSeoPage(selectedPath, {
        ...form,
        robots_index: form.robotsIndex === 'noindex' ? 0 : 1,
        sitemap_include: form.sitemap_include ? 1 : 0,
        sitemap_priority: form.sitemap_priority === '' ? null : Number(form.sitemap_priority),
      });
      showMsg('Изменения сохранены и уже применяются на сайте');
      await loadPages();
    } catch (e) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };

  const socialPreview = useMemo(
    () => ({
      title: form.og_title || form.title || 'Заголовок ссылки',
      description: form.og_description || form.meta_description || 'Краткое описание для превью',
      image: form.og_image,
    }),
    [form],
  );

  const selectedPageRow = pages.find((p) => p.path === selectedPath);

  const renderPagePicker = () => (
    <aside className="seo-panel__sidebar">
      <div className="seo-panel__sidebar-head">
        <strong>Выбранная страница</strong>
        {selectedPath ? (
          <code className="seo-panel__sidebar-path">{selectedPath}</code>
        ) : (
          <span className="seo-panel__muted">Не выбрана</span>
        )}
      </div>
      <input
        className="seo-panel__search"
        placeholder="Быстрый поиск URL..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && void loadPages()}
      />
      <div className="seo-panel__sidebar-list">
        {loading ? (
          <div className="seo-panel__loading">Загрузка...</div>
        ) : (
          pages.slice(0, 80).map((row) => (
            <button
              key={row.path}
              type="button"
              className={`seo-panel__sidebar-item${selectedPath === row.path ? ' is-active' : ''}`}
              onClick={() => setSelectedPath(row.path)}
            >
              <span className="seo-panel__sidebar-item-type">
                {PAGE_TYPE_LABELS[row.pageType] || row.pageType}
              </span>
              <span className="seo-panel__sidebar-item-path">{row.path}</span>
              {row.hasOverride && <span className="seo-panel__sidebar-item-badge">правка</span>}
            </button>
          ))
        )}
      </div>
      <button type="button" className="btn btn-secondary seo-panel__sidebar-all" onClick={() => setActiveTab('pages')}>
        Открыть полный список ({pagesMeta.total})
      </button>
    </aside>
  );

  const renderPagesTab = () => (
    <div className="seo-panel__section">
      <div className="seo-panel__workflow">
        <span className="seo-panel__step is-done">1. Найдите страницу</span>
        <FaChevronRight size={10} aria-hidden />
        <span className="seo-panel__step">2. Кликните по строке</span>
        <FaChevronRight size={10} aria-hidden />
        <span className="seo-panel__step">3. Отредактируйте мета-теги</span>
        <FaChevronRight size={10} aria-hidden />
        <span className="seo-panel__step">4. Сохраните</span>
      </div>
      <div className="seo-panel__toolbar">
        <input
          className="seo-panel__search"
          placeholder="Поиск по URL, title или описанию..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && void loadPages()}
        />
        <select value={pageType} onChange={(e) => setPageType(e.target.value)}>
          {PAGE_TYPES.map((t) => (
            <option key={t.value || 'all'} value={t.value}>{t.label}</option>
          ))}
        </select>
        <button type="button" className="btn btn-primary" onClick={() => void loadPages()}>Найти</button>
        <span className="seo-panel__muted">Найдено: {pagesMeta.total}</span>
      </div>
      {loading ? (
        <div className="seo-panel__loading">Загрузка страниц...</div>
      ) : (
        <div className="seo-panel__table-wrap">
          <table className="seo-panel__table">
            <thead>
              <tr>
                <th>URL</th>
                <th>Тип</th>
                <th>Google</th>
                <th>Title в выдаче</th>
                <th>Description</th>
                <th>Обновлено</th>
              </tr>
            </thead>
            <tbody>
              {pages.map((row) => (
                <tr
                  key={row.path}
                  className={selectedPath === row.path ? 'is-selected' : ''}
                  onClick={() => handleSelectPage(row.path)}
                >
                  <td className="seo-panel__path">
                    {row.path}
                    {row.hasOverride && <span className="seo-panel__override-dot" title="Есть ручная правка" />}
                  </td>
                  <td>{PAGE_TYPE_LABELS[row.pageType] || row.pageType}</td>
                  <td>
                    <span className={`seo-badge seo-badge--${row.robotsIndex}`}>
                      {row.robotsIndex === 'noindex' ? 'скрыта' : 'в индексе'}
                    </span>
                  </td>
                  <td className="seo-panel__truncate" title={row.title}>{row.title || '—'}</td>
                  <td className="seo-panel__truncate" title={row.description}>{row.description || '—'}</td>
                  <td>{formatDate(row.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  const renderSeoForm = (mode = 'seo') => {
    if (!selectedPath) {
      return (
        <div className="seo-panel__empty-state">
          <p>Сначала выберите страницу слева или в списке «Страницы».</p>
          <button type="button" className="btn btn-primary" onClick={() => setActiveTab('pages')}>
            Перейти к списку страниц
          </button>
        </div>
      );
    }

    const readOnly = !meta?.canEditPages;
    const socialLocked = mode === 'social' && !meta?.canEditSocial;
    const sitemapLocked = mode === 'sitemap' && !meta?.canManageSitemap;
    const canSave = !readOnly && !(mode === 'social' && socialLocked) && !(mode === 'sitemap' && sitemapLocked);

    return (
      <div className="seo-panel__editor">
        <div className="seo-panel__editor-head">
          <div>
            <div className="seo-panel__editor-label">
              {PAGE_TYPE_LABELS[selectedPageRow?.pageType || form.pageType] || 'Страница'}
            </div>
            <h3>{selectedPath}</h3>
            {selectedPageRow?.label && (
              <p className="seo-panel__muted">{selectedPageRow.label}</p>
            )}
          </div>
          {canSave && (
            <button type="button" className="btn btn-primary" disabled={saving} onClick={() => void handleSavePage()}>
              <FaSave /> {saving ? 'Сохранение...' : 'Сохранить'}
            </button>
          )}
        </div>

        {mode === 'seo' && (
          <div className="seo-panel__form-grid">
            <label>
              Title — заголовок в Google
              <input
                value={form.title}
                disabled={readOnly}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Вилла в Барселоне, 120 м², €350 000 | Sellyourbrick"
              />
              <LengthHint value={form.title} min={30} max={65} ideal="30–60" />
            </label>
            <label>
              Meta description — текст под заголовком в поиске
              <textarea
                rows={3}
                value={form.meta_description}
                disabled={readOnly}
                onChange={(e) => setForm((f) => ({ ...f, meta_description: e.target.value }))}
                placeholder="Краткое описание объекта или раздела для поисковой выдачи"
              />
              <LengthHint value={form.meta_description} min={70} max={165} ideal="120–160" />
            </label>
            <label>
              H1 — главный заголовок на странице
              <input
                value={form.h1}
                disabled={readOnly}
                onChange={(e) => setForm((f) => ({ ...f, h1: e.target.value }))}
              />
            </label>
            <label>
              Canonical — основной URL страницы
              <input
                value={form.canonical_path}
                disabled={readOnly}
                onChange={(e) => setForm((f) => ({ ...f, canonical_path: e.target.value }))}
                placeholder="/property/villa-costa-brava-123"
              />
              <small className="seo-panel__muted">Обычно совпадает с URL страницы</small>
            </label>
            <label>
              Индексация в Google
              <select
                value={form.robotsIndex}
                disabled={readOnly}
                onChange={(e) => setForm((f) => ({ ...f, robotsIndex: e.target.value }))}
              >
                <option value="index">Показывать в поиске (index)</option>
                <option value="noindex">Скрыть от поиска (noindex)</option>
              </select>
            </label>
            <label>
              Целевые ключевые слова
              <input
                value={form.target_keywords}
                disabled={readOnly}
                onChange={(e) => setForm((f) => ({ ...f, target_keywords: e.target.value }))}
                placeholder="купить квартиру барселона, недвижимость испания"
              />
              <small className="seo-panel__muted">Для внутренних заметок команды, не видны пользователям</small>
            </label>
            <label className="seo-panel__full">
              SEO-заметки команды
              <textarea
                rows={2}
                value={form.seo_notes}
                disabled={readOnly}
                onChange={(e) => setForm((f) => ({ ...f, seo_notes: e.target.value }))}
                placeholder="Например: ждём фото, обновить после публикации"
              />
            </label>
          </div>
        )}

        {mode === 'social' && (
          <div className="seo-panel__form-grid seo-panel__form-grid--social">
            <label>
              OG title — заголовок в превью
              <input
                value={form.og_title}
                disabled={socialLocked}
                onChange={(e) => setForm((f) => ({ ...f, og_title: e.target.value }))}
                placeholder="Если пусто — берётся обычный title"
              />
            </label>
            <label>
              OG description
              <textarea
                rows={3}
                value={form.og_description}
                disabled={socialLocked}
                onChange={(e) => setForm((f) => ({ ...f, og_description: e.target.value }))}
                placeholder="Если пусто — берётся meta description"
              />
            </label>
            <label>
              OG image — картинка превью (URL)
              <input
                value={form.og_image}
                disabled={socialLocked}
                onChange={(e) => setForm((f) => ({ ...f, og_image: e.target.value }))}
                placeholder="https://sellyourbrick.com/uploads/..."
              />
            </label>
            <label>
              Формат Twitter / Telegram card
              <select
                value={form.twitter_card}
                disabled={socialLocked}
                onChange={(e) => setForm((f) => ({ ...f, twitter_card: e.target.value }))}
              >
                <option value="summary_large_image">Большая картинка (рекомендуется)</option>
                <option value="summary">Маленькая картинка</option>
              </select>
            </label>
            <div className="seo-panel__og-preview seo-panel__full">
              <h4>Как увидят ссылку в Telegram / WhatsApp</h4>
              <div className="seo-og-card">
                {socialPreview.image ? (
                  <img src={socialPreview.image} alt="" className="seo-og-card__img" />
                ) : (
                  <div className="seo-og-card__img seo-og-card__img--placeholder">Здесь будет картинка</div>
                )}
                <div className="seo-og-card__body">
                  <div className="seo-og-card__site">sellyourbrick.com</div>
                  <div className="seo-og-card__title">{socialPreview.title}</div>
                  <div className="seo-og-card__desc">{socialPreview.description}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {mode === 'sitemap' && (
          <div className="seo-panel__form-grid">
            <label className="seo-panel__checkbox seo-panel__full">
              <input
                type="checkbox"
                checked={form.sitemap_include}
                disabled={sitemapLocked}
                onChange={(e) => setForm((f) => ({ ...f, sitemap_include: e.target.checked }))}
              />
              Включить эту страницу в sitemap.xml
            </label>
            <label>
              Приоритет (0.0 – 1.0)
              <input
                type="number"
                min="0"
                max="1"
                step="0.05"
                value={form.sitemap_priority}
                disabled={sitemapLocked}
                onChange={(e) => setForm((f) => ({ ...f, sitemap_priority: e.target.value }))}
                placeholder="0.8 для объектов, 1.0 для главной"
              />
            </label>
            <label>
              Как часто меняется
              <select
                value={form.sitemap_changefreq}
                disabled={sitemapLocked}
                onChange={(e) => setForm((f) => ({ ...f, sitemap_changefreq: e.target.value }))}
              >
                <option value="daily">Ежедневно</option>
                <option value="weekly">Еженедельно</option>
                <option value="monthly">Ежемесячно</option>
                <option value="yearly">Редко</option>
              </select>
            </label>
            {meta?.canManageSitemap && (
              <div className="seo-panel__full">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => void refreshSitemap().then((r) => showMsg(r.message || 'Sitemap обновится при следующем запросе'))}
                >
                  Запросить обновление sitemap
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderTemplates = () => (
    <div className="seo-panel__section">
      {!meta?.canEditTemplates ? (
        <p className="seo-panel__hint">Шаблоны доступны роли «Маркетолог» и «Админ SEO».</p>
      ) : (
        <div className="seo-panel__templates">
          {templates.map((tpl) => {
            const info = TEMPLATE_META[tpl.page_type] || {
              title: tpl.page_type,
              subtitle: '',
              example: '',
              vars: ['type', 'city', 'area', 'price', 'name', 'title', 'country', 'excerpt'],
            };
            return (
              <div key={tpl.page_type} className="seo-panel__template-card">
                <div className="seo-panel__template-head">
                  <h4>{info.title}</h4>
                  {info.subtitle && <code>{info.subtitle}</code>}
                </div>
                {info.example && (
                  <p className="seo-panel__template-example">
                    <span>Пример:</span> {info.example}
                  </p>
                )}
                <label>
                  Шаблон Title
                  <input defaultValue={tpl.title_template || ''} id={`tpl-title-${tpl.page_type}`} />
                </label>
                <label>
                  Шаблон Description
                  <textarea rows={2} defaultValue={tpl.description_template || ''} id={`tpl-desc-${tpl.page_type}`} />
                </label>
                <label>
                  Шаблон H1
                  <input defaultValue={tpl.h1_template || ''} id={`tpl-h1-${tpl.page_type}`} />
                </label>
                <div className="seo-panel__vars">
                  {info.vars.map((v) => (
                    <span key={v} className="seo-panel__var">{`{${v}}`}</span>
                  ))}
                </div>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    const title_template = document.getElementById(`tpl-title-${tpl.page_type}`)?.value;
                    const description_template = document.getElementById(`tpl-desc-${tpl.page_type}`)?.value;
                    const h1_template = document.getElementById(`tpl-h1-${tpl.page_type}`)?.value;
                    void saveSeoTemplate(tpl.page_type, { title_template, description_template, h1_template })
                      .then(() => showMsg(`Шаблон «${info.title}» сохранён`))
                      .catch((e) => alert(e.message));
                  }}
                >
                  Сохранить шаблон
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  const renderRedirects = () => (
    <div className="seo-panel__section">
      {!meta?.canManageRedirects ? (
        <p className="seo-panel__hint">Редиректы доступны только роли «Админ SEO».</p>
      ) : (
        <>
          <div className="seo-panel__redirect-form">
            <input
              placeholder="Откуда: /старый-url"
              value={redirectForm.from_path}
              onChange={(e) => setRedirectForm((f) => ({ ...f, from_path: e.target.value }))}
            />
            <span className="seo-panel__redirect-arrow">→</span>
            <input
              placeholder="Куда: /новый-url"
              value={redirectForm.to_path}
              onChange={(e) => setRedirectForm((f) => ({ ...f, to_path: e.target.value }))}
            />
            <select
              value={redirectForm.status_code}
              onChange={(e) => setRedirectForm((f) => ({ ...f, status_code: Number(e.target.value) }))}
            >
              <option value={301}>301 — навсегда</option>
              <option value={302}>302 — временно</option>
            </select>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                void createSeoRedirect(redirectForm)
                  .then(() => {
                    setRedirectForm({ from_path: '', to_path: '', status_code: 301 });
                    return fetchSeoRedirects();
                  })
                  .then(setRedirects)
                  .then(() => showMsg('Редирект добавлен'))
                  .catch((e) => alert(e.message));
              }}
            >
              Добавить
            </button>
          </div>
          <table className="seo-panel__table">
            <thead>
              <tr>
                <th>Старый URL</th>
                <th>Новый URL</th>
                <th>Тип</th>
                <th>Кто создал</th>
                <th>Дата</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {redirects.length === 0 ? (
                <tr><td colSpan={6} className="seo-panel__hint">Редиректов пока нет</td></tr>
              ) : redirects.map((r) => (
                <tr key={r.id}>
                  <td className="seo-panel__path">{r.from_path}</td>
                  <td className="seo-panel__path">{r.to_path}</td>
                  <td>{r.status_code}</td>
                  <td>{r.created_by || '—'}</td>
                  <td>{formatDate(r.created_at)}</td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-icon btn-delete"
                      onClick={() => {
                        if (!window.confirm('Удалить редирект?')) return;
                        void deleteSeoRedirect(r.id).then(() => fetchSeoRedirects()).then(setRedirects);
                      }}
                    >
                      ×
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );

  const renderBulk = () => (
    <div className="seo-panel__section">
      <div className="seo-panel__bulk-actions">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => void exportSeoCsv().then((csv) => {
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'seo-overrides.csv';
            a.click();
            URL.revokeObjectURL(url);
          })}
        >
          <FaDownload /> Скачать CSV
        </button>
      </div>
      {meta?.canBulkEdit ? (
        <>
          <label className="seo-panel__full">
            Вставьте CSV или загрузите файл
            <textarea
              rows={8}
              placeholder="path,title,meta_description,h1,canonical_path,robots_index..."
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
            />
          </label>
          <div className="seo-panel__bulk-actions">
            <label className="btn btn-secondary">
              <FaUpload /> Выбрать файл
              <input
                type="file"
                accept=".csv,text/csv"
                hidden
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () => setImportText(String(reader.result || ''));
                  reader.readAsText(file);
                }}
              />
            </label>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                void importSeoCsv(importText)
                  .then((r) => showMsg(`Импортировано строк: ${r.imported}`))
                  .catch((e) => alert(e.message));
              }}
            >
              Импортировать
            </button>
          </div>
        </>
      ) : (
        <p className="seo-panel__hint">Импорт доступен ролям с правом редактирования.</p>
      )}
    </div>
  );

  const renderChecks = () => (
    <div className="seo-panel__section">
      {!checks ? (
        <div className="seo-panel__loading">Запуск проверок...</div>
      ) : (
        <>
          <div className="seo-panel__checks-summary">
            <div className="seo-panel__check-stat seo-panel__check-stat--error">
              <strong>{checks.summary.errors}</strong>
              <span>ошибок</span>
            </div>
            <div className="seo-panel__check-stat seo-panel__check-stat--warn">
              <strong>{checks.summary.warnings}</strong>
              <span>предупреждений</span>
            </div>
            <div className="seo-panel__check-stat">
              <strong>{checks.summary.checked}</strong>
              <span>страниц проверено</span>
            </div>
          </div>
          {checks.issues.length === 0 ? (
            <p className="seo-panel__hint seo-panel__hint--ok">Критичных проблем не найдено.</p>
          ) : (
            <table className="seo-panel__table">
              <thead>
                <tr>
                  <th>Страница</th>
                  <th>Уровень</th>
                  <th>Что не так</th>
                </tr>
              </thead>
              <tbody>
                {checks.issues.map((issue, idx) => (
                  <tr key={`${issue.path}-${idx}`} className={`seo-check--${issue.severity}`}>
                    <td className="seo-panel__path">{issue.path}</td>
                    <td>{issue.severity === 'error' ? 'Ошибка' : 'Внимание'}</td>
                    <td>{issue.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </div>
  );

  const renderHistory = () => {
    if (!selectedPath) {
      return (
        <div className="seo-panel__empty-state">
          <p>Выберите страницу, чтобы увидеть историю её изменений.</p>
        </div>
      );
    }
    return (
      <div className="seo-panel__section">
        <p className="seo-panel__muted">История для <code>{selectedPath}</code></p>
        <table className="seo-panel__table">
          <thead>
            <tr>
              <th>Дата</th>
              <th>Кто</th>
              <th>Действие</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {history.length === 0 ? (
              <tr><td colSpan={4} className="seo-panel__hint">Изменений пока не было</td></tr>
            ) : history.map((h) => (
              <tr key={h.id}>
                <td>{formatDate(h.changed_at)}</td>
                <td>{h.changed_by || '—'}</td>
                <td>{h.action === 'rollback' ? 'Откат' : h.action === 'create' ? 'Создание' : 'Изменение'}</td>
                <td>
                  {meta?.canRollbackHistory && (
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => {
                        if (!window.confirm('Вернуть SEO-настройки к этой версии?')) return;
                        void rollbackSeoHistory(h.id)
                          .then(() => loadPageDetail(selectedPath))
                          .then(() => fetchSeoHistory(selectedPath))
                          .then(setHistory)
                          .then(() => showMsg('Версия восстановлена'));
                      }}
                    >
                      <FaUndo /> Откатить
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const roleLabel =
    meta?.role === 'admin' ? 'Админ SEO' : meta?.role === 'marketer' ? 'Маркетолог' : 'Редактор';

  const needsSidebar = PAGE_EDIT_TABS.has(activeTab);

  return (
    <div className="seo-panel">
      <div className="seo-panel__header">
        <div>
          <h2>SEO-кабинет</h2>
          <p className="seo-panel__muted">
            Управляйте тем, как сайт выглядит в Google и в соцсетях
          </p>
        </div>
        {meta && <span className="seo-panel__role-badge">Ваша роль: {roleLabel}</span>}
      </div>

      {showGuide && (
        <div className="seo-panel__guide">
          <div>
            <strong>Быстрый старт</strong>
            <ol>
              <li>Откройте <button type="button" className="seo-panel__inline-link" onClick={() => setActiveTab('pages')}>Страницы</button> и найдите нужную</li>
              <li>Нажмите на строку → откроются <strong>Мета-теги</strong></li>
              <li>Отредактируйте title и description → <strong>Сохранить</strong></li>
              <li>Проверьте результат во вкладке <button type="button" className="seo-panel__inline-link" onClick={() => setActiveTab('checks')}>Проверки</button></li>
            </ol>
          </div>
          <button type="button" className="seo-panel__guide-close" onClick={() => setShowGuide(false)} aria-label="Скрыть подсказку">×</button>
        </div>
      )}

      {message && <div className="seo-panel__toast">{message}</div>}

      <nav className="seo-panel__tabs" aria-label="Разделы SEO-кабинета">
        {TAB_GROUPS.map((group) => (
          <div key={group.label} className="seo-panel__tab-group">
            <span className="seo-panel__tab-group-label">{group.label}</span>
            <div className="seo-panel__tab-group-items">
              {group.tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    className={`seo-panel__tab${activeTab === tab.id ? ' is-active' : ''}`}
                    onClick={() => setActiveTab(tab.id)}
                  >
                    <Icon size={13} aria-hidden />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <TabHelp tabId={activeTab} />

      <div className={`seo-panel__layout${needsSidebar ? ' seo-panel__layout--split' : ''}`}>
        {needsSidebar && renderPagePicker()}
        <div className="seo-panel__content">
          {activeTab === 'pages' && renderPagesTab()}
          {activeTab === 'seo' && renderSeoForm('seo')}
          {activeTab === 'social' && renderSeoForm('social')}
          {activeTab === 'sitemap' && renderSeoForm('sitemap')}
          {activeTab === 'templates' && renderTemplates()}
          {activeTab === 'redirects' && renderRedirects()}
          {activeTab === 'bulk' && renderBulk()}
          {activeTab === 'checks' && renderChecks()}
          {activeTab === 'history' && renderHistory()}
        </div>
      </div>
    </div>
  );
};

export default SeoPanel;
