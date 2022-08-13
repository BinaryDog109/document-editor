import { Modal } from "react-responsive-modal";
import { ReactEditor } from "slate-react";
export const PrivacyModeModal = ({
  open,
  onClose,
  bufferModeActivated,
  setBufferModeActivated,
  editor,
}) => {
  const modeName = bufferModeActivated ? "Private🕶️" : "Public👓";
  const meaning = bufferModeActivated
    ? "all characters will be buffered and will not be sent to the other parties. You will need to press ctrl + enter to send your typed characters"
    : "all characters will be sent immeadiately to other parties as you type";
  return (
    <Modal center open={open} onClose={onClose} showCloseIcon={false}>
      <div
        style={{ display: "flex", flexDirection: "column", gap: "1em" }}
        className="content"
      >
        <h2>Switching Privacy Mode</h2>
        <p>You are currently in {modeName} mode, meaning that {meaning}.</p>
        <button onClick={() => {
              setBufferModeActivated((prev) => !prev);
              onClose()
            }} className="text-button">Switch to {bufferModeActivated? 'Public👓' : 'Private🕶️'} mode</button>
      </div>
    </Modal>
  );
};
