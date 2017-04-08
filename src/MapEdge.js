var SortedList = require('./SortedList');

var SEGMENT_ORIENTATION = { UP: 0, DOWN: 1, LEFT: 2, RIGHT: 3 };
var POINT_TYPE          = { CORNER: 0, GROOVE: 1 };
var POINT_ORIENTATION   = { NO: 0, SO: 1, SE: 2, NE: 3 };

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
function rayCast(sourcePoint, targetPoint, segment) {
	// alias defini†ions
	var rpx = sourcePoint.x;
	var rpy = sourcePoint.y;

	var spx = segment.start.x;
	var spy = segment.start.y;

	var sdx = segment.dx;
	var sdy = segment.dy;

	// ray direction
	var rdx = targetPoint.x - rpx;
	var rdy = targetPoint.y - rpy;

	if (rdx === 0 && rdy === 0) return null; // source and target are same: no ray

	// cast ratios
	var r = sdx * rdy - sdy * rdx;
	if (r === 0) return null; // ray and segent are parallel

	var ts = (rdx * (spy - rpy) + rdy * (rpx - spx)) / r;
	var tr;
	if (rdx !== 0) {
		tr = (spx + sdx * ts - rpx) / rdx;
	} else {
		tr = (spy + sdy * ts - rpy) / rdy;
	}
		
	// cast point
	var x = spx + sdx * ts;
	var y = spy + sdy * ts;

	return { x: x, y: y, tr: tr, ts: ts };
}

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
function Point(x, y, orientation, id) {
	this.x           = x || 0;
	this.y           = y || 0;
	this.start       = null; // the segment this point starts
	this.end         = null; // the segment this point ends
	this.type        = POINT_TYPE.GROOVE;
	this.orientation = orientation;
	this.id          = id;

	// when point is a corner, lists of segments this corner can cast to
	this.cast = [ [], [], [], [] ];
}

Point.prototype.raycast = function (source, directionId) {
	var closestCast = { tr: Infinity };
	var closestSegment = null;

	var segments = this.cast[directionId];
	for (var i = 0; i < segments.length; i++) {
		var segment = segments[i];
		var cast = rayCast(source, this, segment);
		if (!cast) continue; // no cast
		// if (cast.tr < 0) continue; // cast before target (should never happen)
		if (cast.ts < 0 || cast.ts > 1) continue; // cast outside of segment

		// keep the closest cast
		if (cast.tr < closestCast.tr) {
			closestCast = cast;
			closestSegment = segment;
		}
	}

	if (!closestSegment) return null;

	closestCast.point = this;
	closestCast.segment = closestSegment;

	return closestCast;
};

Point.prototype.optimizeCast = function () {
	// return
	for (var direction = 0; direction < 4; direction++) {
		var segments = this.cast[direction];
		// going backward because segments can be removed
		for (var i = segments.length - 1; i >= 0; i--) {
			if (this.isSegmentCovered(segments[i])) {
				segments.splice(i, 1);
			}
		}
	}
};

function sortCoverage(a, b) {
	return a[0] - b[0];
}

