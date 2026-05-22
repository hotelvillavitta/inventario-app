const TABS = [
  { id: "dashboard", label: "Dashboard", icon: "◫" },
  { id: "inventario", label: "Inventario", icon: "▦" },
  { id: "historial", label: "Historial", icon: "☰" },
];

export default function BottomNav({ active, onChange }) {
  return (
    <nav className="inv-bottom-nav" aria-label="Navegación principal">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={`inv-bottom-nav__item${active === tab.id ? " inv-bottom-nav__item--active" : ""}`}
          onClick={() => onChange(tab.id)}
          aria-current={active === tab.id ? "page" : undefined}
        >
          <span className="inv-bottom-nav__icon" aria-hidden>
            {tab.icon}
          </span>
          <span className="inv-bottom-nav__label">{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}
