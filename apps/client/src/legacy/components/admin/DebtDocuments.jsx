import React from 'react';
import { useTranslation } from 'react-i18next';
import './DebtDocuments.css';

/**
 * Страница «Необходимые документы» по спецификации из tzdolg.txt:
 * чеклист документов при покупке долга, обеспеченного недвижимостью (Испания / NPL).
 */
const THREE_ESSENTIAL_KEYS = [
    'admin_debtDoc_kreditnyy_dogovor_21ebb3',
    'admin_debtDoc_notarialnaya_ipoteka_07b4c9',
    'admin_debtDoc_vypiska_iz_egistro_76b1a9'
  ];

const MANDATORY_FIELD_KEYS = [
    'admin_debtDoc_summa_dolga_943d39',
    'admin_debtDoc_cena_prodazhi_008f2a',
    'admin_debtDoc_adres_obekta_a7122d',
    'admin_debtDoc_tip_nedvizhimosti_6a6165',
    'admin_debtDoc_ocenka_3d89c4',
    'admin_debtDoc_stadiya_suda_d15845',
    'admin_debtDoc_occupancy_status_8e724f',
    'admin_debtDoc_pervaya_ili_vtoraya_6c9b86',
    'admin_debtDoc_razmer__baffd1',
    'admin_debtDoc_community_debt_fe0b66'
  ];

const SECTIONS_BASIC = [
    {
      titleKey: 'admin_debtDoc_1_dokumenty_po_d08b10',
      itemKeys: [
        'admin_debtDoc_kreditnyy_dogovor_oan_3a33fd',
        'admin_debtDoc_vse_dopolnitelnye_soglasheni_ad414d',
        'admin_debtDoc_grafik_platezhey_po_90f064',
        'admin_debtDoc_podtverzhdenie_tekuschey_zad_32f0ab',
        'admin_debtDoc_istoriya_platezhey_zaemschik_92402d',
        'admin_debtDoc_dokumenty_o_defolte_0cf937',
        'admin_debtDoc_dogovor_ustupki_dolga_112933',
      ],
    },
    {
      titleKey: 'admin_debtDoc_2_dokumenty_po_38d9cf',
      itemKeys: [
        'admin_debtDoc_notarialnyy_dogovor_ipoteki_7272d0',
        'admin_debtDoc_vypiska_iz_reestra_6ccb93',
        'admin_debtDoc_ota_imple_aktualnaya_d0fa52',
        'admin_debtDoc_ocenka_nedvizhimosti_pprais_7fe81e',
        'admin_debtDoc_kadastrovye_dannye_atastro_19d77a',
        'admin_debtDoc_fotografii_obekta_f9f089',
        'admin_debtDoc_adres_i_opisanie_1819b1',
        'admin_debtDoc_nalichie_drugih_obremeneniy_9253d8',
      ],
    },
    {
      titleKey: 'admin_debtDoc_3_yuridicheskie_dokumenty_63c438',
      itemKeys: [
        'admin_debtDoc_dokumenty_po_sudebnomu_e8ba12',
        'admin_debtDoc_nomer_sudebnogo_dela_bea191',
        'admin_debtDoc_status_procedury_vzyskaniya_56b1a7',
        'admin_debtDoc_resheniya_suda_esli_ae6f43',
        'admin_debtDoc_dokumenty_po_ispolnitelnomu_5a5963',
      ],
    },
    {
      titleKey: 'admin_debtDoc_4_dokumenty_po_dfca36',
      itemKeys: [
        'admin_debtDoc_informaciya_o_zaemschike_52b68d',
        'admin_debtDoc_finansovoe_sostoyanie_zaemsc_3741e4',
        'admin_debtDoc_kontaktnye_dannye_21895b',
        'admin_debtDoc_nalichie_drugih_dolgov_c16070',
      ],
    },
    {
      titleKey: 'admin_debtDoc_5_dokumenty_po_df3ab8',
      itemKeys: [
        'admin_debtDoc_oan_ale_greement_06921f',
        'admin_debtDoc_dogovor_ustupki_prava_2ba596',
        'admin_debtDoc_podtverzhdenie_prava_fonda_41a2e3',
        'admin_debtDoc_notarialnaya_peredacha_prav_2c102c',
        'admin_debtDoc_pismo_uvedomlenie_dolzhniku_3fd76a',
      ],
    },
    {
      titleKey: 'admin_debtDoc_6_dopolnitelno_chasto_12fd8d',
      itemKeys: [
        'admin_debtDoc_egal_ue_iligence_7203fd',
        'admin_debtDoc_aluation_report_2419ab',
        'admin_debtDoc_trategy_memo_plan_7158a7',
        'admin_debtDoc_ocenka_srokov_sudebnogo_4abe9f',
        'admin_debtDoc_raschet_potencialnoy_dohodno_18b6c5',
      ],
    },
  ];

