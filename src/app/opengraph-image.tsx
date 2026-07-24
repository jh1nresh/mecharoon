import {ImageResponse} from 'next/og';

export const alt = 'Mecharoon Agent Spend Control Plane';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';
export const dynamic = 'force-static';

function BrandSymbol({dimension = 58}: {dimension?: number}) {
  return (
    <svg width={dimension} height={dimension} viewBox="0 0 64 64" aria-hidden="true">
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
  );
}

function BrandWordmark() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        color: '#0B1F2A',
        fontSize: '40px',
        fontWeight: 700,
        letterSpacing: '-0.055em',
      }}
    >
      <span>Mechar</span>
      <div
        style={{
          position: 'relative',
          display: 'flex',
          height: '35px',
          alignItems: 'center',
          gap: '12px',
          margin: '2px 2px 0 2px',
        }}
      >
        <span
          style={{
            display: 'flex',
            width: '30px',
            height: '32px',
            border: '5px solid #0B1F2A',
            borderRadius: '999px',
          }}
        />
        <span
          style={{
            display: 'flex',
            width: '23px',
            height: '25px',
            border: '4px solid #0B1F2A',
            borderRadius: '999px',
            transform: 'translateY(2px)',
          }}
        />
        <span
          style={{
            position: 'absolute',
            top: '17px',
            left: '34px',
            display: 'flex',
            width: '4px',
            height: '4px',
            borderRadius: '999px',
            background: '#2C755F',
          }}
        />
      </div>
      <span>n</span>
    </div>
  );
}

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          width: '100%',
          height: '100%',
          padding: '54px',
          background: '#F5F1E8',
          color: '#0B1F2A',
          fontFamily: 'Arial, sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            width: '100%',
            flexDirection: 'column',
            border: '2px solid #0B1F2A',
            background: '#FFFDF8',
          }}
        >
          <div
            style={{
              display: 'flex',
              height: '92px',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '2px solid #0B1F2A',
              padding: '0 34px',
            }}
          >
            <div style={{display: 'flex', alignItems: 'center', gap: '16px'}}>
              <BrandSymbol dimension={54} />
              <BrandWordmark />
            </div>
            <span
              style={{
                color: '#1E5E4C',
                fontSize: '17px',
                fontWeight: 700,
                letterSpacing: '0.09em',
              }}
            >
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
              padding: '46px 50px',
            }}
          >
            <div style={{display: 'flex', width: '62%', flexDirection: 'column'}}>
              <span
                style={{
                  fontSize: '70px',
                  fontWeight: 600,
                  letterSpacing: '-0.058em',
                  lineHeight: 0.98,
                }}
              >
                Financial control for autonomous teams.
              </span>
              <span
                style={{
                  marginTop: '26px',
                  color: '#344850',
                  fontSize: '21px',
                  lineHeight: 1.45,
                }}
              >
                Delegate authority. Reserve atomically. Reconcile every payment.
              </span>
            </div>

            <div
              style={{
                display: 'flex',
                width: '318px',
                flexDirection: 'column',
                border: '2px solid #0B1F2A',
                background: '#F5F1E8',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '18px 20px',
                  borderBottom: '2px solid #0B1F2A',
                  fontSize: '16px',
                  fontWeight: 700,
                }}
              >
                <span>Parent budget</span>
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
                    padding: '15px 20px',
                    borderBottom: '1px solid #D6D1C7',
                    fontSize: '14px',
                  }}
                >
                  <span>{name}</span>
                  <span
                    style={{
                      color: state === 'PASS' ? '#1E5E4C' : state === 'FAIL' ? '#C63D31' : '#8A560B',
                      fontWeight: 700,
                    }}
                  >
                    {state} · {amount}
                  </span>
                </div>
              ))}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '18px 20px',
                  background: '#2C755F',
                  color: '#F5F1E8',
                  fontSize: '15px',
                  fontWeight: 700,
                }}
              >
                <span>Reconciled available</span>
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
