import cuid from "cuid";
import { Editor, Element, Node, Range, Transforms } from "slate";
import { RGA } from "./JSONCRDT";
import vc from "vectorclock";
import {
  bufferCRDTOperation,
  executeUpstreamCRDTOps,
  mapOperationsFromSlate,
} from "./upstream-slate-helpers";
import {
  findActualOffsetFromParagraphAt,
  findParagraphNodeEntryAt,
  isOneOfParagraphTypes,
  setCharacterId,
} from "./utilities";
import { CRDTOperation } from "./CRDTOperation";
import { CharacterNode } from "./CharacterNode";

export function overwriteNormaliseNode(editor) {
  const { normalizeNode } = editor;
  // called on every node update
  editor.normalizeNode = (entry) => {
    const [node, path] = entry;
    normalizeNode(entry);
  };
}
export function overwriteInsertBreak(editor) {
  const { insertBreak } = editor;
  // Overwrite insertBreak behaviour
  editor.insertBreak = () => {
    const { selection } = editor;

    if (selection) {
      const [paragraph, paragraphPath] = findParagraphNodeEntryAt(
        editor,
        Range.end(selection)
      );
      const paragraphTextNodes = Node.texts(paragraph);

      const selectionEnd = Range.end(selection);
      // offset is the first text after the splitting position
      const offset = findActualOffsetFromParagraphAt(editor, selectionEnd);
      let textLen = 0;
      for (let textNode of paragraphTextNodes) {
        textLen += textNode[0].text.length;
      }
      // Test if the end of selection is at the end of a paragraph
      if (offset === textLen || offset === 0) {
        const [nodeEntry] = Editor.nodes(editor, {
          match: (n) =>
            !Editor.isEditor(n) &&
            Element.isElement(n) &&
            isOneOfParagraphTypes(n),
        });
        if (nodeEntry) {
          const id = cuid();
          const newParagraph = {
            children: [{ text: "" }],
            type: nodeEntry[0].type,
            id,
            rga: new RGA(),
          };
          Transforms.insertNodes(editor, newParagraph);
          editor.paragraphRGAMap &&
            editor.paragraphRGAMap.set(id, newParagraph.rga);
          return;
        }
      }
      // If inserting break in between text nodes
      else {
        /**@type {RGA} */
        const previousRGA = paragraph.rga;
        const newRGAHead = previousRGA.findRGANodeAt(offset);
        insertBreak();
        const newSelection = editor.selection;
        const [newParagraph, paragraphPath] = findParagraphNodeEntryAt(
          editor,
          newSelection
        );
        const newRGA = new RGA();
        const newCharMap = newRGA.chracterLinkedNodeMap;

        // Insert non-tombstoned rga nodes to the new RGA linked list
        let current = newRGAHead;
        while (current != null) {
          if (!current.data.isTombStoned) {
            // increase local vector clock
            vc.increment(editor.vectorClock, editor.peerId);
            const characterNode = new CharacterNode(
              current.data.char,
              editor.peerId
            );
            setCharacterId(characterNode, editor);
            newRGA.list.insert(characterNode);
            newCharMap.set(characterNode.id, current);
          }
          current = current.next;
        }

        // Remove splitted rga nodes in previous linked list
        let removeStop = newRGAHead.prev;
        let deletedLinkedNode = previousRGA.list.tail;
        while (deletedLinkedNode !== removeStop) {
          // Mark nodes after the splitting position to be deleted
          if (!deletedLinkedNode.data.isTombStoned) {
            deletedLinkedNode.data.isTombStoned = true;
            previousRGA.list.tombStoneCount++;
          }

          deletedLinkedNode = deletedLinkedNode.prev;
        }

        Transforms.setNodes(
          editor,
          { id: cuid(), rga: newRGA },
          { at: paragraphPath }
        );
        return;
      }
    }
    insertBreak();
  };
}
export function overwriteOnChange(editor) {
  const { onChange } = editor;
  editor.onChange = () => {
    const operations = editor.operations;
    // It will skip all the remote slate operations
    const crdtOps = mapOperationsFromSlate(editor, operations);
    const readyCRDTOps = executeUpstreamCRDTOps(editor, crdtOps);
    // If there are local operations and the editor is connected
    if (
      editor.chatId &&
      (crdtOps.length > 0 ||
        (crdtOps.length === 0 &&
          operations[0] &&
          operations[0].type === "set_selection"))
    ) {
      // For cursor indicator
      const selection = editor.selection;
      const selectionCRDTOp = new CRDTOperation("set_remote_selection");
      selectionCRDTOp.selection = selection;
      selectionCRDTOp.chatId = editor.chatId;
      selectionCRDTOp.peerId = editor.peerId;
      readyCRDTOps.push(selectionCRDTOp);
    }

    console.log({ readyCRDTOps });

    if (crdtOps.length > 0) {
      if (editor.unbuffered && editor.chatId) {
        const dataChannelMapKeys = Object.keys(editor.dataChannelMap);
        // Send all previously buffered operations first
        if (editor.crdtOpBuffer && editor.crdtOpBuffer.length > 0) {
          const buffer = editor.crdtOpBuffer;
          while (buffer.length > 0) {
            const op = buffer.shift();
            // Increment and send the local vector clock every time we send an operation
            vc.increment(editor.vectorClock, editor.peerId);
            op.vectorClock = {};
            op.vectorClock.clock = { ...editor.vectorClock.clock };
            // Broadcast this operation
            dataChannelMapKeys.forEach((otherUserId) => {
              const dataChannel = editor.dataChannelMap[otherUserId];
              dataChannel.send(JSON.stringify(op));
            });
          }
        }

        readyCRDTOps.forEach((op) => {
          // Increment and send the local vector clock every time we send an operation
          vc.increment(editor.vectorClock, editor.peerId);
          op.vectorClock = {};
          op.vectorClock.clock = { ...editor.vectorClock.clock };
          // Broadcast this operation
          dataChannelMapKeys.forEach((otherUserId) => {
            editor.dataChannelMap[otherUserId].send(JSON.stringify(op));
          });
        });
      } else {
        readyCRDTOps.forEach((crdtOp) => {
          // Send to buffer
          bufferCRDTOperation(editor, crdtOp);
        });
        // console.log({ buffer: editor.crdtOpBuffer });
      }
    }
    onChange();
  };
}
