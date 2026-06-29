import { useState } from 'react'
import { FiMail } from 'react-icons/fi'
import ContributorsWall from './ui/contributors-section'

const propertyPhotoIds = [
  '1564013799919-ab600027ffc6',
  '1568605114967-8130f3a36994',
  '1570129477492-45c003edd2be',
  '1512917774080-9991f1c4c750',
  '1600585154340-be6161a56a0c',
  '1600596542815-ffad4c1539a9',
  '1605276374104-dee2a0ed3cd6',
  '1605146769289-440113cc3d00',
  '1583608205776-bfd35f0d9f83',
  '1512453979798-5ea266f8880c',
  '1486406146926-c627a92ad1ab',
  '1493809842364-78817add7ffb',
  '1502672260266-1c1ef2d93688',
  '1522708323590-d24dbb6b0267',
  '1484154218962-a197022b5858',
  '1501183638710-841dd1904471',
  '1600607687939-ce8a6c25118c',
  '1582268611958-ebfd161ef9cf',
]

const properties = Array.from({ length: 180 }, (_, i) => {
  const id = propertyPhotoIds[i % propertyPhotoIds.length]
  return {
    username: `Объект №${i + 1}`,
    avatarUrl: `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=160&h=160&q=60`,
  }
})

const newsletterCards = [
  {
    key: 'card-1',
    image: '/images/external/photo-1600585154340-be6161a56a0c-08c1b1d59d.jpg',
    title: 'Как работают аукционы на SellYourBrick',
    excerpt: 'Прозрачные торги, верифицированные участники и понятные правила — разбираем механику платформы.',
    className: 'invest-community__float--1',
  },
  {
    key: 'card-2',
    image: '/images/external/photo-1507525428034-b723cf961d3e-ae413f8ef9.jpg',
    title: 'Приморские виллы: спрос и доходность',
    excerpt: 'Почему объекты у моря остаются в топе у инвесторов и как оценить потенциал аренды в солнечных регионах.',
    className: 'invest-community__float--2',
  },
  {
    key: 'card-3',
    image: '/images/external/photo-1486406146926-c627a92ad1ab-f0c377ec01.jpg',
    title: 'Рынок недвижимости: тренды 2026',
    excerpt: 'Какие локации растут быстрее, где искать доходность и на что обращать внимание при покупке за рубежом.',
    className: 'invest-community__float--3',
  },
]

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim())
}

export default function InvestorCommunitySection() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)

  const handleSubmit = (event) => {
    event.preventDefault()
    if (!isValidEmail(email)) return
    setSent(true)
    window.setTimeout(() => {
      setSent(false)
      setEmail('')
    }, 2600)
  }

  return (
    <section className="invest-community" aria-label="Сообщество инвесторов SellYourBrick">
      <div className="invest-community__wall-wrap">
        <ContributorsWall
          contributors={properties}
          totalCount={1000}
          columns={18}
          tilt={16}
          speed={22}
          height={440}
          showHeader={false}
          pauseOnHover={false}
          showTooltip={false}
          fullWidth
          wallBg="#fbfcfd"
          className="invest-community__wall-inner"
        />
        <div className="invest-community__overlay">
          <header className="invest-community__header">
            <h2 className="invest-community__title">
              Более <span>1000 объектов</span> и тысячи инвесторов на платформе
            </h2>
          </header>
        </div>
      </div>

      <div className="invest-shell invest-community__inner">
        <div className="invest-community__card">
          <div className="invest-community__card-copy">
            <h3 className="invest-community__card-title">
              Подпишитесь на еженедельную рассылку
            </h3>
            <form className="invest-community__form" onSubmit={handleSubmit}>
              <div className="invest-community__field">
                <FiMail className="invest-community__field-icon" size={18} aria-hidden />
                <input
                  type="email"
                  className="invest-community__input"
                  placeholder="Введите свою почту"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  required
                  disabled={sent}
                />
              </div>
              <button
                className="invest-community__submit"
                type="submit"
                disabled={sent || !isValidEmail(email)}
              >
                {sent ? 'Вы подписаны!' : 'Подписаться'}
              </button>
            </form>
          </div>

          <div className="invest-community__visual" aria-hidden>
            {newsletterCards.map((card) => (
              <article key={card.key} className={`invest-community__float ${card.className}`}>
                <div className="invest-community__float-media">
                  <img src={card.image} alt="" loading="lazy" decoding="async" />
                </div>
                <div className="invest-community__float-body">
                  <p className="invest-community__float-title">{card.title}</p>
                  <p className="invest-community__float-excerpt">{card.excerpt}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
