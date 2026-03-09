import type { ClosePrompt } from "../../types";

interface CloseTreeModalProps {
  closePrompt: ClosePrompt;
  onCancel: () => void;
  onConfirm: () => void;
}

function CloseTreeModal({
  closePrompt,
  onCancel,
  onConfirm,
}: CloseTreeModalProps) {
  return (
    <div className="modal-backdrop">
      <div className="modal">
        <p className="workspace-header__eyebrow">Close branch tree</p>
        <h2>Closing this window will also close its connected windows.</h2>
        <ul>
          {closePrompt.descendantTitles.map((title) => (
            <li key={title}>{title}</li>
          ))}
        </ul>
        <div className="modal__actions">
          <button className="icon-button" type="button" onClick={onCancel}>
            Cancel
          </button>
          <button className="send-button" type="button" onClick={onConfirm}>
            Close all
          </button>
        </div>
      </div>
    </div>
  );
}

export default CloseTreeModal;
