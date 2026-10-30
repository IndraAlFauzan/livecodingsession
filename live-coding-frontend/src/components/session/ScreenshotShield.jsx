import Button from "../ui/Button.jsx";
import Icon from "../ui/Icon.jsx";

export default function ScreenshotShield({ onReveal }) {
  return (
    <div className="lc-shield" role="alert">
      <span className="lc-shield__icon">
        <Icon name="shield" size={24} />
      </span>
      <p className="lc-shield__title">Kode disembunyikan</p>
      <p className="lc-shield__text">
        Terdeteksi shortcut screenshot. Kode ditampilkan lagi setelah kamu menekan tombol di bawah.
      </p>
      <Button variant="violet" icon="eye" onClick={onReveal}>
        Tampilkan lagi
      </Button>
    </div>
  );
}