Point.prototype.isSegmentCovered = function (segmentTest) {
	var coverage = [];

	// remove part of the segment outside any cast

	// TODO

	// cast all other segments to this one
	for (var direction = 0; direction < 4; direction++) {
		var segments = this.cast[direction];
		for (var i = 0; i < segments.length; i++) {
			var segment = segments[i];
			if (segment === segmentTest) continue;

			var tsStart, tsEnd;

			var rayStart = rayCast(this, segment.start, segmentTest);
			if (!rayStart) {
				tsStart = -Infinity;
			} else {
				tsStart = rayStart.ts;
				if (rayStart.tr < 0) tsStart = -Infinity;
				else if (rayStart.tr < 1) continue;
			}

			var rayEnd = rayCast(this, segment.end, segmentTest);
			if (!rayEnd) {
				tsEnd = 0;
				// continue;
			} else {
				tsEnd = rayEnd.ts;
				if (rayEnd.tr < 0) tsEnd = 0;
				else if (rayEnd.tr < 1) continue;
			}

			coverage.push([tsStart, tsEnd]);
		}
	}

	if (coverage.length === 0) return false;

	// sort coverage by starting position
	coverage.sort(sortCoverage);

	// check if it's entirely covered
	if (coverage[0][0] > 0) return false; // begining of segment is not covered
	var max = coverage[0][1];
	if (max >= 1) return true; // whole segment covered

	for (var i = 1; i < coverage.length; i++) {
		if (max < coverage[i][0]) return false; // there is a hole
		max = coverage[i][1];
		if (max >= 1) return true; // whole segment covered
	}

	return false;
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
var _points = {};

function getPointId(x, y, orientation) {
	return 'p:' + x + ':' + y + ':' + orientation;
}

function getPoint(x, y, orientation) {
	// TODO: be able to separate the checkboard corners
	var id = getPointId(x, y, orientation);
	var point = _points[id];
	if (!point) point = _points[id] = new Point(x, y, orientation, id);
	return point;
}

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
var _segmentId = 0;
function getSegmentId() {
	return 's:' + (_segmentId++);
}

function Segment(orientation) {
	this.id          = getSegmentId();
	this.orientation = orientation; // segment's normal direction
	this.start       = null; // Point
	this.end         = null; // Point
	this.dx          = 0;
	this.dy          = 0;
}

Segment.prototype.setEnd = function (x, y, orientation) {
	var point = getPoint(x, y, orientation); // TODO: checkboard points
	this.end  = point;
	point.end = this;
	this._computeDirection();
};

Segment.prototype.setStart = function (x, y, orientation) {
	var point   = getPoint(x, y, orientation); // TODO: checkboard points
	this.start  = point;
	point.start = this;
	this._computeDirection();
};

Segment.prototype._computeDirection = function () {
	if (!this.start || !this.end) return;
	this.dx = this.end.x - this.start.x;
	this.dy = this.end.y - this.start.y;
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
function MapEdge(map) {
	this.map        = map;
	this.points     = {};
	this.corners    = [];
	this.segments   = [];
	this.upSegments = [];

	this._generate();
}

MapEdge.prototype._hasTile = function (x, y) {
	// outside of map is considered being tile
	if (x < 0 || x >= this.map.width || y < 0 || y >= this.map.height) return true;
	return !!this.map.get(x, y);
};

MapEdge.prototype._generate = function () {
	var map = this.map;
	this.points = _points = {};

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
					var orientation = this._hasTile(x - 1, y) ? POINT_ORIENTATION.NE : POINT_ORIENTATION.NO;
					currentSegment = new Segment(SEGMENT_ORIENTATION.UP);
					currentSegment.setEnd(x, y, orientation);

					// potential N-O corner
					if (orientation === POINT_ORIENTATION.NO) {
						var corner = currentSegment.end;
						corner.type = POINT_TYPE.CORNER;
						this.corners.push(corner);
					}
				} else if (!tile && before) {
					// start down segment
					var orientation = this._hasTile(x - 1, y) ? POINT_ORIENTATION.SE : POINT_ORIENTATION.SO;
					currentSegment = new Segment(SEGMENT_ORIENTATION.DOWN);
					currentSegment.setStart(x, y, orientation);

					// potential S-O corner
					if (orientation === POINT_ORIENTATION.SO) {
						var corner = currentSegment.start;
						corner.type = POINT_TYPE.CORNER;
						this.corners.push(corner);
					}
				}

			} else if (currentSegment.orientation === SEGMENT_ORIENTATION.UP) {
				if (tile === before) {
					// both tile are both empty or full => stop up segment
					var orientation = tile ? POINT_ORIENTATION.NO : POINT_ORIENTATION.NE;
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
					currentSegment.setStart(x, y, POINT_ORIENTATION.NO);
					this.segments.push(currentSegment);
					this.upSegments.push(currentSegment);

					// and start down segment
					currentSegment = new Segment(SEGMENT_ORIENTATION.DOWN);
					currentSegment.setStart(x, y, POINT_ORIENTATION.SE);
				}

			} else if (currentSegment.orientation === SEGMENT_ORIENTATION.DOWN) {
				if (tile === before) {
					// both tile are both empty or full => stop down segment
					var orientation = tile ? POINT_ORIENTATION.SO : POINT_ORIENTATION.SE;
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
					currentSegment.setEnd(x, y, POINT_ORIENTATION.SO);
					this.segments.push(currentSegment);

					// and start up segment
					currentSegment = new Segment(SEGMENT_ORIENTATION.UP);
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
					var orientation = this._hasTile(x, y - 1) ? POINT_ORIENTATION.SO : POINT_ORIENTATION.NO;
					currentSegment = new Segment(SEGMENT_ORIENTATION.LEFT);
					currentSegment.setStart(x, y, orientation);
				} else if (!tile && before) {
					// start right segment
					var orientation = this._hasTile(x, y - 1) ? POINT_ORIENTATION.SE : POINT_ORIENTATION.NE;
					currentSegment = new Segment(SEGMENT_ORIENTATION.RIGHT);
					currentSegment.setEnd(x, y, orientation);
				}

			} else if (currentSegment.orientation === SEGMENT_ORIENTATION.LEFT) {
				if (tile === before) {
					// both tile are both empty or full => stop left segment
					var orientation = tile ? POINT_ORIENTATION.NO : POINT_ORIENTATION.SO;
					currentSegment.setEnd(x, y, orientation);
					this.segments.push(currentSegment);
					currentSegment = null;
				} else if (before && !tile) {
					// stop left segment
					currentSegment.setEnd(x, y, POINT_ORIENTATION.NO);
					this.segments.push(currentSegment);

					// and start right segment
					currentSegment = new Segment(SEGMENT_ORIENTATION.RIGHT);
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
					currentSegment = new Segment(SEGMENT_ORIENTATION.LEFT);
					currentSegment.setStart(x, y, POINT_ORIENTATION.SO);
				}

			} else {
				console.error('Something went horribly wrong!');
			}
		}
	}
	this._initCorners();
};

