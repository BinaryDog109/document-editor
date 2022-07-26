import { createContext, useMemo, useRef, useState } from "react";
import { useWebRTC } from "../hooks/useWebRTC";
import {io} from "socket.io-client"
import { animals } from "../data/animal-emoji";

const generateChatId = (id) => {
    const chatId =
      id &&
      `${animals[Math.floor(Math.random() * animals.length)]}-${id.slice(
        id.length - 5
      )}`;
    return chatId;
  };
export const WebRTCContext = createContext();
export const WebRTCContextProvider = ({children}) => {
    const clientSocket = useRef(io("http://localhost:8000")).current
    const chatId = useMemo(() => {
        return generateChatId(clientSocket.id);
      }, [clientSocket.id]);
    const { socket, peerConnectionsMap, otherUsers, side, hasHandshakeCompletedMap, leftUser } = useWebRTC(clientSocket)
    return (
        <WebRTCContext.Provider value={{ socket, chatId, peerConnectionsMap, otherUsers, side, hasHandshakeCompletedMap, leftUser }}>
            {children}
        </WebRTCContext.Provider>
    )
}