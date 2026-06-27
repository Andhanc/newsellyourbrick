/**
 * Ссылка с href для SEO + SPA-навигация по обычному клику.
 */
export default function SeoSpaLink({
  href,
  className,
  onNavigate,
  children,
  ...rest
}) {
  const targetHref = href || '#'

  return (
    <a
      href={targetHref}
      className={className}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button === 1) return
        if (e.target.closest('button')) {
          e.preventDefault()
          return
        }
        if (!onNavigate) return
        e.preventDefault()
        onNavigate(e)
      }}
      {...rest}
    >
      {children}
    </a>
  )
}
