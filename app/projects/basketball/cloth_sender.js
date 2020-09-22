/*
Copyright (c) 2015 Jordan O'Leary
*/

/*  A substantial portion of the following code (cloth physics) has been modified from a document
containing the following copyright:


Copyright (c) 2013 Suffick at Codepen (http://codepen.io/suffick) and GitHub (https://github.com/suffick)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/


//stats.js
var stats = new Stats();
stats.setMode(0);
document.getElementById('statsHolder').appendChild(stats.domElement);


var gameOver = false;
var firstTap = false;
var usingMobile = false;
if(detectmobile()){
	usingMobile = true;
	window.setTimeout(function(){
		document.getElementById('wheretoswipe').className = "visible";
	},500);
}

// settings

var world_scale = 190.0;
var score = 0;
var score_consecutive = 0;
var justMadeBasket = false;
//net stuff
var hoopx = 0.5;
var hoopy = 2;
var netScaleModifier = 0.05;
var netStartOffsetX = hoopx * world_scale;
var netStartOffsetY = hoopy * world_scale;
var velocity_mult = 3;
var velocity_cap = 3.5;
var box2d_grav = 7;
//net stuff
var physics_accuracy = 2,
    mouse_influence = 0.15 * world_scale,
    mouse_cut = 5,
    gravity = 1200,
    cloth_height = 25,
    cloth_width = 20,
    start_y = 20,
    spacing = 6,
    tear_distance = 60;


window.requestAnimFrame =
    window.requestAnimationFrame ||
    window.webkitRequestAnimationFrame ||
    window.mozRequestAnimationFrame ||
    window.oRequestAnimationFrame ||
    window.msRequestAnimationFrame ||
    function (callback) {
        window.setTimeout(callback, 1000 / 60);
    };

var canvas,
    ctx,
    cloth,
    boundsx,
    boundsy,
    mouse = {
        down: false,
        button: 1,
        x: 0,
        y: 0,
        //px and py is position at last cycle
        px: 0,
        py: 0
    };
	
	
//used to make "rope" of regular points between greater_points
var Greater_Point = function (x, y) {

    this.x = x;
    this.y = y;
    this.px = this.x;
    this.py = this.y;
    //vx and vy: velocity x and velocity y
    this.vx = 0;
    this.vy = 0;
    this.pin_x = null;
    this.pin_y = null;

    this.measurements = [];
};

Greater_Point.prototype.attach = function (point) {

    this.measurements.push(
        new Measurements(this, point)
    );
};


Greater_Point.prototype.pin = function (pinx, piny) {
    this.pin_x = pinx;
    this.pin_y = piny;
};

var Measurements = function (p1, p2) {

    this.p1 = p1;
    this.p2 = p2;
    //this.length = spacing;
    var diff_x = p1.x - p2.x,
        diff_y = p1.y - p2.y,
        dist = Math.sqrt(diff_x * diff_x + diff_y * diff_y);
    this.length = dist;
};

var Point = function (x, y, shrink) {
    //offsetX and Y is based on the start of the first net point
    var offsetX = 102;
    var offsetY = 130;
    if (shrink) {
        this.x = (x - offsetX) * netScaleModifier + netStartOffsetX;
        this.y = (y - offsetY) * netScaleModifier + netStartOffsetY;
    } else {
        this.x = x;
        this.y = y;
    }
    this.px = this.x;
    this.py = this.y;
    //vx and vy: velocity x and velocity y
    this.vx = 0;
    this.vy = 0;
    this.pin_x = null;
    this.pin_y = null;

    this.constraints = [];
    this.circleInteract = false;
};

Point.prototype.update = function (delta, collide) {
    var accountForBallX = 0;
    var accountForBallY = 0;
    var ballPositionX = ball.m_xf.position.x * debug_draw_scale;
    var ballPositionY = ball.m_xf.position.y * debug_draw_scale;
    //var ballPositionX = mouse.x;
    //var ballPositionY = mouse.y;
    //console.log("Ball pos: " + ballPositionX);
    if (collide) {
        //determine how close the point is to the mouse
        var diff_x = this.x - ballPositionX,
            diff_y = this.y - ballPositionY,
            dist = Math.sqrt(diff_x * diff_x + diff_y * diff_y);

        //if the distance is within the mouse's influence
        if (dist < mouse_influence) {
            //move the position of the point

            //this.px = this.x - (mouse.x - mouse.px) * 1.8;
            //this.py = this.y - (mouse.y - mouse.py) * 1.8; 
            var angle = angleBetweenPoints({
                x: ballPositionX,
                y: ballPositionY
            }, this);
            var forceX = Math.cos(angle);
            var forceY = Math.sin(angle);
            accountForBallX = forceX;
            accountForBallY = forceY;
        }

    }
    this.add_force(0, gravity);

    delta *= delta;
    var ballVel = getBallVelocity(); //repel the points harder if the ball is moving faster
    if (ballVel < 1) ballVel = 1;

    //nx and ny appears to be the calculated position
    if (accountForBallX === 0) nx = this.x + ((this.x - this.px) * .99) + ((this.vx / 2) * delta);
    else nx = this.x + accountForBallX * (mouse_influence - dist) * ballVel;
    if (accountForBallY === 0) ny = this.y + ((this.y - this.py) * .99) + ((this.vy / 2) * delta);
    else ny = this.y + accountForBallY * (mouse_influence - dist) * ballVel;
    //(this.x-this.px) will be 0 if this.px is not changed by the mouse
    //nx = this.x + ((this.vx / 2) * delta);
    //ny = this.y + ((this.vy / 2) * delta);

    //ref: this.px = this.x-0.1 will cause the net to "blow" in the wind to the right
    //px py is the position last cycle
    this.px = this.x;
    this.py = this.y;

    this.x = nx;
    this.y = ny;

    this.vy = this.vx = 0
};
Point.prototype.draw = function () {

    if (this.constraints.length <= 0) return;
    var i = this.constraints.length;
    while (i--) this.constraints[i].draw();
};

Point.prototype.resolve_constraints = function () {
    //if it is pinned, don't let it move
    if (this.pin_x != null && this.pin_y != null) {

        this.x = this.pin_x;
        this.y = this.pin_y;
        return;
    }

    var i = this.constraints.length;
    while (i--) this.constraints[i].resolve();

};

Point.prototype.attach = function (point) {
    this.constraints.push(
        new Constraint(this, point)
    );
};
Point.prototype.attachInBetween = function (point, cloth_p, mindTheCircle) {


    var measurement = new Constraint(this, point);
    //make in between points here:
    var original = this;
    var end = point;

    if (mindTheCircle) {
        //point will move when near circle
        original.circleInteract = true;
        end.circleInteract = true;
    }

    var numberOfInbetween = Math.ceil(measurement.length / 30);
    var lastMade = original;
    for (var i = 0; i < numberOfInbetween; i++) {
        var diff_x = (end.x - original.x) / (numberOfInbetween + 1);
        var diff_y = (end.y - original.y) / (numberOfInbetween + 1);
        var p = new Point(original.x + diff_x * (i + 1), original.y + diff_y * (i + 1), false);
        cloth_p.points.push(p);
        lastMade.attach(p);
        if (mindTheCircle) {
            p.circleInteract = true;
        }

        lastMade = p;

    }
    lastMade.attach(end);

}

Point.prototype.add_force = function (x, y) {

    this.vx += x;
    this.vy += y;
};

Point.prototype.pin = function (pinx, piny) {
    this.pin_x = pinx;
    this.pin_y = piny;
};

var Constraint = function (p1, p2) {

    this.p1 = p1;
    this.p2 = p2;
    //this.length = spacing;
    var diff_x = p1.x - p2.x,
        diff_y = p1.y - p2.y,
        dist = Math.sqrt(diff_x * diff_x + diff_y * diff_y);
    this.length = dist;
};

Constraint.prototype.resolve = function () {

    var diff_x = this.p1.x - this.p2.x,
        diff_y = this.p1.y - this.p2.y,
        dist = Math.sqrt(diff_x * diff_x + diff_y * diff_y),
        diff = (this.length - dist) / dist;


	var elasticity = 0.5;
    //I think px and py is position at last cycle
    var px = diff_x * diff * elasticity;
    var py = diff_y * diff * elasticity;

    this.p1.x += px;
    this.p1.y += py;
    this.p2.x -= px;
    this.p2.y -= py;
};



function angleBetweenPoints(p1, p2) {
    return Math.atan2(p2.y - p1.y, p2.x - p1.x);
}

function circle_intersection(x0, y0, r0, x1, y1, r1) {
    var a, dx, dy, d, h, rx, ry;
    var x2, y2;

    /* dx and dy are the vertical and horizontal distances between
     * the circle centers.
     */
    dx = x1 - x0;
    dy = y1 - y0;

    /* Determine the straight-line distance between the centers. */
    d = Math.sqrt((dy * dy) + (dx * dx));

    /* Check for solvability. */
    if (d > (r0 + r1)) {
        /* no solution. circles do not intersect. */
        return false;
    }
    if (d < Math.abs(r0 - r1)) {
        /* no solution. one circle is contained in the other */
        return false;
    }

    /* 'point 2' is the point where the line through the circle
     * intersection points crosses the line between the circle
     * centers.
     */

    /* Determine the distance from point 0 to point 2. */
    a = ((r0 * r0) - (r1 * r1) + (d * d)) / (2.0 * d);

    /* Determine the coordinates of point 2. */
    x2 = x0 + (dx * a / d);
    y2 = y0 + (dy * a / d);

    /* Determine the distance from point 2 to either of the
     * intersection points.
     */
    h = Math.sqrt((r0 * r0) - (a * a));

    /* Now determine the offsets of the intersection points from
     * point 2.
     */
    rx = -dy * (h / d);
    ry = dx * (h / d);

    /* Determine the absolute intersection points. */
    var xi = x2 + rx;
    var xi_prime = x2 - rx;
    var yi = y2 + ry;
    var yi_prime = y2 - ry;

    return [xi, xi_prime, yi, yi_prime];
}

