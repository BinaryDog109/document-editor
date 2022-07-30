import { createEditor, Editor, Node, Operation, Path, Transforms } from "slate";
import HLC from "../utility/HybridLogicalClock";
import { CRDTOperation } from "./CRDTOperation";
import vc from "vectorclock";
import { toJSON } from "./Utilities";
import { CharacterNode } from "./CharacterNode";
import LinkedList from "dbly-linked-list";

class JSONCRDT {
  /**
   *
   * @param {string} nodeId
   * @param {RTCDataChannel} dataChannel
   * @param {Array<Node>} children
   */
  constructor(nodeId, dataChannel, children) {
    this.nodeId = nodeId;
    this.document = createEditor();
    if (children) this.document.children = children;
    this.dataChannel = dataChannel;
    this.vectorClock = { clock: {} };
    // Setting rga for every paragraph
    Transforms.setNodes(
      this.document,
      { rga: new LinkedList() },
      {
        match: (n) => n.type === "paragraph",
        at: [],
      }
    );
  }

  /**
   *
   * @param {Operation[]} slateOps
   * @return {upstreamOperation}
   */
  mapOperationsFromSlate(slateOps) {
    const crdtOps = [];
    slateOps.forEach((slateOp) => {
      // Might get deleted
      this.document.apply(slateOp);
      if (slateOp.type !== "insert_text") return null;
      /**
       * Example:
       * {
        offset: 1
        path: (2) [0, 0]
        text: "a"
        type: "insert_text"
        }
       */
      if (slateOp.type === "insert_text") {
        const [paragraph] = findParagraphNodeEntryAt(
          this.document,
          slateOp.path
        );
        let actualOffset = findActualOffsetFromParagraphAt(this.document, {
          path: slateOp.path,
          offset: slateOp.offset,
        });
        /** @type {LinkedList} */
        const rga = paragraph.rga;
        if (!rga) paragraph.rga = [];
        const chars = slateOp.text.split("");
        chars.forEach((char) => {
          const characterNode = new CharacterNode(char, this.nodeId);

          const crdtOp = new CRDTOperation({
            type: slateOp.type,
            node: characterNode,
            index: actualOffset++,
          });
          crdtOps.push(crdtOp);
        });
      }
    });

    return crdtOps;
  }

  /**
   *
   * @param {Operation[]} slateOps
   */
  executeUpstreamSlateOp(slateOps) {
    const upstreamOperations = this.mapOperationFromSlate(slateOps);
    if (!upstreamOperations) return;
    upstreamOperations.forEach((op) => {
      const { type, node, index } = op;

      // increase local vector clock for every op
      vc.increment(this.vectorClock, this.nodeId);
      node.vectorClock = [...this.vectorClock];
      // send to downstream
      this.dataChannel.send(toJSON(op));
    });
  }
}

const findParagraphNodeEntryAt = (editor, path) => {
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
    if (Path.compare(path, point.path) === 1) {
      offset += Node.string(node).length;
    }
  }
  return offset;
};
