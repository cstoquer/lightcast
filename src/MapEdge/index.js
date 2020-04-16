var RaycastsResult = require('./RaycastsResult');
var Corner         = require('./Corner');
var Wall           = require('./Wall');
var constants      = require('./constants');

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
var SEGMENT_ORIENTATION = constants.SEGMENT_ORIENTATION;
var POINT_ORIENTATION   = constants.POINT_ORIENTATION;

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
function MapEdge(map) {
	this.map       = map;
	this.cornerMap = {};
	this.corners   = [];
	this.walls     = [];
	this.upWalls   = [];
	this._wallId   = 0;

	this._prepare();
}
module.exports = MapEdge;

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
MapEdge.prototype.getNewWallId = function () {
	return this._wallId++;
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
MapEdge.prototype.getCorner = function(x, y, orientation) {
	// TODO: be able to separate the checkboard corners
	var id = 'p:' + x + ':' + y + ':' + orientation;
	var corner = this.cornerMap[id];
	if (!corner) corner = this.cornerMap[id] = new Corner(x, y, orientation, id);
	return corner;
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
MapEdge.prototype._hasTile = function (x, y) {
	// outside of map is considered being tile
	if (x < 0 || x >= this.map.width || y < 0 || y >= this.map.height) return true;
	return !!this.map.get(x, y);
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/**
 * Prepare map for fast raycast calculation. Construct the following arrays:
 *
 * - `corners` : points at the edge of tiles. point coordinates are set in tile unit.
 *               Point projects raycast in 2 possible directions according to its orientation.
 *
 * - `walls` : walls of the map.
 *
 * - `upWalls` : up orientated wall. upWalls are sorted by vertical position.
 *               These are used to get the first point of the raycasted polygon.
 */
MapEdge.prototype._prepare = function () {
	var map = this.map;


	// TODO: detect and store corner points

	var currentWall = null;

	// ----------------------------------------------
	// generate horizontal walls
	// also get map corners during this pass only

	for (var y = 0; y <= map.height; y++) {
		currentWall = null;
		for (var x = 0; x <= map.width; x++) {
			var before = this._hasTile(x, y - 1);
			var tile   = this._hasTile(x, y);
			if (!currentWall) {
				// new wall if both tile are different
				if (tile && !before) {
					// start up wall
					var orientation = this._hasTile(x - 1, y) ? POINT_ORIENTATION.NE : POINT_ORIENTATION.NW;
					currentWall = new Wall(SEGMENT_ORIENTATION.UP, this);
					currentWall.setEnd(x, y, orientation);

					// potential N-W corner
					if (orientation === POINT_ORIENTATION.NW) {
						var corner = currentWall.end;
						this.corners.push(corner);
					}
				} else if (!tile && before) {
					// start down wall
					var orientation = this._hasTile(x - 1, y) ? POINT_ORIENTATION.SE : POINT_ORIENTATION.SW;
					currentWall = new Wall(SEGMENT_ORIENTATION.DOWN, this);
					currentWall.setStart(x, y, orientation);

					// potential S-O corner
					if (orientation === POINT_ORIENTATION.SW) {
						var corner = currentWall.start;
						this.corners.push(corner);
					}
				}

			} else if (currentWall.orientation === SEGMENT_ORIENTATION.UP) {
				if (tile === before) {
					// both tile are both empty or full => stop up wall
					var orientation = tile ? POINT_ORIENTATION.NW : POINT_ORIENTATION.NE;
					currentWall.setStart(x, y, orientation);
					this.walls.push(currentWall);
					this.upWalls.push(currentWall);

					// potential N-E corner
					if (orientation === POINT_ORIENTATION.NE) {
						var corner = currentWall.start;
						this.corners.push(corner);
					}

					currentWall = null;
				} else if (before && !tile) {
					// stop up wall
					currentWall.setStart(x, y, POINT_ORIENTATION.NW);
					this.walls.push(currentWall);
					this.upWalls.push(currentWall);

					// and start down wall
					currentWall = new Wall(SEGMENT_ORIENTATION.DOWN, this);
					currentWall.setStart(x, y, POINT_ORIENTATION.SE);
				}

			} else if (currentWall.orientation === SEGMENT_ORIENTATION.DOWN) {
				if (tile === before) {
					// both tile are both empty or full => stop down wall
					var orientation = tile ? POINT_ORIENTATION.SW : POINT_ORIENTATION.SE;
					currentWall.setEnd(x, y, orientation);
					this.walls.push(currentWall);

					// potential S-E corner
					if (orientation === POINT_ORIENTATION.SE) {
						var corner = currentWall.end;
						this.corners.push(corner);
					}

					currentWall = null;
				} else if (!before && tile) {
					// stop down wall
					currentWall.setEnd(x, y, POINT_ORIENTATION.SW);
					this.walls.push(currentWall);

					// and start up wall
					currentWall = new Wall(SEGMENT_ORIENTATION.UP, this);
					currentWall.setEnd(x, y, POINT_ORIENTATION.NE);
				}

			} else {
				// should never reach here
				console.error('Something went wrong!');
			}
		}
	}


	// ----------------------------------------------
	// generate vertical walls

	for (var x = 0; x <= map.width; x++) {
		var currentWall = null;
		for (var y = 0; y <= map.height; y++) {
			var before = this._hasTile(x - 1, y);
			var tile   = this._hasTile(x, y);
			if (!currentWall) {
				// new wall if both tile are different
				if (tile && !before) {
					// start left wall
					var orientation = this._hasTile(x, y - 1) ? POINT_ORIENTATION.SW : POINT_ORIENTATION.NW;
					currentWall = new Wall(SEGMENT_ORIENTATION.LEFT, this);
					currentWall.setStart(x, y, orientation);
				} else if (!tile && before) {
					// start right wall
					var orientation = this._hasTile(x, y - 1) ? POINT_ORIENTATION.SE : POINT_ORIENTATION.NE;
					currentWall = new Wall(SEGMENT_ORIENTATION.RIGHT, this);
					currentWall.setEnd(x, y, orientation);
				}

			} else if (currentWall.orientation === SEGMENT_ORIENTATION.LEFT) {
				if (tile === before) {
					// both tile are both empty or full => stop left wall
					var orientation = tile ? POINT_ORIENTATION.NW : POINT_ORIENTATION.SW;
					currentWall.setEnd(x, y, orientation);
					this.walls.push(currentWall);
					currentWall = null;
				} else if (before && !tile) {
					// stop left wall
					currentWall.setEnd(x, y, POINT_ORIENTATION.NW);
					this.walls.push(currentWall);

					// and start right wall
					currentWall = new Wall(SEGMENT_ORIENTATION.RIGHT, this);
					currentWall.setEnd(x, y, POINT_ORIENTATION.SE);
				}

			} else if (currentWall.orientation === SEGMENT_ORIENTATION.RIGHT) {
				if (tile === before) {
					// both tile are both empty or full => stop right wall
					var orientation = tile ? POINT_ORIENTATION.NE : POINT_ORIENTATION.SE;
					currentWall.setStart(x, y, orientation);
					this.walls.push(currentWall);
					currentWall = null;
				} else if (!before && tile) {
					// stop right wall
					currentWall.setStart(x, y, POINT_ORIENTATION.NE);
					this.walls.push(currentWall);

					// and start left wall
					currentWall = new Wall(SEGMENT_ORIENTATION.LEFT, this);
					currentWall.setStart(x, y, POINT_ORIENTATION.SW);
				}

			} else {
				// should never reach here
				console.error('Something went wrong!');
			}
		}
	}

	// init corners
	for (var i = this.corners.length - 1; i >= 0; i--) {
		var corner = this.corners[i];
		corner.initAsCorner(this.walls);
		// TODO: if all cast list are empty, remove this point from corners
	}
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/**
 * @param {Object} downCast
 * @param {number} downCast.x
 * @param {number} downCast.y
 * @param {Wall}   downCast.wall
 * @param {RaycastsResult} raycasts
 */
MapEdge.prototype._getPolygonStart = function (downCast, raycasts) {
	var wall = downCast.wall;
	if (!wall) return null;

	var wallCast = raycasts.walls[wall.id];

	if (!wallCast) return wall.start;

	var ts = (downCast.x - wall.start.x) / wall.dx;
	var previous = wall.start;
	for (var node = wallCast.first; node !== null; node = node.next) {
		if (node.object.ts > ts) break;
		previous = node.object;
	}

	return previous;
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
MapEdge.prototype._getDownwardRaycast = function (x, y) {
	// to get the first point of polygon, we cast a ray down from source
	// because the ray is horizontal, the raycast formula can be simplified
	// and because walls are sorted, we can return as soon as we find a match
	for (var i = 0; i < this.upWalls.length; i++) {
		var wall = this.upWalls[i];
		if (wall.start.y <= y) continue;
		if (wall.start.x >= x && wall.end.x <= x) {
			return {
				x: x,
				y: wall.start.y,
				wall: wall
			};
		}
	}
	return null;
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/**
 * Get all raycasts from a source point.
 * Raycast start from a corner and ends into a wall (wall).
 *
 * @param {number} x - x coordinate of source point
 * @param {number} y - y coordinate of source point
 *
 * @returns {RaycastsResult} - raycasts
 */
MapEdge.prototype._getAllCornersRaycasts = function (x, y) {
	var source   = { x: x, y: y };
	var raycasts = new RaycastsResult();

	for (var i = 0; i < this.corners.length; i++) {
		var corner = this.corners[i];

		// determine in which quadran the corner belongs
		var directionId = corner.x < x
			? (corner.y < y ? POINT_ORIENTATION.NW : POINT_ORIENTATION.SW)
			: (corner.y < y ? POINT_ORIENTATION.NE : POINT_ORIENTATION.SE);

		if (corner.cast[directionId].length === 0) continue; // corner can't be cast in that direction

		var raycast = corner.projectRaycast(source, directionId);
		if (!raycast) continue; // corner doesn't cast to anything from this source point

		raycast.wallListRef = raycasts.addRaycast(corner, raycast);
	}

	return raycasts;
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/**
 * @param {number} x - raycast source point x coord (in tile unit)
 * @param {number} y - raycast source point y coord (in tile unit)
 */
MapEdge.prototype.getCastPolygon = function (x, y) {
	// TODO: enable bounding box
	var downCast = this._getDownwardRaycast(x, y);
	if (!downCast) return null;
	var raycasts = this._getAllCornersRaycasts(x, y);
	var startPoint = this._getPolygonStart(downCast, raycasts);
	if (!startPoint) return null;

	var polygon = [];
	var point   = startPoint;
	var flag    = true; // don't follow back ray for first corner

	// special case: starting point is a cast
	if (point.wallListRef) {
		var node = point.wallListRef.next;
		if (node) {
			var cast = node.object;
			// track back to casted corner
			point = cast.point;
			// we already followed cast
			flag = true;
		} else {
			point = point.wall.end;
			flag = false;
		}
		// reset start point
		startPoint = point;
	}

	// crawl from one point to the next to construct the polygon
	do {
		// add current point
		polygon.push(point);

		// find next point
		var castFromPoint = raycasts.corners[point.id];
		if (castFromPoint && !flag) {
			// point is a corner casted, follow cast from this point
			polygon.push(castFromPoint);

			// follow wall from cast to the next cast in wall or wall's end
			var wall = castFromPoint.wall;

			var node = castFromPoint.wallListRef.next;
			if (node) {
				// add next cast
				var cast = node.object;
				polygon.push(cast);

				// track back to casted corner
				point = cast.point;

				// we already followed cast
				flag = true;
			} else {
				point = wall.end;
				flag = false;
			}

		} else {
			// follow wall
			var wall = point.start;
			if (!wall) console.warn(point)
			var castInWall = raycasts.walls[wall.id];
			if (castInWall) {
				// get first cast in wall and follow back the point
				node = castInWall.first;
				cast = node.object;
				polygon.push(cast);

				// track back to casted corner
				point = cast.point;

				// point is a corner and we already followed cast back
				flag = true;


			} else {
				// just follow wall
				point = wall.end;
				flag = false;
			}
		}

	} while (point !== startPoint);

	return polygon;
};
