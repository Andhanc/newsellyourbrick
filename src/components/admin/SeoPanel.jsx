import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
import { getUiIntlLocale } from '../../utils/uiIntlLocale'

const TAB_GROUPS_DEF = [
  {
    labelKey: 'admin_pages',
    tabs: [
      { id: 'pages', labelKey: 'admin_pages', icon: FaTable },
      { id: 'seo', labelKey: 'admin_metaTags', icon: FaSearch },
      { id: 'social', labelKey: 'admin_social', icon: FaShareAlt },
      { id: 'sitemap', labelKey: 'admin_seo_sitemap', icon: FaSitemap },
      { id: 'history', labelKey: 'admin_history', icon: FaHistory },
    ],
  },
  {
    labelKey: 'admin_siteSettings',
    tabs: [
      { id: 'templates', labelKey: 'admin_templates', icon: FaRedo },
      { id: 'redirects', labelKey: 'admin_redirects', icon: FaRoute },
    ],
  },
  {
    labelKey: 'admin_seo_tools',
    tabs: [
      { id: 'checks', labelKey: 'admin_seo_checks', icon: FaCheckCircle },
      { id: 'bulk', labelKey: 'admin_seo_csv', icon: FaTable },
    ],
  },
];

const TAB_HELP_DEF = {
  pages: {
    titleKey: 'admin_spisok_vseh_stranic_sayta_f3a81a36',
    textKey: 'admin_zdes_vse__kotorye_ea26a633',
  },
  seo: {
    titleKey: 'admin_meta_tegi_konkretnoy_stranicy_35e691b1',
    textKey: 'admin_itle_i_description_popadayut_aa2d71c6',
  },
  social: {
    titleKey: 'admin_prevyu_v_socsetyah_i_0272f97e',
    textKey: 'admin_kogda_ssylku_kidayut_v_5d18ea77',
  },
  sitemap: {
    titleKey: 'admin_uchastie_stranicy_v_sitemap_cb2afa47',
    textKey: 'admin_itemap_podskazyvaet_oogle_kakie_ff22ed00',
  },
  history: {
    titleKey: 'admin_zhurnal_izmeneniy_e7743438',
    textKey: 'admin_kto_i_kogda_menyal_1aa07d37',
  },
  templates: {
    titleKey: 'admin_avtomaticheskie_pravila_dlya_novyh_8d2dfb05',
    textKey: 'admin_shablony_primenyayutsya_ko_vsem_e7fea09e',
  },
  redirects: {
    titleKey: 'admin_perenapravleniya__c0a2269a',
    textKey: 'admin_301_postoyannyy_redirekt_staryy_2d40afdf',
  },
  checks: {
    titleKey: 'admin_avtomaticheskaya_diagnostika_6653db90',
    textKey: 'admin_proveryaet_dlinu_title_description_4fe035c2',
  },
  bulk: {
    titleKey: 'admin_massovoe_redaktirovanie_cherez__7015bc76',
    textKey: 'admin_eksportiruyte_tekuschie_pereopredele_377c1489',
  },
};

const TEMPLATE_META = {
  property: {
    title: t('admin_kartochki_obektov_6ea01b11'),
    subtitle: '/property/villa-costa-brava-123',
    example: t('admin_villa_v_barselone_120_eec97a7d'),
    vars: ['type', 'city', 'area', 'price', 'name'],
  },
  news: {
    title: t('admin_stati_novostey_d6375698'),
    subtitle: '/news/kak-kupit-nedvizhimost',
    example: t('admin_kak_kupit_nedvizhimost_v_5cb93bdd'),
    vars: ['title', 'excerpt'],
  },
  catalog: {
    title: t('admin_katalog_po_gorodam_3cfbf14b'),
    subtitle: '/spain/barcelona/apartments',
    example: t('admin_kupit_kvartiru_v_barselone_a6159f46'),
    vars: ['type', 'city', 'country'],
  },
  static: {
    title: t('admin_razdely_sayta_887087a5'),
    subtitle: '/auction, /debts, /co-investment',
    example: t('admin_aukcion_nedvizhimosti_v_ispanii_8cb8b09f'),
    vars: ['title', 'description'],
  },
};

const PAGE_TYPE_LABELS = {
  static: t('admin_razdel_99d406ee'),
  property: t('admin_pr_property'),
  'co-investment': t('admin_dolya_4afa2a08'),
  'property-test-drive': t('admin_panel_testDrive'),
  news: t('admin_novost_30198e9f'),
  catalog: t('admin_katalog_46e27e2f'),
  unknown: t('admin_drugoe_8f96cac0'),
};

