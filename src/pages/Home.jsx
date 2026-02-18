import { useState, useEffect, useMemo } from 'react'
import { useUser } from '@clerk/clerk-react'
import Header from '../components/Header'
import Hero from '../components/Hero'
import PropertyList from '../components/PropertyList'
import FAQ from '../components/FAQ'
import DepositButton from '../components/DepositButton'
import { getUserData, isAuthenticated } from '../services/authService'
import './Home.css'

import { getApiBaseUrl } from '../utils/apiConfig'

function Home() {
  const [auctionProperties, setAuctionProperties] = useState([])
  const [loading, setLoading] = useState(true)
  const [userDeposit, setUserDeposit] = useState(0)
  const { user, isLoaded: userLoaded } = useUser()
  const userData = getUserData()
  const [dbUserId, setDbUserId] = useState(null)
  
  // Функция для проверки, можно ли показывать депозит
  const canShowDeposit = () => {
    if (!isAuthenticated()) return false
    const userRole = userData?.role
    return userRole !== 'seller'
  }

  // Загрузка аукционных и не аукционных объявлений из API
  useEffect(() => {
    const loadProperties = async () => {
      try {
        // Убеждаемся, что API URL инициализирован ПЕРЕД загрузкой
        const API_BASE_URL = await getApiBaseUrl()
        
        setLoading(true)
        // Загружаем объявления по типам
        const types = [
          { apiType: 'commercial', stateKey: 'apartments' },
          { apiType: 'villa', stateKey: 'villas' },
          { apiType: 'apartment', stateKey: 'flats' },
          { apiType: 'house', stateKey: 'houses' }
        ]

        const allAuctionProperties = []
        const allNonAuctionProperties = []
        const allTestProperties = []

        // Загружаем тестовые объявления (они уже включают все типы)
        try {
          const testUrl = `${API_BASE_URL}/properties/test-timers`
          console.log('📡 Запрос тестовых объявлений:', testUrl)
          const testResponse = await fetch(testUrl)
          if (testResponse.ok) {
            const data = await testResponse.json()
            if (data.success && data.data) {
              allTestProperties.push(...data.data)
            }
          } else {
            console.warn('⚠️ Ошибка загрузки тестовых объявлений:', testResponse.status)
          }
        } catch (error) {
          console.error('Ошибка загрузки тестовых объявлений:', error)
        }

        for (const { apiType } of types) {
          try {
            // Загружаем аукционные объявления
            const auctionUrl = `${API_BASE_URL}/properties/auctions?type=${apiType}`
            console.log('📡 Запрос аукционных:', auctionUrl)
            const auctionResponse = await fetch(auctionUrl)
            if (auctionResponse.ok) {
              const data = await auctionResponse.json()
              if (data.success && data.data) {
                // Исключаем тестовые объявления, чтобы не дублировать
                const nonTestAuction = data.data.filter(prop => 
                  !prop.test_timer_end_date
                )
                allAuctionProperties.push(...nonTestAuction)
              }
            } else {
              console.warn(`⚠️ Ошибка загрузки аукционных объявлений типа ${apiType}:`, auctionResponse.status)
            }

            // Загружаем не аукционные объявления (одобренные)
            const approvedUrl = `${API_BASE_URL}/properties/approved?type=${apiType}`
            console.log('📡 Запрос одобренных:', approvedUrl)
            const approvedResponse = await fetch(approvedUrl)
            if (approvedResponse.ok) {
              const data = await approvedResponse.json()
              if (data.success && data.data) {
                // Фильтруем только не аукционные объекты
                const nonAuction = data.data.filter(prop => 
                  !prop.is_auction || prop.is_auction === 0 || prop.is_auction === false
                )
                allNonAuctionProperties.push(...nonAuction)
              }
            }
          } catch (error) {
            console.error(`Ошибка загрузки объявлений типа ${apiType}:`, error)
          }
        }

        // Форматируем данные для PropertyList
        const formatProperty = (prop, isAuction) => ({
          ...prop,
          // Убеждаемся, что все необходимые поля присутствуют
          title: prop.title || prop.name || '',
          location: prop.location || '',
          price: prop.price || (isAuction ? prop.auction_starting_price : 0) || 0,
          currentBid: isAuction ? (prop.currentBid || prop.auction_starting_price || prop.price || 0) : null,
          endTime: isAuction ? (prop.test_timer_end_date || prop.endTime || prop.auction_end_date || null) : null,
          isAuction: isAuction,
          test_timer_end_date: prop.test_timer_end_date || null,
          images: prop.images || (prop.image ? [prop.image] : []),
          image: prop.image || (prop.images && prop.images[0] ? prop.images[0] : null),
          // Основные характеристики
          rooms: prop.rooms || prop.beds || 0,
          beds: prop.bedrooms || prop.rooms || prop.beds || 0,
          bedrooms: prop.bedrooms || prop.rooms || 0,
          bathrooms: prop.bathrooms || 0,
          area: prop.area || prop.sqft || 0,
          sqft: prop.area || prop.sqft || 0,
          floor: prop.floor || null,
          total_floors: prop.total_floors || prop.totalFloors || null,
          year_built: prop.year_built || null,
          land_area: prop.land_area || null,
          // Дополнительная информация
          renovation: prop.renovation || null,
          condition: prop.condition || null,
          heating: prop.heating || null,
          water_supply: prop.water_supply || null,
          sewerage: prop.sewerage || null
        })

        const formattedAuction = allAuctionProperties.map(prop => formatProperty(prop, true))
        const formattedTest = allTestProperties.map(prop => formatProperty(prop, true))
        const formattedNonAuction = allNonAuctionProperties.map(prop => formatProperty(prop, false))
        
        // Объединяем тестовые, аукционные и не аукционные объекты (тестовые первыми)
        const allProperties = [...formattedTest, ...formattedAuction, ...formattedNonAuction]

        setAuctionProperties(allProperties)
        console.log('✅ Загружено тестовых объявлений:', formattedTest.length)
        console.log('✅ Загружено аукционных объявлений:', formattedAuction.length)
        console.log('✅ Загружено не аукционных объявлений:', formattedNonAuction.length)
      } catch (error) {
        console.error('❌ Ошибка загрузки объявлений:', error)
      } finally {
        setLoading(false)
      }
    }

    loadProperties()
    
    // Обновляем каждые 5 минут для получения новых объявлений
    const interval = setInterval(loadProperties, 300000)
    return () => clearInterval(interval)
  }, [])

  // Получаем числовой ID из БД для Clerk пользователей
  useEffect(() => {
    // Если dbUserId уже установлен, не делаем ничего
    if (dbUserId) {
      return
    }
    
    const fetchDbUserId = async () => {
      // Проверяем localStorage сначала
      const savedUserId = localStorage.getItem('userId')
      if (savedUserId && /^\d+$/.test(savedUserId)) {
        setDbUserId(parseInt(savedUserId))
        return
      }
      
      // Если userLoaded еще не загружен, ждем
      if (!userLoaded) {
        return
      }
      
      const isClerkAuth = user && userLoaded
      const isOldAuth = isAuthenticated()
      
      // Для Clerk пользователей получаем ID из БД
      if (isClerkAuth && user) {
        try {
          const API_BASE_URL = await getApiBaseUrl()
          
          const userEmail = user.primaryEmailAddress?.emailAddress || user.emailAddresses?.[0]?.emailAddress
          if (userEmail) {
            const userResponse = await fetch(`${API_BASE_URL}/users/email/${encodeURIComponent(userEmail)}`)
            if (userResponse.ok) {
              const userData = await userResponse.json()
              if (userData.success && userData.data && userData.data.id) {
                const numericId = userData.data.id
                setDbUserId(numericId)
                localStorage.setItem('userId', String(numericId))
              }
            }
          }
        } catch (e) {
          console.warn('Не удалось получить userId из БД:', e)
        }
      } else if (isOldAuth) {
        // Для старой системы авторизации используем ID из getUserData
        const currentUserData = getUserData()
        const userId = currentUserData?.id
        if (userId && /^\d+$/.test(userId.toString())) {
          setDbUserId(parseInt(userId))
        }
      }
    }
    
    fetchDbUserId()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userLoaded, user?.id, user?.primaryEmailAddress?.emailAddress])

  // Загружаем депозит пользователя
  useEffect(() => {
    const loadUserDeposit = async () => {
      if (!dbUserId) {
        setUserDeposit(0)
        return
      }
      
      try {
        const API_BASE_URL = await getApiBaseUrl()
        const response = await fetch(`${API_BASE_URL}/users/${dbUserId}/deposit`)
        if (response.ok) {
          const data = await response.json()
          if (data.success) {
            setUserDeposit(data.data.depositAmount || 0)
          }
        }
      } catch (error) {
        console.error('Ошибка загрузки депозита:', error)
        setUserDeposit(0)
      }
    }
    
    loadUserDeposit()
    // Обновляем каждые 5 секунд для актуальности данных
    const interval = setInterval(loadUserDeposit, 5000)
    return () => clearInterval(interval)
  }, [dbUserId])

  return (
    <div className="home-page">
      {canShowDeposit() && <DepositButton amount={userDeposit} />}
      <Header />
      <Hero />
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
          <p>Загрузка аукционных объявлений...</p>
        </div>
      ) : (
        <PropertyList auctionProperties={auctionProperties} />
      )}
      <FAQ />
    </div>
  )
}

export default Home
