import { useEffect, useState } from "react";
import { v4 as uuid } from "uuid";
import { useWebRTCContext } from "../hooks/useWebRTCContext";
import styles from "./RoomPanel.module.css";

const computeStatusStyleAndText = (pc, hasExit, hasHandshakeCompleted) => {
  let backgroundColor = "";
  let status = "";
  if (pc && !hasHandshakeCompleted) {
    status = "Connecting";
    backgroundColor = "var(--status-connecting-color)";
  }
  if (hasHandshakeCompleted) {
    status = "Connected";
    backgroundColor = "var(--status-connected-color)";
  }
  if (!pc) {
    status = "Disconnected";
    backgroundColor = "var(--status-disconnected-color)";
  }
  return [status, backgroundColor];
};

export const RoomPanel = () => {
  const [roomId, setRoomId] = useState("");
  const [joiningRoomId, setJoiningRoomId] = useState("");
  const { socket, pc, hasExit, hasHandshakeCompleted } = useWebRTCContext();

  const [status, backgroundColor] = computeStatusStyleAndText(
    pc,
    hasExit,
    hasHandshakeCompleted
  );

  return (
    <>
      <div className={styles["room-status"]}>
        <span
          style={{
            backgroundColor: backgroundColor,
          }}
        >
          {status}
        </span>
      </div>
      <div className={styles["create-room-panel"]}>
        <button
          onClick={() => {
            const id = uuid();
            socket.emit("join room", id);
            setRoomId(id);
          }}
          style={{ padding: ".5em" }}
        >
          Create a room
        </button>
        {roomId && (
          <span
            style={{
              fontSize: "1rem",
              padding: "0 .5em",
              marginLeft: ".5em",
              backgroundColor: "var(--body-bg-color)",
              color: "white",
            }}
          >
            {roomId}
          </span>
        )}
      </div>
      <div className={styles["connect-room-panel"]}>
        <button
          onClick={() => {
            const value = joiningRoomId;
            if (value) {
              socket.emit("join room", joiningRoomId);
            }
          }}
          style={{ padding: ".5em", backgroundColor: "orange" }}
        >
          Connect to: 
        </button>
        {
          <input
            style={{ marginLeft: ".5em" }}
            type="text"
            value={joiningRoomId}
            onChange={(e) => {
              setJoiningRoomId(e.target.value);
            }}
          />
        }
      </div>
    </>
  );
};
