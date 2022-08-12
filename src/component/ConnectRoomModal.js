import { Modal } from "react-responsive-modal";

export const ConnectRoomModal = ({
  open,
  onClose,
  joiningRoomId,
  setJoiningRoomId,
  socket,
}) => {
  return (
    <Modal center showCloseIcon={false} open={open} onClose={onClose}>
      <div
        style={{ display: "flex", flexDirection: "column", gap: "1em" }}
        className="content"
      >
        <h2>Connect to a room</h2>
        <p>Please paste a room ID to the box, then click the connect button:</p>
        <input
          style={{ fontFamily: 'inherit', fontSize: '1em', padding: '.5em' }}
          type="text"
          value={joiningRoomId}
          onChange={(e) => {
            setJoiningRoomId(e.target.value);
          }}
        />
        <button
        className="text-button"
          onClick={() => {
            const value = joiningRoomId;
            if (value) {
              socket.emit("join room", joiningRoomId);
              onClose()
            }
          }}
        >
          Connect
        </button>
      </div>
    </Modal>
  );
};
