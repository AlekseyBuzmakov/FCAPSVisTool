var i = 0,
    duration = 750,
    nodeSize = 6;

var diagonal = d3.svg.diagonal()
    .projection(function(d) { return [d.x, d.y]; });

var margin = {top: 10, right: 10, bottom: 10, left: 10},
    layoutWidth = window.innerWidth - 40,
    layoutHeight = window.innerHeight - 100,
    pannelWidth = layoutWidth - margin.left - margin.right,
    pannelHeight = Math.max(0.15 * layoutHeight, 100),
    width = layoutWidth - margin.right - margin.left,
    height = Math.max( layoutHeight - 2 * pannelHeight, 100 );
    
var svg = d3.select("#SVGPicture").append("svg")
    .attr("width", width + margin.right + margin.left)
    .attr("height", height + margin.top + margin.bottom)
  .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

var topConcept = null;
var botConcept = null;
var lattice={};
var currNode = null;
var prevNode = null;
var clickNodeX = width/2;
var clickNodeY = height/2;

// Change size of the canva
window.onresize = function(){
	updateSize();
	visualizeNewLayout();
};
// Reload lattice 'onchange'
$("#BrowseForLattice").on("change", function(d){
	prevNode = currNode;
	clickNodeX = width/2;
	clickNodeY = height/2;

	updateData([],[]);
	
	setTimeout(function(){
		loadLattice(URL.createObjectURL(d.target.files[0]));
	}, duration + 200 );
});

updateSize();
loadLattice('lattice.json');

function updateSize() {
	layoutWidth = window.innerWidth - 40;
	layoutHeight = window.innerHeight - 100;
	pannelWidth = layoutWidth - margin.left - margin.right;
	pannelHeight = Math.max(0.15 * layoutHeight, 100);
	width = layoutWidth - margin.right - margin.left;
	height = Math.max( layoutHeight - 2 * pannelHeight, 100 );
	
	d3.select('#CurrentConceptInfo').attr("width", pannelWidth);
	d3.select('#SVGPicture').attr("width", width+margin.left+margin.right);
	d3.select('#MouseoverConceptInfo').attr("width", pannelWidth);
	d3.select('#CurrentConceptInfoName').text("CURRENT".split("").join("\n"));
	d3.select('#MouseoverConceptInfoName').text("SELECTED".split("").join("\n"));
	d3.select("svg")
	    .attr("width", width + margin.right + margin.left)
	    .attr("height", height + margin.top + margin.bottom);
}

// Loads file from path
function loadLattice(latticePath) {
	console.log("Loading '" + latticePath + "' ...");
	clearVisualisationParams();
	// Read JSON settings
	d3.json(latticePath, function(error, lat) {
		if( error ) {
			alert( "lattice.json" + "\n" + error );
			return
		}
		lattice = lat[1].Nodes;
		lat[2].Arcs.forEach( function(arc){
			addLink( lattice[arc.S], lattice[arc.D] );
		});

		// Creating one TOP node
		if( lat[0].Top.length == 1 ) {
			topConcept = lat[0].Top
		} else {
			topConcept = lattice.length;
			lattice.push({});
			lat[0].Top.forEach( function(t) {
				addLink(lattice[topConcept],lattice[t]);
			});
			lattice[topConcept].Int="ARTIFICIAL NODE"
		}

		// Creating one BOTTOM node
		if( lat[0].Bottom.length == 1 ) {
			botConcept = lat[0].Bottom
		} else {
			botConcept = lattice.length;
			lattice.push({});
			lat[0].Bottom.forEach( function(b) {
				addLink(lattice[b],lattice[botConcept]);
			});
			lattice[botConcept].Int="ARTIFICIAL NODE"
		}

		for( var id = 0; id < lattice.length; ++id ) {
			lattice[id].ID = id;
		}

		currNode = lattice[topConcept];

		d3.select('#goTOP').on("click", function(){
			prevNode = currNode;
			currNode = lattice[topConcept];
			clickNodeX = width/2;
			clickNodeY = height/2;

			visualizeNewLayout();
		});
		d3.select('#goBOTTOM').on("click", function(){
			prevNode = currNode;
			currNode = lattice[botConcept];
			clickNodeX = width/2;
			clickNodeY = height/2;

			visualizeNewLayout();
		});


		visualizeNewLayout();
	});
}
// Clears the visualisation params
function clearVisualisationParams(){
	topConcept = null;
	botConcept = null;
	lattice={};
	prevNode = null;
	currNode = null;
	clickNodeX = width/2;
	clickNodeY = height/2;
}

