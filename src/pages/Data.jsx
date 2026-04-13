import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import BuyerCabinetSidebar from '../components/BuyerCabinetSidebar'
import { FaPencilAlt } from 'react-icons/fa'
import { FiAlertCircle } from 'react-icons/fi'
import { useUser, useAuth } from '@clerk/clerk-react'
import { getUserData, logout, sendEmailVerificationCode, verifyEmailForProfileUpdate, saveUserData } from '../services/authService'
import EmailVerificationModal from '../components/EmailVerificationModal'
import PassportRecognitionModal from '../components/PassportRecognitionModal'
import CountrySelect, { countries as countryList } from '../components/CountrySelect'
import VerificationToast from '../components/VerificationToast'
import { extractPassportData } from '../services/aiService'
import { showNotification } from '../utils/toastHelper'
import { fetchVerificationStatus } from '../utils/verificationStatusApi'
import './Data.css'
import './Profile.css'
import { useChainedAppLayoutScroll } from '../hooks/useChainedAppLayoutScroll'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

// Телефонные коды стран (по ISO-коду) — используются для автоподстановки кода в поле телефона
const COUNTRY_DIAL_INFO = [
  {"name":"Afghanistan","flag":"🇦🇫","code":"AF","dial_code":"+93"},
  {"name":"Åland Islands","flag":"🇦🇽","code":"AX","dial_code":"+358"},
  {"name":"Albania","flag":"🇦🇱","code":"AL","dial_code":"+355"},
  {"name":"Algeria","flag":"🇩🇿","code":"DZ","dial_code":"+213"},
  {"name":"American Samoa","flag":"🇦🇸","code":"AS","dial_code":"+1684"},
  {"name":"Andorra","flag":"🇦🇩","code":"AD","dial_code":"+376"},
  {"name":"Angola","flag":"🇦🇴","code":"AO","dial_code":"+244"},
  {"name":"Anguilla","flag":"🇦🇮","code":"AI","dial_code":"+1264"},
  {"name":"Antarctica","flag":"🇦🇶","code":"AQ","dial_code":"+672"},
  {"name":"Antigua and Barbuda","flag":"🇦🇬","code":"AG","dial_code":"+1268"},
  {"name":"Argentina","flag":"🇦🇷","code":"AR","dial_code":"+54"},
  {"name":"Armenia","flag":"🇦🇲","code":"AM","dial_code":"+374"},
  {"name":"Aruba","flag":"🇦🇼","code":"AW","dial_code":"+297"},
  {"name":"Australia","flag":"🇦🇺","code":"AU","dial_code":"+61"},
  {"name":"Austria","flag":"🇦🇹","code":"AT","dial_code":"+43"},
  {"name":"Azerbaijan","flag":"🇦🇿","code":"AZ","dial_code":"+994"},
  {"name":"Bahamas","flag":"🇧🇸","code":"BS","dial_code":"+1242"},
  {"name":"Bahrain","flag":"🇧🇭","code":"BH","dial_code":"+973"},
  {"name":"Bangladesh","flag":"🇧🇩","code":"BD","dial_code":"+880"},
  {"name":"Barbados","flag":"🇧🇧","code":"BB","dial_code":"+1246"},
  {"name":"Belarus","flag":"🇧🇾","code":"BY","dial_code":"+375"},
  {"name":"Belgium","flag":"🇧🇪","code":"BE","dial_code":"+32"},
  {"name":"Belize","flag":"🇧🇿","code":"BZ","dial_code":"+501"},
  {"name":"Benin","flag":"🇧🇯","code":"BJ","dial_code":"+229"},
  {"name":"Bermuda","flag":"🇧🇲","code":"BM","dial_code":"+1441"},
  {"name":"Bhutan","flag":"🇧🇹","code":"BT","dial_code":"+975"},
  {"name":"Bolivia, Plurinational State of bolivia","flag":"🇧🇴","code":"BO","dial_code":"+591"},
  {"name":"Bosnia and Herzegovina","flag":"🇧🇦","code":"BA","dial_code":"+387"},
  {"name":"Botswana","flag":"🇧🇼","code":"BW","dial_code":"+267"},
  {"name":"Bouvet Island","flag":"🇧🇻","code":"BV","dial_code":"+47"},
  {"name":"Brazil","flag":"🇧🇷","code":"BR","dial_code":"+55"},
  {"name":"British Indian Ocean Territory","flag":"🇮🇴","code":"IO","dial_code":"+246"},
  {"name":"Brunei Darussalam","flag":"🇧🇳","code":"BN","dial_code":"+673"},
  {"name":"Bulgaria","flag":"🇧🇬","code":"BG","dial_code":"+359"},
  {"name":"Burkina Faso","flag":"🇧🇫","code":"BF","dial_code":"+226"},
  {"name":"Burundi","flag":"🇧🇮","code":"BI","dial_code":"+257"},
  {"name":"Cambodia","flag":"🇰🇭","code":"KH","dial_code":"+855"},
  {"name":"Cameroon","flag":"🇨🇲","code":"CM","dial_code":"+237"},
  {"name":"Canada","flag":"🇨🇦","code":"CA","dial_code":"+1"},
  {"name":"Cape Verde","flag":"🇨🇻","code":"CV","dial_code":"+238"},
  {"name":"Cayman Islands","flag":"🇰🇾","code":"KY","dial_code":"+345"},
  {"name":"Central African Republic","flag":"🇨🇫","code":"CF","dial_code":"+236"},
  {"name":"Chad","flag":"🇹🇩","code":"TD","dial_code":"+235"},
  {"name":"Chile","flag":"🇨🇱","code":"CL","dial_code":"+56"},
  {"name":"China","flag":"🇨🇳","code":"CN","dial_code":"+86"},
  {"name":"Christmas Island","flag":"🇨🇽","code":"CX","dial_code":"+61"},
  {"name":"Cocos (Keeling) Islands","flag":"🇨🇨","code":"CC","dial_code":"+61"},
  {"name":"Colombia","flag":"🇨🇴","code":"CO","dial_code":"+57"},
  {"name":"Comoros","flag":"🇰🇲","code":"KM","dial_code":"+269"},
  {"name":"Congo","flag":"🇨🇬","code":"CG","dial_code":"+242"},
  {"name":"Congo, The Democratic Republic of the Congo","flag":"🇨🇩","code":"CD","dial_code":"+243"},
  {"name":"Cook Islands","flag":"🇨🇰","code":"CK","dial_code":"+682"},
  {"name":"Costa Rica","flag":"🇨🇷","code":"CR","dial_code":"+506"},
  {"name":"Cote d'Ivoire","flag":"🇨🇮","code":"CI","dial_code":"+225"},
  {"name":"Croatia","flag":"🇭🇷","code":"HR","dial_code":"+385"},
  {"name":"Cuba","flag":"🇨🇺","code":"CU","dial_code":"+53"},
  {"name":"Cyprus","flag":"🇨🇾","code":"CY","dial_code":"+357"},
  {"name":"Czech Republic","flag":"🇨🇿","code":"CZ","dial_code":"+420"},
  {"name":"Denmark","flag":"🇩🇰","code":"DK","dial_code":"+45"},
  {"name":"Djibouti","flag":"🇩🇯","code":"DJ","dial_code":"+253"},
  {"name":"Dominica","flag":"🇩🇲","code":"DM","dial_code":"+1767"},
  {"name":"Dominican Republic","flag":"🇩🇴","code":"DO","dial_code":"+1849"},
  {"name":"Ecuador","flag":"🇪🇨","code":"EC","dial_code":"+593"},
  {"name":"Egypt","flag":"🇪🇬","code":"EG","dial_code":"+20"},
  {"name":"El Salvador","flag":"🇸🇻","code":"SV","dial_code":"+503"},
  {"name":"Equatorial Guinea","flag":"🇬🇶","code":"GQ","dial_code":"+240"},
  {"name":"Eritrea","flag":"🇪🇷","code":"ER","dial_code":"+291"},
  {"name":"Estonia","flag":"🇪🇪","code":"EE","dial_code":"+372"},
  {"name":"Ethiopia","flag":"🇪🇹","code":"ET","dial_code":"+251"},
  {"name":"Falkland Islands (Malvinas)","flag":"🇫🇰","code":"FK","dial_code":"+500"},
  {"name":"Faroe Islands","flag":"🇫🇴","code":"FO","dial_code":"+298"},
  {"name":"Fiji","flag":"🇫🇯","code":"FJ","dial_code":"+679"},
  {"name":"Finland","flag":"🇫🇮","code":"FI","dial_code":"+358"},
  {"name":"France","flag":"🇫🇷","code":"FR","dial_code":"+33"},
  {"name":"French Guiana","flag":"🇬🇫","code":"GF","dial_code":"+594"},
  {"name":"French Polynesia","flag":"🇵🇫","code":"PF","dial_code":"+689"},
  {"name":"French Southern Territories","flag":"🇹🇫","code":"TF","dial_code":"+262"},
  {"name":"Gabon","flag":"🇬🇦","code":"GA","dial_code":"+241"},
  {"name":"Gambia","flag":"🇬🇲","code":"GM","dial_code":"+220"},
  {"name":"Georgia","flag":"🇬🇪","code":"GE","dial_code":"+995"},
  {"name":"Germany","flag":"🇩🇪","code":"DE","dial_code":"+49"},
  {"name":"Ghana","flag":"🇬🇭","code":"GH","dial_code":"+233"},
  {"name":"Gibraltar","flag":"🇬🇮","code":"GI","dial_code":"+350"},
  {"name":"Greece","flag":"🇬🇷","code":"GR","dial_code":"+30"},
  {"name":"Greenland","flag":"🇬🇱","code":"GL","dial_code":"+299"},
  {"name":"Grenada","flag":"🇬🇩","code":"GD","dial_code":"+1473"},
  {"name":"Guadeloupe","flag":"🇬🇵","code":"GP","dial_code":"+590"},
  {"name":"Guam","flag":"🇬🇺","code":"GU","dial_code":"+1671"},
  {"name":"Guatemala","flag":"🇬🇹","code":"GT","dial_code":"+502"},
  {"name":"Guernsey","flag":"🇬🇬","code":"GG","dial_code":"+44"},
  {"name":"Guinea","flag":"🇬🇳","code":"GN","dial_code":"+224"},
  {"name":"Guinea-Bissau","flag":"🇬🇼","code":"GW","dial_code":"+245"},
  {"name":"Guyana","flag":"🇬🇾","code":"GY","dial_code":"+592"},
  {"name":"Haiti","flag":"🇭🇹","code":"HT","dial_code":"+509"},
  {"name":"Heard Island and Mcdonald Islands","flag":"🇭🇲","code":"HM","dial_code":"+672"},
  {"name":"Holy See (Vatican City State)","flag":"🇻🇦","code":"VA","dial_code":"+379"},
  {"name":"Honduras","flag":"🇭🇳","code":"HN","dial_code":"+504"},
  {"name":"Hong Kong","flag":"🇭🇰","code":"HK","dial_code":"+852"},
  {"name":"Hungary","flag":"🇭🇺","code":"HU","dial_code":"+36"},
  {"name":"Iceland","flag":"🇮🇸","code":"IS","dial_code":"+354"},
  {"name":"India","flag":"🇮🇳","code":"IN","dial_code":"+91"},
  {"name":"Indonesia","flag":"🇮🇩","code":"ID","dial_code":"+62"},
  {"name":"Iran, Islamic Republic of Persian Gulf","flag":"🇮🇷","code":"IR","dial_code":"+98"},
  {"name":"Iraq","flag":"🇮🇶","code":"IQ","dial_code":"+964"},
  {"name":"Ireland","flag":"🇮🇪","code":"IE","dial_code":"+353"},
  {"name":"Isle of Man","flag":"🇮🇲","code":"IM","dial_code":"+44"},
  {"name":"Israel","flag":"🇮🇱","code":"IL","dial_code":"+972"},
  {"name":"Italy","flag":"🇮🇹","code":"IT","dial_code":"+39"},
  {"name":"Jamaica","flag":"🇯🇲","code":"JM","dial_code":"+1876"},
  {"name":"Japan","flag":"🇯🇵","code":"JP","dial_code":"+81"},
  {"name":"Jersey","flag":"🇯🇪","code":"JE","dial_code":"+44"},
  {"name":"Jordan","flag":"🇯🇴","code":"JO","dial_code":"+962"},
  {"name":"Kazakhstan","flag":"🇰🇿","code":"KZ","dial_code":"+7"},
  {"name":"Kenya","flag":"🇰🇪","code":"KE","dial_code":"+254"},
  {"name":"Kiribati","flag":"🇰🇮","code":"KI","dial_code":"+686"},
  {"name":"Korea, Democratic People's Republic of Korea","flag":"🇰🇵","code":"KP","dial_code":"+850"},
  {"name":"Korea, Republic of South Korea","flag":"🇰🇷","code":"KR","dial_code":"+82"},
  {"name":"Kosovo","flag":"🇽🇰","code":"XK","dial_code":"+383"},
  {"name":"Kuwait","flag":"🇰🇼","code":"KW","dial_code":"+965"},
  {"name":"Kyrgyzstan","flag":"🇰🇬","code":"KG","dial_code":"+996"},
  {"name":"Laos","flag":"🇱🇦","code":"LA","dial_code":"+856"},
  {"name":"Latvia","flag":"🇱🇻","code":"LV","dial_code":"+371"},
  {"name":"Lebanon","flag":"🇱🇧","code":"LB","dial_code":"+961"},
  {"name":"Lesotho","flag":"🇱🇸","code":"LS","dial_code":"+266"},
  {"name":"Liberia","flag":"🇱🇷","code":"LR","dial_code":"+231"},
  {"name":"Libyan Arab Jamahiriya","flag":"🇱🇾","code":"LY","dial_code":"+218"},
  {"name":"Liechtenstein","flag":"🇱🇮","code":"LI","dial_code":"+423"},
  {"name":"Lithuania","flag":"🇱🇹","code":"LT","dial_code":"+370"},
  {"name":"Luxembourg","flag":"🇱🇺","code":"LU","dial_code":"+352"},
  {"name":"Macao","flag":"🇲🇴","code":"MO","dial_code":"+853"},
  {"name":"Macedonia","flag":"🇲🇰","code":"MK","dial_code":"+389"},
  {"name":"Madagascar","flag":"🇲🇬","code":"MG","dial_code":"+261"},
  {"name":"Malawi","flag":"🇲🇼","code":"MW","dial_code":"+265"},
  {"name":"Malaysia","flag":"🇲🇾","code":"MY","dial_code":"+60"},
  {"name":"Maldives","flag":"🇲🇻","code":"MV","dial_code":"+960"},
  {"name":"Mali","flag":"🇲🇱","code":"ML","dial_code":"+223"},
  {"name":"Malta","flag":"🇲🇹","code":"MT","dial_code":"+356"},
  {"name":"Marshall Islands","flag":"🇲🇭","code":"MH","dial_code":"+692"},
  {"name":"Martinique","flag":"🇲🇶","code":"MQ","dial_code":"+596"},
  {"name":"Mauritania","flag":"🇲🇷","code":"MR","dial_code":"+222"},
  {"name":"Mauritius","flag":"🇲🇺","code":"MU","dial_code":"+230"},
  {"name":"Mayotte","flag":"🇾🇹","code":"YT","dial_code":"+262"},
  {"name":"Mexico","flag":"🇲🇽","code":"MX","dial_code":"+52"},
  {"name":"Micronesia, Federated States of Micronesia","flag":"🇫🇲","code":"FM","dial_code":"+691"},
  {"name":"Moldova","flag":"🇲🇩","code":"MD","dial_code":"+373"},
  {"name":"Monaco","flag":"🇲🇨","code":"MC","dial_code":"+377"},
  {"name":"Mongolia","flag":"🇲🇳","code":"MN","dial_code":"+976"},
  {"name":"Montenegro","flag":"🇲🇪","code":"ME","dial_code":"+382"},
  {"name":"Montserrat","flag":"🇲🇸","code":"MS","dial_code":"+1664"},
  {"name":"Morocco","flag":"🇲🇦","code":"MA","dial_code":"+212"},
  {"name":"Mozambique","flag":"🇲🇿","code":"MZ","dial_code":"+258"},
  {"name":"Myanmar","flag":"🇲🇲","code":"MM","dial_code":"+95"},
  {"name":"Namibia","flag":"🇳🇦","code":"NA","dial_code":"+264"},
  {"name":"Nauru","flag":"🇳🇷","code":"NR","dial_code":"+674"},
  {"name":"Nepal","flag":"🇳🇵","code":"NP","dial_code":"+977"},
  {"name":"Netherlands","flag":"🇳🇱","code":"NL","dial_code":"+31"},
  {"name":"Netherlands Antilles","flag":"","code":"AN","dial_code":"+599"},
  {"name":"New Caledonia","flag":"🇳🇨","code":"NC","dial_code":"+687"},
  {"name":"New Zealand","flag":"🇳🇿","code":"NZ","dial_code":"+64"},
  {"name":"Nicaragua","flag":"🇳🇮","code":"NI","dial_code":"+505"},
  {"name":"Niger","flag":"🇳🇪","code":"NE","dial_code":"+227"},
  {"name":"Nigeria","flag":"🇳🇬","code":"NG","dial_code":"+234"},
  {"name":"Niue","flag":"🇳🇺","code":"NU","dial_code":"+683"},
  {"name":"Norfolk Island","flag":"🇳🇫","code":"NF","dial_code":"+672"},
  {"name":"Northern Mariana Islands","flag":"🇲🇵","code":"MP","dial_code":"+1670"},
  {"name":"Norway","flag":"🇳🇴","code":"NO","dial_code":"+47"},
  {"name":"Oman","flag":"🇴🇲","code":"OM","dial_code":"+968"},
  {"name":"Pakistan","flag":"🇵🇰","code":"PK","dial_code":"+92"},
  {"name":"Palau","flag":"🇵🇼","code":"PW","dial_code":"+680"},
  {"name":"Palestinian Territory, Occupied","flag":"🇵🇸","code":"PS","dial_code":"+970"},
  {"name":"Panama","flag":"🇵🇦","code":"PA","dial_code":"+507"},
  {"name":"Papua New Guinea","flag":"🇵🇬","code":"PG","dial_code":"+675"},
  {"name":"Paraguay","flag":"🇵🇾","code":"PY","dial_code":"+595"},
  {"name":"Peru","flag":"🇵🇪","code":"PE","dial_code":"+51"},
  {"name":"Philippines","flag":"🇵🇭","code":"PH","dial_code":"+63"},
  {"name":"Pitcairn","flag":"🇵🇳","code":"PN","dial_code":"+64"},
  {"name":"Poland","flag":"🇵🇱","code":"PL","dial_code":"+48"},
  {"name":"Portugal","flag":"🇵🇹","code":"PT","dial_code":"+351"},
  {"name":"Puerto Rico","flag":"🇵🇷","code":"PR","dial_code":"+1939"},
  {"name":"Qatar","flag":"🇶🇦","code":"QA","dial_code":"+974"},
  {"name":"Romania","flag":"🇷🇴","code":"RO","dial_code":"+40"},
  {"name":"Russia","flag":"🇷🇺","code":"RU","dial_code":"+7"},
  {"name":"Rwanda","flag":"🇷🇼","code":"RW","dial_code":"+250"},
  {"name":"Reunion","flag":"🇷🇪","code":"RE","dial_code":"+262"},
  {"name":"Saint Barthelemy","flag":"🇧🇱","code":"BL","dial_code":"+590"},
  {"name":"Saint Helena, Ascension and Tristan Da Cunha","flag":"🇸🇭","code":"SH","dial_code":"+290"},
  {"name":"Saint Kitts and Nevis","flag":"🇰🇳","code":"KN","dial_code":"+1869"},
  {"name":"Saint Lucia","flag":"🇱🇨","code":"LC","dial_code":"+1758"},
  {"name":"Saint Martin","flag":"🇲🇫","code":"MF","dial_code":"+590"},
  {"name":"Saint Pierre and Miquelon","flag":"🇵🇲","code":"PM","dial_code":"+508"},
  {"name":"Saint Vincent and the Grenadines","flag":"🇻🇨","code":"VC","dial_code":"+1784"},
  {"name":"Samoa","flag":"🇼🇸","code":"WS","dial_code":"+685"},
  {"name":"San Marino","flag":"🇸🇲","code":"SM","dial_code":"+378"},
  {"name":"Sao Tome and Principe","flag":"🇸🇹","code":"ST","dial_code":"+239"},
  {"name":"Saudi Arabia","flag":"🇸🇦","code":"SA","dial_code":"+966"},
  {"name":"Senegal","flag":"🇸🇳","code":"SN","dial_code":"+221"},
  {"name":"Serbia","flag":"🇷🇸","code":"RS","dial_code":"+381"},
  {"name":"Seychelles","flag":"🇸🇨","code":"SC","dial_code":"+248"},
  {"name":"Sierra Leone","flag":"🇸🇱","code":"SL","dial_code":"+232"},
  {"name":"Singapore","flag":"🇸🇬","code":"SG","dial_code":"+65"},
  {"name":"Slovakia","flag":"🇸🇰","code":"SK","dial_code":"+421"},
  {"name":"Slovenia","flag":"🇸🇮","code":"SI","dial_code":"+386"},
  {"name":"Solomon Islands","flag":"🇸🇧","code":"SB","dial_code":"+677"},
  {"name":"Somalia","flag":"🇸🇴","code":"SO","dial_code":"+252"},
  {"name":"South Africa","flag":"🇿🇦","code":"ZA","dial_code":"+27"},
  {"name":"South Sudan","flag":"🇸🇸","code":"SS","dial_code":"+211"},
  {"name":"South Georgia and the South Sandwich Islands","flag":"🇬🇸","code":"GS","dial_code":"+500"},
  {"name":"Spain","flag":"🇪🇸","code":"ES","dial_code":"+34"},
  {"name":"Sri Lanka","flag":"🇱🇰","code":"LK","dial_code":"+94"},
  {"name":"Sudan","flag":"🇸🇩","code":"SD","dial_code":"+249"},
  {"name":"Suriname","flag":"🇸🇷","code":"SR","dial_code":"+597"},
  {"name":"Svalbard and Jan Mayen","flag":"🇸🇯","code":"SJ","dial_code":"+47"},
  {"name":"Eswatini","flag":"🇸🇿","code":"SZ","dial_code":"+268"},
  {"name":"Sweden","flag":"🇸🇪","code":"SE","dial_code":"+46"},
  {"name":"Switzerland","flag":"🇨🇭","code":"CH","dial_code":"+41"},
  {"name":"Syrian Arab Republic","flag":"🇸🇾","code":"SY","dial_code":"+963"},
  {"name":"Taiwan","flag":"🇹🇼","code":"TW","dial_code":"+886"},
  {"name":"Tajikistan","flag":"🇹🇯","code":"TJ","dial_code":"+992"},
  {"name":"Tanzania, United Republic of Tanzania","flag":"🇹🇿","code":"TZ","dial_code":"+255"},
  {"name":"Thailand","flag":"🇹🇭","code":"TH","dial_code":"+66"},
  {"name":"Timor-Leste","flag":"🇹🇱","code":"TL","dial_code":"+670"},
  {"name":"Togo","flag":"🇹🇬","code":"TG","dial_code":"+228"},
  {"name":"Tokelau","flag":"🇹🇰","code":"TK","dial_code":"+690"},
  {"name":"Tonga","flag":"🇹🇴","code":"TO","dial_code":"+676"},
  {"name":"Trinidad and Tobago","flag":"🇹🇹","code":"TT","dial_code":"+1868"},
  {"name":"Tunisia","flag":"🇹🇳","code":"TN","dial_code":"+216"},
  {"name":"Turkey","flag":"🇹🇷","code":"TR","dial_code":"+90"},
  {"name":"Turkmenistan","flag":"🇹🇲","code":"TM","dial_code":"+993"},
  {"name":"Turks and Caicos Islands","flag":"🇹🇨","code":"TC","dial_code":"+1649"},
  {"name":"Tuvalu","flag":"🇹🇻","code":"TV","dial_code":"+688"},
  {"name":"Uganda","flag":"🇺🇬","code":"UG","dial_code":"+256"},
  {"name":"Ukraine","flag":"🇺🇦","code":"UA","dial_code":"+380"},
  {"name":"United Arab Emirates","flag":"🇦🇪","code":"AE","dial_code":"+971"},
  {"name":"United Kingdom","flag":"🇬🇧","code":"GB","dial_code":"+44"},
  {"name":"United States","flag":"🇺🇸","code":"US","dial_code":"+1"},
  {"name":"Uruguay","flag":"🇺🇾","code":"UY","dial_code":"+598"},
  {"name":"Uzbekistan","flag":"🇺🇿","code":"UZ","dial_code":"+998"},
  {"name":"Vanuatu","flag":"🇻🇺","code":"VU","dial_code":"+678"},
  {"name":"Venezuela, Bolivarian Republic of Venezuela","flag":"🇻🇪","code":"VE","dial_code":"+58"},
  {"name":"Vietnam","flag":"🇻🇳","code":"VN","dial_code":"+84"},
  {"name":"Virgin Islands, British","flag":"🇻🇬","code":"VG","dial_code":"+1284"},
  {"name":"Virgin Islands, U.S.","flag":"🇻🇮","code":"VI","dial_code":"+1340"},
  {"name":"Wallis and Futuna","flag":"🇼🇫","code":"WF","dial_code":"+681"},
  {"name":"Yemen","flag":"🇾🇪","code":"YE","dial_code":"+967"},
  {"name":"Zambia","flag":"🇿🇲","code":"ZM","dial_code":"+260"},
  {"name":"Zimbabwe","flag":"🇿🇼","code":"ZW","dial_code":"+263"}
]

