/**
 * @param {{ body?: Array<{ type: string, text?: string, id?: string, emphasis?: boolean }> }} props
 */
export default function NewsArticleBody({ body = [] }) {
  if (!body.length) return null

  return (
    <div className="news-article-body">
      {body.map((block, index) => {
        const key = `${block.type}-${block.id || index}`
        if (block.type === 'h2') {
          return (
            <h2 key={key} id={block.id} className="news-article-body__h2">
              {block.text}
            </h2>
          )
        }
        if (block.type === 'h3') {
          return (
            <h3 key={key} className="news-article-body__h3">
              {block.text}
            </h3>
          )
        }
        if (block.type === 'p') {
          const className = block.emphasis
            ? 'news-article-body__p news-article-body__p--emphasis'
            : 'news-article-body__p'
          return (
            <p key={key} className={className}>
              {block.text}
            </p>
          )
        }
        return null
      })}
    </div>
  )
}
