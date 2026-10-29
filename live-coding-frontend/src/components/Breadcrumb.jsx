import { Link } from "react-router-dom";

export default function Breadcrumb({ items, tone = "light" }) {
  return (
    <nav aria-label="Lokasi halaman" className={`breadcrumb breadcrumb-${tone}`}>
      <ol>
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={item.label}>
              {isLast || !item.to ? <span aria-current={isLast ? "page" : undefined}>{item.label}</span> : <Link to={item.to}>{item.label}</Link>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