function addLink( conceptS, conceptD ) {
	if( !conceptS.Children ) {
		conceptS.Children = [];
	}
	conceptS.Children.push( conceptD );

	if( !conceptD.Parents ) {
		conceptD.Parents = [];
	}
	conceptD.Parents.push( conceptS );
}

function visualizeNewLayout() {
	computeNodePositions();
	update();
	updateInfo();
}

function computeNodePositions() {
	currNode.x = width / 2;
	currNode.y = height / 2;
	if(currNode.Parents) {
		placeNodesHorizontally( currNode.Parents, 1.5 * height / 8 );
	}
	if(currNode.Children) {
		placeNodesHorizontally( currNode.Children, 6.5 * height / 8 );
	}
}

d3.select(self.frameElement).style("height", "1000px");

function update() {
	// Compute the new tree layout.
	var nodes = [];
	var links = [];
	if(currNode.Parents) {
		nodes = nodes.concat(currNode.Parents);
		currNode.Parents.forEach(function(n){
			links.push({source:n,target:currNode});
		});
	}
	if(currNode.Children) {
		nodes = nodes.concat(currNode.Children);
		currNode.Children.forEach(function(n){
			links.push({source:currNode,target:n});
		});
	}
	nodes.push(currNode);

	updateData(nodes,links);
}

// Updates the picture w.r.t. the data
function updateData(nodes,links)
{
	// Update the nodes…
	var node = svg.selectAll("g.node")
		.data(nodes, function(d) { return d.ID; });

	// Entere nodes to the newly added node 
	var nodeEnter = node.enter().append("g")
		.attr("class", "node")
		.attr("transform", function(d) { return "translate(" + clickNodeX + "," + clickNodeY + ")"; })
		.append("circle")
			.attr("r", 1e-6)
			.style("fill", getNodeFill)
			.on("click", click)
			.on("mouseenter", mouseenter);

	// Transition nodes to their new position.
	var nodeUpdate = node.transition()
		.duration(duration)
		.attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; });
	nodeUpdate.select("circle")
		.style("fill", getNodeFill)
		.style("stroke", getNodeStroke)
		.attr("r", nodeSize);

	// Transition exiting nodes to the parent's new position.
	var nodeExit = node.exit().transition()
		.duration(duration)
		.attr("transform", function(d) { return "translate(" + prevNode.x + "," + prevNode.y + ")"; })
		.remove();

	// Update the links…
	var link = svg.selectAll("path.link")
		.data(links, function(d) { return d.source.ID + d.target.ID * 100000 });

	// Enter any new links at the parent's previous position.
	link.enter().insert("path", "g")
		.attr("class", "link")
		.attr("d", function(d) {
			var o = {x: clickNodeX, y: clickNodeY};
			return diagonal({source: o, target: o});
		});

	// Transition links to their new position.
	link.transition()
		.duration(duration)
		.attr("d", diagonal);

	// Transition exiting nodes to the parent's new position.
	link.exit().transition()
		.duration(duration)
		.attr("d", function(d) {
			var o = {x: prevNode.x, y: prevNode.y};
			return diagonal({source: o, target: o});
		})
	.remove();
}

// Get color of the node
function getNodeFill(d) {
	// We show terminal nodes in RED
	return d.Children && d.Parents ? "lightsteelblue" : "lightpink";
}
function getNodeStroke(d) {
	// We show terminal nodes in RED
	return d.Children && d.Parents ? "steelblue" : "red";
}

// Toggle children on click.
function click(d) {
	// Change node and support animation
	clickNodeX = d.x;
	clickNodeY = d.y;
	prevNode=currNode;
	currNode=d;

	visualizeNewLayout();
}
function updateInfo() {
	document.getElementById('MouseoverConceptInfo').innerHTML="";
	document.getElementById('CurrentConceptInfo').innerHTML=nodeHtml(currNode);
}

// Places nodes horisontically
function placeNodesHorizontally( nodes, y )
{
	var step = width/nodes.length;
	var lastNodeX = (width - step * (nodes.length - 1)) / 2;
	nodes.forEach(function(n){
		n.x = lastNodeX;
		lastNodeX += step;	
		n.y = y;
		if( step < nodeSize * 2.5 ) {
			const verticalPlace=3 * height / 8;
			n.y +=  Math.random() * verticalPlace - verticalPlace / 2;
		}
	});
}

