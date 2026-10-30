import Badge from "../ui/Badge.jsx";
import Button from "../ui/Button.jsx";
import Card from "../ui/Card.jsx";
import IconButton from "../ui/IconButton.jsx";
import Switch from "../ui/Switch.jsx";

export default function AccessCodeCard({ code, active, copied, onCopy, onToggle, onRegenerate }) {
  return (
    <Card title="Kode akses" icon="key" actions={<Badge status={active ? "active" : "inactive"} />}>
      <div className={["lc-code", !active && "lc-code--off"].filter(Boolean).join(" ")}>
        <code>{code}</code>
        <IconButton
          icon={copied ? "check" : "copy"}
          label={copied ? "Kode tersalin" : "Salin kode"}
          variant="dark"
          onClick={onCopy}
        />
      </div>
      <div className="lc-card__foot">
        <Switch label={active ? "Mahasiswa bisa masuk" : "Masuk ditutup"} checked={active} onChange={onToggle} />
        <Button variant="ghost" size="sm" icon="refresh" onClick={onRegenerate}>
          Buat kode baru
        </Button>
      </div>
    </Card>
  );
}
