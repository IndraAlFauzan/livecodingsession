import { useState } from "react";
import Icon from "./Icon.jsx";
import TextField from "./TextField.jsx";

// Kata sandi yang bisa diintip. Salah ketik sandi tidak terlihat sampai
// permintaan ditolak, dan di ponsel itu sering terjadi -- tombol ini memotong
// tebak-tebakan itu.
export default function PasswordField({ label, ...props }) {
  const [terlihat, setTerlihat] = useState(false);

  return (
    <TextField
      {...props}
      label={label}
      type={terlihat ? "text" : "password"}
      trailing={
        <button
          type="button"
          className="lc-peek"
          onClick={() => setTerlihat((n) => !n)}
          aria-label={terlihat ? `Sembunyikan ${label.toLowerCase()}` : `Lihat ${label.toLowerCase()}`}
          aria-pressed={terlihat}>
          <Icon name={terlihat ? "eye-off" : "eye"} />
        </button>
      }
    />
  );
}
