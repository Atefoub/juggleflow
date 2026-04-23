import { useNavigate, useLocation } from 'react-router-dom';

interface NavItem {
  label: string;
  icon: string;
  path: string;
}

interface BottomNavProps {
  items: NavItem[];
}

export default function BottomNav({ items }: BottomNavProps) {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 flex items-center justify-around"
      style={{
        height: '72px',
        backgroundColor: '#0A0E2A',
        borderTop: '1.5px solid #1E2847',
        paddingBottom: '8px',
        maxWidth: '430px',
        margin: '0 auto',
      }}
    >
      {items.map((item) => {
        const isActive = location.pathname === item.path;
        return (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className="flex flex-col items-center gap-1 min-w-[44px] min-h-[44px] justify-center"
            style={{
              color: isActive ? '#FFFFFF' : '#5A6480',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.6rem',
              fontWeight: isActive ? 700 : 400,
              fontFamily: 'DM Sans, sans-serif',
            }}
          >
            <div
              className="flex items-center justify-center"
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: isActive ? '#8B2BE2' : 'transparent',
                fontSize: '1.1rem',
              }}
            >
              {item.icon}
            </div>
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}