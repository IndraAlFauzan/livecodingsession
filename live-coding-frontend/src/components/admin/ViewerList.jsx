import Avatar from "../ui/Avatar.jsx";
import Badge from "../ui/Badge.jsx";
import Card from "../ui/Card.jsx";
import EmptyState from "../ui/EmptyState.jsx";

export default function ViewerList({ viewers, live }) {
  const people = viewers || [];

  return (
    <Card
      title="Menonton sekarang"
      icon="eye"
      actions={people.length > 0 ? <Badge tone="violet">{people.length} mahasiswa</Badge> : null}>
      {people.length === 0 ? (
        <EmptyState
          icon="users"
          title={live ? "Belum ada yang bergabung." : "Tidak ada sesi berjalan."}
          text={live ? "Mahasiswa muncul di sini begitu membuka pertemuan." : undefined}
        />
      ) : (
        <ul className="lc-list">
          {people.map((person) => (
            <li key={person.id || person.name} className="lc-list__item">
              <Avatar name={person.name} online />
              <span className="lc-list__body">
                <strong>
                  {person.name}
                  {person.nim && <span className="lc-list__nim">{person.nim}</span>}
                </strong>
                <small className="lc-mono">{person.file || "belum membuka file"}</small>
              </span>
              {person.following ? (
                <Badge tone="violet" size="sm">
                  Follow
                </Badge>
              ) : (
                <Badge tone="neutral" size="sm">
                  Bebas
                </Badge>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
