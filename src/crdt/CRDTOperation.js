import HLC from "../utility/HybridLogicalClock"

export class CRDTOperation {
    constructor(type, node, index) {
        this.type = type
        if (node) this.node = node
        if (index) this.index = index
    }
}