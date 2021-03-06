<script>
	import { onMount, tick } from "svelte";

	import Vivagraph from "./Vivagraph.svelte";
	import Cytoscape from "./Cytoscape.svelte";

	
	let settings = window.settings;
	let notes = window.notes;
	let retentions = window.retentions;

	let search = '';
	let searchResults = [];

	let graph;
	let infoNid;
	let tagBoundaryInp = settings.tagBoundary;
	let iterInp = settings.iterations;

	let webGLAvailable = webglSupport();


	$: note = infoNid ? notes.find((n) => n[0] === infoNid) : null;
	$: noteTags = note ? note[1] : [];
	$: noteFields = note ? note[2].filter((f) => f && f.trim().length) : [];

	let prevMode = settings.mode;
	let prevGraphMode = settings.graphMode;

	$: tagBoundaryInp && tagBoundaryChange();
	$: iterInp && iterationChange();
	$: settings.defaultNodeColor &&
		(() => {
			if (typeof pycmd !== "undefined")
				pycmd("config-default-node-color " + settings.defaultNodeColor);
		})();
	$: settings.edgeColor &&
		(() => {
			if (typeof pycmd !== "undefined")
				pycmd("config-edge-color " + settings.edgeColor);
		})();
	$: settings.backgroundColor &&
		(() => {
			if (typeof pycmd !== "undefined")
				pycmd("config-background-color " + settings.backgroundColor);
		})();
	$: settings.mode &&
		(() => {
			if (prevMode === settings.mode) return;
			prevMode = settings.mode;
			if (typeof pycmd !== "undefined")
				pycmd("config-mode " + settings.mode);
			renderGraph();
		})();
	$: settings.graphMode &&
		(() => {
			if (prevGraphMode === settings.graphMode) return;
			prevGraphMode = settings.graphMode;
			if (typeof pycmd !== "undefined")
				pycmd("config-graph-mode " + settings.graphMode);
			renderGraph();
		})();


	onMount(renderWhenReady);

	function renderWhenReady() {
		if (!window.notes || window.notes.length === 0) {
			setTimeout(() => {
				renderWhenReady();
			}, 50);
			return;
		}
		notes = window.notes;
		renderGraph();
	}

	function triggerSearch() {
		if (search && search.trim().length) {
				fetch('search '  + search).then(function(nids) {
					searchResults = nids || [];
					if (!searchResults.length) {
						showNotification('Search found no results.');
					}
					renderGraph();
				});

			} else {
				if (searchResults.length) {
					searchResults = [];
					renderGraph();
				} else {
					searchResults = [];
				}
			}
	}

	function onSearchKeypress(e) {
		if (e && e.keyCode === 13) {
			triggerSearch();
		} 
	}

	function tagBoundaryChange() {
		if (tagBoundaryInp < 50 || tagBoundaryInp > 1000) {
			return;
		}
		if (typeof window.pycmd === "undefined") {
			return;
		}
		window.pycmd("config-tag-boundary " + tagBoundaryInp);
		settings.tagBoundary = tagBoundaryInp;
	}
	function iterationChange() {
		if (iterInp < 50 || iterInp > 1000) {
			return;
		}
		if (typeof window.pycmd === "undefined") {
			return;
		}
		window.pycmd("config-iterations " + iterInp);
		settings.iterations = iterInp;
	}
	function webglSupport() {
		try {
			var canvas = document.createElement("canvas");
			return Boolean(
				!!window.WebGLRenderingContext &&
				(canvas.getContext("webgl") || canvas.getContext("experimental-webgl"))
			);
		} catch (e) {
			return false;
		}
	}

	function toggleShowRetentions() {
		settings.showRetentions = !settings.showRetentions;
		window.pycmd(
			settings.showRetentions
				? "config-show-retentions"
				: "config-hide-retentions"
		);
	}
	function toggleShowUnlinkedNodes() {
		settings.showUnlinkedNodes = !settings.showUnlinkedNodes;
		window.pycmd(
			"config-show-unlinked " +
				settings.showUnlinkedNodes.toString().toLowerCase()
		);
	}

	function fetch(resource) {
		let key  = Date.now()+ '-' + resource.split("").reduce(function(a,b){a=((a<<5)-a)+b.charCodeAt(0);return a&a},0);

		if (typeof(window._fetchWaiting) === 'undefined') {
			window._fetchWaiting = {};
		}
        let promise = new Promise(function(resolve) {
            window._fetchWaiting[key] = resolve;
        });
		pycmd(`fetch ${key} ${resource}`);
        return promise;
	}

	function showNotification(text) {
		if (document.getElementById('notification')) {
			document.getElementById('notification').remove();
		}

		let notification = document.createElement('div');
		notification.innerText = text;
		notification.classList.add('notification');
		notification.onclick = 'event.target.remove()';
		notification.id = 'notification';
		document.body.appendChild(notification);
		setTimeout(function() {
			if (document.getElementById('notification')) {
				document.getElementById('notification').remove();
			}
		}, 2000);
	}

	async function renderGraph() {
		await tick();
		if (graph) {
			graph.renderGraph();
		}
	}
