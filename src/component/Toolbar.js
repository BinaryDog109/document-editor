import styles from "./Toolbar.module.css";
import { isStyleActive, toggleStyle, getTopLevelBlockStyles, setTopLevelBlockStyles } from "../utils/EditorStyleUtils";
import { useSlateStatic } from "slate-react";

export const Toolbar = ({ selection }) => {
  const editor = useSlateStatic();
  const blockType = getTopLevelBlockStyles(editor)

  const handleMouseDown = (e, booleanStyle) => {
    e.preventDefault();
    toggleStyle(editor, booleanStyle);
  };
  const onTopBlockStylesChange = e => {
    const selectedStyle = e.target.value
    if (selectedStyle === "multiple") return 
    setTopLevelBlockStyles(editor, selectedStyle)
  }
  return (
    <div className={styles.toolbar}>
      <button
        id="bold"
        onMouseDown={
          // we use onMouseDown instead of onClick because
          // clilicking will make Slate turns the selection to null when the editor loses focus in any way.
          (e) => handleMouseDown(e, "bold")
        }
        className={`operation-button format ${isStyleActive(editor, "bold")? styles.active:''}`}
      >
        <i className="fa-solid fa-bold"></i>
      </button>
      <button
        id="italic"
        onMouseDown={(e) => handleMouseDown(e, "italic")}
        className={`operation-button format ${isStyleActive(editor, "italic")? styles.active:''}`}
      >
        <i className="fa-solid fa-italic"></i>
      </button>
      <button
        id="underline"
        onMouseDown={(e) => handleMouseDown(e, "underline")}
        className={`operation-button format ${isStyleActive(editor, "underline")? styles.active:''}`}
      >
        <i className="fa-solid fa-underline"></i>
      </button>
      <button
        id="code"
        onMouseDown={(e) => handleMouseDown(e, "code")}
        className={`operation-button format ${isStyleActive(editor, "code")? styles.active:''}`}
      >
        <i className="fa-solid fa-code"></i>
      </button>
      <button id="strikethrough" className={`operation-button format ${isStyleActive(editor, "strikethrough")? styles.active:''}`}>
        <i className="fa-solid fa-strikethrough"></i>
      </button>

      <button id="superscript" className="operation-button script">
        <i className="fa-solid fa-superscript"></i>
      </button>
      <button id="subscript" className="operation-button script">
        <i className="fa-solid fa-subscript"></i>
      </button>
      {/* <!-- List operations --> */}
      {/* <button id="insertOrderedList" className="operation-button">
        <i className="fa-solid fa-list-ol"></i>
      </button>
      <button id="insertUnorderedList" className="operation-button">
        <i className="fa-solid fa-list-ul"></i>
      </button>

      <button id="undo" className="operation-button">
        <i className="fa-solid fa-rotate-left"></i>
      </button>
      <button id="redo" className="operation-button">
        <i className="fa-solid fa-rotate-right"></i>
      </button> */}
      {/* <!-- Link operations --> */}
      <button id="createLink" className="adv-operation-button">
        <i className="fa-solid fa-link"></i>
      </button>
      <button id="unlink" className="operation-button">
        <i className="fa-solid fa-unlink"></i>
      </button>

      {/* <!-- Alignment --> */}
      {/* <button id="justifyLeft" className="align operation-button">
        <i className="fa-solid fa-align-left"></i>
      </button>
      <button id="justifyCenter" className="align operation-button">
        <i className="fa-solid fa-align-center"></i>
      </button>
      <button id="justifyRight" className="align operation-button">
        <i className="fa-solid fa-align-right"></i>
      </button>
      <button id="justifyFull" className="align operation-button">
        <i className="fa-solid fa-align-justify"></i>
      </button>

      <button id="indent" className="spacing operation-button">
        <i className="fa-solid fa-indent"></i>
      </button>
      <button id="outdent" className="spacing operation-button">
        <i className="fa-solid fa-outdent"></i>
      </button> */}

      {/* <!-- Headings --> */}
      <select onChange={onTopBlockStylesChange} value={blockType || "multiple"} className="adv-operation-button" name="" id="formatBlock">
        <option value="paragraph">Paragraph</option>
        <option value="h1">H1</option>
        <option value="h2">H2</option>
        <option value="h3">H3</option>
        <option value="h4">H4</option>
        <option value="h5">H5</option>
        <option disabled value="multiple">Unknown</option>
      </select>
      {/* <!-- Fonts --> */}
      <select className="adv-operation-button" name="" id="fontName"></select>
      <select className="adv-operation-button" name="" id="fontSize"></select>
      {/* <!-- Colors --> */}
      <div className={styles["input-wrapper"]}>
        <input
          type="color"
          name=""
          id="foreColor"
          className="adv-operation-button"
        />
        <label htmlFor="font-color">Font Color</label>
      </div>
      <div className={styles["input-wrapper"]}>
        <input
          type="color"
          name=""
          id="backColor"
          className="adv-operation-button"
        />
        <label htmlFor="highlight-color">Highlight Color</label>
      </div>
    </div>
  );
};
