import HLC from "../utility/HybridLogicalClock"
import { CharacterNode } from "./CharacterNode"

export class CRDTOperation {
    constructor(type, node, index, paragraphPath) {
        this.type = type
        
        if (node)
            /**@type {CharacterNode} */
            this.node = node
        if (index > -1) this.index = index
        if (paragraphPath) this.paragraphPath = paragraphPath
    }
    setinsertAfterNodeId(insertAfterNodeId) {
        if (this.type !== 'insert_text') {
            throw Error("Wrong type of operation!")
        }
        this.insertAfterNodeId = insertAfterNodeId
    }
}