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
import deepcopy from "deepcopy";
/**
 *
 * @param {Editor} editor
 */
export const CRDTify = (editor, peerId, dataChannel) => {
  let original = JSON.stringify;
  // The algorithm that ensure one clock is causally ready when sending to the other.
  vc.isCausallyReady = (localClock, remoteClock, remoteClockId) => {
    // allow this function to be called with objects that contain clocks, or the clocks themselves
    if (localClock.clock) localClock = localClock.clock;
    if (remoteClock.clock) remoteClock = remoteClock.clock;
    const remoteClockOwnValue = remoteClock[remoteClockId] || 0;
    const localClockRecordedRemoteClockValue = localClock[remoteClockId] || 0;
    const keys = allKeys(localClock, remoteClock);

    for (let key of keys) {
      if (key === remoteClockId) continue;
      const localValue = localClock[key] || 0;
      const remoteValue = remoteClock[key] || 0;

      if (remoteValue > localValue) return false;
    }
    if (remoteClockOwnValue - localClockRecordedRemoteClockValue <= 2)
      return true;
    else return false;
  };

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
    const { selection } = editor;
    if (selection) {
      const [nodes] = Editor.nodes(editor, {
        match: (n) =>
          !Editor.isEditor(n) && Element.isElement(n) && n.type === "paragraph",
      });

      if (nodes) {
        Transforms.insertNodes(editor, {
          children: [{ text: "" }],
          type: "paragraph",
          rga: new RGA(),
        });
        return;
      }
    }
    insertBreak();
  };
  const { onChange } = editor;
  editor.onChange = () => {
    const operations = editor.operations;
    const crdtOps = mapOperationsFromSlate(editor, operations);
    const readyCRDTOps = executeUpstreamCRDTOps(editor, crdtOps);
    console.log({ readyCRDTOps });
    readyCRDTOps.forEach((crdtOp) => {
      // Send to buffer
      bufferCRDTOperation(editor, crdtOp);
    });
    console.log({ buffer: editor.crdtOpBuffer });
    onChange();
  };
};