var CAST_PER_CORNER_ORIENTATION = {};

var CAST_PARAM_NE = { s1: SEGMENT_ORIENTATION.DOWN, s2: SEGMENT_ORIENTATION.LEFT,  x:  1, y: -1, listId: POINT_ORIENTATION.NE };
var CAST_PARAM_NO = { s1: SEGMENT_ORIENTATION.DOWN, s2: SEGMENT_ORIENTATION.RIGHT, x: -1, y: -1, listId: POINT_ORIENTATION.NO };
var CAST_PARAM_SE = { s1: SEGMENT_ORIENTATION.UP,   s2: SEGMENT_ORIENTATION.LEFT,  x:  1, y:  1, listId: POINT_ORIENTATION.SE };
var CAST_PARAM_SO = { s1: SEGMENT_ORIENTATION.UP,   s2: SEGMENT_ORIENTATION.RIGHT, x: -1, y:  1, listId: POINT_ORIENTATION.SO };

CAST_PER_CORNER_ORIENTATION[POINT_ORIENTATION.NO] = [CAST_PARAM_NE, CAST_PARAM_SO];
CAST_PER_CORNER_ORIENTATION[POINT_ORIENTATION.NE] = [CAST_PARAM_NO, CAST_PARAM_SE];
CAST_PER_CORNER_ORIENTATION[POINT_ORIENTATION.SO] = [CAST_PARAM_NO, CAST_PARAM_SE];
CAST_PER_CORNER_ORIENTATION[POINT_ORIENTATION.SE] = [CAST_PARAM_NE, CAST_PARAM_SO];

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

MapEdge.prototype.getRaycasts = function (x, y) {
	var source     = { x: x, y: y };
	var cornerMap  = {}; // all raycasts, mapped by its corner id
	var segmentMap = {}; // orderd list of raycasts in each segments

	for (var i = 0; i < this.corners.length; i++) {
		var corner = this.corners[i];

		// determine in which quadran the corner belongs
		var directionId = corner.x < x
			? (corner.y < y ? POINT_ORIENTATION.NO : POINT_ORIENTATION.SO)
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

module.exports = MapEdge;
