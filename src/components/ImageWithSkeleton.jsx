import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import './ImageWithSkeleton.css'

function isImageDecoded(img) {
  return Boolean(img?.complete && img.naturalWidth > 0)
}

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
  const src = imgProps?.src ?? ''
  const srcSet = imgProps?.srcSet
  const imgRef = useRef(null)
  const [isLoaded, setIsLoaded] = useState(false)

  const syncLoadedFromDom = useCallback(() => {
    if (isImageDecoded(imgRef.current)) {
      setIsLoaded(true)
      return true
    }
    return false
  }, [])

  useLayoutEffect(() => {
    if (!src) {
      setIsLoaded(false)
      return
    }
    if (!syncLoadedFromDom()) {
      setIsLoaded(false)
    }
  }, [src, srcSet, syncLoadedFromDom])

  const handleImgRef = (node) => {
    imgRef.current = node
    if (node && isImageDecoded(node)) {
      setIsLoaded(true)
    }
  }

  return (
    <div className={`image-with-skeleton ${containerClassName}`.trim()}>
      {!isLoaded ? <div className={`image-with-skeleton__placeholder ${skeletonClassName}`.trim()} /> : null}
      <img
        {...imgProps}
        ref={handleImgRef}
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
