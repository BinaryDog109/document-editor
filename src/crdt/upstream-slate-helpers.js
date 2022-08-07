import { Editor, Node, Range } from "slate";
import { CharacterNode } from "./CharacterNode";
import { CRDTOperation } from "./CRDTOperation";
import { findActualOffsetFromParagraphAt, findParagraphNodeEntryAt, isOneOfParagraphTypes, setCharacterId } from "./utilities";
import vc from "vectorclock";
import HLC from "../utility/HybridLogicalClock";

export function bufferCRDTOperation(editor, op) {
    if (!editor.crdtOpBuffer) editor.crdtOpBuffer = [];
    editor.crdtOpBuffer.push(op);
  }

/**
 *
 * @param {CRDTOperation[]} crdtOps
 */
 export function executeUpstreamCRDTOps(editor, crdtOps) {
    if (!crdtOps) return;
    crdtOps.forEach((op) => {
      const node = op.node;
      const type = op.type;
      const index = op.index;
  
      // increase local vector clock
      vc.increment(editor.vectorClock, editor.peerId);
      
      if (type === "insert_text") {
        setCharacterId(node, editor)
        const paragraphPath = op.paragraphPath;
        const [paragraphNode, path] = Editor.node(editor, paragraphPath);
        /**@type {RGA} */
        const rga = paragraphNode.rga;
        // Look for the "insert after" node's id. If it is '', it means insert at the beginning
        let insertedLinkedNode;
        let insertAfterNode;
        // Copy the character node so that changes in the linked list wont affect our crdtOp's character node
        const nodeForLinkedList = {...node}
        // Insert to the end of the list as much as it can
        if (
          editor.selection &&
          Range.isCollapsed(editor.selection) &&
          Editor.isEnd(editor, Range.end(editor.selection), path) &&
          Node.string(paragraphNode).length === index + 1
        ) {
          rga.list.insert(nodeForLinkedList);
          insertedLinkedNode = rga.list.getTailNode();
          insertAfterNode = rga.list.getTailNode().prev;
        } else {
          // traverse through visible nodes
          insertedLinkedNode = rga.insertAtAndReturnNode(index, nodeForLinkedList);
          insertAfterNode = insertedLinkedNode.prev;
        }
        const insertAfterNodeId = insertAfterNode
          ? (insertAfterNode.data).id
          : "";
  
        setInsertAfterNodeIdForCRDTOp(op, insertAfterNodeId);
        rga.chracterLinkedNodeMap.set(
          (nodeForLinkedList).id,
          insertedLinkedNode
        );
      }
      if (type === "remove_text") {
        // No need to update character node's id in deletion
        // Visible index is op.index
        const [paragraphNode, path] = Editor.node(editor, op.paragraphPath);
        /**@type {RGA} */
        const rga = paragraphNode.rga;
        const map = rga.chracterLinkedNodeMap;
        map.get(op.deletedNodeId).data.isTombStoned = true;
        rga.list.tombStoneCount++;
      }
      if (type === "insert_paragraph") {
        console.log("upstream paragraph created")
      }
      if (type === "change_paragraph_type") {
        // Increment HLC clock and assign it to the operation
        editor.paragraphHLC = HLC.increment(editor.paragraphHLC, performance.now())
        op.paragraphHLC = editor.paragraphHLC
        op.peerId = editor.peerId
        console.log("Changed paragraph type to: ", op.newParagraphType)
      }
    });
    return crdtOps;
  }
  
  /**
   *
   * @param {Operation[]} slateOps
   * @return {CRDTOperation[]}
   */
  export function mapOperationsFromSlate(editor, slateOps) {
    const crdtOps = [];
    for (let slateOp of slateOps) {
      /**
       *  Example:
       *  insert_text: {
          offset: 1
          path: (2) [0, 0]
          text: "a"
          type: "insert_text"
          }
          insert_node (happens when copying and pasting): {
            node: {text: 'q'}
            path: (2) [1, 2]
            type: "insert_node"
          }
       */
      // Ignore the changes from remote peer
      if (slateOp.isRemote) {
        continue;
      }
      if (slateOp.type === "insert_text" || slateOp.type === "remove_text") {
        const slatePath = [...slateOp.path];
        const [paragraph, paragraphPath] = findParagraphNodeEntryAt(
          editor,
          slatePath
        );
        // slateOp.offset is relative to that text node, so we need to find the actual index relative to the paragraph
        let actualOffset = findActualOffsetFromParagraphAt(editor, {
          path: slatePath,
          offset: slateOp.offset,
        });
        const chars = slateOp.text.split("");
        if (slateOp.type === "insert_text") {
          chars.forEach((char) => {
            const characterNode = new CharacterNode(char, editor.peerId);
            const crdtOp = new CRDTOperation(
              slateOp.type,
              characterNode,
              actualOffset++,
              paragraphPath,
              slatePath,
              editor.peerId
            );
            crdtOps.push(crdtOp);
          });
        } else if (slateOp.type === "remove_text") {
          /**
       * offset: 2
         path: (2) [0, 0]
         text: "cd"
         type: "remove_text"
       */
          chars.forEach((char) => {
            // find the corresponidng char node in the list
            /**@type {RGA} */
            const rga = paragraph.rga;
            const nodeToBeDeleted = rga.findRGANodeAt(actualOffset);
            const crdtOp = new CRDTOperation(
              slateOp.type,
              nodeToBeDeleted.data,
              actualOffset++,
              paragraphPath,
              slatePath,
              editor.peerId
            );
            setDeletedNodeIdForCRDTOp(
              crdtOp,
              (nodeToBeDeleted.data).id
            );
            crdtOps.push(crdtOp);
          });
        }
      }
      /**
       * node: {children: Array(1), type: 'paragraph', rga: RGA}
         path: [1]
         type: "insert_node"
       */
      if (slateOp.type === "insert_node" && slateOp.node.type === "paragraph") {
        
        const paragraph = slateOp.node;
        // handle inserting a new paragraph (insert break)
        if (Object.keys(paragraph.rga).length !== 0) return;
        
        const crdtOp = new CRDTOperation(slateOp.type);
        crdtOp.node = paragraph;
        crdtOp.slateTargetPath = [...slateOp.path]
        crdtOp.type = "insert_paragraph"
        crdtOp.peerId = editor.peerId

        crdtOps.push(crdtOp);
      }
      if (slateOp.type === "remove_node") {
        console.log("!!!Removing node")
      }
      /**
       * newProperties: {type: 'h1'}
         path: [0]
         properties: {type: 'paragraph'}
         type: "set_node"
       */
      if (slateOp.type === "set_node" && isOneOfParagraphTypes(slateOp.newProperties)) {
        const {newProperties, path} = slateOp
        const crdtOp = new CRDTOperation(slateOp.type);
        crdtOp.newParagraphType = newProperties.type
        crdtOp.paragraphPath = path
        crdtOp.type = "change_paragraph_type"
        crdtOps.push(crdtOp);
      }
    }
  
    return crdtOps;
  }

  // CRDTOperation Upstream Helpers
export function setInsertAfterNodeIdForCRDTOp(crdtOp, insertAfterNodeId) {
    if (crdtOp.type !== "insert_text") {
      throw Error("Wrong type of operation!");
    }
    crdtOp.insertAfterNodeId = insertAfterNodeId;
  }
 export  function setDeletedNodeIdForCRDTOp(crdtOp, deletedNodeId) {
    crdtOp.deletedNodeId = deletedNodeId;
  }