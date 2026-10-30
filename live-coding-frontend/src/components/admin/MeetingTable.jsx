import { useState } from "react";
import { formatDateTime } from "../../lib/api.js";
import { derivedStatus } from "../../utils/meetingStatus.js";
import Badge from "../ui/Badge.jsx";
import Button from "../ui/Button.jsx";
import IconButton from "../ui/IconButton.jsx";
import Switch from "../ui/Switch.jsx";

function TitleCell({ meeting, onRename }) {
  const [editing, setEditing] = useState(null);
  const meta = [
    meeting.continuesFrom && `Lanjutan dari pertemuan ${meeting.continuesFrom.number}`,
    meeting.startedAt && formatDateTime(meeting.startedAt),
  ].filter(Boolean);

  if (editing !== null) {
    return (
      <form
        className="lc-inline-form"
        onSubmit={(event) => {
          event.preventDefault();
          onRename(editing.trim());
          setEditing(null);
        }}>
        <label className="lc-sr" htmlFor={`title-${meeting.id}`}>
          Judul pertemuan {meeting.number}
        </label>
        <div className="lc-input lc-table__input">
          <input
            id={`title-${meeting.id}`}
            value={editing}
            onChange={(event) => setEditing(event.target.value)}
            maxLength={200}
            autoFocus
          />
        </div>
        <Button size="sm" type="submit">
          Simpan
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setEditing(null)}>
          Batal
        </Button>
      </form>
    );
  }

  return (
    <>
      <button type="button" className="lc-table__title lc-table__rename" onClick={() => setEditing(meeting.title || "")}>
        {meeting.title || "Tanpa judul"}
        <span className="lc-sr">, ubah judul</span>
      </button>
      {meta.length > 0 && <div className="lc-table__meta">{meta.join(" · ")}</div>}
    </>
  );
}

export default function MeetingTable({ meetings, onRename, onToggleVisible, onOpen, onAskDelete, onDetail }) {
  return (
    <div className="lc-table__wrap">
      <table className="lc-table">
        <thead>
          <tr>
            <th scope="col">No</th>
            <th scope="col">Pertemuan</th>
            <th scope="col">Status</th>
            <th scope="col">Terlihat</th>
            <th scope="col">
              <span className="lc-sr">Aksi</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {meetings.map((meeting) => {
            const status = derivedStatus(meeting);
            const openDisabledReason =
              meeting.status === "draft"
                ? "Belum pernah dimulai"
                : !meeting.visible
                  ? "Tampilkan dulu untuk membuka"
                  : undefined;
            return (
              <tr key={meeting.id} className={meeting.visible ? undefined : "is-hidden"}>
                <td style={{ width: 56 }}>
                  <span className="lc-table__no">{String(meeting.number).padStart(2, "0")}</span>
                </td>
                <td className="lc-table__main">
                  <TitleCell meeting={meeting} onRename={(title) => onRename(meeting, title)} />
                </td>
                <td>
                  <Badge status={status} />
                </td>
                <td>
                  <Switch
                    label={`Terlihat oleh mahasiswa, pertemuan ${meeting.number}`}
                    hideLabel
                    checked={meeting.visible}
                    onChange={() => onToggleVisible(meeting)}
                  />
                </td>
                <td>
                  <div className="lc-row">
                    <IconButton
                      icon="users"
                      label={`Lihat siapa yang masuk pertemuan ${meeting.number}`}
                      variant="plain"
                      size="sm"
                      onClick={() => onDetail(meeting)}
                    />
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={Boolean(openDisabledReason)}
                      title={openDisabledReason}
                      onClick={() => onOpen(meeting)}>
                      Buka
                    </Button>
                    <IconButton
                      icon="trash"
                      label={
                        meeting.teacherConnected ? "Hentikan sesi dari VS Code dulu" : `Hapus pertemuan ${meeting.number}`
                      }
                      variant="plain"
                      size="sm"
                      disabled={meeting.teacherConnected}
                      onClick={() => onAskDelete(meeting)}
                    />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
