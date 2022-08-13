import { useEffect, useState } from "react";
import { Range } from "slate";
import { ReactEditor, useSlateStatic } from "slate-react";
import styles from "./RemoteCursor.module.css";

export const RemoteCursor = ({ selection, chatId }) => {
  const editor = useSlateStatic();
  const [cursorRect, setCursorRect] = useState(null);
  const [cursorFontSize, setCursorFontSize] = useState(null);
//   console.log("Inside remoteCursor", editor);
  //   console.log({cursorRect, chatId})
  useEffect(() => {
    if (selection && Range.isCollapsed(selection)) {
      const domRange = ReactEditor.toDOMRange(editor, selection);
      const rect = domRange.getBoundingClientRect();
      const parentElem = domRange.commonAncestorContainer.parentElement;
      setCursorFontSize(getComputedStyle(parentElem).fontSize);
      setCursorRect(rect);
    } else {
      setCursorRect(null);
    }
  }, [editor, selection]);

  return (
    cursorRect && (
      <span
        className={styles["remote-cursor"]}
        data-label={chatId}
        style={{
          display: "inline-block",
          position: "absolute",
          top: cursorRect.top,
          left: cursorRect.left,
          width: "2px",
          height: cursorFontSize || "1.2em",
          backgroundColor: "var(--primary-color)",
          pointerEvents: "none",
        }}
      ></span>
    )
  );
};
