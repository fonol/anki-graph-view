<script>
    import { onMount, tick } from "svelte";

    import getGraphData from "./data.js";

    export let notes;
    export let retentions;
    export let settings;

    export let infoNid;

    $: defNodeColor = settings.defaultNodeColor;
    $: edgeColor = settings.edgeColor;

    let rendering = false;
    let loader = {
        show: false,
        text: "Building graph layout...",
    };

    onMount(function () {
        // document.onmousemove = function (e) {
        //     window.lastMouseMove = [e.pageX, e.pageY];
        // };
    });
    function renderTooltip(event) {
        let node = event.target;
        if (!node.isNode()) {
            hideTooltip();
            return;
        }

        let id = node.id();
        if (window.tooltip && window.tooltipId === id) {
            return;
        }
        hideTooltip(event);
        // let neighbors = node.neighborhood();
        // if (neighbors) {
        //     neighbors.nodes().addClass("highlight");
        // }
        infoNid = Number(id.substring(2));
        window.tooltipId = id;
        let e = event.originalEvent;
        let x = e.pageX;
        let y = e.pageY;
        window.tooltip = document.createElement("div");
        window.tooltip.classList.add("tooltip");
        window.tooltip.style.position = "absolute";
        window.tooltip.style.left = x + "px";
        window.tooltip.style.top = y + "px";
        window.tooltip.innerHTML = node.data("label");
        document.body.appendChild(window.tooltip);
    }

    function hideTooltip(event) {
        if (window.tooltip) {
            window.tooltip.remove();
            window.tooltip = null;
        }
        // if (event) {
        //     let node = event.target;
        //     if (node && node.isNode()) {
        //         let neighbors = node.neighborhood();
        //         if (neighbors) {
        //             neighbors.nodes().removeClass("highlight");
        //         }
        //     }
        // }
    }

    function retColor(ret) {
        if (ret === null) {
            return "#999";
        }
        if (ret > 0.8) {
            return "hsl(96, 81%, 33%)";
        }
        if (ret > 0.7) {
            return "#9EDE73";
        }
        if (ret > 0.6) {
            return "#F7EA00";
        }
        if (ret > 0.5) {
            return "#E48900";
        }
        return "#BE0000";
    }

    export async function renderGraph() {
        console.log("renderGraph()");
        if (rendering) {
            console.log("already rendering, cannot rerender");
            return;
        }
        loader.show = true;
        rendering = true;
        loader.text = `<div>Rendering Graph</div>
            <div style='font-size: 20px'>Lib: ${settings.mode}</div>
            <div style='font-size: 20px'>Mode: ${settings.graphMode}</div>
            `;
            await tick();
        setTimeout(function () {
            console.log("renderGraph()");
            let container = document.getElementById('cytoscape-container');
            container.innerHTML = "";

            let pBuildNodes = performance.now();
            let settingsCopy = JSON.parse(JSON.stringify(settings));
            settingsCopy.showUnlinkedNodes = false;
            let { nodes, edges } = getGraphData(notes, retentions, settingsCopy);

            console.log(
                "Built " + nodes.length + " nodes, " + edges.length + " edges."
            );
            console.log(
                "Build nodes: " + (performance.now() - pBuildNodes) + " ms"
            );
            // setStatus('Running tests...');
            // setStatus('Starting graphing...');
            let pGraphStart = performance.now();

            /**
             * CytoScape.js
             */

            var cy = cytoscape({
                container: container,
                elements: {
                    nodes: nodes,
                    edges: edges,
                },
                // elements:
                // {
                //   nodes: [ {group: 'nodes', data: {id: 'n1'}},{ group: 'nodes', data: {id: 'n2'}}, { group: 'nodes', data: {id: 'n3'}}],
                //   edges: [ { group: 'edges', data: { id: 'e1', source: 'n2', target: 'n3'}}]
                // },

                style: [
                    // the stylesheet for the graph
                    {
                        selector: "node",
                        style: {
                            // 'background-color': '#666',
                            height: (n) => n.data('id').startsWith('t_') ? 12 : 7,
                            width: (n) => n.data('id').startsWith('t_') ? 12 : 7,
                            "background-color": (n) => {
                                return n.data("ret")
                                    ? retColor(Number(n.data("ret")))
                                    : defNodeColor;
                            },
                            // 'label': 'data(label)'
                        },
                    },

                    {
                        selector: "edge",
                        style: {
                            width: "2px",

                            'line-color': settings.edgeColor,
                            // 'target-arrow-color': '#ccc',
                            // 'target-arrow-shape': 'triangle',
                            // 'curve-style': 'bezier'
                        },
                    },
                ],

                // layout: {
                //   name: 'cose',
                //   idealEdgeLength: 50,
                //   nodeOverlap: 20,
                //   refresh: 20,
                //   animate: false,
                //   fit: true,
                //   padding: 130,
                //   randomize: true,
                //   componentSpacing: 100,
                //   nodeRepulsion: 800000,
                //   edgeElasticity: 100,
                //   nestingFactor: 5,
                //   gravity: 280,
                //   numIter: 1000,
                //   initialTemp: 200,
                //   coolingFactor: 0.95,
                //   minTemp: 1.0,
                //   textureOnViewport: true,
                // },
                // layout: {
                //   name: 'circle',
                // }
                // default layout options
                layout: {
                    name: "fcose",
                    quality: "default",
                    // Use random node positions at beginning of layout
                    // if this is set to false, then quality option must be "proof"
                    randomize: true,
                    // Whether or not to animate the layout
                    animate: false,
                    // Duration of animation in ms, if enabled
                    animationDuration: 1000,
                    // Easing of animation, if enabled
                    animationEasing: undefined,
                    // Fit the viewport to the repositioned nodes
                    fit: true,
                    // Padding around layout
                    padding: 30,
                    // Whether to include labels in node dimensions. Valid in "proof" quality
                    nodeDimensionsIncludeLabels: false,
                    // Whether or not simple nodes (non-compound nodes) are of uniform dimensions
                    uniformNodeDimensions: true,
                    // Whether to pack disconnected components - cytoscape-layout-utilities extension should be registered and initialized
                    packComponents: false,
                    // Layout step - all, transformed, enforced, cose - for debug purpose only
                    step: "all",

                    /* spectral layout options */

                    // False for random, true for greedy sampling
                    samplingType: true,
                    // Sample size to construct distance matrix
                    sampleSize: 25,
                    // Separation amount between nodes
                    nodeSeparation: 175,
                    // Power iteration tolerance
                    piTol: 0.0000001,

                    /* incremental layout options */

                    // Node repulsion (non overlapping) multiplier
                    nodeRepulsion: (node) => 8500,
                    // Ideal edge (non nested) length
                    idealEdgeLength: (edge) => 50,
                    // Divisor to compute edge forces
                    edgeElasticity: (edge) => 0.85,
                    // Nesting factor (multiplier) to compute ideal edge length for nested edges
                    nestingFactor: 0.1,
                    // Maximum number of iterations to perform - this is a suggested value and might be adjusted by the algorithm as required
                    numIter: 2500,
                    // For enabling tiling
                    tile: true,
                    // Represents the amount of the vertical space to put between the zero degree members during the tiling operation(can also be a function)
                    tilingPaddingVertical: 10,
                    // Represents the amount of the horizontal space to put between the zero degree members during the tiling operation(can also be a function)
                    tilingPaddingHorizontal: 10,
                    // Gravity force (constant)
                    gravity: 0.05,
                    // Gravity range (constant) for compounds
                    gravityRangeCompound: 10.5,
                    // Gravity force (constant) for compounds
                    gravityCompound: 15.0,
                    // Gravity range (constant)
                    gravityRange: 50.8,
                    // Initial cooling factor for incremental layout
                    initialEnergyOnIncremental: 0.3,

                    /* constraint options */

                    // Fix desired nodes to predefined positions
                    // [{nodeId: 'n1', position: {x: 100, y: 200}}, {...}]
                    fixedNodeConstraint: undefined,
                    // Align desired nodes in vertical/horizontal direction
                    // {vertical: [['n1', 'n2'], [...]], horizontal: [['n2', 'n4'], [...]]}
                    alignmentConstraint: undefined,
                    // Place two nodes relatively in vertical/horizontal direction
                    // [{top: 'n1', bottom: 'n2', gap: 100}, {left: 'n3', right: 'n4', gap: 75}, {...}]
                    relativePlacementConstraint: undefined,
                    textureOnViewport: true,

                    /* layout event callbacks */
                    ready: () => {}, // on layoutready
                    stop: () => {}, // on layoutstop
                },
            });
            // cy.on("click", "node", function (evt) {
            //     let id = this.id();
            //     let nid = id.substring(2);
            //     window.displayNoteInfo(nid);
            // });

            cy.elements().unbind("mouseover");
            cy.elements().bind("mouseover", (event) => renderTooltip(event));

            cy.elements().unbind("mouseout");
            cy.elements().bind("mouseout", (event) => hideTooltip(event));
            window.addEventListener("resize", function (event) {
                cy.center();
            });
            loader.show = false;
            rendering = false;
        }, 30);
    }
</script>

<div style="height: 100%; flex: 1 1 auto; display: flex;">
    {#if loader.show}
        <div class="overlay">
            {@html loader.text}
        </div>
    {/if}
    <div id="cytoscape-container" />
</div>

<style>
    #cytoscape-container {
        flex: 1 1 auto;
        height: 100%;
    }
    :global(#cytoscape-container > div) {
        width: 100% !important;
    }
    :global(#cytoscape-container canvas) {
        width: 100% !important;
    }
    .overlay {
        background: rgba(0, 0, 0, 0.5);
        color: white;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        font-size: 30px;
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 100;
    }
    :global(.tooltip) {
        background: #444;
        color: white;
        padding: 5px;
        font-size: 11px;
        text-overflow: ellipsis;
        max-width: 200px;
        overflow: hidden;
        font-family: Verdana, "Roboto Mono";
    }
</style>
