export function XpLogo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <circle cx="16" cy="16" r="16" fill="#001E62" />
      <circle cx="16" cy="16" r="12.5" fill="none" stroke="#E2001A" strokeWidth="2" />
      <path
        d="M6.5 17.5 Q16 9.5 25.5 17.5"
        stroke="#E2001A"
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
      />
      <text
        x="16"
        y="22.5"
        textAnchor="middle"
        fontFamily="Arial Black,Arial,Helvetica,sans-serif"
        fontWeight="900"
        fontSize="9.5"
        fill="white"
      >
        XP
      </text>
    </svg>
  );
}
