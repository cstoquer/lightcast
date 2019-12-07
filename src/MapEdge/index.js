var SortedList = require('./SortedList');
var Point      = require('./Point');
var Segment    = require('./Segment');
var constants  = require('./constants');

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
var SEGMENT_ORIENTATION         = constants.SEGMENT_ORIENTATION;
var POINT_TYPE                  = constants.POINT_TYPE;
var POINT_ORIENTATION           = constants.POINT_ORIENTATION;
var CAST_PER_CORNER_ORIENTATION = constants.CAST_PER_CORNER_ORIENTATION;

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
function MapEdge(map) {
	this.map        = map;
	this.points     = {};
	this.corners    = [];
	this.segments   = [];
	this.upSegments = [];

	this._generate();
}

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
MapEdge.prototype._hasTile = function (x, y) {
	// outside of map is considered being tile
	if (x < 0 || x >= this.map.width || y < 0 || y >= this.map.height) return true;
	return !!this.map.get(x, y);
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
function getPointId(x, y, orientation) {
	return 'p:' + x + ':' + y + ':' + orientation;
}

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
MapEdge.prototype.getSegmentId = function () {
	return 's:' + (this._segmentId++);
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
MapEdge.prototype.getPoint = function(x, y, orientation) {
	// TODO: be able to separate the checkboard corners
	var id = getPointId(x, y, orientation);
	var point = this.points[id];
	if (!point) point = this.points[id] = new Point(x, y, orientation, id);
	return point;
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
MapEdge.prototype._generate = function () {
	var map = this.map;
	this.points = {};
	this._segmentId = 0;


	// TODO: detect and store corner points

	var currentSegment = null;

	// ----------------------------------------------
	// generate horizontal segments
	// also get map corners in this pass only

	for (var y = 0; y <= map.height; y++) {
		currentSegment = null;
		for (var x = 0; x <= map.width; x++) {
			var before = this._hasTile(x, y - 1);
			var tile   = this._hasTile(x, y);
			if (!currentSegment) {
				// new segment if both tile are different
				if (tile && !before) {
					// start up segment
					var orientation = this._hasTile(x - 1, y) ? POINT_ORIENTATION.NE : POINT_ORIENTATION.NW;
					currentSegment = new Segment(SEGMENT_ORIENTATION.UP, this);
					currentSegment.setEnd(x, y, orientation);

					// potential N-O corner
					if (orientation === POINT_ORIENTATION.NW) {
						var corner = currentSegment.end;
						corner.type = POINT_TYPE.CORNER;
						this.corners.push(corner);
					}
				} else if (!tile && before) {
					// start down segment
					var orientation = this._hasTile(x - 1, y) ? POINT_ORIENTATION.SE : POINT_ORIENTATION.SW;
					currentSegment = new Segment(SEGMENT_ORIENTATION.DOWN, this);
					currentSegment.setStart(x, y, orientation);

					// potential S-O corner
					if (orientation === POINT_ORIENTATION.SW) {
						var corner = currentSegment.start;
						corner.type = POINT_TYPE.CORNER;
						this.corners.push(corner);
					}
				}

			} else if (currentSegment.orientation === SEGMENT_ORIENTATION.UP) {
				if (tile === before) {
					// both tile are both empty or full => stop up segment
					var orientation = tile ? POINT_ORIENTATION.NW : POINT_ORIENTATION.NE;
					currentSegment.setStart(x, y, orientation);
					this.segments.push(currentSegment);
					this.upSegments.push(currentSegment);

					// potential N-E corner
					if (orientation === POINT_ORIENTATION.NE) {
						var corner = currentSegment.start;
						corner.type = POINT_TYPE.CORNER;
						this.corners.push(corner);
					}

					currentSegment = null;
				} else if (before && !tile) {
					// stop up segment
					currentSegment.setStart(x, y, POINT_ORIENTATION.NW);
					this.segments.push(currentSegment);
					this.upSegments.push(currentSegment);

					// and start down segment
					currentSegment = new Segment(SEGMENT_ORIENTATION.DOWN, this);
					currentSegment.setStart(x, y, POINT_ORIENTATION.SE);
				}

			} else if (currentSegment.orientation === SEGMENT_ORIENTATION.DOWN) {
				if (tile === before) {
					// both tile are both empty or full => stop down segment
					var orientation = tile ? POINT_ORIENTATION.SW : POINT_ORIENTATION.SE;
					currentSegment.setEnd(x, y, orientation);
					this.segments.push(currentSegment);

					// potential S-E corner
					if (orientation === POINT_ORIENTATION.SE) {
						var corner = currentSegment.end;
						corner.type = POINT_TYPE.CORNER;
						this.corners.push(corner);
					}

					currentSegment = null;
				} else if (!before && tile) {
					// stop down segment
					currentSegment.setEnd(x, y, POINT_ORIENTATION.SW);
					this.segments.push(currentSegment);

					// and start up segment
					currentSegment = new Segment(SEGMENT_ORIENTATION.UP, this);
					currentSegment.setEnd(x, y, POINT_ORIENTATION.NE);
				}

			} else {
				console.error('Something went horribly wrong!');
			}
		}
	}


	// ----------------------------------------------
	// generate vertical segments

	for (var x = 0; x <= map.width; x++) {
		var currentSegment = null;
		for (var y = 0; y <= map.height; y++) {
			var before = this._hasTile(x - 1, y);
			var tile   = this._hasTile(x, y);
			if (!currentSegment) {
				// new segment if both tile are different
				if (tile && !before) {
					// start left segment
					var orientation = this._hasTile(x, y - 1) ? POINT_ORIENTATION.SW : POINT_ORIENTATION.NW;
					currentSegment = new Segment(SEGMENT_ORIENTATION.LEFT, this);
					currentSegment.setStart(x, y, orientation);
				} else if (!tile && before) {
					// start right segment
					var orientation = this._hasTile(x, y - 1) ? POINT_ORIENTATION.SE : POINT_ORIENTATION.NE;
					currentSegment = new Segment(SEGMENT_ORIENTATION.RIGHT, this);
					currentSegment.setEnd(x, y, orientation);
				}

			} else if (currentSegment.orientation === SEGMENT_ORIENTATION.LEFT) {
				if (tile === before) {
					// both tile are both empty or full => stop left segment
					var orientation = tile ? POINT_ORIENTATION.NW : POINT_ORIENTATION.SW;
					currentSegment.setEnd(x, y, orientation);
					this.segments.push(currentSegment);
					currentSegment = null;
				} else if (before && !tile) {
					// stop left segment
					currentSegment.setEnd(x, y, POINT_ORIENTATION.NW);
					this.segments.push(currentSegment);

					// and start right segment
					currentSegment = new Segment(SEGMENT_ORIENTATION.RIGHT, this);
					currentSegment.setEnd(x, y, POINT_ORIENTATION.SE);
				}

			} else if (currentSegment.orientation === SEGMENT_ORIENTATION.RIGHT) {
				if (tile === before) {
					// both tile are both empty or full => stop right segment
					var orientation = tile ? POINT_ORIENTATION.NE : POINT_ORIENTATION.SE;
					currentSegment.setStart(x, y, orientation);
					this.segments.push(currentSegment);
					currentSegment = null;
				} else if (!before && tile) {
					// stop right segment
					currentSegment.setStart(x, y, POINT_ORIENTATION.NE);
					this.segments.push(currentSegment);

					// and start left segment
					currentSegment = new Segment(SEGMENT_ORIENTATION.LEFT, this);
					currentSegment.setStart(x, y, POINT_ORIENTATION.SW);
				}

			} else {
				console.error('Something went horribly wrong!');
			}
		}
	}
	this._initCorners();
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
MapEdge.prototype._initCorners = function () {
	for (var i = this.corners.length - 1; i >= 0; i--) {
		var corner = this.corners[i];
		var params = CAST_PER_CORNER_ORIENTATION[corner.orientation];
		this._getCornerCast(corner, params[0]);
		this._getCornerCast(corner, params[1]);

		// optimize corner list by removing edges on which point can never be cast
		corner.optimizeCast();

		// TODO: if all cast list are empty, remove this point from corners
	}
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
MapEdge.prototype._getCornerCast = function (corner, params) {
	for (var i = 0; i < this.segments.length; i++) {
		var segment = this.segments[i];
		if (segment.orientation !== params.s1 && segment.orientation !== params.s2) continue;
		if ((params.x * segment.start.x > params.x * corner.x && params.y * segment.start.y > params.y * corner.y)
		 || (params.x * segment.end.x   > params.x * corner.x && params.y * segment.end.y   > params.y * corner.y)) {
			corner.cast[params.listId].push(segment);
		}
	}
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
MapEdge.prototype._getPolygonStart = function (downCast, raycasts) {
	var segment = downCast.segment;
	if (!segment) return null;

	var segmentCast = raycasts.segments[segment.id];

	if (!segmentCast) return segment.start;

	var ts = (downCast.x - segment.start.x) / segment.dx;
	var previous = segment.start;
	for (var node = segmentCast.first; node !== null; node = node.next) {
		if (node.object.ts > ts) break;
		previous = node.object;
	}

	return previous;
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
MapEdge.prototype._getDownwardRaycast = function (x, y) {
	// to get the first point of polygon, we cast a ray down from source
	// because the ray is horizontal, the raycast formula can be simplified
	// and because segments are sorted, we can return as soon as we find a match
	for (var i = 0; i < this.upSegments.length; i++) {
		var segment = this.upSegments[i];
		if (segment.start.y <= y) continue;
		if (segment.start.x >= x && segment.end.x <= x) {
			return {
				x: x,
				y: segment.start.y,
				segment: segment
			};
		}
	}
	return null;
};

function sortRay(a, b) {
	return a.ts - b.ts;
}

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
MapEdge.prototype.getRaycasts = function (x, y) {
	var source     = { x: x, y: y };
	var cornerMap  = {}; // all raycasts, mapped by its corner id
	var segmentMap = {}; // orderd list of raycasts in each segments

	for (var i = 0; i < this.corners.length; i++) {
		var corner = this.corners[i];

		// determine in which quadran the corner belongs
		var directionId = corner.x < x
			? (corner.y < y ? POINT_ORIENTATION.NW : POINT_ORIENTATION.SW)
			: (corner.y < y ? POINT_ORIENTATION.NE : POINT_ORIENTATION.SE);

		if (corner.cast[directionId].length === 0) continue; // corner can't be cast in that direction

		var raycast = corner.raycast(source, directionId);
		if (!raycast) continue; // corner doesn't cast to anything from this source point

		cornerMap[corner.id] = raycast;
		var segmentId = raycast.segment.id;
		if (!segmentMap[segmentId]) segmentMap[segmentId] = new SortedList(sortRay);
		raycast.segmentListRef = segmentMap[segmentId].add(raycast);
	}

	return {
		corners:  cornerMap,
		segments: segmentMap
	};
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
MapEdge.prototype.getCastPolygon = function (x, y) {
	// TODO: enable bounding box
	var downCast = this._getDownwardRaycast(x, y);
	if (!downCast) return null;
	var raycasts = this.getRaycasts(x, y);
	var startPoint = this._getPolygonStart(downCast, raycasts);
	if (!startPoint) return null;

	var polygon = [];
	var point   = startPoint;
	var flag    = true; // don't follow back ray for first corner

	// special case: starting point is a cast
	if (point.segmentListRef) {
		var node = point.segmentListRef.next;
		if (node) {
			var cast = node.object;
			// track back to casted corner
			point = cast.point;
			// we already followed cast
			flag = true;
		} else {
			point = point.segment.end;
			flag = false;
		}
		// reset start point
		startPoint = point;
	}

	// crawl from one point to the next to construct the polygon
	do {
		// add current point
		polygon.push({ x: point.x, y: point.y });

		// find next point
		var castFromPoint = raycasts.corners[point.id];
		if (castFromPoint && !flag) {
			// point is a corner casted, follow cast from this point
			polygon.push({ x: castFromPoint.x, y: castFromPoint.y });

			// follow segment from cast to the next cast in segment or segment's end
			var segment = castFromPoint.segment;

			var node = castFromPoint.segmentListRef.next;
			if (node) {
				// add next cast
				var cast = node.object;
				polygon.push({ x: cast.x, y: cast.y });

				// track back to casted corner
				point = cast.point;

				// we already followed cast
				flag = true;
			} else {
				point = segment.end;
				flag = false;
			}

		} else {
			// follow segment
			var segment = point.start;
			if (!segment) console.warn(point)
			var castInSegment = raycasts.segments[segment.id];
			if (castInSegment) {
				// get first cast in segment and follow back the point
				node = castInSegment.first;
				cast = node.object;
				polygon.push({ x: cast.x, y: cast.y });

				// track back to casted corner
				point = cast.point;

				// point is a corner and we already followed cast back
				flag = true;


			} else {
				// just follow segment
				point = segment.end;
				flag = false;
			}
		}

	} while (point !== startPoint);

	return polygon;
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
module.exports = MapEdge;
