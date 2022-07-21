import { useCallback, useEffect, useMemo, useState } from "react";
import { useWebRTCContext } from "../hooks/useWebRTCContext";
import styles from "./ChatBox.module.css";
export const ChatBox = () => {
  const [text, setText] = useState("");
  const [messages, setMessages] = useState([]);
  const [dataChannelMap, setDataChannelMap] = useState({});
  const { socket, peerConnectionsMap, otherUsers, side, hasHandshakeCompletedMap, leftUser } = useWebRTCContext();

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
    const dataChannelMapKeys = Object.keys(dataChannelMap)
    if (!dataChannelMapKeys.length) return;
    if ((e.type === "keyup" && e.key === "Enter") || e.type === "click") {
      try {
        dataChannelMapKeys.forEach(otherUserId => {
          const dataChannel = dataChannelMap[otherUserId]
          dataChannel.send(text);
        })
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
    const peerConnectionsMapKeys = Object.keys(peerConnectionsMap)
    if (!side || !peerConnectionsMapKeys.length) {return};
    
    if (side === "Caller") {
      console.log("creating multiple data channels for other users");
      peerConnectionsMapKeys.forEach(otherUserId => {
        const dataChannel = peerConnectionsMap[otherUserId].createDataChannel("chatChannel")
        dataChannel.onmessage = handleReceiveMessages;
        setDataChannelMap(prev => ({
          ...prev,
          [otherUserId]: dataChannel
        }))
      })
    } else if (peerConnectionsMap[side]) {
      const pc = peerConnectionsMap[side]
      pc.ondatachannel = (event) => {
        event.channel.onmessage = handleReceiveMessages;
        setDataChannelMap(prev => ({
          ...prev,
          [side]: event.channel
        }))
        console.log(`received the data channel from ${side}`)
      }; 
    }
  }, [peerConnectionsMap, side, handleReceiveMessages]);

  useEffect(()=>{
    if (leftUser) {
      console.log(`In data channel: user ${leftUser} has left`)
      setDataChannelMap(prev => {
        prev[leftUser].close()
        const copy = {...prev}
        delete copy[leftUser]
        return copy
      })
    }
  }, [leftUser])

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
