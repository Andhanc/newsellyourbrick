import AnimatedFolder from './ui/3d-folder';
import { Fragment } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';
import './LandingModelsFolders.css';

/**
 * Инвестиционные модели (3D-папки): на десктопе — сетка; на телефоне — статическая сетка 1 + 2 + 2.
 */
export default function LandingModelsFolders({ folders, ariaLabel }) {
  const label = ariaLabel || 'Investment models';

  if (!folders?.length) return null;

  return (
    <div className="landing-models__folders-root">
      <div
        className="landing-models__folders-viewport"
        role="region"
        aria-label={label}
      >
        <div className="landing-models__folders-track">
          {folders.map((folder, index) => {
            if (index === 0) {
              return (
                <Fragment key={folder.titleKey}>
                  <div className="landing-models__folders-slide landing-models__folders-slide--pos-1">
                    <AnimatedFolder
                      variant="landingSlider"
                      featured={true}
                      title={folder.title}
                      projects={folder.projects}
                      gradient={folder.gradient}
                      linkLabel={folder.linkLabel}
                      linkHref={folder.linkHref}
                      className="landing-models__folder"
                    />
                  </div>
                  {folder.linkHref ? (
                    <div className="landing-models__folders-cta">
                      <div className="landing-models__folders-cta-shell">
                        <Link
                          to={folder.linkHref}
                          className="landing-models__folders-cta-corner-link"
                          aria-label={folder.linkLabel || 'Перейти к аукциону'}
                        >
                          <ExternalLink className="landing-models__folders-cta-corner-icon" aria-hidden />
                        </Link>
                        <div className="landing-models__folders-cta-folder" aria-hidden="true">
                          <span className="landing-models__folders-cta-folder-tab" />
                          <span className="landing-models__folders-cta-folder-back" />
                          <span className="landing-models__folders-cta-folder-front" />
                        </div>
                        <div className="landing-models__folders-cta-content">
                          <p className="landing-models__folders-cta-title">Готовы к аукциону?</p>
                          <p className="landing-models__folders-cta-copy">
                            Запустите торги по объекту и получите максимум интереса от покупателей.
                          </p>
                          <Link to={folder.linkHref} className="landing-models__folders-cta-button">
                            Перейти к аукциону
                          </Link>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </Fragment>
              );
            }

            return (
              <Fragment key={folder.titleKey}>
                <div className={`landing-models__folders-slide landing-models__folders-slide--pos-${index + 1}`}>
                  <AnimatedFolder
                    variant="landingSlider"
                    featured={false}
                    title={folder.title}
                    projects={folder.projects}
                    gradient={folder.gradient}
                    linkLabel={folder.linkLabel}
                    linkHref={folder.linkHref}
                    className="landing-models__folder"
                  />
                </div>
              </Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}
