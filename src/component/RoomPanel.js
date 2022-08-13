import { useEffect, useState } from "react";
import { ReactEditor, useSlateStatic } from "slate-react";
import { useWebRTCContext } from "../hooks/useWebRTCContext";
import { ConnectRoomModal } from "./ConnectRoomModal";
import { CreateRoomModal } from "./CreateRoomModal";
import { CurrentConnectionModal } from "./CurrentConnectionModal";
import { PrivacyModeModal } from "./PrivacyModeModal";
import styles from "./RoomPanel.module.css";

const roomButtonStyles = {
  width: "3em",
  height: "3em",
  borderRadius: "50% 50%",
  fontSize: "1em",
};
export const RoomPanel = ({bufferModeActivated, setBufferModeActivated}) => {
  const [openCreateRoomModal, setOpenCreateRoomModal] = useState(false);
  const [openJoinRoomModal, setOpenJoinRoomModal] = useState(false);
  const [openPrivacyModeModal, setOpenPrivacyModeModal] = useState(false);
  const [openCurrentConnectionModal, setOpenCurrentConnectionModal] =
    useState(false);
  const [roomId, setRoomId] = useState("");
  const [joiningRoomId, setJoiningRoomId] = useState("");
  const { socket, otherUsers, hasHandshakeCompletedMap } = useWebRTCContext();
  const editor = useSlateStatic()

  return (
    <>
      <div style={{ marginRight: "2em" }}>
        <button
          onClick={() => setOpenPrivacyModeModal(true)}
          style={roomButtonStyles}
          title="Switch Privacy Modes"
        >
          {bufferModeActivated? <i className="fa-solid fa-eye-low-vision"></i> : <i className="fa-solid fa-eye"></i>}
        </button>
        <PrivacyModeModal
          open={openPrivacyModeModal}
          onClose={() => setOpenPrivacyModeModal(false)}
          bufferModeActivated={bufferModeActivated}
          setBufferModeActivated={setBufferModeActivated}
          editor={editor}
        />
      </div>
      <div className={styles["room-status"]}>
        <button
          onClick={() => setOpenCurrentConnectionModal(true)}
          style={roomButtonStyles}
          title="Current Online Users"
          data-current-users-number={
            Object.keys(hasHandshakeCompletedMap).length
          }
        >
          <i className="fa-solid fa-people-line"></i>
        </button>
        <CurrentConnectionModal
          open={openCurrentConnectionModal}
          onClose={() => setOpenCurrentConnectionModal(false)}
          otherUsers={otherUsers}
          hasHandshakeCompletedMap={hasHandshakeCompletedMap}
        />
      </div>
      <div className={styles["create-room-panel"]}>
        {otherUsers.length > 0 ? null : (
          <>
            {roomId ? null : (
              <button
                onClick={() => setOpenCreateRoomModal(true)}
                style={roomButtonStyles}
                title="Create a Room"
              >
                <i className="fa-solid fa-person-shelter"></i>
              </button>
            )}
            <CreateRoomModal
              open={openCreateRoomModal}
              onClose={() => setOpenCreateRoomModal(false)}
              socket={socket}
              setRoomId={setRoomId}
              roomId={roomId}
            />
          </>
        )}
      </div>
      <div className={styles["connect-room-panel"]}>
        {otherUsers.length > 0 ? null : (
          <>
            <button
              onClick={() => setOpenJoinRoomModal(true)}
              style={roomButtonStyles}
              title="Join a Room"
            >
              <i className="fa-solid fa-person-booth"></i>
            </button>
            <ConnectRoomModal
              joiningRoomId={joiningRoomId}
              setJoiningRoomId={setJoiningRoomId}
              socket={socket}
              open={openJoinRoomModal}
              onClose={() => setOpenJoinRoomModal(false)}
            />
          </>
        )}
      </div>
    </>
  );
};
