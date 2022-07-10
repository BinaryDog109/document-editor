import { useCallback, useState } from "react"
import areEqual from "deep-equal"

export const useSelection = editor => {
    // editor.selection is a Range
    const [selection, setSelection] = useState(editor.selection)
    const optimisedSetSelection = useCallback(
      (newSelectionState) => {
        // if the selection hasnt changed, it wont update the selectionState.
        if (areEqual(newSelectionState, selection)) {
            console.log("same selection")
            return
        }
        setSelection(newSelectionState)
      },
      [selection],
    )
    return [selection, optimisedSetSelection]
}