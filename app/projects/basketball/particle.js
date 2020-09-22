//http://html5hub.com/build-a-javascript-particle-system/
"use strict";

var maxParticles = 200,
  particleSize = 20,
  emissionRate = 2,
  objectSize = 3; // drawSize of emitter/field
/*

var canvas = document.querySelector('canvas');
var ctx = canvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;*/
var life = 500;

function Particle(point, velocity, startColor) {
  this.position = point || new particle_Vector(0, 0);
  this.velocity = velocity || new particle_Vector(0, 0);
  this.acceleration = new particle_Vector(0, 0);
  this.birth = new Date();
  this.alpha = 1.0;
  this.r = startColor.r;
  this.g = startColor.g;
  this.b = startColor.b;
  this.tr = 0;
  this.tg = 0;
  this.tb = 0;
  this.fadeStep = 0;
  this.size = 20;
  
}


Particle.prototype.submitToFields = function (fields) {
  // our starting acceleration this frame
  var totalAccelerationX = 0;
  var totalAccelerationY = 0;

  // for each passed field
  for (var i = 0; i < fields.length; i++) {
    var field = fields[i];

    // find the distance between the particle and the field
    var vectorX = field.position.x - this.position.x;
    var vectorY = field.position.y - this.position.y;

    // calculate the force via MAGIC and HIGH SCHOOL SCIENCE!
    var force = field.mass / Math.pow(vectorX*vectorX+vectorY*vectorY,1.5);

    // add to the total acceleration the force adjusted by distance
    totalAccelerationX += vectorX * force;
    totalAccelerationY += vectorY * force;
  }

  // update our particle's acceleration
  this.acceleration = new particle_Vector(totalAccelerationX, totalAccelerationY);
};

Particle.prototype.move = function () {
  this.velocity.add(this.acceleration);
  this.position.add(this.velocity);
};

function particle_Field(point, mass) {
  this.position = point;
  this.setMass(mass);
}

particle_Field.prototype.setMass = function(mass) {
  this.mass = mass || 100;
  this.drawColor = mass < 0 ? "#f00" : "#0f0";
}

function particle_Vector(x, y) {
  this.x = x || 0;
  this.y = y || 0;
}

particle_Vector.prototype.add = function(vector) {
  this.x += vector.x;
  this.y += vector.y;
}

particle_Vector.prototype.getMagnitude = function () {
  return Math.sqrt(this.x * this.x + this.y * this.y);
};

particle_Vector.prototype.getAngle = function () {
  return Math.atan2(this.y,this.x);
};

particle_Vector.fromAngle = function (angle, magnitude) {
  return new particle_Vector(magnitude * Math.cos(angle), magnitude * Math.sin(angle));
};

function Emitter(point, velocity, spread) {
  this.position = point; // particle_Vector
  this.velocity = velocity; // particle_Vector
  this.spread = spread || Math.PI / 32; // possible angles = velocity +/- spread
  this.drawColor = "#999"; // So we can tell them apart from Fields later
}

Emitter.prototype.emitParticle = function() {
  // Use an angle randomized over the spread so we have more of a "spray"
  var angle = this.velocity.getAngle() + this.spread - (Math.random() * this.spread * 2);

  // The magnitude of the emitter's velocity
  var magnitude = this.velocity.getMagnitude();

  // The emitter's position
  var position = new particle_Vector(this.position.x, this.position.y);

  // New velocity based off of the calculated angle and magnitude
  var velocity = particle_Vector.fromAngle(angle, magnitude);

  var startColor = {'r':80,'g':80,'b':80}
  if(score_consecutive>=3 && score_consecutive <=5){
	startColor.r = 204;
	startColor.g = 85;
	startColor.b = 0;
  }else if(score_consecutive>5){
	startColor.r = 141;
	startColor.g = 244;
	startColor.b = 255;
  }
  // return our new Particle!
  return new Particle(position,velocity,startColor);
};

function particle_addNewParticles() {
  // if we're at our max, stop emitting.
  if (particles.length > maxParticles) return;

  // for each emitter
  for (var i = 0; i < emitters.length; i++) {

    // emit [emissionRate] particles and store them in our particles array
    for (var j = 0; j < emissionRate; j++) {
      particles.push(emitters[i].emitParticle());
    }

  }
}

function plotParticles(boundsX, boundsY) {
  // a new array to hold particles within our bounds
  var currentParticles = [];
  var currentTime = new Date();
  for (var i = 0; i < particles.length; i++) {
    var particle = particles[i];
    var pos = particle.position;

    // If we're out of bounds, drop this particle and move on to the next
    //if (pos.x < 0 || pos.x > boundsX || pos.y < 0 || pos.y > boundsY) continue;

	//remove particle if out of life:
	if(currentTime - particle.birth > life) continue;
	particle.alpha = 1-((currentTime- particle.birth)/life);
	particle.size = ((currentTime- particle.birth)/life) * particleSize + particleSize;
	particle.fadeStep = ((currentTime- particle.birth)/life)*100;
	
    // Update velocities and accelerations to account for the fields
    particle.submitToFields(fields);

    // Move our particles
    particle.move();

    // Add this particle to the list of current particles
    currentParticles.push(particle);
  }

  // Update our global particles reference
  particles = currentParticles;
}
function fadeColor(r,g,b,tr,tg,tb,step){
	var newr = fadeColorPrimary(r,tr,step);
	var newg = fadeColorPrimary(g,tg,step);
	var newb = fadeColorPrimary(b,tb,step);
	//console.log('rgba('+newr+','+newg+','+newb+',');
	return 'rgba('+Math.floor(newr)+','+Math.floor(newg)+','+Math.floor(newb)+',';
	
}
function fadeColorPrimary(x,tx,step){
	var news = (tx - x) / 100;
	return x + news*step;
	
}
function drawParticles() {
	for (var i = 0; i < particles.length; i++) {
		var particle = particles[i];
		var position = particle.position;
		//ctx.fillStyle = 'rgba(255,0,0,' + particles[i].alpha + ')';
		ctx.fillStyle = fadeColor(particle.r,particle.g,particle.b,particle.tr,particle.tg,particle.tb,particle.fadeStep) + particle.alpha + ')';
		//ctx.fillRect(position.x, position.y, particleSize, particleSize);
		ctx.beginPath();
		ctx.arc(position.x, position.y, particle.size, 0, Math.PI * 2);
		ctx.closePath();
		ctx.fill();
	}
}

function drawCircle(object) {
  ctx.fillStyle = object.drawColor;
  ctx.beginPath();
  ctx.arc(object.position.x, object.position.y, objectSize, 0, Math.PI * 2);
  ctx.closePath();
  ctx.fill();
}
 
var particles = []; 


function particle_loop() {
  //clear();
  particle_update();
  //draw
  drawParticles();
  fields.forEach(drawCircle);
  emitters.forEach(drawCircle);
  //queue();
}

function clear() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function particle_update() {
  if(score_consecutive>1 && ball.IsAwake())particle_addNewParticles();
  //particle_addNewParticles();
  plotParticles(canvas.width, canvas.height);
}


function queue() {
  window.requestAnimationFrame(loop);
}

//loop();
