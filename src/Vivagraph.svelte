<script>
import { onMount } from "svelte";


import getGraphData from './data.js';

    export let notes;
    export let retentions;
    export let settings;
    export let searchResults;

    export let infoNid;

    $: defNodeColor = settings.defaultNodeColor.replace('#', '0x');
    $: edgeColor = settings.edgeColor;

    let rendering = false;
    let loader = {
        show: false,
        text: "Building graph layout...",
    };

    onMount (function() {
        document.onmousemove = function(e){
            window.lastMouseMove = [e.pageX, e.pageY];
        };
    });

    function renderWebglTooltip(x, y, nid, text) {
        hideWebglTooltip();
        infoNid = Number(nid);
        // window.tooltipId = nid;
        if (!window.tooltip) {
            window.tooltip = document.createElement("div");
            window.tooltip.classList.add("tooltip");
            window.tooltip.style.position = "absolute";
            document.body.appendChild(window.tooltip);
        }
        window.tooltip.style.left = x + "px";
        window.tooltip.style.top = y + "px";
        window.tooltip.style.display = 'block';
        // window.tooltip.setAttribute("onmouseover", "hideWebglTooltip()");
        window.tooltip.innerHTML = text || '?';
    }
    function hideWebglTooltip() {
        if (window.tooltip) {
            window.tooltip.style.display = 'none';
        }
    }
    function retColorHex(ret) {
        if (ret === null || typeof ret === "undefined") {
            return defNodeColor;
        }
        if (ret > 0.8) {
            return "0x479810";
        }
        if (ret > 0.7) {
            return "0x9EDE73";
        }
        if (ret > 0.6) {
            return "0xF7EA00";
        }
        if (ret > 0.5) {
            return "0xE48900";
        }

        return "0xBE0000";
    }

    export function renderGraph() {
        if (typeof window.Viva === "undefined") {
            console.warn("Graph lib not loaded, aborting...");
            return;
        }
        console.log("renderGraph()");
        if (rendering) {
            console.log("renderGraph(): Already rendering, aborting.");
            return;
        }
        loader.show = true;
        rendering = true;

        setTimeout(function () {

            let pBuildNodes = performance.now();
            let { nodes, edges } = getGraphData(notes, retentions, settings, searchResults);
           
            console.log('Built ' + nodes.length + ' nodes, ' + edges.length + ' edges.');
            console.log('Build nodes: ' + (performance.now() - pBuildNodes) + ' ms');
            // setStatus('Running tests...');
            // setStatus('Starting graphing...');
            let pGraphStart = performance.now();

            /**
             * Vivagraph.js
             */
            if (typeof graph !== "undefined") {
                graph.clear();
                if (document.getElementById('cytoscape-container').children.length)  {
                    document
                        .getElementById("cytoscape-container")
                        .children[0].remove();

                }
            }

            //  var graphics = Viva.Graph.View.svgGraphics();
            var graphics = Viva.Graph.View.webglGraphics();
            var circleNode = buildCircleNodeShader();
            graphics.setNodeProgram(circleNode);
            graphics
                .node(function (node) {
                    // The function is called every time renderer needs a ui to display node
                    return {
                        size: 11,
                        color: node.data.ret
                            ? retColorHex(Number(node.data.ret))
                            : defNodeColor,
                    };
                    // return Viva.Graph.View.webglSquare(10, retColor(Number(node.data.retention)));
                })
                .link(function (link) {
                    return Viva.Graph.View.webglLine(edgeColor);
                });
            window.graph = Viva.Graph.graph();
            for (let n of nodes) {
                graph.addNode(n.data.id, n.data);
            }
            for (let e of edges) {
                graph.addLink(e.data.source, e.data.target);
            }
            var layout = Viva.Graph.Layout.forceDirected(graph, {
                springLength: 3,
                springCoeff: 0.0009,
                dragCoeff: 0.02,
                gravity: -1.2,
            });

            window.hideWebglTooltip = hideWebglTooltip;
            var events = Viva.Graph.webglInputEvents(graphics, graph);
            events
                .mouseEnter(function (node) {
                    // window.hoveredNodeId = node.id;
                    // graphics.getNodeUI(window.hoveredNodeId).color = 4286513407;
                    // graph.forEachLinkedNode(node.id, function(node, link){
                    //     var linkUI = graphics.getLinkUI(link.id);
                    //     linkUI.color = 4286513407;
                    // });
                    // renderer.rerender();
                    // let pos = layout.getNodePosition(node.id);
                    // let domPos = graphics.transformGraphToClientCoordinates({
                    //     x: pos.x,
                    //     y: pos.y,
                    // });
                    renderWebglTooltip(
                        window.lastMouseMove[0],
                        window.lastMouseMove[1] + 10,
                        node.id.substring(2),
                        node.data.label
                    );
                })
                .mouseLeave(function (node) {
                    // if (window.hoveredNodeId) {
                        // graphics.getNodeUI(window.hoveredNodeId).color = defNodeColor;
                    //     graph.forEachLinkedNode(window.hoveredNodeId, function(node, link){
                    //         var linkUI = graphics.getLinkUI(link.id);
                    //         linkUI.color = 3014898687;
                        // });
                        // renderer.rerender();

                    // }
                    hideWebglTooltip();
                });

            // specify where it should be rendered:
            var renderer = Viva.Graph.View.renderer(graph, {
                layout: layout,
                graphics: graphics,
                container: document.getElementById("cytoscape-container"),
            });
            renderer.run(settings.iterations);

            function checkMovement() {
                if (window._lastMove && window._lastMove == layout.lastMove) {
                    var graphRect = layout.getGraphRect();
                    var graphSize = Math.min(
                        graphRect.x2 - graphRect.x1,
                        graphRect.y2 - graphRect.y1
                    );
                    var screenSize = Math.min(
                        document.body.clientWidth,
                        document.body.clientHeight
                    );

                    // setStatus(
                    //     "Graph render: " +
                    //         Math.trunc(performance.now() - pGraphStart) +
                    //         " ms"
                    // );
                    rendering = false;

                    var desiredScale = screenSize / graphSize;
                    zoomOut(desiredScale, 1);

                    function zoomOut(desiredScale, currentScale) {
                        // zoom API in vivagraph 0.5.x is silly. There is no way to pass transform
                        // directly. Maybe it will be fixed in future, for now this is the best I could do:
                        if (desiredScale < currentScale) {
                            currentScale = renderer.zoomOut();
                            setTimeout(function () {
                                zoomOut(desiredScale, currentScale);
                            }, 16);
                        }
                    }
                } else {
                    window._lastMove = layout.lastMove;
                    setTimeout(checkMovement, 200);
                }
            }
            checkMovement();
            loader.show = false;

            // Next comes the hard part - implementation of API for custom shader
            // program, used by webgl renderer:
            function buildCircleNodeShader() {
                // For each primitive we need 4 attributes: x, y, color and size.

                var ATTRIBUTES_PER_PRIMITIVE = 4,
                    nodesFS = [
                        "precision mediump float;",
                        "varying vec4 color;",

                        "void main(void) {",
                        "   if ((gl_PointCoord.x - 0.5) * (gl_PointCoord.x - 0.5) + (gl_PointCoord.y - 0.5) * (gl_PointCoord.y - 0.5) < 0.25) {",
                        "     gl_FragColor = color;",
                        "   } else {",
                        "     gl_FragColor = vec4(0);",
                        "   }",
                        "}",
                    ].join("\n"),
                    nodesVS = [
                        "attribute vec2 a_vertexPos;",
                        // Pack color and size into vector. First elemnt is color, second - size.
                        // Since it's floating point we can only use 24 bit to pack colors...
                        // thus alpha channel is dropped, and is always assumed to be 1.
                        "attribute vec2 a_customAttributes;",
                        "uniform vec2 u_screenSize;",
                        "uniform mat4 u_transform;",
                        "varying vec4 color;",

                        "void main(void) {",
                        "   gl_Position = u_transform * vec4(a_vertexPos/u_screenSize, 0, 1);",
                        "   gl_PointSize = a_customAttributes[1] * u_transform[0][0];",
                        "   float c = a_customAttributes[0];",
                        "   color.b = mod(c, 256.0); c = floor(c/256.0);",
                        "   color.g = mod(c, 256.0); c = floor(c/256.0);",
                        "   color.r = mod(c, 256.0); c = floor(c/256.0); color /= 255.0;",
                        "   color.a = 1.0;",
                        "}",
                    ].join("\n");

                var program,
                    gl,
                    buffer,
                    locations,
                    nodes = new Float32Array(64),
                    nodesCount = 0,
                    webglUtils,
                    canvasWidth,
                    canvasHeight,
                    transform,
                    isCanvasDirty;

                return {
                    /**
                     * Called by webgl renderer to load the shader into gl context.
                     */
                    load: function (glContext) {
                        gl = glContext;
                        webglUtils = Viva.Graph.webgl(glContext);
                        program = webglUtils.createProgram(nodesVS, nodesFS);
                        gl.useProgram(program);
                        locations = webglUtils.getLocations(program, [
                            "a_vertexPos",
                            "a_customAttributes",
                            "u_screenSize",
                            "u_transform",
                        ]);

                        gl.enableVertexAttribArray(locations.vertexPos);
                        gl.enableVertexAttribArray(locations.customAttributes);

                        buffer = gl.createBuffer();
                    },

                    /**
                     * Called by webgl renderer to update node position in the buffer array
                     *
                     * @param nodeUI - data model for the rendered node (WebGLCircle in this case)
                     * @param pos - {x, y} coordinates of the node.
                     */
                    position: function (nodeUI, pos) {
                        var idx = nodeUI.id;
                        nodes[idx * ATTRIBUTES_PER_PRIMITIVE] = pos.x;
                        nodes[idx * ATTRIBUTES_PER_PRIMITIVE + 1] = -pos.y;
                        nodes[idx * ATTRIBUTES_PER_PRIMITIVE + 2] =
                            nodeUI.color;
                        nodes[idx * ATTRIBUTES_PER_PRIMITIVE + 3] = nodeUI.size;
                    },

                    /**
                     * Request from webgl renderer to actually draw our stuff into the
                     * gl context. This is the core of our shader.
                     */
                    render: function () {
                        gl.useProgram(program);
                        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
                        gl.bufferData(gl.ARRAY_BUFFER, nodes, gl.DYNAMIC_DRAW);

                        if (isCanvasDirty) {
                            isCanvasDirty = false;
                            gl.uniformMatrix4fv(
                                locations.transform,
                                false,
                                transform
                            );
                            gl.uniform2f(
                                locations.screenSize,
                                canvasWidth,
                                canvasHeight
                            );
                        }

                        gl.vertexAttribPointer(
                            locations.vertexPos,
                            2,
                            gl.FLOAT,
                            false,
                            ATTRIBUTES_PER_PRIMITIVE *
                                Float32Array.BYTES_PER_ELEMENT,
                            0
                        );
                        gl.vertexAttribPointer(
                            locations.customAttributes,
                            2,
                            gl.FLOAT,
                            false,
                            ATTRIBUTES_PER_PRIMITIVE *
                                Float32Array.BYTES_PER_ELEMENT,
                            2 * 4
                        );

                        gl.drawArrays(gl.POINTS, 0, nodesCount);
                    },

                    /**
                     * Called by webgl renderer when user scales/pans the canvas with nodes.
                     */
                    updateTransform: function (newTransform) {
                        transform = newTransform;
                        isCanvasDirty = true;
                    },

                    /**
                     * Called by webgl renderer when user resizes the canvas with nodes.
                     */
                    updateSize: function (newCanvasWidth, newCanvasHeight) {
                        canvasWidth = newCanvasWidth;
                        canvasHeight = newCanvasHeight;
                        isCanvasDirty = true;
                    },

                    /**
                     * Called by webgl renderer to notify us that the new node was created in the graph
                     */
                    createNode: function (node) {
                        nodes = webglUtils.extendArray(
                            nodes,
                            nodesCount,
                            ATTRIBUTES_PER_PRIMITIVE
                        );
                        nodesCount += 1;
                    },

                    /**
                     * Called by webgl renderer to notify us that the node was removed from the graph
                     */
                    removeNode: function (node) {
                        if (nodesCount > 0) {
                            nodesCount -= 1;
                        }

                        if (node.id < nodesCount && nodesCount > 0) {
                            // we do not really delete anything from the buffer.
                            // Instead we swap deleted node with the "last" node in the
                            // buffer and decrease marker of the "last" node. Gives nice O(1)
                            // performance, but make code slightly harder than it could be:
                            webglUtils.copyArrayPart(
                                nodes,
                                node.id * ATTRIBUTES_PER_PRIMITIVE,
                                nodesCount * ATTRIBUTES_PER_PRIMITIVE,
                                ATTRIBUTES_PER_PRIMITIVE
                            );
                        }
                    },

                    /**
                     * This method is called by webgl renderer when it changes parts of its
                     * buffers. We don't use it here, but it's needed by API (see the comment
                     * in the removeNode() method)
                     */
                    replaceProperties: function (replacedNode, newNode) {},
                };
            }
        }, 10);
    }
</script>

<div style="height: 100%; flex: 1 1 auto; display: flex;">
    {#if loader.show}
        <div class="overlay">
            <div class='loader' style='margin-left: auto; margin-right: auto;'></div><br/>
            <div style="margin-bottom: 5px">Building Graph ...</div>
            <div style='font-size: 18px; opacity: 0.7'>[Lib: {settings.mode}, Mode: {settings.graphMode}]</div>
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
        font-family: "Open Sans";
	}
</style>
