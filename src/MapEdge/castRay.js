
//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
function Raycast (x, y, tr, ts) {
    this.x           = x; // cast x position
    this.y           = y; // cast y position
    this.tr          = tr;
    this.ts          = ts;
    this.point       = null;
    this.wall        = null;
    this.wallListRef = null;
}

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/**
 * Calculate the projection (shadow) of a point (usually a corner of a tile)
 * from a source point (light) on a wall.
 *
 * @param {point} sourcePoint - light source
 * @param {point} targetPoint - point to be cast on the wall
 * @param {Wall}  wall - wall that we cast on.
 */
function castRay(sourcePoint, targetPoint, wall) {
	// alias defini†ions
	var rpx = sourcePoint.x;
	var rpy = sourcePoint.y;

	var spx = wall.start.x;
	var spy = wall.start.y;

	var sdx = wall.dx;
	var sdy = wall.dy;

	// ray direction
	var rdx = targetPoint.x - rpx;
	var rdy = targetPoint.y - rpy;

	if (rdx === 0 && rdy === 0) return null; // source and target are same: no ray

	// cast ratios
	var r = sdx * rdy - sdy * rdx;
	if (r === 0) return null; // ray and segment are parallel

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

    return new Raycast(x, y, tr, ts);
}

module.exports = castRay;