import HLC from "../utility/HybridLogicalClock"
import { CharacterNode } from "./CharacterNode"

export class CRDTOperation {
    constructor(type, node, index, paragraphPath, slateTargetPath, slateTargetOffset) {
        this.type = type
        
        if (node)
            /**@type {CharacterNode} */
            this.node = node
        if (index > -1) this.index = index
        if (paragraphPath) this.paragraphPath = paragraphPath
        if (slateTargetPath) this.slateTargetPath = slateTargetPath
        if (slateTargetOffset >= 0) this.slateTargetOffset = slateTargetOffset
    }
    
}