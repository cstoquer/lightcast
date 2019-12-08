//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
function Wall(orientation, mapEdge) {
	this.id          = mapEdge.getWallId();
	this.orientation = orientation;    // wall's normal direction
	this.start       = null;           // Point
	this.end         = null;           // Point
	this.dx          = 0;
	this.dy          = 0;
	this._mapEdge    = mapEdge;        // reference to MapEdge instance
}
module.exports = Wall;

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
Wall.prototype.setEnd = function (x, y, orientation) {
	var corner = this._mapEdge.getCorner(x, y, orientation); // TODO: checkboard corners
	this.end  = corner;
	corner.end = this;
	this._computeDirection();
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
Wall.prototype.setStart = function (x, y, orientation) {
	var corner   = this._mapEdge.getCorner(x, y, orientation); // TODO: checkboard corners
	this.start  = corner;
	corner.start = this;
	this._computeDirection();
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
Wall.prototype._computeDirection = function () {
	if (!this.start || !this.end) return;
	this.dx = this.end.x - this.start.x;
	this.dy = this.end.y - this.start.y;
};
