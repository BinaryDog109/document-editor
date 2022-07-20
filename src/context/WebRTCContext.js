import { createContext, useMemo, useRef, useState } from "react";
import { useWebRTC } from "../hooks/useWebRTC";
import {io} from "socket.io-client"


export const WebRTCContext = createContext();
export const WebRTCContextProvider = ({children}) => {
    const clientSocket = useRef(io("http://localhost:8000")).current
    const { socket, pc, otherUser, hasExit, side, hasHandshakeCompleted } = useWebRTC(clientSocket)
    return (
        <WebRTCContext.Provider value={{ socket, pc, otherUser, hasExit, side, hasHandshakeCompleted }}>
            {children}
        </WebRTCContext.Provider>
    )
}