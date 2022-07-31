import {
  createEditor,
  Editor,
  Element,
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
    if (typeof item[0] !== "object" || item[0].type !== "paragraph") {
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

    normalizeNode(entry);
  };
  const { insertBreak } = editor;
  // Overwrite insertBreak behaviour
  editor.insertBreak = () => {
    const { selection } = editor
    if (selection) {
      const [nodes] = Editor.nodes(editor, {
        match: n =>
          !Editor.isEditor(n) &&
          Element.isElement(n) &&
          (n.type === 'paragraph')
      })

      if(nodes){
        Transforms.insertNodes(editor, {
          children: [{text: ""}],
          type: 'paragraph',
          rga: new RGA()
        })
        return
      }
    }
    insertBreak()
  };
  const { onChange } = editor;
  editor.onChange = () => {
    const operations = editor.operations;
    const crdtOps = mapOperationsFromSlate(editor, operations);
    const readyCRDTOps = executeUpstreamCRDTOps(editor, crdtOps);
    console.log({ readyCRDTOps });
    readyCRDTOps.forEach(crdtOp => {
      // Send to buffer
      const json = JSON.stringify(crdtOp)
      bufferCRDTOperationJSON(editor, json)
    })
    console.log({buffer: editor.crdtOpJsonBuffer})
    onChange();
  };
};

class RGA {
  constructor() {
    this.list = new LinkedList();
    this.list.tombStoneCount = 0;
    this.nodeMap = new Map();
  }
  getFirstVisibleNode() {
    let head = this.list.getHeadNode();
    while (head !== null && head.data.isTombStoned) {
      head = head.next;
    }
    return head;
  }
  findRGANodeAt(index) {
    // cannot find out-of-bounds node
    if (index < 0 || index > this.list.getSize()) {
      return false;
    }
    // if index is 0, we just need to find the first visible node
    if (index === 0) {
      return this.getFirstVisibleNode();
    }

    let current = this.getFirstVisibleNode();
    let position = 0;

    while (position < index) {
      current = current.next;
      // Skip if it has been deleted
      if (current.data.isTombStoned) {
        continue;
      } else {
        position += 1;
        if (position >= index) break;
      }
    }
    return current;
  }

  insertAtAndReturnNode(index, data) {
    var current = this.list.getHeadNode(),
      newNode = this.list.createNewNode(data),
      position = 0;

    // check for index out-of-bounds
    if (index < 0 || index > this.list.getSize()) {
      return false;
    }
    // if index is 0, we just need to insert the first node
    if (index === 0) {
      this.list.insertFirst(data);
      return this.list.getHeadNode();
    }
    // If index is the length of all visible nodes, insert to the end
    if (index === this.list.getSize() - this.list.tombStoneCount) {
      this.list.insert(data);
      return this.list.getTailNode();
    }

    let encounteredFirstNonTombStone = false;
    while (position < index) {
      if (!current.data.isTombStoned && !encounteredFirstNonTombStone) {
        encounteredFirstNonTombStone = true;
        position = 0;
        current = current.next;
        continue;
      }

      // Skip if it has been deleted
      else if (current.data.isTombStoned) {
        current = current.next;
        continue;
      } else if (!current.data.isTombStoned) {
        position += 1;
        if (position >= index) break;
        current = current.next;
      }
    }

    current.prev.next = newNode;
    newNode.prev = current.prev;
    current.prev = newNode;
    newNode.next = current;

    this.list.size += 1;

    return newNode;
  }
}

export function bufferCRDTOperationJSON(editor, opJson) {
  if (!editor.crdtOpJsonBuffer) editor.crdtOpJsonBuffer = []
  editor.crdtOpJsonBuffer.push(opJson)
}

export function handleMessageFromUpstream(event) {
  const crdtOp = JSON.parse(event.data);
  console.log({crdtOp})
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

    if (type === "insert_text") {
      node.vectorClock.clock = { ...editor.vectorClock.clock };
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
        const insertedNode = rga.insertAtAndReturnNode(index, node);
        insertAfterNode = insertedNode.prev;
      }
      const insertAfterNodeId = insertAfterNode
        ? insertAfterNode.data.getId()
        : "";

      op.setinsertAfterNodeId(insertAfterNodeId);
      rga.nodeMap.set(node.getId(), node);
    }
    if (type === "remove_text") {
      const [paragraphNode, path] = Editor.node(editor, op.paragraphPath);
      /**@type {RGA} */
      const rga = paragraphNode.rga;
      const map = rga.nodeMap;
      map.get(op.deletedNodeId).isTombStoned = true;
      rga.list.tombStoneCount++;
    }
  });
  return crdtOps;
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
    if (slateOp.type === "insert_text" || slateOp.type === "remove_text") {
      const [paragraph, paragraphPath] = findParagraphNodeEntryAt(
        editor,
        slateOp.path
      );
      let actualOffset = findActualOffsetFromParagraphAt(editor, {
        path: slateOp.path,
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
            paragraphPath
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
            undefined,
            actualOffset++,
            paragraphPath
          );
          crdtOp.setDeletedNodeId(nodeToBeDeleted.data.getId());
          crdtOps.push(crdtOp);
        });
      }
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
    // The path is relative, so we just compare the last number of a path
    // If the text node is before our text node
    if (Path.compare(path, [point.path[point.path.length - 1]]) === -1) {
      console.log("1 ndoe before!");
      offset += Node.string(node).length;
    }
  }
  return offset;
};