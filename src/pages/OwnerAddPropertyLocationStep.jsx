import { useState, useRef, useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { MapPin, Loader2, Check, Navigation } from 'lucide-react'
import CountrySelect from '../components/CountrySelect'
import LocationMap from '../components/LocationMap'
import {
  fetchNominatimFirst,
  fetchReverseGeocodeFields,
  formatShortAddress,
  formatShortAddressWithHouse,
  getUniqueAddressSuggestions,
  searchCities,
  searchStreets,
  searchHouses,
  buildFormattedLocation,
} from '../utils/oapLocationGeocode'

function SuggestList({ items, onSelect, renderLabel }) {
  if (!items.length) return null
  return (
    <ul className="oap-loc-suggest" role="listbox">
      {items.map((item, index) => (
        <li key={index}>
          <button
            type="button"
            className="oap-loc-suggest__item"
            role="option"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onSelect(item)}
          >
            <MapPin size={15} aria-hidden />
            <span>{renderLabel(item)}</span>
          </button>
        </li>
      ))}
    </ul>
  )
}

export default function OwnerAddPropertyLocationStep({ form, onFormPatch, errors = {}, embedded = false, wide = false }) {
  const { t } = useTranslation()
  const [citySearch, setCitySearch] = useState(form.city || '')
  const [addressSearch, setAddressSearch] = useState(form.address || '')
  const [citySuggestions, setCitySuggestions] = useState([])
  const [addressSuggestions, setAddressSuggestions] = useState([])
  const [houseSuggestions, setHouseSuggestions] = useState([])
  const [showCitySuggestions, setShowCitySuggestions] = useState(false)
  const [showAddressSuggestions, setShowAddressSuggestions] = useState(false)
  const [showHouseSuggestions, setShowHouseSuggestions] = useState(false)
  const [isCitySearching, setIsCitySearching] = useState(false)
  const [isAddressSearching, setIsAddressSearching] = useState(false)
  const [mapZoom, setMapZoom] = useState(form.coordinates ? 15 : 4)

  const cityTimeoutRef = useRef(null)
  const addressTimeoutRef = useRef(null)
  const houseTimeoutRef = useRef(null)

  const mapCoords = Array.isArray(form.coordinates) && form.coordinates.length === 2
    ? form.coordinates
    : null

  useEffect(() => {
    if (!citySearch && form.city) setCitySearch(form.city)
  }, [form.city, citySearch])

  useEffect(() => {
    if (!addressSearch && form.address) setAddressSearch(form.address)
  }, [form.address, addressSearch])

  const applyHouseSelection = useCallback(
    (suggestion, { closeSuggestions = true } = {}) => {
      const lat = parseFloat(suggestion.lat)
      const lng = parseFloat(suggestion.lon)
      if (Number.isNaN(lat) || Number.isNaN(lng)) return
      const coords = [lat, lng]
      const addressParts = suggestion.address || {}
      const country = addressParts.country || form.country || ''
      const city =
        addressParts.city || addressParts.town || addressParts.village || form.city || ''
      const houseNumber = String(addressParts.house_number || form.apartment || '').trim()
      const streetShort =
        formatShortAddress(suggestion) || addressSearch.split(',')[0].trim()
      const formattedLocation =
        formatShortAddressWithHouse(suggestion) ||
        buildFormattedLocation({ country, city, street: streetShort, apartment: houseNumber })

      setAddressSearch(streetShort)
      setMapZoom(17)
      if (closeSuggestions) {
        setHouseSuggestions([])
        setShowHouseSuggestions(false)
      }

      onFormPatch({
        address: streetShort,
        location: formattedLocation,
        coordinates: coords,
        country: country || form.country,
        city: city || form.city,
        apartment: houseNumber,
      })
    },
    [addressSearch, form.apartment, form.city, form.country, onFormPatch]
  )

  const handleCountryChange = useCallback(
    async (countryName) => {
      onFormPatch({ country: countryName })
      if (!countryName?.trim()) {
        setMapZoom(4)
        return
      }
      const item = await fetchNominatimFirst(countryName)
      if (!item) return
      const lat = parseFloat(item.lat)
      const lng = parseFloat(item.lon)
      if (Number.isNaN(lat) || Number.isNaN(lng)) return
      onFormPatch({ coordinates: [lat, lng] })
      setMapZoom(6)
    },
    [onFormPatch]
  )

  const handleCitySelect = useCallback(
    (city) => {
      const fullAddress = city.display_name
      setCitySearch(fullAddress)
      const cityName = fullAddress.split(',')[0].trim()
      const lat = parseFloat(city.lat)
      const lng = parseFloat(city.lon)
      const coords = !Number.isNaN(lat) && !Number.isNaN(lng) ? [lat, lng] : form.coordinates
      onFormPatch({ city: cityName, coordinates: coords })
      if (coords) setMapZoom(11)
      setShowCitySuggestions(false)
      setIsCitySearching(false)
      setCitySuggestions([city])
    },
    [form.coordinates, onFormPatch]
  )

  const handleAddressSelect = useCallback(
    (suggestion) => {
      const shortAddress = formatShortAddress(suggestion)
      const lat = parseFloat(suggestion.lat)
      const lng = parseFloat(suggestion.lon)
      const coords = !Number.isNaN(lat) && !Number.isNaN(lng) ? [lat, lng] : null
      const addressParts = suggestion.address || {}
      const country = addressParts.country || form.country || ''
      const city = addressParts.city || addressParts.town || addressParts.village || form.city || ''
      const formattedAddress =
        country && city && shortAddress
          ? `${country}, ${city}, ${shortAddress}`
          : shortAddress

      setAddressSearch(shortAddress)
      setShowAddressSuggestions(false)
      setIsAddressSearching(false)
      setAddressSuggestions([suggestion])
      if (coords) setMapZoom(15)

      onFormPatch({
        address: shortAddress,
        location: formattedAddress,
        coordinates: coords || form.coordinates,
        country,
        city,
        apartment: '',
      })
    },
    [form.coordinates, form.city, form.country, onFormPatch]
  )

  const handleMarkerDragEnd = useCallback(
    async ({ lat, lng }) => {
      const coords = [lat, lng]
      onFormPatch({ coordinates: coords })
      setMapZoom(16)
      try {
        const reverse = await fetchReverseGeocodeFields(lat, lng)
        if (!reverse) return
        onFormPatch({
          country: reverse.country || form.country,
          city: reverse.city || form.city,
          address: reverse.address || form.address,
          location: reverse.location || form.location,
          coordinates: coords,
          apartment: reverse.apartment || form.apartment,
        })
        if (reverse.city) setCitySearch(reverse.city)
        if (reverse.address) setAddressSearch(reverse.address)
      } catch {
        // ignore reverse geocode errors in test flow
      }
    },
    [form, onFormPatch]
  )

  const runCitySearch = (value, country) => {
    if (cityTimeoutRef.current) clearTimeout(cityTimeoutRef.current)
    if (value.length < 2) {
      setCitySuggestions([])
      setShowCitySuggestions(false)
      setIsCitySearching(false)
      return
    }
    setIsCitySearching(true)
    cityTimeoutRef.current = setTimeout(async () => {
      try {
        const cities = await searchCities(value, country)
        setCitySuggestions(cities)
        setShowCitySuggestions(cities.length > 0)
      } catch {
        setCitySuggestions([])
        setShowCitySuggestions(false)
      } finally {
        setIsCitySearching(false)
      }
    }, 700)
  }

  const runAddressSearch = (value) => {
    if (addressTimeoutRef.current) clearTimeout(addressTimeoutRef.current)
    if (value.length < 2 || !form.city) {
      setAddressSuggestions([])
      setShowAddressSuggestions(false)
      setIsAddressSearching(false)
      return
    }
    setIsAddressSearching(true)
    addressTimeoutRef.current = setTimeout(async () => {
      try {
        const addresses = await searchStreets(value, {
          city: form.city,
          country: form.country,
        })
        setAddressSuggestions(addresses)
        setShowAddressSuggestions(addresses.length > 0)
      } catch {
        setAddressSuggestions([])
        setShowAddressSuggestions(false)
      } finally {
        setIsAddressSearching(false)
      }
    }, 700)
  }

  const runHouseSearch = (value) => {
    if (houseTimeoutRef.current) clearTimeout(houseTimeoutRef.current)
    if (!value || !addressSearch?.trim() || !form.city) {
      setHouseSuggestions([])
      setShowHouseSuggestions(false)
      return
    }
    houseTimeoutRef.current = setTimeout(async () => {
      try {
        const houses = await searchHouses(value, {
          street: addressSearch,
          city: form.city,
          country: form.country,
        })
        setHouseSuggestions(houses)
        setShowHouseSuggestions(houses.length > 0)
        if (houses.length > 0) {
          const normalized = String(value).trim().toLowerCase()
          const exact = houses.find(
            (item) =>
              String(item?.address?.house_number || '')
                .trim()
                .toLowerCase() === normalized
          )
          applyHouseSelection(exact || houses[0], { closeSuggestions: false })
        }
      } catch {
        setHouseSuggestions([])
        setShowHouseSuggestions(false)
      }
    }, 600)
  }

  const renderStatusIcon = (loading, ready) => {
    if (loading) return <Loader2 size={17} className="oap-loc-field__spin" aria-hidden />
    if (ready) return <Check size={17} className="oap-loc-field__ok" aria-hidden />
    return null
  }

  const uniqueAddressSuggestions = getUniqueAddressSuggestions(addressSuggestions)

  const layout = (
      <div
        className={[
          'oap-loc-step__layout',
          embedded ? 'oap-loc-step__layout--embedded' : '',
          embedded && wide ? 'oap-loc-step__layout--embedded-wide' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <div className="oap-loc-step__fields">
          <div
            className={`oap-loc-field${errors.country ? ' oap-loc-field--error' : ''}`}
            role="group"
            aria-labelledby="oap-loc-country-label"
          >
            <span id="oap-loc-country-label" className="oap-loc-field__label">
              {t('oap_locationCountryLabel')} <span className="oap-loc-field__req">*</span>
            </span>
            <CountrySelect
              value={form.country}
              onChange={handleCountryChange}
              placeholder={t('addPropertyLocationCountryPlaceholder')}
              className="oap-loc-field__country"
            />
            {errors.country && <span className="oap-loc-field__error">{errors.country}</span>}
          </div>

          <label className={`oap-loc-field${errors.city ? ' oap-loc-field--error' : ''}`}>
            <span className="oap-loc-field__label">
              {t('oap_locationCityLabel')} <span className="oap-loc-field__req">*</span>
            </span>
            <div className="oap-loc-field__wrap">
              <input
                type="text"
                className="oap-loc-field__input oap-loc-field__input--icon"
                value={citySearch}
                placeholder={t('oap_locationCityPlaceholder')}
                onChange={(e) => {
                  const value = e.target.value
                  setCitySearch(value)
                  onFormPatch({ city: value.split(',')[0].trim() })
                  runCitySearch(value, form.country)
                }}
                onFocus={() => {
                  if (citySuggestions.length > 0) setShowCitySuggestions(true)
                  else if (citySearch.length >= 2) runCitySearch(citySearch, form.country)
                }}
                onBlur={() => setTimeout(() => setShowCitySuggestions(false), 200)}
              />
              <span className="oap-loc-field__status">
                {renderStatusIcon(
                  isCitySearching,
                  citySearch.length >= 2 && citySuggestions.length > 0
                )}
              </span>
              {showCitySuggestions && (
                <SuggestList
                  items={citySuggestions}
                  onSelect={handleCitySelect}
                  renderLabel={(city) => city.display_name}
                />
              )}
            </div>
            {errors.city && <span className="oap-loc-field__error">{errors.city}</span>}
          </label>

          <label className={`oap-loc-field${errors.address ? ' oap-loc-field--error' : ''}`}>
            <span className="oap-loc-field__label">
              {t('oap_locationStreetLabel')} <span className="oap-loc-field__req">*</span>
            </span>
            <div className="oap-loc-field__wrap">
              <input
                type="text"
                className="oap-loc-field__input oap-loc-field__input--icon"
                value={addressSearch}
                placeholder={
                  form.city ? t('oap_locationStreetPlaceholder') : t('oap_locationStreetNoCity')
                }
                disabled={!form.city}
                onChange={(e) => {
                  const value = e.target.value
                  setAddressSearch(value)
                  if (!value.trim()) {
                    onFormPatch({
                      address: '',
                      location: '',
                      coordinates: null,
                      apartment: '',
                    })
                    setMapZoom(4)
                    return
                  }
                  onFormPatch({ address: value })
                  runAddressSearch(value)
                }}
                onFocus={() => {
                  if (addressSuggestions.length > 0) setShowAddressSuggestions(true)
                  else if (addressSearch.length >= 2 && form.city) runAddressSearch(addressSearch)
                }}
                onBlur={() => setTimeout(() => setShowAddressSuggestions(false), 200)}
              />
              <span className="oap-loc-field__status">
                {form.city &&
                  renderStatusIcon(
                    isAddressSearching,
                    addressSearch.length >= 2 && addressSuggestions.length > 0
                  )}
              </span>
              {showAddressSuggestions && (
                <SuggestList
                  items={uniqueAddressSuggestions}
                  onSelect={({ suggestion }) => handleAddressSelect(suggestion)}
                  renderLabel={({ label }) => label}
                />
              )}
            </div>
            {errors.address && <span className="oap-loc-field__error">{errors.address}</span>}
          </label>

          <label className="oap-loc-field">
            <span className="oap-loc-field__label">
              {t('oap_locationHouseLabel')}{' '}
              <span className="oap-loc-field__opt">{t('oap_locationOptional')}</span>
            </span>
            <div className="oap-loc-field__wrap">
              <input
                type="text"
                className="oap-loc-field__input"
                value={form.apartment}
                placeholder={t('oap_locationHousePlaceholder')}
                disabled={!form.city || !addressSearch?.trim()}
                onChange={(e) => {
                  const value = e.target.value
                  const streetLine = (addressSearch || form.address || '').trim()
                  onFormPatch({
                    apartment: value,
                    location: buildFormattedLocation({
                      country: form.country,
                      city: form.city,
                      street: streetLine,
                      apartment: value.trim(),
                    }),
                  })
                  runHouseSearch(value)
                }}
                onFocus={() => {
                  if (houseSuggestions.length > 0) setShowHouseSuggestions(true)
                }}
                onBlur={() => setTimeout(() => setShowHouseSuggestions(false), 200)}
              />
              {showHouseSuggestions && (
                <SuggestList
                  items={houseSuggestions}
                  onSelect={(suggestion) =>
                    applyHouseSelection(suggestion, { closeSuggestions: true })
                  }
                  renderLabel={(suggestion) => formatShortAddressWithHouse(suggestion)}
                />
              )}
            </div>
          </label>

          <label className="oap-loc-field">
            <span className="oap-loc-field__label">
              {t('oap_locationCadastralLabel')}{' '}
              <span className="oap-loc-field__opt">{t('oap_locationOptional')}</span>
            </span>
            <input
              type="text"
              className="oap-loc-field__input"
              value={form.cadastralNumber || ''}
              placeholder={t('oap_locationCadastralPlaceholder')}
              onChange={(e) => onFormPatch({ cadastralNumber: e.target.value })}
            />
          </label>
        </div>

        <div className="oap-loc-step__map-col">
          <p className="oap-loc-step__map-hint">
            {mapCoords ? t('oap_locationMapDragHint') : t('oap_locationMapSelectHint')}
          </p>
          <div className="oap-loc-step__map">
            <LocationMap
              center={mapCoords || [55, 20]}
              zoom={mapCoords ? mapZoom : 4}
              marker={mapCoords}
              markerDraggable={Boolean(mapCoords)}
              onMarkerDragEnd={handleMarkerDragEnd}
            />
          </div>
        </div>
      </div>
  )

  if (embedded) return layout

  return (
    <section className="oap-loc-step" aria-labelledby="oap-loc-step-title">
      <header className="oap-loc-step__head">
        <span className="oap-loc-step__badge" aria-hidden>
          <Navigation size={22} strokeWidth={1.85} />
        </span>
        <div className="oap-loc-step__head-text">
          <h2 id="oap-loc-step-title" className="oap-loc-step__title">
            {t('oap_locationMapTitle')}
          </h2>
          <p className="oap-loc-step__subtitle">{t('oap_locationMapSubtitle')}</p>
        </div>
      </header>
      {layout}
    </section>
  )
}
