import { useCallback, useRef, useState } from "react"
import areEqual from "deep-equal"

export const useSelection = editor => {
    // editor.selection is a Range
    const [selection, setSelection] = useState(editor.selection)
    const prevSelectionRef = useRef(null)
    const optimisedSetSelection = useCallback(
      (newSelectionState) => {
        // if the selection hasnt changed, it wont update the selectionState.
        if (areEqual(newSelectionState, selection)) {
            console.log("same selection")
            return
        }
        // also remembers previous selection
        prevSelectionRef.current = selection
        setSelection(newSelectionState)
        
      },
      [selection],
    )
    return [prevSelectionRef.current, selection, optimisedSetSelection]
}