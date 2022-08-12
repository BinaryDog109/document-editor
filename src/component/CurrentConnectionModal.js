import { Modal } from "react-responsive-modal";

const computeStatusStyleAndText = (hasHandshakeCompleted) => {
  let backgroundColor = "";
  let status = "";
  if (!hasHandshakeCompleted) {
    status = "⚠️";
    backgroundColor = "var(--secondary-color)";
  }
  if (hasHandshakeCompleted) {
    status = "✅";
    backgroundColor = "var(--primary-color)";
  }
  return [status, backgroundColor];
};
export const CurrentConnectionModal = ({
  open,
  onClose,
  otherUsers,
  hasHandshakeCompletedMap,
}) => {
  return (
    <Modal center showCloseIcon={false} open={open} onClose={onClose}>
      <div
        style={{ display: "flex", flexDirection: "column", gap: "1em" }}
        className="content"
      >
        <h2>Here lists current connecting/connected users:</h2>
        <p>This popup displays connecting/connected unique IDs of every user</p>
        <div className="current-users">
          {otherUsers
            ? otherUsers.map((otherUserId) => {
                const [status, backgroundColor] = computeStatusStyleAndText(
                  hasHandshakeCompletedMap[otherUserId]
                );
                return (
                  <span
                    key={otherUserId}
                    style={{
                      backgroundColor: backgroundColor,
                      color: "white",
                      padding: ".5em",
                      borderRadius: "1em",
                    }}
                  >
                    {otherUserId}: {status}
                  </span>
                );
              })
            : "There are currently no other users"}
        </div>
      </div>
    </Modal>
  );
};
