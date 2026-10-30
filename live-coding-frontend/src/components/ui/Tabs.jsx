export default function Tabs({ items, value = 0, onChange }) {
  return (
    <div className="lc-tabs" role="tablist">
      {(items || []).map((item, index) => (
        <button
          key={item.label}
          type="button"
          className="lc-tab"
          role="tab"
          aria-selected={index === value}
          onClick={() => onChange?.(index)}>
          {item.label}
          {item.count != null && <span className="lc-count">{item.count}</span>}
        </button>
      ))}
    </div>
  );
}
