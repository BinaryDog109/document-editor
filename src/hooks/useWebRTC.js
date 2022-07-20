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

  const [pc, setPeerConnection] = useState(null);
  const [otherUser, setOtherUser] = useState("");
  const [hasOtherUserLeft, setHasOtherUserLeft] = useState(false);
  const hasUnmountRef = useRef(false)
  const [hasHandshakeCompleted, sethasHandshakeCompleted] = useState(false);
  const [side, setSide] = useState("");

  // On pc change effect
  useEffect(() => {
    if (!pc) {
      // current user B is joining A (other user in the room is A)
      // On sending the offer
      console.log("Initialising a null pc!")
      setHasOtherUserLeft(false)
      socket.on("other user", (otherUserSocketId) => {
        console.log(
          `Detected other user already in the room ${otherUserSocketId}`
        );
        const initiatorPeerConnection = callUser(otherUserSocketId, socket);
        setPeerConnection(initiatorPeerConnection);
        setOtherUser(otherUserSocketId);
        setSide("Caller");
        console.log(`PeerConnection created on caller side`);
      });
      // current user A detects B joining in
      socket.on("user joined", (otherUserSocketId) => {
        console.log(`Detected other user joining in ${otherUserSocketId}`);
        setOtherUser(otherUserSocketId);
        setSide("Callee");
      });
      // On receiving offer
      socket.on("offer", async (receivedOfferPayload) => {
        const otherUserId = receivedOfferPayload.caller;
        const responsePeerConnection = createPeerConnection(
          otherUserId,
          socket,
          "notype"
        );
        await handleReceiveOffer(
          responsePeerConnection,
          socket,
          receivedOfferPayload
        );
        if (hasUnmountRef.current) return
        setPeerConnection(responsePeerConnection);
        console.log(`PeerConnection created on callEE side`);
      });
    } else {
      socket.on("answer", async (payload) => {
        await handleReceiveAnswer(pc, payload);
        if (hasUnmountRef.current) return
        sethasHandshakeCompleted(true);
        socket.emit("answer received", payload.caller);
      });
      socket.on("ice-candidate", (candidate) => {
        handleArrivingCandidate(pc, candidate);
      });
      socket.on("connected", () => {
        sethasHandshakeCompleted(true);
      });
      socket.on("user left", (leftUser) => {
        console.log(`${leftUser} has left, resetting connection...`);
        setOtherUser("");
        setHasOtherUserLeft(true);
      });
    }
    return () => {
      if (!pc) return;
      closePeerConnection(pc);
      // Remove all existing socket liseners. Otherwise when trying to establish the next connection, liseners with the already closed pc will be called.
      socket.removeAllListeners()
    };
  }, [pc, socket]);

  // on user left effect
  useEffect(() => {
    if (hasOtherUserLeft) {
      setPeerConnection(null);
    }
  }, [hasOtherUserLeft]);

    // On unmount effect
    useEffect(() => {
      return () => {
        hasUnmountRef.current = true
        socket.disconnect();
      };
    }, [socket]);

  return { socket, pc, otherUser, side, hasHandshakeCompleted };
};
