<script>
import { onMount, tick } from "svelte";

	import Vivagraph from "./Vivagraph.svelte";
	import Cytoscape from "./Cytoscape.svelte";

	let settings = window.settings;
	let notes = window.notes;
	let retentions = window.retentions;

	let graph;

	let infoNid;
	let tagBoundaryInp = settings.tagBoundary;
	let iterInp = settings.iterations;

	$: note = infoNid ? notes.find((n) => n[0] === infoNid) : null;
	$: noteTags = note ? note[1] : [];
	$: noteFields = note ? note[2].filter((f) => f && f.trim().length) : [];

	let prevMode = settings.mode;
	let prevGraphMode = settings.graphMode;

	$: tagBoundaryInp && tagBoundaryChange();
	$: iterInp && iterationChange();
	$: settings.defaultNodeColor && (() => { if (typeof(pycmd) !== 'undefined') pycmd('config-default-node-color '  + settings.defaultNodeColor)})();
	$: settings.edgeColor && (() => { if (typeof(pycmd) !== 'undefined') pycmd('config-edge-color '  + settings.edgeColor)})();
	$: settings.backgroundColor && (() => { if (typeof(pycmd) !== 'undefined') pycmd('config-background-color '  + settings.backgroundColor)})();
	$: settings.mode && (() => { 
		if (prevMode === settings.mode) 
			return;
		prevMode = settings.mode;
		if (typeof(pycmd) !== 'undefined') pycmd('config-mode '  + settings.mode); 
		renderGraph();
	})();
	$: settings.graphMode && (() => { 
		if (prevGraphMode === settings.graphMode) 
			return;
		prevGraphMode = settings.graphMode;
		if (typeof(pycmd) !== 'undefined') 
			pycmd('config-graph-mode '  + settings.graphMode); 
		renderGraph();
	})();
	// $: settings.mode && renderGraph();

	onMount(renderGraph);

	function tagBoundaryChange() {
		if (tagBoundaryInp < 50 || tagBoundaryInp > 1000) {
			return;
		}
		if (typeof(window.pycmd) === 'undefined') {
			return;
		}
		window.pycmd("config-tag-boundary " + tagBoundaryInp);
		settings.tagBoundary = tagBoundaryInp;
	}
	function iterationChange() {
		if (iterInp < 50 || iterInp > 1000) {
			return;
		}
		if (typeof(window.pycmd) === 'undefined') {
			return;
		}
		window.pycmd("config-iterations " + iterInp);
		settings.iterations = iterInp;
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
		window.pycmd("config-show-unlinked " + settings.showUnlinkedNodes.toString().toLowerCase());
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
		<div style="margin-right: 10px">
			<select bind:value={settings.mode}>
				<option value="viva">Viva</option>
				<option value="cytoscape">Cytoscape</option>
			</select>
		</div>
		<div style="margin-right: 10px">
			<select bind:value={settings.graphMode}>
				<option value="default">Default</option>
				<option value="tags">Tags Only</option>
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
		{#if settings.mode !== 'cytoscape'}
		<div
			class="button button-icon"
			title="Toggle Show Unlinked Nodes"
			on:click={toggleShowUnlinkedNodes}
			class:active={settings.showUnlinkedNodes}
		>	
<svg xmlns="http://www.w3.org/2000/svg" class="ionicon" viewBox="0 0 512 512"><circle cx="256" cy="256" r="192" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32"/></svg>
	</div>
		{/if}
		<div class='setting-item'>
			<div
				class="label"
				title="Create a linking between two notes if they share a tag who is less common than <value>.
The higher this value, the more edges the graph will have, but the less meaningful they will probably be.
Valid values range from 50 to 1000 (default 200)."
			>
				Tag Boundary
			</div>
			<input
				type="number"
				bind:value={tagBoundaryInp}
				on:blur={() => { tagBoundaryInp = Math.max(50, Math.min(1000, tagBoundaryInp))}}
				min="50"
				max="1000"
			/>
		</div>
		{#if settings.mode === 'viva'}
		<div class='setting-item'>
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
				on:blur={() => { iterInp = Math.max(50, Math.min(1000, iterInp))}}
				min="50"
				max="1000"
			/>
		</div>
		{/if}
		<div class='setting-item' >
			<div
				class="label"
				title="Default = #999999"
			>
				Default Node
			</div>
			<input
				type="color"
				bind:value={settings.defaultNodeColor}
			/>
		</div>
		<div class='setting-item'>
			<div
				class="label"
				title="Default = #555555"
			>
				Edge
			</div>
			<input
				type="color"
				bind:value={settings.edgeColor}
			/>
		</div>
		<div class='setting-item'>
			<div
				class="label"
				title="Default = #333333"
			>
				Background
			</div>
			<input
				type="color"
				bind:value={settings.backgroundColor}
			/>
		</div>
	</div>

	<div id="graph-wrapper">
		{#if settings.mode === 'viva'}
		<Vivagraph
			bind:this={graph}
			bind:infoNid
			{retentions}
			{notes}
			{settings}
		/>
		{:else}
		<Cytoscape
			bind:this={graph}
			bind:infoNid
			{retentions}
			{notes}
			{settings}
		/>

		{/if}
		<div id="info">
			<div id="info-tags">
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
	</div>
</div>

<style>
	.outer {
		color: lightgrey;
		font-family: Roboto Mono;
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
	}

	#controls {
		padding: 10px;
		display: flex;
		flex-direction: row;
		align-items: center;
		background: #232323;
	}

	#info {
		width: 400px;
		flex: 0 0 400px;
		overflow: auto;
		padding: 10px;
		margin-left: 10px;
		background: #232323;
	}
	.tag {
		display: inline-flex;
		margin: 0 5px 5px 0;
		border: 1px solid #3a3a3a;
		padding: 2px 7px;
		align-items: center;
		background: #2b2b2b;
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

	.button-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 3px;
		border: 1px solid #3a3a3a;
		background: #2b2b2b;
		width: 20px;
		height: 20px;
	}
	.button-icon.active {
		color: #0094cd;
	}
	.label {
		user-select: none;
		font-size: 10px;
		margin-bottom: 4px;
	}
	select {
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
	.setting-item {
		margin-left: 10px; 
		display: flex; 
		flex-direction: column; 
		align-items: center;
	}

</style>
