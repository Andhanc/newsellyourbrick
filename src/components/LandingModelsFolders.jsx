import AnimatedFolder from './ui/3d-folder';
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
          {folders.map((folder, index) => (
            <div
              key={folder.titleKey}
              className={`landing-models__folders-slide${index === 0 ? ' landing-models__folders-slide--featured' : ''}`}
            >
              <AnimatedFolder
                variant="landingSlider"
                featured={index === 0}
                title={folder.title}
                projects={folder.projects}
                gradient={folder.gradient}
                linkLabel={folder.linkLabel}
                linkHref={folder.linkHref}
                className="landing-models__folder"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