class RGA {
  constructor() {
    this.list = new LinkedList();
    this.list.tombStoneCount = 0;
    this.chracterLinkedNodeMap = new Map();
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

export function bufferCRDTOperation(editor, op) {
  if (!editor.crdtOpBuffer) editor.crdtOpBuffer = [];
  editor.crdtOpBuffer.push(op);
}



/**
 *
 * @param {Editor} editor
 * @param {CRDTOperation} crdtOp
 */
export function executeDownstreamSingleCRDTOp(editor, crdtOp) {
  const {
    type,
    index,
    insertAfterNodeId,
    node,
    paragraphPath,
    vectorClock: remoteVectorClock,
  } = crdtOp;
  console.log({ node });
  // merge remote with local vector clock, increment it
  vc.merge(editor.vectorClock, remoteVectorClock);
  vc.increment(editor.vectorClock, editor.peerId);
  if (type === "insert_text") {
    // Locate the paragraph and rga this node was inserted in
    const [paragraphNode, path] = Editor.node(editor, paragraphPath);
    /**@type {RGA} */
    const rga = paragraphNode.rga;
    console.log("inserting node to the current linked list");
    if (insertAfterNodeId === "") {
      // '' means insert after head
      rga.list.insertFirst(node);
      rga.chracterLinkedNodeMap.set(getIdForCharacterNode(node), rga.list.getHeadNode());
    } else {
      // Retreive reference node from the map
      const insertAfterLinkedNode =
        rga.chracterLinkedNodeMap.get(insertAfterNodeId);
      const oldNextLinkedNode = insertAfterLinkedNode.next;
      let current = oldNextLinkedNode;
      console.log("The ref node's next: ", current)
      while (current !== null && isLargerThanForCharacterNode(current.data, node)) {
        // Look for the first sussessor node that is less
        current = current.next;
      }
      let insertedLinkedNode;
      if (current === null) {
        rga.list.insert(node);
        insertedLinkedNode = rga.list.getTailNode();
      } else {
        const newLinkedNode = rga.list.createNewNode(node);
        const oldPrev = current.prev;
        oldPrev.next = newLinkedNode;
        newLinkedNode.prev = oldPrev;
        newLinkedNode.next = current;
        current.prev = newLinkedNode;
        insertedLinkedNode = newLinkedNode;
      }
      rga.chracterLinkedNodeMap.set(getIdForCharacterNode(node), insertedLinkedNode);
    }
    console.log("node inserted, ", { rga });
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

    if (type === "insert_text") {
      node.vectorClock.clock = { ...editor.vectorClock.clock };
      const paragraphPath = op.paragraphPath;
      const [paragraphNode, path] = Editor.node(editor, paragraphPath);
      /**@type {RGA} */
      const rga = paragraphNode.rga;
      // Look for the "insert after" node's id. If it is '', it means insert at the beginning
      let insertedLinkedNode;
      let insertAfterNode;
      // Insert to the end of the list as much as it can
      if (
        editor.selection &&
        Range.isCollapsed(editor.selection) &&
        Editor.isEnd(editor, Range.end(editor.selection), path) &&
        Node.string(paragraphNode).length === index + 1
      ) {
        rga.list.insert(node);
        insertedLinkedNode = rga.list.getTailNode();
        insertAfterNode = rga.list.getTailNode().prev;
      } else {
        // traverse through visible nodes
        insertedLinkedNode = rga.insertAtAndReturnNode(index, node);
        insertAfterNode = insertedLinkedNode.prev;
      }
      const insertAfterNodeId = insertAfterNode
        ? getIdForCharacterNode(insertAfterNode.data)
        : "";

      setInsertAfterNodeIdForCRDTOp(op, insertAfterNodeId);
      rga.chracterLinkedNodeMap.set(getIdForCharacterNode(node), insertedLinkedNode);
    }
    if (type === "remove_text") {
      const [paragraphNode, path] = Editor.node(editor, op.paragraphPath);
      /**@type {RGA} */
      const rga = paragraphNode.rga;
      const map = rga.chracterLinkedNodeMap;
      map.get(op.deletedNodeId).data.isTombStoned = true;
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
          setDeletedNodeIdForCRDTOp(crdtOp, getIdForCharacterNode(nodeToBeDeleted.data));
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
// Helper function that helps generate all unique keys from two clocks
function allKeys(a, b) {
  var last = null;
  return Object.keys(a)
    .concat(Object.keys(b))
    .sort()
    .filter(function (item) {
      // to make a set of sorted keys unique, just check that consecutive keys are different
      var isDuplicate = item == last;
      last = item;
      return !isDuplicate;
    });
}
// CRDTOperation Helpers
function setInsertAfterNodeIdForCRDTOp(crdtOp, insertAfterNodeId) {
  if (crdtOp.type !== 'insert_text') {
      throw Error("Wrong type of operation!")
  }
  crdtOp.insertAfterNodeId = insertAfterNodeId
}
function setDeletedNodeIdForCRDTOp(crdtOp, deletedNodeId) {
  crdtOp.deletedNodeId = deletedNodeId
}
// CharacterNode Helpers
function getIdForCharacterNode(chNode) {
  // An id is sum of the vector clock + peerId
  const {clock} = chNode.vectorClock
  let sum = 0
  Object.keys(clock).forEach(peerId => {
      sum += clock[peerId]
  })
  return `${sum}-${chNode.peerId}`
}

/**
* 
* @param {CharacterNode} otherCharNode 
*/
function isLargerThanForCharacterNode(chNode, otherCharNode) {
  const thisIdArray = getIdForCharacterNode(chNode).split('-')
  const otherIdArray = getIdForCharacterNode(otherCharNode).split('-')
  const isNumLarger = Number(thisIdArray[0]) > Number(otherIdArray[0])
  const isStrLarger = thisIdArray[1] > otherIdArray[1]
  return isNumLarger && isStrLarger
}