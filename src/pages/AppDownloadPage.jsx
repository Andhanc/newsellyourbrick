import { useEffect, useState } from 'react'
import { SiAndroid, SiApple } from 'react-icons/si'
import Header from '../components/Header'
import { publicAsset } from '../utils/publicAsset'
import './AppDownloadPage.css'

const HERO_BG = publicAsset('images/app-download/hero-pastel.png')
const LOCK_BG = publicAsset('images/app-download/lock-summer.png')
const ANDROID_APK_URL = 'https://litter.catbox.moe/znl6kx.apk'

const PROPERTIES = [
  {
    id: 'adeje',
    title: 'Вилла в Adeje',
    place: 'Тенерифе',
    price: '€485 000',
    image: publicAsset('images/test-drive/property-marbella-card.jpg'),
    endsInMs: 2 * 60 * 60 * 1000 + 14 * 60 * 1000 + 37 * 1000,
  },
  {
    id: 'cristianos',
    title: 'Costamar',
    place: 'Los Cristianos',
    price: '€312 500',
    image: publicAsset('images/test-drive/property-barcelona.png'),
    endsInMs: 5 * 60 * 60 * 1000 + 42 * 60 * 1000 + 8 * 1000,
  },
  {
    id: 'abamah',
    title: 'Абама Гольф',
    place: 'Guía de Isora',
    price: '€690 000',
    image: publicAsset('images/test-drive/property-sorrento.png'),
    endsInMs: 11 * 60 * 60 * 1000 + 3 * 60 * 1000 + 51 * 1000,
  },
]

function pad(n) {
  return String(Math.max(0, n)).padStart(2, '0')
}

function formatRemain(ms) {
  const total = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  return `${pad(h)}:${pad(m)}:${pad(s)}`
}

export default function AppDownloadPage() {
  const [remain, setRemain] = useState(() =>
    Object.fromEntries(PROPERTIES.map((p) => [p.id, p.endsInMs]))
  )

  useEffect(() => {
    const started = Date.now()
    const basemap = Object.fromEntries(PROPERTIES.map((p) => [p.id, p.endsInMs]))
    const tick = () => {
      const elapsed = Date.now() - started
      setRemain(
        Object.fromEntries(
          Object.entries(basemap).map(([id, base]) => [id, Math.max(0, base - elapsed)])
        )
      )
    }
    const id = window.setInterval(tick, 1000)
    return () => window.clearInterval(id)
  }, [])

  return (
    <div className="app-dl">
      <Header />
      <main className="app-dl__page">
        <section className="app-dl__visual" aria-hidden>
          <img src={HERO_BG} alt="" className="app-dl__visual-bg" />
          <div className="app-dl__visual-wash" />
          <div className="app-dl__bloom" />

          <div className="app-dl__stage">
            <div className="app-dl__phone">
              <div className="app-dl__phone-glow" />
              <div className="app-dl__phone-bezel">
                <div className="app-dl__island" />
                <img src={LOCK_BG} alt="" className="app-dl__lock-bg" />
                <div className="app-dl__glass" />
                <div className="app-dl__lock-ui">
                  <p className="app-dl__clock">9:41</p>
                  <p className="app-dl__date">Понедельник, 6 июня</p>
                </div>
              </div>

              <ul className="app-dl__notifs">
                {PROPERTIES.map((item, index) => (
                  <li
                    key={item.id}
                    className={`app-dl__notif app-dl__notif--${index + 1}`}
                    style={{ animationDelay: `${0.12 + index * 0.1}s` }}
                  >
                    <img
                      src={item.image}
                      alt=""
                      className="app-dl__notif-photo"
                    />
                    <div className="app-dl__notif-body">
                      <div className="app-dl__notif-row">
                        <div className="app-dl__notif-meta">
                          <strong>{item.title}</strong>
                          <span className="app-dl__notif-place">{item.place}</span>
                        </div>
                        <span className="app-dl__notif-price">{item.price}</span>
                      </div>
                      <div className="app-dl__notif-timer" role="timer">
                        <span>Аукцион</span>
                        <time>{formatRemain(remain[item.id])}</time>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="app-dl__copy">
          <div className="app-dl__copy-inner">
            <h1 className="app-dl__title">
              Не пропустите ставки и&nbsp;торги
            </h1>
            <p className="app-dl__lead">
              Объекты, цены и таймер аукциона — всегда под рукой.
            </p>

            <div className="app-dl__actions">
              <a
                className="app-dl__store app-dl__store--android"
                href={ANDROID_APK_URL}
                download
                rel="noopener noreferrer"
              >
                <span className="app-dl__store-icon" aria-hidden>
                  <SiAndroid size={24} />
                </span>
                <span className="app-dl__store-text">
                  <small>Скачать</small>
                  <strong>Android</strong>
                </span>
              </a>
              <button type="button" className="app-dl__store app-dl__store--ios" disabled>
                <span className="app-dl__store-icon" aria-hidden>
                  <SiApple size={24} />
                </span>
                <span className="app-dl__store-text">
                  <small>Скоро</small>
                  <strong>iOS</strong>
                </span>
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