//Sometimes constraints bug out and get drawn too far, exclude these from drawing:
var constraintDrawLimit = 25;
Constraint.prototype.draw = function () {

    var diff_x = this.p1.x - this.p2.x,
        diff_y = this.p1.y - this.p2.y,
        dist = Math.sqrt(diff_x * diff_x + diff_y * diff_y);
    if (dist <= constraintDrawLimit) {

        ctx.moveTo(this.p1.x, this.p1.y);
        ctx.lineTo(this.p2.x, this.p2.y);
    }
};

var Cloth = function () {

    this.points = [];
    this.greater_points = [];
    this.attachPoints = function (p1index, p2index) {
        this.points[p1index].attach(this.points[p2index]);
    };
    var circleInteractPoints = [0, 6, 7, 13, 20, 31, 42, 12, 19, 25, 36, 47];
    this.attachPointsWithInBetweens = function (p1index, p2index) {
        if (circleInteractPoints.indexOf(p1index) > -1 && circleInteractPoints.indexOf(p2index) > -1) {
            this.points[p1index].attachInBetween(this.points[p2index], this, true);
        } else {
            this.points[p1index].attachInBetween(this.points[p2index], this, false);
        }
    };
    make_original_net(this);
};

function make_original_net(cloth_p) {
    var p = new Point(102, 130, true);
    p.pin(p.x, p.y);
    cloth_p.points.push(p);
    p = new Point(244, 130, true);
    p.pin(p.x, p.y);
    cloth_p.points.push(p);
    p = new Point(584, 130, true);
    p.pin(p.x, p.y);
    cloth_p.points.push(p);
    p = new Point(1044, 130, true);
    p.pin(p.x, p.y);
    cloth_p.points.push(p);
    p = new Point(1504, 130, true);
    p.pin(p.x, p.y);
    cloth_p.points.push(p);
    p = new Point(1844, 130, true);
    p.pin(p.x, p.y);
    cloth_p.points.push(p);
    p = new Point(1986, 130, true);
    p.pin(p.x, p.y);
    cloth_p.points.push(p);
    // /top^^


    p = new Point(511, 833, true);
    cloth_p.points.push(p);
    p = new Point(657, 833, true);
    cloth_p.points.push(p);

    p = new Point(900, 833, true);
    cloth_p.points.push(p);

    p = new Point(1188, 833, true);
    cloth_p.points.push(p);

    p = new Point(1432, 833, true);
    cloth_p.points.push(p);
    p = new Point(1573, 833, true);
    cloth_p.points.push(p);
    //---------------

    p = new Point(582, 958, true);
    cloth_p.points.push(p);
    p = new Point(636, 986, true);
    cloth_p.points.push(p);
    p = new Point(812, 980, true);
    cloth_p.points.push(p);
    p = new Point(1044, 978, true);
    cloth_p.points.push(p);
    p = new Point(1278, 986, true);
    cloth_p.points.push(p);
    p = new Point(1444, 998, true);
    cloth_p.points.push(p);
    p = new Point(1507, 976, true);
    cloth_p.points.push(p);


    p = new Point(580, 1170, true);
    cloth_p.points.push(p);
    p = new Point(706, 1168, true);
    cloth_p.points.push(p);
    p = new Point(918, 1170, true);
    cloth_p.points.push(p);
    p = new Point(1166, 1180, true);
    cloth_p.points.push(p);
    p = new Point(1380, 1180, true);
    cloth_p.points.push(p);
    p = new Point(1500, 1180, true);
    cloth_p.points.push(p);

    p = new Point(642, 1360, true);
    cloth_p.points.push(p);
    p = new Point(808, 1360, true);
    cloth_p.points.push(p);
    p = new Point(1040, 1360, true);
    cloth_p.points.push(p);
    p = new Point(1270, 1360, true);
    cloth_p.points.push(p);
    p = new Point(1440, 1360, true);
    cloth_p.points.push(p);

    p = new Point(580, 1556, true);
    cloth_p.points.push(p);
    p = new Point(706, 1556, true);
    cloth_p.points.push(p);
    p = new Point(918, 1556, true);
    cloth_p.points.push(p);
    p = new Point(1166, 1556, true);
    cloth_p.points.push(p);
    p = new Point(1380, 1556, true);
    cloth_p.points.push(p);
    p = new Point(1500, 1556, true);
    cloth_p.points.push(p);

    p = new Point(642, 1736, true);
    cloth_p.points.push(p);
    p = new Point(808, 1736, true);
    cloth_p.points.push(p);
    p = new Point(1040, 1736, true);
    cloth_p.points.push(p);
    p = new Point(1270, 1736, true);
    cloth_p.points.push(p);
    p = new Point(1440, 1736, true);
    cloth_p.points.push(p);

    p = new Point(580, 1932, true);
    cloth_p.points.push(p);
    p = new Point(706, 1932, true);
    cloth_p.points.push(p);
    p = new Point(918, 1932, true);
    cloth_p.points.push(p);
    p = new Point(1166, 1932, true);
    cloth_p.points.push(p);
    p = new Point(1380, 1932, true);
    cloth_p.points.push(p);
    p = new Point(1500, 1932, true);
    cloth_p.points.push(p);

    //attach them:

    cloth_p.attachPoints(0, 1);
    cloth_p.attachPoints(1, 2);
    cloth_p.attachPoints(2, 3);
    cloth_p.attachPoints(3, 4);
    cloth_p.attachPoints(4, 5);
    cloth_p.attachPoints(5, 6);

    cloth_p.attachPointsWithInBetweens(7, 0);
    cloth_p.attachPointsWithInBetweens(7, 1);
    cloth_p.attachPointsWithInBetweens(8, 1);
    cloth_p.attachPointsWithInBetweens(8, 2);
    cloth_p.attachPointsWithInBetweens(9, 2);
    cloth_p.attachPointsWithInBetweens(9, 3);
    cloth_p.attachPointsWithInBetweens(10, 3);
    cloth_p.attachPointsWithInBetweens(10, 4);
    cloth_p.attachPointsWithInBetweens(11, 4);
    cloth_p.attachPointsWithInBetweens(11, 5);
    cloth_p.attachPointsWithInBetweens(12, 5);
    cloth_p.attachPointsWithInBetweens(12, 6);
    //---

    cloth_p.attachPointsWithInBetweens(7, 13);
    cloth_p.attachPointsWithInBetweens(7, 14);
    cloth_p.attachPointsWithInBetweens(8, 14);
    cloth_p.attachPointsWithInBetweens(8, 15);
    cloth_p.attachPointsWithInBetweens(9, 15);
    cloth_p.attachPointsWithInBetweens(9, 16);
    cloth_p.attachPointsWithInBetweens(10, 16);
    cloth_p.attachPointsWithInBetweens(10, 17);
    cloth_p.attachPointsWithInBetweens(11, 17);
    cloth_p.attachPointsWithInBetweens(11, 18);
    cloth_p.attachPointsWithInBetweens(12, 18);
    cloth_p.attachPointsWithInBetweens(12, 19);
    //---

    cloth_p.attachPointsWithInBetweens(20, 13);
    cloth_p.attachPointsWithInBetweens(20, 14);
    cloth_p.attachPointsWithInBetweens(21, 14);
    cloth_p.attachPointsWithInBetweens(21, 15);
    cloth_p.attachPointsWithInBetweens(22, 15);
    cloth_p.attachPointsWithInBetweens(22, 16);
    cloth_p.attachPointsWithInBetweens(23, 16);
    cloth_p.attachPointsWithInBetweens(23, 17);
    cloth_p.attachPointsWithInBetweens(24, 17);
    cloth_p.attachPointsWithInBetweens(24, 18);
    cloth_p.attachPointsWithInBetweens(25, 18);
    cloth_p.attachPointsWithInBetweens(25, 19);
    //---

    cloth_p.attachPointsWithInBetweens(26, 20);
    cloth_p.attachPointsWithInBetweens(26, 21);
    cloth_p.attachPointsWithInBetweens(27, 21);
    cloth_p.attachPointsWithInBetweens(27, 22);
    cloth_p.attachPointsWithInBetweens(28, 22);
    cloth_p.attachPointsWithInBetweens(28, 23);
    cloth_p.attachPointsWithInBetweens(29, 23);
    cloth_p.attachPointsWithInBetweens(29, 24);
    cloth_p.attachPointsWithInBetweens(30, 24);
    cloth_p.attachPointsWithInBetweens(30, 25);
    //---

    cloth_p.attachPointsWithInBetweens(31, 20);
    cloth_p.attachPointsWithInBetweens(31, 26);
    cloth_p.attachPointsWithInBetweens(32, 26);
    cloth_p.attachPointsWithInBetweens(32, 27);
    cloth_p.attachPointsWithInBetweens(33, 27);
    cloth_p.attachPointsWithInBetweens(33, 28);
    cloth_p.attachPointsWithInBetweens(34, 28);
    cloth_p.attachPointsWithInBetweens(34, 29);
    cloth_p.attachPointsWithInBetweens(35, 29);
    cloth_p.attachPointsWithInBetweens(35, 30);
    cloth_p.attachPointsWithInBetweens(36, 30);
    cloth_p.attachPointsWithInBetweens(36, 25);
    //---
    cloth_p.attachPointsWithInBetweens(37, 31);
    cloth_p.attachPointsWithInBetweens(37, 32);
    cloth_p.attachPointsWithInBetweens(38, 32);
    cloth_p.attachPointsWithInBetweens(38, 33);
    cloth_p.attachPointsWithInBetweens(39, 33);
    cloth_p.attachPointsWithInBetweens(39, 34);
    cloth_p.attachPointsWithInBetweens(40, 34);
    cloth_p.attachPointsWithInBetweens(40, 35);
    cloth_p.attachPointsWithInBetweens(41, 35);
    cloth_p.attachPointsWithInBetweens(41, 36);
    //---
    cloth_p.attachPointsWithInBetweens(42, 31);
    cloth_p.attachPointsWithInBetweens(42, 37);
    cloth_p.attachPointsWithInBetweens(43, 37);
    cloth_p.attachPointsWithInBetweens(43, 38);
    cloth_p.attachPointsWithInBetweens(44, 38);
    cloth_p.attachPointsWithInBetweens(44, 39);
    cloth_p.attachPointsWithInBetweens(45, 39);
    cloth_p.attachPointsWithInBetweens(45, 40);
    cloth_p.attachPointsWithInBetweens(46, 40);
    cloth_p.attachPointsWithInBetweens(46, 41);
    cloth_p.attachPointsWithInBetweens(47, 41);
    cloth_p.attachPointsWithInBetweens(47, 36);


    //the hoop rim shouldn't react to the circle
    cloth_p.points[0].circleInteract = false;
    cloth_p.points[6].circleInteract = false;
}

