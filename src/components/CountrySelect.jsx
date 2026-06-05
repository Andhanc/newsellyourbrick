import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import './CountrySelect.css';

// Полный список всех стран мира с флагами (emoji флаги)
// Экспортируем список стран для использования в других компонентах
export const countries = [
  { code: 'AF', name: 'Афганистан', flag: '🇦🇫' },
  { code: 'AX', name: 'Аландские острова', flag: '🇦🇽' },
  { code: 'AL', name: 'Албания', flag: '🇦🇱' },
  { code: 'DZ', name: 'Алжир', flag: '🇩🇿' },
  { code: 'AS', name: 'Американское Самоа', flag: '🇦🇸' },
  { code: 'AD', name: 'Андорра', flag: '🇦🇩' },
  { code: 'AO', name: 'Ангола', flag: '🇦🇴' },
  { code: 'AI', name: 'Ангилья', flag: '🇦🇮' },
  { code: 'AQ', name: 'Антарктида', flag: '🇦🇶' },
  { code: 'AG', name: 'Антигуа и Барбуда', flag: '🇦🇬' },
  { code: 'AR', name: 'Аргентина', flag: '🇦🇷' },
  { code: 'AM', name: 'Армения', flag: '🇦🇲' },
  { code: 'AW', name: 'Аруба', flag: '🇦🇼' },
  { code: 'AU', name: 'Австралия', flag: '🇦🇺' },
  { code: 'AT', name: 'Австрия', flag: '🇦🇹' },
  { code: 'AZ', name: 'Азербайджан', flag: '🇦🇿' },
  { code: 'BS', name: 'Багамы', flag: '🇧🇸' },
  { code: 'BH', name: 'Бахрейн', flag: '🇧🇭' },
  { code: 'BD', name: 'Бангладеш', flag: '🇧🇩' },
  { code: 'BB', name: 'Барбадос', flag: '🇧🇧' },
  { code: 'BY', name: 'Беларусь', flag: '🇧🇾' },
  { code: 'BE', name: 'Бельгия', flag: '🇧🇪' },
  { code: 'BZ', name: 'Белиз', flag: '🇧🇿' },
  { code: 'BJ', name: 'Бенин', flag: '🇧🇯' },
  { code: 'BM', name: 'Бермуды', flag: '🇧🇲' },
  { code: 'BT', name: 'Бутан', flag: '🇧🇹' },
  { code: 'BO', name: 'Боливия', flag: '🇧🇴' },
  { code: 'BQ', name: 'Бонайре, Синт-Эстатиус и Саба', flag: '🇧🇶' },
  { code: 'BA', name: 'Босния и Герцеговина', flag: '🇧🇦' },
  { code: 'BW', name: 'Ботсвана', flag: '🇧🇼' },
  { code: 'BV', name: 'Остров Буве', flag: '🇧🇻' },
  { code: 'BR', name: 'Бразилия', flag: '🇧🇷' },
  { code: 'IO', name: 'Британская территория в Индийском океане', flag: '🇮🇴' },
  { code: 'BN', name: 'Бруней', flag: '🇧🇳' },
  { code: 'BG', name: 'Болгария', flag: '🇧🇬' },
  { code: 'BF', name: 'Буркина-Фасо', flag: '🇧🇫' },
  { code: 'BI', name: 'Бурунди', flag: '🇧🇮' },
  { code: 'CV', name: 'Кабо-Верде', flag: '🇨🇻' },
  { code: 'KH', name: 'Камбоджа', flag: '🇰🇭' },
  { code: 'CM', name: 'Камерун', flag: '🇨🇲' },
  { code: 'CA', name: 'Канада', flag: '🇨🇦' },
  { code: 'KY', name: 'Острова Кайман', flag: '🇰🇾' },
  { code: 'CF', name: 'Центральноафриканская Республика', flag: '🇨🇫' },
  { code: 'TD', name: 'Чад', flag: '🇹🇩' },
  { code: 'CL', name: 'Чили', flag: '🇨🇱' },
  { code: 'CN', name: 'Китай', flag: '🇨🇳' },
  { code: 'CX', name: 'Остров Рождества', flag: '🇨🇽' },
  { code: 'CC', name: 'Кокосовые острова', flag: '🇨🇨' },
  { code: 'CO', name: 'Колумбия', flag: '🇨🇴' },
  { code: 'KM', name: 'Коморские Острова', flag: '🇰🇲' },
  { code: 'CG', name: 'Конго', flag: '🇨🇬' },
  { code: 'CD', name: 'Демократическая Республика Конго', flag: '🇨🇩' },
  { code: 'CK', name: 'Острова Кука', flag: '🇨🇰' },
  { code: 'CR', name: 'Коста-Рика', flag: '🇨🇷' },
  { code: 'CI', name: 'Кот-д\'Ивуар', flag: '🇨🇮' },
  { code: 'HR', name: 'Хорватия', flag: '🇭🇷' },
  { code: 'CU', name: 'Куба', flag: '🇨🇺' },
  { code: 'CW', name: 'Кюрасао', flag: '🇨🇼' },
  { code: 'CY', name: 'Кипр', flag: '🇨🇾' },
  { code: 'CZ', name: 'Чехия', flag: '🇨🇿' },
  { code: 'DK', name: 'Дания', flag: '🇩🇰' },
  { code: 'DJ', name: 'Джибути', flag: '🇩🇯' },
  { code: 'DM', name: 'Доминика', flag: '🇩🇲' },
  { code: 'DO', name: 'Доминиканская Республика', flag: '🇩🇴' },
  { code: 'EC', name: 'Эквадор', flag: '🇪🇨' },
  { code: 'EG', name: 'Египет', flag: '🇪🇬' },
  { code: 'SV', name: 'Сальвадор', flag: '🇸🇻' },
  { code: 'GQ', name: 'Экваториальная Гвинея', flag: '🇬🇶' },
  { code: 'ER', name: 'Эритрея', flag: '🇪🇷' },
  { code: 'EE', name: 'Эстония', flag: '🇪🇪' },
  { code: 'SZ', name: 'Эсватини', flag: '🇸🇿' },
  { code: 'ET', name: 'Эфиопия', flag: '🇪🇹' },
  { code: 'FK', name: 'Фолклендские острова', flag: '🇫🇰' },
  { code: 'FO', name: 'Фарерские острова', flag: '🇫🇴' },
  { code: 'FJ', name: 'Фиджи', flag: '🇫🇯' },
  { code: 'FI', name: 'Финляндия', flag: '🇫🇮' },
  { code: 'FR', name: 'Франция', flag: '🇫🇷' },
  { code: 'GF', name: 'Французская Гвиана', flag: '🇬🇫' },
  { code: 'PF', name: 'Французская Полинезия', flag: '🇵🇫' },
  { code: 'TF', name: 'Французские Южные территории', flag: '🇹🇫' },
  { code: 'GA', name: 'Габон', flag: '🇬🇦' },
  { code: 'GM', name: 'Гамбия', flag: '🇬🇲' },
  { code: 'GE', name: 'Грузия', flag: '🇬🇪' },
  { code: 'DE', name: 'Германия', flag: '🇩🇪' },
  { code: 'GH', name: 'Гана', flag: '🇬🇭' },
  { code: 'GI', name: 'Гибралтар', flag: '🇬🇮' },
  { code: 'GR', name: 'Греция', flag: '🇬🇷' },
  { code: 'GL', name: 'Гренландия', flag: '🇬🇱' },
  { code: 'GD', name: 'Гренада', flag: '🇬🇩' },
  { code: 'GP', name: 'Гваделупа', flag: '🇬🇵' },
  { code: 'GU', name: 'Гуам', flag: '🇬🇺' },
  { code: 'GT', name: 'Гватемала', flag: '🇬🇹' },
  { code: 'GG', name: 'Гернси', flag: '🇬🇬' },
  { code: 'GN', name: 'Гвинея', flag: '🇬🇳' },
  { code: 'GW', name: 'Гвинея-Бисау', flag: '🇬🇼' },
  { code: 'GY', name: 'Гайана', flag: '🇬🇾' },
  { code: 'HT', name: 'Гаити', flag: '🇭🇹' },
  { code: 'HM', name: 'Остров Херд и острова Макдональд', flag: '🇭🇲' },
  { code: 'VA', name: 'Ватикан', flag: '🇻🇦' },
  { code: 'HN', name: 'Гондурас', flag: '🇭🇳' },
  { code: 'HK', name: 'Гонконг', flag: '🇭🇰' },
  { code: 'HU', name: 'Венгрия', flag: '🇭🇺' },
  { code: 'IS', name: 'Исландия', flag: '🇮🇸' },
  { code: 'IN', name: 'Индия', flag: '🇮🇳' },
  { code: 'ID', name: 'Индонезия', flag: '🇮🇩' },
  { code: 'IR', name: 'Иран', flag: '🇮🇷' },
  { code: 'IQ', name: 'Ирак', flag: '🇮🇶' },
  { code: 'IE', name: 'Ирландия', flag: '🇮🇪' },
  { code: 'IM', name: 'Остров Мэн', flag: '🇮🇲' },
  { code: 'IL', name: 'Израиль', flag: '🇮🇱' },
  { code: 'IT', name: 'Италия', flag: '🇮🇹' },
  { code: 'JM', name: 'Ямайка', flag: '🇯🇲' },
  { code: 'JP', name: 'Япония', flag: '🇯🇵' },
  { code: 'JE', name: 'Джерси', flag: '🇯🇪' },
  { code: 'JO', name: 'Иордания', flag: '🇯🇴' },
  { code: 'KZ', name: 'Казахстан', flag: '🇰🇿' },
  { code: 'KE', name: 'Кения', flag: '🇰🇪' },
  { code: 'KI', name: 'Кирибати', flag: '🇰🇮' },
  { code: 'KP', name: 'КНДР', flag: '🇰🇵' },
  { code: 'KR', name: 'Южная Корея', flag: '🇰🇷' },
  { code: 'KW', name: 'Кувейт', flag: '🇰🇼' },
  { code: 'KG', name: 'Киргизия', flag: '🇰🇬' },
  { code: 'LA', name: 'Лаос', flag: '🇱🇦' },
  { code: 'LV', name: 'Латвия', flag: '🇱🇻' },
  { code: 'LB', name: 'Ливан', flag: '🇱🇧' },
  { code: 'LS', name: 'Лесото', flag: '🇱🇸' },
  { code: 'LR', name: 'Либерия', flag: '🇱🇷' },
  { code: 'LY', name: 'Ливия', flag: '🇱🇾' },
  { code: 'LI', name: 'Лихтенштейн', flag: '🇱🇮' },
  { code: 'LT', name: 'Литва', flag: '🇱🇹' },
  { code: 'LU', name: 'Люксембург', flag: '🇱🇺' },
  { code: 'MO', name: 'Макао', flag: '🇲🇴' },
  { code: 'MG', name: 'Мадагаскар', flag: '🇲🇬' },
  { code: 'MW', name: 'Малави', flag: '🇲🇼' },
  { code: 'MY', name: 'Малайзия', flag: '🇲🇾' },
  { code: 'MV', name: 'Мальдивы', flag: '🇲🇻' },
  { code: 'ML', name: 'Мали', flag: '🇲🇱' },
  { code: 'MT', name: 'Мальта', flag: '🇲🇹' },
  { code: 'MH', name: 'Маршалловы Острова', flag: '🇲🇭' },
  { code: 'MQ', name: 'Мартиника', flag: '🇲🇶' },
  { code: 'MR', name: 'Мавритания', flag: '🇲🇷' },
  { code: 'MU', name: 'Маврикий', flag: '🇲🇺' },
  { code: 'YT', name: 'Майотта', flag: '🇾🇹' },
  { code: 'MX', name: 'Мексика', flag: '🇲🇽' },
  { code: 'FM', name: 'Микронезия', flag: '🇫🇲' },
  { code: 'MD', name: 'Молдавия', flag: '🇲🇩' },
  { code: 'MC', name: 'Монако', flag: '🇲🇨' },
  { code: 'MN', name: 'Монголия', flag: '🇲🇳' },
  { code: 'ME', name: 'Черногория', flag: '🇲🇪' },
  { code: 'MS', name: 'Монтсеррат', flag: '🇲🇸' },
  { code: 'MA', name: 'Марокко', flag: '🇲🇦' },
  { code: 'MZ', name: 'Мозамбик', flag: '🇲🇿' },
  { code: 'MM', name: 'Мьянма', flag: '🇲🇲' },
  { code: 'NA', name: 'Намибия', flag: '🇳🇦' },
  { code: 'NR', name: 'Науру', flag: '🇳🇷' },
  { code: 'NP', name: 'Непал', flag: '🇳🇵' },
  { code: 'NL', name: 'Нидерланды', flag: '🇳🇱' },
  { code: 'NC', name: 'Новая Каледония', flag: '🇳🇨' },
  { code: 'NZ', name: 'Новая Зеландия', flag: '🇳🇿' },
  { code: 'NI', name: 'Никарагуа', flag: '🇳🇮' },
  { code: 'NE', name: 'Нигер', flag: '🇳🇪' },
  { code: 'NG', name: 'Нигерия', flag: '🇳🇬' },
  { code: 'NU', name: 'Ниуэ', flag: '🇳🇺' },
  { code: 'NF', name: 'Остров Норфолк', flag: '🇳🇫' },
  { code: 'MK', name: 'Северная Македония', flag: '🇲🇰' },
  { code: 'MP', name: 'Северные Марианские острова', flag: '🇲🇵' },
  { code: 'NO', name: 'Норвегия', flag: '🇳🇴' },
  { code: 'OM', name: 'Оман', flag: '🇴🇲' },
  { code: 'PK', name: 'Пакистан', flag: '🇵🇰' },
  { code: 'PW', name: 'Палау', flag: '🇵🇼' },
  { code: 'PS', name: 'Палестина', flag: '🇵🇸' },
  { code: 'PA', name: 'Панама', flag: '🇵🇦' },
  { code: 'PG', name: 'Папуа — Новая Гвинея', flag: '🇵🇬' },
  { code: 'PY', name: 'Парагвай', flag: '🇵🇾' },
  { code: 'PE', name: 'Перу', flag: '🇵🇪' },
  { code: 'PH', name: 'Филиппины', flag: '🇵🇭' },
  { code: 'PN', name: 'Острова Питкэрн', flag: '🇵🇳' },
  { code: 'PL', name: 'Польша', flag: '🇵🇱' },
  { code: 'PT', name: 'Португалия', flag: '🇵🇹' },
  { code: 'PR', name: 'Пуэрто-Рико', flag: '🇵🇷' },
  { code: 'QA', name: 'Катар', flag: '🇶🇦' },
  { code: 'RE', name: 'Реюньон', flag: '🇷🇪' },
  { code: 'RO', name: 'Румыния', flag: '🇷🇴' },
  { code: 'RU', name: 'Россия', flag: '🇷🇺' },
  { code: 'RW', name: 'Руанда', flag: '🇷🇼' },
  { code: 'BL', name: 'Сен-Бартелеми', flag: '🇧🇱' },
  { code: 'SH', name: 'Острова Святой Елены, Вознесения и Тристан-да-Кунья', flag: '🇸🇭' },
  { code: 'KN', name: 'Сент-Китс и Невис', flag: '🇰🇳' },
  { code: 'LC', name: 'Сент-Люсия', flag: '🇱🇨' },
  { code: 'MF', name: 'Сен-Мартен', flag: '🇲🇫' },
  { code: 'PM', name: 'Сен-Пьер и Микелон', flag: '🇵🇲' },
  { code: 'VC', name: 'Сент-Винсент и Гренадины', flag: '🇻🇨' },
  { code: 'WS', name: 'Самоа', flag: '🇼🇸' },
  { code: 'SM', name: 'Сан-Марино', flag: '🇸🇲' },
  { code: 'ST', name: 'Сан-Томе и Принсипи', flag: '🇸🇹' },
  { code: 'SA', name: 'Саудовская Аравия', flag: '🇸🇦' },
  { code: 'SN', name: 'Сенегал', flag: '🇸🇳' },
  { code: 'RS', name: 'Сербия', flag: '🇷🇸' },
  { code: 'SC', name: 'Сейшельские Острова', flag: '🇸🇨' },
  { code: 'SL', name: 'Сьерра-Леоне', flag: '🇸🇱' },
  { code: 'SG', name: 'Сингапур', flag: '🇸🇬' },
  { code: 'SX', name: 'Синт-Мартен', flag: '🇸🇽' },
  { code: 'SK', name: 'Словакия', flag: '🇸🇰' },
  { code: 'SI', name: 'Словения', flag: '🇸🇮' },
  { code: 'SB', name: 'Соломоновы Острова', flag: '🇸🇧' },
  { code: 'SO', name: 'Сомали', flag: '🇸🇴' },
  { code: 'ZA', name: 'ЮАР', flag: '🇿🇦' },
  { code: 'GS', name: 'Южная Георгия и Южные Сандвичевы острова', flag: '🇬🇸' },
  { code: 'SS', name: 'Южный Судан', flag: '🇸🇸' },
  { code: 'ES', name: 'Испания', flag: '🇪🇸' },
  { code: 'LK', name: 'Шри-Ланка', flag: '🇱🇰' },
  { code: 'SD', name: 'Судан', flag: '🇸🇩' },
  { code: 'SR', name: 'Суринам', flag: '🇸🇷' },
  { code: 'SJ', name: 'Шпицберген и Ян-Майен', flag: '🇸🇯' },
  { code: 'SE', name: 'Швеция', flag: '🇸🇪' },
  { code: 'CH', name: 'Швейцария', flag: '🇨🇭' },
  { code: 'SY', name: 'Сирия', flag: '🇸🇾' },
  { code: 'TW', name: 'Тайвань', flag: '🇹🇼' },
  { code: 'TJ', name: 'Таджикистан', flag: '🇹🇯' },
  { code: 'TZ', name: 'Танзания', flag: '🇹🇿' },
  { code: 'TH', name: 'Таиланд', flag: '🇹🇭' },
  { code: 'TL', name: 'Восточный Тимор', flag: '🇹🇱' },
  { code: 'TG', name: 'Того', flag: '🇹🇬' },
  { code: 'TK', name: 'Токелау', flag: '🇹🇰' },
  { code: 'TO', name: 'Тонга', flag: '🇹🇴' },
  { code: 'TT', name: 'Тринидад и Тобаго', flag: '🇹🇹' },
  { code: 'TN', name: 'Тунис', flag: '🇹🇳' },
  { code: 'TR', name: 'Турция', flag: '🇹🇷' },
  { code: 'TM', name: 'Туркменистан', flag: '🇹🇲' },
  { code: 'TC', name: 'Острова Тёркс и Кайкос', flag: '🇹🇨' },
  { code: 'TV', name: 'Тувалу', flag: '🇹🇻' },
  { code: 'UG', name: 'Уганда', flag: '🇺🇬' },
  { code: 'UA', name: 'Украина', flag: '🇺🇦' },
  { code: 'AE', name: 'ОАЭ', flag: '🇦🇪' },
  { code: 'GB', name: 'Великобритания', flag: '🇬🇧' },
  { code: 'UM', name: 'Внешние малые острова США', flag: '🇺🇲' },
  { code: 'US', name: 'США', flag: '🇺🇸' },
  { code: 'UY', name: 'Уругвай', flag: '🇺🇾' },
  { code: 'UZ', name: 'Узбекистан', flag: '🇺🇿' },
  { code: 'VU', name: 'Вануату', flag: '🇻🇺' },
  { code: 'VE', name: 'Венесуэла', flag: '🇻🇪' },
  { code: 'VN', name: 'Вьетнам', flag: '🇻🇳' },
  { code: 'VG', name: 'Виргинские Острова (Великобритания)', flag: '🇻🇬' },
  { code: 'VI', name: 'Виргинские Острова (США)', flag: '🇻🇮' },
  { code: 'WF', name: 'Уоллис и Футуна', flag: '🇼🇫' },
  { code: 'EH', name: 'Западная Сахара', flag: '🇪🇭' },
  { code: 'YE', name: 'Йемен', flag: '🇾🇪' },
  { code: 'ZM', name: 'Замбия', flag: '🇿🇲' },
  { code: 'ZW', name: 'Зимбабве', flag: '🇿🇼' },
];

