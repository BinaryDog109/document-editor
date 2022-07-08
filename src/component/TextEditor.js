// Import the Slate editor factory.
import styles from "./TextEditor.module.css"
import { useCallback, useMemo, useState } from "react";
import { createEditor } from "slate";
// Import the `Editor` and `Transforms` helpers from Slate.
import { Editor, Transforms } from 'slate'

// Import the Slate components and React plugin.
import { Slate, Editable, withReact } from "slate-react";

 
import { useRenderElement } from "../hooks/useRenderElement";

export const TextEditor = ({document, onChange}) => {
    const editor = useMemo(() => withReact(createEditor()), []);
    const { renderElement, renderLeaf } = useRenderElement(editor)

  return <div className={styles["editable-container"]}>
    {/* We use onChange so that our document will also change */}
    <Slate editor={editor} value={document} onChange={onChange}>
      <Editable renderElement={renderElement} renderLeaf={renderLeaf} />
    </Slate>
  </div>
};
