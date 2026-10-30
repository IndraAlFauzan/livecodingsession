import { useId, useRef } from "react";
import Button from "./Button.jsx";
import Icon from "./Icon.jsx";
import Modal from "./Modal.jsx";

export default function Dialog({ title, text, confirmLabel = "Ya, hapus", icon = "trash", onConfirm, onCancel }) {
  const cancelRef = useRef(null);
  const baseId = useId();
  const titleId = `${baseId}-title`;
  const textId = `${baseId}-text`;

  return (
    <Modal
      role="alertdialog"
      labelledBy={titleId}
      describedBy={textId}
      onClose={onCancel}
      initialFocus={cancelRef}>
      <span className="lc-dialog__icon">
        <Icon name={icon} />
      </span>
      <h2 className="lc-dialog__title" id={titleId}>
        {title}
      </h2>
      <p className="lc-dialog__text" id={textId}>
        {text}
      </p>
      <div className="lc-dialog__actions">
        <Button variant="secondary" onClick={onCancel} ref={cancelRef}>
          Batal
        </Button>
        <Button variant="danger" onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
