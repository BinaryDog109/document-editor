import { createContext, useMemo, useRef, useState } from "react";
import { useWebRTC } from "../hooks/useWebRTC";
import {io} from "socket.io-client"


export const WebRTCContext = createContext();
export const WebRTCContextProvider = ({children}) => {
    const clientSocket = useRef(io("http://localhost:8000")).current
    const { socket, peerConnectionsMap, otherUsers, side, hasHandshakeCompletedMap, leftUser } = useWebRTC(clientSocket)
    return (
        <WebRTCContext.Provider value={{ socket, peerConnectionsMap, otherUsers, side, hasHandshakeCompletedMap, leftUser }}>
            {children}
        </WebRTCContext.Provider>
    )
}