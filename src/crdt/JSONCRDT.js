import HLC from "../utility/HybridLogicalClock";
import { CRDTOperation } from "./CRDTOperation";


class JSONCRDT {
    constructor(nodeId) {
        this.document = {
            counter: {
                num: 0,
                localHLC: HLC.init(nodeId, performance.now())
            }
        }
    }
    setCountCommand(value) {        
        const counter = this.document.counter
        // local action
        counter.num = value
        // creates an operation effect
        const op = new CRDTOperation("set_value", value, counter.localHLC)
        this.modifyCounter(op)
        return op
    }
    modifyCounter(operation) {
        const counter = this.document.counter
        const remoteHLC = {...operation.hlc}
        switch(operation.type) {
            case "set_value":
                // If local clock is less than remote clock
                if (!HLC.compare(this.localHLC, remoteHLC)) {
                    counter.num = operation.value
                    counter.localHLC = remoteHLC
                }
                break;
            default: return
        }
    }
}