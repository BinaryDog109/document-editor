import { createContext, useMemo, useState } from "react";
import { useWebRTC } from "../hooks/useWebRTC";
import {io} from "socket.io-client"

const clientSocket = io("http://localhost:8000")
export const WebRTCContext = createContext();
export const WebRTCContextProvider = ({children}) => {
    // console.log('ctx provider runs')
    const { socket, pc, otherUser, hasExit, side, hasHandshakeCompleted } = useWebRTC(clientSocket)
    return (
        <WebRTCContext.Provider value={{ socket, pc, otherUser, hasExit, side, hasHandshakeCompleted }}>
            {children}
        </WebRTCContext.Provider>
    )
}