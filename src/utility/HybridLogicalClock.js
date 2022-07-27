// A pure functional impl of an HLC. Inspired by: https://jaredforsyth.com/posts/hybrid-logical-clocks/
// An HLC looks like this structure:
/**
 * 
  {
    timestamp: now,
    count: 0,
    nodeId
  }
 */
const HLC = {}
// Initialise a clock with the device's wallclock and begin the count at 0
HLC.init = (nodeId, now) => ({
    timestamp: now,
    count: 0,
    nodeId
})

// Use this to update the version for an event that happens on one machine
HLC.increment = (localHLC, now) => {
    // If the current device clock is larger than this HLC, use the device clock as a new HLC
    // Otherwhise, use the HLC with count+=1
    if (now > localHLC.timestamp) {
        return { ...localHLC, timestamp: now, count: 0, nodeId: localHLC.nodeId }
    }
    else {
        const copy = {...localHLC}
        copy.count++
        return copy
    }
}

// Use when a machine A receives an event from another machine B, update A's HLC
HLC.receive = (localHLC, remoteHLC, now) => {
    // If current device's clock prevails, use that as a new HLC
    if (now > localHLC.timestamp && now > remoteHLC.timestamp) {
        return { ...localHLC, timestamp: now, count: 0, nodeId: localHLC.nodeId }
    }
    // When current device's clock is behind either of these two
    // (Behind remote if the remote device had a faster clock, behind local if the device clock jumped bkw, or local was updated from another node that had a faster clock)

    // If both HLCs are have the same timestamp
    if (localHLC.timestamp === remoteHLC.timestamp) {
        return { ...localHLC, count: Math.max(localHLC.count, remoteHLC.count) + 1 }
    }
    // Otherwise, use whoever is larger
    else if (localHLC.timestamp > remoteHLC.timestamp) {
        return { ...localHLC, count: localHLC.count + 1 }
    }
    else {
        return { ...localHLC, timestamp: remoteHLC.timestamp, count: remoteHLC.count + 1 }
    }
}

// Compare two HLCs: first the timestamps, then the counts, then nodeIds as the final tie breaker
// Can be passed to .sort()
HLC.compare = (a, b) => {
    if (a.timestamp === b.timestamp) {
        if (a.count === b.count) {
            if (a.nodeId === b.nodeId) {
                return 0
            }
            return a.nodeId < b.nodeId? -1 : 1
        }
        return a.count - b.count
    }
    return a.timestamp - b.timestamp
}

// String representation
HLC.pack = ({ timestamp, count, nodeId }) => {
    // 13 digits is enough for the next 100 years, so 15 is plenty.
    // And 5 digits base 36 is enough for more than 6 million "out of order" changes.
    return (
        timestamp.toString().padStart(15, '0') +
        ':' +
        count.toString(36).padStart(5, '0') +
        ':' +
        nodeId
    );
};

HLC.unpack = (serialized) => {
    const [timestamp, count, ...nodeId] = serialized.split(':');
    return {
        timestamp: parseInt(timestamp),
        count: parseInt(count, 36),
        nodeId: nodeId.join(':'),
    };
};

export default HLC