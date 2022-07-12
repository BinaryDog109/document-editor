import isUrl from "is-url";
import { useEffect, useRef, useState } from "react";
import { Editor, Transforms } from "slate";
import { useSlateStatic } from "slate-react";
import { ReactEditor } from "slate-react";

import styles from "./LinkUpdateCard.module.css";

export const LinkUpdateCard = ({ editorDOM, linkSelection }) => {
  const linkCardRef = useRef(null);
  const editor = useSlateStatic();

  const editorX = editorDOM.getBoundingClientRect().x;
  const editorY = editorDOM.getBoundingClientRect().y;

  let [linkNode, path] = Editor.parent(editor, linkSelection);
  const [node, nodePath] = Editor.node(editor, linkSelection);
  // if select in range of all the text in a link node (considered to be selecting the link node)
  if (linkNode.type !== "link" && node.type === "link") {
    linkNode = node;
    path = nodePath;
  }

  const [linkNodeURL, setLinkNodeURL] = useState(linkNode.url);
  // console.log({linkNodeURL, linkNode})
  useEffect(() => {
    // When user jumps between different links or select in range of all the text in a link node (considered to be selecting the link node)
    // Otherwise the state will not change
    setLinkNodeURL(linkNode.url);
  }, [linkNode]);
  useEffect(() => {
    //   run after render so the ref works
    const linkCardDOM = linkCardRef.current;
    const linkDOM = ReactEditor.toDOMNode(editor, linkNode);
    const { x, y, height } = linkDOM.getBoundingClientRect();
    linkCardDOM.style.left = `${x - editorX}px`;
    linkCardDOM.style.top = `${y + height - editorY}px`;
  }, [editor, editorY, editorX, linkNode]);
  const onUpdate = (e) => {
    Transforms.setNodes(editor, { url: linkNodeURL }, { at: path });
  };
  const onChange = (e) => {
    setLinkNodeURL(e.target.value);
  };
  return (
    <div ref={linkCardRef} className={styles["link-card"]}>
      <input
        placeholder="Enter a URL..."
        type="url"
        value={linkNodeURL || ""}
        onChange={onChange}
      />
      <div className={styles["link-card-action"]}>
        <button onClick={onUpdate} disabled={!isUrl(linkNodeURL)}>
          Update
        </button>
      </div>
    </div>
  );
};
