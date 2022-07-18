import isHotkey from "is-hotkey";
import { useCallback, useState } from "react";
import { Editor, Transforms } from "slate";
import { useSlateStatic } from "slate-react";

export const Image = ({ attributes, children, element }) => {
  const [caption, setCaption] = useState(element.caption);
  const [isEditingCaption, setIsEditingCaption] = useState(false);
  const editor = useSlateStatic();
  const applyCaptionChange = useCallback(
    (captionInput) => {
      const imageNodeEntry = Editor.above(editor, {
        match: (n) => n.type === "image",
      });
      if (imageNodeEntry == null) {
        return;
      }

      if (captionInput != null) {
        setCaption(captionInput);
      }

      Transforms.setNodes(
        editor,
        { caption: captionInput },
        { at: imageNodeEntry[1] }
      );
    },
    [editor, setCaption]
  );
  const onCaptionChange = useCallback(
    (event) => {
      setCaption(event.target.value);
    },
    [setCaption]
  );
  const onKeyDown = useCallback(
    (event) => {
      if (!isHotkey("enter", event)) {
        return;
      }

      applyCaptionChange(event.target.value);
      setIsEditingCaption(false);
    },
    [applyCaptionChange]
  );
  const onToggleCaptionEditMode = useCallback(
    (event) => {
      const wasEditing = isEditingCaption;
      setIsEditingCaption(!isEditingCaption);
      wasEditing && applyCaptionChange(caption);
    },
    [isEditingCaption, applyCaptionChange, caption]
  );
  return (
    <>
      <div {...attributes} contentEditable={false}>
        <div
          className={"image-container"}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: ".5em",
          }}
        >
          <img
            width={"100%"}
            src={String(element.url)}
            alt={element.caption}
            className={"image"}
          />
          {/* <input
            style={{fontSize: "1.2rem"}}
            onKeyDown={onKeyDown}
            onChange={onCaptionChange}
            onBlur={onToggleCaptionEditMode}
            autoFocus
            className="image-caption-input"
            value={caption}
          /> */}
          {isEditingCaption ? (
          <input
          style={{fontSize: "inherit"}}
            onKeyDown={onKeyDown}
            onChange={onCaptionChange}
            onBlur={onToggleCaptionEditMode}
            autoFocus
            className="image-caption-input"
            value={caption}
          />
        ) : (
          <div
            style={{ textAlign: "center", minHeight: "1rem", width: "100%" }}
            className={"image-caption-read-mode"}
            onClick={onToggleCaptionEditMode}
          >
            {caption || "Default Caption"}
          </div>
        )}
        </div>
        {/* {children} */}
      </div>
    </>
  );
};