const COUNTRY_PHONE_CODES = COUNTRY_DIAL_INFO.reduce((acc, item) => {
  acc[item.code] = item.dial_code
  return acc
}, {})

const getDialCodeForCountryName = (countryName) => {
  if (!countryName) return ''
  const country = countryList.find(c => c.name === countryName)
  if (!country) return ''
  return COUNTRY_PHONE_CODES[country.code] || ''
}

const normalizePhoneCode = (phone) => (phone || '').replace(/[^\d]/g, '')

const Data = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const { user: clerkUser, isLoaded: userLoaded } = useUser()
  const { isSignedIn, isLoaded: authLoaded } = useAuth()
  const [isEditing, setIsEditing] = useState(false)
  const [userData, setUserData] = useState({
    firstName: '',
    lastName: '',
    middleName: '',
    email: '',
    phone: '',
    country: '',
    countryFlag: '',
    address: '',
    passportSeries: '',
    passportNumber: '',
    identificationNumber: ''
  })
  const [showEmailVerificationModal, setShowEmailVerificationModal] = useState(false)
  const [pendingEmail, setPendingEmail] = useState('')
  const [originalEmail, setOriginalEmail] = useState('')
  const [userId, setUserId] = useState(null)
  const [isWhatsAppUser, setIsWhatsAppUser] = useState(false)
  const [isRecognizingPassport, setIsRecognizingPassport] = useState(false)
  const [showPassportRecognitionModal, setShowPassportRecognitionModal] = useState(false)
  const [extractedPassportData, setExtractedPassportData] = useState(null)
  const passportInputRef = useRef(null)
  const buyerCabinetPageRef = useRef(null)
  const buyerCabinetMainScrollRef = useRef(null)
  const editSnapshotRef = useRef(null) // снимок данных при входе в режим редактирования

  useChainedAppLayoutScroll(buyerCabinetPageRef, buyerCabinetMainScrollRef, { active: true })
  const [verificationStatus, setVerificationStatus] = useState(null)

  // Вспомогательная функция для форматирования номера телефона с плюсом
  const formatPhoneWithPlus = (phone) => {
    if (!phone) return ''
    // Убираем все пробелы и нецифровые символы, кроме +
    const cleaned = phone.replace(/[^\d+]/g, '')
    // Если номер начинается с цифр, добавляем плюс
    if (cleaned && !cleaned.startsWith('+')) {
      return '+' + cleaned
    }
    return cleaned
  }

  // Загружаем данные пользователя при монтировании компонента
  useEffect(() => {
    const loadUserData = async () => {
      const savedUserData = getUserData()
      
      if (savedUserData.isLoggedIn) {
        // Определяем, зарегистрирован ли пользователь через WhatsApp
        const whatsAppUser = savedUserData.loginMethod === 'whatsapp' || 
                            (savedUserData.phone && !savedUserData.email)
        setIsWhatsAppUser(whatsAppUser)
        setUserId(savedUserData.id)
        
        // Проверяем, зарегистрирован ли пользователь через Clerk
        const isClerkUser = savedUserData.loginMethod === 'clerk' || (isSignedIn && clerkUser)
        
        // Если пользователь зарегистрирован через Clerk, проверяем, что ID числовой (из БД)
        // Если ID из Clerk (например, user_xxxxx), нужно найти или создать пользователя в БД
        const isNumericId = savedUserData.id && /^\d+$/.test(savedUserData.id.toString())
        
        // Если пользователь авторизован в localStorage, загружаем его данные
        // Также пытаемся синхронизировать с БД, если есть ID
        if (savedUserData.id) {
          try {
            // Если пользователь через Clerk и ID не числовой (ID из Clerk), 
            // нужно найти пользователя в БД по email/телефону или создать его
            if (isClerkUser && !isNumericId) {
              console.log('⚠️ Data: Пользователь Clerk с ID из Clerk, синхронизируем с БД...')
              
              let dbUserId = null
              
              // Получаем email и телефон из Clerk или localStorage
              let userEmail = ''
              let userPhone = ''
              let userName = savedUserData.name || ''
              
              if (isSignedIn && clerkUser && userLoaded) {
                // Используем данные из Clerk, если доступны
                if (clerkUser.primaryEmailAddress?.emailAddress) {
                  userEmail = clerkUser.primaryEmailAddress.emailAddress
                } else if (clerkUser.emailAddresses && clerkUser.emailAddresses.length > 0) {
                  userEmail = clerkUser.emailAddresses[0].emailAddress || ''
                }
                
                if (clerkUser.primaryPhoneNumber?.phoneNumber) {
                  userPhone = clerkUser.primaryPhoneNumber.phoneNumber
                } else if (clerkUser.phoneNumbers && clerkUser.phoneNumbers.length > 0) {
                  userPhone = clerkUser.phoneNumbers[0].phoneNumber || ''
                }
                
                if (clerkUser.fullName) {
                  userName = clerkUser.fullName
                } else if (clerkUser.firstName || clerkUser.lastName) {
                  userName = `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim()
                }
              } else {
                // Используем данные из localStorage
                userEmail = savedUserData.email || ''
                userPhone = savedUserData.phone || savedUserData.phoneFormatted || ''
              }
              
              // Сначала пытаемся найти пользователя по email
              if (userEmail) {
                const emailResponse = await fetch(`${API_BASE_URL}/users/email/${encodeURIComponent(userEmail.toLowerCase())}`)
                if (emailResponse.ok) {
                  const emailData = await emailResponse.json()
                  if (emailData.success && emailData.data) {
                    dbUserId = emailData.data.id
                    console.log('✅ Data: Пользователь найден в БД по email:', dbUserId)
                  }
                }
              }
              
              // Если не нашли по email, пытаемся по телефону
              if (!dbUserId && userPhone) {
                const phoneDigits = userPhone.replace(/\D/g, '')
                if (phoneDigits) {
                  const phoneResponse = await fetch(`${API_BASE_URL}/users/phone/${phoneDigits}`)
                  if (phoneResponse.ok) {
                    const phoneData = await phoneResponse.json()
                    if (phoneData.success && phoneData.data) {
                      dbUserId = phoneData.data.id
                      console.log('✅ Data: Пользователь найден в БД по телефону:', dbUserId)
                    }
                  }
                }
              }
              
              // Если пользователь не найден, создаем его
              if (!dbUserId) {
                const nameParts = userName.split(' ')
                const firstName = nameParts[0] || 'Пользователь'
                const lastName = nameParts.slice(1).join(' ') || ''
                
                // Получаем роль из localStorage или sessionStorage
                const savedRole = sessionStorage.getItem('clerk_oauth_user_role') || 
                                localStorage.getItem('userRole') || 
                                savedUserData.role || 
                                'buyer'
                
                console.log('Data: Создание пользователя Clerk в БД с ролью:', savedRole)
                
                const createResponse = await fetch(`${API_BASE_URL}/users`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    first_name: firstName,
                    last_name: lastName,
                    email: userEmail || null,
                    phone_number: userPhone ? userPhone.replace(/\D/g, '') : null,
                    role: savedRole === 'seller' ? 'seller' : 'buyer',
                    is_verified: 0,
                    is_online: 1
                  })
                })
                
                if (createResponse.ok) {
                  const createData = await createResponse.json()
                  if (createData.success && createData.data) {
                    dbUserId = createData.data.id
                    console.log('✅ Data: Пользователь создан в БД:', dbUserId)
                    
                    // Обновляем localStorage с правильным ID из БД
                    const updatedUserData = {
                      ...savedUserData,
                      id: dbUserId.toString()
                    }
                    saveUserData(updatedUserData, 'clerk')
                    localStorage.setItem('userId', String(dbUserId))
                  }
                } else {
                  const errorData = await createResponse.json().catch(() => ({}))
                  console.error('❌ Data: Ошибка создания пользователя:', errorData)
                }
              } else {
                // Если нашли пользователя, обновляем localStorage с правильным ID из БД
                const updatedUserData = {
                  ...savedUserData,
                  id: dbUserId.toString()
                }
                saveUserData(updatedUserData, 'clerk')
                localStorage.setItem('userId', String(dbUserId))
              }
              
              // Если нашли или создали пользователя, обновляем savedUserData.id для дальнейшего использования
              if (dbUserId) {
                savedUserData.id = dbUserId.toString()
                setUserId(dbUserId)
              }
            }
            
            // Теперь пытаемся загрузить данные из БД, используя числовой ID
            const userIdToFetch = savedUserData.id && /^\d+$/.test(savedUserData.id.toString()) 
              ? savedUserData.id 
              : null
            
            if (userIdToFetch) {
              const response = await fetch(`${API_BASE_URL}/users/${userIdToFetch}`)
              if (response.ok) {
                const result = await response.json()
                if (result.success && result.data) {
                  // Обновляем данные из БД
                  const dbUser = result.data
                  const nameParts = (dbUser.first_name && dbUser.last_name 
                    ? `${dbUser.first_name} ${dbUser.last_name}`.trim()
                    : savedUserData.name || '').split(' ')
                  const firstName = nameParts[0] || dbUser.first_name || ''
                  const lastName = nameParts.slice(1).join(' ') || dbUser.last_name || ''
                  
                  const email = dbUser.email || savedUserData.email || ''
                  setOriginalEmail(email)
                  
                  // Форматируем номер телефона с плюсом
                  const phoneFromDB = dbUser.phone_number || ''
                  const phoneFormatted = formatPhoneWithPlus(savedUserData.phoneFormatted || phoneFromDB)
                  
                  setUserData({
                    firstName: firstName,
                    lastName: lastName,
                    middleName: '',
                    email: email,
                    phone: phoneFormatted,
                    country: dbUser.country || savedUserData.country || '',
                    countryFlag: savedUserData.countryFlag || '',
                    address: dbUser.address || '',
                    passportSeries: dbUser.passport_series || '',
                    passportNumber: dbUser.passport_number || '',
                    identificationNumber: dbUser.identification_number || ''
                  })
                  
                  // Обновляем информацию о пользователе WhatsApp, если email был null или is_verified = 0
                  if (whatsAppUser && dbUser.phone_number && (!dbUser.email || dbUser.is_verified === 0)) {
                    setIsWhatsAppUser(true)
                  }
                  
                  return
                }
              } else if (response.status === 404) {
                console.warn('⚠️ Data: Пользователь не найден в БД (404), будет использован fallback')
              }
            }
          } catch (error) {
            console.warn('⚠️ Не удалось загрузить данные из БД, используем localStorage:', error.message)
          }
        }
        
        // Fallback: используем данные из localStorage
        const nameParts = (savedUserData.name || '').split(' ')
        const firstName = nameParts[0] || ''
        const lastName = nameParts.slice(1).join(' ') || ''
        
        const email = savedUserData.email || ''
        setOriginalEmail(email)
        
        // Форматируем номер телефона с плюсом
        const phoneFromStorage = savedUserData.phoneFormatted || savedUserData.phone || ''
        const phoneFormattedStorage = formatPhoneWithPlus(phoneFromStorage)
        
        setUserData({
          firstName: firstName,
          lastName: lastName,
          middleName: '',
          email: email,
          phone: phoneFormattedStorage,
          country: savedUserData.country || '',
          countryFlag: savedUserData.countryFlag || '',
          address: '',
          passportSeries: '',
          passportNumber: '',
          identificationNumber: ''
        })
      } else {
        // Если не авторизован, перенаправляем на главную страницу
        console.warn('⚠️ Пользователь не авторизован, перенаправление на главную')
        navigate('/')
      }
    }
    
    loadUserData()
  }, [navigate, isSignedIn, clerkUser, userLoaded, authLoaded])

  // Загружаем статус верификации при изменении userId или userData
  useEffect(() => {
    if (userId) {
      loadVerificationStatus()
    }
  }, [userId, userData])

  // Скролл и подсветка поля по параметру ?highlight=fieldName (переход из уведомления верификации)
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const highlight = params.get('highlight')
    if (!highlight) return

    let removeTimerId = null
    const timerId = setTimeout(() => {
      const el = document.getElementById(`data-field-${highlight}`)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        el.classList.add('data-field--highlight')
        removeTimerId = setTimeout(() => {
          el.classList.remove('data-field--highlight')
          navigate(location.pathname, { replace: true })
        }, 1800)
      } else {
        navigate(location.pathname, { replace: true })
      }
    }, 300)

    return () => {
      clearTimeout(timerId)
      if (removeTimerId) clearTimeout(removeTimerId)
    }
  }, [location.search, location.pathname, navigate])

  const DATA_HASH_IDS = new Set(['data-section-main', 'data-section-documents'])

  useEffect(() => {
    const raw = location.hash?.replace(/^#/, '') || ''
    if (!DATA_HASH_IDS.has(raw)) return
    const timer = setTimeout(() => {
      document.getElementById(raw)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 400)
    return () => clearTimeout(timer)
  }, [location.pathname, location.hash])

  const loadVerificationStatus = async (force = false) => {
    if (!userId) return
    try {
      const status = await fetchVerificationStatus(API_BASE_URL, userId, { ttlMs: 20000, force })
      if (status) setVerificationStatus(status)
    } catch (error) {
      console.error('Ошибка загрузки статуса верификации:', error)
    }
  }

  useEffect(() => {
    const onPush = () => {
      if (userId) loadVerificationStatus(true)
    }
    window.addEventListener('verification-status-update', onPush)
    return () => window.removeEventListener('verification-status-update', onPush)
  }, [userId])

  // Функции для проверки заполненности блоков
  const isBasicInfoComplete = () => {
    if (!verificationStatus?.missingFields) return false
    const { missingFields } = verificationStatus
    return !missingFields.firstName && 
           !missingFields.lastName && 
           !missingFields.emailOrPhone && 
           !missingFields.country && 
           !missingFields.address
  }

  const isPassportDataComplete = () => {
    if (!verificationStatus?.missingFields) return false
    const { missingFields } = verificationStatus
    return !missingFields.passportSeries && 
           !missingFields.passportNumber && 
           !missingFields.identificationNumber
  }

  const isDocumentsComplete = () => {
    return verificationStatus?.hasDocuments || false
  }

  // Оверлей с переходом на аукцион только при полной готовности к модерации (как GET /verification-status: все поля + документы)
  const showDataSavedOverlay = !isEditing && Boolean(verificationStatus?.isReady)

  // Проверяем, нужно ли показывать индикатор для "Данные"
  const shouldShowDataIndicator = () => {
    // Если verificationStatus еще не загружен, не показываем
    if (!verificationStatus) return false
    return !isBasicInfoComplete() || !isPassportDataComplete()
  }

  /** Список подписей незаполненных полей (как на старом профиле), для баннера на странице. */
  const incompleteDataLabels = useMemo(() => {
    if (!verificationStatus?.missingFields) return null
    const mf = verificationStatus.missingFields
    const labels = []
    if (mf.firstName) labels.push(t('buyerData_labelFirstName'))
    if (mf.lastName) labels.push(t('buyerData_labelLastName'))
    if (mf.emailOrPhone) labels.push(t('buyerData_incompleteBannerContact'))
    if (mf.country) labels.push(t('buyerData_labelCountry'))
    if (mf.address) labels.push(t('buyerData_labelAddress'))
    if (mf.passportSeries) labels.push(t('buyerData_labelPassportSeries'))
    if (mf.passportNumber) labels.push(t('buyerData_labelPassportNumber'))
    if (mf.identificationNumber) labels.push(t('buyerData_labelIdNumber'))
    return labels
  }, [verificationStatus, t])

  // Проверяем, нужно ли показывать индикатор для "Профиль"
  const shouldShowProfileIndicator = () => {
    // Если verificationStatus еще не загружен, не показываем
    if (!verificationStatus) return false
    return !isDocumentsComplete()
  }

  const [connectedAccounts, setConnectedAccounts] = useState({
    google: true
  })

  // Проверка: есть ли несохранённые изменения (сравниваем с снимком при входе в редактирование)
  const hasUnsavedChanges = (() => {
    if (!isEditing || !editSnapshotRef.current) return false
    const s = editSnapshotRef.current
    const normalizePhone = (p) => (p || '').replace(/\D/g, '')
    return (
      (userData.firstName || '') !== (s.firstName || '') ||
      (userData.lastName || '') !== (s.lastName || '') ||
      (userData.email || '') !== (s.email || '') ||
      normalizePhone(userData.phone) !== normalizePhone(s.phone) ||
      (userData.country || '') !== (s.country || '') ||
      (userData.address || '') !== (s.address || '') ||
      (userData.passportSeries || '') !== (s.passportSeries || '') ||
      (userData.passportNumber || '') !== (s.passportNumber || '') ||
      (userData.identificationNumber || '') !== (s.identificationNumber || '')
    )
  })()

  const handleEdit = () => {
    editSnapshotRef.current = { ...userData }
    setIsEditing(true)
  }

  const handleCancel = () => {
    editSnapshotRef.current = null
    setIsEditing(false)
  }

  const handleSave = async () => {
    try {
      const savedUserData = getUserData()
      
      // Если пользователь не авторизован, просто сохраняем в localStorage
      if (!savedUserData.isLoggedIn || !savedUserData.id) {
        console.warn('⚠️ Пользователь не авторизован, данные сохранены только локально')
        setIsEditing(false)
        return
      }
      
      // Проверяем, зарегистрирован ли пользователь через Clerk
      const isClerkUser = savedUserData.loginMethod === 'clerk' || (isSignedIn && clerkUser)
      
      // Если пользователь через Clerk и ID не числовой (ID из Clerk), 
      // нужно найти или создать пользователя в БД перед сохранением
      const isNumericId = savedUserData.id && /^\d+$/.test(savedUserData.id.toString())
      
      if (isClerkUser && !isNumericId) {
        console.log('⚠️ Data handleSave: Пользователь Clerk с ID из Clerk, синхронизируем с БД перед сохранением...')
        
        try {
          let dbUserId = null
          
          // Получаем email и телефон из Clerk или localStorage
          let userEmail = userData.email || savedUserData.email || ''
          let userPhone = userData.phone || savedUserData.phone || savedUserData.phoneFormatted || ''
          let userName = `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || savedUserData.name || ''
          
          if (isSignedIn && clerkUser && userLoaded) {
            // Используем данные из Clerk, если они более свежие
            if (!userEmail && clerkUser.primaryEmailAddress?.emailAddress) {
              userEmail = clerkUser.primaryEmailAddress.emailAddress
            }
            if (!userPhone && clerkUser.primaryPhoneNumber?.phoneNumber) {
              userPhone = clerkUser.primaryPhoneNumber.phoneNumber
            }
            if (!userName && clerkUser.fullName) {
              userName = clerkUser.fullName
            }
          }
          
          // Сначала пытаемся найти пользователя по email
          if (userEmail) {
            const emailResponse = await fetch(`${API_BASE_URL}/users/email/${encodeURIComponent(userEmail.toLowerCase())}`)
            if (emailResponse.ok) {
              const emailData = await emailResponse.json()
              if (emailData.success && emailData.data) {
                dbUserId = emailData.data.id
                console.log('✅ Data handleSave: Пользователь найден в БД по email:', dbUserId)
              }
            }
          }
          
          // Если не нашли по email, пытаемся по телефону
          if (!dbUserId && userPhone) {
            const phoneDigits = userPhone.replace(/\D/g, '')
            if (phoneDigits) {
              const phoneResponse = await fetch(`${API_BASE_URL}/users/phone/${phoneDigits}`)
              if (phoneResponse.ok) {
                const phoneData = await phoneResponse.json()
                if (phoneData.success && phoneData.data) {
                  dbUserId = phoneData.data.id
                  console.log('✅ Data handleSave: Пользователь найден в БД по телефону:', dbUserId)
                }
              }
            }
          }
          
          // Если пользователь не найден, создаем его
          if (!dbUserId) {
            const nameParts = userName.split(' ')
            const firstName = nameParts[0] || userData.firstName || 'Пользователь'
            const lastName = nameParts.slice(1).join(' ') || userData.lastName || ''
            
            // Получаем роль из localStorage или sessionStorage
            const savedRole = sessionStorage.getItem('clerk_oauth_user_role') || 
                            localStorage.getItem('userRole') || 
                            savedUserData.role || 
                            'buyer'
            
            console.log('Data handleSave: Создание пользователя Clerk в БД с ролью:', savedRole)
            
            const createResponse = await fetch(`${API_BASE_URL}/users`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                first_name: firstName,
                last_name: lastName,
                email: userEmail || null,
                phone_number: userPhone ? userPhone.replace(/\D/g, '') : null,
                role: savedRole === 'seller' ? 'seller' : 'buyer',
                is_verified: 0,
                is_online: 1
              })
            })
            
            if (createResponse.ok) {
              const createData = await createResponse.json()
              if (createData.success && createData.data) {
                dbUserId = createData.data.id
                console.log('✅ Data handleSave: Пользователь создан в БД:', dbUserId)
                
                // Обновляем localStorage с правильным ID из БД
                const updatedUserData = {
                  ...savedUserData,
                  id: dbUserId.toString()
                }
                saveUserData(updatedUserData, 'clerk')
                localStorage.setItem('userId', String(dbUserId))
              }
            } else {
              const errorData = await createResponse.json().catch(() => ({}))
              console.error('❌ Data handleSave: Ошибка создания пользователя:', errorData)
            }
          } else {
            // Если нашли пользователя, обновляем localStorage с правильным ID из БД
            const updatedUserData = {
              ...savedUserData,
              id: dbUserId.toString()
            }
            saveUserData(updatedUserData, 'clerk')
            localStorage.setItem('userId', String(dbUserId))
          }
          
          // Обновляем savedUserData.id для дальнейшего использования
          if (dbUserId) {
            savedUserData.id = dbUserId.toString()
            setUserId(dbUserId)
          } else {
            // Если не удалось создать или найти пользователя, показываем ошибку
            showNotification('❌ Не удалось синхронизировать данные с базой данных. Попробуйте обновить страницу.')
            return
          }
        } catch (error) {
          console.error('❌ Data handleSave: Ошибка синхронизации с БД:', error)
          showNotification('❌ Ошибка синхронизации с базой данных. Попробуйте обновить страницу.')
          return
        }
      }

      // Проверяем, изменился ли email для пользователя WhatsApp
      const emailChanged = userData.email && userData.email !== originalEmail
      
      if (emailChanged && isWhatsAppUser && userData.email.trim() !== '') {
        // Если email изменился для пользователя WhatsApp, требуем подтверждение
        // Сначала отправляем код подтверждения
        try {
          const emailLower = userData.email.toLowerCase()
          const codeResult = await sendEmailVerificationCode(emailLower)
          
          if (codeResult.success) {
            // Сохраняем новый email как pending
            setPendingEmail(emailLower)
            // Показываем модальное окно для ввода кода
            setShowEmailVerificationModal(true)
            return // Не сохраняем данные, пока не подтвержден email
          } else {
            showNotification(codeResult.error || 'Не удалось отправить код подтверждения. Попробуйте позже.')
            return
          }
        } catch (error) {
          console.error('Ошибка отправки кода подтверждения:', error)
          showNotification('Ошибка отправки кода подтверждения. Попробуйте позже.')
          return
        }
      }

      // Форматируем номер телефона (убираем все кроме цифр)
      const phoneDigits = userData.phone ? userData.phone.replace(/\D/g, '') || null : null

      // Подготавливаем данные для отправки на backend
      const updateData = {
        first_name: userData.firstName || null,
        last_name: userData.lastName || null,
        email: userData.email || null,
        phone_number: phoneDigits,
        address: userData.address || null,
        country: userData.country || null,
        passport_series: userData.passportSeries || null,
        passport_number: userData.passportNumber || null,
        identification_number: userData.identificationNumber || null
      }

      console.log('📤 Отправка данных на сервер:', {
        userId: savedUserData.id,
        apiUrl: `${API_BASE_URL}/users/${savedUserData.id}`,
        updateData
      })

      // Отправляем данные на backend
      const response = await fetch(`${API_BASE_URL}/users/${savedUserData.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData)
      })

      if (response.ok) {
        const result = await response.json()
        
        // Проверяем, требуется ли подтверждение email
        if (result.requiresVerification === true) {
          // Если требуется подтверждение, отправляем код и показываем модальное окно
          try {
            const emailLower = (userData.email || '').toLowerCase()
            if (emailLower) {
              const codeResult = await sendEmailVerificationCode(emailLower)
              
              if (codeResult.success) {
                setPendingEmail(emailLower)
                setShowEmailVerificationModal(true)
                return
              } else {
                showNotification(codeResult.error || 'Не удалось отправить код подтверждения. Попробуйте позже.')
                return
              }
            }
          } catch (error) {
            console.error('Ошибка отправки кода подтверждения:', error)
            showNotification('Ошибка отправки кода подтверждения. Попробуйте позже.')
            return
          }
        }
        
        console.log('✅ Данные успешно сохранены в БД:', result.data)
        
        // Форматируем номер телефона с плюсом для обновления состояния
        const formattedPhone = formatPhoneWithPlus(userData.phone || '')
        
        // Обновляем данные в localStorage
        const updatedUserData = {
          ...savedUserData,
          name: `${userData.firstName} ${userData.lastName}`.trim(),
          email: result.data?.email || userData.email || savedUserData.email,
          phoneFormatted: formattedPhone || savedUserData.phoneFormatted,
          phone: phoneDigits || savedUserData.phone,
          country: userData.country || savedUserData.country,
          address: userData.address || savedUserData.address
        }
        localStorage.setItem('userData', JSON.stringify(updatedUserData))
        
        // Обновляем originalEmail после успешного сохранения
        setOriginalEmail(result.data?.email || userData.email || originalEmail)

        // Обновляем состояние, включая номер телефона с плюсом
        setUserData(prev => ({ 
          ...prev, 
          phone: formattedPhone || prev.phone
        }))
        
        editSnapshotRef.current = null
        setIsEditing(false)
        // Перезагружаем статус верификации после сохранения
        loadVerificationStatus()
        // Отправляем событие для обновления уведомления о верификации
        window.dispatchEvent(new Event('verification-status-update'))
        showNotification('Данные успешно сохранены!')
      } else {
        const errorText = await response.text().catch(() => 'Не удалось получить детали ошибки')
        let errorData = {}
        try {
          errorData = JSON.parse(errorText)
        } catch {
          errorData = { error: errorText || `Ошибка ${response.status}: ${response.statusText}` }
        }
        
        console.error('❌ Ошибка при сохранении в БД:', response.status, errorData.error || 'Неизвестная ошибка')
        
        // Формируем информативное сообщение об ошибке
        let errorMessage = '⚠️ Данные сохранены локально, но не в БД.\n\n'
        
        // Если это ошибка валидации пароля, показываем детальную информацию
        if (response.status === 400 && errorData.passwordValidation) {
          errorMessage = errorData.error || errorData.message || 'Пароль не соответствует требованиям'
          if (errorData.passwordValidation.missing && errorData.passwordValidation.missing.length > 0) {
            errorMessage += `\n\nДобавьте: ${errorData.passwordValidation.missing.join(', ')}`
          }
          if (errorData.passwordValidation.present && errorData.passwordValidation.present.length > 0) {
            errorMessage += `\nУже есть: ${errorData.passwordValidation.present.join(', ')}`
          }
        } else if (response.status === 404) {
          errorMessage += '❌ Пользователь не найден в базе данных.'
        } else if (response.status === 409) {
          errorMessage += '❌ Конфликт данных: ' + (errorData.error || 'Пользователь с такими данными уже существует')
        } else if (response.status === 500) {
          errorMessage += '❌ Ошибка сервера: ' + (errorData.error || 'Внутренняя ошибка сервера')
          errorMessage += '\n\n💡 Проверьте логи сервера для подробностей.'
        } else {
          errorMessage += '❌ Ошибка ' + response.status + ': ' + (errorData.error || response.statusText)
        }
        
        errorMessage += '\n\n💡 Убедитесь, что:\n- Backend сервер запущен\n- База данных доступна\n- URL API правильный: ' + API_BASE_URL
        
        // Fallback: сохраняем только в localStorage
        const updatedUserData = {
          ...savedUserData,
          name: `${userData.firstName} ${userData.lastName}`.trim(),
          email: userData.email || savedUserData.email,
          phoneFormatted: userData.phone || savedUserData.phoneFormatted,
          phone: phoneDigits || savedUserData.phone,
          country: userData.country || savedUserData.country,
          address: userData.address || savedUserData.address
        }
        localStorage.setItem('userData', JSON.stringify(updatedUserData))
        
        showNotification(errorMessage)
        editSnapshotRef.current = null
        setIsEditing(false)
      }
    } catch (error) {
      console.error('❌ Ошибка при сохранении данных:', error)
      console.error('   Тип ошибки:', error.name)
      console.error('   Сообщение:', error.message)
      console.error('   Stack:', error.stack)
      
      // Определяем тип ошибки для более информативного сообщения
      let errorMessage = '⚠️ Ошибка при сохранении. Данные сохранены локально.'
      
      if (error.message === 'Failed to fetch' || error.name === 'TypeError') {
        errorMessage += '\n\n💡 Проверьте:\n- Запущен ли сервер (npm run server или node server/server.js)\n- Правильно ли указан API_BASE_URL\n- Доступен ли сервер по адресу ' + API_BASE_URL
      } else if (error.message?.includes('replace')) {
        errorMessage += '\n\n❌ Ошибка обработки данных: ' + error.message
        errorMessage += '\n\n💡 Убедитесь, что все поля заполнены корректно.'
      } else {
        errorMessage += '\n\nОшибка: ' + (error.message || 'Неизвестная ошибка')
      }
      
      // Fallback: сохраняем только в localStorage
      const savedUserData = getUserData()
      const updatedUserData = {
        ...savedUserData,
        name: `${userData.firstName} ${userData.lastName}`.trim(),
        email: userData.email || savedUserData.email,
        phoneFormatted: userData.phone || savedUserData.phoneFormatted,
        country: userData.country || savedUserData.country,
        address: userData.address || savedUserData.address
      }
      localStorage.setItem('userData', JSON.stringify(updatedUserData))
      
      showNotification(errorMessage)
      editSnapshotRef.current = null
      setIsEditing(false)
    }
  }
  
  // Обработчик успешного подтверждения email
  const handleEmailVerificationSuccess = async (userDataOrCode) => {
    try {
      // После подтверждения email на сервере, загружаем обновленные данные пользователя
      if (!userId) {
        console.error('Ошибка: userId не определен')
        setShowEmailVerificationModal(false)
        setPendingEmail('')
        return
      }
      
      // Сохраняем email перед очисткой pendingEmail
      const confirmedEmailForUpdate = pendingEmail || userData.email
      
      // Закрываем модальное окно сразу после успешного подтверждения
      setShowEmailVerificationModal(false)
      setPendingEmail('')

      // Сначала загружаем обновленные данные пользователя с сервера
      try {
        const response = await fetch(`${API_BASE_URL}/users/${userId}`)
        if (response.ok) {
          const result = await response.json()
          if (result.success && result.data) {
            // Обновляем данные из БД
            const dbUser = result.data
            const nameParts = (dbUser.first_name && dbUser.last_name 
              ? `${dbUser.first_name} ${dbUser.last_name}`.trim()
              : dbUser.first_name || '').split(' ')
            const firstName = nameParts[0] || dbUser.first_name || ''
            const lastName = nameParts.slice(1).join(' ') || dbUser.last_name || ''
            
            const confirmedEmail = dbUser.email || confirmedEmailForUpdate
            
            // Обновляем состояние полностью с новым email
            setUserData(prev => {
              // Форматируем номер телефона с плюсом
              const phoneFromDB = dbUser.phone_number || ''
              const formattedPhone = formatPhoneWithPlus(phoneFromDB || prev.phone || '')
              
              return {
                ...prev,
                firstName: firstName,
                lastName: lastName,
                email: confirmedEmail,
                phone: formattedPhone,
                country: dbUser.country || prev.country || '',
                address: dbUser.address || prev.address || '',
                passportSeries: dbUser.passport_series || prev.passportSeries || '',
                passportNumber: dbUser.passport_number || prev.passportNumber || '',
                identificationNumber: dbUser.identification_number || prev.identificationNumber || ''
              }
            })
            
            // Обновляем originalEmail
            setOriginalEmail(confirmedEmail)
            
            // Обновляем localStorage с данными с сервера
            const savedUserData = getUserData()
            const updatedUserData = {
              ...savedUserData,
              ...result.data,
              email: confirmedEmail
            }
            localStorage.setItem('userData', JSON.stringify(updatedUserData))
            
            console.log('✅ Данные пользователя обновлены с сервера:', result.data)
            
            // Обновляем остальные данные, если они были изменены (имя, фамилия и т.д.)
            const phoneDigits = userData.phone.replace(/\D/g, '') || null
            const updateData = {
              first_name: userData.firstName || null,
              last_name: userData.lastName || null,
              phone_number: phoneDigits,
              address: userData.address || null,
              country: userData.country || null,
              passport_series: userData.passportSeries || null,
              passport_number: userData.passportNumber || null,
              identification_number: userData.identificationNumber || null
            }

            // Обновляем остальные данные на сервере, если они были изменены
            try {
              const updateResponse = await fetch(`${API_BASE_URL}/users/${userId}`, {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(updateData)
              })
              
              if (updateResponse.ok) {
                const updateResult = await updateResponse.json()
                if (updateResult.success && updateResult.data) {
                  console.log('✅ Все данные успешно сохранены:', updateResult.data)
                  
                  // Обновляем состояние еще раз с данными с сервера
                  const updatedDbUser = updateResult.data
                  const updatedNameParts = (updatedDbUser.first_name && updatedDbUser.last_name 
                    ? `${updatedDbUser.first_name} ${updatedDbUser.last_name}`.trim()
                    : updatedDbUser.first_name || '').split(' ')
                  const updatedFirstName = updatedNameParts[0] || updatedDbUser.first_name || ''
                  const updatedLastName = updatedNameParts.slice(1).join(' ') || updatedDbUser.last_name || ''
                  
                  setUserData(prev => {
                    // Форматируем номер телефона с плюсом
                    const updatedPhoneFromDB = updatedDbUser.phone_number || ''
                    const updatedFormattedPhone = formatPhoneWithPlus(updatedPhoneFromDB || prev.phone || '')
                    
                    return {
                      ...prev,
                      firstName: updatedFirstName,
                      lastName: updatedLastName,
                      email: updatedDbUser.email || confirmedEmail || prev.email,
                      phone: updatedFormattedPhone,
                      address: updatedDbUser.address || prev.address,
                      country: updatedDbUser.country || prev.country,
                      passportSeries: updatedDbUser.passport_series || prev.passportSeries,
                      passportNumber: updatedDbUser.passport_number || prev.passportNumber,
                      identificationNumber: updatedDbUser.identification_number || prev.identificationNumber
                    }
                  })
                  
                  // Обновляем originalEmail на случай, если email изменился
                  if (updatedDbUser.email) {
                    setOriginalEmail(updatedDbUser.email)
                  }
                  
                  // Обновляем localStorage
                  const currentSavedData = getUserData()
                  const finalUpdatedData = {
                    ...currentSavedData,
                    ...updateResult.data
                  }
                  localStorage.setItem('userData', JSON.stringify(finalUpdatedData))
                }
              }
            } catch (updateError) {
              console.warn('⚠️ Не удалось сохранить остальные данные:', updateError)
            }
            
            // Выходим из режима редактирования
            setIsEditing(false)
            
            showNotification('Email успешно подтвержден и данные сохранены!')
            return // Прерываем выполнение, так как уже все обновили
          }
        }
      } catch (error) {
        console.warn('⚠️ Не удалось загрузить данные с сервера, используем localStorage:', error)
        // Fallback: используем данные из localStorage
        const savedUserData = getUserData()
        if (savedUserData.email) {
          setUserData(prev => ({
            ...prev,
            email: savedUserData.email
          }))
          setOriginalEmail(savedUserData.email)
          
          setIsEditing(false)
          showNotification('Email успешно подтвержден! Данные обновлены из локального хранилища.')
          return
        }
      }
    } catch (error) {
      console.error('Ошибка обновления данных после подтверждения email:', error)
      showNotification('Email подтвержден, но возникла ошибка при обновлении данных. Попробуйте обновить страницу.')
      
      // Закрываем модальное окно даже при ошибке
      setShowEmailVerificationModal(false)
      setPendingEmail('')
    }
  }

  const handleChange = (field, value) => {
    setUserData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleDisconnectAccount = (account) => {
    setConnectedAccounts(prev => ({
      ...prev,
      [account]: false
    }))
  }

  const handleDeleteAccount = () => {
    if (window.confirm(t('buyerCabinet_deleteAccountConfirm'))) {
      // Здесь можно добавить логику удаления аккаунта
      showNotification(t('buyerData_deleteNotify'))
    }
  }

  const handleLogout = async () => {
    if (window.confirm(t('buyerCabinet_logoutConfirm'))) {
      await logout()
      navigate('/')
      // Небольшая задержка перед перезагрузкой, чтобы данные успели очиститься
      setTimeout(() => {
        window.location.reload() // Перезагружаем страницу для обновления состояния
      }, 100)
    }
  }

  // Обработка распознавания паспорта
  const handlePassportRecognition = async (file) => {
    setIsRecognizingPassport(true)
    
    try {
      // Динамически импортируем Tesseract.js только при необходимости
      const Tesseract = await import('tesseract.js')
      
      console.log('📸 Начало распознавания паспорта...')
      
      // Распознаем текст с помощью Tesseract.js
      const { data: { text } } = await Tesseract.recognize(file, 'rus+eng', {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            console.log('🔄 Прогресс:', Math.round(m.progress * 100) + '%')
          }
        }
      })
      
      console.log('✅ Текст распознан:', text.substring(0, 200) + '...')
      
      // Отправляем распознанный текст на сервер для извлечения данных через AI
      const response = await fetch(`${API_BASE_URL}/passport/extract`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ recognizedText: text })
      })
      
      if (!response.ok) {
        throw new Error('Ошибка при извлечении данных из паспорта')
      }
      
      const result = await response.json()
      
      if (result.success && result.data) {
        console.log('✅ Данные извлечены:', result.data)
        
        // Сохраняем извлеченные данные
        setExtractedPassportData(result.data)
        
        // Автоматически заполняем поля
        const extracted = result.data
        setUserData(prev => ({
          ...prev,
          firstName: extracted.firstName || prev.firstName,
          lastName: extracted.lastName || prev.lastName,
          middleName: extracted.middleName || prev.middleName,
          passportSeries: extracted.passportSeries || prev.passportSeries,
          passportNumber: extracted.passportNumber || prev.passportNumber,
          identificationNumber: extracted.identificationNumber || prev.identificationNumber,
          address: extracted.address || prev.address,
          email: extracted.email || prev.email
        }))
        
        // Показываем модальное окно с подтверждением
        setShowPassportRecognitionModal(true)
      } else {
        throw new Error('Не удалось извлечь данные из паспорта')
      }
    } catch (error) {
      console.error('❌ Ошибка при распознавании паспорта:', error)
      showNotification(
        t('buyerData_passportRecognizeError', {
          detail: error.message || t('buyerData_unknownError'),
        })
      )
    } finally {
      setIsRecognizingPassport(false)
    }
  }

  // Обработка подтверждения распознавания
  const handlePassportRecognitionConfirm = () => {
    // Убеждаемся, что мы в режиме редактирования
    if (!isEditing) {
      setIsEditing(true)
    }
    // Закрываем модальное окно (оно закроется автоматически через onConfirm)
  }

  return (
    <div className="data-page" ref={buyerCabinetPageRef}>
      <div className="data-container buyer-cabinet-layout-container">
        <BuyerCabinetSidebar
          asideClassName="data-sidebar"
          compact
          headerSpaceBetween
          onLogout={handleLogout}
          showProfileIndicator={shouldShowProfileIndicator()}
          showDataIndicator={shouldShowDataIndicator()}
        />

        <main className="data-main buyer-cabinet-layout-main">
          <div className="buyer-cabinet-main-scroll" ref={buyerCabinetMainScrollRef}>
          <div className="data-header">
            <h1>{t('buyerData_pageTitle')}</h1>
            <div className="data-edit-controls">
                {!isEditing ? (
                  <button type="button" className="data-edit-btn" onClick={handleEdit} aria-label={t('buyerData_edit')}>
                    <FaPencilAlt size={18} />
                    <span>{t('buyerData_edit')}</span>
                  </button>
                ) : (
                  <>
                    <button type="button" className="data-cancel-btn" onClick={handleCancel} aria-label={t('buyerData_cancel')}>
                      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                        <path d="M13.5 4.5L4.5 13.5M4.5 4.5L13.5 13.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <span>{t('buyerData_cancel')}</span>
                    </button>
                  </>
                )}
                <button
                  type="button"
                  className="data-save-btn"
                  onClick={handleSave}
                  disabled={!isEditing || !hasUnsavedChanges}
                  aria-label={t('buyerData_save')}
                >
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <path d="M15 4.5L6.75 12.75L3 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span>{t('buyerData_save')}</span>
                </button>
              </div>
          </div>

          <div className="data-content">
            {shouldShowDataIndicator() && (
              <div className="data-incomplete-banner" role="status" aria-live="polite">
                <div className="data-incomplete-banner__icon" aria-hidden>
                  <FiAlertCircle size={22} strokeWidth={2} />
                </div>
                <div className="data-incomplete-banner__body">
                  <p className="data-incomplete-banner__title">{t('buyerData_incompleteBannerTitle')}</p>
                  <p className="data-incomplete-banner__lead">{t('buyerData_incompleteBannerLead')}</p>
                  {incompleteDataLabels && incompleteDataLabels.length > 0 ? (
                    <ul className="data-incomplete-banner__list">
                      {incompleteDataLabels.map((label, idx) => (
                        <li key={`${label}-${idx}`}>{label}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="data-incomplete-banner__generic">{t('buyerData_incompleteBannerGeneric')}</p>
                  )}
                  {!isEditing && (
                    <button type="button" className="data-incomplete-banner__cta" onClick={handleEdit}>
                      {t('buyerData_edit')}
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Всплывающее уведомление о прогрессе верификации */}
            {userId && <VerificationToast userId={userId} />}

            <div className="data-form-fields-wrapper">
              {showDataSavedOverlay && (
                <div className="data-saved-overlay" aria-live="polite">
                  <p className="data-saved-overlay__text">{t('buyerData_savedOverlay')}</p>
                  <button
                    type="button"
                    className="data-saved-overlay__cta"
                    onClick={() => navigate('/auction')}
                  >
                    {t('buyerData_goAuction')}
                  </button>
                </div>
              )}
            <section className="data-section" id="data-section-main">
              <h2 className="section-title">
                {t('buyerData_sectionMain')}
                {verificationStatus && !isBasicInfoComplete() && (
                  <span className="section-indicator section-indicator--incomplete"></span>
                )}
              </h2>
              <div className="data-grid">
                <div id="data-field-firstName" className="data-field">
                  <label>{t('buyerData_labelFirstName')}</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={userData.firstName}
                      onChange={(e) => handleChange('firstName', e.target.value)}
                      className="data-input"
                    />
                  ) : (
                    <div className="data-value">{userData.firstName || t('buyerData_notSpecified')}</div>
                  )}
                </div>

                <div id="data-field-lastName" className="data-field">
                  <label>{t('buyerData_labelLastName')}</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={userData.lastName}
                      onChange={(e) => handleChange('lastName', e.target.value)}
                      className="data-input"
                    />
                  ) : (
                    <div className="data-value">{userData.lastName || t('buyerData_notSpecified')}</div>
                  )}
                </div>

                <div id="data-field-emailOrPhone" className="data-field">
                  <label>{t('buyerData_labelEmail')}</label>
                  {isEditing ? (
                    <input
                      type="email"
                      value={userData.email}
                      onChange={(e) => handleChange('email', e.target.value)}
                      className="data-input"
                    />
                  ) : (
                    <div className="data-value">{userData.email || t('buyerData_notSpecified')}</div>
                  )}
                </div>

                <div className="data-field">
                  <label>{t('buyerData_labelPhone')}</label>
                  {isEditing ? (
                    <input
                      type="tel"
                      value={userData.phone}
                      onChange={(e) => handleChange('phone', e.target.value)}
                      className="data-input"
                    />
                  ) : (
                    <div className="data-value">{formatPhoneWithPlus(userData.phone) || t('buyerData_notSpecified')}</div>
                  )}
                </div>

                <div id="data-field-country" className="data-field">
                  <label>{t('buyerData_labelCountry')}</label>
                  {isEditing ? (
                    <CountrySelect
                      value={userData.country}
                      onChange={(value) => {
                        const previousCountry = userData.country
                        const previousDial = getDialCodeForCountryName(previousCountry)
                        const currentPhone = userData.phone || ''
                        const currentNorm = normalizePhoneCode(currentPhone)
                        const previousDialNorm = normalizePhoneCode(previousDial)

                        handleChange('country', value)

                        const newDial = getDialCodeForCountryName(value)
                        // Если телефон пустой или содержит только старый автоподставленный код — заменяем на код новой страны
                        if (
                          (!currentPhone.trim() || (previousDialNorm && currentNorm && currentNorm === previousDialNorm)) &&
                          newDial
                        ) {
                          handleChange('phone', `${newDial} `)
                        }
                      }}
                      placeholder={t('buyerData_placeholderCountry')}
                      className="data-input"
                    />
                  ) : (
                    <div className="data-value">
                      {(() => {
                        const selectedCountry = countryList.find(c => c.name === userData.country);
                        return userData.country ? (
                          <>
                            {selectedCountry && <span style={{ marginRight: '6px' }}>{selectedCountry.flag}</span>}
                            {userData.country}
                          </>
                        ) : (
                          t('buyerData_notSpecified')
                        );
                      })()}
                    </div>
                  )}
                </div>

                <div id="data-field-address" className="data-field">
                  <label>{t('buyerData_labelAddress')}</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={userData.address}
                      onChange={(e) => handleChange('address', e.target.value)}
                      className="data-input"
                      placeholder={t('buyerData_placeholderAddress')}
                    />
                  ) : (
                    <div className="data-value">{userData.address || t('buyerData_notSpecified')}</div>
                  )}
                </div>
              </div>
            </section>

            <section className="data-section" id="data-section-documents">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 className="section-title">
                  {t('buyerData_sectionPassport')}
                  {verificationStatus && !isPassportDataComplete() && (
                    <span className="section-indicator section-indicator--incomplete"></span>
                  )}
                </h2>
                <button
                  className="recognize-passport-button recognize-passport-button--desktop"
                  onClick={() => passportInputRef.current?.click()}
                  disabled={isRecognizingPassport}
                >
                  {isRecognizingPassport ? (
                    <>
                      <span className="spinner" style={{ 
                        width: '16px', 
                        height: '16px', 
                        border: '2px solid #fff', 
                        borderTop: '2px solid transparent', 
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite'
                      }}></span>
                      {t('buyerData_recognizing')}
                    </>
                  ) : (
                    <>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="17 8 12 3 7 8"></polyline>
                        <line x1="12" y1="3" x2="12" y2="15"></line>
                      </svg>
                      {t('buyerData_recognizePassport')}
                    </>
                  )}
                </button>
              </div>
              {/* Мобильная кнопка распознавания паспорта — сразу под заголовком раздела */}
              <button
                className="recognize-passport-button recognize-passport-button--mobile"
                onClick={() => passportInputRef.current?.click()}
                disabled={isRecognizingPassport}
              >
                {isRecognizingPassport ? (
                  <>
                    <span className="spinner" style={{ 
                      width: '16px', 
                      height: '16px', 
                      border: '2px solid #fff', 
                      borderTop: '2px solid transparent', 
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }}></span>
                    {t('buyerData_recognizing')}
                  </>
                ) : (
                  <>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                      <polyline points="17 8 12 3 7 8"></polyline>
                      <line x1="12" y1="3" x2="12" y2="15"></line>
                    </svg>
                    {t('buyerData_recognizePassport')}
                  </>
                )}
              </button>
              <input
                ref={passportInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={async (e) => {
                  const file = e.target.files[0]
                  if (!file) return
                  
                  await handlePassportRecognition(file)
                  // Сбрасываем input
                  e.target.value = ''
                }}
              />
              <div className="data-grid">
                <div id="data-field-passportSeries" className="data-field">
                  <label>{t('buyerData_labelPassportSeries')}</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={userData.passportSeries}
                      onChange={(e) => handleChange('passportSeries', e.target.value)}
                      className="data-input"
                      maxLength="2"
                    />
                  ) : (
                    <div className="data-value">{userData.passportSeries}</div>
                  )}
                </div>

                <div id="data-field-passportNumber" className="data-field">
                  <label>{t('buyerData_labelPassportNumber')}</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={userData.passportNumber}
                      onChange={(e) => handleChange('passportNumber', e.target.value)}
                      className="data-input"
                    />
                  ) : (
                    <div className="data-value">{userData.passportNumber}</div>
                  )}
                </div>

                <div id="data-field-identificationNumber" className="data-field data-field-full">
                  <label>{t('buyerData_labelIdNumber')}</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={userData.identificationNumber}
                      onChange={(e) => handleChange('identificationNumber', e.target.value)}
                      className="data-input"
                    />
                  ) : (
                    <div className="data-value">{userData.identificationNumber}</div>
                  )}
                </div>
              </div>

              {isEditing && (
                <button
                  type="button"
                  className="data-save-btn data-save-btn--mobile-passport"
                  onClick={handleSave}
                  disabled={!hasUnsavedChanges}
                  aria-label={t('buyerData_savePassportAria')}
                >
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <path
                      d="M15 4.5L6.75 12.75L3 9"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span>{t('buyerData_save')}</span>
                </button>
              )}
            </section>

            </div>

            <section className="data-section">
              <h2 className="section-title">{t('buyerData_connectedAccounts')}</h2>
              <div className="connected-accounts">
                <div className="account-item">
                  <div className="account-info">
                    <div className="account-icon">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                      </svg>
                    </div>
                    <div className="account-details">
                      <div className="account-name">Google</div>
                      <div className="account-status">
                        {connectedAccounts.google ? t('buyerData_connected') : t('buyerData_notConnected')}
                      </div>
                    </div>
                  </div>
                  {connectedAccounts.google && (
                    <button
                      className="disconnect-button"
                      onClick={() => handleDisconnectAccount('google')}
                    >
                      {t('buyerData_disconnect')}
                    </button>
                  )}
                </div>
              </div>
            </section>

            <section className="data-section danger-section">
              <div className="danger-actions">
                <div className="danger-info">
                  <h3>{t('buyerData_deleteTitle')}</h3>
                  <p>{t('buyerData_deleteText')}</p>
                </div>
                <button className="delete-account-button" onClick={handleDeleteAccount}>
                  {t('buyerData_deleteBtn')}
                </button>
              </div>
            </section>
          </div>
          </div>
        </main>
      </div>
      
      {/* Модальное окно подтверждения email */}
      <EmailVerificationModal
        isOpen={showEmailVerificationModal}
        onClose={() => {
          // При закрытии без подтверждения возвращаем email к исходному значению
          setUserData(prev => ({
            ...prev,
            email: originalEmail
          }))
          setShowEmailVerificationModal(false)
          setPendingEmail('')
        }}
        onSuccess={handleEmailVerificationSuccess}
        email={pendingEmail}
        isProfileUpdate={true}
        userId={userId}
      />

      {/* Модальное окно распознавания паспорта */}
      <PassportRecognitionModal
        isOpen={showPassportRecognitionModal}
        onClose={() => {
          setShowPassportRecognitionModal(false)
          setExtractedPassportData(null)
        }}
        onConfirm={handlePassportRecognitionConfirm}
        extractedData={extractedPassportData}
      />
    </div>
  )
}

export default Data

