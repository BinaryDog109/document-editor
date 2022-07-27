import HLC from "../utility/HybridLogicalClock"

export class CRDTOperation {
    constructor(type, value, hlcToIncrement) {
        const now = performance.now()
        this.type = type
        this.hlc = hlcToIncrement? HLC.increment(hlcToIncrement, now) : HLC.init(this.nodeId, now)
        if (value) this.value = value
    }
}