import { useEffect, useRef, useState } from "react";
import {
  callUser,
  closePeerConnection,
  createPeerConnection,
  handleArrivingCandidate,
  handleReceiveAnswer,
  handleReceiveOffer,
} from "../utility/webRTCUtilities";

export const useWebRTC = (socket) => {
  //   const socketRef = useRef();
  // const pcRef = useRef();
  const [pc, setPeerConnection] = useState(null);
  const [otherUser, setOtherUser] = useState("");
  const [hasExit, setHasExit] = useState(false);
  const [hasHandshakeCompleted, sethasHandshakeCompleted] = useState(false);
  const [side, setSide] = useState('')
  // const history = useHistory();

  useEffect(() => {
    // socket.emit("join room", roomId);
    if (!pc && !hasExit) {
      // current user B is joining A (other user in the room is A)
      // On sending the offer
      socket.on("other user", (otherUserSocketId) => {
        console.log(`Detected other user already in the room ${otherUserSocketId}`)
        const initiatorPeerConnection = callUser(otherUserSocketId, socket);
        setPeerConnection(initiatorPeerConnection);
        setOtherUser(otherUserSocketId);
        setSide("Caller")
        console.log(`PeerConnection created on caller side`)
      });
      // current user A detects B joining in
      socket.on("user joined", (otherUserSocketId) => {
        console.log(`Detected other user joining in ${otherUserSocketId}`)
        setOtherUser(otherUserSocketId);
        setSide("Callee")
      });
      // On receiving offer
      socket.on("offer", (receivedOfferPayload) => {
        const otherUserId = receivedOfferPayload.caller;
        const responsePeerConnection = createPeerConnection(
          otherUserId,
          socket,
          "notype"
        );
        handleReceiveOffer(
          responsePeerConnection,
          socket,
          receivedOfferPayload
        );
        setPeerConnection(responsePeerConnection);
        console.log(`PeerConnection created on callEE side`)
      });
    }
    if (pc && !hasHandshakeCompleted) {
      socket.on("answer", async (payload) => {
        await handleReceiveAnswer(pc, payload);
        sethasHandshakeCompleted(true)
        socket.emit('answer received', payload.caller)
      });
      socket.on("ice-candidate", (candidate) => {
        handleArrivingCandidate(pc, candidate);
      });
      socket.on('connected', () => {
        sethasHandshakeCompleted(true)
      })
    }

    return () => {      
      if (!hasHandshakeCompleted) return
      console.log("Unmounting and closing peer...");
      setHasExit(true);
      closePeerConnection(pc);
      setPeerConnection(null);
      socket.disconnect();
    }; 
  }, [socket, pc, hasExit, hasHandshakeCompleted]);

  return { socket, pc, otherUser, hasExit, side, hasHandshakeCompleted };
};
