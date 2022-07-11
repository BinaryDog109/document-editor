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
  const [linkNode, path] = Editor.above(editor, {
    match: (n) => n.type === "link",
    at: linkSelection
  });
  const [linkNodeURL, setLinkNodeURL] = useState(linkNode.url)
  
  useEffect(() => {
    // When user jumps between different links
    setLinkNodeURL(linkNode.url)
  }, [linkNode])
  useEffect(() => {
    //   run after render so the ref works
    const linkCardDOM = linkCardRef.current;
    const linkDOM = ReactEditor.toDOMNode(editor, linkNode);
    const { x, y, height } = linkDOM.getBoundingClientRect();
    linkCardDOM.style.left = `${x - editorX}px`;
    linkCardDOM.style.top = `${y + height - editorY}px`;
  }, [editor, editorY, editorX, linkNode]);
  const onUpdate = e => {
    Transforms.setNodes(editor, { url: linkNodeURL }, { at: path });
  }
  const onChange = e => {
    setLinkNodeURL(e.target.value)
  }
  return (
    <div ref={linkCardRef} className={styles["link-card"]}>
      <input placeholder="Enter a URL..." type="url" value={linkNodeURL} onChange={onChange} />
      <div className={styles["link-card-action"]}>
        <button onClick={onUpdate} disabled={!isUrl(linkNodeURL)}>Update</button>
      </div>
    </div>
  );
};