const CHECKLIST_EXTENDED = [
    {
      titleKey: 'admin_debtDoc_1_dokumenty_po_ce9d1a',
      itemKeys: [
        'admin_debtDoc_kreditnyy_dogovor_oan_3a33fdx',
        'admin_debtDoc_vse_dopolnitelnye_soglasheni_ad414dx',
        'admin_debtDoc_grafik_platezhey_7df0bc',
        'admin_debtDoc_tekuschiy_razmer_zadolzhenno_e485d7',
        'admin_debtDoc_istoriya_platezhey_zaemschik_92402dx',
        'admin_debtDoc_data_vozniknoveniya_defolta_fbb479',
        'admin_debtDoc_uvedomlenie_o_prosrochke_f8bb0e',
        'admin_debtDoc_uvedomlenie_o_dosrochnom_f2ec75',
        'admin_debtDoc_podtverzhdenie_tekuschego_vl_8f5b21',
        'admin_debtDoc_istoriya_prodazh_dolga_1963a5',
        'admin_debtDoc_dogovor_predyduschey_cessii_f235b7',
        'admin_debtDoc_podtverzhdenie_chto_prodavec_86a2e8',
      ],
    },
    {
      titleKey: 'admin_debtDoc_2_dokumenty_po_35de6e',
      itemKeys: [
        'admin_debtDoc_notarialnyy_dogovor_ipoteki_7272d0x',
        'admin_debtDoc_aktualnaya_vypiska_iz_5ad362',
        'admin_debtDoc_registracionnyy_nomer_ipotek_d088ac',
        'admin_debtDoc_ocherednost_ipoteki_1_91bf77',
        'admin_debtDoc_nalichie_drugih_obremeneniy_533f7e',
        'admin_debtDoc_kadastrovaya_vypiska_6e4b13',
        'admin_debtDoc_tochnyy_adres_i_f43f35',
        'admin_debtDoc_fotografii_obekta_f9f089x',
        'admin_debtDoc_otchet_o_tehnicheskom_fcb99f',
        'admin_debtDoc_ocenka_nedvizhimosti_asaci_df5d07',
        'admin_debtDoc_data_posledney_ocenki_e5bdd9',
        'admin_debtDoc_proverka_sootvetstviya_kadas_bb75fa',
      ],
    },
    {
      titleKey: 'admin_debtDoc_3_proverka_yuridicheskogo_d7d6db',
      itemKeys: [
        'admin_debtDoc_proverka_zakonnosti_stroitel_d18b71',
        'admin_debtDoc_nalichie_licenzii_na_e9d06a',
        'admin_debtDoc_nalichie_licenzii_na_c73f03',
        'admin_debtDoc_proverka_otsutstviya_gradost_ab2aa1',
        'admin_debtDoc_proverka_vozmozhnosti_prodaz_0a9b2a',
      ],
    },
    {
      titleKey: 'admin_debtDoc_4_finansovye_obyazatelstva_203db0',
      itemKeys: [
        'admin_debtDoc_nalichie_zadolzhennosti_po_e3d367',
        'admin_debtDoc_nalichie_dolgov_pered_d53db8',
        'admin_debtDoc_nalichie_dolgov_po_c8aaa7',
        'admin_debtDoc_nalichie_municipalnyh_shtraf_ab779a',
      ],
    },
    {
      titleKey: 'admin_debtDoc_5_status_prozhivaniya_c290b2',
      itemKeys: [
        'admin_debtDoc_pustoy_li_obekt_b7412d',
        'admin_debtDoc_zhivet_li_sobstvennik_68cbd3',
        'admin_debtDoc_est_li_arendatory_209555',
        'admin_debtDoc_nalichie_dolgosrochnogo_dogo_239359',
        'admin_debtDoc_risk_ocupas_nezakonnye_18b65e',
      ],
    },
    {
      titleKey: 'admin_debtDoc_6_sudebnyy_status_b6ad00',
      itemKeys: [
        'admin_debtDoc_nachata_li_procedura_6ac2a5',
        'admin_debtDoc_nomer_sudebnogo_dela_bea191x',
        'admin_debtDoc_stadiya_sudebnogo_processa_503c2c',
        'admin_debtDoc_nalichie_sudebnyh_resheniy_76a065',
        'admin_debtDoc_prognoz_srokov_sudebnogo_019979',
        'admin_debtDoc_nalichie_procedury_bankrotst_17dded',
      ],
    },
    {
      titleKey: 'admin_debtDoc_7_informaciya_o_b0cacc',
      itemKeys: [
        'admin_debtDoc_pasport_ili_registracionnye_37d6ed',
        'admin_debtDoc_kontaktnye_dannye_zaemschika_91fe07',
        'admin_debtDoc_finansovoe_sostoyanie_zaemsc_3741e4x',
        'admin_debtDoc_nalichie_drugih_dolgov_c68d88',
        'admin_debtDoc_nalichie_poruchiteley_guaran_1babad',
        'admin_debtDoc_dokumenty_poruchiteley_db1435',
      ],
    },
    {
      titleKey: 'admin_debtDoc_8_dokumenty_sdelki_c9efb5',
      itemKeys: [
        'admin_debtDoc_oan_ale_greement_b72027',
        'admin_debtDoc_ssignment_of_redit_0e4ceb',
        'admin_debtDoc_notarialnaya_cessiya_a5dbdd',
        'admin_debtDoc_pismo_uvedomleniya_dolzhniku_714847',
        'admin_debtDoc_akt_peredachi_kreditnogo_a044dd',
        'admin_debtDoc_podtverzhdenie_peredachi_ori_f2a426',
      ],
    },
    {
      titleKey: 'admin_debtDoc_9_investicionnyy_analiz_78943e',
      itemKeys: [
        'admin_debtDoc_rynochnaya_stoimost_nedvizhi_93b9a5',
        'admin_debtDoc_cena_pokupki_dolga_b6af60',
        'admin_debtDoc_oan_to_alue_787c2b',
        'admin_debtDoc_potencialnaya_pribyl_b976ef',
        'admin_debtDoc_raschet__04bd54',
        'admin_debtDoc_ocenka_yuridicheskih_rashodo_66e2ad',
        'admin_debtDoc_prognoz_srokov_vzyskaniya_9c397e',
      ],
    },
    {
      titleKey: 'admin_debtDoc_10_riski_435955',
      itemKeys: [
        'admin_debtDoc_risk_ocupas_c9dbf7',
        'admin_debtDoc_risk_dolgogo_sudebnogo_153aee',
        'admin_debtDoc_risk_padeniya_stoimosti_8eeb5e',
        'admin_debtDoc_risk_dopolnitelnyh_dolgov_c224d0',
        'admin_debtDoc_risk_nevozmozhnosti_vyseleni_7c4e95',
      ],
    },
  ];

