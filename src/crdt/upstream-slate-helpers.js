import { Editor, Node, Range } from "slate";
import { CharacterNode } from "./CharacterNode";
import { CRDTOperation } from "./CRDTOperation";
import {
  findActualOffsetFromParagraphAt,
  findParagraphIdAt,
  findParagraphNodeEntryAt,
  isOneOfParagraphTypes,
  isParagraphRGAEmpty,
  setCharacterId,
} from "./utilities";
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

    if (type === "insert_text" || type === "insert_marked_node") {
      setCharacterId(node, editor);
      const paragraphPath = op.paragraphPath;
      const [paragraphNode, path] = Editor.node(editor, paragraphPath);
      /**@type {RGA} */
      const rga = paragraphNode.rga;
      // Look for the "insert after" node's id. If it is '', it means insert at the beginning
      let insertedLinkedNode;
      let insertAfterNode;
      // Copy the character node so that changes in the linked list wont affect our crdtOp's character node
      const nodeForLinkedList = { ...node };
      // Insert to the end of the list as much as it can
      if (
        editor.selection &&
        Range.isCollapsed(editor.selection) &&
        Editor.isEnd(editor, Range.end(editor.selection), path) &&
        Node.string(paragraphNode).length === index + 1
      ) {
        console.log("insert to end!");
        rga.list.insert(nodeForLinkedList);
        insertedLinkedNode = rga.list.getTailNode();
        insertAfterNode = rga.list.getTailNode().prev;
      } else {
        // traverse through visible nodes
        insertedLinkedNode = rga.insertAtAndReturnNode(
          index,
          nodeForLinkedList
        );
        insertAfterNode = insertedLinkedNode.prev;
      }
      const insertAfterNodeId = insertAfterNode ? insertAfterNode.data.id : "";

      setInsertAfterNodeIdForCRDTOp(op, insertAfterNodeId);
      rga.chracterLinkedNodeMap.set(nodeForLinkedList.id, insertedLinkedNode);
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
      console.log("upstream paragraph created");
    }
    if (type === "change_paragraph_type") {
      // Increment HLC clock and assign it to the operation
      editor.paragraphHLC = HLC.increment(
        editor.paragraphHLC,
        performance.now()
      );
      op.paragraphHLC = editor.paragraphHLC;
      op.peerId = editor.peerId;
      console.log("Changed paragraph type to: ", op.newParagraphType);
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
  let firstCharOffset = null;
  for (let [index, slateOp] of slateOps.entries()) {
    // console.log({slateOp})
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
    if (
      slateOp.type === "insert_text" ||
      slateOp.type === "remove_text" ||
      (slateOp.type === "remove_node" && slateOp.node.text)
    ) {
      const slatePath = [...slateOp.path];

      const [paragraph, paragraphPath] = findParagraphNodeEntryAt(
        editor,
        slatePath
      );
      const paragraphId = paragraph.id;

      let actualOffset;
      // slateOp.offset is relative to that text node, so we need to find the actual index relative to the paragraph
      actualOffset = findActualOffsetFromParagraphAt(editor, {
        path: slatePath,
        offset: slateOp.offset,
      });

      if (slateOp.type === "insert_text") {
        const chars = slateOp.text.split("");
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
          crdtOp.paragraphId = paragraphId;
          crdtOps.push(crdtOp);
        });
      } else if (
        slateOp.type === "remove_text" ||
        (slateOp.type === "remove_node" && slateOp.node.text)
      ) {
        let chars;
        let crdtOpType = "remove_text";
        // If the operation is of type "remote_node"
        if (slateOp.node) {
          chars = slateOp.node.text.split("");
        }
        // If the operation is of type "remote_text"
        else chars = slateOp.text.split("");
        /**
       * offset: 2
         path: (2) [0, 0]
         text: "cd"
         type: "remove_text"
       */
        // find the corresponidng char node in the list
        /**@type {RGA} */
        const rga = paragraph.rga;
        // If deleting marked nodes, there will be an operation called merge_node
        const mergedOperation = slateOps.find(
          (slateOp) => slateOp.type === "merge_node" && slateOp.position
        );
        // mergedNode has a path of before-merging and a position of after-merging
        if (mergedOperation) {
          if (firstCharOffset === null) {
            // slateOp.offset is relative to that text node, so we need to find the actual index relative to the paragraph
            actualOffset = findActualOffsetFromParagraphAt(
              editor,
              {
                path: mergedOperation.path,
                offset: 0,
              },
              mergedOperation.position
            );
            firstCharOffset = actualOffset;
          }

          // eslint-disable-next-line no-loop-func
          chars.forEach((char) => {
            console.log({ firstCharOffset, char });
            const nodeToBeDeleted = rga.findRGANodeAt(firstCharOffset);
            const crdtOp = new CRDTOperation(
              crdtOpType,
              nodeToBeDeleted.data,
              firstCharOffset++,
              paragraphPath,
              slatePath,
              editor.peerId
            );
            crdtOp.paragraphId = paragraphId;
            setDeletedNodeIdForCRDTOp(crdtOp, nodeToBeDeleted.data.id);
            crdtOps.push(crdtOp);
          });

          continue;
        }
        // If deleting a marked node which is at the end of a paragraph
        if (
          slateOps.length === 3 &&
          slateOps.find(
            (op) => op.type === "remove_node" && op.node.text === ""
          )
        ) {
          const insertTextOp = slateOps.find((op) => op.type === "insert_text");
          actualOffset = findActualOffsetFromParagraphAt(
            editor,
            {
              path: slatePath,
              offset: slateOp.offset,
            },
            insertTextOp.offset
          );
        }
        // Find the offset of the first char, then increase it by one every char in every remove_text/node node
        if (firstCharOffset === null) {
          firstCharOffset = actualOffset;
        }
        console.log({ actualOffset, slateOps });
        // eslint-disable-next-line no-loop-func
        chars.forEach((char) => {
          const nodeToBeDeleted = rga.findRGANodeAt(firstCharOffset);
          const crdtOp = new CRDTOperation(
            slateOp.type,
            nodeToBeDeleted.data,
            firstCharOffset++,
            paragraphPath,
            slatePath,
            editor.peerId
          );
          crdtOp.paragraphId = paragraphId;
          setDeletedNodeIdForCRDTOp(crdtOp, nodeToBeDeleted.data.id);
          crdtOps.push(crdtOp);
        });
      }
    } else if (
      /**
       * node: {children: Array(1), type: 'paragraph', rga: RGA}
         path: [1]
         type: "insert_node"
       */
      slateOp.type === "insert_node" &&
      slateOp.node.type === "paragraph"
    ) {
      const paragraph = slateOp.node;
      // handle inserting a new paragraph (insert break)
      if (Object.keys(paragraph.rga).length !== 0) return;

      const crdtOp = new CRDTOperation(slateOp.type);
      crdtOp.node = paragraph;
      crdtOp.slateTargetPath = [...slateOp.path];
      // Find the set_selection op
      // const setSelectionOp = slateOps.find((op) => op.type === "set_selection");
      // const oldSelection = setSelectionOp.properties;
      // const oldParagraph = findParagraphIdAt(editor, oldSelection[0]);
      // TODO: Attach old paragraph ID
      // console.log({ oldParagraph });
      crdtOp.type = "insert_paragraph";
      crdtOp.peerId = editor.peerId;

      crdtOps.push(crdtOp);
    }
    // Remove a paragraph
    // Could be remove_node or merge_node
    /**
       * path: [1]
         position: 1
         properties: {type: 'paragraph', id: 'cl6jmlhft0000356fslw9esq4', rga: RGA}
         type: "merge_node"
       */
    else if (
      (slateOp.type === "remove_node" && slateOp.node.type === "paragraph") ||
      (slateOp.type === "merge_node" &&
        isOneOfParagraphTypes(slateOp.properties) &&
        isParagraphRGAEmpty(slateOp.properties.rga))
    ) {
      let paragraph = slateOp.properties;
      if (slateOp.type === "remove_node") paragraph = slateOp.node;
      console.log({ slateOp });
      const crdtOp = new CRDTOperation(slateOp.type);
      crdtOp.type = "remove_paragraph";
      crdtOp.paragraphId = paragraph.id;
      crdtOp.peerId = editor.peerId;
      crdtOps.push(crdtOp);
    } else if (
      /**
       * newProperties: {type: 'h1'}
         path: [0]
         properties: {type: 'paragraph'}
         type: "set_node"
       */
      slateOp.type === "set_node" &&
      isOneOfParagraphTypes(slateOp.newProperties)
    ) {
      const slatePath = [...slateOp.path];
      const [paragraph, paragraphPath] = Editor.node(editor, slatePath);
      const { newProperties, path } = slateOp;
      const crdtOp = new CRDTOperation(slateOp.type);
      crdtOp.newParagraphType = newProperties.type;
      crdtOp.paragraphPath = path;
      crdtOp.type = "change_paragraph_type";
      crdtOp.paragraphId = paragraph.id;
      crdtOps.push(crdtOp);
    } else if (
      /**
     * Start inserting a marked text node
       * node: {text: 'a', bold: true}
         path: (2) [0, 1]
         type: "insert_node"
       */
      slateOp.type === "insert_node" &&
      slateOp.node.text
    ) {
      const insertingNode = slateOp.node;
      const { text, ...markProperties } = insertingNode;
      const slatePath = [...slateOp.path];
      const [paragraph, paragraphPath] = findParagraphNodeEntryAt(
        editor,
        slatePath
      );
      // If inserting marked node at the beginning of a paragraph
      if (
        paragraph.children.length === 1 &&
        paragraph.children[0].text === slateOp.node.text
      ) {
        slatePath[slatePath.length - 1] = 0;
      }
      const paragraphId = paragraph.id;
      const actualOffset = findActualOffsetFromParagraphAt(editor, {
        path: slatePath,
        offset: 0,
      });

      const characterNode = new CharacterNode(text, editor.peerId);
      const crdtOp = new CRDTOperation(
        "insert_marked_node",
        characterNode,
        actualOffset,
        paragraphPath,
        slatePath,
        editor.peerId
      );
      crdtOp.paragraphId = paragraphId;
      crdtOp.markProperties = markProperties;
      crdtOps.push(crdtOp);
      // console.log({ crdtOp });
    }
    else if (slateOp.type === "insert_break") {
      const crdtOp = new CRDTOperation(slateOp.type)
      crdtOp.peerId = editor.peerId;
      crdtOp.oldParagraphId = slateOp.oldParagraphId
      crdtOp.newParagraphId = slateOp.newParagraphId
      crdtOp.insertAfterNodeId = slateOp.insertAfterNodeId
      crdtOp.insertedCharacters = slateOp.insertedCharacters
      crdtOps.push(crdtOp)
    }
  }

  return crdtOps;
}

// CRDTOperation Upstream Helpers
export function setInsertAfterNodeIdForCRDTOp(crdtOp, insertAfterNodeId) {
  if (crdtOp.type !== "insert_text" && crdtOp.type !== "insert_marked_node") {
    throw Error("Wrong type of operation!");
  }
  crdtOp.insertAfterNodeId = insertAfterNodeId;
}
export function setDeletedNodeIdForCRDTOp(crdtOp, deletedNodeId) {
  crdtOp.deletedNodeId = deletedNodeId;
}
