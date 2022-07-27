const VC = {}

VC.init = (nodeId) => ({
    nodeId,
    clocks: {nodeId: 0}
})

VC.inc = (nodeId, clocks) => {
    clocks[nodeId]++
}

VC.read = (nodeId, clocks) => clocks[nodeId]