const MINIMUM_SET_KEYS = [
    'admin_debtDoc_kreditnyy_dogovor_21ebb3x',
    'admin_debtDoc_notarialnaya_ipoteka_07b4c9x',
    'admin_debtDoc_ota_imple_9bba82',
    'admin_debtDoc_podtverzhdenie_razmera_dolga_b72ee7',
    'admin_debtDoc_ocenka_nedvizhimosti_cb54fb',
    'admin_debtDoc_status_sudebnogo_processa_2f92a1'
  ];

const DebtDocuments = () => {
  const { t } = useTranslation();

  return (
    <div className="debt-documents">
      <header className="debt-documents-header">
        <h1>{t('admin_debtDoc_neobhodimye_dokumenty_pri_07b94a')}</h1>
        <p className="debt-documents-intro">
          {t('admin_debtDoc_pri_pokupke_dolga_e2c48e')}
        </p>
      </header>

      <section className="debt-documents-block debt-documents-essential">
        <h2>{t('admin_debtDoc_tri_dokumenta_bez_2058e5')}</h2>
        <ul>
          {THREE_ESSENTIAL_KEYS.map((key) => (
            <li key={key}>{t(key)}</li>
          ))}
        </ul>
      </section>

      <section className="debt-documents-block">
        <h2>{t('admin_debtDoc_bazovyy_paket_dokumentov_9774a7')}</h2>
        {SECTIONS_BASIC.map((sec) => (
          <div key={sec.titleKey} className="debt-documents-section">
            <h3>{t(sec.titleKey)}</h3>
            <ul>
              {sec.itemKeys.map((itemKey) => (
                <li key={itemKey}>{t(itemKey)}</li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <section className="debt-documents-block debt-documents-checklist">
        <h2>{t('admin_debtDoc_rasshirennyy_cheklist__a03923')}</h2>
        <p className="debt-documents-subtitle">
          {t('admin_debtDoc_dokumenty_i_informaciya_64c7b9')}
        </p>
        {CHECKLIST_EXTENDED.map((sec) => (
          <div key={sec.titleKey} className="debt-documents-section">
            <h3>{t(sec.titleKey)}</h3>
            <ul>
              {sec.itemKeys.map((itemKey) => (
                <li key={itemKey}>{t(itemKey)}</li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <section className="debt-documents-block debt-documents-minimum">
        <h2>{t('admin_debtDoc_minimalnyy_nabor_dokumentov_f91c64')}</h2>
        <p>{t('admin_debtDoc_bez_etogo_nabora_1424cc')}</p>
        <ul>
          {MINIMUM_SET_KEYS.map((key) => (
            <li key={key}>{t(key)}</li>
          ))}
        </ul>
      </section>

      <section className="debt-documents-block debt-documents-fields">
        <h2>{t('admin_debtDoc_rekomendaciya_dlya_sayta_642a0d')}</h2>
        <p>{t('admin_debtDoc_pri_zagruzke_dolgov_f2b9e4')}</p>
        <ul className="debt-documents-fields-list">
          {MANDATORY_FIELD_KEYS.map((key) => (
            <li key={key}><strong>{t(key)}</strong></li>
          ))}
        </ul>
      </section>
    </div>
  );
};

export default DebtDocuments;
