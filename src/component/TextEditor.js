// Import the Slate editor factory.
import styles from "./TextEditor.module.css";
import { useCallback, useMemo, useState } from "react";
import { createEditor } from "slate";
// Import the `Editor` and `Transforms` helpers from Slate.
import { Editor, Transforms, Text } from "slate";

// Import the Slate components and React plugin.
import { Slate, Editable, withReact } from "slate-react";

import { useRenderElement } from "../hooks/useRenderElement";

export const TextEditor = ({ document, onChange }) => {
  const editor = useMemo(() => withReact(createEditor()), []);
  const { renderElement, renderLeaf } = useRenderElement(editor);

  return (
    <div className={styles["editable-container"]}>
      {/* We use onChange so that our document will also change */}
      <Slate editor={editor} value={document} onChange={onChange}>
        <Editable
          renderElement={renderElement}
          renderLeaf={renderLeaf}
          onKeyDown={(event) => {
            if (event.key === "`" && event.ctrlKey) {
              event.preventDefault();
              // It will traverse from root to the current node you are at, like a tree, and return the generator
              // (in terms of [[node1, postiion], [node2, position2], ...])
              // The match option will traverse each node (node1, node2, ...).
              // We will check if the nodes along the path are text nodes (leaves) and has .code to be true
              const generator = Editor.nodes(editor, {
                match: (n) => Text.isText(n) && n.code
              });
              const matchExists = !generator.next().done;
              Transforms.setNodes(
                editor,
                { code: matchExists ? false : true },
                { match: (n) => Text.isText(n), split: true }
              );
            }
          }}
        />
      </Slate>
    </div>
  );
};
