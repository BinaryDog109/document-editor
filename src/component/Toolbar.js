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
import { Editor } from "slate";
import { isOneOfParagraphTypes } from "../crdt/utilities";

export const Toolbar = ({ selection }) => {
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
        onMouseDown={() => {
          try {
            // const op = {
            //   type: "merge_node",
            //   path: [1],
            //   position: 1,
            // };
            // const op2 = {
            //   path: [1],
            //   position: 1,
            //   properties: {},
            //   type: "merge_node",
            // };
            // editor.apply(op);
            // editor.apply(op2);
            const [node] = Editor.nodes(editor, {
              match: n => isOneOfParagraphTypes(n) && n.id==='',
              mode: 'highest',
              at: []
            })
            console.log(node)
          } catch (error) {
            console.log(error.message);
          }
        }}
      >
        Test Button
      </button>
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

      <button
        title="Superscript"
        onMouseDown={(e) => handleMouseDown(e, "superscript")}
        id="superscript"
        className={`${styles["operation-button"]} script ${
          isStyleActive(editor, "superscript") ? styles.active : ""
        }`}
      >
        <i className="fa-solid fa-superscript"></i>
      </button>
      <button
        title="Subscript"
        onMouseDown={(e) => handleMouseDown(e, "subscript")}
        id="subscript"
        className={`${styles["operation-button"]} script ${
          isStyleActive(editor, "subscript") ? styles.active : ""
        }`}
      >
        <i className="fa-solid fa-subscript"></i>
      </button>

      {/* <!-- List operations --> */}
      {/* <button id="insertOrderedList" className="${styles["operation-button"]}">
        <i className="fa-solid fa-list-ol"></i>
      </button>
      <button id="insertUnorderedList" className="${styles["operation-button"]}">
        <i className="fa-solid fa-list-ul"></i>
      </button>

      <button id="undo" className="${styles["operation-button"]}">
        <i className="fa-solid fa-rotate-left"></i>
      </button>
      <button id="redo" className="${styles["operation-button"]}">
        <i className="fa-solid fa-rotate-right"></i>
      </button> */}
      {/* <!-- Link operations --> */}
      <button
        title="Toggle Link"
        onMouseDown={() => {
          toggleLinkNode(editor);
        }}
        id="createLink"
        className={`${styles["operation-button"]} ${
          isOnLinkNode(editor, editor.selection) ? styles.active : ""
        }`}
      >
        <i className="fa-solid fa-link"></i>
      </button>

      {/* <!-- Alignment --> */}
      {/* <button id="justifyLeft" className="align ${styles["operation-button"]}">
        <i className="fa-solid fa-align-left"></i>
      </button>
      <button id="justifyCenter" className="align ${styles["operation-button"]}">
        <i className="fa-solid fa-align-center"></i>
      </button>
      <button id="justifyRight" className="align ${styles["operation-button"]}">
        <i className="fa-solid fa-align-right"></i>
      </button>
      <button id="justifyFull" className="align ${styles["operation-button"]}">
        <i className="fa-solid fa-align-justify"></i>
      </button>

      <button id="indent" className="spacing ${styles["operation-button"]}">
        <i className="fa-solid fa-indent"></i>
      </button>
      <button id="outdent" className="spacing ${styles["operation-button"]}">
        <i className="fa-solid fa-outdent"></i>
      </button> */}

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
      {/* <!-- Fonts --> */}
      {/* <select className="operation-selection" name="" id="fontName"></select>
      <select className="operation-selection" name="" id="fontSize"></select> */}
      {/* <!-- Colors --> */}
      {/* <div className={styles["input-wrapper"]}>
        <input
          type="color"
          name=""
          id="foreColor"
          className="operation-input"
        />
        <label htmlFor="font-color">Font Color</label>
      </div>
      <div className={styles["input-wrapper"]}>
        <input
          type="color"
          name=""
          id="backColor"
          className="operation-input"
        />
        <label htmlFor="highlight-color">Highlight Color</label>
      </div> */}
    </div>
  );
};