const PAGE_TYPES = [
  { value: '', label: t('admin_vse_tipy_c21a23a5') },
  { value: 'static', label: t('admin_razdely_sayta_887087a5') },
  { value: 'property', label: t('admin_panel_objects') },
  { value: 'co-investment', label: t('admin_dolevaya_nedvizhimost_7b8522c1') },
  { value: 'news', label: t('admin_novosti_43a387c8') },
  { value: 'catalog', label: t('admin_katalog_po_gorodam_3cfbf14b') },
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
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString(getUiIntlLocale());
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
      {t('admin_seo_chars_ideal', { len, ideal })}
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
  const { t } = useTranslation();
  const alertError = (error) => {
    const msg = String(error?.message || error || '')
    alert(msg.startsWith('seoAdminErr_') ? t(msg) : msg || t('seoAdminErr_generic'))
  }
  const TAB_GROUPS = TAB_GROUPS_DEF.map((g) => ({
    label: t(g.labelKey),
    tabs: g.tabs.map((tab) => ({ ...tab, label: t(tab.labelKey) })),
  }));
  const TAB_HELP = Object.fromEntries(
    Object.entries(TAB_HELP_DEF).map(([id, h]) => [id, { title: t(h.titleKey), text: t(h.textKey) }])
  );
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
      showMsg(t('admin_izmeneniya_sohraneny_i_uzhe_a97b5b21'));
      await loadPages();
    } catch (e) {
      alertError(e);
    } finally {
      setSaving(false);
    }
  };

  const socialPreview = useMemo(
    () => ({
      title: form.og_title || form.title || t('admin_zagolovok_ssylki_ff25c4eb'),
      description: form.og_description || form.meta_description || t('admin_kratkoe_opisanie_dlya_prevyu_8c40cd24'),
      image: form.og_image,
    }),
    [form],
  );

  const selectedPageRow = pages.find((p) => p.path === selectedPath);

  const renderPagePicker = () => (
    <aside className="seo-panel__sidebar">
      <div className="seo-panel__sidebar-head">
        <strong>{t('admin_vybrannaya_stranica_3cffc662')}</strong>
        {selectedPath ? (
          <code className="seo-panel__sidebar-path">{selectedPath}</code>
        ) : (
          <span className="seo-panel__muted">{t('admin_ne_vybrana_e45cc43b')}</span>
        )}
      </div>
      <input
        className="seo-panel__search"
        placeholder={t('admin_bystryy_poisk__eb5a4bee')}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && void loadPages()}
      />
      <div className="seo-panel__sidebar-list">
        {loading ? (
          <div className="seo-panel__loading">{t('admin_loading')}</div>
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
              {row.hasOverride && <span className="seo-panel__sidebar-item-badge">{t('admin_pravka_4b3bcb44')}</span>}
            </button>
          ))
        )}
      </div>
      <button type="button" className="btn btn-secondary seo-panel__sidebar-all" onClick={() => setActiveTab('pages')}>
        {t('admin_seo_open_full_list', { n: pagesMeta.total })}
      </button>
    </aside>
  );

  const renderPagesTab = () => (
    <div className="seo-panel__section">
      <div className="seo-panel__workflow">
        <span className="seo-panel__step is-done">{t('admin_1_naydite_stranicu_86f24ed6')}</span>
        <FaChevronRight size={10} aria-hidden />
        <span className="seo-panel__step">{t('admin_2_kliknite_po_stroke_13ed2fb9')}</span>
        <FaChevronRight size={10} aria-hidden />
        <span className="seo-panel__step">{t('admin_3_otredaktiruyte_meta_tegi_7f97462c')}</span>
        <FaChevronRight size={10} aria-hidden />
        <span className="seo-panel__step">{t('admin_4_sohranite_9c9bb792')}</span>
      </div>
      <div className="seo-panel__toolbar">
        <input
          className="seo-panel__search"
          placeholder={t('admin_poisk_po__title_75b55164')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && void loadPages()}
        />
        <select value={pageType} onChange={(e) => setPageType(e.target.value)}>
          {PAGE_TYPES.map((t) => (
            <option key={t.value || 'all'} value={t.value}>{t.label}</option>
          ))}
        </select>
        <button type="button" className="btn btn-primary" onClick={() => void loadPages()}>{t('admin_nayti_ed6e1d03')}</button>
        <span className="seo-panel__muted">{t('admin_found_count', { n: pagesMeta.total })}</span>
      </div>
      {loading ? (
        <div className="seo-panel__loading">{t('admin_zagruzka_stranic_7fab936c')}</div>
      ) : (
        <div className="seo-panel__table-wrap">
          <table className="seo-panel__table">
            <thead>
              <tr>
                <th>URL</th>
                <th>{t('admin_tip_d25691ca')}</th>
                <th>Google</th>
                <th>{t('admin_itle_v_vydache_34558ae0')}</th>
                <th>Description</th>
                <th>{t('admin_obnovleno_484f3ba9')}</th>
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
                    {row.hasOverride && <span className="seo-panel__override-dot" title={t('admin_est_ruchnaya_pravka_73392001')} />}
                  </td>
                  <td>{PAGE_TYPE_LABELS[row.pageType] || row.pageType}</td>
                  <td>
                    <span className={`seo-badge seo-badge--${row.robotsIndex}`}>
                      {row.robotsIndex === 'noindex' ? t('admin_skryta_a4606f4f') : t('admin_v_indekse_45acedec')}
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
          <p>{t('admin_snachala_vyberite_stranicu_sleva_29600cb4')}</p>
          <button type="button" className="btn btn-primary" onClick={() => setActiveTab('pages')}>
            {t('admin_pereyti_k_spisku_stranic_bdf8f571')}
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
              {PAGE_TYPE_LABELS[selectedPageRow?.pageType || form.pageType] || t('admin_stranica_97e20f83')}
            </div>
            <h3>{selectedPath}</h3>
            {selectedPageRow?.label && (
              <p className="seo-panel__muted">{selectedPageRow.label}</p>
            )}
          </div>
          {canSave && (
            <button type="button" className="btn btn-primary" disabled={saving} onClick={() => void handleSavePage()}>
              <FaSave /> {saving ? t('admin_saving') : t('admin_save')}
            </button>
          )}
        </div>

        {mode === 'seo' && (
          <div className="seo-panel__form-grid">
            <label>
              {t('admin_itle_zagolovok_v_oogle_084b408c')}
              <input
                value={form.title}
                disabled={readOnly}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder={t('admin_villa_v_barselone_120_eec97a7d')}
              />
              <LengthHint value={form.title} min={30} max={65} ideal="30–60" />
            </label>
            <label>
              {t('admin_eta_description_tekst_pod_d587711d')}
              <textarea
                rows={3}
                value={form.meta_description}
                disabled={readOnly}
                onChange={(e) => setForm((f) => ({ ...f, meta_description: e.target.value }))}
                placeholder={t('admin_kratkoe_opisanie_obekta_ili_9398723a')}
              />
              <LengthHint value={form.meta_description} min={70} max={165} ideal="120–160" />
            </label>
            <label>
              {t('admin_1_glavnyy_zagolovok_na_1eccaae7')}
              <input
                value={form.h1}
                disabled={readOnly}
                onChange={(e) => setForm((f) => ({ ...f, h1: e.target.value }))}
              />
            </label>
            <label>
              {t('admin_anonical_osnovnoy__stranicy_a6910473')}
              <input
                value={form.canonical_path}
                disabled={readOnly}
                onChange={(e) => setForm((f) => ({ ...f, canonical_path: e.target.value }))}
                placeholder="/property/villa-costa-brava-123"
              />
              <small className="seo-panel__muted">{t('admin_obychno_sovpadaet_s__98f2496e')}</small>
            </label>
            <label>
              {t('admin_indeksaciya_v_oogle_b4323aa8')}
              <select
                value={form.robotsIndex}
                disabled={readOnly}
                onChange={(e) => setForm((f) => ({ ...f, robotsIndex: e.target.value }))}
              >
                <option value="index">{t('admin_pokazyvat_v_poiske_index_ac4028b6')}</option>
                <option value="noindex">{t('admin_skryt_ot_poiska_noindex_c1e0dbaa')}</option>
              </select>
            </label>
            <label>
              {t('admin_celevye_klyuchevye_slova_5426d370')}
              <input
                value={form.target_keywords}
                disabled={readOnly}
                onChange={(e) => setForm((f) => ({ ...f, target_keywords: e.target.value }))}
                placeholder={t('admin_kupit_kvartiru_barselona_nedvizhimos_d7d499f6')}
              />
              <small className="seo-panel__muted">{t('admin_dlya_vnutrennih_zametok_komandy_c18ccb75')}</small>
            </label>
            <label className="seo-panel__full">
              {t('admin__zametki_komandy_fe744c7b')}
              <textarea
                rows={2}
                value={form.seo_notes}
                disabled={readOnly}
                onChange={(e) => setForm((f) => ({ ...f, seo_notes: e.target.value }))}
                placeholder={t('admin_naprimer_zhdem_foto_obnovit_f3aa1841')}
              />
            </label>
          </div>
        )}

        {mode === 'social' && (
          <div className="seo-panel__form-grid seo-panel__form-grid--social">
            <label>
              {t('admin__title_zagolovok_v_705ffcf4')}
              <input
                value={form.og_title}
                disabled={socialLocked}
                onChange={(e) => setForm((f) => ({ ...f, og_title: e.target.value }))}
                placeholder={t('admin_esli_pusto_beretsya_obychnyy_73de5260')}
              />
            </label>
            <label>
              OG description
              <textarea
                rows={3}
                value={form.og_description}
                disabled={socialLocked}
                onChange={(e) => setForm((f) => ({ ...f, og_description: e.target.value }))}
                placeholder={t('admin_esli_pusto_beretsya_meta_a28ee0be')}
              />
            </label>
            <label>
              {t('admin__image_kartinka_prevyu_41a48c9c')}
              <input
                value={form.og_image}
                disabled={socialLocked}
                onChange={(e) => setForm((f) => ({ ...f, og_image: e.target.value }))}
                placeholder="https://sellyourbrick.com/uploads/..."
              />
            </label>
            <label>
              {t('admin_format_witter_elegram_card_47634f1c')}
              <select
                value={form.twitter_card}
                disabled={socialLocked}
                onChange={(e) => setForm((f) => ({ ...f, twitter_card: e.target.value }))}
              >
                <option value="summary_large_image">{t('admin_bolshaya_kartinka_rekomenduetsya_78325ed3')}</option>
                <option value="summary">{t('admin_malenkaya_kartinka_e38b10d3')}</option>
              </select>
            </label>
            <div className="seo-panel__og-preview seo-panel__full">
              <h4>{t('admin_kak_uvidyat_ssylku_v_2cebb528')}</h4>
              <div className="seo-og-card">
                {socialPreview.image ? (
                  <img src={socialPreview.image} alt="" className="seo-og-card__img" />
                ) : (
                  <div className="seo-og-card__img seo-og-card__img--placeholder">{t('admin_zdes_budet_kartinka_0d7139b4')}</div>
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
              {t('admin_vklyuchit_etu_stranicu_v_fa05d7b8')}
            </label>
            <label>
              {t('admin_prioritet_0_0_1_350f464c')}
              <input
                type="number"
                min="0"
                max="1"
                step="0.05"
                value={form.sitemap_priority}
                disabled={sitemapLocked}
                onChange={(e) => setForm((f) => ({ ...f, sitemap_priority: e.target.value }))}
                placeholder={t('admin_0_8_dlya_obektov_628b86ad')}
              />
            </label>
            <label>
              {t('admin_kak_chasto_menyaetsya_dc715674')}
              <select
                value={form.sitemap_changefreq}
                disabled={sitemapLocked}
                onChange={(e) => setForm((f) => ({ ...f, sitemap_changefreq: e.target.value }))}
              >
                <option value="daily">{t('admin_ezhednevno_7fcf2e48')}</option>
                <option value="weekly">{t('admin_ezhenedelno_10c12f72')}</option>
                <option value="monthly">{t('admin_ezhemesyachno_0339f36a')}</option>
                <option value="yearly">{t('admin_redko_208a9d68')}</option>
              </select>
            </label>
            {meta?.canManageSitemap && (
              <div className="seo-panel__full">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => void refreshSitemap().then((r) => showMsg(r.message || t('admin_itemap_obnovitsya_pri_sleduyuschem_d1048345')))}
                >
                  {t('admin_zaprosit_obnovlenie_sitemap_2d7f9c35')}
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
        <p className="seo-panel__hint">{t('admin_shablony_dostupny_roli_marketolog_a6340fd0')}</p>
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
                    <span>{t('admin_primer_cf5c7edb')}</span> {info.example}
                  </p>
                )}
                <label>
                  {t('admin_shablon_itle_9778353a')}
                  <input defaultValue={tpl.title_template || ''} id={`tpl-title-${tpl.page_type}`} />
                </label>
                <label>
                  {t('admin_shablon_escription_8ab002dd')}
                  <textarea rows={2} defaultValue={tpl.description_template || ''} id={`tpl-desc-${tpl.page_type}`} />
                </label>
                <label>
                  {t('admin_shablon_1_71427cdc')}
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
                      .then(() => showMsg(t('admin_shablon_title_sohranen_d8e1ef8d', { title: info.title })))
                      .catch((e) => alertError(e));
                  }}
                >
                  {t('admin_sohranit_shablon_dc6c0afa')}
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
        <p className="seo-panel__hint">{t('admin_redirekty_dostupny_tolko_roli_b0c9c4ee')}</p>
      ) : (
        <>
          <div className="seo-panel__redirect-form">
            <input
              placeholder={t('admin_otkuda_staryy_url_963eaf5a')}
              value={redirectForm.from_path}
              onChange={(e) => setRedirectForm((f) => ({ ...f, from_path: e.target.value }))}
            />
            <span className="seo-panel__redirect-arrow">→</span>
            <input
              placeholder={t('admin_kuda_novyy_url_1daac18d')}
              value={redirectForm.to_path}
              onChange={(e) => setRedirectForm((f) => ({ ...f, to_path: e.target.value }))}
            />
            <select
              value={redirectForm.status_code}
              onChange={(e) => setRedirectForm((f) => ({ ...f, status_code: Number(e.target.value) }))}
            >
              <option value={301}>{t('admin_301_navsegda_3a805d19')}</option>
              <option value={302}>{t('admin_302_vremenno_a8a2c694')}</option>
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
                  .then(() => showMsg(t('admin_redirekt_dobavlen_22740ae0')))
                  .catch((e) => alertError(e));
              }}
            >
              {t('admin_dobavit_559a87f7')}
            </button>
          </div>
          <table className="seo-panel__table">
            <thead>
              <tr>
                <th>{t('admin_staryy__f7806fce')}</th>
                <th>{t('admin_novyy__9b65b85a')}</th>
                <th>{t('admin_tip_d25691ca')}</th>
                <th>{t('admin_kto_sozdal_51c73557')}</th>
                <th>{t('admin_data_a5b49d2e')}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {redirects.length === 0 ? (
                <tr><td colSpan={6} className="seo-panel__hint">{t('admin_redirektov_poka_net_bc7c4b40')}</td></tr>
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
                        if (!window.confirm(t('admin_udalit_redirekt_c486cd98'))) return;
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
          <FaDownload /> {t('admin_download_csv')}
        </button>
      </div>
      {meta?.canBulkEdit ? (
        <>
          <label className="seo-panel__full">
            {t('admin_vstavte__ili_zagruzite_07fa9997')}
            <textarea
              rows={8}
              placeholder="path,title,meta_description,h1,canonical_path,robots_index..."
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
            />
          </label>
          <div className="seo-panel__bulk-actions">
            <label className="btn btn-secondary">
              <FaUpload /> {t('admin_vybrat_fayl_2e31dae9')}
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
                  .then((r) => showMsg(t('admin_importirovano_strok_n_36236172', { n: r.imported })))
                  .catch((e) => alertError(e));
              }}
            >
              {t('admin_importirovat_55fd5f8a')}
            </button>
          </div>
        </>
      ) : (
        <p className="seo-panel__hint">{t('admin_import_dostupen_rolyam_s_9d933096')}</p>
      )}
    </div>
  );

  const renderChecks = () => (
    <div className="seo-panel__section">
      {!checks ? (
        <div className="seo-panel__loading">{t('admin_zapusk_proverok_78387c01')}</div>
      ) : (
        <>
          <div className="seo-panel__checks-summary">
            <div className="seo-panel__check-stat seo-panel__check-stat--error">
              <strong>{checks.summary.errors}</strong>
              <span>{t('admin_oshibok_200f99bf')}</span>
            </div>
            <div className="seo-panel__check-stat seo-panel__check-stat--warn">
              <strong>{checks.summary.warnings}</strong>
              <span>{t('admin_preduprezhdeniy_640f9a12')}</span>
            </div>
            <div className="seo-panel__check-stat">
              <strong>{checks.summary.checked}</strong>
              <span>{t('admin_stranic_provereno_33ef1539')}</span>
            </div>
          </div>
          {checks.issues.length === 0 ? (
            <p className="seo-panel__hint seo-panel__hint--ok">{t('admin_kritichnyh_problem_ne_naydeno_e05354de')}</p>
          ) : (
            <table className="seo-panel__table">
              <thead>
                <tr>
                  <th>{t('admin_stranica_97e20f83')}</th>
                  <th>{t('admin_uroven_d9f964d7')}</th>
                  <th>{t('admin_chto_ne_tak_a662ec8c')}</th>
                </tr>
              </thead>
              <tbody>
                {checks.issues.map((issue, idx) => (
                  <tr key={`${issue.path}-${idx}`} className={`seo-check--${issue.severity}`}>
                    <td className="seo-panel__path">{issue.path}</td>
                    <td>{issue.severity === 'error' ? t('admin_error') : t('admin_vnimanie_5f5f867e')}</td>
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
          <p>{t('admin_vyberite_stranicu_chtoby_uvidet_0dcf8f7b')}</p>
        </div>
      );
    }
    return (
      <div className="seo-panel__section">
        <p className="seo-panel__muted">{t('admin_istoriya_dlya_98979440')} <code>{selectedPath}</code></p>
        <table className="seo-panel__table">
          <thead>
            <tr>
              <th>{t('admin_data_a5b49d2e')}</th>
              <th>{t('admin_kto_0c65a41d')}</th>
              <th>{t('admin_deystvie_4fe9c067')}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {history.length === 0 ? (
              <tr><td colSpan={4} className="seo-panel__hint">{t('admin_izmeneniy_poka_ne_bylo_6bc8eb65')}</td></tr>
            ) : history.map((h) => (
              <tr key={h.id}>
                <td>{formatDate(h.changed_at)}</td>
                <td>{h.changed_by || '—'}</td>
                <td>{h.action === 'rollback' ? t('admin_otkat_d3b5ca65') : h.action === 'create' ? t('admin_sozdanie_dcabf8a1') : t('admin_izmenenie_8ed60891')}</td>
                <td>
                  {meta?.canRollbackHistory && (
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => {
                        if (!window.confirm(t('admin_vernut__nastroyki_k_effbe513'))) return;
                        void rollbackSeoHistory(h.id)
                          .then(() => loadPageDetail(selectedPath))
                          .then(() => fetchSeoHistory(selectedPath))
                          .then(setHistory)
                          .then(() => showMsg(t('admin_versiya_vosstanovlena_c5589d94')));
                      }}
                    >
                      <FaUndo /> {t('admin_otkatit_783f6603')}
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
    meta?.role === 'admin' ? t('admin_admin__eb73c9f3') : meta?.role === 'marketer' ? t('admin_marketolog_ee657e73') : t('admin_redaktor_65d42cf1');

  const needsSidebar = PAGE_EDIT_TABS.has(activeTab);

  return (
    <div className="seo-panel">
      <div className="seo-panel__header">
        <div>
          <h2>{t('admin__kabinet_268c0b65')}</h2>
          <p className="seo-panel__muted">
            {t('admin_upravlyayte_tem_kak_sayt_09af1261')}
          </p>
        </div>
        {meta && <span className="seo-panel__role-badge">{t('admin_vasha_rol_role_8a786c2e', { role: roleLabel })}</span>}
      </div>

      {showGuide && (
        <div className="seo-panel__guide">
          <div>
            <strong>{t('admin_bystryy_start_4e82e087')}</strong>
            <ol>
              <li>{t('admin_otkroyte_63afc134')} <button type="button" className="seo-panel__inline-link" onClick={() => setActiveTab('pages')}>{t('admin_pages')}</button> {t('admin_i_naydite_nuzhnuyu_b0687a46')}</li>
              <li>{t('admin_nazhmite_na_stroku_otkroyutsya_69adca47')} <strong>{t('admin_metaTags')}</strong></li>
              <li>{t('admin_otredaktiruyte_title_i_description_c122cfd0')} <strong>{t('admin_save')}</strong></li>
              <li>{t('admin_proverte_rezultat_vo_vkladke_42be4591')} <button type="button" className="seo-panel__inline-link" onClick={() => setActiveTab('checks')}>{t('admin_proverki_785675d4')}</button></li>
            </ol>
          </div>
          <button type="button" className="seo-panel__guide-close" onClick={() => setShowGuide(false)} aria-label={t('admin_skryt_podskazku_b9638a21')}>×</button>
        </div>
      )}

      {message && <div className="seo-panel__toast">{message}</div>}

      <nav className="seo-panel__tabs" aria-label={t('admin_razdely__kabineta_67e32eb8')}>
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
