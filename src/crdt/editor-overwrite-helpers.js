import cuid from "cuid";
import { Editor, Element, Transforms } from "slate";
import { RGA } from "./JSONCRDT";
import { bufferCRDTOperation, executeUpstreamCRDTOps, mapOperationsFromSlate } from "./upstream-slate-helpers";

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
      const [nodes] = Editor.nodes(editor, {
        match: (n) =>
          !Editor.isEditor(n) && Element.isElement(n) && n.type === "paragraph",
      });

      if (nodes) {
        const id = cuid();
        const newParagraph = {
          children: [{ text: "" }],
          type: "paragraph",
          id,
          rga: new RGA(),
        };
        Transforms.insertNodes(editor, newParagraph);
        editor.paragraphRGAMap &&
          editor.paragraphRGAMap.set(id, newParagraph.rga);
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
    const crdtOps = mapOperationsFromSlate(editor, operations);
    const readyCRDTOps = executeUpstreamCRDTOps(editor, crdtOps);
    console.log({ readyCRDTOps });
    if (crdtOps)
      readyCRDTOps.forEach((crdtOp) => {
        // Send to buffer
        bufferCRDTOperation(editor, crdtOp);
      });
    console.log({ buffer: editor.crdtOpBuffer });
    onChange();
  };
}

