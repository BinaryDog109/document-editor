// Define custom rendering of different types of elements and text nodes (leaves)
import { DefaultElement } from "slate-react";
import {default as leafStyles} from "./Leaf.module.css"
import {default as elementStyles} from "./Element.module.css"

export function useRenderElement(editor) {
  return { renderElement, renderLeaf };
}
function renderLeaf(props) {
    const { leaf, children, attributes } = props;
    let el = <>{children}</>
    if (leaf.bold) {
        el = <strong>{el}</strong>
    }
    if (leaf.code) {
        el = <code>{el}</code>
    }
    if (leaf.italic) {
        el = <em>{el}</em>
    }
    if (leaf.underline) {
        el = <u>{el}</u>
    }

    return <span {...attributes}>{el}</span>
}

function renderElement(props) {
  const { element, children, attributes } = props;

  switch (element.type) {
    case "paragraph":
      return <p className={elementStyles.user} {...attributes}>{children}</p>;
    case "h1":
      return <h1 className={elementStyles.user} {...attributes}>{children}</h1>;
    case "h2":
      return <h2 className={elementStyles.user} {...attributes} >{children}</h2>;
    case "h3":
      return <h3 className={elementStyles.user} {...attributes}>{children}</h3>;
    case "h4":
      return <h4 className={elementStyles.user} {...attributes}>{children}</h4>;
    default:
      // For the default case, we delegate to Slate's default rendering.
      return <DefaultElement {...props} />;
  }
}
