import {ImageResponse} from 'next/og';

export const size = {
  width: 64,
  height: 64,
};
export const contentType = 'image/png';
export const dynamic = 'force-static';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          width: '100%',
          height: '100%',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f5f1e8',
        }}
      >
        <svg width="60" height="60" viewBox="0 0 64 64" aria-hidden="true">
          <g fill="none" stroke="#0B1F2A" strokeLinecap="round" strokeLinejoin="round">
            <path
              d="M8 55V23C8 13 15 7 24 7H25L30 16M34 16L39 7H40C49 7 56 13 56 23V55"
              strokeWidth="5.5"
            />
            <path
              d="M18 53V36C18 28 23 24 29 24L30.5 31M33.5 31L35 24C41 24 46 28 46 36V53"
              strokeWidth="4.5"
            />
            <path
              d="M26 52V45C26 41 28.5 38 31 38L31.25 43M32.75 43L33 38C35.5 38 38 41 38 45V52"
              strokeWidth="3.5"
            />
          </g>
          <circle cx="32" cy="47" r="3.4" fill="#2C755F" />
        </svg>
      </div>
    ),
    size,
  );
}
