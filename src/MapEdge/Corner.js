var constants = require('./constants');
var castRay   = require('./castRay');

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
var POINT_TYPE                  = constants.POINT_TYPE;
var CAST_PER_CORNER_ORIENTATION = constants.CAST_PER_CORNER_ORIENTATION;



//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
function Corner(x, y, orientation, id) {
	this.x           = x || 0;
	this.y           = y || 0;
	this.start       = null; // the wall this corner starts
	this.end         = null; // the wall this corner ends
	this.type        = POINT_TYPE.GROOVE;
	this.orientation = orientation;
	this.id          = id;

	// when point is a corner, lists of walls this corner can cast to
	this.cast = [ [], [], [], [] ];
}

module.exports = Corner;

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
Corner.prototype.initAsCorner = function (walls) {
	this.type = POINT_TYPE.CORNER;
	var params = CAST_PER_CORNER_ORIENTATION[this.orientation];

	this._initCastableSegments(walls, params[0]);
	this._initCastableSegments(walls, params[1]);

	// optimize corner list by removing edges on which point can never be cast
	this._optimizeCast();
}

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/**
 * Prepare the list of castable walls for a diagonal direction
 *
 * @param {Segment[]} walls - all walls of the map
 * @param {Object} params - cast parameters (see `constants.js`)
 */
Corner.prototype._initCastableSegments = function (walls, params) {
	for (var i = 0; i < walls.length; i++) {
		var wall = walls[i];
		if (wall.orientation !== params.s1 && wall.orientation !== params.s2) continue;
		if ((params.x * wall.start.x > params.x * this.x && params.y * wall.start.y > params.y * this.y)
		 || (params.x * wall.end.x   > params.x * this.x && params.y * wall.end.y   > params.y * this.y)) {
			this.cast[params.listId].push(wall);
		}
	}
};

var INITIAL_CLOSEST_CAST = { tr: Infinity };

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
Corner.prototype.projectRaycast = function (source, directionId) {
	var closestCast = INITIAL_CLOSEST_CAST;
	var closestWall = null;

	var walls = this.cast[directionId];
	for (var i = 0; i < walls.length; i++) {
		var wall = walls[i];
		var cast = castRay(source, this, wall);
		if (!cast) continue; // no cast
		// if (cast.tr < 0) continue; // cast before target (should never happen)
		if (cast.ts < 0 || cast.ts > 1) continue; // cast outside of wall

		// keep the closest cast
		if (cast.tr < closestCast.tr) {
			closestCast = cast;
			closestWall = wall;
		}
	}

	if (!closestWall) return null;

	closestCast.point = this;
	closestCast.wall  = closestWall;

	return closestCast;
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
Corner.prototype._optimizeCast = function () {
	for (var direction = 0; direction < 4; direction++) {
		var walls = this.cast[direction];
		// iterate backward because walls can be removed
		for (var i = walls.length - 1; i >= 0; i--) {
			if (this._isWallCovered(walls[i])) {
				walls.splice(i, 1);
			}
		}
	}
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
function sortCoverage(a, b) {
	return a[0] - b[0];
}

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
Corner.prototype._isWallCovered = function (wallTest) {
	var coverage = [];

	// remove part of the wall outside any cast

	// TODO

	// cast all other walls to this one
	for (var direction = 0; direction < 4; direction++) {
		var walls = this.cast[direction];
		for (var i = 0; i < walls.length; i++) {
			var wall = walls[i];
			if (wall === wallTest) continue;

			var tsStart, tsEnd;

			var rayStart = castRay(this, wall.start, wallTest);
			if (!rayStart) {
				tsStart = -Infinity;
			} else {
				tsStart = rayStart.ts;
				if (rayStart.tr < 0) tsStart = -Infinity;
				else if (rayStart.tr < 1) continue;
			}

			var rayEnd = castRay(this, wall.end, wallTest);
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
	if (coverage[0][0] > 0) return false; // begining of wall is not covered
	var max = coverage[0][1];
	if (max >= 1) return true; // whole wall covered

	for (var i = 1; i < coverage.length; i++) {
		if (max < coverage[i][0]) return false; // there is a hole
		max = coverage[i][1];
		if (max >= 1) return true; // whole wall covered
	}

	return false;
};
