import './DebtsRouteSkeleton.css'

/**
 * Лёгкий скелет первой отрисовки /debts без тяжёлого чанка страницы.
 */
export default function DebtsRouteSkeleton() {
  return (
    <div className="debts-skel" aria-busy="true" aria-live="polite">
      <header className="debts-skel__header" aria-hidden="true" />
      <div className="debts-skel__bg" aria-hidden="true" />
      <main className="debts-skel__container">
        <div className="debts-skel__flip-row" aria-hidden="true">
          <div className="debts-skel__card" />
          <div className="debts-skel__card" />
          <div className="debts-skel__card" />
        </div>
        <div className="debts-skel__search" aria-hidden="true" />
        <div className="debts-skel__grid">
          <div className="debts-skel__prop" />
          <div className="debts-skel__prop" />
          <div className="debts-skel__prop" />
          <div className="debts-skel__prop debts-skel__prop--hide-mobile" />
          <div className="debts-skel__prop debts-skel__prop--hide-mobile" />
          <div className="debts-skel__prop debts-skel__prop--hide-mobile" />
        </div>
      </main>
    </div>
  )
}