</script>

<div class="outer" style="background: {settings.backgroundColor}">
	<div id="controls">
		<div>
			<div style="margin-right: 10px">
				<select bind:value={settings.mode}>
					<option value="cytoscape">Cytoscape</option>
					<option value="viva" disabled="{!webGLAvailable}">Viva</option>
				</select>
			</div>
			<div style="margin-right: 10px">
				<select bind:value={settings.graphMode}>
					<option value="default">Default</option>
					<option value="tags">Tags Only</option>
					<option value="scoring">Scoring</option>
				</select>
			</div>
			<div
				class="button button-icon"
				title="Rerender Graph"
				style="margin-right: 10px"
				on:click={renderGraph}
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="ionicon"
					viewBox="0 0 512 512"
					><path
						d="M288 193s12.18-6-32-6a80 80 0 1080 80"
						fill="none"
						stroke="currentColor"
						stroke-linecap="round"
						stroke-miterlimit="10"
						stroke-width="28"
					/><path
						fill="none"
						stroke="currentColor"
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="28"
						d="M256 149l40 40-40 40"
					/><path
						d="M256 64C150 64 64 150 64 256s86 192 192 192 192-86 192-192S362 64 256 64z"
						fill="none"
						stroke="currentColor"
						stroke-miterlimit="10"
						stroke-width="32"
					/></svg
				>
			</div>
			<div
				class="button button-icon"
				title="Toggle Show Retentions"
				style="margin-right: 10px"
				on:click={toggleShowRetentions}
				class:active={settings.showRetentions}
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="ionicon"
					viewBox="0 0 512 512"
					><rect
						x="64"
						y="320"
						width="48"
						height="160"
						rx="8"
						ry="8"
						fill="none"
						stroke="currentColor"
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="32"
					/><rect
						x="288"
						y="224"
						width="48"
						height="256"
						rx="8"
						ry="8"
						fill="none"
						stroke="currentColor"
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="32"
					/><rect
						x="400"
						y="112"
						width="48"
						height="368"
						rx="8"
						ry="8"
						fill="none"
						stroke="currentColor"
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="32"
					/><rect
						x="176"
						y="32"
						width="48"
						height="448"
						rx="8"
						ry="8"
						fill="none"
						stroke="currentColor"
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="32"
					/></svg
				>
			</div>
			{#if settings.mode !== "cytoscape"}
				<div
					class="button button-icon"
					title="Toggle Show Unlinked Nodes"
					on:click={toggleShowUnlinkedNodes}
					class:active={settings.showUnlinkedNodes}
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="ionicon"
						viewBox="0 0 512 512"
						><circle
							cx="256"
							cy="256"
							r="192"
							fill="none"
							stroke="currentColor"
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="32"
						/></svg
					>
				</div>
			{/if}
			<div class="setting-item">
				<div
					class="label"
					title="Only include tags that are less common than this value. 
	Valid values range from 50 to 1000 (default 200)."
				>
					Tag Boundary
				</div>
				<input
					type="number"
					bind:value={tagBoundaryInp}
					on:blur={() => {
						tagBoundaryInp = Math.max(
							50,
							Math.min(1000, tagBoundaryInp)
						);
					}}
					min="50"
					max="1000"
				/>
			</div>
			{#if settings.mode === "viva"}
				<div class="setting-item">
					<div
						class="label"
						title="How many steps the layouting algorithm should perform until the graph freezes. 
	Valid inputs range from 50 to 1000 (default 300)."
					>
						Layouting Iterations
					</div>
					<input
						type="number"
						bind:value={iterInp}
						on:blur={() => {
							iterInp = Math.max(50, Math.min(1000, iterInp));
						}}
						min="50"
						max="1000"
					/>
				</div>
			{/if}
			<div class="setting-item">
				<div class="label" title="Default = #999999">Default Node</div>
				<input type="color" bind:value={settings.defaultNodeColor} />
			</div>
			<div class="setting-item">
				<div class="label" title="Default = #555555">Edge</div>
				<input type="color" bind:value={settings.edgeColor} />
			</div>
			<div class="setting-item">
				<div class="label" title="Default = #333333">Background</div>
				<input type="color" bind:value={settings.backgroundColor} />
			</div>
		</div>
		<div>
			<input type="text" class="browser-search" placeholder="Browser search" bind:value={search} on:keypress={onSearchKeypress}/>
			<div
				class="button button-icon"
				style="margin-left: 10px"
				on:click={triggerSearch}
			>
				<svg xmlns="http://www.w3.org/2000/svg" class="ionicon" viewBox="0 0 512 512"><path d="M221.09 64a157.09 157.09 0 10157.09 157.09A157.1 157.1 0 00221.09 64z" fill="none" stroke="currentColor" stroke-miterlimit="10" stroke-width="32"/><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-miterlimit="10" stroke-width="32" d="M338.29 338.29L448 448"/></svg>
			</div>
		</div>
	</div>

	<div id="graph-wrapper">
		{#if settings.mode === "viva"}
			<Vivagraph
				bind:this={graph}
				bind:infoNid
				{retentions}
				{notes}
				{settings}
				{searchResults}
			/>
		{:else}
			<Cytoscape
				bind:this={graph}
				bind:infoNid
				{retentions}
				{notes}
				{settings}
				{searchResults}
			/>
		{/if}
		<div id="info">
			{#if infoNid && noteFields && noteFields.length}
				<div style="flex: 1 1 auto; overflow-y: auto;">
					<div>
						{#each noteTags as t}
							<div class="tag">{t}</div>
						{/each}
					</div>
					<div id="info-fields">
						{#each noteFields as f}
							<div class="field">{@html f}</div>
						{/each}
					</div>
				</div>
				<div id="info-actions">
					<button on:click={window.pycmd('open-in-browser ' + infoNid)}>Open in Browser</button>
				</div>
			{/if}
		</div>
	</div>
</div>

<style>
	.outer {
		color: lightgrey;
		font-family: "Open Sans";
		width: 100%;
		height: 100%;
		overflow: hidden;
		display: flex;
		flex-direction: column;
		margin: 0;
		padding: 0;
	}

	#graph-wrapper {
		flex: 1 1 auto;
		display: flex;
		flex-direction: row;
		height: 100%;
		overflow: hidden;
	}

	#controls {
		padding: 10px;
		display: flex;
		flex-direction: row;
		align-items: center;
		justify-content: space-between;
		background: #232323;
	}
	#controls > div {
		display: flex;
		flex-direction: row;
		align-items: center;
	}

	#info {
		width: 400px;
		flex: 0 0 400px;
		overflow: hidden;
		padding: 10px;
		margin-left: 10px;
		background: #232323;
		display: flex;
		flex-direction: column;
		align-content: space-between;
	}
	#info-actions {
		padding: 10px;
		background: #191919;
	}
	.tag {
		display: inline-flex;
		margin: 0 5px 5px 0;
		border: 1px solid #444;
		padding: 2px 7px;
		align-items: center;
		background: #3b3b3b;
		justify-content: center;
		border-radius: 4px;
		font-size: 13px;
	}

	#info-fields {
		margin-top: 20px;
	}
	:global(#info-fields img) {
		max-width: 100%;
	}
	.field {
		padding-bottom: 10px;
		border-bottom: 1px solid rgb(66, 66, 66);
		margin-bottom: 10px;
		word-wrap: break-word;
	}

	button {
		padding: 3px;
		border: 1px solid #3a3a3a;
		border-radius: 2px;
		background: #2b2b2b;
		color: #9a9a9a;
		cursor: pointer;
	}
	button:hover {
		color: rgb(221, 221, 221);
		border: 1px solid #464646;
	}
	.button-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 3px;
		border: 1px solid #3a3a3a;
		background: #2b2b2b;
		width: 20px;
		height: 20px;
		cursor: pointer;
	}
	.button-icon.active {
		color: #0094cd;
	}
	.button-icon svg {
		height: 100%;
		width: 100%;
	}
	.label {
		user-select: none;
		font-size: 10px;
		margin-bottom: 4px;
	}
	:global(select) {
		background: #2b2b2b;
		height: 28px;
		color: lightgrey;
		border: 1px solid #3a3a3a;
		box-sizing: border-box;
	}
	select:focus {
		outline: none;
	}
	input {
		background: #2b2b2b;
		border: 1px solid #3a3a3a;
		color: lightgrey;
	}
	input:focus {
		outline: none !important;
		border: 1px solid #0094cd;
		box-shadow: 0 0 10px #313131;
	}
	input.browser-search {
		padding: 3px 5px;
		font-size: 18px;
		width: 360px;
	}
	.setting-item {
		margin-left: 10px;
		display: flex;
		flex-direction: column;
		align-items: center;
	}
	:global(*::-webkit-scrollbar) {
		width: 10px !important;
		background: #313d45 !important;
		border-radius: 4px !important;
	}
 	:global(*::-webkit-scrollbar-thumb) {
		background: #515d71 !important;
		border-radius: 4px !important;
	} 
	@keyframes -global-pulsate {
		0% {
		transform: scale(.1);
		opacity: 0.0;
		}
		50% {
		opacity: 1;
		}
		100% {
		transform: scale(1.2);
		opacity: 0;
		}
	}
	:global(.loader) {
		border: 5px solid #2496dc;
		border-radius: 30px;
		height: 30px;
		opacity: 0;
		width: 30px; 
		display: inline-block;

		animation: pulsate 1.5s ease-out;
		animation-iteration-count: infinite;
	}
	:global(.notification) {
		position: absolute;
		bottom: 30px;
		right: 30px;
		padding: 15px;
		font-size: 15px;
		background: #2b2b2b;
		color: lightgrey;
		cursor: pointer;
		z-index: 999999;
	}

	
</style>
