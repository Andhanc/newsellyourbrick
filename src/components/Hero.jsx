import { useState } from 'react'
import './Hero.css'

const FEATURES = [
  {
    title: 'Узнайте цену своего дома',
    text: 'Оцениваем квартиру и показываем, как её цена меняется – а ещё составляем подборки недвижимости с учётом ваших пожеланий и возможностей',
    img: 'https://static.cdn-cian.ru/frontend/valuation-my-home-page-frontend/icon_1.17dab2f77576179c.png',
    alt: 'Оценка недвижимости'
  },
  {
    title: 'Распоряжайтесь квартирой с умом',
    text: 'Показываем потенциальную стоимость аренды вашей квартиры и рассказываем, как и сколько можно на ней заработать',
    img: 'https://static.cdn-cian.ru/frontend/valuation-my-home-page-frontend/icon_2.d6f1a6545650e2f8.svg',
    alt: 'Аренда недвижимости'
  },
  {
    title: 'Станьте экспертом в недвижимости',
    text: 'Помогаем разобраться в недвижимости с помощью гайдов и рассказываем полезное о жилье в журнале, пишем главное о доме и инфраструктуре.',
    img: 'https://static.cdn-cian.ru/frontend/valuation-my-home-page-frontend/icon_3.be34334d56e4527b.svg',
    alt: 'Экспертиза недвижимости'
  }
]

const Hero = () => {
  const [expandedIndex, setExpandedIndex] = useState(null)

  const handleToggle = (index) => {
    setExpandedIndex((prev) => (prev === index ? null : index))
  }

  return (
    <section className="hero">
      <div className="hero-container">
        <div className="hero-features">
          {FEATURES.map((feature, index) => (
            <div
              key={feature.title}
              className={`hero-feature-card ${expandedIndex === index ? 'hero-feature-card--expanded' : ''}`}
              onClick={() => handleToggle(index)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  handleToggle(index)
                }
              }}
            >
              <div className="hero-feature-image">
                <img src={feature.img} alt={feature.alt} />
              </div>
              <div className="hero-feature-content">
                <h3>{feature.title}</h3>
                <p>{feature.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default Hero

