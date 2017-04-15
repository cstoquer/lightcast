var MapEdge = require('./MapEdge');
var Texture = require('Texture');


//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
var TILE_W = settings.tileSize[0];
var TILE_H = settings.tileSize[1];

function drawPoints(points, color) {
	for (var i = 0; i < points.length; i++) {
		var point = points[i];
		pen(color || (6 + point.orientation));
		rect(point.x * TILE_W - 1, point.y * TILE_H - 1, 3, 3);
	}
}

function drawSegments(segments, color) {
	var ctx = $screen.ctx;
	pen(color || 15);
	for (var i = 0; i < segments.length; i++) {
		var segment = segments[i];
		var a = segment.start;
		var b = segment.end;
		ctx.beginPath();
		ctx.moveTo(a.x * TILE_W, a.y * TILE_H);
		ctx.lineTo(b.x * TILE_W, b.y * TILE_H);
		ctx.stroke();
	}
}

function drawEdgeLoop(point) {
	var start = point;
	if (!point.start) return;

	var ctx = $screen.ctx;
	ctx.strokeStyle = '#F00';
	ctx.beginPath();
	ctx.moveTo(point.x * TILE_W, point.y * TILE_H);

	do {
		var segment = point.start;
		var point = segment.end;
		ctx.lineTo(point.x * TILE_W, point.y * TILE_H);

	} while (point !== start && point.start);

	ctx.stroke();
}

function drawPolygon(points, texture) {
	texture = texture || $screen
	var ctx = texture.ctx;
	// ctx.strokeStyle = '#FFF';
	// ctx.fillStyle = 'rgba(255,255,255,0.5)';
	// ctx.fillStyle = '#FFF';
	texture.paper(1);
	texture.pen(1);
	ctx.beginPath();
	ctx.moveTo(points[0].x * TILE_W, points[0].y * TILE_H);

	for (var i = 1; i < points.length; i++) {
		var point = points[i];
		ctx.lineTo(point.x * TILE_W, point.y * TILE_H);
	}

	ctx.closePath();
	ctx.fill();
	ctx.stroke();
	paper(0);
}


//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄

var map = getMap('map');
// var map = getMap('test');
var background = getMap('background');
var mapEdges = new MapEdge(map);
console.log(mapEdges);

var EPSILON = 0.001;
var offscreenTexture = new Texture(settings.screen.width, settings.screen.height);

// draw(map);


require('pointer').onMove(function (x, y) {

	if (map.get(~~(x / TILE_W), ~~(y / TILE_H))) {
		// we're inside a tile: don't cast light
		cls();
		draw(map);
		sprite(128, ~~x - 4, ~~y - 4)
		return;
	}

	// drawSegments(mapEdges.segments);

	var polygon = mapEdges.getCastPolygon(x / TILE_W + EPSILON, y / TILE_H + EPSILON);
	if (!polygon) return;

	cls();
	draw(map);
	// drawPolygon(polygon);

	offscreenTexture.clear();
	offscreenTexture.ctx.globalCompositeOperation = 'source-over';
	drawPolygon(polygon, offscreenTexture);
	offscreenTexture.draw(assets.halo, x - 100, y - 100);
	offscreenTexture.ctx.globalCompositeOperation = 'destination-in';
	offscreenTexture.draw(assets.lightMask, x - 100, y - 100);

	$screen.clear();
	$screen.paper(0);
	draw(offscreenTexture, 0, 0);
	$screen.ctx.globalCompositeOperation = 'source-in';
	draw(background);
	$screen.ctx.globalCompositeOperation = 'source-over';
	draw(map);

	sprite(107, ~~x - 4, ~~y - 4)
});

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
// Update is called once per frame
var cornerIndex = 0;
exports.update = function () {
	if (!btnp.A) return;
	cls();
	timer = 0;
	cornerIndex = ++cornerIndex % mapEdges.corners.length;
	drawSegments(mapEdges.segments, 5);
	var p = mapEdges.corners[cornerIndex];
	drawPoints([p]);
	drawSegments(p.cast[0], 6);
	drawSegments(p.cast[1], 7);
	drawSegments(p.cast[2], 8);
	drawSegments(p.cast[3], 15);
};
