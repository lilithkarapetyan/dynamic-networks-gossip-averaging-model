// stolen ugly code, do not pay attention :)

// Copyright 2021 Observable, Inc.
// Released under the ISC license.
// https://observablehq.com/@d3/disjoint-force-directed-graph
function ForceGraph({
                      nodes, // an iterable of node objects (typically [{id}, …])
                      links // an iterable of link objects (typically [{source, target}, …])
                    }, {
                      nodeId = d => d.id, // given d in nodes, returns a unique identifier (string)
                      nodeGroup, // given d in nodes, returns an (ordinal) value for color
                      nodeGroups, // an array of ordinal values representing the node groups
                      nodeTitle, // given d in nodes, a title string
                      nodeFill = "currentColor", // node stroke fill (if not using a group color encoding)
                      nodeStroke = "#67a2d8", // node stroke color
                      nodeStrokeWidth = 1.5, // node stroke width, in pixels
                      nodeStrokeOpacity = 1, // node stroke opacity
                      nodeRadius = 8, // node radius, in pixels
                      nodeStrength,
                      linkSource = ({source}) => source, // given d in links, returns a node identifier string
                      linkTarget = ({target}) => target, // given d in links, returns a node identifier string
                      linkStroke = "#999", // link stroke color
                      linkStrokeOpacity = 0.6, // link stroke opacity
                      linkStrokeWidth = 1.5, // given d in links, returns a stroke width in pixels
                      linkStrokeLinecap = "round", // link stroke linecap
                      linkStrength,
                      colors = d3.schemeTableau10, // an array of color strings, for the node groups
                      width = 640, // outer width, in pixels
                      height = 400, // outer height, in pixels
                      invalidation, // when this promise resolves, stop the simulation,
                      withDrag
                    } = {}) {
  // Compute values.
  const N = d3.map(nodes, nodeId).map(intern);
  const LS = d3.map(links, linkSource).map(intern);
  const LT = d3.map(links, linkTarget).map(intern);
  if (nodeTitle === undefined) nodeTitle = (_, i) => N[i];
  const T = nodeTitle == null ? null : d3.map(nodes, nodeTitle);
  const G = nodeGroup == null ? null : d3.map(nodes, nodeGroup).map(intern);
  const W = typeof linkStrokeWidth !== "function" ? null : d3.map(links, linkStrokeWidth);

  // Replace the input nodes and links with mutable objects for the simulation.
  nodes = d3.map(nodes, (_, i) => ({id: N[i]}));
  links = d3.map(links, (_, i) => ({source: LS[i], target: LT[i]}));

  // Compute default domains.
  if (G && nodeGroups === undefined) nodeGroups = d3.sort(G);

  // Construct the scales.
  const color = nodeGroup == null ? null : d3.scaleOrdinal(nodeGroups, colors);

  // Construct the forces.
  const forceNode = d3.forceManyBody();
  const forceLink = d3.forceLink(links).id(({index: i}) => N[i]);
  if (nodeStrength !== undefined) forceNode.strength(nodeStrength);
  if (linkStrength !== undefined) forceLink.strength(linkStrength);

  const simulation = d3.forceSimulation(nodes)
    .force("link", forceLink)
    .force("charge", forceNode)
    .force("x", d3.forceX())
    .force("y", d3.forceY())
    .on("tick", ticked);

  const svg = d3.create("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", [-width / 2, -height / 2, width, height])
    .attr("style", "max-width: 100%; height: auto; height: intrinsic;");

  link = svg.append("g")
    .attr("stroke", '#ff05fd')
    .attr("stroke-opacity", 0.1)
    .attr("stroke-width", 4)
    .attr("stroke-linecap", linkStrokeLinecap)
    .selectAll("line")
    .data(links)
    .join("line")
    .attr("id", d => `link-${d.source.id}-${d.target.id}`)

  if (W) link.attr("stroke-width", ({index: i}) => W[i]);

  node = svg.append("g")
    .attr("stroke-opacity", nodeStrokeOpacity)
    .selectAll("g")
    .data(nodes)
    .join("g")
    .append('text')
    .text(({index: i}) => T[i])
    .attr('font-size', 12)
    .style('-webkit-filter', 'drop-shadow( 0px 0px 2px rgba(255, 255, 255, 1))')
    .style('filter', 'drop-shadow( 0px 0px 2px rgba(255, 255, 255, 1))')
    .attr('stroke', '#ff05fd')
    .attr('cursor', 'pointer')
    .attr("id", ({index: i}) => `node-${i}`)


  withDrag && node.call(drag(simulation));

  if (T) node.append("title").text(({index: i}) => T[i]);

  // Handle invalidation.
  if (invalidation != null) invalidation.then(() => simulation.stop());

  function intern(value) {
    return value !== null && typeof value === "object" ? value.valueOf() : value;
  }

  function ticked() {
    link
      .attr("x1", d => d.source.x)
      .attr("y1", d => d.source.y)
      .attr("x2", d => d.target.x)
      .attr("y2", d => d.target.y);

    node
      .attr("x", d => d.x)
      .attr("y", d => d.y);
  }

  function drag(simulation) {
    function dragstarted(event) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    }

    function dragged(event) {
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    }

    function dragended(event) {
      if (!event.active) simulation.alphaTarget(0);
      event.subject.fx = null;
      event.subject.fy = null;
    }

    return d3.drag()
      .on("start", dragstarted)
      .on("drag", dragged)
      .on("end", dragended);
  }

  return Object.assign(svg.node(), {
    scales: {color},
    update({links, nodeTitle}) {
      links = links.map(d => Object.assign({}, d));
      const T = nodeTitle == null ? null : d3.map(nodes, nodeTitle);
      node.text(({index: i}) =>  T[i])
        .attr('stroke', '#ff05fd');

      link = link
        .data(links, d => [d.source, d.target])
        .join("line")
        .attr("id", d => `link-${d.source}-${d.target}`);

      simulation.nodes(nodes);
      simulation.force("link").links(links);
      simulation.alpha(1).restart().tick();
      return ticked();
    },
    tick() {
      return ticked();
    }
  });
}
