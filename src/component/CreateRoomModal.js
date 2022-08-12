import { useState } from "react";
import { CopyToClipboard } from "react-copy-to-clipboard";
import { Modal } from "react-responsive-modal";
import { v4 as uuid } from "uuid";

export const CreateRoomModal = ({
  open,
  onClose,
  socket,
  setRoomId,
  roomId,
}) => {
  const [copied, setCopied] = useState(false);
  return (
    <Modal center open={open} onClose={onClose} showCloseIcon={false}>
      <div
        style={{ display: "flex", flexDirection: "column", gap: "1em" }}
        className="content"
      >
        {roomId ? (
          <>
            <h2>Room created!</h2>
            <p>Please share this ID with your firends/coleagues!</p>
            <CopyToClipboard text={roomId}
          onCopy={() => setCopied(true)}>
            <h3
              style={{
                fontSize: "1rem",
                padding: "0 .5em",
                marginLeft: ".5em",
                backgroundColor: "var(--body-bg-color)",
                color: "var(--primary-color)",
                textAlign: "center",
                cursor: "pointer",
              }}
            >
              {roomId}
            </h3></CopyToClipboard>
            {copied && <span>Copied! 😀</span>}
          </>
        ) : (
          <>
            <h2>Create a room?</h2>
            <p>
              When you hit the button below, an id for the room will be
              generated and displayed. Please share this id with your
              firends/coleagues!
            </p>
            <button
              className="text-button"
              onClick={() => {
                const id = uuid();
                socket.emit("join room", id);
                setRoomId(id);
              }}
            >
              <span style={{ fontWeight: 500 }}>Let there be a room!</span>
            </button>
          </>
        )}
      </div>
    </Modal>
  );
};
