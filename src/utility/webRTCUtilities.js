export function handleArrivingCandidate(pc, candidate) {
  console.log("handleArrivingCandidate runs")
  const rtcCandidate = new RTCIceCandidate(candidate);
  pc.addIceCandidate(rtcCandidate).catch((e) =>
    console.log("Error in handleArrivingCandidate: ", e)
  );
}

export async function handleReceiveAnswer(pc, payload) {
  console.log(`handleReceiveAnswer runs, received answer from ${payload.caller}`)
  try {
    const remoteDesc = payload.description;
    await pc.setRemoteDescription(remoteDesc);
  } catch (error) {
    console.log("error in handleReceiveAnswer: ", error);
  }
}

export const handleReceiveOffer = async (pc, socket, receivedOfferPayload) => {
  console.log(`handleReceiveOffer runs, sending answer from ${socket.id} to ${receivedOfferPayload.caller}`)
  try {
    // pcRef.current = createPeer();
    // pcRef.current.ondatachannel = (event) => {
    //   dataChannelRef.current = event.channel;
    //   // !dataChannelRef.current.onmessage...
    // };
    const remoteDesc = receivedOfferPayload.description;
    await pc.setRemoteDescription(remoteDesc);
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    const answerPayload = {
      target: receivedOfferPayload.caller,
      caller: socket.id,
      description: pc.localDescription,
    };
    socket.emit("answer", answerPayload);
  } catch (error) {
    console.log("error in handleReceiveCall: ", error);
  }
};

export const handleCandidateGenerate = (event, socket, otherUserId) => {
  console.log("handleCandidateGenerate runs")
  if (event.candidate) {
    const payload = {
      caller: socket.id,
      target: otherUserId,
      candidate: event.candidate,
    };
    socket.emit("ice-candidate", payload);
  }
};

export const handleNegotiationNeeded = async (pc, socket, otherUserId) => {
  console.log("handleNegotiationNeeded runs")
  try {
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    const payload = {
      target: otherUserId,
      caller: socket.id,
      description: pc.localDescription,
    };
    socket.emit("offer", payload);
  } catch (error) {
    console.err(error);
  }
};

export const createPeerConnection = (otherUserId, socket, type) => {
  console.log("createPeerConnection runs")
  const pc = new RTCPeerConnection({
    iceServers: [
      {
        urls: [
          "stun:stun1.l.google.com:19302",
          "stun:stun2.l.google.com:19302",
        ],
      },
    ],
    iceCandidatePoolSize: 10,
  });
  pc.onicecandidate = (event) => {
    handleCandidateGenerate(event, socket, otherUserId);
  };
  // Fires when pc adds a track, or create a data channel
  if (type === "createOffer")
    pc.onnegotiationneeded = () =>
      handleNegotiationNeeded(pc, socket, otherUserId);

  return pc;
};
export const callUser = (otherUserId, socket) => {
  console.log("callUser runs")
    const pc = createPeerConnection(otherUserId, socket, "createOffer");
    //   dataChannelRef.current =
    //     pcRef.current.createDataChannel("chatDataChannel");
    // !channelRef.current.onmessage = ...
    return pc
  }

  export const closePeerConnection = (pc) => {
    console.log("closePeerConnection runs")
    if (pc) {
      // Remove all its event liseners
      pc.ontrack = null;
      pc.onremovetrack = null;
      pc.onremovestream = null;
      pc.onicecandidate = null;
      pc.oniceconnectionstatechange = null;
      pc.onconnectionstatechange = null;
      pc.onsignalingstatechange = null;
      pc.onicegatheringstatechange = null;
      pc.onnegotiationneeded = null;
      console.log("Removed all its event liseners");
      pc.close();
      console.log("Peer closed");
    }
  }