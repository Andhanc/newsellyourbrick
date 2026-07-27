export default function AuctionGavelIcon({
  size = 22,
  className,
  strokeWidth = 1.75,
  ...props
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
      {...props}
    >
      <path
        d="M13.35 10.1H18.65"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      <path
        d="M15.85 12.1L9.15 18.8"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      <path
        d="M11.65 7.85H16.85"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      <path
        d="M11.65 7.85V9.95"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      <path
        d="M16.85 7.85V9.95"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      <circle cx="15.85" cy="11.05" r="0.9" fill="currentColor" />
    </svg>
  )
}