Cloth.prototype.update = function () {



    var pa = physics_accuracy;
    while (pa--) {
        var p = this.points.length;
        while (p--) {
            this.points[p].resolve_constraints();

            //affect side point:
            if (this.points[p].circleInteract) {
                this.points[p].update(0.016, true);
            } else this.points[p].update(0.016);

            //affect all points
            //this.points[i].update(0.016, true);
        }
    }
};

Cloth.prototype.draw = function () {
    ctx.beginPath();
	
    var i = cloth.points.length;
    while (i--) cloth.points[i].draw();

    ctx.stroke();
};

var ballLastPosX;
var ballLastPosY;

function checkLineIntersection(line1StartX, line1StartY, line1EndX, line1EndY, line2StartX, line2StartY, line2EndX, line2EndY) {
    // if the lines intersect, the result contains the x and y of the intersection (treating the lines as infinite) and booleans for whether line segment 1 or line segment 2 contain the point
    var denominator, a, b, numerator1, numerator2, result = {
        x: null,
        y: null,
        onLine1: false,
        onLine2: false
    };
    denominator = ((line2EndY - line2StartY) * (line1EndX - line1StartX)) - ((line2EndX - line2StartX) * (line1EndY - line1StartY));
    if (denominator == 0) {
        return result;
    }
    a = line1StartY - line2StartY;
    b = line1StartX - line2StartX;
    numerator1 = ((line2EndX - line2StartX) * a) - ((line2EndY - line2StartY) * b);
    numerator2 = ((line1EndX - line1StartX) * a) - ((line1EndY - line1StartY) * b);
    a = numerator1 / denominator;
    b = numerator2 / denominator;

    // if we cast these lines infinitely in both directions, they intersect here:
    result.x = line1StartX + (a * (line1EndX - line1StartX));
    result.y = line1StartY + (a * (line1EndY - line1StartY));
    /*
        // it is worth noting that this should be the same as:
        x = line2StartX + (b * (line2EndX - line2StartX));
        y = line2StartX + (b * (line2EndY - line2StartY));
        */
    // if line1 is a segment and line2 is infinite, they intersect if:
    if (a > 0 && a < 1) {
        result.onLine1 = true;
    }
    // if line2 is a segment and line1 is infinite, they intersect if:
    if (b > 0 && b < 1) {
        result.onLine2 = true;
    }
    // if line1 and line2 are segments, they intersect if both of the above are true
    return result;
};

