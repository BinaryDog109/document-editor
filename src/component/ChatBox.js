import { useCallback, useEffect, useMemo, useState } from "react";
import { useWebRTCContext } from "../hooks/useWebRTCContext";
import styles from "./ChatBox.module.css";
export const ChatBox = () => {
  const [text, setText] = useState("");
  const [messages, setMessages] = useState([]);
  const [dataChannel, setDataChannel] = useState(null);
  const { pc, hasExit, hasHandshakeCompleted, side } = useWebRTCContext();
  const handleReceiveMessages = useCallback((event) => {
    console.log("received new message")
    const newMessage = event.data;
    setMessages((prev) => [
      ...prev,
      {
        isFromMe: false,
        data: newMessage,
      },
    ]);
  }, []);
  const handleSend = (e) => {
    if (!dataChannel) return;
    if ((e.type === "keyup" && e.key === "Enter") || e.type === "click") {
      try {
        dataChannel.send(text);
        setMessages((prev) => [...prev, { isFromMe: true, data: text }]);
        console.log("message sent")
        setText("");
      } catch (error) {
        console.log("Error in handleSend: ", error);
      }
    }
  };
  const handleChange = (e) => {
    const value = e.target.value;
    setText(value);
  };

  useEffect(() => {
    if (!pc || !side) return;
    if (side === "Caller") {
      console.log("creating a data channel");
      setDataChannel(pc.createDataChannel("chatChannel"));
    } else if (side === "Callee") {
      pc.ondatachannel = (event) => {
        setDataChannel(event.channel);
        console.log("received the data channel")
      }; 
    }
  }, [pc, side]);

  useEffect(() => {
    if (dataChannel) dataChannel.onmessage = handleReceiveMessages;
  }, [handleReceiveMessages, dataChannel]);

  return (
    <div className={styles["chat-container"]}>
      <div
        onClick={(e) => {
          e.target.parentElement.classList.toggle(styles["expand"]);
        }}
        className={styles["title"]}
      >
        Chat
      </div>
      <div className={styles["chat-content"]}>
        {
          messages.map((message, index) => (
            <p key={index} className={message.isFromMe? styles["me"] : styles["remote"]}>{message.data}</p>
          ))
        }
      </div>
      <div style={{ position: "absolute", bottom: 0 }}>
        <input
          value={text}
          onKeyUp={handleSend}
          onChange={handleChange}
          style={{ padding: ".5em", fontSize: "1rem" }}
          type="text"
        />
        <button
          onClick={handleSend}
          style={{ marginLeft: ".5em", padding: ".5em" }}
        >
          Send
        </button>
      </div>
    </div>
  );
};
