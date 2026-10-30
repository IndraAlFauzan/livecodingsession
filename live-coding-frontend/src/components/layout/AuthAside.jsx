import Badge from "../ui/Badge.jsx";
import Icon from "../ui/Icon.jsx";

// Tab banyak bahasa: satu editor, berkas dari ekosistem yang berbeda-beda.
const TABS = ["main.dart", "App.tsx", "server.go", "models.py"];

const LINES = [
  [["k", "class"], " ", ["t", "CartProvider"], " ", ["k", "extends"], " ", ["t", "ChangeNotifier"], " {"],
  ["  ", ["k", "void"], " ", ["f", "add"], "(", ["t", "Product"], " product) {"],
  ["    _items.", ["f", "add"], "(product);"],
  ["    ", ["f", "notifyListeners"], "();  ", ["c", "// beri tahu semua widget"]],
  ["  }"],
  ["}"],
];

const HIGHLIGHT = [2, 4];

// Warna memakai palet sintaks panel kode, bukan warna baru.
const STACK = [
  ["Dart", "keyword"], ["Flutter", "keyword"],
  ["TypeScript", "function"], ["React", "function"], ["Node.js", "function"],
  ["Python", "string"], ["Django", "string"],
  ["Java", "number"], ["Spring", "number"], ["Kotlin", "number"],
  ["PHP", "type"], ["Laravel", "type"],
  ["Go", "keyword"], ["C++", "string"], ["Rust", "function"], ["Swift", "type"],
];

export default function AuthAside({ title, text }) {
  return (
    <aside className="lc-auth__aside">
      <div className="lc-auth__aside-inner">
        <div className="lc-auth__pitch">
          <Badge status="live" />
          <h2 className="lc-auth__title">{title}</h2>
          <p className="lc-auth__text">{text}</p>
        </div>

        <section className="lc-codepanel lc-auth__preview" aria-hidden="true">
          <div className="lc-codepanel__tabs">
            {TABS.map((tab, index) => (
              <span key={tab} className={["lc-codepanel__tab", index === 0 && "is-active"].filter(Boolean).join(" ")}>
                <Icon name="file" />
                {tab}
              </span>
            ))}
          </div>
          <div className="lc-codepanel__bar">
            <span className="lc-codepanel__path">lib/providers/cart_provider.dart</span>
            <span className="lc-codepanel__hl">
              <i />
              Disorot dosen
            </span>
          </div>
          <pre>
            {LINES.map((line, index) => {
              const number = index + 1;
              const lit = number >= HIGHLIGHT[0] && number <= HIGHLIGHT[1];
              return (
                <div key={number} className={["lc-ln", lit && "is-hl"].filter(Boolean).join(" ")}>
                  <span className="lc-ln__n">{number}</span>
                  <span className="lc-ln__c">
                    {line.map((token, i) =>
                      typeof token === "string" ? (
                        token
                      ) : (
                        <span key={i} className={`tk-${token[0]}`}>
                          {token[1]}
                        </span>
                      ),
                    )}
                  </span>
                </div>
              );
            })}
          </pre>
        </section>

        <ul className="lc-langs" aria-label="Bahasa dan framework yang bisa ditampilkan">
          {STACK.map(([name, tone]) => (
            <li key={name} className="lc-langs__chip">
              <i style={{ background: `var(--syn-${tone})` }} />
              {name}
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