var ballSpawnLeft = 2;
var ballSpawnRight;
var ballSpawnTop = 2;
var ballSpawnBottom = 3.5;
function update() {
    stats.begin();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
	var currentCamx = cam.x;
	var currentCamy = cam.y
	ctx.translate(currentCamx,currentCamy);
	
	//particles:
	emitters[0].position.x = ball.m_xf.position.x * world_scale;
	emitters[0].position.y = ball.m_xf.position.y * world_scale;
	particle_loop();

    updateBox2d();
	//invisible wall
    if (ball.m_xf.position.x < 0 || ball.m_xf.position.x > rightBoundry) {
        var vel = ball.GetLinearVelocity();
        ball.SetLinearVelocity(new vec(-vel.x, vel.y))

    }
    cloth.update();
    cloth.draw();
	//drawMouse loc
	//if(isMouseDown && !ball.IsAwake() && !gameOver)drawCir(mouse.x,mouse.y,20,mouseColor);
	if(debug){
		//draw ball spawn
		ctx.rect(ballSpawnLeft*world_scale,ballSpawnTop*world_scale,(ballSpawnRight-ballSpawnLeft)*world_scale,(ballSpawnBottom-ballSpawnTop)*world_scale);
		ctx.stroke();
	}
	

    var line1 = {
            startX: ballLastPosX,
            startY: ballLastPosY,
            endX: ball.m_xf.position.x,
            endY: ball.m_xf.position.y,

        },
        line2 = {
            startX: hoop_points[0].m_xf.position.x,
            startY: hoop_points[0].m_xf.position.y,
            endX: hoop_points[1].m_xf.position.x,
            endY: hoop_points[1].m_xf.position.y
        },
        results;

    results = checkLineIntersection(line1.startX, line1.startY, line1.endX, line1.endY, line2.startX, line2.startY, line2.endX, line2.endY);

    //check if ball made a basket:
    if (results.onLine1 && results.onLine2) {
        //console.log('basket!');
        respawnInSameSpot = false;
        score++;
		score_consecutive++;
		
		if(score_consecutive == 3)sound_fire.play();
		sound_swoosh.play();
		justMadeBasket = true;
    }
    if (ball.m_xf.position.y > hoopy + 0.6 && !gameOver) {
		//if ball is travelling downward
		if(ballLastPosY < ball.m_xf.position.y){
			
			if(seconds <= 0){
				GameOver();
			}else{
				//create a new ball
				createBallAt((Math.random() * (ballSpawnRight - ballSpawnLeft) + ballSpawnLeft),(Math.random() * (ballSpawnBottom - ballSpawnTop)) + ballSpawnTop);
			}
		}
    }
    ballLastPosX = ball.m_xf.position.x;
    ballLastPosY = ball.m_xf.position.y;


    stats.end();


	ctx.translate(-currentCamx,-currentCamy);
    requestAnimFrame(update);
	
}
function GameOver(){
	gameOver = true;
	countdown.hide();
	console.log('gameHolder pointer events set to none');
	$('#gameHolder').css('pointer-events','none');
	$('#canvasResizerHack').css('pointer-events','none');
	
}
function createBallAt(x,y){
	if(!justMadeBasket)score_consecutive = 0;
	justMadeBasket = false;
	createBall();
	if (!respawnInSameSpot) ballSpawn = new b2Vec2(x, y);
	if(ballSpawn !== undefined){
		lastBallSpawnLoc = "" + ballSpawn.x + " " + ballSpawn.y;
		ball.SetPosition(ballSpawn);
	}
	ball.SetAwake(false);
	respawnInSameSpot = true;
}
var lastBallSpawnLoc;

