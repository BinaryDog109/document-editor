/**
 * Handles initial setup for the editor and downstream handlers
 */
import {
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
import vc from "vectorclock";
// import FastList from "fast-list";
import LinkedList from "dbly-linked-list";
import {
  overwriteInsertBreak,
  overwriteNormaliseNode,
  overwriteOnChange,
} from "./editor-overwrite-helpers";
import {
  findParagraphEntryFromId,
  findTextPathFromActualOffsetOfParagraphPath,
  isLargerThanForCharacterNode,
  isOneOfParagraphTypes,
  setCharacterId,
} from "./utilities";
import { initCausalOrderQueueForEditor } from "./causal-order-helpers";

export class RGA {
  constructor() {
    Object.defineProperty(this, "list", {
      value: 0, // better than `undefined`
      writable: true, // important!
      enumerable: false,
      configurable: true, // nice to have
    });
    Object.defineProperty(this, "chracterLinkedNodeMap", {
      value: 0, // better than `undefined`
      writable: true, // important!
      enumerable: false,
      configurable: true, // nice to have
    });
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
  findVisibleIndexOf(linkedNode) {
    this.list.iterator.reset();
    var current;

    var index = 0;

    // iterate over the list (keeping track of the index value) until
    // we find the node containg the nodeData we are looking for
    while (this.list.iterator.hasNext()) {
      current = this.list.iterator.next();
      if (linkedNode === current) {
        return index;
      }
      if (current && !current.data.isTombStoned) index += 1;
    }

    // only get here if we didn't find a node containing the nodeData
    return -1;
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
  downStreamInsert(node, referenceLinkedNode, crdtOp) {
    const oldNextLinkedNode =
      referenceLinkedNode !== ""
        ? referenceLinkedNode.next
        : this.list.getHeadNode();
    let current = oldNextLinkedNode;
    console.log("The ref node's next: ", current);
    while (
      current !== null &&
      isLargerThanForCharacterNode(current.data, node)
    ) {
      // Look for the first sussessor node that is less
      current = current.next;
    }
    let insertedLinkedNode;
    if (current === null) {
      this.list.insert(node);
      insertedLinkedNode = this.list.getTailNode();
    } else {
      const newLinkedNode = this.list.createNewNode(node);
      const oldPrev = current.prev;
      if (oldPrev === null) {
        this.list.insertFirst(node);
        insertedLinkedNode = this.list.getHeadNode();
      } else {
        oldPrev.next = newLinkedNode;
        newLinkedNode.prev = oldPrev;
        newLinkedNode.next = current;
        current.prev = newLinkedNode;
        insertedLinkedNode = newLinkedNode;
        this.list.size++;
      }
    }
    this.chracterLinkedNodeMap.set(node.id, insertedLinkedNode);
    // Append the updated visible index of this operation
    crdtOp.index = this.findVisibleIndexOf(insertedLinkedNode);
  }
}

/**
 *
 * @param {Editor} editor
 */
export const CRDTify = (editor, peerId, dataChannel) => {
  initCausalOrderQueueForEditor(editor);
  // Every peer keeps a map for paragraphs
  Object.defineProperty(editor, "paragraphRGAMap", {
    value: new Map(),
    writable: true,
    enumerable: false,
    configurable: true,
  });

  // Initialise HLC clock
  editor.paragraphHLC = HLC.init(editor.peerId, performance.now());
  editor.peerId = peerId;
  editor.vectorClock = { clock: {} };
  // Setting rga & id to be '' for the initial paragraph. There should only be one paragraph with id ''
  const initParagraphId = "";
  Transforms.setNodes(
    editor,
    { rga: new RGA(), id: initParagraphId },
    {
      match: (n) => n.type === "paragraph" && !n.id,
      at: [],
    }
  );
  const [paragraph] = Editor.node(editor, [0]);
  editor.paragraphRGAMap.set(initParagraphId, paragraph.rga);

  overwriteNormaliseNode(editor);
  overwriteInsertBreak(editor);
  overwriteOnChange(editor);
};

/**
 * Downstream handlers
 */

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
    paragraphId
  } = crdtOp;

  // merge remote with local vector clock, increment it
  editor.vectorClock = vc.merge(editor.vectorClock, remoteVectorClock);
  vc.increment(editor.vectorClock, editor.peerId);
  if (type === "insert_text") {
    const [paragraph, paragraphPath] = findParagraphEntryFromId(editor, paragraphId)
    // For upcoming inserting nodes, update their character id
    // setCharacterId(node, editor)
    // Locate the paragraph's rga this node was inserted in
    /**@type {RGA} */
    const rga = paragraph.rga
    
    // console.log("Insertion crdtOp: ", { ...crdtOp });
    if (insertAfterNodeId === "") {
      // '' means insert after head
      const head = rga.list.getHeadNode();
      if (!head) {
        rga.list.insertFirst(node);
        rga.chracterLinkedNodeMap.set(node.id, rga.list.getHeadNode());
      } else {
        // If there is only one element, make '' to be the reference node
        rga.downStreamInsert(node, "", crdtOp);
      }
    } else {
      // Retreive reference node from the map
      const insertAfterLinkedNode =
        rga.chracterLinkedNodeMap.get(insertAfterNodeId);
      rga.downStreamInsert(node, insertAfterLinkedNode, crdtOp);
    }
  } else if (type === "remove_text") {
    // console.log("deletion crdtOp: ", { ...crdtOp });
    const [paragraphNode, path] = findParagraphEntryFromId(editor, paragraphId)
    /**@type {RGA} */
    const rga = paragraphNode.rga;
    const map = rga.chracterLinkedNodeMap;
    const deleteNode = map.get(crdtOp.deletedNodeId);
    // If before the remote changes, the user has already deleted it
    if (deleteNode.data.isTombStoned) {
      crdtOp.alreadyDeleted = true;
    } else {
      // Before deletion, update its visible ID so that slate operation can locate it correctly
      crdtOp.index = rga.findVisibleIndexOf(deleteNode);
      deleteNode.data.isTombStoned = true;
      rga.list.tombStoneCount++;
    }
  } else if (type === "insert_paragraph") {
    const id = node.id;
    // After JSON.stringify, we need to re-assign RGA to the paragraph node
    node.rga = new RGA();
    editor.paragraphRGAMap.set(id, node.rga);
    // console.log("paragraph inserted to map");
  } else if (type === "change_paragraph_type") {
    const { paragraphHLC } = crdtOp;

    // If remote has larger HLC, accept the remote change
    if (HLC.compare(paragraphHLC, editor.paragraphHLC) > 0) {
      crdtOp.acceptChange = true;
    }
    // Merge and update current HLC
    editor.paragraphHLC = HLC.receive(
      editor.paragraphHLC,
      paragraphHLC,
      performance.now()
    );
  }
  return crdtOp;
}

export function mapSingleOperationFromCRDT(editor, crdtOp) {
  const {
    type,
    index,
    insertAfterNodeId,
    node,
    paragraphPath,
    slateTargetPath,
    vectorClock: remoteVectorClock,
    paragraphId
  } = crdtOp;
  console.log("Here is the crdtOp I received, ", { ...crdtOp });

  const slateOps = [];
  if (type === "insert_text") {
    const [paragraph, paragraphPath] = findParagraphEntryFromId(editor, paragraphId)
    let [textPath, actualTextOffset] = findTextPathFromActualOffsetOfParagraphPath(
      editor,
      paragraphPath,
      index
    );
    
    // let textPath = [...slateTargetPath];
    // console.log({textPath, _})
    // If this text node hasnt been deleted beforehand
    if (Editor.node(editor, textPath)) {
      const slateOp = {
        // No problem when offset is very big
        offset: actualTextOffset,
        path: textPath,
        text: node.char,
        type: "insert_text",
        // Added isRemote flag so slatejs onChange wont modify the linked list again
        isRemote: true,
      };
      slateOps.push(slateOp);
    } else {
      // If this text node has been deleted, loop until it finds its previous text node. Offset doesnt matter here.
      while (Path.hasPrevious(textPath)) {
        textPath = Path.previous(textPath);
      }
      const slateOp = {
        node: { text: node.char },
        path: textPath,
        // Use insert_node operation for more general purpose insertion
        // ! Maybe include mark information later
        type: "insert_node",
        isRemote: true,
      };
      slateOps.push(slateOp);
    }
  } else if (type === "remove_text") {
    if (crdtOp.alreadyDeleted) {
      return slateOps;
    }
    const [paragraph, paragraphPath] = findParagraphEntryFromId(editor, paragraphId)
    const [textPath, actualTextOffset] = findTextPathFromActualOffsetOfParagraphPath(
      editor,
      paragraphPath,
      index
    );
    // let textPath = [...slateTargetPath];
    const textOffset = actualTextOffset;
    // Only deletes it when it exists
    if (Editor.node(editor, textPath)) {
      const slateOp = {
        offset: textOffset,
        path: textPath,
        text: node.char,
        type: "remove_text",
        isRemote: true,
      };
      slateOps.push(slateOp);
    }
  } else if (type === "insert_paragraph") {
    let insertPath = [...slateTargetPath];
    while (Path.hasPrevious(insertPath)) {
      insertPath = Path.previous(insertPath);
    }

    const slateOp = {
      node: node,
      path: slateTargetPath,
      type: "insert_node",
      isRemote: true,
    };
    slateOps.push(slateOp);
  } else if (type === "change_paragraph_type") {
    const { newParagraphType } = crdtOp;
    if (!crdtOp.acceptChange) {
      return slateOps
    }
    const [paragraph, paragraphPath] = findParagraphEntryFromId(editor, paragraphId)
    const slateOp = {
      path: paragraphPath,
      newProperties: { type: newParagraphType },
      type: "set_node",
      isRemote: true,
    };
    slateOps.push(slateOp);
  }
  return slateOps;
}
