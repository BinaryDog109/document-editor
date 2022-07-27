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
  const [peerConnectionsMap, setPeerConnectionsMap] = useState({});
  const peerConnectionsMapRef = useRef(peerConnectionsMap);
  const [otherUsers, setOtherUsers] = useState([]);
  const [leftUser, setLeftUser] = useState("");
  const hasUnmountRef = useRef(false);
  const [hasHandshakeCompletedMap, sethasHandshakeCompletedMap] = useState({});
  // Side is "Caller" on the caller side, side is otherUserId on callee side
  const [side, setSide] = useState("");

  const hasRunRef = useRef(false);

  // On pcMap change effect, using mesh architecture
  useEffect(() => {
    // Update the ref every time pcmap state changes - Making socket event handlers able to access the latest state!
    peerConnectionsMapRef.current = peerConnectionsMap;
    const hasConnections = Object.keys(peerConnectionsMap).length > 0
    // Run once because otherwise this will run again if pcMap reduced to 0 connection.
    if (!hasConnections && !hasRunRef.current) {
      // current user B is joining A (other user in the room is A)
      console.log("Initialising an empty peerConnectionsMap!");
      const map = {};
      socket.on("other users", (otherUserSocketIds) => {
        // console.log(
        //   `Detected other users already in the room: ${otherUserSocketIds}, \n setting peer connections...`
        // );
        setSide("Caller")
        otherUserSocketIds.forEach((otherUserSocketId) => {
          map[otherUserSocketId] = callUser(otherUserSocketId, socket);
          socket.on(`ice-candidate-${otherUserSocketId}`, (payload) => {
            // console.log("pcmapref on ice cand arriving ", peerConnectionsMapRef.current)
            const otherUserId = payload.caller;
            handleArrivingCandidate(
              peerConnectionsMapRef.current[otherUserId],
              payload.candidate,
              otherUserId
            ); 
          });
        });
        setPeerConnectionsMap(map);
        setOtherUsers(otherUserSocketIds);
        console.log(`PeerConnectionsMap created on the caller side`);
      });
      // current user A detects B joining in
      socket.on("user joined", (otherUserSocketId) => {
        // Reset callee side
        setSide('')
        // console.log(`Detected other user joining in: ${otherUserSocketId}`);
        setOtherUsers((otherUserSocketIds) => [
          ...otherUserSocketIds,
          otherUserSocketId,
        ]);
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
        if (hasUnmountRef.current) return;
        
        setPeerConnectionsMap((existingPeerConnections) => ({
          ...existingPeerConnections,
          [otherUserId]: responsePeerConnection,
        }));
        setSide(otherUserId);
        console.log(`PeerConnection added on callEE side: ${otherUserId}`);
      });
    }
    // Events after pcMap has been established, ! make sure oncandidateArriving is called after new peer has been stored!
    if (hasConnections && !hasRunRef.current) {
      hasRunRef.current = true;
      socket.on("answer", async (payload) => {
        // console.log("on answer pcmapref: ", peerConnectionsMapRef.current);
        const otherUserId = payload.caller;
        const pc = peerConnectionsMapRef.current[otherUserId];
        await handleReceiveAnswer(pc, payload);
        if (hasUnmountRef.current) return;
        sethasHandshakeCompletedMap((prev) => ({
          ...prev,
          [otherUserId]: true,
        }));
        socket.emit("answer received", otherUserId);
        // console.log(`Sent answer received event to ${otherUserId}`)
      });
      
      socket.on("connected", (otherUserId) => {
        // console.log(`Received connected event from ${otherUserId}`)
        sethasHandshakeCompletedMap((prev) => ({
          ...prev,
          [otherUserId]: true,
        }));
      }); 
      socket.on("user left", (leftUser) => {
        console.log(`${leftUser} has left, resetting connection...`);

        setOtherUsers((prev) => {
          const index = prev.findIndex(
            (otherUserId) => otherUserId === leftUser
          );
          if (index !== -1) {
            return [...prev.slice(0, index), ...prev.slice(index + 1)];
          } else return prev;
        });
        sethasHandshakeCompletedMap((prev) => {
          const copy = { ...prev };
          delete copy[leftUser];
          return copy;
        });
        setLeftUser(leftUser);
      });
    }
  }, [peerConnectionsMap, socket]);

  useEffect(()=>{
    if (!side || side==="Caller") return
    // To ensure new connection is added before handle arriving candidates
    // On receving ice candidate
    socket.on(`ice-candidate-${side}`, (payload) => {
      // console.log("pcmapref on ice cand arriving ", peerConnectionsMapRef.current)
      const otherUserId = payload.caller;
      handleArrivingCandidate(
        peerConnectionsMapRef.current[otherUserId],
        payload.candidate,
        otherUserId
      ); 
    });
  }, [side, socket])

  // on user left effect
  useEffect(() => {
    if (leftUser !== "") {
      setPeerConnectionsMap((prev) => {
        const copy = { ...prev };
        closePeerConnection(prev[leftUser]);
        delete copy[leftUser];
        // if (Object.keys(copy).length === 0)
        //   socket.removeAllListeners()
        return copy;
      });
      setLeftUser("");
    }
  }, [leftUser, socket]);

  // On unmount effect
  useEffect(() => {
    return () => {
      hasUnmountRef.current = true;
      // Close all the peer connections
      setPeerConnectionsMap((prev) => {
        Object.keys(prev).forEach((otherUserId) => {
          closePeerConnection(prev[otherUserId]);
        });
        return {};
      });
      socket.disconnect();
    };
  }, [socket]);

  return {
    socket,
    peerConnectionsMap,
    otherUsers,
    side,
    hasHandshakeCompletedMap,
    leftUser,
  };
};