//box2d
function handleMouseMove(e) {
    draw_mouseX = (e.clientX - canvasPosition.x) / world_scale;
    draw_mouseY = (e.clientY - canvasPosition.y) / world_scale;

    mouseX = draw_mouseX;
    mouseY = draw_mouseY;

};
function simulateMouseMove(x,y){
    draw_mouseX = (x - canvasPosition.x) / world_scale;
    draw_mouseY = (y - canvasPosition.y) / world_scale;

    mouseX = draw_mouseX;
    mouseY = draw_mouseY;

}
function handleTouchMove(e) {
    draw_mouseX = (e.changedTouches[0].clientX - canvasPosition.x) / world_scale;
    draw_mouseY = (e.changedTouches[0].clientY - canvasPosition.y) / world_scale;

    mouseX = draw_mouseX;
    mouseY = draw_mouseY;

};
function handleTouchPadMove(e) {
    draw_mouseX = (e.changedTouches[0].clientX - canvasPosition.x) / world_scale;
    draw_mouseY = (e.changedTouches[0].clientY - canvasPosition.y) / world_scale;

    mouseX = draw_mouseX;
    mouseY = draw_mouseY;

};
var mouseColor;
var tapStart;

//box2d
function start() {

    window.onmousedown = function (e) {
        mouse.button = e.which;
        mouse.px = mouse.x;
        mouse.py = mouse.y;
        var rect = canvas.getBoundingClientRect();
        mouse.x = e.clientX - rect.left,
            mouse.y = e.clientY - rect.top,
            mouse.down = true;

        //box2d
        isMouseDown = true;
        handleMouseMove(e);
        //box2d

        //e.preventDefault();
    };
    window.addEventListener("touchstart", function (e) {
		//hide tooltip on first tap
		if(!firstTap)document.getElementById('wheretoswipe').className = "hidden";
		firstTap = true;
		tapStart = e.changedTouches[0];
		isMouseDown = true;
		
		
        mouse.px = mouse.x;
        mouse.py = mouse.y;
		
		
        var rect = canvas.getBoundingClientRect();
        mouse.x = e.changedTouches[0].clientX - rect.left - (tapStart.clientX -ball.m_xf.position.x*world_scale) -0.5*world_scale;
		mouse.y = e.changedTouches[0].clientY - rect.top - (tapStart.clientY -ball.m_xf.position.y*world_scale) -0.5*world_scale;
		//box2d
		handleTouchPadMove(e);
		
		mouseColor = '#ffffff';
		e.preventDefault();
	}, false);
    window.addEventListener("touchend", function (e) {
		isMouseDown = false;
		e.preventDefault();
	}, false);
    window.addEventListener("touchmove", function(e){
        mouse.px = mouse.x;
        mouse.py = mouse.y;
		
        var rect = canvas.getBoundingClientRect();
        mouse.x = e.changedTouches[0].clientX - rect.left - (tapStart.clientX -ball.m_xf.position.x*world_scale) -0.5*world_scale;
		mouse.y = e.changedTouches[0].clientY - rect.top - (tapStart.clientY -ball.m_xf.position.y*world_scale) -0.5*world_scale;
		//box2d
		handleTouchPadMove(e);
        //box2d
        e.preventDefault();
	
	}, false);

    window.onmouseup = function (e) {
        mouse.down = false;
        //box2d
        isMouseDown = false;
        //box2d
        //e.preventDefault();
    };

    canvas.onmousemove = function (e) {
        mouse.px = mouse.x;
        mouse.py = mouse.y;
        var rect = canvas.getBoundingClientRect();
        mouse.x = e.clientX - rect.left,
            mouse.y = e.clientY - rect.top,
            //box2d
            handleMouseMove(e);
        //box2d
        e.preventDefault();
    };

    canvas.oncontextmenu = function (e) {
        e.preventDefault();
    };

    boundsx = canvas.width - 1;
    boundsy = canvas.height - 1;

    ctx.strokeStyle = '#ffffff';
    cloth = new Cloth();
    update();
}


/*
Box2D \/***************************************************************************
*/

var debug_draw_scale = world_scale;
var draw_scale = debug_draw_scale;
var boundsscale = 1;

var img_ball = new Image();
img_ball.src = "basketball.png";
var img_ball_high = new Image();
img_ball_high.src = "ball_highlight.png";
var img_arrow = new Image();
img_arrow.src = "uparrow.png";
var img_buzzer_beater = new Image();
img_buzzer_beater.src = "buzzer_beater.png";
//the basketball
var ball;
var throw_velx = 0;
var throw_vely = 0;
var hoop_points = [];
var world;
var vec = Box2D.Common.Math.b2Vec2;
//allows very slow bounces
Box2D.Common.b2Settings.b2_velocityThreshold = 0.2;

var b2Vec2 = Box2D.Common.Math.b2Vec2,
    b2AABB = Box2D.Collision.b2AABB,
    b2BodyDef = Box2D.Dynamics.b2BodyDef,
    b2Body = Box2D.Dynamics.b2Body,
    b2FixtureDef = Box2D.Dynamics.b2FixtureDef,
    b2Fixture = Box2D.Dynamics.b2Fixture,
    b2World = Box2D.Dynamics.b2World,
    b2MassData = Box2D.Collision.Shapes.b2MassData,
    b2PolygonShape = Box2D.Collision.Shapes.b2PolygonShape,
    b2CircleShape = Box2D.Collision.Shapes.b2CircleShape,
    b2DebugDraw = Box2D.Dynamics.b2DebugDraw,
    b2MouseJointDef = Box2D.Dynamics.Joints.b2MouseJointDef,
    b2RevoluteJointDef = Box2D.Dynamics.Joints.b2RevoluteJointDef,
    b2DistanceJointDef = Box2D.Dynamics.Joints.b2DistanceJointDef,
	b2ContactListener = Box2D.Dynamics.b2ContactListener;
var debugDraw = new b2DebugDraw();
//mouse


var fixDef = new b2FixtureDef;
var bodyDef = new b2BodyDef;

var mouseX = 0;
var mouseY = 0;
var draw_mouseX, draw_mouseY, mousePVec, isMouseDown, selectedBody, mouseJoint;
var canvasPosition = getElementPosition(document.getElementById("canvas"));

function getBallVelocity() {
    var ballVelVec = ball.GetLinearVelocity();
    var vel = Math.sqrt((Math.pow(ballVelVec.x, 2)) + (Math.pow(ballVelVec.y, 2)));
    return vel;
}

