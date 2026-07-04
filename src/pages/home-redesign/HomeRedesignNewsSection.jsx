import SybLandingNewsShowcase from '../../components/SybLandingNewsShowcase'

export default function HomeRedesignNewsSection() {
  return (
    <section className="hr-news" aria-labelledby="syb-news-title">
      <div className="hr-container hr-news__inner">
        <SybLandingNewsShowcase maxItems={4} layout="mosaic" />
      </div>
    </section>
  )
}
