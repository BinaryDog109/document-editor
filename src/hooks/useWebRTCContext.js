import { useContext } from "react"
import { WebRTCContext } from "../context/WebRTCContext"

export const useWebRTCContext = () => {
    const context = useContext(WebRTCContext)
    if (!context) throw Error("useWebRTCContext must be used inside WebRTCContext")
    return context
}