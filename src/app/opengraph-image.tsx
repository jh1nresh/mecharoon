import {ImageResponse} from 'next/og';

export const alt = 'Mecharoon verified settlement for agentic work';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';
export const dynamic = 'force-static';

function BrandSymbol({dimension = 58}: {dimension?: number}) {
  return (
    <svg width={dimension} height={dimension} viewBox="0 0 64 64" aria-hidden="true">
      <g fill="none" stroke="#0B1F2A" strokeLinecap="round">
        <path
          d="M24 7.3A26 26 0 0 0 17.8 53.8M47.3 11A26 26 0 0 1 44.6 54.7"
          strokeWidth="4.4"
        />
        <path
          d="M24.6 16.2A17.4 17.4 0 0 0 20.8 45.3M43.4 18.9A17.4 17.4 0 0 1 41.5 46.6"
          strokeWidth="3.2"
        />
        <path
          d="M26.7 25A8.8 8.8 0 0 0 25.6 38M38.7 26.3A8.8 8.8 0 0 1 38.3 38.1"
          strokeWidth="1.8"
        />
      </g>
      <circle cx="32" cy="32" r="3.1" fill="#2C755F" />
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
              VERIFIED SETTLEMENT FOR AGENT WORK
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
                The financial control infrastructure for agentic work.
              </span>
              <span
                style={{
                  marginTop: '26px',
                  color: '#344850',
                  fontSize: '21px',
                  lineHeight: 1.45,
                }}
              >
                Verify work offchain. Settle approved value onchain. Return one accountable receipt.
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
                ['Early $8', 'DENIED', '$5 cap'],
                ['First submit', 'REVISE', '$5 held'],
                ['Reconcile', 'CONFIRMED', '$5 settled'],
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
                      color: state === 'CONFIRMED' ? '#1E5E4C' : '#8A560B',
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
                <span>Next contextual cap</span>
                <span>$10.00</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
