// Import the Slate editor factory.
import styles from "./TextEditor.module.css";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createEditor } from "slate";

import vc from "vectorclock";

// Import the Slate components and React plugin.
import { Slate, Editable, withReact } from "slate-react";

import { useRenderElement } from "../hooks/useRenderElement";
import { useSelection } from "../hooks/useSelection";
import { Toolbar } from "./Toolbar";
import { LinkUpdateCard } from "./LinkUpdateCard";
import {
  detectLinkText,
  isOnLinkNode,
  toggleStyle,
} from "../utility/EditorStyleUtils";
import { ChatBox } from "./ChatBox";
import { CRDTify } from "../crdt/JSONCRDT";
import { useWebRTCContext } from "../hooks/useWebRTCContext";
import { executeCausallyRemoteOperation } from "../crdt/causal-order-helpers";
import { RemoteCursor } from "./RemoteCursor";
import isHotkey from "is-hotkey";

export const TextEditor = ({ document, onChange, editorRef }) => {
  // const editor = useMemo(() => withReact(createEditor()), []);
  const [editor] = useState(() => withReact(createEditor()));
  const { renderElement, renderLeaf } = useRenderElement(editor);
  const [prevSelection, selection, setSelection] = useSelection(editor);
  const [dataChannelMap, setDataChannelMap] = useState({});
  const [remoteCursorMap, setRemoteCursorMap] = useState({});
  const [CRDTSyncStatus, setCRDTSyncStatus] = useState("Offline");
  const [bufferModeActivated, setBufferModeActivated] = useState(false);

  const {
    socket,
    chatId,
    peerConnectionsMap,
    otherUsers,
    side,
    hasHandshakeCompletedMap,
    leftUser,
    sethasHandshakeCompletedMap,
  } = useWebRTCContext();

  const handleMessageFromUpstream = useCallback(
    (event) => {
      setCRDTSyncStatus("Received remote changes");
      const crdtOp = JSON.parse(event.data);
      executeCausallyRemoteOperation(editor, crdtOp, editor.causalOrderQueue);
    },
    [editor]
  );
  // Send buffered operations
  const handleSendCRDTOperationJson = () => {
    const dataChannelMapKeys = Object.keys(dataChannelMap);
    if (!dataChannelMapKeys.length) return;
    try {
      setCRDTSyncStatus("Sending changes...");

      const buffer = editor.crdtOpBuffer;
      while (buffer.length > 0) {
        const op = buffer.shift();
        // Increment and send the local vector clock every time we send an operation
        vc.increment(editor.vectorClock, editor.peerId);
        op.vectorClock = {};
        op.vectorClock.clock = { ...editor.vectorClock.clock };
        // Broadcast this operation
        dataChannelMapKeys.forEach((otherUserId) => {
          const dataChannel = dataChannelMap[otherUserId];
          dataChannel.send(JSON.stringify(op));
        });
      }

      console.log("crdt ops sent");
      setCRDTSyncStatus("Changes sent");
    } catch (error) {
      setCRDTSyncStatus("Error in sending changes");
      console.log("Error in handleSend: ", error);
    }
  };
  // Attach buffer mode information to the editor
  useEffect(() => {
    editor.unbuffered = !bufferModeActivated;
  }, [editor, bufferModeActivated]);
  // Run once when launched. Attach remote cursor map to the editor and make CRDTs out of it.
  useEffect(() => {
    socket.on("connect", () => {
      editor.setRemoteCursorMap = setRemoteCursorMap;
      CRDTify(editor, socket.id);
    });
  }, [socket, editor]);
  // Attach chatId when available
  useEffect(() => {
    if (chatId) editor.chatId = chatId;
  }, [chatId, editor]);
  // Attach and refresh dataChannelMap to the editor
  useEffect(() => {
    editor.dataChannelMap = dataChannelMap;
  }, [editor, dataChannelMap]);
  // Controls operation data channel creating and receiving
  useEffect(() => {
    const peerConnectionsMapKeys = Object.keys(peerConnectionsMap);
    if (!side || !peerConnectionsMapKeys.length) {
      return;
    }

    if (side === "Caller") {
      console.log("creating multiple crdt channels for other users");
      peerConnectionsMapKeys.forEach((otherUserId) => {
        const dataChannel =
          peerConnectionsMap[otherUserId].createDataChannel("crdtChannel");

        dataChannel.onmessage = handleMessageFromUpstream;
        setDataChannelMap((prev) => ({
          ...prev,
          [otherUserId]: dataChannel,
        }));
        setRemoteCursorMap((prev) => ({
          ...prev,
          [otherUserId]: null,
        }));
      });
    } else if (peerConnectionsMap[side]) {
      const pc = peerConnectionsMap[side];
      pc.addEventListener("datachannel", (event) => {
        const remoteChannel = event.channel;
        if (remoteChannel.label === "crdtChannel") {
          event.channel.onmessage = handleMessageFromUpstream;
          setDataChannelMap((prev) => ({
            ...prev,
            [side]: event.channel,
          }));
          setRemoteCursorMap((prev) => ({
            ...prev,
            [side]: null,
          }));

          sethasHandshakeCompletedMap((prev) => ({
            ...prev,
            [side]: true,
          }));
          console.log(`received the crdt data channel from ${side}`);
        }
      });
    }
  }, [
    peerConnectionsMap,
    side,
    handleMessageFromUpstream,
    sethasHandshakeCompletedMap,
  ]);
  // Controls the status bar
  useEffect(() => {
    if (editor.chatId)
      bufferModeActivated
        ? setCRDTSyncStatus("Ctrl+Enter to send changes")
        : setCRDTSyncStatus("Type to send changes");
    else setCRDTSyncStatus("Offline");
  }, [bufferModeActivated, editor.chatId]);
  // Controls what happens when a user left
  useEffect(() => {
    if (leftUser) {
      console.log(`In crdt data channel: user ${leftUser} has left`);
      setDataChannelMap((prev) => {
        prev[leftUser].close();
        const copy = { ...prev };
        delete copy[leftUser];
        return copy;
      });
      setRemoteCursorMap((prev) => {
        const copy = { ...prev };
        delete copy[leftUser];
        return copy;
      });
    }
  }, [leftUser]);

  const onChangeHandler = useCallback(
    (e) => {
      console.log("document change!", e, editor.selection, editor.operations);
      // detectLinkText(editor);
      const document = e;
      onChange(document);
      setSelection(editor.selection);
    },
    [onChange, setSelection, editor]
  );
  function onKeyDown(editor) {
    return (event) => {
      if (isHotkey("mod+b", event)) {
        toggleStyle(editor, "bold");
      } else if (isHotkey("mod+i", event)) {
        toggleStyle(editor, "italic");
      } else if (isHotkey("mod+u", event)) {
        toggleStyle(editor, "underline");
      } else if (isHotkey("mod+enter", event) && bufferModeActivated) {
        handleSendCRDTOperationJson();
      }
    };
  }
  // If when we edit the link on the card the selection loses, we still remember the previous one.
  // However, when I tested it, the selection does not lose but the cursor is gone.
  const linkSelection =
    !selection && isOnLinkNode(editor, prevSelection)
      ? prevSelection
      : isOnLinkNode(editor, selection)
      ? selection
      : null;
  return (
    /* We use onChange so that our document will also change. */
    /* onChange will get called when selection changes (even if it is just moving the cursor) */
    /* The event obj is an array of every node */
    /* <Slate editor={editor} value={document} onChange={(e) => { console.log(editor.selection); onChange(e)}}> */
    <Slate editor={editor} value={document} onChange={onChangeHandler}>
      {isOnLinkNode(editor, linkSelection) && editorRef.current ? (
        <LinkUpdateCard
          linkSelection={linkSelection}
          editorDOM={editorRef.current}
        />
      ) : null}
      {useMemo(() => {
        // console.log("cursor change!", remoteCursorMap)
        return Object.keys(remoteCursorMap).map((otherUserId) => {
          const entry = remoteCursorMap[otherUserId];
          if (!entry) return null;
          const { selection, chatId } = entry;
          return (
            <RemoteCursor key={chatId} selection={selection} chatId={chatId} />
          );
        });
      }, [remoteCursorMap])}
      <Toolbar
        selection={selection}
        CRDTSyncStatus={CRDTSyncStatus}
        bufferModeActivated={bufferModeActivated}
        setBufferModeActivated={setBufferModeActivated}
      />
      <div className={styles["editable-container"]}>
        <ChatBox />
        <Editable
          // readOnly={editor.chatId ? false : true}
          renderElement={renderElement}
          renderLeaf={renderLeaf}
          onKeyDown={onKeyDown(editor)}
        />
        {/* {!editor.chatId && <div className="instructions">Welcome!</div>} */}
      </div>
    </Slate>
  );
};
