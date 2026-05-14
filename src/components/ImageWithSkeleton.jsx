import { useEffect, useState } from 'react'
import './ImageWithSkeleton.css'

export default function ImageWithSkeleton({
  imgProps = {},
  alt = '',
  className = '',
  containerClassName = '',
  skeletonClassName = '',
  imgStyle,
  onError,
  onLoad,
}) {
  const src = imgProps?.src || ''
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    setIsLoaded(false)
  }, [src])

  return (
    <div className={`image-with-skeleton ${containerClassName}`.trim()}>
      {!isLoaded ? <div className={`image-with-skeleton__placeholder ${skeletonClassName}`.trim()} /> : null}
      <img
        {...imgProps}
        alt={alt}
        style={imgStyle}
        className={`${className} ${isLoaded ? 'image-with-skeleton__img--ready' : 'image-with-skeleton__img--loading'}`.trim()}
        onLoad={(e) => {
          setIsLoaded(true)
          onLoad?.(e)
        }}
        onError={(e) => {
          setIsLoaded(true)
          onError?.(e)
        }}
      />
    </div>
  )
}
