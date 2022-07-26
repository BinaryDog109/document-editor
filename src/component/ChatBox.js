import { useCallback, useEffect, useMemo, useState } from "react";
import { animals } from "../data/animal-emoji";
import { useWebRTCContext } from "../hooks/useWebRTCContext";
import styles from "./ChatBox.module.css";


export const ChatBox = () => {
  const [text, setText] = useState("");
  const [messages, setMessages] = useState([]);
  const [dataChannelMap, setDataChannelMap] = useState({});
  const {
    socket,
    chatId,
    peerConnectionsMap,
    otherUsers,
    side,
    hasHandshakeCompletedMap,
    leftUser,
  } = useWebRTCContext();



  const handleReceiveMessages = useCallback((event) => {
    console.log("received new message");
    const newMessage = JSON.parse(event.data);
    setMessages((prev) => [
      ...prev,
      {
        isFromMe: false,
        data: newMessage.text,
        from: newMessage.chatId
      },
    ]);
  }, []);
  const handleSend = (e) => {
    const dataChannelMapKeys = Object.keys(dataChannelMap);
    if (!dataChannelMapKeys.length) return;
    if ((e.type === "keyup" && e.key === "Enter") || e.type === "click") {
      try {
        dataChannelMapKeys.forEach((otherUserId) => {
          const dataChannel = dataChannelMap[otherUserId];
          const json = JSON.stringify({
            text,
            chatId 
          })
          dataChannel.send(json);
        });
        setMessages((prev) => [...prev, { isFromMe: true, data: text, from: chatId }]);
        console.log("message sent");
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
    const peerConnectionsMapKeys = Object.keys(peerConnectionsMap);
    if (!side || !peerConnectionsMapKeys.length) {
      return;
    }

    if (side === "Caller") {
      console.log("creating multiple data channels for other users");
      peerConnectionsMapKeys.forEach((otherUserId) => {
        const dataChannel =
          peerConnectionsMap[otherUserId].createDataChannel("chatChannel");
        dataChannel.onmessage = handleReceiveMessages;
        setDataChannelMap((prev) => ({
          ...prev,
          [otherUserId]: dataChannel,
        }));
      });
    } else if (peerConnectionsMap[side]) {
      const pc = peerConnectionsMap[side];
      pc.ondatachannel = (event) => {
        event.channel.onmessage = handleReceiveMessages;
        setDataChannelMap((prev) => ({
          ...prev,
          [side]: event.channel,
        }));
        console.log(`received the data channel from ${side}`);
      };
    }
  }, [peerConnectionsMap, side, handleReceiveMessages]);

  useEffect(() => {
    if (leftUser) {
      console.log(`In data channel: user ${leftUser} has left`);
      setDataChannelMap((prev) => {
        prev[leftUser].close();
        const copy = { ...prev };
        delete copy[leftUser];
        return copy;
      });
    }
  }, [leftUser]);

  return (
    <div className={styles["chat-container"]}>
      <div
        onClick={(e) => {
          e.target.parentElement.classList.toggle(styles["expand"]);
        }}
        className={styles["title"]}
      >
        Chat - User {chatId || "Unknown"}
      </div>
      <div className={styles["chat-content"]}>
        {messages.map((message, index) => (
          <p
            key={index}
            className={message.isFromMe ? styles["me"] : styles["remote"]}
            data-chat-id={message.from}
          >
            {message.data}
          </p>
        ))}
      </div>
      <div style={{ position: "absolute", bottom: 0 }}>
        <input
          value={text}
          onKeyUp={handleSend}
          onChange={handleChange}
          style={{ padding: ".5em", fontSize: "1rem" }}
          placeholder={chatId}
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
