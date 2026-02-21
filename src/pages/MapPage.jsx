import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useUser } from '@clerk/clerk-react'
import { properties } from '../data/properties'
import { isAuthenticated } from '../services/authService'
import { showNotification } from '../utils/toastHelper'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import './MapPage.css'

const MapPage = () => {
  const { user, isLoaded: userLoaded } = useUser()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedProperty, setSelectedProperty] = useState(null)
  const [favorites, setFavorites] = useState(new Set())
  const [activeTab, setActiveTab] = useState('listings') // 'listings' или 'favorites'
  const [mapStyle, setMapStyle] = useState('osm') // 'osm', 'carto', 'dark', 'satellite'
  const [is3DEnabled, setIs3DEnabled] = useState(true)
  const [isControlMode, setIsControlMode] = useState(false)
  const [walkSpeed, setWalkSpeed] = useState(0.0001) // Скорость движения
  const [showMapillary, setShowMapillary] = useState(false)
  const [mapillaryPosition, setMapillaryPosition] = useState(null)
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const markersRef = useRef([])
  const controlModeIntervalRef = useRef(null)
  const keysPressedRef = useRef({})

  const formatPrice = (price) => {
    if (price >= 1000000) {
      return `$${(price / 1000000).toFixed(1)}M`
    }
    return `$${price.toLocaleString('en-US')}`
  }

  const filteredProperties = properties.filter(property => {
    // Фильтр по избранному
    if (activeTab === 'favorites' && !favorites.has(property.id)) {
      return false
    }
    
    // Фильтр по поиску
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      property.title.toLowerCase().includes(query) ||
      property.location.toLowerCase().includes(query)
    )
  })

  // Координаты разных районов Москвы и области
  const locationCoordinates = [
    [55.7558, 37.6173], // Центр Москвы
    [55.7520, 37.6156], // Красная площадь
    [55.7512, 37.6175], // Китай-город
    [55.7527, 37.6234], // Тверская
    [55.7494, 37.6250], // Арбат
    [55.7600, 37.6000], // Пресня
    [55.7400, 37.6500], // Замоскворечье
    [55.7800, 37.5800], // Хорошево-Мневники
    [55.7300, 37.7000], // Юго-Восток
    [55.8000, 37.5500], // Северо-Запад
    [55.7000, 37.8000], // Юг
    [55.8500, 37.5000], // Север
    [55.7200, 37.6200], // Юго-Запад
    [55.7700, 37.6500], // Северо-Восток
    [55.6800, 37.7500], // Бутово
    [55.8200, 37.6000], // Митино
    [55.7500, 37.9000], // Люберцы
    [55.6500, 37.7000], // Подольск
    [55.9000, 37.5500], // Химки
    [55.6000, 37.8000], // Домодедово
  ]

  // Генерируем координаты для объектов из разных районов
  const getPropertyCoordinates = (property) => {
    // Используем id для выбора района из массива
    const locationIndex = (property.id - 1) % locationCoordinates.length
    const baseCoords = locationCoordinates[locationIndex]
    
    // Добавляем небольшое случайное смещение в пределах района
    const offsetLat = (Math.random() - 0.5) * 0.02 // ~2км
    const offsetLng = (Math.random() - 0.5) * 0.03 // ~2км
    
    return [baseCoords[0] + offsetLat, baseCoords[1] + offsetLng]
  }

  // Определение стилей карты
  const getMapStyle = (styleName) => {
    const styles = {
      osm: {
        version: 8,
        sources: {
          osm: {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '© OpenStreetMap contributors'
          }
        },
        layers: [
          {
            id: 'osm',
            type: 'raster',
            source: 'osm'
          }
        ]
      },
      carto: {
        version: 8,
        sources: {
          carto: {
            type: 'raster',
            tiles: ['https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '© CARTO, © OpenStreetMap contributors'
          }
        },
        layers: [
          {
            id: 'carto',
            type: 'raster',
            source: 'carto'
          }
        ]
      },
      dark: {
        version: 8,
        sources: {
          dark: {
            type: 'raster',
            tiles: ['https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '© CARTO, © OpenStreetMap contributors'
          }
        },
        layers: [
          {
            id: 'dark',
            type: 'raster',
            source: 'dark'
          }
        ]
      },
      satellite: {
        version: 8,
        sources: {
          satellite: {
            type: 'raster',
            tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
            tileSize: 256,
            attribution: '© Esri'
          }
        },
        layers: [
          {
            id: 'satellite',
            type: 'raster',
            source: 'satellite'
          }
        ]
      }
    }
    return styles[styleName] || styles.osm
  }

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return

    const initMap = () => {
      if (!mapRef.current || mapInstanceRef.current) return

      try {
        const map = new maplibregl.Map({
          container: mapRef.current,
          style: getMapStyle(mapStyle),
          center: [37.6173, 55.7558], // [lng, lat]
          zoom: 10,
          pitch: is3DEnabled ? 45 : 0,
          bearing: is3DEnabled ? -17.6 : 0,
          attributionControl: false
        })

        // Добавляем элементы управления
        map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'top-right')
        map.addControl(
          new maplibregl.AttributionControl({
            compact: true,
            customAttribution: 'MapLibre GL | © OpenStreetMap contributors'
          }),
          'bottom-right'
        )

        // Включаем 3D при необходимости
        if (is3DEnabled) {
          map.on('load', () => {
            // Используем бесплатный источник высот от OpenTopoMap
            try {
              if (!map.getSource('terrain-rgb')) {
                // Альтернативный источник без ключа - используем визуальный 3D эффект через pitch
                map.setPitch(45)
                map.setBearing(-17.6)
              }
            } catch (e) {
              console.log('3D terrain не доступен, используем визуальный 3D эффект')
            }
          })
        }

        mapInstanceRef.current = map

        // Обновляем размер карты после инициализации
        map.on('load', () => {
          setTimeout(() => {
            if (map && map.resize) {
              map.resize()
            }
          }, 200)
        })
      } catch (error) {
        console.error('Ошибка инициализации карты:', error)
      }
    }

    if (mapRef.current.offsetParent !== null) {
      initMap()
    } else {
      setTimeout(initMap, 100)
    }

    return () => {
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove()
        } catch (e) {
          console.error('Ошибка при удалении карты:', e)
        }
        mapInstanceRef.current = null
      }
    }
  }, [])

  // Обновление стиля карты при изменении
  useEffect(() => {
    if (!mapInstanceRef.current) return
    
    const map = mapInstanceRef.current
    if (map.loaded()) {
      map.setStyle(getMapStyle(mapStyle))
    } else {
      map.once('load', () => {
        map.setStyle(getMapStyle(mapStyle))
      })
    }
  }, [mapStyle])

  // Обновление 3D режима
  useEffect(() => {
    if (!mapInstanceRef.current) return
    
    const map = mapInstanceRef.current
    if (map.loaded()) {
      if (is3DEnabled) {
        map.easeTo({
          pitch: 45,
          bearing: -17.6,
          duration: 1000
        })
      } else {
        map.easeTo({
          pitch: 0,
          bearing: 0,
          duration: 1000
        })
      }
    }
  }, [is3DEnabled])

  // Режим управления - управление клавиатурой
  useEffect(() => {
    if (!isControlMode || !mapInstanceRef.current) {
      // Очищаем интервал при выходе из режима управления
      if (controlModeIntervalRef.current) {
        clearInterval(controlModeIntervalRef.current)
        controlModeIntervalRef.current = null
      }
      return
    }

    const map = mapInstanceRef.current
    if (!map.loaded()) return

    // Включаем 3D режим для управления
    if (!is3DEnabled) {
      setIs3DEnabled(true)
    }

    // Устанавливаем начальный угол обзора для управления
    map.setPitch(60)
    map.setBearing(0)

    // Обработка нажатий клавиш
    const handleKeyDown = (e) => {
      const key = e.key.toLowerCase()
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
        e.preventDefault()
        keysPressedRef.current[key] = true
      }
    }

    const handleKeyUp = (e) => {
      const key = e.key.toLowerCase()
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
        keysPressedRef.current[key] = false
      }
    }

    // Обработка движения мыши для поворота камеры
    let isMouseDown = false
    let lastMouseX = 0
    let lastMouseY = 0

    const handleMouseDown = (e) => {
      if (e.button === 0) { // Левая кнопка мыши
        isMouseDown = true
        lastMouseX = e.clientX
        lastMouseY = e.clientY
      }
    }

    const handleMouseMove = (e) => {
      if (isMouseDown && mapInstanceRef.current) {
        const deltaX = e.clientX - lastMouseX
        const deltaY = e.clientY - lastMouseY
        
        const currentBearing = map.getBearing()
        const currentPitch = map.getPitch()
        
        map.setBearing(currentBearing + deltaX * 0.5)
        map.setPitch(Math.max(0, Math.min(85, currentPitch - deltaY * 0.3)))
        
        lastMouseX = e.clientX
        lastMouseY = e.clientY
      }
    }

    const handleMouseUp = () => {
      isMouseDown = false
    }

    // Добавляем обработчики событий
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    map.getCanvas().addEventListener('mousedown', handleMouseDown)
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    // Анимация движения
    const moveInterval = setInterval(() => {
      if (!mapInstanceRef.current) return

      const center = map.getCenter()
      let newLng = center.lng
      let newLat = center.lat
      let newBearing = map.getBearing()

      const speed = walkSpeed
      const bearingRad = (newBearing * Math.PI) / 180

      // Движение вперед (W или стрелка вверх)
      if (keysPressedRef.current['w'] || keysPressedRef.current['arrowup']) {
        newLat += Math.cos(bearingRad) * speed
        newLng += Math.sin(bearingRad) * speed
      }

      // Движение назад (S или стрелка вниз)
      if (keysPressedRef.current['s'] || keysPressedRef.current['arrowdown']) {
        newLat -= Math.cos(bearingRad) * speed
        newLng -= Math.sin(bearingRad) * speed
      }

      // Поворот влево (A или стрелка влево)
      if (keysPressedRef.current['a'] || keysPressedRef.current['arrowleft']) {
        newBearing -= 2
      }

      // Поворот вправо (D или стрелка вправо)
      if (keysPressedRef.current['d'] || keysPressedRef.current['arrowright']) {
        newBearing += 2
      }

      // Обновляем позицию карты
      if (newLat !== center.lat || newLng !== center.lng || newBearing !== map.getBearing()) {
        map.jumpTo({
          center: [newLng, newLat],
          bearing: newBearing
        })
      }
    }, 16) // ~60 FPS

    controlModeIntervalRef.current = moveInterval

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      if (map.getCanvas()) {
        map.getCanvas().removeEventListener('mousedown', handleMouseDown)
      }
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
      if (controlModeIntervalRef.current) {
        clearInterval(controlModeIntervalRef.current)
        controlModeIntervalRef.current = null
      }
    }
  }, [isControlMode, is3DEnabled, walkSpeed])

  // Обновление маркеров при изменении фильтров или выбранного объекта
  useEffect(() => {
    if (!mapInstanceRef.current) return

    const map = mapInstanceRef.current

    // Ждем загрузки карты
    if (!map.loaded()) {
      map.once('load', () => {
        updateMarkers()
      })
      return
    }

    updateMarkers()

    function updateMarkers() {
      // Удаляем старые маркеры
      markersRef.current.forEach(marker => {
        marker.remove()
      })
      markersRef.current = []

      // Добавляем новые маркеры
      filteredProperties.forEach(property => {
        const coords = getPropertyCoordinates(property)
        const isSelected = selectedProperty?.id === property.id

        // Создаем элемент маркера
        const el = document.createElement('div')
        el.className = `custom-marker ${isSelected ? 'active' : ''}`
        el.innerHTML = `<div class="marker-content">${formatPrice(property.price)}</div>`
        el.style.cursor = 'pointer'

        // Создаем маркер
        const marker = new maplibregl.Marker({
          element: el,
          anchor: 'center'
        })
          .setLngLat([coords[1], coords[0]]) // [lng, lat]
          .addTo(map)

        // Создаем popup
        const popupContent = `
          <div class="map-popup">
            <div class="map-popup-image">
              <img src="${property.images[0]}" alt="${property.title}" />
            </div>
            <div class="map-popup-info">
              <div class="map-popup-price">${formatPrice(property.price)}</div>
              <div class="map-popup-title">${property.title}</div>
              <div class="map-popup-location">${property.location}</div>
              <div class="map-popup-details">${property.rooms || 'Студия'} комн. · ${property.area} м² · ${property.floor} этаж</div>
            </div>
          </div>
        `

        const popup = new maplibregl.Popup({
          closeButton: false,
          closeOnClick: false,
          maxWidth: '300px'
        }).setHTML(popupContent)

        marker.setPopup(popup)

        // Открываем popup при наведении
        el.addEventListener('mouseenter', () => {
          popup.addTo(map)
        })

        // Закрываем popup при уходе курсора
        el.addEventListener('mouseleave', () => {
          popup.remove()
        })

        el.addEventListener('click', () => {
          setSelectedProperty(property)
        })

        markersRef.current.push(marker)
      })

      // Центрируем карту на выбранном объекте
      if (selectedProperty) {
        const coords = getPropertyCoordinates(selectedProperty)
        map.flyTo({
          center: [coords[1], coords[0]],
          zoom: 14,
          duration: 1000
        })
      }
    }
  }, [filteredProperties, selectedProperty])

  // Обработка клика на карту для открытия Mapillary
  useEffect(() => {
    if (!mapInstanceRef.current) return

    const map = mapInstanceRef.current
    
    const handleMapClick = (e) => {
      if (isControlMode) return // Не открываем Mapillary в режиме управления
      
      const { lng, lat } = e.lngLat
      setMapillaryPosition([lat, lng])
      setShowMapillary(true)
    }

    map.on('click', handleMapClick)

    return () => {
      map.off('click', handleMapClick)
    }
  }, [isControlMode])

  return (
    <div className="map-page" style={{ margin: 0, padding: 0 }}>
      <div className="map-container">
        <div className="map-view">
          <div ref={mapRef} className="maplibre-map"></div>
          <div className="map-tabs">
            <button 
              className={`map-tab ${activeTab === 'listings' ? 'active' : ''}`}
              onClick={() => setActiveTab('listings')}
            >
              Объявления
            </button>
            <button 
              className={`map-tab ${activeTab === 'favorites' ? 'active' : ''}`}
              onClick={() => setActiveTab('favorites')}
            >
              Избранное
            </button>
          </div>
          <div className="map-controls">
            <div className="map-style-control">
              <label>Стиль карты:</label>
              <select 
                value={mapStyle} 
                onChange={(e) => setMapStyle(e.target.value)}
                className="style-select"
              >
                <option value="osm">OpenStreetMap</option>
                <option value="carto">Светлая</option>
                <option value="dark">Темная</option>
                <option value="satellite">Спутник</option>
              </select>
            </div>
            <button 
              className={`map-3d-toggle ${is3DEnabled ? 'active' : ''}`}
              onClick={() => setIs3DEnabled(!is3DEnabled)}
              title="Включить/выключить 3D режим"
            >
              {is3DEnabled ? '3D ✓' : '3D'}
            </button>
            <button 
              className={`map-control-toggle ${isControlMode ? 'active' : ''}`}
              onClick={() => setIsControlMode(!isControlMode)}
              title="Режим управления (WASD/стрелки для движения, мышь для поворота)"
            >
              {isControlMode ? ' Stetings ✓' : '  Stetings'}
            </button>
          </div>
          {isControlMode && (
            <div className="control-mode-controls">
              <div className="control-instructions">
                <p><strong> Stetings:</strong></p>
                <p>W/↑ - Вперед | S/↓ - Назад</p>
                <p>A/← - Влево | D/→ - Вправо</p>
                <p>Мышь - Поворот камеры</p>
              </div>
              <div className="control-buttons">
                <button 
                  className="control-btn control-forward"
                  onMouseDown={() => keysPressedRef.current['w'] = true}
                  onMouseUp={() => keysPressedRef.current['w'] = false}
                  onTouchStart={() => keysPressedRef.current['w'] = true}
                  onTouchEnd={() => keysPressedRef.current['w'] = false}
                >
                  ↑
                </button>
                <div className="control-buttons-row">
                  <button 
                    className="control-btn control-left"
                    onMouseDown={() => keysPressedRef.current['a'] = true}
                    onMouseUp={() => keysPressedRef.current['a'] = false}
                    onTouchStart={() => keysPressedRef.current['a'] = true}
                    onTouchEnd={() => keysPressedRef.current['a'] = false}
                  >
                    ←
                  </button>
                  <button 
                    className="control-btn control-back"
                    onMouseDown={() => keysPressedRef.current['s'] = true}
                    onMouseUp={() => keysPressedRef.current['s'] = false}
                    onTouchStart={() => keysPressedRef.current['s'] = true}
                    onTouchEnd={() => keysPressedRef.current['s'] = false}
                  >
                    ↓
                  </button>
                  <button 
                    className="control-btn control-right"
                    onMouseDown={() => keysPressedRef.current['d'] = true}
                    onMouseUp={() => keysPressedRef.current['d'] = false}
                    onTouchStart={() => keysPressedRef.current['d'] = true}
                    onTouchEnd={() => keysPressedRef.current['d'] = false}
                  >
                    →
                  </button>
                </div>
              </div>
            </div>
          )}
          {showMapillary && mapillaryPosition && (
            <div className="mapillary-panel">
              <button 
                className="mapillary-close"
                onClick={() => setShowMapillary(false)}
              >
                ×
              </button>
              <div className="mapillary-content">
                <h3>Панорамный вид</h3>
                <p>Просмотр панорамных изображений улиц через Mapillary</p>
                <iframe
                  src={`https://www.mapillary.com/app/?lat=${mapillaryPosition[0]}&lng=${mapillaryPosition[1]}&z=17&focus=map&mapStyle=Mapillary%20streets&x=0.5&y=0.5`}
                  width="100%"
                  height="400"
                  frameBorder="0"
                  allowFullScreen
                  title="Mapillary Street View"
                />
                <a 
                  href={`https://www.mapillary.com/app/?lat=${mapillaryPosition[0]}&lng=${mapillaryPosition[1]}&z=17&focus=map`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mapillary-link"
                >
                  Открыть в Mapillary →
                </a>
              </div>
            </div>
          )}
        </div>

        <div className="map-sidebar">
          <div className="map-filters">
            <div className="filter-section">
              <label className="filter-label">Местоположение</label>
              <input
                type="text"
                className="filter-input"
                placeholder="Город, адрес, индекс"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="filter-row">
              <div className="filter-section">
                <label className="filter-label">Комнаты</label>
                <select className="filter-select">
                  <option value="0">0</option>
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                  <option value="4">4+</option>
                </select>
              </div>
              <div className="filter-section">
                <label className="filter-label">Санузлы</label>
                <select className="filter-select">
                  <option value="0">0</option>
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3+</option>
                </select>
              </div>
            </div>
            <button className="filters-button-map">Фильтры</button>
          </div>

          <div className="map-results-count">
            {filteredProperties.length} объектов на продажу
          </div>

          <div className="map-properties-list">
            {filteredProperties.length === 0 ? (
              <div className="no-results">
                <div className="no-results-icon">🔍</div>
                <h3 className="no-results-title">Ничего не найдено</h3>
                <p className="no-results-text">Попробуйте изменить параметры поиска</p>
              </div>
            ) : (
              filteredProperties.map((property) => (
                <div 
                  key={property.id} 
                  className={`map-property-card ${selectedProperty?.id === property.id ? 'selected' : ''}`}
                  onClick={() => setSelectedProperty(property)}
                >
                  <div className="map-property-images">
                    <div className="map-property-main-image">
                      <img src={property.images[0]} alt={property.title} />
                      <button 
                        className={`map-favorite ${favorites.has(property.id) ? 'active' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation()
                          
                          // Проверяем авторизацию через Clerk или старую систему
                          const isClerkAuth = user && userLoaded
                          const isOldAuth = isAuthenticated()
                          const isFavorite = favorites.has(property.id)
                          
                          // Разрешаем удаление из избранного без авторизации, но добавление требует авторизации
                          if (!isFavorite && !isClerkAuth && !isOldAuth) {
                            showNotification('Пожалуйста, войдите в систему, чтобы добавлять объявления в избранное')
                            return
                          }
                          
                          const newFavorites = new Set(favorites)
                          if (newFavorites.has(property.id)) {
                            newFavorites.delete(property.id)
                          } else {
                            newFavorites.add(property.id)
                          }
                          setFavorites(newFavorites)
                        }}
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                          <path 
                            d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" 
                            stroke="currentColor" 
                            strokeWidth="2" 
                            fill={favorites.has(property.id) ? "currentColor" : "none"}
                          />
                        </svg>
                      </button>
                    </div>
                    <div className="map-property-thumbnails">
                      {property.images.slice(1, 4).map((image, idx) => (
                        <div key={idx} className="map-property-thumbnail">
                          <img src={image} alt={`${property.title} ${idx + 2}`} />
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="map-property-info">
                    <div className="map-property-price">{formatPrice(property.price)}</div>
                    <div className="map-property-details">
                      {property.rooms || 'Студия'} комн. · {property.area} м² · {property.floor} этаж
                    </div>
                    <div className="map-property-location">{property.location}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default MapPage

