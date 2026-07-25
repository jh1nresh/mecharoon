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
          <g fill="none" stroke="#0B1F2A" strokeLinecap="round">
            <path
              d="M24 7.3A26 26 0 0 0 17.8 53.8M47.3 11A26 26 0 0 1 44.6 54.7"
              strokeWidth="5.2"
            />
            <path
              d="M24.6 16.2A17.4 17.4 0 0 0 20.8 45.3M43.4 18.9A17.4 17.4 0 0 1 41.5 46.6"
              strokeWidth="3.6"
            />
          </g>
          <circle cx="32" cy="32" r="4" fill="#2C755F" />
        </svg>
      </div>
    ),
    size,
  );
}
