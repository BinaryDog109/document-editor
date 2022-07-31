// Import the Slate editor factory.
import styles from "./TextEditor.module.css";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createEditor, Node } from "slate";
// Import the `Editor` and `Transforms` helpers from Slate.
import { Editor, Transforms, Text } from "slate";

// Import the Slate components and React plugin.
import { Slate, Editable, withReact } from "slate-react";

import { useRenderElement } from "../hooks/useRenderElement";
import { useSelection } from "../hooks/useSelection";
import { Toolbar } from "./Toolbar";
import { LinkUpdateCard } from "./LinkUpdateCard";
import { detectLinkText, isOnLinkNode } from "../utility/EditorStyleUtils";
import { ChatBox } from "./ChatBox";
import { RoomPanel } from "./RoomPanel";
import { WebRTCContextProvider } from "../context/WebRTCContext";
import {
  CRDTify,
  findActualOffsetFromParagraphAt,
  findParagraphNodeEntryAt,
  handleMessageFromUpstream,
} from "../crdt/JSONCRDT";
import { useWebRTCContext } from "../hooks/useWebRTCContext";

export const TextEditor = ({ document, onChange, editorRef }) => {
  // const editor = useMemo(() => withReact(createEditor()), []);
  const [editor] = useState(() => withReact(createEditor()));
  const { renderElement, renderLeaf, onKeyDown } = useRenderElement(editor);
  const [prevSelection, selection, setSelection] = useSelection(editor);
  const [dataChannelMap, setDataChannelMap] = useState({});
  const [CRDTSyncStatus, setCRDTSyncStatus] = useState("Not connected");
  const {
    socket,
    chatId,
    peerConnectionsMap,
    otherUsers,
    side,
    hasHandshakeCompletedMap,
    leftUser,
  } = useWebRTCContext();

  const handleSendCRDTOperationJson = (e) => {
    const dataChannelMapKeys = Object.keys(dataChannelMap);
    if (!dataChannelMapKeys.length) return;
    try {
      setCRDTSyncStatus("Sending...");
      dataChannelMapKeys.forEach((otherUserId) => {
        const dataChannel = dataChannelMap[otherUserId];
        const buffer = editor.crdtOpJsonBuffer;
        while (buffer.length > 0) {
          const opJson = buffer.shift();
          dataChannel.send(opJson);
        }
      });
      console.log("crdt op sent");
      setCRDTSyncStatus("Sent");
    } catch (error) {
      console.log("Error in handleSend: ", error);
    }
  };

  useEffect(() => {
    socket.on("connect", () => {
      CRDTify(editor, socket.id);
    });
  }, [socket, editor]);
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
          setCRDTSyncStatus("Channel Established");
          console.log(`received the crdt data channel from ${side}`);
        }
      });
    }
  }, [peerConnectionsMap, side]);
  useEffect(() => {
    if (leftUser) {
      console.log(`In crdt data channel: user ${leftUser} has left`);
      setDataChannelMap((prev) => {
        prev[leftUser].close();
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
      <Toolbar selection={selection} />
      <div className={styles["editable-container"]}>
        <RoomPanel />
        <ChatBox />
        <div className="sync-panel">
          <button onClick={handleSendCRDTOperationJson}>Sync</button>{" "}
          <span>{CRDTSyncStatus}</span>
        </div>

        <Editable
          renderElement={renderElement}
          renderLeaf={renderLeaf}
          onKeyDown={onKeyDown}
        />
      </div>
    </Slate>
  );
};
