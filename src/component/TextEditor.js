// Import the Slate editor factory.
import styles from "./TextEditor.module.css";
import { useCallback, useMemo, useState } from "react";
import { createEditor } from "slate";
// Import the `Editor` and `Transforms` helpers from Slate.
import { Editor, Transforms, Text } from "slate";

// Import the Slate components and React plugin.
import { Slate, Editable, withReact } from "slate-react";

import { useRenderElement } from "../hooks/useRenderElement";
import { useSelection } from "../hooks/useSelection";
import { Toolbar } from "./Toolbar";
import { LinkUpdateCard } from "./LinkUpdateCard";
import { isOnLinkNode } from "../utils/EditorStyleUtils";

export const TextEditor = ({ document, onChange, editorRef }) => {
  const editor = useMemo(() => withReact(createEditor()), []);
  const { renderElement, renderLeaf, onKeyDown } = useRenderElement(editor);
  const [prevSelection, selection, setSelection] = useSelection(editor);

  const onChangeHandler = useCallback(
    (e) => {
      console.log("document change!", e)
      const document = e;
      onChange(document);
      setSelection(editor.selection);
    },
    [onChange, setSelection, editor.selection]
  );
    // If when we edit the link on the card the selection loses, we still remember the previous one.
    // However, when I tested it, the selection does not lose but the cursor is gone.
  const linkSelection = (!selection && isOnLinkNode(editor, prevSelection))? prevSelection :
    isOnLinkNode(editor, selection)? selection : null;
  return (
    /* We use onChange so that our document will also change. */
    /* onChange will get called when selection changes (even if it is just moving the cursor) */
    /* The event obj is an array of every node */
    /* <Slate editor={editor} value={document} onChange={(e) => { console.log(editor.selection); onChange(e)}}> */
    <Slate editor={editor} value={document} onChange={onChangeHandler}>
      {isOnLinkNode(editor, linkSelection) && editorRef.current? <LinkUpdateCard linkSelection={linkSelection} editorDOM={editorRef.current} /> : null}
      <Toolbar selection={selection} />
      <div className={styles["editable-container"]}>
        <Editable
          renderElement={renderElement}
          renderLeaf={renderLeaf}
          onKeyDown={onKeyDown}
        />
      </div>
    </Slate>
  );
};
