// Define custom rendering of different types of elements and text nodes (leaves)
import isHotkey from "is-hotkey";

import { DefaultElement } from "slate-react";
import { default as leafStyles } from "./Leaf.module.css";
import { default as elementStyles } from "./Element.module.css";
import { toggleStyle } from "../utility/EditorStyleUtils";
import { Image } from "../component/Image";

export function useRenderElement(editor) {
  editor.isInline = (elem) => ["link"].includes(elem.type);
  const { isVoid } = editor;
  editor.isVoid = (element) => {
    return ["image"].includes(element.type) || isVoid(element);
  };

  return { renderElement, renderLeaf, onKeyDown: onKeyDown(editor) };
}
function renderLeaf(props) {
  const { leaf, children, attributes } = props;
  let el = <>{children}</>;
  if (leaf.bold) {
    el = <strong>{el}</strong>;
  }
  if (leaf.code) {
    el = <code>{el}</code>;
  }
  if (leaf.italic) {
    el = <em>{el}</em>;
  }
  if (leaf.underline) {
    el = <u>{el}</u>;
  }
  if (leaf.superscript) {
    el = <sup>{el}</sup>;
  }
  if (leaf.subscript) {
    el = <sub>{el}</sub>;
  }
  if (leaf.strikethrough) {
    el = <strike>{el}</strike>;
  }

  return <span {...attributes}>{el}</span>;
}

function renderElement(props) {
  const { element, children, attributes } = props;

  switch (element.type) {
    case "paragraph":
      return (
        <p className={elementStyles.user} {...attributes}>
          {children}
        </p>
      );
    case "h1":
      return (
        <h1 className={elementStyles.user} {...attributes}>
          {children}
        </h1>
      );
    case "h2":
      return (
        <h2 className={elementStyles.user} {...attributes}>
          {children}
        </h2>
      );
    case "h3":
      return (
        <h3 className={elementStyles.user} {...attributes}>
          {children}
        </h3>
      );
    case "h4":
      return (
        <h4 className={elementStyles.user} {...attributes}>
          {children}
        </h4>
      );
    case "h5":
      return (
        <h5 className={elementStyles.user} {...attributes}>
          {children}
        </h5>
      );
    case "link":
      return (
        <a
          onClick={(e) => {
            if (e.ctrlKey) {
              window.open(element.url, "_blank");
            }
          }}
          {...attributes}
          className={elementStyles.user}
          href={element.url}
        >
          {children}
        </a>
      );
    case "img":
      return <Image {...props} />;
    default:
      // For the default case, we delegate to Slate's default rendering.
      return <DefaultElement {...props} />;
  }
}

function onKeyDown(editor) {
  return (event) => {
    if (isHotkey("mod+b", event)) {
      toggleStyle(editor, "bold");
    } else if (isHotkey("mod+i", event)) {
      toggleStyle(editor, "italic");
    } else if (isHotkey("mod+u", event)) {
      toggleStyle(editor, "underline");
    }
  };
}