const CountrySelect = ({ value, onChange, placeholder = 'Выберите страну', className = '' }) => {
  const { i18n, t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  const locale = useMemo(() => {
    const lang = (i18n.language || 'ru').split('-')[0];
    return ['ru', 'en', 'de', 'es', 'fr', 'sv'].includes(lang) ? lang : 'en';
  }, [i18n.language]);

  const displayNames = useMemo(
    () => new Intl.DisplayNames(locale, { type: 'region' }),
    [locale]
  );

  const getCountryName = (code) => {
    try {
      return displayNames.of(code) ?? code;
    } catch {
      return countries.find(c => c.code === code)?.name ?? code;
    }
  };

  // Синхронизация при выборе снаружи / после onChange родителя
  useEffect(() => {
    setIsOpen(false);
    setSearchQuery('');
  }, [value]);

  // Закрываем выпадающий список при клике вне компонента
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen]);

  // Фильтруем страны по запросу поиска (по локализованному имени и коду)
  const filteredCountries = countries.filter(country => {
    const name = getCountryName(country.code);
    const q = searchQuery.toLowerCase();
    return name.toLowerCase().includes(q) || country.code.toLowerCase().includes(q);
  });

  // Получаем выбранную страну (value — название на русском или код для обратной совместимости)
  const selectedCountry = countries.find(c => c.name === value || c.code === value);

  // Обработка выбора страны (передаём родителю русское название для совместимости с API)
  const handleSelect = (country, event) => {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    setSearchQuery('');
    setIsOpen(false);
    onChange(country.name);
  };

  // Обработка открытия/закрытия
  const handleToggle = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      // Фокусируемся на главное поле при открытии
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    } else {
      setSearchQuery('');
    }
  };

  return (
    <div className={`country-select ${className}`} ref={containerRef}>
      <div 
        className={`country-select__trigger ${isOpen ? 'country-select__trigger--open' : ''}`}
        onMouseDown={(e) => {
          if (e.target.closest('.country-select__input')) return;
          e.preventDefault();
          handleToggle();
        }}
      >
        <div className="country-select__value">
          {selectedCountry && !searchQuery && (
            <>
              <span className="country-select__code">{selectedCountry.code}</span>
            </>
          )}
          <input
            ref={inputRef}
            type="text"
            className="country-select__input"
            placeholder={placeholder}
            value={
              isOpen
                ? searchQuery
                : selectedCountry
                  ? getCountryName(selectedCountry.code)
                  : ''
            }
            onChange={(e) => {
              const newValue = e.target.value;
              setSearchQuery(newValue);
              if (!isOpen) {
                setIsOpen(true);
              }
            }}
            onMouseDown={(e) => {
              e.stopPropagation();
            }}
            onFocus={() => {
              if (!isOpen) setIsOpen(true);
            }}
          />
        </div>
        <svg 
          className={`country-select__arrow ${isOpen ? 'country-select__arrow--open' : ''}`}
          width="16" 
          height="16" 
          viewBox="0 0 16 16" 
          fill="none"
        >
          <path 
            d="M4 6L8 10L12 6" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {isOpen && (
        <div className="country-select__dropdown">
          <div className="country-select__list">
            {filteredCountries.length > 0 ? (
              filteredCountries.map((country) => (
                <div
                  key={country.code}
                  role="option"
                  aria-selected={selectedCountry?.code === country.code}
                  className={`country-select__option ${
                    selectedCountry?.code === country.code ? 'country-select__option--selected' : ''
                  }`}
                  onMouseDown={(e) => handleSelect(country, e)}
                >
                  <span className="country-select__flag">{country.flag}</span>
                  <span className="country-select__name">{getCountryName(country.code)}</span>
                  {selectedCountry?.code === country.code && (
                    <svg 
                      className="country-select__check" 
                      width="16" 
                      height="16" 
                      viewBox="0 0 16 16" 
                      fill="none"
                    >
                      <path 
                        d="M13.5 4L6 11.5L2.5 8" 
                        stroke="currentColor" 
                        strokeWidth="2" 
                        strokeLinecap="round" 
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </div>
              ))
            ) : (
              <div className="country-select__no-results">
                {t('countryNoResults')}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CountrySelect;