function applyForceAwayFromPoint(point, forceMagnitude) {
    //force sensitivity is relative to the speed of the ball:
    var ballVelocity = getBallVelocity();

    //Applies a force away from point. 
    var vectorX = ball.m_xf.position.x - point.x / world_scale;
    var vectorY = ball.m_xf.position.y - point.y / world_scale;

    var vector_length = Math.sqrt((vectorX * vectorX) + (vectorY * vectorY));

    var activate_distance = 0.2;
    if (ballVelocity > 1) forceMagnitude *= ballVelocity * 6;
    if (ballVelocity < 0.5) return; //do not apply force if the ball if travelling too slowly
    if (vector_length <= activate_distance) {
        var normal_vectorX = vectorX / vector_length;
        var normal_vectorY = vectorY / vector_length;
        var vectorMag = forceMagnitude * (1 / vector_length); //the closer, the stronger

        //don't apply force unless it is stopping force:
        var ballVelVec = ball.GetLinearVelocity();

        if (normal_vectorX > 0 && ballVelVec.x > 0) normal_vectorX = 0;
        if (normal_vectorX < 0 && ballVelVec.x < 0) normal_vectorX = 0;
        if (normal_vectorY > 0 && ballVelVec.y > 0) normal_vectorY = 0;
        if (normal_vectorY < 0 && ballVelVec.y < 0) normal_vectorY = 0;
        ball.ApplyForce(new b2Vec2(normal_vectorX * vectorMag, normal_vectorY * vectorMag), ball.GetWorldCenter());
    }
}

function predictBallPosAtTimeStep(timeStep, velocityx, velocityy) {
    var ballx = ball.m_xf.position.x;
    var bally = ball.m_xf.position.y;
    var stepVelX = velocityx * (1 / 60);
    var stepVelY = velocityy * (1 / 60);
    var stepGrav = (1 / 60) * (1 / 60) * box2d_grav;

    var pofnx = ballx + timeStep * stepVelX;
    var pofny = bally + timeStep * stepVelY + ((timeStep * timeStep + timeStep) * (stepGrav)) / 2;

    return {
        x: pofnx,
        y: pofny
    };

}

function calculateVerticalVelocityForHeight(desiredHeight) {
    if (desiredHeight <= 0) return 0;
    var t = 1 / 60;
    var stepGravity = t * t * (-box2d_grav);
    var a = 0.5 / stepGravity;
    var b = 0.5;
    var c = desiredHeight;

    var quadSolution1 = (-b - Math.sqrt(b * b - 4 * a * c)) / (2 * a);
    var quadSolution2 = (-b + Math.sqrt(b * b - 4 * a * c)) / (2 * a);
    var v = quadSolution1;
    if (v < 0) v = quadSolution2;

    return -v * 60;
}
var ballsShot = 0;
function updateBox2d() {
    //Shoot the ball:
    if (isMouseDown && !ball.IsAwake()) {

        throw_vely = calculateVerticalVelocityForHeight(ball.m_xf.position.y - ((mouse.y) / world_scale));

        var secondsToApex = 0.5 * (2 * throw_vely / box2d_grav);

        if (secondsToApex === NaN) {
            throw_velx = 0;
            throw_vely = 0;
        } else throw_velx = (ball.m_xf.position.x - (mouse.x / world_scale)) / secondsToApex;

        for (var i = 0; i < ballPrediction.length; i++) {
            ballPrediction[i] = predictBallPosAtTimeStep(i * 2, throw_velx, throw_vely);
        }

    } else {
        if (throw_velx !== 0 && throw_vely !== 0) {
            ball.SetAwake(true);
            ball.ApplyTorque(0.2)
            ball.SetLinearVelocity(new vec(throw_velx, throw_vely));
            throw_velx = 0;
            throw_vely = 0;
			ballsShot++;
        }

    }

    //repel ball from edges of net:

    i = cloth.points.length;
    while (i--) {
        //affect side point:
        if (cloth.points[i].circleInteract) {
            applyForceAwayFromPoint(cloth.points[i], 0.002);


        }
    }

    //world step
    world.Step(1 / 60, 10, 10);

    draw_loop();
    world.ClearForces();
};
//http://js-tut.aardon.de/js-tut/tutorial/position.html
function getElementPosition(element) {
    var elem = element,
        tagname = "",
        x = 0,
        y = 0;

    while ((typeof (elem) == "object") && (typeof (elem.tagName) != "undefined")) {
        y += elem.offsetTop;
        x += elem.offsetLeft;
        tagname = elem.tagName.toUpperCase();

        if (tagname == "BODY")
            elem = 0;

        if (typeof (elem) == "object") {
            if (typeof (elem.offsetParent) == "object")
                elem = elem.offsetParent;
        }
    }

    return {
        x: x,
        y: y
    };
}
var img_ball_size = mouse_influence / 2 - 1;
var img_ball_size_w = img_ball_size;
var img_ball_size_h = img_ball_size;
var ballPrediction = new Array(30);