// Mouse entering to a node. Node information should be shown
function mouseenter(d) {
	document.getElementById('MouseoverConceptInfo').innerHTML=nodeHtml(d);
}

// Formats info about a node
function nodeHtml(d){
	var result="<div><ul>";
	if( d.Int ) {
		result += visMember( "Intent", d.Int, currNode.Int );
	}
	if( d.Ext ) {
		result += visMember( "Extent", d.Ext, currNode.Ext );
	}
	for( key in d ) {
		if( key == "Extent"
				|| key == "Int"
				|| key == "Ext"
				|| key == "ID"
				|| key == "Children"
				|| key == "Parents"
		 		|| key == "x"
		 		|| key == "y" )
		{
			continue;
		}
		result += visMember( key, d[key], currNode[key] );
	}
	for( key in currNode ) {
		if( key == "Extent"
				|| key == "Int"
				|| key == "Ext"
				|| key == "ID"
				|| key == "Children"
				|| key == "Parents"
		 		|| key == "x"
		 		|| key == "y" )
		{
			continue;
		}
		if( d[key] == null ) {
			result += visMember( key, null, currNode[key] );
		}
	}
	result += "</ul></div>";
	return result;
}
// http://www.codeproject.com/Articles/24549/How-to-Inspect-a-JavaScript-Object
// Formats info about one node field (or member)
function visMember( key, value, cmpValue ) {
	var keyType = "ordinary";
	if( cmpValue == null && value != null ) {
		keyType = "new";
	} 
	if( cmpValue != null && value == null ) {
		keyType = "removed";
	}
	return "<li>" + visKey(key, keyType) + visSynt(":") + visValue(value, cmpValue) + "</li>";
}

function visValue(v, cmpV) {
	//return JSON.stringify(v);
	if(v==null) {
		if(typeof(cmpV) == 'object') {
			return visTerm(null, "new" );
		} else {
			return visTerm(cmpV, "removed" );
		}
	}
	type =  typeof(v);
	if(type != 'object'){
		if( cmpV == null ) {
			return visTerm(v, "new" );
		} 
		return visTerm(v, cmpV == v ? "ordinary" : "changed" );
	}
	if( $.isArray(v) ) {
		var result = visSynt("[");
		var isFirst=true;
		for( vv in v ) {
			if(!isFirst) {
				result += visSynt(" ,");
			}
			if( $.inArray(v[vv],cmpV)>=0 ) {
				result += visValue(v[vv],v[vv]);
			} else {
				result += visValue(v[vv],null);
			}
			isFirst=false;
		}
		for( vv in cmpV ) {
			if( $.inArray(cmpV[vv],v) >= 0 ) {
				continue;
			}
			if(!isFirst) {
				result += visSynt(" ,");
			}
			result += visValue(null,cmpV[vv]);
			isFirst=false;
		}
		result += visSynt("]");
		return result;
	}
	// type == 'object'
	var result = "<ul>";
	for( m in v ) {
		result += visMember(m,v[m],cmpV == null? null : cmpV[m]);
	}
	if(typeof(cmpV)=='object') {
		// Just in case it is not an artificial node
		for( m in cmpV ) {
			if( v[m] == null ) {
				result += visMember(m,null,cmpV == null? null : cmpV[m]);
			}
		}
	}
	result += "</ul>";	
	return result;
}

function visKey(k,keyType) {
	switch(keyType) {
		case 'new':
			return "<a class=\"newKey\">" + k + "</a>";
		case 'removed':
			return "<a class=\"removedKey\">" + k + "</a>";
		default:
			return "<a class=\"key\">" + k + "</a>";
	}
}
function visTerm(t, termType) {
	switch(termType) {
		case 'new':
			return "<a class=\"newTerm\">" + t + "</a>";
		case 'changed':
			return "<a class=\"changedTerm\">" + t + "</a>";
		case 'removed':
			return "<a class=\"removedTerm\">" + t + "</a>";
		default:
			return "<a class=\"term\">" + t + "</a>";
	}
}
function visSynt(s) {
	return "<a class=\"synt\">" + s + "</a>";
}
