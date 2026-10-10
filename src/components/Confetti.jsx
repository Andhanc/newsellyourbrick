import { useEffect, useState } from 'react'
import './Confetti.css'

const Confetti = ({ className = '', count = 200, minSize = 10, maxSize = 26, loop = false, spreadOnMount = false }) => {
  const [confetti, setConfetti] = useState([])

  useEffect(() => {
    // Создаем больше конфетти для более красивого эффекта
    const colors = ['#667eea', '#764ba2', '#f093fb', '#4facfe', '#43e97b', '#f5576c', '#fa709a', '#fee140', '#ff6b6b', '#4ecdc4', '#ffe66d', '#a8e6cf']
    const newConfetti = []

    for (let i = 0; i < count; i++) {
      const animationDuration = 4 + Math.random() * 4
      newConfetti.push({
        id: i,
        left: Math.random() * 100,
        animationDelay: spreadOnMount ? -Math.random() * animationDuration : Math.random() * 5,
        animationDuration,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: minSize + Math.random() * (maxSize - minSize),
        rotation: Math.random() * 720, // Больше вращений
        shape: Math.random() > 0.5 ? 'circle' : 'square' // Разные формы
      })
    }

    setConfetti(newConfetti)
  }, [count, minSize, maxSize, spreadOnMount])

  return (
    <div className={`confetti-container${className ? ` ${className}` : ''}`} aria-hidden="true">
      {confetti.map((piece) => (
        <div
          key={piece.id}
          className={`confetti-piece confetti-piece--${piece.shape}`}
          style={{
            left: `${piece.left}%`,
            animationDelay: `${piece.animationDelay}s`,
            animationDuration: `${piece.animationDuration}s`,
            animationIterationCount: loop ? 'infinite' : undefined,
            backgroundColor: piece.color,
            width: `${piece.size}px`,
            height: `${piece.size}px`,
            transform: `rotate(${piece.rotation}deg)`
          }}
        />
      ))}
    </div>
  )
}

export default Confetti
