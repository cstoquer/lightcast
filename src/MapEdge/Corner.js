var constants = require('./constants');

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
var POINT_TYPE                  = constants.POINT_TYPE;
var CAST_PER_CORNER_ORIENTATION = constants.CAST_PER_CORNER_ORIENTATION;

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
function Corner(x, y, orientation, id) {
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

module.exports = Corner;

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
Corner.prototype.initAsCorner = function (segments) {
	this.type = POINT_TYPE.CORNER;
	var params = CAST_PER_CORNER_ORIENTATION[this.orientation];

	this._initCastableSegments(segments, params[0]);
	this._initCastableSegments(segments, params[1]);

	// optimize corner list by removing edges on which point can never be cast
	this.optimizeCast();
}

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/**
 * Prepare the list of castable segments for a diagonal direction
 *
 * @param {Segment[]} segments - all wall of the map
 * @param {Object} params - cast parameters (see `constants.js`)
 */
Corner.prototype._initCastableSegments = function (segments, params) {
	for (var i = 0; i < segments.length; i++) {
		var segment = segments[i];
		if (segment.orientation !== params.s1 && segment.orientation !== params.s2) continue;
		if ((params.x * segment.start.x > params.x * this.x && params.y * segment.start.y > params.y * this.y)
		 || (params.x * segment.end.x   > params.x * this.x && params.y * segment.end.y   > params.y * this.y)) {
			this.cast[params.listId].push(segment);
		}
	}
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
Corner.prototype.projectRaycast = function (source, directionId) {
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

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
Corner.prototype.optimizeCast = function () {
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

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
function sortCoverage(a, b) {
	return a[0] - b[0];
}

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
Corner.prototype.isSegmentCovered = function (segmentTest) {
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
