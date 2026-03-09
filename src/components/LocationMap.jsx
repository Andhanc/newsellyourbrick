import React, { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import './LocationMap.css'

const LocationMap = ({ center, zoom = 10, marker }) => {
  const mapContainerRef = useRef(null)
  const mapRef = useRef(null)
  const markerRef = useRef(null)
  const lastCenterRef = useRef(null) // Для отслеживания последних координат, чтобы не обновлять карту постоянно

  // Логируем полученные пропсы
  useEffect(() => {
    console.log('🗺️ LocationMap получил пропсы:', { center, zoom, marker })
  }, [center, zoom, marker])

  // Инициализация карты
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return

    // Определяем начальный центр карты - вид высоко над Европой
    let initialCenter = [20, 55] // Центр Европы [lng, lat]
    let initialZoom = 3 // Высокий вид над Европой
    
    // Если есть валидные координаты, используем их
    if (Array.isArray(center) && center.length === 2) {
      const lat = parseFloat(center[0])
      const lng = parseFloat(center[1])
      if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        // Проверяем, не являются ли координаты дефолтными (вид над Европой)
        const isDefaultView = Math.abs(lat - 55) < 1 && Math.abs(lng - 20) < 1
        if (isDefaultView) {
          // Если координаты дефолтные, используем дефолтный зум (высокий вид)
          initialCenter = [lng, lat]
          initialZoom = 3 // Высокий вид над Европой
          console.log('🗺️ LocationMap: инициализация с дефолтными координатами (вид над Европой)', initialCenter, 'zoom:', initialZoom)
        } else {
          // Если координаты не дефолтные, используем переданный зум
          initialCenter = [lng, lat]
          initialZoom = zoom || 15
          console.log('🗺️ LocationMap: инициализация с координатами', initialCenter, 'из', center, 'zoom:', initialZoom)
        }
      } else {
        console.warn('⚠️ LocationMap: невалидные координаты при инициализации', center)
      }
    } else {
      console.log('🗺️ LocationMap: инициализация с дефолтными координатами (вид над Европой)', initialCenter, 'zoom:', initialZoom)
    }

    // Спутниковая подложка (та же, что на странице карты — Esri, без ключа)
    const satelliteStyle = {
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

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: satelliteStyle,
      center: initialCenter,
      zoom: initialZoom,
      attributionControl: false
    })

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')

    mapRef.current = map

    // Функция для создания маркера
    const createMarker = (coords) => {
      if (!Array.isArray(coords) || coords.length !== 2) return
      
      const lat = parseFloat(coords[0])
      const lng = parseFloat(coords[1])
      
      if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        console.warn('⚠️ LocationMap: невалидные координаты для маркера при инициализации', coords)
        return
      }
      
      // Проверяем, не являются ли координаты дефолтными (вид над Европой)
      const isDefaultView = Math.abs(lat - 55) < 1 && Math.abs(lng - 20) < 1
      if (isDefaultView) {
        console.log('📍 LocationMap: пропускаем создание маркера на дефолтных координатах')
        return
      }
      
      const lngLat = [lng, lat]
      console.log('📍 LocationMap: создаем маркер при инициализации на координатах', lngLat, 'из', coords)
      
      // Ждем, пока карта загрузится, перед добавлением маркера
      if (map.loaded()) {
        markerRef.current = new maplibregl.Marker({ color: '#0ABAB5' })
          .setLngLat(lngLat)
          .addTo(map)
        console.log('✅ LocationMap: маркер создан при инициализации')
      } else {
        map.once('load', () => {
          markerRef.current = new maplibregl.Marker({ color: '#0ABAB5' })
            .setLngLat(lngLat)
            .addTo(map)
          console.log('✅ LocationMap: маркер создан после загрузки карты')
        })
      }
    }

    // Создаем маркер только если он явно передан и не является дефолтным
    if (Array.isArray(marker) && marker.length === 2) {
      createMarker(marker)
    }

    return () => {
      if (markerRef.current) {
        markerRef.current.remove()
        markerRef.current = null
      }
      map.remove()
      mapRef.current = null
    }
  }, [])

  // Обновление центра/зума (только один раз при изменении координат)
  useEffect(() => {
    if (!mapRef.current) return
    
    // Если координаты не переданы или невалидны, не обновляем
    if (!Array.isArray(center) || center.length !== 2) {
      return
    }
    
    // Проверяем валидность координат
    const lat = parseFloat(center[0])
    const lng = parseFloat(center[1])
    
    if (isNaN(lat) || isNaN(lng)) {
      console.warn('⚠️ LocationMap: координаты не являются числами', center)
      return
    }
    
    // Проверяем диапазоны координат
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      console.warn('⚠️ LocationMap: координаты вне допустимого диапазона', { lat, lng })
      return
    }
    
    // MapLibre использует формат [lng, lat]
    const lngLat = [lng, lat]
    
    // Проверяем, изменились ли координаты по сравнению с последним обновлением
    const centerKey = `${lat.toFixed(4)}-${lng.toFixed(4)}`
    if (lastCenterRef.current === centerKey) {
      // Координаты не изменились, не обновляем карту
      return
    }
    
    // Сохраняем текущие координаты
    lastCenterRef.current = centerKey
    
    // Ждем, пока карта полностью загрузится
    if (!mapRef.current.loaded()) {
      mapRef.current.once('load', () => {
        updateMapCenterOnce(lngLat)
      })
      return
    }
    
    updateMapCenterOnce(lngLat)
    
    function updateMapCenterOnce(lngLat) {
      try {
        console.log('🗺️ LocationMap: обновляем центр карты на', lngLat, 'из координат', center)
        
        // Используем setCenter и setZoom отдельно для мгновенного перехода
        // Это позволяет пользователю свободно перемещаться по карте сразу после перехода
        // без привязки к координатам
        mapRef.current.setCenter(lngLat)
        mapRef.current.setZoom(zoom || 15)
      } catch (error) {
        console.warn('⚠️ LocationMap: ошибка при обновлении центра карты', error)
      }
    }
  }, [center, zoom])

  // Обновление маркера
  useEffect(() => {
    if (!mapRef.current) return

    if (Array.isArray(marker) && marker.length === 2) {
      const lat = parseFloat(marker[0])
      const lng = parseFloat(marker[1])
      
      // Проверяем валидность координат маркера
      if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        console.warn('⚠️ LocationMap: невалидные координаты маркера', marker)
        return
      }
      
      // Проверяем, не являются ли координаты дефолтными (вид над Европой)
      const isDefaultView = Math.abs(lat - 55) < 1 && Math.abs(lng - 20) < 1
      if (isDefaultView) {
        console.log('📍 LocationMap: пропускаем создание маркера на дефолтных координатах')
        if (markerRef.current) {
          markerRef.current.remove()
          markerRef.current = null
        }
        return
      }
      
      // MapLibre использует формат [lng, lat]
      const lngLat = [lng, lat]
      console.log('📍 LocationMap: обновляем маркер на координатах', lngLat, 'из', marker)

      // Ждем, пока карта загрузится, если нужно
      if (!mapRef.current.loaded()) {
        mapRef.current.once('load', () => {
          updateMarker(lngLat)
        })
        return
      }
      
      updateMarker(lngLat)
      
      function updateMarker(lngLat) {
        try {
          if (!markerRef.current) {
            console.log('📍 LocationMap: создаем новый маркер')
            markerRef.current = new maplibregl.Marker({ color: '#0ABAB5' })
              .setLngLat(lngLat)
              .addTo(mapRef.current)
            console.log('✅ LocationMap: маркер создан и добавлен на карту')
          } else {
            console.log('📍 LocationMap: обновляем позицию существующего маркера')
            markerRef.current.setLngLat(lngLat)
          }
        } catch (error) {
          console.warn('⚠️ LocationMap: ошибка при обновлении маркера', error)
        }
      }
    } else {
      // Если маркер не передан, удаляем существующий маркер
      if (markerRef.current) {
        console.log('📍 LocationMap: удаляем маркер (маркер не передан)')
        markerRef.current.remove()
        markerRef.current = null
      } else {
        console.log('📍 LocationMap: маркер не передан')
      }
    }
  }, [marker])

  return (
    <div className="location-map-container">
      <div ref={mapContainerRef} className="location-map" />
    </div>
  )
}

export default LocationMap

