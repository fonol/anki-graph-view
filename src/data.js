export default function getGraphData(notes, retentions, settings) {
    console.log('getGraphData()');
    console.assert(settings != null);
    console.assert(notes != null && notes.length);
    console.assert(retentions != null);

    String.prototype.hashCode = function () {
        var hash = 0, i, chr;
        if (this.length === 0) return hash;
        for (i = 0; i < this.length; i++) {
            chr = this.charCodeAt(i);
            hash = ((hash << 5) - hash) + chr;
            hash |= 0;
        }
        return hash;
    };

    let byTag = {};
    let n;

    let tagCounts = {};
    let edges = [];
    let nodes = [];

    let allNids = new Set();
    let refs = {};

    // regexp to look out for references to other nids
    let nidReferenceRxp = new RegExp("(?:[^\\d]|^)(\\d{6,})(?:[^\\d]|$)");

    // count the occurences of each tag
    for (var i = 0; i < notes.length; i++) {
        allNids.add(notes[i][0]);
        let tags = notes[i][1];
        let flds = notes[i][2];

        // check fields for refs to other notes
        for (let fld of flds) {
            let match = nidReferenceRxp.exec(fld);
            if (match && match.length) {
                refs[notes[i][0]] = Number(match[1]);
            }
        }
        for (let t of tags) {
            if (!(t in tagCounts)) {
                tagCounts[t] = 1;
            } else {
                tagCounts[t]++;
            }
        }
    }

    // group the notes by their tags
    for (var i = 0; i < notes.length; i++) {
        n = notes[i];
        let tags = n[1];
        let lbl = n[3];
        let nid = n[0];
        if (tags.length) {
            for (let t of tags) {
                if (!(t in byTag)) {
                    byTag[t] = [];
                }
                byTag[t].push(nid);
            }
        }
        if (settings.graphMode === 'default') {
            let ret = settings.showRetentions ? retentions[Number(nid)] || null : null;
            nodes.push({
                data: { id: "n_" + nid, label: lbl, ret: ret },
                group: "nodes",
            });
        }
    }

    let idC = 0;
    let nodesWithEdges = new Set();

    if (settings.graphMode === 'default') {

        for (let [tag, els] of Object.entries(byTag)) {
            if (els.length > settings.tagBoundary) {
                console.log("[Graph] Skipping linking between nodes with tag " + tag + " because it has >" + settings.tagBoundary + " notes (" + els.length + ")");
                continue;
            }

            let tid = ++idC;
            let tnode = {
                data: { id: "t_" + tid, label: tag, ret: null },
                group: "nodes",
            };
            nodesWithEdges.add(tnode.data.id);
            for (let n1 of els) {

                idC++;

                edges.push({
                    group: "edges",
                    data: {
                        id: "e_" + idC,
                        source: tnode.data.id,
                        target: "n_" + n1,
                    },
                });
                if (!nodesWithEdges.has('n_'+ n1)) {
                    nodesWithEdges.add('n_' + n1);
                }
            }
            nodes.push(tnode);
        }

        // create edges between notes with explicit linkings
        let explicitLinkingsCounter = 0;
        for (let [nid, reffedNid] of Object.entries(refs)) {
            if (allNids.has(reffedNid) && nid !== reffedNid) {
                explicitLinkingsCounter++;
                idC++;
                edges.push({
                    group: "edges",
                    data: {
                        id: "e_" + idC,
                        source: 'n_' + nid,
                        target: "n_" + reffedNid,
                    },
                });
                if (!nodesWithEdges.has('n_'+ nid)) {
                    nodesWithEdges.add('n_' + nid);
                }
                if (!nodesWithEdges.has('n_'+ reffedNid)) {
                    nodesWithEdges.add('n_' + reffedNid);
                }
            }
        }
        console.log(`[graph] Created ${explicitLinkingsCounter} explicit linking(s).`);

    } else if (settings.graphMode === 'tags') {
        let edgesCreated = new Set();
        for (let [tag, els] of Object.entries(byTag)) {
            let tnode = {
                data: { id: "t_" + tag.hashCode(), label: tag, ret: null },
                group: "nodes",
            };
            nodes.push(tnode);
                let c = 0;
                let sum = 0.0;
            for (let nid of els) {
                if (nid in retentions) {
                    c++;
                    sum += retentions[nid];
                }
            }
            tnode.data['ret'] = c > 0 ? (sum / c) : null;

            for (let [tag1, els1] of Object.entries(byTag)) {
                if (tag1 === tag) {
                    continue;
                }
                if (edgesCreated.has(tag + ' ' + tag1) || edgesCreated.has(tag1 + ' ' + tag)) {
                    continue;
                }
                for (let nid1 of els1) {
                    if (els.find(nid => nid === nid1)) {
                        idC++;
                        edges.push({
                            group: "edges",
                            data: {
                                id: "e_" + idC,
                                source: tnode.data.id,
                                target: "t_" + tag1.hashCode(),
                            },
                        });
                        edgesCreated.add(tag + ' ' + tag1);
                        if (!nodesWithEdges.has(tnode.data.id)) {
                            nodesWithEdges.add(tnode.data.id);
                        }
                        if (!nodesWithEdges.has('t_'+ tag1.hashCode())) {
                            nodesWithEdges.add('t_'+ tag1.hashCode());
                        }

                        break;
                    }

                }

            }
        }

    } else {
        console.warn("[Graph] invalid graph mode: " + settings.graphMode);
    }


    if (!settings.showUnlinkedNodes) {
        nodes = nodes.filter(n => nodesWithEdges.has(n.data.id));
    }
    return { edges: edges, nodes: nodes };

}