function drawCurve(points) {

    var prevWidth = ctx.lineWidth;
    var prevStyle = ctx.strokeStyle;
    ctx.strokeStyle = '#ffffff';

    ctx.beginPath();

    var lowestPoint = points[0].y;
    if (points[0] !== undefined) {
        // move to the first point
        ctx.moveTo(points[0].x * draw_scale, points[0].y * draw_scale);


        for (i = 1; i < points.length - 2; i++) {

            var xc = (points[i].x * draw_scale + points[i + 1].x * draw_scale) / 2;
            var yc = (points[i].y * draw_scale + points[i + 1].y * draw_scale) / 2;
            if (points[i].y < lowestPoint) lowestPoint = points[i].y;
            else break;
            ctx.quadraticCurveTo(points[i].x * draw_scale, points[i].y * draw_scale, xc, yc);
        }
        // curve through the last two points
        //ctx.quadraticCurveTo(points[i].x * draw_scale, points[i].y * draw_scale, points[i+1].x * draw_scale,points[i+1].y * draw_scale);

        ctx.lineWidth = 7;
        ctx.stroke();
    }
    ctx.strokeStyle = prevStyle;
    ctx.lineWidth = prevWidth;
}
function drawCir(centerX, centerY, radius, color) {

	ctx.beginPath();
	ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI, false);
	var prevFillStyle = ctx.fillStyle;
	ctx.fillStyle = color;
	ctx.fill();
	var prevWidth = ctx.lineWidth;
	var prevStyle = ctx.strokeStyle;
	ctx.lineWidth = 0;
	ctx.strokeStyle = color;
	ctx.stroke();
	ctx.closePath();

	ctx.strokeStyle = prevStyle;
	ctx.lineWidth = prevWidth;
	ctx.fillStyle = prevFillStyle;
}
function draw_loop() {


    if (ball.m_xf.position.y < 0) rotateAndPaintImage(img_arrow, 0, ball.m_xf.position.x, 0.3, 2.5, 2.5, 5, 5, 1);
    //if (isMouseDown && !ball.IsAwake() && !gameOver) drawCurve(ballPrediction);
	if(isMouseDown && !ball.IsAwake() && !gameOver){
		
		var lowestPoint = ballPrediction[0].y;
		for(var i = 0; i < ballPrediction.length; i++){
			drawCir(ballPrediction[i].x*draw_scale,ballPrediction[i].y*draw_scale,2,"#ffffff");
			//console.log("low: " + ballPrediction[i].y);
			if(ballPrediction[i].y > lowestPoint)break;
			else lowestPoint = ballPrediction[i].y;
		}
	}
	for (var i = 0; i < previousBalls.length; i++) {
        rotateAndPaintImage(img_ball, previousBalls[i]['body'].m_xf.GetAngle(), previousBalls[i]['body'].m_xf.position.x, previousBalls[i]['body'].m_xf.position.y, (previousBalls[i]['body'].img_width / 2), (previousBalls[i]['body'].img_height / 2), previousBalls[i]['body'].img_width, previousBalls[i]['body'].img_height, previousBalls[i]['alpha']);
        if (previousBalls[i]['alpha'] - 0.01 > 0) {
            previousBalls[i]['alpha'] -= 0.01;
        } else {
            //ball is no longer moving, remove it
            previousBalls[i]['body'].SetAwake(false);
            previousBalls[i]['body'].GetWorld().DestroyBody(previousBalls[i]['body']);
			clearInterval(previousBalls[i]['body'].spring_interval);
            previousBalls.splice(i, 1);
            i--;
        }
    }
    //draw rectangles:
    var prevFill = ctx.fillStyle;
    ctx.fillStyle = "#ad926b";
    for (var i = 0; i < drawBoxes.length; i++) {
        var rect = drawBoxes[i].m_aabb;
        ctx.fillRect(rect.lowerBound.x * world_scale, rect.lowerBound.y * world_scale, (rect.upperBound.x - rect.lowerBound.x) * world_scale, (rect.upperBound.y - rect.lowerBound.y) * world_scale);

    }
    ctx.fillStyle = prevFill;
	
    rotateAndPaintImage(img_ball, ball.m_xf.GetAngle(), ball.m_xf.position.x, ball.m_xf.position.y, (ball.img_width / 2), (ball.img_height / 2), ball.img_width, ball.img_height, 1);
	if(!ball.IsAwake() && ball.m_xf.position.y < ballSpawnBottom)rotateAndPaintImage(img_ball_high, ball.m_xf.GetAngle(), ball.m_xf.position.x, ball.m_xf.position.y, (img_ball_size / 2), (img_ball_size / 2), img_ball_size, img_ball_size, 1);
	if(seconds <= 0)rotateAndPaintImage(img_buzzer_beater, 0, hoopx - 0.15, 1.6-0.565, 0, 0, 6, 34, 1);

}

function rotateAndPaintImage(image, angleInRad, positionX, positionY, axisX, axisY, scaleX, scaleY, alpha) {
    var prev = ctx.globalAlpha;
    ctx.globalAlpha = alpha;


    ctx.translate(positionX * draw_scale, positionY * draw_scale);
    ctx.rotate(angleInRad);
    ctx.drawImage(image, -axisX * draw_scale / 30, -axisY * draw_scale / 30, scaleX * draw_scale / 30, scaleY * draw_scale / 30);
    ctx.rotate(-angleInRad);
    ctx.translate(-positionX * draw_scale, -positionY * draw_scale);

    ctx.globalAlpha = prev;
}
var previousBalls = [];
var ballSpawn;
var respawnInSameSpot = false;

function createBall() {
    //create basketball
    bodyDef.type = b2Body.b2_dynamicBody;
    fixDef.shape = new b2CircleShape(0.15);
    bodyDef.position.x = hoopx + 0.12;
    bodyDef.position.y = 1;

    //fixDef.density = 0.5;
    //fixDef.friction = 0.1;
    fixDef.restitution = 0.7;
    fixDef.filter.categoryBits = 0x0001;
    fixDef.filter.maskBits = 0x0002 | 0x0004;
	
    if (ball !== undefined){ 
		previousBalls.push({
			body: ball,
			alpha: 1
		});
	}
    ball = world.CreateBody(bodyDef).CreateFixture(fixDef);
	ball.SetUserData({"name":"ball","self":ball.m_body});
    ball = ball.m_body; //this is the ball
	ball.img_width = img_ball_size;
	ball.img_height = img_ball_size;
	ball.spring_value = 0;
	ball.spring_interval;
    ballLastPosX = ball.m_xf.position.x;
    ballLastPosY = ball.m_xf.position.y;
}
var drawBoxes = [];
var contactListener;

