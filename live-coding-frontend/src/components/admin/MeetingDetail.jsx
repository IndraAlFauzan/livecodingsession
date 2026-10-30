import Avatar from "../ui/Avatar.jsx";
import Badge from "../ui/Badge.jsx";
import EmptyState from "../ui/EmptyState.jsx";
import Modal from "../ui/Modal.jsx";
import { formatDateTime } from "../../lib/api.js";

export default function MeetingDetail({ meeting, status, data, onClose }) {
  const watching = data?.watchingNow || [];
  const attended = data?.viewers || [];
  const watchingNames = new Set(watching.map((person) => person.name));
  const duplicates = watching.length - watchingNames.size;

  return (
    <Modal
      title={meeting.title || `Pertemuan ${meeting.number}`}
      head={<Badge status={status} />}
      className="lc-dialog--wide"
      onClose={onClose}>
      <p className="lc-dialog__text">
        {[
          `Pertemuan ${meeting.number}`,
          meeting.continuesFrom && `lanjutan dari pertemuan ${meeting.continuesFrom.number}`,
          meeting.startedAt && formatDateTime(meeting.startedAt),
        ]
          .filter(Boolean)
          .join(" · ")}
      </p>

      <section className="lc-detail__section">
        <h3 className="lc-detail__title">
          Mahasiswa yang pernah masuk
          {attended.length > 0 && <span className="lc-count">{attended.length}</span>}
        </h3>

        {attended.length === 0 ? (
          <EmptyState icon="users" title="Belum ada mahasiswa yang membuka pertemuan ini." />
        ) : (
          <ul className="lc-list">
            {attended.map((person) => (
              <li key={person.name} className="lc-list__item">
                <Avatar name={person.name} online={watchingNames.has(person.name)} />
                <span className="lc-list__body">
                  <strong>{person.name}</strong>
                  <small>
                    Masuk {formatDateTime(person.firstSeen)}
                    {person.visits > 1 && ` · ${person.visits} kali`}
                  </small>
                </span>
                {watchingNames.has(person.name) ? (
                  <Badge status="active" size="sm" />
                ) : (
                  <span className="lc-list__time">{formatDateTime(person.lastSeen)}</span>
                )}
              </li>
            ))}
          </ul>
        )}

        <p className="lc-detail__note">
          Nama diketik sendiri oleh mahasiswa tanpa akun, jadi daftar ini laporan kehadiran — bukan bukti identitas.
          {duplicates > 0 && ` Saat ini ${duplicates} tab tambahan terbuka dengan nama yang sudah ada.`}
        </p>
      </section>
    </Modal>
  );
}
