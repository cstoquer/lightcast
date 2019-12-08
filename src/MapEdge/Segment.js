//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
function Segment(orientation, mapEdge) {
	this.id          = mapEdge.getSegmentId();
	this.orientation = orientation;    // segment's normal direction
	this.start       = null;           // Point
	this.end         = null;           // Point
	this.dx          = 0;
	this.dy          = 0;
	this._mapEdge    = mapEdge;        // reference to MapEdge that created the segment
}
module.exports = Segment;

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
Segment.prototype.setEnd = function (x, y, orientation) {
	var corner = this._mapEdge.getCorner(x, y, orientation); // TODO: checkboard corners
	this.end  = corner;
	corner.end = this;
	this._computeDirection();
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
Segment.prototype.setStart = function (x, y, orientation) {
	var corner   = this._mapEdge.getCorner(x, y, orientation); // TODO: checkboard corners
	this.start  = corner;
	corner.start = this;
	this._computeDirection();
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
Segment.prototype._computeDirection = function () {
	if (!this.start || !this.end) return;
	this.dx = this.end.x - this.start.x;
	this.dy = this.end.y - this.start.y;
};
