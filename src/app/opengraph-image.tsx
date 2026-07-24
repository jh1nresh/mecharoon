import {ImageResponse} from 'next/og';

export const alt = 'Mecharoon Agent Spend Control Plane';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';
export const dynamic = 'force-static';

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          width: '100%',
          height: '100%',
          padding: '64px',
          background: '#ffffff',
          color: '#101114',
          fontFamily: 'Arial, sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            width: '100%',
            flexDirection: 'column',
            border: '2px solid #101114',
          }}
        >
          <div
            style={{
              display: 'flex',
              height: '84px',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '2px solid #101114',
              padding: '0 38px',
              fontSize: '22px',
              fontWeight: 700,
              letterSpacing: '0.16em',
            }}
          >
            <span>MECHAROON</span>
            <span style={{color: '#ff5a1f', fontSize: '18px', letterSpacing: '0.06em'}}>
              AGENT SPEND CONTROL PLANE
            </span>
          </div>

          <div
            style={{
              display: 'flex',
              flex: 1,
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '52px',
              padding: '50px 54px',
            }}
          >
            <div style={{display: 'flex', width: '62%', flexDirection: 'column'}}>
              <span
                style={{
                  fontSize: '72px',
                  fontWeight: 600,
                  letterSpacing: '-0.055em',
                  lineHeight: 0.98,
                }}
              >
                Financial control for autonomous teams.
              </span>
              <span style={{marginTop: '28px', color: '#555b63', fontSize: '22px', lineHeight: 1.45}}>
                Bound every agent&apos;s budget. Reconcile every payment.
              </span>
            </div>

            <div
              style={{
                display: 'flex',
                width: '310px',
                flexDirection: 'column',
                border: '2px solid #101114',
                background: '#f7f7f4',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '18px 20px',
                  borderBottom: '2px solid #101114',
                  fontSize: '16px',
                  fontWeight: 700,
                }}
              >
                <span>Budget</span>
                <span>$20.00</span>
              </div>
              {[
                ['Search', 'PASS', '$2'],
                ['Extract', 'REVISE', '$3'],
                ['Verify', 'FAIL', '$1'],
              ].map(([name, state, amount]) => (
                <div
                  key={name}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '16px 20px',
                    borderBottom: '1px solid #cfd3d8',
                    fontSize: '14px',
                  }}
                >
                  <span>{name}</span>
                  <span style={{color: state === 'PASS' ? '#16865a' : state === 'FAIL' ? '#c63d31' : '#a16008'}}>
                    {state} · {amount}
                  </span>
                </div>
              ))}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '18px 20px',
                  background: '#ff5a1f',
                  color: '#ffffff',
                  fontSize: '15px',
                  fontWeight: 700,
                }}
              >
                <span>Available</span>
                <span>$15.00</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
