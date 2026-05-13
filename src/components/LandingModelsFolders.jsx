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
          {folders.map((folder) => (
            <div
              key={folder.titleKey}
              className="landing-models__folders-slide"
            >
              <AnimatedFolder
                variant="landingSlider"
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
