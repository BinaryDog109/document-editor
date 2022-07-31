import {
  createEditor,
  Editor,
  Node,
  Operation,
  Path,
  Range,
  Text,
  Transforms,
} from "slate";
import HLC from "../utility/HybridLogicalClock";
import { CRDTOperation } from "./CRDTOperation";
import vc from "vectorclock";
import { toJSON } from "./Utilities";
import { CharacterNode } from "./CharacterNode";
// import FastList from "fast-list";
import LinkedList from "dbly-linked-list";
/**
 *
 * @param {Editor} editor
 */
export const CRDTify = (editor, peerId, dataChannel) => {
  let original = JSON.stringify;

  /** Overwrite JSON.stringify so that it wont stringify our circular references in the doubly linked list */
  JSON.stringify = function (item, replacer, space) {
    // Keep other JSON call passed
    if (typeof item[0] !== "object") {
      return original(item, replacer, space);
    }
    // item is an array here
    const items = item;
    const newItems = [];
    items.forEach((element) => {
      const newElem = { ...element };
      if (element.type === "paragraph" && element.rga) {
        delete newElem["rga"];
      }
      newItems.push(newElem);
    });

    return original(newItems, replacer, space);
  };
  editor.peerId = peerId;
  editor.vectorClock = { clock: {} };
  // Setting rga for every paragraph
  Transforms.setNodes(
    editor,
    { rga: new RGA() },
    {
      match: (n) => n.type === "paragraph",
      at: [],
    }
  );
  const { normalizeNode } = editor;
  // called on every node update
  editor.normalizeNode = (entry) => {
    const [node, path] = entry;
    if (node.type === "paragraph" && !node.rga) {
      // Setting rga for every paragraph
      Transforms.setNodes(
        editor,
        { rga: new RGA() },
        {
          match: (n) => n.type === "paragraph",
          at: path,
        }
      );
      return;
    }
    normalizeNode(entry);
  };
  const { onChange } = editor;
  editor.onChange = () => {
    const operations = editor.operations;
    const crdtOps = mapOperationsFromSlate(editor, operations);
    const readyCRDTOps = executeUpstreamCRDTOps(editor, crdtOps);
    console.log({readyCRDTOps})
    onChange();
  };
};

class RGA {
  constructor() {
    this.list = new LinkedList();
    this.nodeMap = new Map();
  }
  insertAtAndReturnNode(index, data) {
    var current = this.list.getHeadNode(),
      newNode = this.list.createNewNode(data),
      position = 0;

    // if index is 0, we just need to insert the first node
    if (index === 0) {
      this.list.insertFirst(data);
      return this.list.getHeadNode();
    }
    // If index is the length, insert to the end
    if (index === this.list.getSize()) {
      this.list.insert(data)
      return this.list.getTailNode()
    }
    // check for index out-of-bounds
    if (index < 0 || index > this.list.getSize()) {
      return false;
    }  

    while (position < index) {
      // Skip if it has been deleted
      if (current.data.isTombStoned) continue
      current = current.next;
      position += 1;
    }

    current.prev.next = newNode;
    newNode.prev = current.prev;
    current.prev = newNode;
    newNode.next = current;

    this.list.size += 1;

    return newNode;
  }
}

/**
 *
 * @param {CRDTOperation[]} crdtOps
 */
function executeUpstreamCRDTOps(editor, crdtOps) {
  if (!crdtOps) return;
  crdtOps.forEach((op) => {
    const node = op.node;
    const type = op.type;
    const index = op.index;

    // increase local vector clock and assign it for every op
    vc.increment(editor.vectorClock, editor.peerId);
    node.vectorClock.clock = { ...editor.vectorClock.clock };
    if (type === "insert_text") {
      const paragraphPath = op.paragraphPath;
      const [paragraphNode, path] = Editor.node(editor, paragraphPath);
      /**@type {RGA} */
      const rga = paragraphNode.rga;
      // Look for the "insert after" node's id. If it is '', it means insert at the beginning
      let insertAfterNode;
      // Insert to the end of the list as much as it can
      if (
        editor.selection &&
        Range.isCollapsed(editor.selection) &&
        Editor.isEnd(editor, Range.end(editor.selection), path) &&
        Node.string(paragraphNode).length === index + 1
      ) {
        
        rga.list.insert(node);
        insertAfterNode = rga.list.getTailNode().prev;
        
      } else {
        
        // traverse through visible nodes
        const insertedNode = rga.insertAtAndReturnNode(index, node)
        
        insertAfterNode = insertedNode.prev
      }
      const insertAfterNodeId = insertAfterNode
        ? insertAfterNode.data.getId()
        : "";
        
      op.setinsertAfterNodeId(insertAfterNodeId);
      rga.nodeMap.set(node.getId(), node);
    }
  });
  return crdtOps
}

/**
 *
 * @param {Operation[]} slateOps
 * @return {CRDTOperation[]}
 */
function mapOperationsFromSlate(editor, slateOps) {
  const crdtOps = [];
  slateOps.forEach((slateOp) => {
    /**
     * Example:
     * insert_text: {
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
    if (slateOp.type === "insert_text") {
      const [paragraph, paragraphPath] = findParagraphNodeEntryAt(
        editor,
        slateOp.path
      );
      let actualOffset = findActualOffsetFromParagraphAt(editor, {
        path: slateOp.path,
        offset: slateOp.offset,
      });
      const chars = slateOp.text.split("");
      chars.forEach((char) => {
        const characterNode = new CharacterNode(char, editor.peerId);
        const crdtOp = new CRDTOperation(
          slateOp.type,
          characterNode,
          actualOffset++,
          paragraphPath,
        );
        crdtOps.push(crdtOp);
      });
    }
  });

  return crdtOps;
}

export const findParagraphNodeEntryAt = (editor, path) => {
  const entry = Editor.above(editor, {
    match: (n) => n.type === "paragraph",
    at: path,
  });
  return entry;
};

export const findActualOffsetFromParagraphAt = (editor, point) => {
  const [paragraph, path] = findParagraphNodeEntryAt(editor, point.path);
  const generator = Node.texts(paragraph);

  let offset = point.offset;
  for (const [node, path] of generator) {
    // If the text node is before our text node
    if (Path.compare(path, point.path) === -1) {
      offset += Node.string(node).length;
    }
  }
  return offset;
};
