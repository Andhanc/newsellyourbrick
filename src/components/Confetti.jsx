import { useEffect, useState } from 'react'
import './Confetti.css'

const Confetti = ({ className = '' }) => {
  const [confetti, setConfetti] = useState([])

  useEffect(() => {
    // Создаем больше конфетти для более красивого эффекта
    const colors = ['#667eea', '#764ba2', '#f093fb', '#4facfe', '#43e97b', '#f5576c', '#fa709a', '#fee140', '#ff6b6b', '#4ecdc4', '#ffe66d', '#a8e6cf']
    const newConfetti = []

    // Увеличиваем количество конфетти до 200
    for (let i = 0; i < 200; i++) {
      newConfetti.push({
        id: i,
        left: Math.random() * 100,
        animationDelay: Math.random() * 5, // Увеличиваем задержку до 5 секунд
        animationDuration: 4 + Math.random() * 4, // Увеличиваем время падения до 4-8 секунд
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 10 + Math.random() * 16,
        rotation: Math.random() * 720, // Больше вращений
        shape: Math.random() > 0.5 ? 'circle' : 'square' // Разные формы
      })
    }

    setConfetti(newConfetti)
  }, [])

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
