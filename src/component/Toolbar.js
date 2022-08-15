import styles from "./Toolbar.module.css";
import {
  isStyleActive,
  toggleStyle,
  getTopLevelBlockStyles,
  setTopLevelBlockStyles,
  isOnLinkNode,
  toggleLinkNode,
} from "../utility/EditorStyleUtils";
import { useSlateStatic } from "slate-react";
import { Editor, Transforms } from "slate";
import {
  findActualOffsetFromParagraphAt,
  isOneOfParagraphTypes,
} from "../crdt/utilities";
import { RoomPanel } from "./RoomPanel";
import { RGA } from "../crdt/JSONCRDT";
import cuid from "cuid";

export const Toolbar = ({
  selection,
  CRDTSyncStatus,
  bufferModeActivated,
  setBufferModeActivated,
}) => {
  const editor = useSlateStatic();

  // ==================

  const blockType = getTopLevelBlockStyles(editor);

  const handleMouseDown = (e, booleanStyle) => {
    e.preventDefault();
    toggleStyle(editor, booleanStyle);
  };
  const onTopBlockStylesChange = (e) => {
    const selectedStyle = e.target.value;
    if (selectedStyle === "multiple") return;
    setTopLevelBlockStyles(editor, selectedStyle);
  };
  return (
    <div className={styles.toolbar}>
      <button
        style={{ display: "none" }}
        onMouseDown={() => {
          try {
            Editor.withoutNormalizing(editor, () => {
              // Handling the text node properties
              const op1 = {
                path: [0, 0],
                position: 2,
                properties: {},
                type: "split_node",
              };
              // Handling the previous paragraph properties
              const op2 = {
                path: [0],
                position: 1,
                type: "split_node",
              };
              // Handling the new paragraph properties
              const op3 = {
                newProperties: { id: cuid(), rga: new RGA() },
                path: [1],
                type: "set_node",
              };

              editor.apply(op1);
              editor.apply(op2);
              editor.apply(op3);
            });
          } catch (error) {
            console.log(error.message);
          }
        }}
      >
        Test Button
      </button>
      <span
        style={{
          backgroundColor: "var(--info-color)",
          color: "var(--primary-color)",
          borderRadius: "1em",
          padding: "0.5em",
        }}
      >
        {CRDTSyncStatus}
      </span>
      <div style={{ marginRight: "2em", display: "flex", gap: ".5em" }}>
        <RoomPanel
          bufferModeActivated={bufferModeActivated}
          setBufferModeActivated={setBufferModeActivated}
        />
      </div>
      <button
        title="Bold"
        id="bold"
        onMouseDown={
          // we use onMouseDown instead of onClick because
          // clilicking will make Slate turns the selection to null when the editor loses focus in any way.
          (e) => handleMouseDown(e, "bold")
        }
        className={`${styles["operation-button"]} format ${
          isStyleActive(editor, "bold") ? styles.active : ""
        }`}
      >
        <i className="fa-solid fa-bold"></i>
      </button>
      <button
        title="Italic"
        id="italic"
        onMouseDown={(e) => handleMouseDown(e, "italic")}
        className={`${styles["operation-button"]} format ${
          isStyleActive(editor, "italic") ? styles.active : ""
        }`}
      >
        <i className="fa-solid fa-italic"></i>
      </button>
      <button
        title="Underline"
        id="underline"
        onMouseDown={(e) => handleMouseDown(e, "underline")}
        className={`${styles["operation-button"]} format ${
          isStyleActive(editor, "underline") ? styles.active : ""
        }`}
      >
        <i className="fa-solid fa-underline"></i>
      </button>
      <button
        title="Code"
        id="code"
        onMouseDown={(e) => handleMouseDown(e, "code")}
        className={`${styles["operation-button"]} format ${
          isStyleActive(editor, "code") ? styles.active : ""
        }`}
      >
        <i className="fa-solid fa-code"></i>
      </button>
      <button
        title="Strikethrough"
        onMouseDown={(e) => handleMouseDown(e, "strikethrough")}
        id="strikethrough"
        className={`${styles["operation-button"]} format ${
          isStyleActive(editor, "strikethrough") ? styles.active : ""
        }`}
      >
        <i className="fa-solid fa-strikethrough"></i>
      </button>

      {/* <!-- Headings --> */}
      <select
        onChange={onTopBlockStylesChange}
        value={blockType || "multiple"}
        className="operation-selection"
        name=""
        id="formatBlock"
      >
        <option value="paragraph">Paragraph</option>
        <option value="h1">Heading 1</option>
        <option value="h2">Heading 2</option>
        <option value="h3">Heading 3</option>
        <option value="h4">Heading 4</option>
        <option value="h5">Heading 5</option>
        <option disabled value="multiple">
          Unknown
        </option>
      </select>
    </div>
  );
};
