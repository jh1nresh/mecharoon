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
          borderRadius: '14px',
          background: '#101114',
          color: '#ff5a1f',
          fontFamily: 'Arial, sans-serif',
          fontSize: '34px',
          fontWeight: 800,
        }}
      >
        M
      </div>
    ),
    size,
  );
}
