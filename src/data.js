export default function getGraphData(notes, retentions, settings, searchResults) {

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
    let tagCounts = {};
    let edges = [];
    let nodes = [];

    let allNids = new Set();
    let refs = {};

    // regexp to look out for references to other nids
    let nidReferenceRxp = new RegExp("(?:[^\\d]|^)(\\d{6,})(?:[^\\d]|$)", 'g');

    // count the occurences of each tag
    for (var i = 0; i < notes.length; i++) {
        let nid = notes[i][0];
        allNids.add(nid);
        let tags = notes[i][1];
        let flds = notes[i][2];

        // check fields for refs to other notes
        for (let fld of flds) {
            let match;
            do {
                match = nidReferenceRxp.exec(fld);
                if (match && match.length) {
                    if (!(nid in refs)) {
                        refs[nid] = [];
                    }
                    let reffedNid = Number(match[1]);
                    if (!refs[nid].includes(reffedNid)) {
                        refs[nid].push(reffedNid);
                    }
                }
            } while (match);
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
        let [nid, tags, _, lbl] = notes[i];
        if (tags.length) {
            for (let t of tags) {
                if (!(t in byTag)) {
                    byTag[t] = [];
                }
                if (!searchResults.length || searchResults.includes(nid)) {
                    byTag[t].push(nid);
                }
            }
        }
        if (settings.graphMode === 'default' || settings.graphMode === 'scoring') {
            if (!searchResults.length || searchResults.includes(nid)) {
                let ret = settings.showRetentions ? retentions[Number(nid)] || null : null;
                nodes.push({
                    data: { id: "n_" + nid, label: lbl, ret: ret },
                    group: "nodes",
                });
            }
        }
    }

    let idC = 0;
    let nodesWithEdges = new Set();

    if (settings.graphMode === 'default') {

        for (let [tag, els] of Object.entries(byTag)) {
            if (els.length === 0) {
                continue;
            }
            if (els.length > settings.tagBoundary) {
                console.log("[Graph] Skipping linking between nodes with tag " + tag + " because it has >" + settings.tagBoundary + " notes (" + els.length + ")");
                continue;
            } 
            if (settings.excludeTags && settings.excludeTags.includes(tag)) {
                console.log("[Graph] Skipping linking between nodes with tag " + tag + " because it is excluded in the config.");
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
                if (!nodesWithEdges.has('n_' + n1)) {
                    nodesWithEdges.add('n_' + n1);
                }
            }
            nodes.push(tnode);
        }

        // create edges between notes with explicit linkings
        let explicitLinkingsCounter = 0;
        for (let [nid, reffedNids] of Object.entries(refs)) {
            for (let reffedNid of reffedNids) {
                if (allNids.has(reffedNid) && nid !== reffedNid && (!searchResults.length || (searchResults.includes(nid) && searchResults.includes(reffedNid)))) {
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
                    if (!nodesWithEdges.has('n_' + nid)) {
                        nodesWithEdges.add('n_' + nid);
                    }
                    if (!nodesWithEdges.has('n_' + reffedNid)) {
                        nodesWithEdges.add('n_' + reffedNid);
                    }
                }
            }
        }
        console.log(`[graph] Created ${explicitLinkingsCounter} explicit linking(s).`);

    } else if (settings.graphMode === 'tags') {
        let edgesCreated = new Set();
        for (let [tag, els] of Object.entries(byTag)) {
            if (settings.excludeTags && settings.excludeTags.includes(tag)) {
                continue;
            }
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
                if (settings.excludeTags && settings.excludeTags.includes(tag1)) {
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
                        if (!nodesWithEdges.has('t_' + tag1.hashCode())) {
                            nodesWithEdges.add('t_' + tag1.hashCode());
                        }

                        break;
                    }

                }

            }
        }
    } else if (settings.graphMode === 'scoring') {

        let scores = [];

        let start = performance.now();


        let c = 0;
        let tcl = 0; 
        let dcl = 0;
        
        for (let i0 = 0; i0 < notes.length; i0++) {
            let [nid0, tags0, flds0, _, dids0] = notes[i0];
            for (let i1 = 0; i1 < notes.length; i1++) {
                if (notes[i1][0] === notes[i0][0] || i1 <= i0) {
                    continue;
                }
                if (searchResults.length && (!searchResults.includes(notes[i1][0]) || !searchResults.includes(notes[i0][0]))) {
                    continue;
                }
                let [nid1, tags1, flds1, _, dids1] = notes[i1];
                let score = 0;
                c++;

                //
                // collect points
                //

                // +5 points if creation date within 30 seconds 
                if (Math.abs(nid0 - nid1) / 1000 <= 30) {
                    score += 5;
                    tcl++;
                }  

                // +4 points if creation date within 1 minute 
                else if (Math.abs(nid0 - nid1) / 1000 <= 60) {
                    score += 4;
                    tcl++;
                }  

                // +3 points if creation date within 10 minutes
                else if (Math.abs(nid0 - nid1) / 1000 <= 600) {
                    score += 3;
                    tcl++;
                }

                // +1 point if creation date within 1 hour
                else if (Math.abs(nid0 - nid1) / 1000 <= 3600) {
                    score += 1;
                    tcl++;
                } 

                // +1 point if same deck
                if (dids0.length && dids1.length && dids0.find(did0 => dids1.find(did1 => did1 === did0) != null)) {
                    score += 1;
                    dcl++;
                }

                for (let t0 of tags0 || []) {
                    if (settings.excludeTags && settings.excludeTags.includes(t0)) {
                        continue;
                    }
                    if (tags1.length && tags1.includes(t0) && t0 in tagCounts && tagCounts[t0] <= settings.tagBoundary) {

                        if (tagCounts[t0] >= 100) {
                            // +1 point for each tag in common that has 100-999 notes
                            score += 1;
                        } else if (tagCounts[t0] >= 50){
                            // +2 points for each tag in common that has less than 100 notes
                            score += 2;
                        } else {
                            // +3 points for each tag in common that has less than 50 notes
                            score += 3;
                        }
                        // +1 points for each nested tag level
                        score += 1 * (t0.split('::').length - 1);
                    }
                }

                // // +0.5 points for each equal field
                // for (let f0 of flds0 || []) {
                //     for (let f1 of flds1 || []) {
                //         if (f0.length && f1.length && f0 === f1) {
                //             if (flds0.length < 5 && flds1.length < 5) {
                //                 score += 0.5;
                //             } else {
                //                 score += 0.3;
                //             }
                //         } 
                //     }
                // }

                if (score > 0) {
                    scores.push([nid0, nid1, score]);
                }

            }
        }
    
        console.log(`[Graph] Finished collecting scores, took ${Math.trunc(performance.now() - start)}ms`);
        console.log(`[Graph] Creation Date proximity found for ${Math.trunc(tcl * 100.0 / c)}% of pairs`);
        console.log(`[Graph] Same Deck found for ${Math.trunc(dcl * 100.0 / c)}% of pairs`);
        console.log(`[Graph] ${scores.length} note pairs have a score > 0`);
        let boundary = settings.scoringIncludeTopXPercent;
        if (boundary < 1 || boundary > 100) {
            alert("Invalid boundary for scoring: " + boundary);
        }

        if (scores.length) {
            scores.sort(function (s1, s2) {
                return s2[2] - s1[2];
            });
            console.log(`[Graph] Highest score is ${scores[0][2]}`);
            console.log(`[Graph] Lowest score > 0 is ${scores[scores.length-1][2]}`);
            
            let topX = scores.slice(0, Math.trunc(scores.length * boundary / 100));
            let minScore = topX[topX.length-1][2];
            let res = [];
            let c = 0;
            let maxEdgeCount = 5000;
            for (let s of scores) {
                c++;
                if (c > maxEdgeCount) {
                    break;
                }
                if (s[2] >= minScore) {
                    res.push(s);
                }
            }
            console.log(`[Graph] Scoring, boundary is ${boundary}, took first ${res.length} edges out of ${scores.length}`);

            for (let [nid0, nid1, _] of res) {

                idC++;

                edges.push({
                    group: "edges",
                    data: {
                        id: "e_" + idC,
                        source: "n_"+ nid0,
                        target: "n_" + nid1,
                    },
                });
                if (!nodesWithEdges.has('n_' + nid0)) {
                    nodesWithEdges.add('n_' + nid0);
                }
                if (!nodesWithEdges.has('n_' + nid1)) {
                    nodesWithEdges.add('n_' + nid1);
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