function springTheValue(t){
	//http://en.wikipedia.org/wiki/Damped_sine_wave
	//t should be between 0 and 5 for effect
	var y = Math.pow(Math.E,(-t)) * Math.cos(2*Math.PI*t);
	return y;
}
function springtheBall(mag,theBall,max){
	if(theBall === undefined)return;
	if(mag > max)mag = max;
	theBall.spring_value = 0;
	clearInterval(theBall.spring_interval);
	theBall.spring_interval = window.setInterval(function(){
		theBall.img_height = -springTheValue(theBall.spring_value)*mag + img_ball_size;
		theBall.img_width = springTheValue(theBall.spring_value)*mag + img_ball_size;
		theBall.spring_value += 0.1;
		if(theBall.spring_value >= 3.5)clearInterval(theBall.spring_interval);
	},50);
}
function findMagnitude(x,y){
	return Math.sqrt(x*x + y*y);
}
function camera(){
	this.x = 0;
	this.y = 0;
	this.shakeStartAmount = 5;
	this.shakeValue = 0;
	this.shakeInterval;
	this.shake = function(xDirection,yDirection){
		//xDir and yDir should be either -1 or 1
		this.shakeValue = 0;
		clearInterval(this.shakeInterval);
		this.shakeInterval = window.setInterval(function(){
			this.x = xDirection * springTheValue(this.shakeValue)*this.shakeStartAmount;
			this.y = yDirection * springTheValue(this.shakeValue)*this.shakeStartAmount;
			this.shakeValue += 0.1;
			if(this.shakeValue >= 3.5)clearInterval(this.shakeInterval);
		}.bind(this),20);
	}
}
var cam = new camera();
var rightBoundry;
function init() {

    world = new b2World(
        new b2Vec2(0, box2d_grav) //gravity
        , true //allow sleep
    );

	contactListener = new b2ContactListener();
	contactListener.BeginContact = function(contact, manifold){
		if(contact.m_fixtureA.m_userData === null || contact.m_fixtureB.m_userData === null)return;
		if(contact.m_fixtureA.m_userData['name'] == "hoop" || contact.m_fixtureB.m_userData['name'] == "hoop"){
			sound_rim.play();
			var collideMagnitude = findMagnitude(contact.m_fixtureA.m_body.GetLinearVelocity().y,contact.m_fixtureA.m_body.GetLinearVelocity().x);
			springtheBall(1.5*collideMagnitude/6,contact.m_fixtureA.m_userData['self'],2);
		}
		var collideMagnitude = findMagnitude(contact.m_fixtureB.m_body.GetLinearVelocity().y,contact.m_fixtureB.m_body.GetLinearVelocity().x);
		if(contact.m_fixtureA.m_userData['name'] == "backboard" || contact.m_fixtureB.m_userData['name'] == "backboard"){
			sound_ball_bounce.play();
			springtheBall(1.5*collideMagnitude/6,contact.m_fixtureB.m_userData['self'],2);
			cam.shake(-1*collideMagnitude/6,0);
		}
		if(contact.m_fixtureA.m_userData['name'] == "wall" || contact.m_fixtureB.m_userData['name'] == "wall"){
			sound_ball_bounce.play();
			springtheBall(1.5*collideMagnitude/6,contact.m_fixtureB.m_userData['self'],2);
			cam.shake(-1*collideMagnitude/6,0);
		}
		if((contact.m_fixtureA.m_userData['name'] == "ground" || contact.m_fixtureB.m_userData['name'] == "ground") && collideMagnitude > 2){
			sound_ball_bounce.play();
			springtheBall(1.5*collideMagnitude/9,contact.m_fixtureB.m_userData['self'],2.5);
			cam.shake(0,1*collideMagnitude/9);
		}
		

	}
	world.SetContactListener(contactListener);
	
    fixDef.density = 1.0;
    fixDef.friction = 0.5;
    fixDef.restitution = 0.2;

    fixDef.filter.categoryBits = 0x0004;
    fixDef.filter.maskBits = 0x0001 | 0x0002 | 0x0003;


    //create ground
    bodyDef.type = b2Body.b2_staticBody;
    fixDef.shape = new b2PolygonShape;
    fixDef.shape.SetAsBox(20, 2);
    bodyDef.position.Set(10, (canvas.height+20) / world_scale + 1.8);
    drawBoxes.push(world.CreateBody(bodyDef).CreateFixture(fixDef));
	drawBoxes[drawBoxes.length - 1].SetUserData({"name":"ground"});

    fixDef.shape.SetAsBox(.2, 14);
    bodyDef.position.Set(-.1, 13);
    drawBoxes.push(world.CreateBody(bodyDef).CreateFixture(fixDef));
	drawBoxes[drawBoxes.length - 1].SetUserData({"name":"wall"});
	rightBoundry = (canvas.width) / world_scale;
	ballSpawnRight = rightBoundry - 0.5;
    bodyDef.position.Set(rightBoundry, 13);
    drawBoxes.push(world.CreateBody(bodyDef).CreateFixture(fixDef));
	drawBoxes[drawBoxes.length - 1].SetUserData({"name":"wall"});

    //create backboard
    fixDef.shape.SetAsBox(0.05, 1.11 / 2);
    bodyDef.position.Set(hoopx - 0.18, 1.6);
    drawBoxes.push(world.CreateBody(bodyDef).CreateFixture(fixDef));
	drawBoxes[drawBoxes.length - 1].SetUserData({"name":"backboard"});
	
	//this box keeps the ball from getting stuck
    fixDef.shape.SetAsBox(0.05, 1.11 / 2);
    bodyDef.position.Set(hoopx - 0.3, 1.55);
    world.CreateBody(bodyDef).CreateFixture(fixDef);



    //make hoop:
    fixDef.shape = new b2CircleShape(0.01);
    //only collide with ball
    fixDef.filter.categoryBits = 0x0002;
    fixDef.filter.maskBits = 0x0001;
    bodyDef.position.Set(hoopx, hoopy);
    var hoop_point = world.CreateBody(bodyDef).CreateFixture(fixDef);
	hoop_point.SetUserData({"name":"hoop"});
    hoop_points.push(hoop_point.m_body);
    bodyDef.position.Set(hoopx + 0.5, hoopy);
    hoop_point = world.CreateBody(bodyDef).CreateFixture(fixDef);
    hoop_points.push(hoop_point.m_body);
	hoop_point.SetUserData({"name":"hoop"});
};
function detectmobile() { 
 if( navigator.userAgent.match(/Android/i)
 || navigator.userAgent.match(/webOS/i)
 || navigator.userAgent.match(/iPhone/i)
 || navigator.userAgent.match(/iPad/i)
 || navigator.userAgent.match(/iPod/i)
 || navigator.userAgent.match(/BlackBerry/i)
 || navigator.userAgent.match(/Windows Phone/i)
 ){
    return true;
  }
 else {
    return false;
  }
}

////////////////Count down/////////////////////////
 
// variables for time units
var days, hours, minutes, seconds;
var countdownSeconds = 30.99;
var target_date;
var countdown;
function startCountdown(){
	target_date = new Date().getTime() + countdownSeconds * 1000;
	 
	// get tag element
	countdown = $("#countdown");
	updateCountdown();
		
	// update the tag with id "countdown" every 1 second
	setInterval(updateCountdown, 1000);
}
var horn_playing = false;
function updateCountdown(){
	if(gameOver){
		if(usingMobile){
			$('#tableCover').hide();		
		}else{
			$('#tableCover').fadeOut(1000).hide();
		}
		$('#endScore').text(score);
		$('#endAttempted').text(ballsShot);
		$('#endAcc').text(Math.round((score/ballsShot)*100) + "%");
		//countdown.innerText = "Game Over\nScore: " + score;
		window.onmousedown = window.ontouchstart = window.ontouchend = window.ontouchmove = window.onmouseup = canvas.onmousemove = function(e){e.preventDefault();return;};
		ball.SetAwake(true);
		return;
	}
 
    // find the amount of "seconds" between now and target
    var current_date = new Date().getTime();
    var seconds_left = (target_date - current_date) / 1000;
 
    // do some time calculations
    days = parseInt(seconds_left / 86400);
    seconds_left = seconds_left % 86400;
     
    hours = parseInt(seconds_left / 3600);
    seconds_left = seconds_left % 3600;
     
    minutes = parseInt(seconds_left / 60);
    seconds = parseInt(seconds_left % 60);
	if(seconds <= 0 && !isMouseDown){
		ball.SetAwake(true);
	}
	if(seconds <= 0 && !horn_playing){
		sound_horn.play();
	}
    // format countdown string + set tag value
	if(seconds >= 0){
		if(seconds / 10 < 1 ){
			countdown.text(minutes + ":0" + seconds); 
			if(!usingMobile)countdown.addClass("pulse animated infinite");
		}
		else{
			countdown.text(minutes + ":" + seconds);  
		}
	}
 

}