(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){

},{}],2:[function(require,module,exports){
module.exports={
  "wheelCount": 2,
  "wheelMinRadius": 0.2,
  "wheelRadiusRange": 0.5,
  "wheelMinDensity": 40,
  "wheelDensityRange": 100,
  "chassisDensityRange": 300,
  "chassisMinDensity": 30,
  "chassisMinAxis": 0.1,
  "chassisAxisRange": 1.1
}

},{}],3:[function(require,module,exports){
var carConstants = require("./car-constants.json");

module.exports = {
  worldDef: worldDef,
  carConstants: getCarConstants,
  generateSchema: generateSchema
}

function worldDef(){
  var box2dfps = 60;
  return {
    gravity: { y: 0 },
    doSleep: true,
    floorseed: "abc",
    maxFloorTiles: 200,
    mutable_floor: false,
    motorSpeed: 20,
    box2dfps: box2dfps,
    max_car_health: box2dfps * 10,
    tileDimensions: {
      width: 1.5,
      height: 0.15
    }
  };
}

function getCarConstants(){
  return carConstants;
}

function generateSchema(values){
  return {
    wheel_radius: {
      type: "float",
      length: values.wheelCount,
      min: values.wheelMinRadius,
      range: values.wheelRadiusRange,
      factor: 1,
    },
    wheel_density: {
      type: "float",
      length: values.wheelCount,
      min: values.wheelMinDensity,
      range: values.wheelDensityRange,
      factor: 1,
    },
    chassis_density: {
      type: "float",
      length: 1,
      min: values.chassisDensityRange,
      range: values.chassisMinDensity,
      factor: 1,
    },
    vertex_list: {
      type: "float",
      length: 12,
      min: values.chassisMinAxis,
      range: values.chassisAxisRange,
      factor: 1,
    },
    wheel_vertex: {
      type: "shuffle",
      length: 8,
      limit: values.wheelCount,
      factor: 1,
    },
  };
}

},{"./car-constants.json":2}],4:[function(require,module,exports){
/*
  globals b2RevoluteJointDef b2Vec2 b2BodyDef b2Body b2FixtureDef b2PolygonShape b2CircleShape
*/

var createInstance = require("../machine-learning/create-instance");

module.exports = defToCar;

function defToCar(normal_def, world, constants){
  var car_def = createInstance.applyTypes(constants.schema, normal_def)
  var instance = {};
  instance.chassis = createChassis(
    world, car_def.vertex_list, car_def.chassis_density
  );
  var i;

  var wheelCount = car_def.wheel_radius.length;

  instance.wheels = [];
  for (i = 0; i < wheelCount; i++) {
    instance.wheels[i] = createWheel(
      world,
      car_def.wheel_radius[i],
      car_def.wheel_density[i]
    );
  }

  var carmass = instance.chassis.GetMass();
  for (i = 0; i < wheelCount; i++) {
    carmass += instance.wheels[i].GetMass();
  }

  var joint_def = new b2RevoluteJointDef();

  for (i = 0; i < wheelCount; i++) {
    var torque = carmass * -constants.gravity.y / car_def.wheel_radius[i];

    var randvertex = instance.chassis.vertex_list[car_def.wheel_vertex[i]];
    joint_def.localAnchorA.Set(randvertex.x, randvertex.y);
    joint_def.localAnchorB.Set(0, 0);
    joint_def.maxMotorTorque = torque;
    joint_def.motorSpeed = -constants.motorSpeed;
    joint_def.enableMotor = true;
    joint_def.bodyA = instance.chassis;
    joint_def.bodyB = instance.wheels[i];
    world.CreateJoint(joint_def);
  }

  return instance;
}

function createChassis(world, vertexs, density) {

  var vertex_list = new Array();
  vertex_list.push(new b2Vec2(vertexs[0], 0));
  vertex_list.push(new b2Vec2(vertexs[1], vertexs[2]));
  vertex_list.push(new b2Vec2(0, vertexs[3]));
  vertex_list.push(new b2Vec2(-vertexs[4], vertexs[5]));
  vertex_list.push(new b2Vec2(-vertexs[6], 0));
  vertex_list.push(new b2Vec2(-vertexs[7], -vertexs[8]));
  vertex_list.push(new b2Vec2(0, -vertexs[9]));
  vertex_list.push(new b2Vec2(vertexs[10], -vertexs[11]));

  var body_def = new b2BodyDef();
  body_def.type = b2Body.b2_dynamicBody;
  body_def.position.Set(0.0, 4.0);

  var body = world.CreateBody(body_def);

  createChassisPart(body, vertex_list[0], vertex_list[1], density);
  createChassisPart(body, vertex_list[1], vertex_list[2], density);
  createChassisPart(body, vertex_list[2], vertex_list[3], density);
  createChassisPart(body, vertex_list[3], vertex_list[4], density);
  createChassisPart(body, vertex_list[4], vertex_list[5], density);
  createChassisPart(body, vertex_list[5], vertex_list[6], density);
  createChassisPart(body, vertex_list[6], vertex_list[7], density);
  createChassisPart(body, vertex_list[7], vertex_list[0], density);

  body.vertex_list = vertex_list;

  return body;
}


function createChassisPart(body, vertex1, vertex2, density) {
  var vertex_list = new Array();
  vertex_list.push(vertex1);
  vertex_list.push(vertex2);
  vertex_list.push(b2Vec2.Make(0, 0));
  var fix_def = new b2FixtureDef();
  fix_def.shape = new b2PolygonShape();
  fix_def.density = density;
  fix_def.friction = 10;
  fix_def.restitution = 0.2;
  fix_def.filter.groupIndex = -1;
  fix_def.shape.SetAsArray(vertex_list, 3);

  body.CreateFixture(fix_def);
}

function createWheel(world, radius, density) {
  var body_def = new b2BodyDef();
  body_def.type = b2Body.b2_dynamicBody;
  body_def.position.Set(0, 0);

  var body = world.CreateBody(body_def);

  var fix_def = new b2FixtureDef();
  fix_def.shape = new b2CircleShape(radius);
  fix_def.density = density;
  fix_def.friction = 1;
  fix_def.restitution = 0.2;
  fix_def.filter.groupIndex = -1;

  body.CreateFixture(fix_def);
  return body;
}

},{"../machine-learning/create-instance":21}],5:[function(require,module,exports){


module.exports = {
  getInitialState: getInitialState,
  updateState: updateState,
  getStatus: getStatus,
  calculateScore: calculateScore,
};

function getInitialState(world_def){
  return {
    frames: 0,
    health: world_def.max_car_health,
    maxPositiony: 0,
    minPositiony: 0,
    maxPositionx: 0,
  };
}

function updateState(constants, worldConstruct, state){
  if(state.health <= 0){
    throw new Error("Already Dead");
  }
  if(state.maxPositionx > constants.finishLine){
    throw new Error("already Finished");
  }

  // console.log(state);
  // check health
  var position = worldConstruct.chassis.GetPosition();
  // check if car reached end of the path
  var nextState = {
    frames: state.frames + 1,
    maxPositionx: position.x > state.maxPositionx ? position.x : state.maxPositionx,
    maxPositiony: position.y > state.maxPositiony ? position.y : state.maxPositiony,
    minPositiony: position.y < state.minPositiony ? position.y : state.minPositiony
  };

  if (position.x > constants.finishLine) {
    return nextState;
  }

  if (position.x > state.maxPositionx + 0.02) {
    nextState.health = constants.max_car_health;
    return nextState;
  }
  nextState.health = state.health - 1;
  if (Math.abs(worldConstruct.chassis.GetLinearVelocity().x) < 0.001) {
    nextState.health -= 5;
  }
  return nextState;
}

function getStatus(state, constants){
  if(hasFailed(state, constants)) return -1;
  if(hasSuccess(state, constants)) return 1;
  return 0;
}

function hasFailed(state /*, constants */){
  return state.health <= 0;
}
function hasSuccess(state, constants){
  return state.maxPositionx > constants.finishLine;
}

function calculateScore(state, constants){
  var avgspeed = (state.maxPositionx / state.frames) * constants.box2dfps;
  var position = state.maxPositionx;
  var score = position + avgspeed;
  return {
    v: score,
    s: avgspeed,
    x: position,
    y: state.maxPositiony,
    y2: state.minPositiony
  }
}

},{}],6:[function(require,module,exports){
/* globals document */

var run = require("../car-schema/run");

/* ========================================================================= */
/* === Car ================================================================= */
var cw_Car = function () {
  this.__constructor.apply(this, arguments);
}

cw_Car.prototype.__constructor = function (car) {
  this.car = car;
  this.car_def = car.def;
  var car_def = this.car_def;

  this.frames = 0;
  this.alive = true;
  this.is_elite = car.def.is_elite;
  this.healthBar = document.getElementById("health" + car_def.index).style;
  this.healthBarText = document.getElementById("health" + car_def.index).nextSibling.nextSibling;
  this.healthBarText.innerHTML = car_def.index;
  this.minimapmarker = document.getElementById("bar" + car_def.index);

  if (this.is_elite) {
    this.healthBar.backgroundColor = "#3F72AF";
    this.minimapmarker.style.borderLeft = "1px solid #3F72AF";
    this.minimapmarker.innerHTML = car_def.index;
  } else {
    this.healthBar.backgroundColor = "#F7C873";
    this.minimapmarker.style.borderLeft = "1px solid #F7C873";
    this.minimapmarker.innerHTML = car_def.index;
  }

}

cw_Car.prototype.getPosition = function () {
  return this.car.car.chassis.GetPosition();
}

cw_Car.prototype.kill = function (currentRunner, constants) {
  this.minimapmarker.style.borderLeft = "1px solid #3F72AF";
  var finishLine = currentRunner.scene.finishLine
  var max_car_health = constants.max_car_health;
  var status = run.getStatus(this.car.state, {
    finishLine: finishLine,
    max_car_health: max_car_health,
  })
  switch(status){
    case 1: {
      this.healthBar.width = "0";
      break
    }
    case -1: {
      this.healthBarText.innerHTML = "&dagger;";
      this.healthBar.width = "0";
      break
    }
  }
  this.alive = false;

}

module.exports = cw_Car;

},{"../car-schema/run":5}],7:[function(require,module,exports){

var cw_drawVirtualPoly = require("./draw-virtual-poly");
var cw_drawCircle = require("./draw-circle");

module.exports = function(car_constants, myCar, camera, ctx){
  var camera_x = camera.pos.x;
  var zoom = camera.zoom;

  var wheelMinDensity = car_constants.wheelMinDensity
  var wheelDensityRange = car_constants.wheelDensityRange

  if (!myCar.alive) {
    return;
  }
  var myCarPos = myCar.getPosition();

  if (myCarPos.x < (camera_x - 5)) {
    // too far behind, don't draw
    return;
  }

  ctx.strokeStyle = "#444";
  ctx.lineWidth = 1 / zoom;

  var wheels = myCar.car.car.wheels;

  for (var i = 0; i < wheels.length; i++) {
    var b = wheels[i];
    for (var f = b.GetFixtureList(); f; f = f.m_next) {
      var s = f.GetShape();
      var color = Math.round(255 - (255 * (f.m_density - wheelMinDensity)) / wheelDensityRange).toString();
      var rgbcolor = "rgb(" + color + "," + color + "," + color + ")";
      cw_drawCircle(ctx, b, s.m_p, s.m_radius, b.m_sweep.a, rgbcolor);
    }
  }

  if (myCar.is_elite) {
    ctx.strokeStyle = "#3F72AF";
    ctx.fillStyle = "#DBE2EF";
  } else {
    ctx.strokeStyle = "#F7C873";
    ctx.fillStyle = "#FAEBCD";
  }
  ctx.beginPath();

  var chassis = myCar.car.car.chassis;

  for (f = chassis.GetFixtureList(); f; f = f.m_next) {
    var cs = f.GetShape();
    cw_drawVirtualPoly(ctx, chassis, cs.m_vertices, cs.m_vertexCount);
  }
  ctx.fill();
  ctx.stroke();
}

},{"./draw-circle":8,"./draw-virtual-poly":10}],8:[function(require,module,exports){

module.exports = cw_drawCircle;

function cw_drawCircle(ctx, body, center, radius, angle, color) {
  var p = body.GetWorldPoint(center);
  ctx.fillStyle = color;

  ctx.beginPath();
  ctx.arc(p.x, p.y, radius, 0, 2 * Math.PI, true);

  ctx.moveTo(p.x, p.y);
  ctx.lineTo(p.x + radius * Math.cos(angle), p.y + radius * Math.sin(angle));

  ctx.fill();
  ctx.stroke();
}

},{}],9:[function(require,module,exports){
var cw_drawVirtualPoly = require("./draw-virtual-poly");
module.exports = function(ctx, camera, cw_floorTiles) {
  var camera_x = camera.pos.x;
  var zoom = camera.zoom;
  ctx.strokeStyle = "#000";
  ctx.fillStyle = "#777";
  ctx.lineWidth = 1 / zoom;
  ctx.beginPath();

  var k;
  if(camera.pos.x - 10 > 0){
    k = Math.floor((camera.pos.x - 10) / 1.5);
  } else {
    k = 0;
  }

  // console.log(k);

  outer_loop:
    for (k; k < cw_floorTiles.length; k++) {
      var b = cw_floorTiles[k];
      for (var f = b.GetFixtureList(); f; f = f.m_next) {
        var s = f.GetShape();
        var shapePosition = b.GetWorldPoint(s.m_vertices[0]).x;
        if ((shapePosition > (camera_x - 5)) && (shapePosition < (camera_x + 10))) {
          cw_drawVirtualPoly(ctx, b, s.m_vertices, s.m_vertexCount);
        }
        if (shapePosition > camera_x + 10) {
          break outer_loop;
        }
      }
    }
  ctx.fill();
  ctx.stroke();
}

},{"./draw-virtual-poly":10}],10:[function(require,module,exports){


module.exports = function(ctx, body, vtx, n_vtx) {
  // set strokestyle and fillstyle before call
  // call beginPath before call

  var p0 = body.GetWorldPoint(vtx[0]);
  ctx.moveTo(p0.x, p0.y);
  for (var i = 1; i < n_vtx; i++) {
    var p = body.GetWorldPoint(vtx[i]);
    ctx.lineTo(p.x, p.y);
  }
  ctx.lineTo(p0.x, p0.y);
}

},{}],11:[function(require,module,exports){
var scatterPlot = require("./scatter-plot");

module.exports = {
  plotGraphs: function(graphElem, topScoresElem, scatterPlotElem, lastState, scores, config) {
    lastState = lastState || {};
    var generationSize = scores.length
    var graphcanvas = graphElem;
    var graphctx = graphcanvas.getContext("2d");
    var graphwidth = 400;
    var graphheight = 250;
    var nextState = cw_storeGraphScores(
      lastState, scores, generationSize
    );
    console.log(scores, nextState);
    cw_clearGraphics(graphcanvas, graphctx, graphwidth, graphheight);
    cw_plotAverage(nextState, graphctx);
    cw_plotElite(nextState, graphctx);
    cw_plotTop(nextState, graphctx);
    cw_listTopScores(topScoresElem, nextState);
    nextState.scatterGraph = drawAllResults(
      scatterPlotElem, config, nextState, lastState.scatterGraph
    );
    return nextState;
  },
  clearGraphics: function(graphElem) {
    var graphcanvas = graphElem;
    var graphctx = graphcanvas.getContext("2d");
    var graphwidth = 400;
    var graphheight = 250;
    cw_clearGraphics(graphcanvas, graphctx, graphwidth, graphheight);
  }
};


function cw_storeGraphScores(lastState, cw_carScores, generationSize) {
  console.log(cw_carScores);
  return {
    cw_topScores: (lastState.cw_topScores || [])
    .concat([cw_carScores[0].score]),
    cw_graphAverage: (lastState.cw_graphAverage || []).concat([
      cw_average(cw_carScores, generationSize)
    ]),
    cw_graphElite: (lastState.cw_graphElite || []).concat([
      cw_eliteaverage(cw_carScores, generationSize)
    ]),
    cw_graphTop: (lastState.cw_graphTop || []).concat([
      cw_carScores[0].score.v
    ]),
    allResults: (lastState.allResults || []).concat(cw_carScores),
  }
}

function cw_plotTop(state, graphctx) {
  var cw_graphTop = state.cw_graphTop;
  var graphsize = cw_graphTop.length;
  graphctx.strokeStyle = "#C83B3B";
  graphctx.beginPath();
  graphctx.moveTo(0, 0);
  for (var k = 0; k < graphsize; k++) {
    graphctx.lineTo(400 * (k + 1) / graphsize, cw_graphTop[k]);
  }
  graphctx.stroke();
}

function cw_plotElite(state, graphctx) {
  var cw_graphElite = state.cw_graphElite;
  var graphsize = cw_graphElite.length;
  graphctx.strokeStyle = "#7BC74D";
  graphctx.beginPath();
  graphctx.moveTo(0, 0);
  for (var k = 0; k < graphsize; k++) {
    graphctx.lineTo(400 * (k + 1) / graphsize, cw_graphElite[k]);
  }
  graphctx.stroke();
}

function cw_plotAverage(state, graphctx) {
  var cw_graphAverage = state.cw_graphAverage;
  var graphsize = cw_graphAverage.length;
  graphctx.strokeStyle = "#3F72AF";
  graphctx.beginPath();
  graphctx.moveTo(0, 0);
  for (var k = 0; k < graphsize; k++) {
    graphctx.lineTo(400 * (k + 1) / graphsize, cw_graphAverage[k]);
  }
  graphctx.stroke();
}


function cw_eliteaverage(scores, generationSize) {
  var sum = 0;
  for (var k = 0; k < Math.floor(generationSize / 2); k++) {
    sum += scores[k].score.v;
  }
  return sum / Math.floor(generationSize / 2);
}

function cw_average(scores, generationSize) {
  var sum = 0;
  for (var k = 0; k < generationSize; k++) {
    sum += scores[k].score.v;
  }
  return sum / generationSize;
}

function cw_clearGraphics(graphcanvas, graphctx, graphwidth, graphheight) {
  graphcanvas.width = graphcanvas.width;
  graphctx.translate(0, graphheight);
  graphctx.scale(1, -1);
  graphctx.lineWidth = 1;
  graphctx.strokeStyle = "#3F72AF";
  graphctx.beginPath();
  graphctx.moveTo(0, graphheight / 2);
  graphctx.lineTo(graphwidth, graphheight / 2);
  graphctx.moveTo(0, graphheight / 4);
  graphctx.lineTo(graphwidth, graphheight / 4);
  graphctx.moveTo(0, graphheight * 3 / 4);
  graphctx.lineTo(graphwidth, graphheight * 3 / 4);
  graphctx.stroke();
}

function cw_listTopScores(elem, state) {
  var cw_topScores = state.cw_topScores;
  var ts = elem;
  ts.innerHTML = "<b>Top Scores:</b><br />";
  cw_topScores.sort(function (a, b) {
    if (a.v > b.v) {
      return -1
    } else {
      return 1
    }
  });

  for (var k = 0; k < Math.min(10, cw_topScores.length); k++) {
    var topScore = cw_topScores[k];
    // console.log(topScore);
    var n = "#" + (k + 1) + ":";
    var score = Math.round(topScore.v * 100) / 100;
    var distance = "d:" + Math.round(topScore.x * 100) / 100;
    var yrange =  "h:" + Math.round(topScore.y2 * 100) / 100 + "/" + Math.round(topScore.y * 100) / 100 + "m";
    var gen = "(Gen " + cw_topScores[k].i + ")"

    ts.innerHTML +=  [n, score, distance, yrange, gen].join(" ") + "<br />";
  }
}

function drawAllResults(scatterPlotElem, config, allResults, previousGraph){
  if(!scatterPlotElem) return;
  return scatterPlot(scatterPlotElem, allResults, config.propertyMap, previousGraph)
}

},{"./scatter-plot":12}],12:[function(require,module,exports){
/* globals vis Highcharts */

// Called when the Visualization API is loaded.

module.exports = highCharts;
function highCharts(elem, scores){
  var keys = Object.keys(scores[0].def);
  keys = keys.reduce(function(curArray, key){
    var l = scores[0].def[key].length;
    var subArray = [];
    for(var i = 0; i < l; i++){
      subArray.push(key + "." + i);
    }
    return curArray.concat(subArray);
  }, []);
  function retrieveValue(obj, path){
    return path.split(".").reduce(function(curValue, key){
      return curValue[key];
    }, obj);
  }

  var dataObj = Object.keys(scores).reduce(function(kv, score){
    keys.forEach(function(key){
      kv[key].data.push([
        retrieveValue(score.def, key), score.score.v
      ])
    })
    return kv;
  }, keys.reduce(function(kv, key){
    kv[key] = {
      name: key,
      data: [],
    }
    return kv;
  }, {}))
  Highcharts.chart(elem.id, {
      chart: {
          type: 'scatter',
          zoomType: 'xy'
      },
      title: {
          text: 'Property Value to Score'
      },
      xAxis: {
          title: {
              enabled: true,
              text: 'Normalized'
          },
          startOnTick: true,
          endOnTick: true,
          showLastLabel: true
      },
      yAxis: {
          title: {
              text: 'Score'
          }
      },
      legend: {
          layout: 'vertical',
          align: 'left',
          verticalAlign: 'top',
          x: 100,
          y: 70,
          floating: true,
          backgroundColor: (Highcharts.theme && Highcharts.theme.legendBackgroundColor) || '#FFFFFF',
          borderWidth: 1
      },
      plotOptions: {
          scatter: {
              marker: {
                  radius: 5,
                  states: {
                      hover: {
                          enabled: true,
                          lineColor: 'rgb(100,100,100)'
                      }
                  }
              },
              states: {
                  hover: {
                      marker: {
                          enabled: false
                      }
                  }
              },
              tooltip: {
                  headerFormat: '<b>{series.name}</b><br>',
                  pointFormat: '{point.x}, {point.y}'
              }
          }
      },
      series: keys.map(function(key){
        return dataObj[key];
      })
  });
}

function visChart(elem, scores, propertyMap, graph) {

  // Create and populate a data table.
  var data = new vis.DataSet();
  scores.forEach(function(scoreInfo){
    data.add({
      x: getProperty(scoreInfo, propertyMap.x),
      y: getProperty(scoreInfo, propertyMap.x),
      z: getProperty(scoreInfo, propertyMap.z),
      style: getProperty(scoreInfo, propertyMap.z),
      // extra: def.ancestry
    });
  });

  function getProperty(info, key){
    if(key === "score"){
      return info.score.v
    } else {
      return info.def[key];
    }
  }

  // specify options
  var options = {
    width:  '600px',
    height: '600px',
    style: 'dot-size',
    showPerspective: true,
    showLegend: true,
    showGrid: true,
    showShadow: false,

    // Option tooltip can be true, false, or a function returning a string with HTML contents
    tooltip: function (point) {
      // parameter point contains properties x, y, z, and data
      // data is the original object passed to the point constructor
      return 'score: <b>' + point.z + '</b><br>'; // + point.data.extra;
    },

    // Tooltip default styling can be overridden
    tooltipStyle: {
      content: {
        background    : 'rgba(255, 255, 255, 0.7)',
        padding       : '10px',
        borderRadius  : '10px'
      },
      line: {
        borderLeft    : '1px dotted rgba(0, 0, 0, 0.5)'
      },
      dot: {
        border        : '5px solid rgba(0, 0, 0, 0.5)'
      }
    },

    keepAspectRatio: true,
    verticalRatio: 0.5
  };

  var camera = graph ? graph.getCameraPosition() : null;

  // create our graph
  var container = elem;
  graph = new vis.Graph3d(container, data, options);

  if (camera) graph.setCameraPosition(camera); // restore camera position
  return graph;
}

},{}],13:[function(require,module,exports){

module.exports = generateRandom;
function generateRandom(){
  return Math.random();
}

},{}],14:[function(require,module,exports){
// http://sunmingtao.blogspot.com/2016/11/inbreeding-coefficient.html
module.exports = getInbreedingCoefficient;

function getInbreedingCoefficient(child){
  var nameIndex = new Map();
  var flagged = new Set();
  var convergencePoints = new Set();
  createAncestryMap(child, []);

  var storedCoefficients = new Map();

  return Array.from(convergencePoints.values()).reduce(function(sum, point){
    var iCo = getCoefficient(point);
    return sum + iCo;
  }, 0);

  function createAncestryMap(initNode){
    var itemsInQueue = [{ node: initNode, path: [] }];
    do{
      var item = itemsInQueue.shift();
      var node = item.node;
      var path = item.path;
      if(processItem(node, path)){
        var nextPath = [ node.id ].concat(path);
        itemsInQueue = itemsInQueue.concat(node.ancestry.map(function(parent){
          return {
            node: parent,
            path: nextPath
          };
        }));
      }
    }while(itemsInQueue.length);


    function processItem(node, path){
      var newAncestor = !nameIndex.has(node.id);
      if(newAncestor){
        nameIndex.set(node.id, {
          parents: (node.ancestry || []).map(function(parent){
            return parent.id;
          }),
          id: node.id,
          children: [],
          convergences: [],
        });
      } else {

        flagged.add(node.id)
        nameIndex.get(node.id).children.forEach(function(childIdentifier){
          var offsets = findConvergence(childIdentifier.path, path);
          if(!offsets){
            return;
          }
          var childID = path[offsets[1]];
          convergencePoints.add(childID);
          nameIndex.get(childID).convergences.push({
            parent: node.id,
            offsets: offsets,
          });
        });
      }

      if(path.length){
        nameIndex.get(node.id).children.push({
          child: path[0],
          path: path
        });
      }

      if(!newAncestor){
        return;
      }
      if(!node.ancestry){
        return;
      }
      return true;
    }
  }

  function getCoefficient(id){
    if(storedCoefficients.has(id)){
      return storedCoefficients.get(id);
    }
    var node = nameIndex.get(id);
    var val = node.convergences.reduce(function(sum, point){
      return sum + Math.pow(1 / 2, point.offsets.reduce(function(sum, value){
        return sum + value;
      }, 1)) * (1 + getCoefficient(point.parent));
    }, 0);
    storedCoefficients.set(id, val);

    return val;

  }
  function findConvergence(listA, listB){
    var ci, cj, li, lj;
    outerloop:
    for(ci = 0, li = listA.length; ci < li; ci++){
      for(cj = 0, lj = listB.length; cj < lj; cj++){
        if(listA[ci] === listB[cj]){
          break outerloop;
        }
      }
    }
    if(ci === li){
      return false;
    }
    return [ci, cj];
  }
}

},{}],15:[function(require,module,exports){
var carConstruct = require("../car-schema/construct.js");

var carConstants = carConstruct.carConstants();

var schema = carConstruct.generateSchema(carConstants);
var pickParent = require("./pickParent");
var selectFromAllParents = require("./selectFromAllParents");
const constants = {
  generationSize: 40,
  schema: schema,
  championLength: 1,
  mutation_range: 1,
  gen_mutation: 0.05,
};
module.exports = function(){
  var currentChoices = new Map();
  return Object.assign(
    {},
    constants,
    {
      selectFromAllParents: selectFromAllParents,
      generateRandom: require("./generateRandom"),
      pickParent: pickParent.bind(void 0, currentChoices),
    }
  );
}
module.exports.constants = constants

},{"../car-schema/construct.js":3,"./generateRandom":13,"./pickParent":16,"./selectFromAllParents":17}],16:[function(require,module,exports){
var nAttributes = 15;
module.exports = pickParent;

function pickParent(currentChoices, chooseId, key /* , parents */){
  if(!currentChoices.has(chooseId)){
    currentChoices.set(chooseId, initializePick())
  }
  // console.log(chooseId);
  var state = currentChoices.get(chooseId);
  // console.log(state.curparent);
  state.i++
  if(["wheel_radius", "wheel_vertex", "wheel_density"].indexOf(key) > -1){
    state.curparent = cw_chooseParent(state);
    return state.curparent;
  }
  state.curparent = cw_chooseParent(state);
  return state.curparent;

  function cw_chooseParent(state) {
    var curparent = state.curparent;
    var attributeIndex = state.i;
    var swapPoint1 = state.swapPoint1
    var swapPoint2 = state.swapPoint2
    // console.log(swapPoint1, swapPoint2, attributeIndex)
    if ((swapPoint1 == attributeIndex) || (swapPoint2 == attributeIndex)) {
      return curparent == 1 ? 0 : 1
    }
    return curparent
  }

  function initializePick(){
    var curparent = 0;

    var swapPoint1 = Math.floor(Math.random() * (nAttributes));
    var swapPoint2 = swapPoint1;
    while (swapPoint2 == swapPoint1) {
      swapPoint2 = Math.floor(Math.random() * (nAttributes));
    }
    var i = 0;
    return {
      curparent: curparent,
      i: i,
      swapPoint1: swapPoint1,
      swapPoint2: swapPoint2
    }
  }
}

},{}],17:[function(require,module,exports){
var getInbreedingCoefficient = require("./inbreeding-coefficient");

module.exports = simpleSelect;

function simpleSelect(parents){
  var totalParents = parents.length
  var r = Math.random();
  if (r == 0)
    return 0;
  return Math.floor(-Math.log(r) * totalParents) % totalParents;
}

function selectFromAllParents(parents, parentList, previousParentIndex) {
  var previousParent = parents[previousParentIndex];
  var validParents = parents.filter(function(parent, i){
    if(previousParentIndex === i){
      return false;
    }
    if(!previousParent){
      return true;
    }
    var child = {
      id: Math.random().toString(32),
      ancestry: [previousParent, parent].map(function(p){
        return {
          id: p.def.id,
          ancestry: p.def.ancestry
        }
      })
    }
    var iCo = getInbreedingCoefficient(child);
    console.log("inbreeding coefficient", iCo)
    if(iCo > 0.25){
      return false;
    }
    return true;
  })
  if(validParents.length === 0){
    return Math.floor(Math.random() * parents.length)
  }
  var totalScore = validParents.reduce(function(sum, parent){
    return sum + parent.score.v;
  }, 0);
  var r = totalScore * Math.random();
  for(var i = 0; i < validParents.length; i++){
    var score = validParents[i].score.v;
    if(r > score){
      r = r - score;
    } else {
      break;
    }
  }
  return i;
}

},{"./inbreeding-coefficient":14}],18:[function(require,module,exports){

module.exports = function(car) {
  var out = {
    chassis: ghost_get_chassis(car.chassis),
    wheels: [],
    pos: {x: car.chassis.GetPosition().x, y: car.chassis.GetPosition().y}
  };

  for (var i = 0; i < car.wheels.length; i++) {
    out.wheels[i] = ghost_get_wheel(car.wheels[i]);
  }

  return out;
}

function ghost_get_chassis(c) {
  var gc = [];

  for (var f = c.GetFixtureList(); f; f = f.m_next) {
    var s = f.GetShape();

    var p = {
      vtx: [],
      num: 0
    }

    p.num = s.m_vertexCount;

    for (var i = 0; i < s.m_vertexCount; i++) {
      p.vtx.push(c.GetWorldPoint(s.m_vertices[i]));
    }

    gc.push(p);
  }

  return gc;
}

function ghost_get_wheel(w) {
  var gw = [];

  for (var f = w.GetFixtureList(); f; f = f.m_next) {
    var s = f.GetShape();

    var c = {
      pos: w.GetWorldPoint(s.m_p),
      rad: s.m_radius,
      ang: w.m_sweep.a
    }

    gw.push(c);
  }

  return gw;
}

},{}],19:[function(require,module,exports){

var ghost_get_frame = require("./car-to-ghost.js");

var enable_ghost = true;

module.exports = {
  ghost_create_replay: ghost_create_replay,
  ghost_create_ghost: ghost_create_ghost,
  ghost_pause: ghost_pause,
  ghost_resume: ghost_resume,
  ghost_get_position: ghost_get_position,
  ghost_compare_to_replay: ghost_compare_to_replay,
  ghost_move_frame: ghost_move_frame,
  ghost_add_replay_frame: ghost_add_replay_frame,
  ghost_draw_frame: ghost_draw_frame,
  ghost_reset_ghost: ghost_reset_ghost
}

function ghost_create_replay() {
  if (!enable_ghost)
    return null;

  return {
    num_frames: 0,
    frames: [],
  }
}

function ghost_create_ghost() {
  if (!enable_ghost)
    return null;

  return {
    replay: null,
    frame: 0,
    dist: -100
  }
}

function ghost_reset_ghost(ghost) {
  if (!enable_ghost)
    return;
  if (ghost == null)
    return;
  ghost.frame = 0;
}

function ghost_pause(ghost) {
  if (ghost != null)
    ghost.old_frame = ghost.frame;
  ghost_reset_ghost(ghost);
}

function ghost_resume(ghost) {
  if (ghost != null)
    ghost.frame = ghost.old_frame;
}

function ghost_get_position(ghost) {
  if (!enable_ghost)
    return;
  if (ghost == null)
    return;
  if (ghost.frame < 0)
    return;
  if (ghost.replay == null)
    return;
  var frame = ghost.replay.frames[ghost.frame];
  return frame.pos;
}

function ghost_compare_to_replay(replay, ghost, max) {
  if (!enable_ghost)
    return;
  if (ghost == null)
    return;
  if (replay == null)
    return;

  if (ghost.dist < max) {
    ghost.replay = replay;
    ghost.dist = max;
    ghost.frame = 0;
  }
}

function ghost_move_frame(ghost) {
  if (!enable_ghost)
    return;
  if (ghost == null)
    return;
  if (ghost.replay == null)
    return;
  ghost.frame++;
  if (ghost.frame >= ghost.replay.num_frames)
    ghost.frame = ghost.replay.num_frames - 1;
}

function ghost_add_replay_frame(replay, car) {
  if (!enable_ghost)
    return;
  if (replay == null)
    return;

  var frame = ghost_get_frame(car);
  replay.frames.push(frame);
  replay.num_frames++;
}

function ghost_draw_frame(ctx, ghost, camera) {
  var zoom = camera.zoom;
  if (!enable_ghost)
    return;
  if (ghost == null)
    return;
  if (ghost.frame < 0)
    return;
  if (ghost.replay == null)
    return;

  var frame = ghost.replay.frames[ghost.frame];

  // wheel style
  ctx.fillStyle = "#eee";
  ctx.strokeStyle = "#aaa";
  ctx.lineWidth = 1 / zoom;

  for (var i = 0; i < frame.wheels.length; i++) {
    for (var w in frame.wheels[i]) {
      ghost_draw_circle(ctx, frame.wheels[i][w].pos, frame.wheels[i][w].rad, frame.wheels[i][w].ang);
    }
  }

  // chassis style
  ctx.strokeStyle = "#aaa";
  ctx.fillStyle = "#eee";
  ctx.lineWidth = 1 / zoom;
  ctx.beginPath();
  for (var c in frame.chassis)
    ghost_draw_poly(ctx, frame.chassis[c].vtx, frame.chassis[c].num);
  ctx.fill();
  ctx.stroke();
}

function ghost_draw_poly(ctx, vtx, n_vtx) {
  ctx.moveTo(vtx[0].x, vtx[0].y);
  for (var i = 1; i < n_vtx; i++) {
    ctx.lineTo(vtx[i].x, vtx[i].y);
  }
  ctx.lineTo(vtx[0].x, vtx[0].y);
}

function ghost_draw_circle(ctx, center, radius, angle) {
  ctx.beginPath();
  ctx.arc(center.x, center.y, radius, 0, 2 * Math.PI, true);

  ctx.moveTo(center.x, center.y);
  ctx.lineTo(center.x + radius * Math.cos(angle), center.y + radius * Math.sin(angle));

  ctx.fill();
  ctx.stroke();
}

},{"./car-to-ghost.js":18}],20:[function(require,module,exports){
/* globals document performance localStorage alert confirm btoa HTMLDivElement */
/* globals b2Vec2 */
// Global Vars

var worldRun = require("./world/run.js");
var carConstruct = require("./car-schema/construct.js");

var manageRound = require("./machine-learning/genetic-algorithm/manage-round.js");

var ghost_fns = require("./ghost/index.js");

var drawCar = require("./draw/draw-car.js");
var graph_fns = require("./draw/plot-graphs.js");
var plot_graphs = graph_fns.plotGraphs;
var cw_clearGraphics = graph_fns.clearGraphics;
var cw_drawFloor = require("./draw/draw-floor.js");

var ghost_draw_frame = ghost_fns.ghost_draw_frame;
var ghost_create_ghost = ghost_fns.ghost_create_ghost;
var ghost_add_replay_frame = ghost_fns.ghost_add_replay_frame;
var ghost_compare_to_replay = ghost_fns.ghost_compare_to_replay;
var ghost_get_position = ghost_fns.ghost_get_position;
var ghost_move_frame = ghost_fns.ghost_move_frame;
var ghost_reset_ghost = ghost_fns.ghost_reset_ghost
var ghost_pause = ghost_fns.ghost_pause;
var ghost_resume = ghost_fns.ghost_resume;
var ghost_create_replay = ghost_fns.ghost_create_replay;

var cw_Car = require("./draw/draw-car-stats.js");
var ghost;
var carMap = new Map();

var doDraw = true;
var cw_paused = false;

var box2dfps = 60;
var screenfps = 60;
var skipTicks = Math.round(1000 / box2dfps);
var maxFrameSkip = skipTicks * 2;

var canvas = document.getElementById("mainbox");
var ctx = canvas.getContext("2d");

var camera = {
  speed: 0.05,
  pos: {
    x: 0, y: 0
  },
  target: -1,
  zoom: 70
}

var minimapcamera = document.getElementById("minimapcamera").style;
var minimapholder = document.querySelector("#minimapholder");

var minimapcanvas = document.getElementById("minimap");
var minimapctx = minimapcanvas.getContext("2d");
var minimapscale = 3;
var minimapfogdistance = 0;
var fogdistance = document.getElementById("minimapfog").style;


var carConstants = carConstruct.carConstants();


var max_car_health = box2dfps * 10;

var cw_ghostReplayInterval = null;

var distanceMeter = document.getElementById("distancemeter");
var heightMeter = document.getElementById("heightmeter");

var leaderPosition = {
  x: 0, y: 0
}

minimapcamera.width = 12 * minimapscale + "px";
minimapcamera.height = 6 * minimapscale + "px";


// ======= WORLD STATE ======
var generationConfig = require("./generation-config");


var world_def = {
  gravity: new b2Vec2(0.0, -9.81),
  doSleep: true,
  floorseed: btoa(Math.seedrandom()),
  tileDimensions: new b2Vec2(1.5, 0.15),
  maxFloorTiles: 200,
  mutable_floor: false,
  box2dfps: box2dfps,
  motorSpeed: 20,
  max_car_health: max_car_health,
  schema: generationConfig.constants.schema
}

var cw_deadCars;

var arrOfGraphStates = [];

var graphState = {
  cw_topScores: [],
  cw_graphAverage: [],
  cw_graphElite: [],
  cw_graphTop: [],
};

function resetGraphState(){
  graphState = {
    cw_topScores: [],
    cw_graphAverage: [],
    cw_graphElite: [],
    cw_graphTop: [],
  };
}



// ==========================

var generationState;

// ======== Activity State ====
var currentRunner;
var loops = 0;
var nextGameTick = (new Date).getTime();

function showDistance(distance, height) {
  distanceMeter.innerHTML = distance + " meters<br />";
  heightMeter.innerHTML = height + " meters";
  if (distance > minimapfogdistance) {
    fogdistance.width = 800 - Math.round(distance + 15) * minimapscale + "px";
    minimapfogdistance = distance;
  }
}



/* === END Car ============================================================= */
/* ========================================================================= */


/* ========================================================================= */
/* ==== Generation ========================================================= */

function cw_generationZero() {

  generationState = manageRound.generationZero(generationConfig());
}

function resetCarUI(){
  cw_deadCars = 0;
  leaderPosition = {
    x: 0, y: 0
  };
  document.getElementById("generation").innerHTML = generationState.counter.toString();
  document.getElementById("cars").innerHTML = "";
  document.getElementById("population").innerHTML = generationConfig.constants.generationSize.toString();
}

/* ==== END Genration ====================================================== */
/* ========================================================================= */

/* ========================================================================= */
/* ==== Drawing ============================================================ */

function cw_drawScreen() {
  var floorTiles = currentRunner.scene.floorTiles;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  cw_setCameraPosition();
  var camera_x = camera.pos.x;
  var camera_y = camera.pos.y;
  var zoom = camera.zoom;
  ctx.translate(200 - (camera_x * zoom), 200 + (camera_y * zoom));
  ctx.scale(zoom, -zoom);
  cw_drawFloor(ctx, camera, floorTiles);
  ghost_draw_frame(ctx, ghost, camera);
  cw_drawCars();
  ctx.restore();
}

function cw_minimapCamera(/* x, y*/) {
  var camera_x = camera.pos.x
  var camera_y = camera.pos.y
  minimapcamera.left = Math.round((2 + camera_x) * minimapscale) + "px";
  minimapcamera.top = Math.round((31 - camera_y) * minimapscale) + "px";
}

function cw_setCameraTarget(k) {
  camera.target = k;
}

function cw_setCameraPosition() {
  var cameraTargetPosition
  if (camera.target !== -1) {
    cameraTargetPosition = carMap.get(camera.target).getPosition();
  } else {
    cameraTargetPosition = leaderPosition;
  }
  var diff_y = camera.pos.y - cameraTargetPosition.y;
  var diff_x = camera.pos.x - cameraTargetPosition.x;
  camera.pos.y -= camera.speed * diff_y;
  camera.pos.x -= camera.speed * diff_x;
  cw_minimapCamera(camera.pos.x, camera.pos.y);
}

function cw_drawGhostReplay() {
  var floorTiles = currentRunner.scene.floorTiles;
  var carPosition = ghost_get_position(ghost);
  camera.pos.x = carPosition.x;
  camera.pos.y = carPosition.y;
  cw_minimapCamera(camera.pos.x, camera.pos.y);
  showDistance(
    Math.round(carPosition.x * 100) / 100,
    Math.round(carPosition.y * 100) / 100
  );
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.translate(
    200 - (carPosition.x * camera.zoom),
    200 + (carPosition.y * camera.zoom)
  );
  ctx.scale(camera.zoom, -camera.zoom);
  ghost_draw_frame(ctx, ghost);
  ghost_move_frame(ghost);
  cw_drawFloor(ctx, camera, floorTiles);
  ctx.restore();
}


function cw_drawCars() {
  var cw_carArray = Array.from(carMap.values());
  for (var k = (cw_carArray.length - 1); k >= 0; k--) {
    var myCar = cw_carArray[k];
    drawCar(carConstants, myCar, camera, ctx)
  }
}

function toggleDisplay() {
  canvas.width = canvas.width;
  if (doDraw) {
    doDraw = false;
    cw_stopSimulation();
    cw_runningInterval = setInterval(function () {
      var time = performance.now() + (1000 / screenfps);
      while (time > performance.now()) {
        simulationStep();
      }
    }, 1);
  } else {
    doDraw = true;
    clearInterval(cw_runningInterval);
    cw_startSimulation();
  }
}

function cw_drawMiniMap() {
  var floorTiles = currentRunner.scene.floorTiles;
  var last_tile = null;
  var tile_position = new b2Vec2(-5, 0);
  minimapfogdistance = 0;
  fogdistance.width = "800px";
  minimapcanvas.width = minimapcanvas.width;
  minimapctx.strokeStyle = "#3F72AF";
  minimapctx.beginPath();
  minimapctx.moveTo(0, 35 * minimapscale);
  for (var k = 0; k < floorTiles.length; k++) {
    last_tile = floorTiles[k];
    var last_fixture = last_tile.GetFixtureList();
    var last_world_coords = last_tile.GetWorldPoint(last_fixture.GetShape().m_vertices[3]);
    tile_position = last_world_coords;
    minimapctx.lineTo((tile_position.x + 5) * minimapscale, (-tile_position.y + 35) * minimapscale);
  }
  minimapctx.stroke();
}

/* ==== END Drawing ======================================================== */
/* ========================================================================= */
var uiListeners = {
  preCarStep: function(){
    ghost_move_frame(ghost);
  },
  carStep(car){
    updateCarUI(car);
  },
  carDeath(carInfo){

    var k = carInfo.index;

    var car = carInfo.car, score = carInfo.score;
    carMap.get(carInfo).kill(currentRunner, world_def);

    // refocus camera to leader on death
    if (camera.target == carInfo) {
      cw_setCameraTarget(-1);
    }
    // console.log(score);
    carMap.delete(carInfo);
    ghost_compare_to_replay(car.replay, ghost, score.v);
    score.i = generationState.counter;

    cw_deadCars++;
    var generationSize = generationConfig.constants.generationSize;
    document.getElementById("population").innerHTML = (generationSize - cw_deadCars).toString();

    // console.log(leaderPosition.leader, k)
    if (leaderPosition.leader == k) {
      // leader is dead, find new leader
      cw_findLeader();
    }
  },
  generationEnd(results){
    cleanupRound(results);
    return cw_newRound(results);
  }
}

function simulationStep() {  
  currentRunner.step();
  showDistance(
    Math.round(leaderPosition.x * 100) / 100,
    Math.round(leaderPosition.y * 100) / 100
  );
}

function gameLoop() {
  /*loops = 0;
  while (!cw_paused && (new Date).getTime() > nextGameTick && loops < maxFrameSkip) {   
    nextGameTick += skipTicks;
    loops++;
  }
  simulationStep();
  cw_drawScreen();
	*/
	fastForward();//used for testing data
  if(!cw_paused) window.requestAnimationFrame(gameLoop);
}

function updateCarUI(carInfo){
  var k = carInfo.index;
  var car = carMap.get(carInfo);
  var position = car.getPosition();

  ghost_add_replay_frame(car.replay, car.car.car);
  car.minimapmarker.style.left = Math.round((position.x + 5) * minimapscale) + "px";
  car.healthBar.width = Math.round((car.car.state.health / max_car_health) * 100) + "%";
  if (position.x > leaderPosition.x) {
    leaderPosition = position;
    leaderPosition.leader = k;
    // console.log("new leader: ", k);
  }
}

function cw_findLeader() {
  var lead = 0;
  var cw_carArray = Array.from(carMap.values());
  for (var k = 0; k < cw_carArray.length; k++) {
    if (!cw_carArray[k].alive) {
      continue;
    }
    var position = cw_carArray[k].getPosition();
    if (position.x > lead) {
      leaderPosition = position;
      leaderPosition.leader = k;
    }
  }
}

function fastForward(){
  var gen = generationState.counter;
  while(gen === generationState.counter){
    currentRunner.step();
  }
}

function cleanupRound(results){

  results.sort(function (a, b) {
    if (a.score.v > b.score.v) {
      return -1
    } else {
      return 1
    }
  })
  graphState = plot_graphs(
    document.getElementById("graphcanvas"),
    document.getElementById("topscores"),
    null,
    graphState,
    results
  );
}

function cw_newRound(results) {
  camera.pos.x = camera.pos.y = 0;
  cw_setCameraTarget(-1);
  generationState =manageRound.nextGeneration(
    generationState, results, generationConfig());
	
	if(generationState.counter===0){
		var rounds = localStorage.getItem("round");
		var newRounds = generationState.round+rounds;
		localStorage.setItem("EA"+newRounds, JSON.stringify(graphState.cw_graphAverage));
		localStorage.setItem("round", newRounds);
		//graphState.cw_graphAverage = new Array();
		//resetGraphState();
		location.reload();
	}
	
	
  if (world_def.mutable_floor) {
    // GHOST DISABLED
    ghost = null;
    world_def.floorseed = btoa(Math.seedrandom());
  } else {
    // RE-ENABLE GHOST
    ghost_reset_ghost(ghost);
  }
  currentRunner = worldRun(world_def, generationState.generation, uiListeners);
  setupCarUI();
  cw_drawMiniMap();
  resetCarUI();
}

function cw_startSimulation() {
  cw_paused = false;
  window.requestAnimationFrame(gameLoop);
}

function cw_stopSimulation() {
  cw_paused = true;
}

function cw_clearPopulationWorld() {
  carMap.forEach(function(car){
    car.kill(currentRunner, world_def);
  });
}

function cw_resetPopulationUI() {
  document.getElementById("generation").innerHTML = "";
  document.getElementById("cars").innerHTML = "";
  document.getElementById("topscores").innerHTML = "";
  cw_clearGraphics(document.getElementById("graphcanvas"));
  resetGraphState();
}

function cw_resetWorld() {
  doDraw = true;
  cw_stopSimulation();
  world_def.floorseed = document.getElementById("newseed").value;
  cw_clearPopulationWorld();
  cw_resetPopulationUI();

  Math.seedrandom();
  cw_generationZero();
  currentRunner = worldRun(
    world_def, generationState.generation, uiListeners
  );

  ghost = ghost_create_ghost();
  resetCarUI();
  setupCarUI()
  cw_drawMiniMap();

  cw_startSimulation();
}

function setupCarUI(){
  currentRunner.cars.map(function(carInfo){
    var car = new cw_Car(carInfo, carMap);
    carMap.set(carInfo, car);
    car.replay = ghost_create_replay();
    ghost_add_replay_frame(car.replay, car.car.car);
  })
}


document.querySelector("#fast-forward").addEventListener("click", function(){
  fastForward()
});

document.querySelector("#save-progress").addEventListener("click", function(){
  saveProgress()
});

document.querySelector("#restore-progress").addEventListener("click", function(){
  restoreProgress()
});

document.querySelector("#toggle-display").addEventListener("click", function(){
  toggleDisplay()
})

document.querySelector("#new-population").addEventListener("click", function(){
  cw_resetPopulationUI()
  cw_generationZero();
  ghost = ghost_create_ghost();
  resetCarUI();
})

function saveProgress() {
  localStorage.cw_savedGeneration = JSON.stringify(generationState.generation);
  localStorage.cw_genCounter = generationState.counter;
  localStorage.cw_ghost = JSON.stringify(ghost);
  localStorage.cw_topScores = JSON.stringify(graphState.cw_topScores);
  localStorage.cw_floorSeed = world_def.floorseed;
}

function restoreProgress() {
  if (typeof localStorage.cw_savedGeneration == 'undefined' || localStorage.cw_savedGeneration == null) {
    alert("No saved progress found");
    return;
  }
  cw_stopSimulation();
  generationState.generation = JSON.parse(localStorage.cw_savedGeneration);
  generationState.counter = localStorage.cw_genCounter;
  ghost = JSON.parse(localStorage.cw_ghost);
  graphState.cw_topScores = JSON.parse(localStorage.cw_topScores);
  world_def.floorseed = localStorage.cw_floorSeed;
  document.getElementById("newseed").value = world_def.floorseed;

  currentRunner = worldRun(world_def, generationState.generation, uiListeners);
  cw_drawMiniMap();
  Math.seedrandom();

  resetCarUI();
  cw_startSimulation();
}

document.querySelector("#confirm-reset").addEventListener("click", function(){
  cw_confirmResetWorld()
})

function cw_confirmResetWorld() {
  if (confirm('Really reset world?')) {
    cw_resetWorld();
  } else {
    return false;
  }
}

// ghost replay stuff


function cw_pauseSimulation() {
  cw_paused = true;
  ghost_pause(ghost);
}

function cw_resumeSimulation() {
  cw_paused = false;
  ghost_resume(ghost);
  window.requestAnimationFrame(gameLoop);
}

function cw_startGhostReplay() {
  if (!doDraw) {
    toggleDisplay();
  }
  cw_pauseSimulation();
  cw_ghostReplayInterval = setInterval(cw_drawGhostReplay, Math.round(1000 / screenfps));
}

function cw_stopGhostReplay() {
  clearInterval(cw_ghostReplayInterval);
  cw_ghostReplayInterval = null;
  cw_findLeader();
  camera.pos.x = leaderPosition.x;
  camera.pos.y = leaderPosition.y;
  cw_resumeSimulation();
}

document.querySelector("#toggle-ghost").addEventListener("click", function(e){
  cw_toggleGhostReplay(e.target)
})

function cw_toggleGhostReplay(button) {
  if (cw_ghostReplayInterval == null) {
    cw_startGhostReplay();
    button.value = "Resume simulation";
  } else {
    cw_stopGhostReplay();
    button.value = "View top replay";
  }
}
// ghost replay stuff END

// initial stuff, only called once (hopefully)
function cw_init() {
  // clone silver dot and health bar
  var mmm = document.getElementsByName('minimapmarker')[0];
  var hbar = document.getElementsByName('healthbar')[0];
  var generationSize = generationConfig.constants.generationSize;

  for (var k = 0; k < generationSize; k++) {

    // minimap markers
    var newbar = mmm.cloneNode(true);
    newbar.id = "bar" + k;
    newbar.style.paddingTop = k * 9 + "px";
    minimapholder.appendChild(newbar);

    // health bars
    var newhealth = hbar.cloneNode(true);
    newhealth.getElementsByTagName("DIV")[0].id = "health" + k;
    newhealth.car_index = k;
    document.getElementById("health").appendChild(newhealth);
  }
  mmm.parentNode.removeChild(mmm);
  hbar.parentNode.removeChild(hbar);
  world_def.floorseed = btoa(Math.seedrandom());
  cw_generationZero();
  ghost = ghost_create_ghost();
  resetCarUI();
  currentRunner = worldRun(world_def, generationState.generation, uiListeners);
  setupCarUI();
  cw_drawMiniMap();
  window.requestAnimationFrame(gameLoop);
  
}

function relMouseCoords(event) {
  var totalOffsetX = 0;
  var totalOffsetY = 0;
  var canvasX = 0;
  var canvasY = 0;
  var currentElement = this;

  do {
    totalOffsetX += currentElement.offsetLeft - currentElement.scrollLeft;
    totalOffsetY += currentElement.offsetTop - currentElement.scrollTop;
    currentElement = currentElement.offsetParent
  }
  while (currentElement);

  canvasX = event.pageX - totalOffsetX;
  canvasY = event.pageY - totalOffsetY;

  return {x: canvasX, y: canvasY}
}
HTMLDivElement.prototype.relMouseCoords = relMouseCoords;
minimapholder.onclick = function (event) {
  var coords = minimapholder.relMouseCoords(event);
  var cw_carArray = Array.from(carMap.values());
  var closest = {
    value: cw_carArray[0].car,
    dist: Math.abs(((cw_carArray[0].getPosition().x + 6) * minimapscale) - coords.x),
    x: cw_carArray[0].getPosition().x
  }

  var maxX = 0;
  for (var i = 0; i < cw_carArray.length; i++) {
    var pos = cw_carArray[i].getPosition();
    var dist = Math.abs(((pos.x + 6) * minimapscale) - coords.x);
    if (dist < closest.dist) {
      closest.value = cw_carArray.car;
      closest.dist = dist;
      closest.x = pos.x;
    }
    maxX = Math.max(pos.x, maxX);
  }

  if (closest.x == maxX) { // focus on leader again
    cw_setCameraTarget(-1);
  } else {
    cw_setCameraTarget(closest.value);
  }
}


document.querySelector("#mutationrate").addEventListener("change", function(e){
  var elem = e.target
  cw_setMutation(elem.options[elem.selectedIndex].value)
})

document.querySelector("#mutationsize").addEventListener("change", function(e){
  var elem = e.target
  cw_setMutationRange(elem.options[elem.selectedIndex].value)
})

document.querySelector("#floor").addEventListener("change", function(e){
  var elem = e.target
  cw_setMutableFloor(elem.options[elem.selectedIndex].value)
});

document.querySelector("#gravity").addEventListener("change", function(e){
  var elem = e.target
  cw_setGravity(elem.options[elem.selectedIndex].value)
})

document.querySelector("#elitesize").addEventListener("change", function(e){
  var elem = e.target
  cw_setEliteSize(elem.options[elem.selectedIndex].value)
})

function cw_setMutation(mutation) {
  generationConfig.constants.gen_mutation = parseFloat(mutation);
}

function cw_setMutationRange(range) {
  generationConfig.constants.mutation_range = parseFloat(range);
}

function cw_setMutableFloor(choice) {
  world_def.mutable_floor = (choice == 1);
}

function cw_setGravity(choice) {
  world_def.gravity = new b2Vec2(0.0, -parseFloat(choice));
  var world = currentRunner.scene.world
  // CHECK GRAVITY CHANGES
  if (world.GetGravity().y != world_def.gravity.y) {
    world.SetGravity(world_def.gravity);
  }
}

function cw_setEliteSize(clones) {
  generationConfig.constants.championLength = parseInt(clones, 10);
}

cw_init();

},{"./car-schema/construct.js":3,"./draw/draw-car-stats.js":6,"./draw/draw-car.js":7,"./draw/draw-floor.js":9,"./draw/plot-graphs.js":11,"./generation-config":15,"./ghost/index.js":19,"./machine-learning/genetic-algorithm/manage-round.js":26,"./world/run.js":31}],21:[function(require,module,exports){
var random = require("./random.js");

module.exports = {
  createGenerationZero(schema, generator){
    return Object.keys(schema).reduce(function(instance, key){
      var schemaProp = schema[key];
      var values = random.createNormals(schemaProp, generator);
      instance[key] = values;
      return instance;
    }, { id: Math.random().toString(32) });
  },
  createCrossBreed(schema, parents, parentChooser){
    var id = Math.random().toString(32);
    return Object.keys(schema).reduce(function(crossDef, key){
      var schemaDef = schema[key];
      var values = [];
      for(var i = 0, l = schemaDef.length; i < l; i++){
        var p = parentChooser(id, key, parents);
        values.push(parents[p][key][i]);
      }
      crossDef[key] = values;
      return crossDef;
    }, {
      id: id,
      ancestry: parents.map(function(parent){
        return {
          id: parent.id,
          ancestry: parent.ancestry,
        };
      })
    });
  },
  createMutatedClone(schema, generator, parent, factor, chanceToMutate){
    return Object.keys(schema).reduce(function(clone, key){
      var schemaProp = schema[key];
      var originalValues = parent[key];
      var values = random.mutateNormals(
        schemaProp, generator, originalValues, factor, chanceToMutate
      );
      clone[key] = values;
      return clone;
    }, {
      id: parent.id,
      ancestry: parent.ancestry
    });
  },
  applyTypes(schema, parent){
    return Object.keys(schema).reduce(function(clone, key){
      var schemaProp = schema[key];
      var originalValues = parent[key];
      var values;
      switch(schemaProp.type){
        case "shuffle" :
          values = random.mapToShuffle(schemaProp, originalValues); break;
        case "float" :
          values = random.mapToFloat(schemaProp, originalValues); break;
        case "integer":
          values = random.mapToInteger(schemaProp, originalValues); break;
        default:
          throw new Error(`Unknown type ${schemaProp.type} of schema for key ${key}`);
      }
      clone[key] = values;
      return clone;
    }, {
      id: parent.id,
      ancestry: parent.ancestry
    });
  },
}

},{"./random.js":30}],22:[function(require,module,exports){
module.exports = {
	createDataPointCluster: createDataPointCluster,
	createDataPoint: createDataPoint,
	createClusterInterface: createClusterInterface,
	findDataPointCluster: findDataPointCluster,
	findDataPoint: findDataPoint,
	sortCluster: sortCluster,
	findOjectNeighbors: findOjectNeighbors,
	scoreObject: scoreObject,
	createSubDataPointCluster:createSubDataPointCluster
	
}

function createDataPointCluster(carDataPointType){
	var cluster = {
		id: carDataPointType,
		dataArray: new Array()
	};
	return cluster;
}

function createSubDataPointCluster(carDataPointType){
	var cluster = {
		id: carDataPointType,
		dataArray: new Array()
	};
	return cluster;
}

function createDataPoint(dataId, dataPointType, d, s){
	var dataPoint = {
		id: dataId,
		type: dataPointType,
		data: d,
		score: s
	};
	return dataPoint;
}

function createClusterInterface(id){
	var cluster = {
		carsArray: new Array(),
		clusterID: id,
		arrayOfClusters: new Array()
	};
	return cluster;
}

function sortCluster(cluster){
	cluster.sort(function(a, b){return a.data - b.data});
}

function findOjectNeighbors(dataId, cluster, range) {
	var neighbors = new Array();
	var index = cluster.findIndex(x=> x.id===dataId);
	var gonePastId = false;
	var clusterLength = cluster.length;
	for(var i=0;i<range;i++){
		if((index-range)<0){
			if(cluster[i].id===dataId){gonePastId=true;}
			neighbors.push((gonePastId===false)?cluster[i]:cluster[i+1]);
		}
		else if((index+range)>clusterLength){
			if(cluster[(clusterLength-1)-i].id===dataId){gonePastId=true;}
			neighbors.push((gonePastId===false)?cluster[(clusterLength-1)-i]:cluster[(clusterLength-1)-(i+1)]);
		}
		else {
			if(cluster[index-(range/2)+i].id===dataId){gonePastId=true;}
			neighbors.push((gonePastId===false)?cluster[index-(range/2)+i]:cluster[(index+1)-(range/2)+i]);
		}
		
	}
	return neighbors;
}

function findDataPointCluster(dataId, cluster){
	return cluster.arrayOfClusters.find(x=> x.id===dataId);
}

function findDataPoint(dataId, cluster){
	return cluster.dataArray.find(function(value){
		return value.id===id;
	});
}

function scoreObject(id, cluster){
	var neighbors = findOjectNeighbors(id, cluster, ((cluster.length/4)<40)?6:40);
	var newScore = 0;
	for(var i=0;i<neighbors.length;i++){
		newScore+=neighbors[i].score;
	}
	return newScore/neighbors.length;
}
},{}],23:[function(require,module,exports){
var cluster = require("./cluster.js/");
//var carObjects = require("./car-objects.json");

module.exports = {
	setup: setup,
	reScoreCars: reScoreCars
}

//"wheel_radius", "chassis_density", "vertex_list", "wheel_vertex" and "wheel_density"/
function setup(cars, extCluster, clusterPrecreated){
	var clust = (clusterPrecreated===false)?setupDataClusters(cluster.createClusterInterface("newCluster")): extCluster;
	for(var i =0;i<cars.length;i++){
		if(cars[i].def.elite===false){
			addCarsToCluster(cars[i], clust);
			clust.carsArray.push(cars[i]);
		}
	}
	console.log(clust);//test
	return clust;
}

function setupDataClusters(mainCluster){
	mainCluster.arrayOfClusters.push(cluster.createDataPointCluster("wheel_radius"));
	mainCluster.arrayOfClusters.push(cluster.createDataPointCluster("chassis_density"));
	mainCluster.arrayOfClusters.push(cluster.createDataPointCluster("wheel_vertex"));
	mainCluster.arrayOfClusters.push(cluster.createDataPointCluster("vertex_list"));
	mainCluster.arrayOfClusters.push(cluster.createDataPointCluster("wheel_density"));
	return mainCluster;
}

function addCarsToCluster(car, clust){
	addDataToCluster(car.def.id, car.def.wheel_radius,car.score.s, cluster.findDataPointCluster("wheel_radius", clust));
    addDataToCluster(car.def.id, car.def.chassis_density,car.score.s, cluster.findDataPointCluster("chassis_density", clust));
	addDataToCluster(car.def.id, car.def.vertex_list,car.score.s, cluster.findDataPointCluster("vertex_list", clust));
	addDataToCluster(car.def.id, car.def.wheel_vertex,car.score.s, cluster.findDataPointCluster("wheel_vertex", clust));
	addDataToCluster(car.def.id, car.def.wheel_density,car.score.s, cluster.findDataPointCluster("wheel_density", clust));
}

function addDataToCluster(id, carData, score, clust){
	if(clust.dataArray.length===carData.length){
		for(var x=0;x<carData.length;x++){
			clust.dataArray[x].dataArray.push(cluster.createDataPoint(id, "", carData[x], score));
			cluster.sortCluster(clust.dataArray[x].dataArray);
		}
	}
	else {
		for(var i=0;i<carData.length;i++){
			var newClust = cluster.createSubDataPointCluster("");
			newClust.dataArray.push(cluster.createDataPoint(id, "", carData[i], score));
			clust.dataArray.push(newClust);
		}
	}
}

function reScoreCars(cars, clust){
	for(var i=0;i<cars.length;i++){
		var score = 0;
		for(var x=0;x<clust.arrayOfClusters.length;x++){
			for(var y=0;y<clust.arrayOfClusters[x].dataArray.length;y++){
				score += cluster.scoreObject(cars[i].def.id, clust.arrayOfClusters[x].dataArray[y].dataArray);
			}
		}
		cars[i].score.s += score/clust.arrayOfClusters.length;
	}
}


},{"./cluster.js/":22}],24:[function(require,module,exports){
/*var randomInt = require("./randomInt.js/");
var getRandomInt = randomInt.getRandomInt;*/

module.exports = {
	runCrossover: runCrossover
}

/*This function creates the acual new car and returned. The function runs a one-point crossover taking data from the parents passed through and adding them to the new car.
@param parents ObjectArray - Data is taken from these cars and added to the new car using crossover.
@param schema - The data objects that car objects have such as "wheel_radius", "chassis_density", "vertex_list", "wheel_vertex" and "wheel_density"
@param noCrossoverPoint int - The first crossover point randomly generated
@param noCrossoverPointTwo int - The second crossover point randomly generated 
@param carNo int - whether this car is the first or second child for the parent cars
@param parentScore int - The average score of the two parents
@param noCarsCreated int - The number of cars created so far, used for the new cars id
@param crossoverType int - The type of crossover to use such as 1 for One point crossover any other Two point crossover
@return car Object - A car object is created and returned*/
function combineData(parents, schema, noCrossoverPoint, noCrossoverPointTwo, carNo, parentScore,noCarsCreated, crossoverType){
	var id = noCarsCreated+carNo;
	var keyIteration = 0;
	return Object.keys(schema).reduce(function(crossDef, key){
      var schemaDef = schema[key];
      var values = [];
      for(var i = 0, l = schemaDef.length; i < l; i++){
        var p = crossover(carNo, noCrossoverPoint, noCrossoverPointTwo, keyIteration, crossoverType);
        values.push(parents[p][key][i]);
      }
      crossDef[key] = values;
	  keyIteration++;
      return crossDef;
    } , {
		id: id,
		parentsScore: parentScore
	});
}

/*This function chooses which car the data is taken from based on the parameters given to the function
@param carNo int - This is the number of the car being created between 1-2, filters cars data is being taken
@param noCrossoverPoint int - The first crossover point where data before or after the point is taken
@param noCrossoverPointTwo int - The second crossover point where data is before or after the point is taken
@param keyIteration int - This is the point at which the crossover is currently at which help specifies which cars data is relavent to take comparing this point to the one/two crossove points
@param crossoveType int - This specifies if one point(1) or two point crossover(any int) is used
@return int - Which parent data should be taken from is returned either 0 or 1*/
function crossover(carNo, noCrossoverPoint, noCrossoverPointTwo,keyIteration,crossoverType){
	if(crossoverType===1){ //run one-point crossover
		return (carNo===1)?(keyIteration>=noCrossoverPoint)?0:1:(keyIteration>=noCrossoverPoint)?1:0;// handles the fixed one-point switch over
	}
	else { //run two-point crossover
		if(carNo===1){
			if(((keyIteration>noCrossoverPoint)&&(keyIteration<noCrossoverPointTwo))||((keyIteration>noCrossoverPointTwo)&&(keyIteration<noCrossoverPoint))){
				return 0;
			}
			else { return 1;}
		}
		else{
			if(((keyIteration>noCrossoverPoint)&&(keyIteration<noCrossoverPointTwo))||((keyIteration>noCrossoverPointTwo)&&(keyIteration<noCrossoverPoint))){
				return 1;
			}
			else { return 0;}
		}
	}
}

/*This function randomly generates two crossover points and passes them to the crossover function
@param parents ObjectArray - An array of the parents objects
@param crossoverTpye int - Specified which crossover should be used
@param schema - Car object data template used for car creation
@param parentScore int - Average number of the parents score
@param noCarsCreated int - number of cars created for the simulation
@param noCarsToCreate int - the number of new cars that should be created via crossover
@return car ObjectArray - An array of newly created cars from the crossover are returned*/
function runCrossover(parents,crossoverType,schema, parentsScore,noCarsCreated, noCarsToCreate){
	var newCars = new Array();
	var crossoverPointOne=getRandomInt(0,4, new Array());
	var crossoverPointTwo=getRandomInt(0,4, [crossoverPointOne]);
	for(var i=0;i<noCarsToCreate;i++){
		newCars.push(combineData(parents,schema, crossoverPointOne, crossoverPointTwo, i, parentsScore,noCarsCreated,crossoverType));
	}
	return newCars;
}

/*This function returns whole ints between a minimum and maximum
@param min int - The minimum int that can be returned
@param max int - The maximum int that can be returned
@param notEqualsArr intArray - An array of the ints that the function should not return
@return int - The int within the specified parameter bounds is returned.*/
function getRandomInt(min, max, notEqualsArr) {
	var toReturn;
	var runLoop = true;
	while(runLoop===true){
		min = Math.ceil(min);
		max = Math.floor(max);
		toReturn = Math.floor(Math.random() * (max - min + 1)) + min;
		if(typeof findIfExists === "undefined"){
			runLoop=false;
		}
		else if(notEqualsArr.find(function(value){return value===toReturn;})===false){
			runLoop=false;
		}
	}
    return toReturn;//(typeof findIfExists === "undefined")?toReturn:getRandomInt(min, max, notEqualsArr);
}

},{}],25:[function(require,module,exports){
module.exports={"name":"objects","array":[{"id":"0.hdf5qn7vrm","wheel_radius":[0.5767690824721248,0.4177286154476836],"wheel_density":[0.05805828499322763,0.5558485029218216],"chassis_density":[0.01746922482830615],"vertex_list":[0.7941546027531794,0.33861058313418346,0.9817966727350886,0.04058391899039471,0.6792764840084577,0.7095516833429869,0.4442929689786037,0.37159709633978144,0.48655491389807315,0.8194897434679949,0.06791292762922252,0.8500617187981201],"wheel_vertex":[0.3197454833804805,0.07306832553443532,0.9696680221321918,0.2824291446288685,0.2380108435356263,0.03420163652850006,0.3930204478494015,0.9292589026168605],"index":0},{"id":"0.ddvqo9c4u5","wheel_radius":[0.07627311653690305,0.38077565824706383],"wheel_density":[0.01863697881086468,0.026864361789310287],"chassis_density":[0.7045568596969818],"vertex_list":[0.8827836738451413,0.4190617493499984,0.017147626844417063,0.2277553534525203,0.9391852300562391,0.41623535047479976,0.667874296655423,0.3184936092984223,0.885601792263214,0.1346539811623968,0.322385303872488,0.161407472396901],"wheel_vertex":[0.17206625167182543,0.2864306277502062,0.9385138859389617,0.7120516346789703,0.47681841776301215,0.9573420057371615,0.34779657603419056,0.4942428001369501],"index":1},{"id":"0.i58eicuogp","wheel_radius":[0.8797742202793692,0.4946090041701663],"wheel_density":[0.6907715700239563,0.35432984993561556],"chassis_density":[0.9971097639358597],"vertex_list":[0.3355939766795686,0.3677035616120996,0.25221017408131474,0.604213571816435,0.1430303697651747,0.6707414538501344,0.7976410790585797,0.0033040193157582998,0.48225864500530036,0.9722463490739863,0.13326685190618814,0.24511863681863266],"wheel_vertex":[0.9134632576763355,0.8028557179231353,0.06520887602002645,0.5008784841753418,0.29660822964929734,0.8268847970499333,0.7035107726768779,0.020149156720311145],"index":2},{"id":"0.gutj76a88f","wheel_radius":[0.9293229179821985,0.14096018806429722],"wheel_density":[0.9610668741784452,0.12918935045544622],"chassis_density":[0.4412938612774773],"vertex_list":[0.509666285390127,0.0440424703718838,0.32355514615481096,0.5028560491467837,0.8855525611846886,0.6634747633908817,0.053720135479725206,0.03939919113473578,0.8659130479988033,0.5292610191155793,0.25844974411733945,0.15674953593305863],"wheel_vertex":[0.10922529798546754,0.8697670750461268,0.8308079459877313,0.6383102766197528,0.7099969858096296,0.5389509745111423,0.8978376331961129,0.6420664501085884],"index":3},{"id":"0.s0qb8gd1uk8","wheel_radius":[0.7219865941050003,0.8749228764898627],"wheel_density":[0.8888827319734467,0.3633780972284817],"chassis_density":[0.7811514341788972],"vertex_list":[0.0710298251902226,0.04777839921760796,0.13258883889938056,0.9766647673306856,0.5400399336725707,0.009490303271581846,0.6105618345293602,0.30769684064628944,0.9536822130361375,0.6608960981573873,0.38788766841235356,0.14698211273515116],"wheel_vertex":[0.45796055398119706,0.5082384005387914,0.6910070637339527,0.49491480576195057,0.017564983056669536,0.9004187121939236,0.950888149443778,0.3145771879983139],"index":4},{"id":"0.am50skfifv8","wheel_radius":[0.4371782151705017,0.16934407528669593],"wheel_density":[0.5155615530382445,0.3746398626558487],"chassis_density":[0.9777831010398579],"vertex_list":[0.4218254332918403,0.13402991979798595,0.5679523833804261,0.9986360454712131,0.1370226529049714,0.6866226723994309,0.21085066722858148,0.11201281036347854,0.6458868083896243,0.7686349179192595,0.5631279410833077,0.8929527870277394],"wheel_vertex":[0.3201300463393102,0.7881304785297669,0.1994622663870953,0.5361312470790522,0.9372844704327077,0.6029566109207931,0.6654959920391821,0.2544075607920917],"index":5},{"id":"0.mjcg9femang","wheel_radius":[0.6075286178996335,0.02893235087829993],"wheel_density":[0.6881171089205549,0.36813690305177627],"chassis_density":[0.9194743667947931],"vertex_list":[0.9045666908132881,0.03170144930478025,0.3338413002137406,0.7848170385408266,0.8832407772242816,0.8265334718769144,0.9629695531244229,0.2736041402092191,0.8088087449763801,0.41076107312794563,0.8217996633679705,0.1483702365231736],"wheel_vertex":[0.11480781743513102,0.1697368994977173,0.22986415922054526,0.9511536546375357,0.780923129239145,0.7910268389663828,0.3456103464776277,0.9613859776527907],"index":6},{"id":"0.idfjve6f8t8","wheel_radius":[0.5411559581495173,0.44125053048089047],"wheel_density":[0.25909875492826284,0.47021399069456327],"chassis_density":[0.3613728202285016],"vertex_list":[0.41021391544269314,0.9881932969769589,0.49847114859554886,0.37319768768805983,0.005002513477929904,0.48993994550737674,0.9672756824011681,0.6109271173927,0.6698014751238872,0.9973690280950067,0.19443632869446215,0.047658470550454135],"wheel_vertex":[0.2864270744805486,0.19040083806112862,0.7719547618207676,0.3130688023992423,0.5529916364259202,0.9133434808376619,0.4711529062266886,0.8871360248210398],"index":7},{"id":"0.9kev7eefp3","wheel_radius":[0.29831527304858163,0.7544895716087605],"wheel_density":[0.1981877988356684,0.7017407123227355],"chassis_density":[0.12698002119723606],"vertex_list":[0.9189283243644228,0.6711416378673025,0.5079419289799354,0.6181036484244244,0.9479695662239411,0.26973353938956346,0.775651358892298,0.8756169233293907,0.05772602678811567,0.2554950773692868,0.7398641638106203,0.7116867640037474],"wheel_vertex":[0.13211088239213153,0.027042464603376004,0.0027046022484826793,0.9188908412047128,0.12734937330346696,0.6312409139785786,0.5458361143483772,0.4202780123037708],"index":8},{"id":"0.94ov1ivvd1g","wheel_radius":[0.4217454865568546,0.1493046286773776],"wheel_density":[0.15780014539785747,0.6349387909103907],"chassis_density":[0.2611015082022081],"vertex_list":[0.1614056198115068,0.7073385308831481,0.8865775204059925,0.3859295957226818,0.006323741490722901,0.5600717160338222,0.7150828584344404,0.46454515534837526,0.08787116907156722,0.7482726424381383,0.6007334079191868,0.3127118710322887],"wheel_vertex":[0.2436228357811132,0.8770990367388483,0.5563324518538395,0.215800578569187,0.7947741936679531,0.7453147294742604,0.7326655050104951,0.8125433747073709],"index":9},{"id":"0.euv3chfcog","wheel_radius":[0.506180192590908,0.4074301248023271],"wheel_density":[0.22819387088526755,0.20388407997970082],"chassis_density":[0.9868098499829738],"vertex_list":[0.8901104916221794,0.0382460536238427,0.01247621775189045,0.3198239375390004,0.24614261702584117,0.661214205610895,0.20887861407179376,0.30724427235234875,0.6906477993219471,0.13420328261045245,0.5562057663925064,0.5636912336060713],"wheel_vertex":[0.27292940315827985,0.8116694811049994,0.34305427081267625,0.737790370926398,0.7144049632051976,0.4136553492822954,0.9065788650669486,0.2673436684220467],"index":10},{"id":"0.3t73r089878","wheel_radius":[0.33434778236081897,0.3311075004472892],"wheel_density":[0.14826510887752065,0.748740057701869],"chassis_density":[0.09686964778059548],"vertex_list":[0.173451890973358,0.954957853504486,0.12969012388639367,0.8093440049579759,0.20662170223633236,0.5957475494308369,0.12093093644627673,0.23827678515406414,0.8782369771550591,0.18793972440902174,0.5340249844612774,0.6746936255896423],"wheel_vertex":[0.7737452828565528,0.2179732704223123,0.6433926126933227,0.05597399128863212,0.8364909201028081,0.5594266368540888,0.48026892671736365,0.13286338544745901],"index":11},{"id":"0.otp4mhgfflg","wheel_radius":[0.3096723890899076,0.3270905845862535],"wheel_density":[0.9519797779470658,0.4824659127948694],"chassis_density":[0.508849513971634],"vertex_list":[0.05385076804821032,0.4724615769754572,0.4759187607571993,0.8404392103904694,0.6068039184056986,0.24506037957624516,0.7890583591097218,0.4280727348285014,0.914308399814743,0.016679245786350494,0.023597365922794156,0.5472150478296525],"wheel_vertex":[0.9681325471086923,0.8440592804832436,0.5633043887572953,0.38659997190573114,0.9457256976802073,0.15689595746838436,0.5459903281063443,0.6834766601643341],"index":12},{"id":"0.m72cm8glci","wheel_radius":[0.4921190205702557,0.9730123122187448],"wheel_density":[0.6138731107622271,0.80188826074077],"chassis_density":[0.27336366221265496],"vertex_list":[0.48673379371347725,0.5616639421186809,0.6652628675453733,0.521127869483095,0.8826236680283714,0.7724370159671963,0.5328543643014874,0.48289945395031975,0.7011128939985845,0.9407919374959133,0.5196758016268144,0.26214607732622563],"wheel_vertex":[0.026968037135228773,0.8078115090468778,0.11567871694998044,0.2887653152210481,0.10871636169735654,0.29005831038415697,0.9705208285856395,0.8521699632762305],"index":13},{"id":"0.9hjuq0vark8","wheel_radius":[0.7377742272424606,0.27766419711539014],"wheel_density":[0.12067982288380974,0.5508429477497803],"chassis_density":[0.4742777307191277],"vertex_list":[0.475325738509615,0.653462696268186,0.23624452185059952,0.8624773295336279,0.3843663053567725,0.29624163876361664,0.8555864028060363,0.6153797712621405,0.022909313308777657,0.7078073819405373,0.2995603233023847,0.9591599855399191],"wheel_vertex":[0.915914626913259,0.6956844692079878,0.33284691963176405,0.7919985193630892,0.8846996483826077,0.7862606433515567,0.6523325763895098,0.8016109420768407],"index":14},{"id":"0.pk4uqro41u","wheel_radius":[0.8658881007803165,0.3357331986398473],"wheel_density":[0.5692064557307324,0.2791454871011563],"chassis_density":[0.3120375400367086],"vertex_list":[0.9189554009992524,0.3542579100478469,0.14964826963447164,0.9548992038109447,0.5136981847958031,0.5425422233324078,0.5382322667339448,0.6867404819061971,0.2403071409704176,0.5960192026151729,0.1981391854660728,0.0652119555215982],"wheel_vertex":[0.9382147287284206,0.6389032897639346,0.5745068606896859,0.3298007956203739,0.3748010225243654,0.1555312745759434,0.3488865368809815,0.2288608901580047],"index":15},{"id":"0.92pmqftm078","wheel_radius":[0.20940186357804302,0.9601831855684502],"wheel_density":[0.6074865062552535,0.487214084857744],"chassis_density":[0.8879779581417373],"vertex_list":[0.37229358911709576,0.3250638149302463,0.02399624334167294,0.5076844925929369,0.9361788706360077,0.5599877675198013,0.6178761701945197,0.19199515412459323,0.436893994490962,0.3409731423377498,0.4982559500560275,0.3018054779863344],"wheel_vertex":[0.4805567992416928,0.529172971508425,0.4576824490185867,0.28815816259966853,0.41307038021277576,0.8496303102150315,0.44262409410280923,0.118990835397361],"index":16},{"id":"0.p0bb3jcsa6o","wheel_radius":[0.8053770409363876,0.004608511505876489],"wheel_density":[0.37032936585319853,0.9110718290739903],"chassis_density":[0.41268931366555517],"vertex_list":[0.37505529616887445,0.3269894555788473,0.7824287339617897,0.08916755260272602,0.11846368789958772,0.6182305402069848,0.6883467480158929,0.38177905214995667,0.7208181609591433,0.7182811672980731,0.5053403982433966,0.6785485903889392],"wheel_vertex":[0.8602516434667127,0.9182412895648713,0.4943321446494058,0.4066814424053633,0.9450033934436965,0.04147678416903,0.9074303141025282,0.7920805318139295],"index":17},{"id":"0.g6nue40o6u","wheel_radius":[0.25950365179089285,0.45117196696361517],"wheel_density":[0.8737773207491646,0.3825049459175984],"chassis_density":[0.5750636056432643],"vertex_list":[0.16155077272274365,0.17401914773170235,0.4287580781076481,0.42932923860305827,0.47608143506731326,0.016141666182198033,0.7490069599283697,0.8779156633754976,0.6080928470185578,0.4845763154960605,0.15989694525876041,0.5492330632971734],"wheel_vertex":[0.4886604267859962,0.9507100553360299,0.8963786004106906,0.13962004268890382,0.017105305761339284,0.1203208130328568,0.9016859645440254,0.31282796595626206],"index":18},{"id":"0.uikpm9rmbb","wheel_radius":[0.0806451504762078,0.08423101469841532],"wheel_density":[0.34463928350406126,0.8694895031478671],"chassis_density":[0.14008481796461525],"vertex_list":[0.6860355827823672,0.9475637834183746,0.5480446481881946,0.2729072912678334,0.9158071629011582,0.5403677312919277,0.7110438375848036,0.34666135351410454,0.7835892647613154,0.2691403271699404,0.14436046411629033,0.27168516794708797],"wheel_vertex":[0.8176594755946187,0.6637355241449168,0.8402473944959381,0.6435582131301778,0.917040841042623,0.9824387525583211,0.49791639446670644,0.005377830182361487],"index":19},{"id":"0.phkod4h666o","wheel_radius":[0.3885121547052115,0.9408147796867175],"wheel_density":[0.6066760499920387,0.7437853735141478],"chassis_density":[0.047619348463744826],"vertex_list":[0.2818018188994671,0.5376711283235511,0.278265249347057,0.37180380749404063,0.0016354112440770674,0.3734920298406539,0.9258243649433546,0.9611282010648099,0.2635677758443302,0.2995122669698769,0.45009537621663176,0.14120495018961954],"wheel_vertex":[0.8211527025300243,0.6378520646150085,0.8433691242450887,0.10080112530514906,0.7420571718643294,0.06240659449537578,0.5019963798229192,0.13958803327033276],"index":20},{"id":"0.cdsb2t0a0gg","wheel_radius":[0.24505842176601966,0.47937570661588036],"wheel_density":[0.7318963359198882,0.20433591906714255],"chassis_density":[0.9440804013808017],"vertex_list":[0.2767177185735572,0.40191206919739253,0.6992520631753649,0.5805367054765673,0.5328760694595893,0.6051655266396856,0.8659374923698233,0.6385740518164591,0.09136175672495295,0.1946267162607933,0.5848324783419472,0.9612115069889817],"wheel_vertex":[0.9840419708674404,0.4002078328877534,0.6114668493004969,0.0547662826963875,0.7590263236186896,0.9095821718443651,0.8252785001445193,0.9354573503144779],"index":21},{"id":"0.5ec3f7uc86g","wheel_radius":[0.7428794526737739,0.14727079055353554],"wheel_density":[0.21720134324657558,0.5754268794146837],"chassis_density":[0.22476421424897008],"vertex_list":[0.8212963728160105,0.2297331892207486,0.21058817977645528,0.3002863349191449,0.16095424113953083,0.28570979035001876,0.8505053225959205,0.012099775565245663,0.43071909702961464,0.3581820673390337,0.9941396663350952,0.17115204663164763],"wheel_vertex":[0.6349365043647393,0.8564168056559227,0.8347314103983197,0.013561600989115519,0.20473813555899079,0.973788949531528,0.3298955475720191,0.704049870268243],"index":22},{"id":"0.o2m7e3jl5m","wheel_radius":[0.8661369447423091,0.36209186636855173],"wheel_density":[0.24886369948296272,0.9481136708961697],"chassis_density":[0.4645349071428597],"vertex_list":[0.3963158171740233,0.3256278822452916,0.4358865621693082,0.4180065756720124,0.03350757790126613,0.2681067495962719,0.19145799526267337,0.7371111884911565,0.4500408955195885,0.10688261567679347,0.3821541311464922,0.009416750541172192],"wheel_vertex":[0.9575462712867551,0.5695500762355803,0.7981443002154605,0.9474328403749823,0.7027016096400711,0.8286424663713696,0.8310500009461772,0.20389451798323543],"index":23},{"id":"0.vij7h4ll3ig","wheel_radius":[0.1814980076155488,0.26389762050722565],"wheel_density":[0.2829352972703518,0.7426468978176506],"chassis_density":[0.014486662613823365],"vertex_list":[0.05308677758606217,0.3660329920000105,0.9154588111109756,0.6599367403142471,0.006236701000372102,0.9416779757734717,0.8080809278339618,0.4249971585729182,0.43942023623270776,0.4463217820443348,0.740757020638958,0.09154286362854247],"wheel_vertex":[0.1701478887113994,0.23951500026651695,0.8417160753050081,0.44668632197313785,0.7984746620110903,0.24993050509729642,0.5982613413718036,0.024634143380375617],"index":24},{"id":"0.vbudpq7r8jg","wheel_radius":[0.1880833792086538,0.2909417556253724],"wheel_density":[0.3835353607487637,0.12542471127806198],"chassis_density":[0.9914887266787835],"vertex_list":[0.1408202327951953,0.9006563749172454,0.2860131896546747,0.5036058268015096,0.28237175351464594,0.6920935097717549,0.4030021430205859,0.4526349625334938,0.32951066138675067,0.9915639303248924,0.15421491780180507,0.5658120376445028],"wheel_vertex":[0.6207796081251498,0.08457529321879997,0.30959608934504557,0.9289887901506075,0.21134420090001038,0.26615847404781046,0.9679986325992576,0.036393266609056285],"index":25},{"id":"0.4igks77dflg","wheel_radius":[0.6162630688805109,0.996322195724116],"wheel_density":[0.07219389558395028,0.8163090041579422],"chassis_density":[0.6463871724924768],"vertex_list":[0.14686282939592732,0.3538624338089038,0.7352789107172508,0.8336219131334901,0.1345844214947911,0.0695711666235328,0.05891574961142054,0.5915082113269567,0.8106099081756695,0.09587631742587899,0.9775789162130557,0.620011000251137],"wheel_vertex":[0.23869164317299063,0.46960820534342784,0.9809209433980268,0.09408717517598952,0.9596228458615494,0.1493106650385012,0.5424116949883415,0.35068762039149237],"index":26},{"id":"0.i7in710f398","wheel_radius":[0.01074243535706998,0.37496150244395476],"wheel_density":[0.21761163033987585,0.28770690417266986],"chassis_density":[0.7788504774708707],"vertex_list":[0.9065045294527061,0.08320308349875738,0.03460864728278068,0.12885459498203744,0.7036120113589297,0.8301158151858712,0.3957769158442701,0.9897614345181391,0.0808815370561955,0.9435460667351685,0.3070266134901427,0.055233471026243874],"wheel_vertex":[0.22706240786290133,0.45363882858134663,0.4043110543388071,0.0466213326785736,0.17376130548777313,0.6419416055422196,0.45034182053638894,0.06303486495462352],"index":27},{"id":"0.96ivqppegag","wheel_radius":[0.4911179230902005,0.35046444691939094],"wheel_density":[0.33534449672897026,0.9335176580032427],"chassis_density":[0.31957538664110574],"vertex_list":[0.5926254873859351,0.7192087995229846,0.48449163046938826,0.7820757616208582,0.7462054398245774,0.09042624653203046,0.10702581503547992,0.9061878773626963,0.6522294122845294,0.6772711351923497,0.024511693552243807,0.8054593143058355],"wheel_vertex":[0.36029810438333065,0.6065237606237144,0.32602132171242637,0.5940415719076406,0.5821058694804442,0.6474690800650107,0.5906562254817702,0.47754843993265594],"index":28},{"id":"0.ffq8depchpg","wheel_radius":[0.19424114403784554,0.4111615025466757],"wheel_density":[0.7161119526969035,0.9210914218979367],"chassis_density":[0.6726066425877597],"vertex_list":[0.6087251491790631,0.7126922563608298,0.2848133218245028,0.2577778930560264,0.932291750560869,0.26024634386180456,0.9008608369751749,0.8196861793402688,0.049781128250446116,0.49846896499176063,0.42206776267989876,0.132826473899182],"wheel_vertex":[0.5527071271647432,0.6006663093919147,0.8888707647843714,0.24472713041630212,0.9264449367786494,0.008673983220342851,0.6561268639305937,0.800869840601915],"index":29},{"id":"0.31k1bsa29v8","wheel_radius":[0.5216579723226884,0.6938038782520572],"wheel_density":[0.7510504930846378,0.9360211671641339],"chassis_density":[0.9919692547833585],"vertex_list":[0.6202253450662798,0.8408932902288029,0.1467079955608943,0.9850450301241724,0.2334449761912203,0.28979123273254603,0.27093808017567866,0.19070462374783892,0.05336059782942826,0.827607292663183,0.931912342192549,0.43767176285957676],"wheel_vertex":[0.041586694728670714,0.0729827175190807,0.016916154905290748,0.4901454598823205,0.23119893679665826,0.02513006823214936,0.48938909863925995,0.3884350170537745],"index":30},{"id":"0.90kkvb4ucho","wheel_radius":[0.9101037992785472,0.4878592470115912],"wheel_density":[0.3848477970824631,0.45389049697961203],"chassis_density":[0.26080079893693164],"vertex_list":[0.5317932075935214,0.6878189310214191,0.9803101493711177,0.765751655053434,0.4060187183216988,0.11848729489072851,0.5735242259078523,0.9888373140171343,0.6631421747820911,0.5430329863620216,0.45982999435836613,0.8969676517036023],"wheel_vertex":[0.4054572620878496,0.381705658335161,0.6234951462381657,0.6433288559734538,0.857228266497932,0.8995549741199367,0.07651132793231885,0.7711765286985368],"index":31},{"id":"0.ajgtci3scg8","wheel_radius":[0.3351948140617189,0.6299731879087538],"wheel_density":[0.41534186810288554,0.2704413527223042],"chassis_density":[0.7013723526271509],"vertex_list":[0.7415782592669138,0.6352644432918293,0.17366602596210967,0.5072067934274973,0.5915560432013875,0.45493011325168453,0.2649409230524493,0.7562110356524923,0.07853292166813741,0.6154358760762721,0.8188030989851804,0.8748310389153457],"wheel_vertex":[0.10862349731806309,0.5857623668477845,0.47340786079757935,0.26666160156141405,0.7117025932806522,0.5334392851294998,0.9740204710346876,0.8119489411484921],"index":32},{"id":"0.ij6nllcc6j8","wheel_radius":[0.06576536071883776,0.2698134606168656],"wheel_density":[0.10826988964142781,0.4280793840639776],"chassis_density":[0.12451753555889056],"vertex_list":[0.9859276756591981,0.3236156178318257,0.23881710989060712,0.9085044838312986,0.07590918519143286,0.11783026761501492,0.7545494743180108,0.9830926222611833,0.2055190743128783,0.7084273553891405,0.6180798124777225,0.03837658378808495],"wheel_vertex":[0.26257958329367814,0.37422756343544883,0.9706637097723838,0.8270402872916975,0.6423470602861527,0.3049469603936841,0.020315424421025075,0.6731542315692196],"index":33},{"id":"0.cfamjkge14","wheel_radius":[0.5553371223441326,0.48255952545301195],"wheel_density":[0.10233567955957112,0.4118663994606462],"chassis_density":[0.8507010372498203],"vertex_list":[0.4435526144410815,0.7952571161216015,0.6956674298481698,0.7700381150426268,0.02443779192265727,0.3314924202264524,0.5348472872176893,0.16998983587117444,0.3702567531636358,0.13248871108359395,0.32421152908080253,0.12384389935429585],"wheel_vertex":[0.5562361777413118,0.02018197327300042,0.6656773966986882,0.34056707549167897,0.3228687248283031,0.005468963280792272,0.24874132312313169,0.007568029417329258],"index":34},{"id":"0.897upusp00o","wheel_radius":[0.9506221057739288,0.263467828878726],"wheel_density":[0.7810166453464373,0.38647992998898206],"chassis_density":[0.0735421825781255],"vertex_list":[0.33373114115871116,0.09869861121728296,0.1555855146519025,0.3174873187217855,0.4752826770773326,0.3299159892797654,0.19600097967524555,0.14925170964195633,0.006864524052712984,0.7532489017554023,0.438354172052676,0.31124012477685215],"wheel_vertex":[0.8498673328952575,0.48833250139633355,0.714801647554276,0.8987104136285196,0.9384108494792647,0.8839853876491639,0.4194011057562126,0.5022476949036452],"index":35},{"id":"0.eugue9pc7qo","wheel_radius":[0.14580879382814493,0.874400937581342],"wheel_density":[0.35057826376474344,0.49085712757371947],"chassis_density":[0.9261449817850527],"vertex_list":[0.1669027978157156,0.2688530561348279,0.4102379290204792,0.5814259556405568,0.44957812309096634,0.7507083572416744,0.07287773329701586,0.7974367736625725,0.06846180783077527,0.7344754291191549,0.5703026759329677,0.628933557495567],"wheel_vertex":[0.7917192328086229,0.5708019023659623,0.7765250209157932,0.29264234660147226,0.27938923378975344,0.14348106135106042,0.5609167555087855,0.5047442938192339],"index":36},{"id":"0.l6scl5ntjd","wheel_radius":[0.24557812148752567,0.6740496043706881],"wheel_density":[0.07800478790603682,0.5224295673385457],"chassis_density":[0.04608851170320549],"vertex_list":[0.3075353258067306,0.946497419967802,0.40629223029438566,0.2763741078982387,0.2564047413245427,0.9311538993240389,0.6453254163405322,0.6114796828964544,0.5378282883910244,0.19921609846644528,0.9653785345250194,0.39789096849914607],"wheel_vertex":[0.17526063711196405,0.5219227364785715,0.19228400828285652,0.4747119812082834,0.12939951976376407,0.9719157459336423,0.05855057550033971,0.17011606800359047],"index":37},{"id":"0.skr6mmi0sug","wheel_radius":[0.13019903595315174,0.6978847412153089],"wheel_density":[0.9380383929168379,0.9006263152797596],"chassis_density":[0.5362153572215496],"vertex_list":[0.7898533203452032,0.04826996095952185,0.10461690807436286,0.19143508600849146,0.8187561846892544,0.2535765016568483,0.4644271093103154,0.7747321663565605,0.7155888564099566,0.22773684985020748,0.8764042408069712,0.25650019822349357],"wheel_vertex":[0.9742245496507285,0.38649515346286556,0.330704831027097,0.8695117307217375,0.8324213556099074,0.1815734170046004,0.40685293714777715,0.36774085813193635],"index":38},{"id":"0.0bod8ulve58","wheel_radius":[0.5690838202354156,0.24947317707233663],"wheel_density":[0.5327172442416095,0.5221831496178757],"chassis_density":[0.858638303927433],"vertex_list":[0.6544165849856707,0.7921670656120694,0.22828101591886552,0.6608910536558867,0.025260356428931097,0.7044614209271924,0.9761907228962194,0.4711649209146893,0.5727050275473584,0.8272756635204241,0.3982557215345284,0.546708833415614],"wheel_vertex":[0.20255946416681603,0.2824579920782291,0.30185189504063725,0.7373091921243422,0.8353113639169545,0.8787308062707437,0.20223004484930285,0.7812766443788959],"index":39}]}
},{}],26:[function(require,module,exports){
var create = require("../create-instance");
var selection = require("./selection.js/");
var mutation = require("./mutation.js/");
var crossover = require("./crossover.js/");
var cluster = require("./clustering/clusterSetup.js/");
var randomInt = require("./randomInt.js/");
var getRandomInt = randomInt.getRandomInt;

module.exports = {
  generationZero: generationZero,
  nextGeneration: nextGeneration
}

function generationZero(config){
  var generationSize = config.generationSize,
  schema = config.schema;
  var useFile = false;
  var cw_carGeneration = [];
  if(useFile===true){
	  cw_carGeneration= readFile();
  }
  else {
	  for (var k = 0; k < generationSize; k++) {
		var def = create.createGenerationZero(schema, function(){
		return Math.random()
		});
		def.index = k;
		cw_carGeneration.push(def);
	}
  }
  return {
    counter: 0,
    generation: cw_carGeneration,
  };
}

//--------------------------------------------------------------------------- my code job64
/*This function loads an initial car population from a .json file*/
function readFile(){
	var fs = require('fs');
	var array = [];
	var file = require("./initialCars.json/");
	for(var i = 0;i<file.array.length;i++){
		array.push(file.array[i]);
	}
	return array;
}

/*This function Chooses which selection operator to use in the selection of two parents for two new cars such as either Tournament or Roulette-wheel selection
@param parents ObjectArray - Adding the selected object into this array
@param scores ObjectArray - An array of cars where the parents will be selected from
@param increaseMate Boolean - Whether the current selection will include an elite where if true it wont be deleted from the Object array allowing it to be used again
@return parentsScore int - returns the average score of the parents*/
function selectParents(parents, scores, increaseMate){
	var parent1 = selection.runSelection(scores,(increaseMate===false)?2:2,true, true, true);
	parents.push(parent1.def);
	if(increaseMate===false){
		scores.splice(scores.findIndex(x=> x.def.id===parents[0].id),1);
	}
	var parent2 = selection.runSelection(scores,(increaseMate===false)?2:2,true, true, true);
	parents.push(parent2.def);
	scores.splice(scores.findIndex(x=> x.def.id===parents[1].id),1);
	return (parent1.score.s + parent2.score.s)/2;
}

/*This function runs a Evolutionary algorithm which uses Selection, Crossover and mutations to create the new populations of cars.
@param scores ObjectArray - An array which holds the car objects and there performance scores
@param config - This is the generationConfig file passed through which gives the cars template/blueprint for creation
@param noCarsCreated int - The number of cars there currently exist used for creating the id of new cars
@return newGeneration ObjectArray - is returned with all the newly created cars that will be in the simulation*/
function runEA(scores, config, noCarsCreated){
	scores.sort(function(a, b){return b.score.s - a.score.s;});
	var generationSize=scores.length;
	var newGeneration = new Array();
	var randomMateIncrease = getRandomInt(0,maxNoMatesIncreases, new Array());
	var maxNoMatesIncreases = 0;
	var currentNoMateIncreases = 1;
	var noElites=3;
	for(var i=0;i<noElites;i++){//add new elites to newGeneration
		var newElite = scores[0].def;
		newElite.elite = true;
		newGeneration.push(newElite);
	}
	for(var k = 0;k<generationSize/2;k++){
		if(newGeneration.length!==40){
		var pickedParents = [];
		var parentsScore = selectParents(pickedParents, scores, ((k===randomMateIncrease)&&(currentNoMateIncreases<maxNoMatesIncreases))?true:false); 
		if(currentNoMateIncreases<maxNoMatesIncreases){currentNoMateIncreases++;}
			var newCars = crossover.runCrossover(pickedParents,0,config.schema, parentsScore, noCarsCreated, (newGeneration.length===39)?1:2);
			for(var i=0;i<newCars.length;i++){
				newCars[i].elite = false;
				newCars[i].index = k;
				newGeneration.push(newCars[i]);
				noCarsCreated++;// used in car id creation
			}
		}
	}	
	newGeneration.sort(function(a, b){return a.parentsScore - b.parentsScore;});
	for(var x = 0;x<newGeneration.length;x++){
			var currentID = newGeneration[x].id;
			if(newGeneration[x].elite===false){
				//newGeneration[x] = mutation.multiMutations(newGeneration[x],newGeneration.findIndex(x=> x.id===currentID),20);
				newGeneration[x] = mutation.mutate(newGeneration[x]);
			}
		}
		console.log(newGeneration);
	return newGeneration;
}

/*This function runs the Baseline Evolutionary algorithm which only runs a mutation or multiMutations over all the cars passed though in the scores parameter.
@param scores Array - This parameter is an array of cars that holds the score statistics and car data such as id and "wheel_radius", "chassis_density", "vertex_list", "wheel_vertex" and "wheel_density"
@param config - This passes a file with functions that can be called.
@return newGeneration - this is the new population that have had mutations applied to them.*/
function runBaselineEA(scores, config){
	scores.sort(function(a, b){return a.score.s - b.score.s;});
	var schema = config.schema;//list of car variables i.e "wheel_radius", "chassis_density", "vertex_list", "wheel_vertex" and "wheel_density"
	var newGeneration = new Array();
	var generationSize=scores.length;
	console.log(scores);//test data
	for (var k = 0; k < generationSize; k++) {
		//newGeneration.push(mutation.mutate(scores[k].def));
		newGeneration.push(mutation.multiMutations(scores[k].def,scores.findIndex(x=> x.def.id===scores[k].def.id),20));
		newGeneration[k].is_elite = false;
		newGeneration[k].index = k;
	}
	
	return newGeneration;
}	

/*
This function handles the choosing of which Evolutionary algorithm to run and returns the new population to the simulation*/
function nextGeneration(previousState, scores, config){
	var newGeneration = new Array();
	var count;
	var tempRound=0;
	
		tempRound=(typeof previousState.round ==="undefined")?0:previousState.round;
		count = previousState.counter + 1;
		//var clusterInt = (previousState.counter===0)?cluster.setup(scores,null,false):cluster.setup(scores,previousState.clust,true);
		//cluster.reScoreCars(scores ,clusterInt);
		scores.sort(function(a, b){return a.score.s - b.score.s;});
		var numberOfCars = (previousState.counter===0)?40:previousState.noCars+40;
		var schema = config.schema;//list of car variables i.e "wheel_radius", "chassis_density", "vertex_list", "wheel_vertex"
	
		console.log("Log -- "+previousState.counter);
		//console.log(scoresData);//test data
		var eaType = 1;
		newGeneration = (eaType===1)?runEA(scores, config, numberOfCars, previousState.stateAveragesArr):runBaselineEA(scores, config);
		//console.log(newGeneration);//test data
	if(previousState.counter>150){
		count=0;
		tempRound++;
		//newGeneration=generationZero(config).generation;
		
	}
	
  return {
    counter: count,
    generation: newGeneration,
	//clust: clusterInt,
	noCars: numberOfCars,
	round: tempRound
  };
}


//------------------------------------------------------------------------------ end of my code job64


function makeChild(config, parents){
  var schema = config.schema,
    pickParent = config.pickParent;
  return create.createCrossBreed(schema, parents, pickParent)
}



function mutate(config, parent){
  var schema = config.schema,
    mutation_range = config.mutation_range,
    gen_mutation = config.gen_mutation,
    generateRandom = config.generateRandom;
  return create.createMutatedClone(
    schema,
    generateRandom,
    parent,
    Math.max(mutation_range),
    gen_mutation
  )
}

},{"../create-instance":21,"./clustering/clusterSetup.js/":23,"./crossover.js/":24,"./initialCars.json/":25,"./mutation.js/":27,"./randomInt.js/":28,"./selection.js/":29,"fs":1}],27:[function(require,module,exports){
module.exports = {
	mutate: mutate,
	multiMutations: multiMutations
}

/*This function returns whole ints between a minimum and maximum
@param min int - The minimum int that can be returned
@param max int - The maximum int that can be returned
@param notEqualsArr intArray - An array of the ints that the function should not return
@return int - The int within the specified parameter bounds is returned.*/
function getRandomInt(min, max, notEqualsArr) {
	var toReturn;
	var runLoop = true;
	while(runLoop===true){
		min = Math.ceil(min);
		max = Math.floor(max);
		toReturn = Math.floor(Math.random() * (max - min + 1)) + min;
		if(typeof findIfExists === "undefined"){
			runLoop=false;
		}
		else if(notEqualsArr.find(function(value){return value===toReturn;})===false){
			runLoop=false;
		}
	}
    return toReturn;//(typeof findIfExists === "undefined")?toReturn:getRandomInt(min, max, notEqualsArr);
}


function changeArrayValue(originalValue){
	for(var i=0;i<originalValue.length;i++){
		var randomFloat = Math.random();
		var mutationRate = 0.5*randomFloat;//Math.random();
		var increaseOrDecrease = getRandomInt(0,1,[]);
		newValue = (increaseOrDecrease===0)?originalValue[i]-mutationRate:originalValue[i]+mutationRate;
		if(newValue<0){
			newValue = originalValue[i]+mutationRate;
		} else if(newValue>1){
			newValue = originalValue[i]-mutationRate;
		}
		originalValue[i] = newValue;
	}
	return originalValue;
}

function mutate(car){
	return changeData(car,new Array(),1);
}

function changeData(car, multiMutations, noMutations){
	var randomInt = getRandomInt(1,4, multiMutations);
	if(randomInt===1){
		car.chassis_density=changeArrayValue(car.chassis_density);
	}
	else if(randomInt===2){
		car.vertex_list=changeArrayValue(car.vertex_list);
	}
	else if(randomInt===3){
		car.wheel_density=changeArrayValue(car.wheel_density);
	}
	else if(randomInt===4){
		car.wheel_radius=changeArrayValue(car.wheel_radius);
	}
	else {
		car.wheel_vertex=changeArrayValue(car.wheel_vertex);
	}
	multiMutations.push(randomInt);
	noMutations--;
	return (noMutations===0)?car:changeData(car, multiMutations, noMutations);
}

function multiMutations(car, arrPosition, arrSize){
	//var noMutations = (arrPosition<(arrSize/2))?(arrPosition<(arrSize/4))?4:3:(arrPosition>arrSize-(arrSize/4))?1:2;
	var noMutations = (arrPosition<10)?3:1;
	return changeData(car, new Array(),noMutations);
}
},{}],28:[function(require,module,exports){
 module.exports = {
	getRandomInt: getRandomInt
 }
 
/*This is a recursive function which returns whole ints between a minimum and maximum
@param min int - The minimum int that can be returned
@param max int - The maximum int that can be returned
@param notEqualsArr intArray - An array of the ints that the function should not return
@return int - The int within the specified parameter bounds is returned.*/
function getRandomInt(min, max, notEqualsArr) {
	var toReturn;
	var runLoop = true;
	while(runLoop===true){
		min = Math.ceil(min);
		max = Math.floor(max);
		toReturn = Math.floor(Math.random() * (max - min + 1)) + min;
		if(typeof findIfExists === "undefined"){
			runLoop=false;
		}
		else if(notEqualsArr.find(function(value){return value===toReturn;})===false){
			runLoop=false;
		}
	}
    return toReturn;//(typeof findIfExists === "undefined")?toReturn:getRandomInt(min, max, notEqualsArr);
}
},{}],29:[function(require,module,exports){
//var randomInt = require("./randomInt.js/");
//var getRandomInt = randomInt.getRandomInt;

module.exports = {
	runSelection: runSelection
}
/*
This function changes the type of selection used depending on the parameter number "selectType" = (rouleteWheelSel - 1, tournamentSelection - 2)
@param strongest boolean  - this parameter is passed through to the tournamentSelection function where true is return the strongest and false get weakest
@param selectType int - this parameter determines the type of selection used.
@param carsArr Array - this parameter is the population which the selection functions are used on.
@param useSubSet boolean - true if you want tournamentSelection to use sub sets not the global population
@return ObjectArray - the parents array of two is returned from either tournament or roullete wheel selection*/
function runSelection(carsArr, selectType, strongest, useSubSet, uniform){
	if(selectType===1){
		return rouleteWheelSel(carsArr, false);
	} 
	else if(selectType===2){
		return tournamentSelection(carsArr,strongest,7, useSubSet);
	}
}

/*This function uses finess proportionate selection where a proportion of the wheel is given to a car based on fitness
@param carsArr ObjectArray - The array of cars where the parents are chosen from
@param uniform boolean - whether the selection should be uniform
@return car Object - A car object is returned after selection*/
function rouleteWheelSel(carsArr, uniform){
	if(uniform ===false){
		var sumCarScore = 0;
		for(var i =0;i<carsArr.length;i++){
			sumCarScore += carsArr[i].score.s;
		}
		/*console.log("selection data -");
		console.log(carsArr.length);
		console.log(sumCarScore);//test no
		*/
		var no = Math.random() * sumCarScore;
		if(sumCarScore!=0){
			for(var x =0;x<carsArr.length;x++){
				no -= carsArr[x].score.s;
				if(no<0){
					//console.log(carsArr[x]);//returned car
					return carsArr[x];
				}
				
			}
		}
		else{
			return carsArr[0];
		}
	} else {
		var randNo = getRandomInt(0, carsArr.length-1,[]);
		return carsArr[randNo];
	}
}

/*This function uses tournamentSelection where a array is sorted and the strongest or weakest is returned
@param carsArr ObjectArray - The array of cars where the parents are chosen from
@param strongest Boolean - if true the strongest car is chosen, else if false the weakest is returned 
@param subSetRange int - How big the subSet of the global array should be
@param useSubSet boolean - true if you want to use sub set of randomly chosen objects from the global, or false to just use the global
@return car Object - A car object is returned after selection*/
function tournamentSelection(carsArr, strongest, subSetRange, useSubSet){
	var subSet = [];
	if(useSubSet===true){
	var chosenInts = [];
	for(var i =0;i<subSetRange;i++){
		var chosenNo = getRandomInt(0,carsArr.length-1,chosenInts);
		chosenInts.push(chosenNo);
		subSet.push(carsArr[chosenNo]);
	}
	}
	(useSubSet===true)?subSet:carsArr.sort(function(a,b){return (strongest===true)?b.score.s - a.score.s:a.score.s - a.score.b;});
	return (useSubSet===true)?subSet[0]:carsArr[0];
}

/*This function returns whole ints between a minimum and maximum
@param min int - The minimum int that can be returned
@param max int - The maximum int that can be returned
@param notEqualsArr intArray - An array of the ints that the function should not return
@return int - The int within the specified parameter bounds is returned.*/
function getRandomInt(min, max, notEqualsArr) {
	var toReturn;
	var runLoop = true;
	while(runLoop===true){
		min = Math.ceil(min);
		max = Math.floor(max);
		toReturn = Math.floor(Math.random() * (max - min + 1)) + min;
		if(typeof findIfExists === "undefined"){
			runLoop=false;
		}
		else if(notEqualsArr.find(function(value){return value===toReturn;})===false){
			runLoop=false;
		}
	}
    return toReturn;//(typeof findIfExists === "undefined")?toReturn:getRandomInt(min, max, notEqualsArr);
}


},{}],30:[function(require,module,exports){


const random = {
  shuffleIntegers(prop, generator){
    return random.mapToShuffle(prop, random.createNormals({
      length: prop.length || 10,
      inclusive: true,
    }, generator));
  },
  createIntegers(prop, generator){
    return random.mapToInteger(prop, random.createNormals({
      length: prop.length,
      inclusive: true,
    }, generator));
  },
  createFloats(prop, generator){
    return random.mapToFloat(prop, random.createNormals({
      length: prop.length,
      inclusive: true,
    }, generator));
  },
  createNormals(prop, generator){
    var l = prop.length;
    var values = [];
    for(var i = 0; i < l; i++){
      values.push(
        createNormal(prop, generator)
      );
    }
    return values;
  },
  mutateShuffle(
    prop, generator, originalValues, mutation_range, chanceToMutate
  ){
    return random.mapToShuffle(prop, random.mutateNormals(
      prop, generator, originalValues, mutation_range, chanceToMutate
    ));
  },
  mutateIntegers(prop, generator, originalValues, mutation_range, chanceToMutate){
    return random.mapToInteger(prop, random.mutateNormals(
      prop, generator, originalValues, mutation_range, chanceToMutate
    ));
  },
  mutateFloats(prop, generator, originalValues, mutation_range, chanceToMutate){
    return random.mapToFloat(prop, random.mutateNormals(
      prop, generator, originalValues, mutation_range, chanceToMutate
    ));
  },
  mapToShuffle(prop, normals){
    var offset = prop.offset || 0;
    var limit = prop.limit || prop.length;
    var sorted = normals.slice().sort(function(a, b){
      return a - b;
    });
    return normals.map(function(val){
      return sorted.indexOf(val);
    }).map(function(i){
      return i + offset;
    }).slice(0, limit);
  },
  mapToInteger(prop, normals){
    prop = {
      min: prop.min || 0,
      range: prop.range || 10,
      length: prop.length
    }
    return random.mapToFloat(prop, normals).map(function(float){
      return Math.round(float);
    });
  },
  mapToFloat(prop, normals){
    prop = {
      min: prop.min || 0,
      range: prop.range || 1
    }
    return normals.map(function(normal){
      var min = prop.min;
      var range = prop.range;
      return min + normal * range
    })
  },
  mutateNormals(prop, generator, originalValues, mutation_range, chanceToMutate){
    var factor = (prop.factor || 1) * mutation_range
    return originalValues.map(function(originalValue){
      if(generator() > chanceToMutate){
        return originalValue;
      }
      return mutateNormal(
        prop, generator, originalValue, factor
      );
    });
  }
};

module.exports = random;

function mutateNormal(prop, generator, originalValue, mutation_range){
  if(mutation_range > 1){
    throw new Error("Cannot mutate beyond bounds");
  }
  var newMin = originalValue - 0.5;
  if (newMin < 0) newMin = 0;
  if (newMin + mutation_range  > 1)
    newMin = 1 - mutation_range;
  var rangeValue = createNormal({
    inclusive: true,
  }, generator);
  return newMin + rangeValue * mutation_range;
}

function createNormal(prop, generator){
  if(!prop.inclusive){
    return generator();
  } else {
    return generator() < 0.5 ?
    generator() :
    1 - generator();
  }
}

},{}],31:[function(require,module,exports){
/* globals btoa */
var setupScene = require("./setup-scene");
var carRun = require("../car-schema/run");
var defToCar = require("../car-schema/def-to-car");

module.exports = runDefs;
function runDefs(world_def, defs, listeners) {
  if (world_def.mutable_floor) {
    // GHOST DISABLED
    world_def.floorseed = btoa(Math.seedrandom());
  }

  var scene = setupScene(world_def);
  scene.world.Step(1 / world_def.box2dfps, 20, 20);
  console.log("about to build cars");
  var cars = defs.map((def, i) => {
    return {
      index: i,
      def: def,
      car: defToCar(def, scene.world, world_def),
      state: carRun.getInitialState(world_def)
    };
  });
  var alivecars = cars;
  return {
    scene: scene,
    cars: cars,
    step: function () {
      if (alivecars.length === 0) {
        throw new Error("no more cars");
      }
      scene.world.Step(1 / world_def.box2dfps, 20, 20);
      listeners.preCarStep();
      alivecars = alivecars.filter(function (car) {
        car.state = carRun.updateState(
          world_def, car.car, car.state
        );
        var status = carRun.getStatus(car.state, world_def);
        listeners.carStep(car);
        if (status === 0) {
          return true;
        }
        car.score = carRun.calculateScore(car.state, world_def);
        listeners.carDeath(car);

        var world = scene.world;
        var worldCar = car.car;
        world.DestroyBody(worldCar.chassis);

        for (var w = 0; w < worldCar.wheels.length; w++) {
          world.DestroyBody(worldCar.wheels[w]);
        }

        return false;
      })
      if (alivecars.length === 0) {
        listeners.generationEnd(cars);
      }
    }
  }

}

},{"../car-schema/def-to-car":4,"../car-schema/run":5,"./setup-scene":32}],32:[function(require,module,exports){
/* globals b2World b2Vec2 b2BodyDef b2FixtureDef b2PolygonShape */

/*

world_def = {
  gravity: {x, y},
  doSleep: boolean,
  floorseed: string,
  tileDimensions,
  maxFloorTiles,
  mutable_floor: boolean
}

*/

module.exports = function(world_def){

  var world = new b2World(world_def.gravity, world_def.doSleep);
  var floorTiles = cw_createFloor(
    world,
    world_def.floorseed,
    world_def.tileDimensions,
    world_def.maxFloorTiles,
    world_def.mutable_floor
  );

  var last_tile = floorTiles[
    floorTiles.length - 1
  ];
  var last_fixture = last_tile.GetFixtureList();
  var tile_position = last_tile.GetWorldPoint(
    last_fixture.GetShape().m_vertices[3]
  );
  world.finishLine = tile_position.x;
  return {
    world: world,
    floorTiles: floorTiles,
    finishLine: tile_position.x
  };
}

function cw_createFloor(world, floorseed, dimensions, maxFloorTiles, mutable_floor) {
  var last_tile = null;
  var tile_position = new b2Vec2(-5, 0);
  var cw_floorTiles = [];
  Math.seedrandom(floorseed);
  for (var k = 0; k < maxFloorTiles; k++) {
    if (!mutable_floor) {
      // keep old impossible tracks if not using mutable floors
      last_tile = cw_createFloorTile(
        world, dimensions, tile_position, (Math.random() * 3 - 1.5) * 1.5 * k / maxFloorTiles
      );
    } else {
      // if path is mutable over races, create smoother tracks
      last_tile = cw_createFloorTile(
        world, dimensions, tile_position, (Math.random() * 3 - 1.5) * 1.2 * k / maxFloorTiles
      );
    }
    cw_floorTiles.push(last_tile);
    var last_fixture = last_tile.GetFixtureList();
    tile_position = last_tile.GetWorldPoint(last_fixture.GetShape().m_vertices[3]);
  }
  return cw_floorTiles;
}


function cw_createFloorTile(world, dim, position, angle) {
  var body_def = new b2BodyDef();

  body_def.position.Set(position.x, position.y);
  var body = world.CreateBody(body_def);
  var fix_def = new b2FixtureDef();
  fix_def.shape = new b2PolygonShape();
  fix_def.friction = 0.5;

  var coords = new Array();
  coords.push(new b2Vec2(0, 0));
  coords.push(new b2Vec2(0, -dim.y));
  coords.push(new b2Vec2(dim.x, -dim.y));
  coords.push(new b2Vec2(dim.x, 0));

  var center = new b2Vec2(0, 0);

  var newcoords = cw_rotateFloorTile(coords, center, angle);

  fix_def.shape.SetAsArray(newcoords);

  body.CreateFixture(fix_def);
  return body;
}

function cw_rotateFloorTile(coords, center, angle) {
  return coords.map(function(coord){
    return {
      x: Math.cos(angle) * (coord.x - center.x) - Math.sin(angle) * (coord.y - center.y) + center.x,
      y: Math.sin(angle) * (coord.x - center.x) + Math.cos(angle) * (coord.y - center.y) + center.y,
    };
  });
}

},{}]},{},[20])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9saWIvX2VtcHR5LmpzIiwic3JjL2Nhci1zY2hlbWEvY2FyLWNvbnN0YW50cy5qc29uIiwic3JjL2Nhci1zY2hlbWEvY29uc3RydWN0LmpzIiwic3JjL2Nhci1zY2hlbWEvZGVmLXRvLWNhci5qcyIsInNyYy9jYXItc2NoZW1hL3J1bi5qcyIsInNyYy9kcmF3L2RyYXctY2FyLXN0YXRzLmpzIiwic3JjL2RyYXcvZHJhdy1jYXIuanMiLCJzcmMvZHJhdy9kcmF3LWNpcmNsZS5qcyIsInNyYy9kcmF3L2RyYXctZmxvb3IuanMiLCJzcmMvZHJhdy9kcmF3LXZpcnR1YWwtcG9seS5qcyIsInNyYy9kcmF3L3Bsb3QtZ3JhcGhzLmpzIiwic3JjL2RyYXcvc2NhdHRlci1wbG90LmpzIiwic3JjL2dlbmVyYXRpb24tY29uZmlnL2dlbmVyYXRlUmFuZG9tLmpzIiwic3JjL2dlbmVyYXRpb24tY29uZmlnL2luYnJlZWRpbmctY29lZmZpY2llbnQuanMiLCJzcmMvZ2VuZXJhdGlvbi1jb25maWcvaW5kZXguanMiLCJzcmMvZ2VuZXJhdGlvbi1jb25maWcvcGlja1BhcmVudC5qcyIsInNyYy9nZW5lcmF0aW9uLWNvbmZpZy9zZWxlY3RGcm9tQWxsUGFyZW50cy5qcyIsInNyYy9naG9zdC9jYXItdG8tZ2hvc3QuanMiLCJzcmMvZ2hvc3QvaW5kZXguanMiLCJzcmMvaW5kZXguanMiLCJzcmMvbWFjaGluZS1sZWFybmluZy9jcmVhdGUtaW5zdGFuY2UuanMiLCJzcmMvbWFjaGluZS1sZWFybmluZy9nZW5ldGljLWFsZ29yaXRobS9jbHVzdGVyaW5nL2NsdXN0ZXIuanMiLCJzcmMvbWFjaGluZS1sZWFybmluZy9nZW5ldGljLWFsZ29yaXRobS9jbHVzdGVyaW5nL2NsdXN0ZXJTZXR1cC5qcyIsInNyYy9tYWNoaW5lLWxlYXJuaW5nL2dlbmV0aWMtYWxnb3JpdGhtL2Nyb3Nzb3Zlci5qcyIsInNyYy9tYWNoaW5lLWxlYXJuaW5nL2dlbmV0aWMtYWxnb3JpdGhtL2luaXRpYWxDYXJzLmpzb24iLCJzcmMvbWFjaGluZS1sZWFybmluZy9nZW5ldGljLWFsZ29yaXRobS9tYW5hZ2Utcm91bmQuanMiLCJzcmMvbWFjaGluZS1sZWFybmluZy9nZW5ldGljLWFsZ29yaXRobS9tdXRhdGlvbi5qcyIsInNyYy9tYWNoaW5lLWxlYXJuaW5nL2dlbmV0aWMtYWxnb3JpdGhtL3JhbmRvbUludC5qcyIsInNyYy9tYWNoaW5lLWxlYXJuaW5nL2dlbmV0aWMtYWxnb3JpdGhtL3NlbGVjdGlvbi5qcyIsInNyYy9tYWNoaW5lLWxlYXJuaW5nL3JhbmRvbS5qcyIsInNyYy93b3JsZC9ydW4uanMiLCJzcmMvd29ybGQvc2V0dXAtc2NlbmUuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTs7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDWEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNySEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9EQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25DQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDZEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwS0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ0xBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5R0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3B0QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RHQTs7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2SEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uKCl7ZnVuY3Rpb24gcihlLG4sdCl7ZnVuY3Rpb24gbyhpLGYpe2lmKCFuW2ldKXtpZighZVtpXSl7dmFyIGM9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZTtpZighZiYmYylyZXR1cm4gYyhpLCEwKTtpZih1KXJldHVybiB1KGksITApO3ZhciBhPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIraStcIidcIik7dGhyb3cgYS5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGF9dmFyIHA9bltpXT17ZXhwb3J0czp7fX07ZVtpXVswXS5jYWxsKHAuZXhwb3J0cyxmdW5jdGlvbihyKXt2YXIgbj1lW2ldWzFdW3JdO3JldHVybiBvKG58fHIpfSxwLHAuZXhwb3J0cyxyLGUsbix0KX1yZXR1cm4gbltpXS5leHBvcnRzfWZvcih2YXIgdT1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlLGk9MDtpPHQubGVuZ3RoO2krKylvKHRbaV0pO3JldHVybiBvfXJldHVybiByfSkoKSIsIiIsIm1vZHVsZS5leHBvcnRzPXtcclxuICBcIndoZWVsQ291bnRcIjogMixcclxuICBcIndoZWVsTWluUmFkaXVzXCI6IDAuMixcclxuICBcIndoZWVsUmFkaXVzUmFuZ2VcIjogMC41LFxyXG4gIFwid2hlZWxNaW5EZW5zaXR5XCI6IDQwLFxyXG4gIFwid2hlZWxEZW5zaXR5UmFuZ2VcIjogMTAwLFxyXG4gIFwiY2hhc3Npc0RlbnNpdHlSYW5nZVwiOiAzMDAsXHJcbiAgXCJjaGFzc2lzTWluRGVuc2l0eVwiOiAzMCxcclxuICBcImNoYXNzaXNNaW5BeGlzXCI6IDAuMSxcclxuICBcImNoYXNzaXNBeGlzUmFuZ2VcIjogMS4xXHJcbn1cclxuIiwidmFyIGNhckNvbnN0YW50cyA9IHJlcXVpcmUoXCIuL2Nhci1jb25zdGFudHMuanNvblwiKTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0ge1xyXG4gIHdvcmxkRGVmOiB3b3JsZERlZixcclxuICBjYXJDb25zdGFudHM6IGdldENhckNvbnN0YW50cyxcclxuICBnZW5lcmF0ZVNjaGVtYTogZ2VuZXJhdGVTY2hlbWFcclxufVxyXG5cclxuZnVuY3Rpb24gd29ybGREZWYoKXtcclxuICB2YXIgYm94MmRmcHMgPSA2MDtcclxuICByZXR1cm4ge1xyXG4gICAgZ3Jhdml0eTogeyB5OiAwIH0sXHJcbiAgICBkb1NsZWVwOiB0cnVlLFxyXG4gICAgZmxvb3JzZWVkOiBcImFiY1wiLFxyXG4gICAgbWF4Rmxvb3JUaWxlczogMjAwLFxyXG4gICAgbXV0YWJsZV9mbG9vcjogZmFsc2UsXHJcbiAgICBtb3RvclNwZWVkOiAyMCxcclxuICAgIGJveDJkZnBzOiBib3gyZGZwcyxcclxuICAgIG1heF9jYXJfaGVhbHRoOiBib3gyZGZwcyAqIDEwLFxyXG4gICAgdGlsZURpbWVuc2lvbnM6IHtcclxuICAgICAgd2lkdGg6IDEuNSxcclxuICAgICAgaGVpZ2h0OiAwLjE1XHJcbiAgICB9XHJcbiAgfTtcclxufVxyXG5cclxuZnVuY3Rpb24gZ2V0Q2FyQ29uc3RhbnRzKCl7XHJcbiAgcmV0dXJuIGNhckNvbnN0YW50cztcclxufVxyXG5cclxuZnVuY3Rpb24gZ2VuZXJhdGVTY2hlbWEodmFsdWVzKXtcclxuICByZXR1cm4ge1xyXG4gICAgd2hlZWxfcmFkaXVzOiB7XHJcbiAgICAgIHR5cGU6IFwiZmxvYXRcIixcclxuICAgICAgbGVuZ3RoOiB2YWx1ZXMud2hlZWxDb3VudCxcclxuICAgICAgbWluOiB2YWx1ZXMud2hlZWxNaW5SYWRpdXMsXHJcbiAgICAgIHJhbmdlOiB2YWx1ZXMud2hlZWxSYWRpdXNSYW5nZSxcclxuICAgICAgZmFjdG9yOiAxLFxyXG4gICAgfSxcclxuICAgIHdoZWVsX2RlbnNpdHk6IHtcclxuICAgICAgdHlwZTogXCJmbG9hdFwiLFxyXG4gICAgICBsZW5ndGg6IHZhbHVlcy53aGVlbENvdW50LFxyXG4gICAgICBtaW46IHZhbHVlcy53aGVlbE1pbkRlbnNpdHksXHJcbiAgICAgIHJhbmdlOiB2YWx1ZXMud2hlZWxEZW5zaXR5UmFuZ2UsXHJcbiAgICAgIGZhY3RvcjogMSxcclxuICAgIH0sXHJcbiAgICBjaGFzc2lzX2RlbnNpdHk6IHtcclxuICAgICAgdHlwZTogXCJmbG9hdFwiLFxyXG4gICAgICBsZW5ndGg6IDEsXHJcbiAgICAgIG1pbjogdmFsdWVzLmNoYXNzaXNEZW5zaXR5UmFuZ2UsXHJcbiAgICAgIHJhbmdlOiB2YWx1ZXMuY2hhc3Npc01pbkRlbnNpdHksXHJcbiAgICAgIGZhY3RvcjogMSxcclxuICAgIH0sXHJcbiAgICB2ZXJ0ZXhfbGlzdDoge1xyXG4gICAgICB0eXBlOiBcImZsb2F0XCIsXHJcbiAgICAgIGxlbmd0aDogMTIsXHJcbiAgICAgIG1pbjogdmFsdWVzLmNoYXNzaXNNaW5BeGlzLFxyXG4gICAgICByYW5nZTogdmFsdWVzLmNoYXNzaXNBeGlzUmFuZ2UsXHJcbiAgICAgIGZhY3RvcjogMSxcclxuICAgIH0sXHJcbiAgICB3aGVlbF92ZXJ0ZXg6IHtcclxuICAgICAgdHlwZTogXCJzaHVmZmxlXCIsXHJcbiAgICAgIGxlbmd0aDogOCxcclxuICAgICAgbGltaXQ6IHZhbHVlcy53aGVlbENvdW50LFxyXG4gICAgICBmYWN0b3I6IDEsXHJcbiAgICB9LFxyXG4gIH07XHJcbn1cclxuIiwiLypcclxuICBnbG9iYWxzIGIyUmV2b2x1dGVKb2ludERlZiBiMlZlYzIgYjJCb2R5RGVmIGIyQm9keSBiMkZpeHR1cmVEZWYgYjJQb2x5Z29uU2hhcGUgYjJDaXJjbGVTaGFwZVxyXG4qL1xyXG5cclxudmFyIGNyZWF0ZUluc3RhbmNlID0gcmVxdWlyZShcIi4uL21hY2hpbmUtbGVhcm5pbmcvY3JlYXRlLWluc3RhbmNlXCIpO1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBkZWZUb0NhcjtcclxuXHJcbmZ1bmN0aW9uIGRlZlRvQ2FyKG5vcm1hbF9kZWYsIHdvcmxkLCBjb25zdGFudHMpe1xyXG4gIHZhciBjYXJfZGVmID0gY3JlYXRlSW5zdGFuY2UuYXBwbHlUeXBlcyhjb25zdGFudHMuc2NoZW1hLCBub3JtYWxfZGVmKVxyXG4gIHZhciBpbnN0YW5jZSA9IHt9O1xyXG4gIGluc3RhbmNlLmNoYXNzaXMgPSBjcmVhdGVDaGFzc2lzKFxyXG4gICAgd29ybGQsIGNhcl9kZWYudmVydGV4X2xpc3QsIGNhcl9kZWYuY2hhc3Npc19kZW5zaXR5XHJcbiAgKTtcclxuICB2YXIgaTtcclxuXHJcbiAgdmFyIHdoZWVsQ291bnQgPSBjYXJfZGVmLndoZWVsX3JhZGl1cy5sZW5ndGg7XHJcblxyXG4gIGluc3RhbmNlLndoZWVscyA9IFtdO1xyXG4gIGZvciAoaSA9IDA7IGkgPCB3aGVlbENvdW50OyBpKyspIHtcclxuICAgIGluc3RhbmNlLndoZWVsc1tpXSA9IGNyZWF0ZVdoZWVsKFxyXG4gICAgICB3b3JsZCxcclxuICAgICAgY2FyX2RlZi53aGVlbF9yYWRpdXNbaV0sXHJcbiAgICAgIGNhcl9kZWYud2hlZWxfZGVuc2l0eVtpXVxyXG4gICAgKTtcclxuICB9XHJcblxyXG4gIHZhciBjYXJtYXNzID0gaW5zdGFuY2UuY2hhc3Npcy5HZXRNYXNzKCk7XHJcbiAgZm9yIChpID0gMDsgaSA8IHdoZWVsQ291bnQ7IGkrKykge1xyXG4gICAgY2FybWFzcyArPSBpbnN0YW5jZS53aGVlbHNbaV0uR2V0TWFzcygpO1xyXG4gIH1cclxuXHJcbiAgdmFyIGpvaW50X2RlZiA9IG5ldyBiMlJldm9sdXRlSm9pbnREZWYoKTtcclxuXHJcbiAgZm9yIChpID0gMDsgaSA8IHdoZWVsQ291bnQ7IGkrKykge1xyXG4gICAgdmFyIHRvcnF1ZSA9IGNhcm1hc3MgKiAtY29uc3RhbnRzLmdyYXZpdHkueSAvIGNhcl9kZWYud2hlZWxfcmFkaXVzW2ldO1xyXG5cclxuICAgIHZhciByYW5kdmVydGV4ID0gaW5zdGFuY2UuY2hhc3Npcy52ZXJ0ZXhfbGlzdFtjYXJfZGVmLndoZWVsX3ZlcnRleFtpXV07XHJcbiAgICBqb2ludF9kZWYubG9jYWxBbmNob3JBLlNldChyYW5kdmVydGV4LngsIHJhbmR2ZXJ0ZXgueSk7XHJcbiAgICBqb2ludF9kZWYubG9jYWxBbmNob3JCLlNldCgwLCAwKTtcclxuICAgIGpvaW50X2RlZi5tYXhNb3RvclRvcnF1ZSA9IHRvcnF1ZTtcclxuICAgIGpvaW50X2RlZi5tb3RvclNwZWVkID0gLWNvbnN0YW50cy5tb3RvclNwZWVkO1xyXG4gICAgam9pbnRfZGVmLmVuYWJsZU1vdG9yID0gdHJ1ZTtcclxuICAgIGpvaW50X2RlZi5ib2R5QSA9IGluc3RhbmNlLmNoYXNzaXM7XHJcbiAgICBqb2ludF9kZWYuYm9keUIgPSBpbnN0YW5jZS53aGVlbHNbaV07XHJcbiAgICB3b3JsZC5DcmVhdGVKb2ludChqb2ludF9kZWYpO1xyXG4gIH1cclxuXHJcbiAgcmV0dXJuIGluc3RhbmNlO1xyXG59XHJcblxyXG5mdW5jdGlvbiBjcmVhdGVDaGFzc2lzKHdvcmxkLCB2ZXJ0ZXhzLCBkZW5zaXR5KSB7XHJcblxyXG4gIHZhciB2ZXJ0ZXhfbGlzdCA9IG5ldyBBcnJheSgpO1xyXG4gIHZlcnRleF9saXN0LnB1c2gobmV3IGIyVmVjMih2ZXJ0ZXhzWzBdLCAwKSk7XHJcbiAgdmVydGV4X2xpc3QucHVzaChuZXcgYjJWZWMyKHZlcnRleHNbMV0sIHZlcnRleHNbMl0pKTtcclxuICB2ZXJ0ZXhfbGlzdC5wdXNoKG5ldyBiMlZlYzIoMCwgdmVydGV4c1szXSkpO1xyXG4gIHZlcnRleF9saXN0LnB1c2gobmV3IGIyVmVjMigtdmVydGV4c1s0XSwgdmVydGV4c1s1XSkpO1xyXG4gIHZlcnRleF9saXN0LnB1c2gobmV3IGIyVmVjMigtdmVydGV4c1s2XSwgMCkpO1xyXG4gIHZlcnRleF9saXN0LnB1c2gobmV3IGIyVmVjMigtdmVydGV4c1s3XSwgLXZlcnRleHNbOF0pKTtcclxuICB2ZXJ0ZXhfbGlzdC5wdXNoKG5ldyBiMlZlYzIoMCwgLXZlcnRleHNbOV0pKTtcclxuICB2ZXJ0ZXhfbGlzdC5wdXNoKG5ldyBiMlZlYzIodmVydGV4c1sxMF0sIC12ZXJ0ZXhzWzExXSkpO1xyXG5cclxuICB2YXIgYm9keV9kZWYgPSBuZXcgYjJCb2R5RGVmKCk7XHJcbiAgYm9keV9kZWYudHlwZSA9IGIyQm9keS5iMl9keW5hbWljQm9keTtcclxuICBib2R5X2RlZi5wb3NpdGlvbi5TZXQoMC4wLCA0LjApO1xyXG5cclxuICB2YXIgYm9keSA9IHdvcmxkLkNyZWF0ZUJvZHkoYm9keV9kZWYpO1xyXG5cclxuICBjcmVhdGVDaGFzc2lzUGFydChib2R5LCB2ZXJ0ZXhfbGlzdFswXSwgdmVydGV4X2xpc3RbMV0sIGRlbnNpdHkpO1xyXG4gIGNyZWF0ZUNoYXNzaXNQYXJ0KGJvZHksIHZlcnRleF9saXN0WzFdLCB2ZXJ0ZXhfbGlzdFsyXSwgZGVuc2l0eSk7XHJcbiAgY3JlYXRlQ2hhc3Npc1BhcnQoYm9keSwgdmVydGV4X2xpc3RbMl0sIHZlcnRleF9saXN0WzNdLCBkZW5zaXR5KTtcclxuICBjcmVhdGVDaGFzc2lzUGFydChib2R5LCB2ZXJ0ZXhfbGlzdFszXSwgdmVydGV4X2xpc3RbNF0sIGRlbnNpdHkpO1xyXG4gIGNyZWF0ZUNoYXNzaXNQYXJ0KGJvZHksIHZlcnRleF9saXN0WzRdLCB2ZXJ0ZXhfbGlzdFs1XSwgZGVuc2l0eSk7XHJcbiAgY3JlYXRlQ2hhc3Npc1BhcnQoYm9keSwgdmVydGV4X2xpc3RbNV0sIHZlcnRleF9saXN0WzZdLCBkZW5zaXR5KTtcclxuICBjcmVhdGVDaGFzc2lzUGFydChib2R5LCB2ZXJ0ZXhfbGlzdFs2XSwgdmVydGV4X2xpc3RbN10sIGRlbnNpdHkpO1xyXG4gIGNyZWF0ZUNoYXNzaXNQYXJ0KGJvZHksIHZlcnRleF9saXN0WzddLCB2ZXJ0ZXhfbGlzdFswXSwgZGVuc2l0eSk7XHJcblxyXG4gIGJvZHkudmVydGV4X2xpc3QgPSB2ZXJ0ZXhfbGlzdDtcclxuXHJcbiAgcmV0dXJuIGJvZHk7XHJcbn1cclxuXHJcblxyXG5mdW5jdGlvbiBjcmVhdGVDaGFzc2lzUGFydChib2R5LCB2ZXJ0ZXgxLCB2ZXJ0ZXgyLCBkZW5zaXR5KSB7XHJcbiAgdmFyIHZlcnRleF9saXN0ID0gbmV3IEFycmF5KCk7XHJcbiAgdmVydGV4X2xpc3QucHVzaCh2ZXJ0ZXgxKTtcclxuICB2ZXJ0ZXhfbGlzdC5wdXNoKHZlcnRleDIpO1xyXG4gIHZlcnRleF9saXN0LnB1c2goYjJWZWMyLk1ha2UoMCwgMCkpO1xyXG4gIHZhciBmaXhfZGVmID0gbmV3IGIyRml4dHVyZURlZigpO1xyXG4gIGZpeF9kZWYuc2hhcGUgPSBuZXcgYjJQb2x5Z29uU2hhcGUoKTtcclxuICBmaXhfZGVmLmRlbnNpdHkgPSBkZW5zaXR5O1xyXG4gIGZpeF9kZWYuZnJpY3Rpb24gPSAxMDtcclxuICBmaXhfZGVmLnJlc3RpdHV0aW9uID0gMC4yO1xyXG4gIGZpeF9kZWYuZmlsdGVyLmdyb3VwSW5kZXggPSAtMTtcclxuICBmaXhfZGVmLnNoYXBlLlNldEFzQXJyYXkodmVydGV4X2xpc3QsIDMpO1xyXG5cclxuICBib2R5LkNyZWF0ZUZpeHR1cmUoZml4X2RlZik7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNyZWF0ZVdoZWVsKHdvcmxkLCByYWRpdXMsIGRlbnNpdHkpIHtcclxuICB2YXIgYm9keV9kZWYgPSBuZXcgYjJCb2R5RGVmKCk7XHJcbiAgYm9keV9kZWYudHlwZSA9IGIyQm9keS5iMl9keW5hbWljQm9keTtcclxuICBib2R5X2RlZi5wb3NpdGlvbi5TZXQoMCwgMCk7XHJcblxyXG4gIHZhciBib2R5ID0gd29ybGQuQ3JlYXRlQm9keShib2R5X2RlZik7XHJcblxyXG4gIHZhciBmaXhfZGVmID0gbmV3IGIyRml4dHVyZURlZigpO1xyXG4gIGZpeF9kZWYuc2hhcGUgPSBuZXcgYjJDaXJjbGVTaGFwZShyYWRpdXMpO1xyXG4gIGZpeF9kZWYuZGVuc2l0eSA9IGRlbnNpdHk7XHJcbiAgZml4X2RlZi5mcmljdGlvbiA9IDE7XHJcbiAgZml4X2RlZi5yZXN0aXR1dGlvbiA9IDAuMjtcclxuICBmaXhfZGVmLmZpbHRlci5ncm91cEluZGV4ID0gLTE7XHJcblxyXG4gIGJvZHkuQ3JlYXRlRml4dHVyZShmaXhfZGVmKTtcclxuICByZXR1cm4gYm9keTtcclxufVxyXG4iLCJcclxuXHJcbm1vZHVsZS5leHBvcnRzID0ge1xyXG4gIGdldEluaXRpYWxTdGF0ZTogZ2V0SW5pdGlhbFN0YXRlLFxyXG4gIHVwZGF0ZVN0YXRlOiB1cGRhdGVTdGF0ZSxcclxuICBnZXRTdGF0dXM6IGdldFN0YXR1cyxcclxuICBjYWxjdWxhdGVTY29yZTogY2FsY3VsYXRlU2NvcmUsXHJcbn07XHJcblxyXG5mdW5jdGlvbiBnZXRJbml0aWFsU3RhdGUod29ybGRfZGVmKXtcclxuICByZXR1cm4ge1xyXG4gICAgZnJhbWVzOiAwLFxyXG4gICAgaGVhbHRoOiB3b3JsZF9kZWYubWF4X2Nhcl9oZWFsdGgsXHJcbiAgICBtYXhQb3NpdGlvbnk6IDAsXHJcbiAgICBtaW5Qb3NpdGlvbnk6IDAsXHJcbiAgICBtYXhQb3NpdGlvbng6IDAsXHJcbiAgfTtcclxufVxyXG5cclxuZnVuY3Rpb24gdXBkYXRlU3RhdGUoY29uc3RhbnRzLCB3b3JsZENvbnN0cnVjdCwgc3RhdGUpe1xyXG4gIGlmKHN0YXRlLmhlYWx0aCA8PSAwKXtcclxuICAgIHRocm93IG5ldyBFcnJvcihcIkFscmVhZHkgRGVhZFwiKTtcclxuICB9XHJcbiAgaWYoc3RhdGUubWF4UG9zaXRpb254ID4gY29uc3RhbnRzLmZpbmlzaExpbmUpe1xyXG4gICAgdGhyb3cgbmV3IEVycm9yKFwiYWxyZWFkeSBGaW5pc2hlZFwiKTtcclxuICB9XHJcblxyXG4gIC8vIGNvbnNvbGUubG9nKHN0YXRlKTtcclxuICAvLyBjaGVjayBoZWFsdGhcclxuICB2YXIgcG9zaXRpb24gPSB3b3JsZENvbnN0cnVjdC5jaGFzc2lzLkdldFBvc2l0aW9uKCk7XHJcbiAgLy8gY2hlY2sgaWYgY2FyIHJlYWNoZWQgZW5kIG9mIHRoZSBwYXRoXHJcbiAgdmFyIG5leHRTdGF0ZSA9IHtcclxuICAgIGZyYW1lczogc3RhdGUuZnJhbWVzICsgMSxcclxuICAgIG1heFBvc2l0aW9ueDogcG9zaXRpb24ueCA+IHN0YXRlLm1heFBvc2l0aW9ueCA/IHBvc2l0aW9uLnggOiBzdGF0ZS5tYXhQb3NpdGlvbngsXHJcbiAgICBtYXhQb3NpdGlvbnk6IHBvc2l0aW9uLnkgPiBzdGF0ZS5tYXhQb3NpdGlvbnkgPyBwb3NpdGlvbi55IDogc3RhdGUubWF4UG9zaXRpb255LFxyXG4gICAgbWluUG9zaXRpb255OiBwb3NpdGlvbi55IDwgc3RhdGUubWluUG9zaXRpb255ID8gcG9zaXRpb24ueSA6IHN0YXRlLm1pblBvc2l0aW9ueVxyXG4gIH07XHJcblxyXG4gIGlmIChwb3NpdGlvbi54ID4gY29uc3RhbnRzLmZpbmlzaExpbmUpIHtcclxuICAgIHJldHVybiBuZXh0U3RhdGU7XHJcbiAgfVxyXG5cclxuICBpZiAocG9zaXRpb24ueCA+IHN0YXRlLm1heFBvc2l0aW9ueCArIDAuMDIpIHtcclxuICAgIG5leHRTdGF0ZS5oZWFsdGggPSBjb25zdGFudHMubWF4X2Nhcl9oZWFsdGg7XHJcbiAgICByZXR1cm4gbmV4dFN0YXRlO1xyXG4gIH1cclxuICBuZXh0U3RhdGUuaGVhbHRoID0gc3RhdGUuaGVhbHRoIC0gMTtcclxuICBpZiAoTWF0aC5hYnMod29ybGRDb25zdHJ1Y3QuY2hhc3Npcy5HZXRMaW5lYXJWZWxvY2l0eSgpLngpIDwgMC4wMDEpIHtcclxuICAgIG5leHRTdGF0ZS5oZWFsdGggLT0gNTtcclxuICB9XHJcbiAgcmV0dXJuIG5leHRTdGF0ZTtcclxufVxyXG5cclxuZnVuY3Rpb24gZ2V0U3RhdHVzKHN0YXRlLCBjb25zdGFudHMpe1xyXG4gIGlmKGhhc0ZhaWxlZChzdGF0ZSwgY29uc3RhbnRzKSkgcmV0dXJuIC0xO1xyXG4gIGlmKGhhc1N1Y2Nlc3Moc3RhdGUsIGNvbnN0YW50cykpIHJldHVybiAxO1xyXG4gIHJldHVybiAwO1xyXG59XHJcblxyXG5mdW5jdGlvbiBoYXNGYWlsZWQoc3RhdGUgLyosIGNvbnN0YW50cyAqLyl7XHJcbiAgcmV0dXJuIHN0YXRlLmhlYWx0aCA8PSAwO1xyXG59XHJcbmZ1bmN0aW9uIGhhc1N1Y2Nlc3Moc3RhdGUsIGNvbnN0YW50cyl7XHJcbiAgcmV0dXJuIHN0YXRlLm1heFBvc2l0aW9ueCA+IGNvbnN0YW50cy5maW5pc2hMaW5lO1xyXG59XHJcblxyXG5mdW5jdGlvbiBjYWxjdWxhdGVTY29yZShzdGF0ZSwgY29uc3RhbnRzKXtcclxuICB2YXIgYXZnc3BlZWQgPSAoc3RhdGUubWF4UG9zaXRpb254IC8gc3RhdGUuZnJhbWVzKSAqIGNvbnN0YW50cy5ib3gyZGZwcztcclxuICB2YXIgcG9zaXRpb24gPSBzdGF0ZS5tYXhQb3NpdGlvbng7XHJcbiAgdmFyIHNjb3JlID0gcG9zaXRpb24gKyBhdmdzcGVlZDtcclxuICByZXR1cm4ge1xyXG4gICAgdjogc2NvcmUsXHJcbiAgICBzOiBhdmdzcGVlZCxcclxuICAgIHg6IHBvc2l0aW9uLFxyXG4gICAgeTogc3RhdGUubWF4UG9zaXRpb255LFxyXG4gICAgeTI6IHN0YXRlLm1pblBvc2l0aW9ueVxyXG4gIH1cclxufVxyXG4iLCIvKiBnbG9iYWxzIGRvY3VtZW50ICovXHJcblxyXG52YXIgcnVuID0gcmVxdWlyZShcIi4uL2Nhci1zY2hlbWEvcnVuXCIpO1xyXG5cclxuLyogPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSAqL1xyXG4vKiA9PT0gQ2FyID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09ICovXHJcbnZhciBjd19DYXIgPSBmdW5jdGlvbiAoKSB7XHJcbiAgdGhpcy5fX2NvbnN0cnVjdG9yLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XHJcbn1cclxuXHJcbmN3X0Nhci5wcm90b3R5cGUuX19jb25zdHJ1Y3RvciA9IGZ1bmN0aW9uIChjYXIpIHtcclxuICB0aGlzLmNhciA9IGNhcjtcclxuICB0aGlzLmNhcl9kZWYgPSBjYXIuZGVmO1xyXG4gIHZhciBjYXJfZGVmID0gdGhpcy5jYXJfZGVmO1xyXG5cclxuICB0aGlzLmZyYW1lcyA9IDA7XHJcbiAgdGhpcy5hbGl2ZSA9IHRydWU7XHJcbiAgdGhpcy5pc19lbGl0ZSA9IGNhci5kZWYuaXNfZWxpdGU7XHJcbiAgdGhpcy5oZWFsdGhCYXIgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImhlYWx0aFwiICsgY2FyX2RlZi5pbmRleCkuc3R5bGU7XHJcbiAgdGhpcy5oZWFsdGhCYXJUZXh0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJoZWFsdGhcIiArIGNhcl9kZWYuaW5kZXgpLm5leHRTaWJsaW5nLm5leHRTaWJsaW5nO1xyXG4gIHRoaXMuaGVhbHRoQmFyVGV4dC5pbm5lckhUTUwgPSBjYXJfZGVmLmluZGV4O1xyXG4gIHRoaXMubWluaW1hcG1hcmtlciA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiYmFyXCIgKyBjYXJfZGVmLmluZGV4KTtcclxuXHJcbiAgaWYgKHRoaXMuaXNfZWxpdGUpIHtcclxuICAgIHRoaXMuaGVhbHRoQmFyLmJhY2tncm91bmRDb2xvciA9IFwiIzNGNzJBRlwiO1xyXG4gICAgdGhpcy5taW5pbWFwbWFya2VyLnN0eWxlLmJvcmRlckxlZnQgPSBcIjFweCBzb2xpZCAjM0Y3MkFGXCI7XHJcbiAgICB0aGlzLm1pbmltYXBtYXJrZXIuaW5uZXJIVE1MID0gY2FyX2RlZi5pbmRleDtcclxuICB9IGVsc2Uge1xyXG4gICAgdGhpcy5oZWFsdGhCYXIuYmFja2dyb3VuZENvbG9yID0gXCIjRjdDODczXCI7XHJcbiAgICB0aGlzLm1pbmltYXBtYXJrZXIuc3R5bGUuYm9yZGVyTGVmdCA9IFwiMXB4IHNvbGlkICNGN0M4NzNcIjtcclxuICAgIHRoaXMubWluaW1hcG1hcmtlci5pbm5lckhUTUwgPSBjYXJfZGVmLmluZGV4O1xyXG4gIH1cclxuXHJcbn1cclxuXHJcbmN3X0Nhci5wcm90b3R5cGUuZ2V0UG9zaXRpb24gPSBmdW5jdGlvbiAoKSB7XHJcbiAgcmV0dXJuIHRoaXMuY2FyLmNhci5jaGFzc2lzLkdldFBvc2l0aW9uKCk7XHJcbn1cclxuXHJcbmN3X0Nhci5wcm90b3R5cGUua2lsbCA9IGZ1bmN0aW9uIChjdXJyZW50UnVubmVyLCBjb25zdGFudHMpIHtcclxuICB0aGlzLm1pbmltYXBtYXJrZXIuc3R5bGUuYm9yZGVyTGVmdCA9IFwiMXB4IHNvbGlkICMzRjcyQUZcIjtcclxuICB2YXIgZmluaXNoTGluZSA9IGN1cnJlbnRSdW5uZXIuc2NlbmUuZmluaXNoTGluZVxyXG4gIHZhciBtYXhfY2FyX2hlYWx0aCA9IGNvbnN0YW50cy5tYXhfY2FyX2hlYWx0aDtcclxuICB2YXIgc3RhdHVzID0gcnVuLmdldFN0YXR1cyh0aGlzLmNhci5zdGF0ZSwge1xyXG4gICAgZmluaXNoTGluZTogZmluaXNoTGluZSxcclxuICAgIG1heF9jYXJfaGVhbHRoOiBtYXhfY2FyX2hlYWx0aCxcclxuICB9KVxyXG4gIHN3aXRjaChzdGF0dXMpe1xyXG4gICAgY2FzZSAxOiB7XHJcbiAgICAgIHRoaXMuaGVhbHRoQmFyLndpZHRoID0gXCIwXCI7XHJcbiAgICAgIGJyZWFrXHJcbiAgICB9XHJcbiAgICBjYXNlIC0xOiB7XHJcbiAgICAgIHRoaXMuaGVhbHRoQmFyVGV4dC5pbm5lckhUTUwgPSBcIiZkYWdnZXI7XCI7XHJcbiAgICAgIHRoaXMuaGVhbHRoQmFyLndpZHRoID0gXCIwXCI7XHJcbiAgICAgIGJyZWFrXHJcbiAgICB9XHJcbiAgfVxyXG4gIHRoaXMuYWxpdmUgPSBmYWxzZTtcclxuXHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gY3dfQ2FyO1xyXG4iLCJcclxudmFyIGN3X2RyYXdWaXJ0dWFsUG9seSA9IHJlcXVpcmUoXCIuL2RyYXctdmlydHVhbC1wb2x5XCIpO1xyXG52YXIgY3dfZHJhd0NpcmNsZSA9IHJlcXVpcmUoXCIuL2RyYXctY2lyY2xlXCIpO1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihjYXJfY29uc3RhbnRzLCBteUNhciwgY2FtZXJhLCBjdHgpe1xyXG4gIHZhciBjYW1lcmFfeCA9IGNhbWVyYS5wb3MueDtcclxuICB2YXIgem9vbSA9IGNhbWVyYS56b29tO1xyXG5cclxuICB2YXIgd2hlZWxNaW5EZW5zaXR5ID0gY2FyX2NvbnN0YW50cy53aGVlbE1pbkRlbnNpdHlcclxuICB2YXIgd2hlZWxEZW5zaXR5UmFuZ2UgPSBjYXJfY29uc3RhbnRzLndoZWVsRGVuc2l0eVJhbmdlXHJcblxyXG4gIGlmICghbXlDYXIuYWxpdmUpIHtcclxuICAgIHJldHVybjtcclxuICB9XHJcbiAgdmFyIG15Q2FyUG9zID0gbXlDYXIuZ2V0UG9zaXRpb24oKTtcclxuXHJcbiAgaWYgKG15Q2FyUG9zLnggPCAoY2FtZXJhX3ggLSA1KSkge1xyXG4gICAgLy8gdG9vIGZhciBiZWhpbmQsIGRvbid0IGRyYXdcclxuICAgIHJldHVybjtcclxuICB9XHJcblxyXG4gIGN0eC5zdHJva2VTdHlsZSA9IFwiIzQ0NFwiO1xyXG4gIGN0eC5saW5lV2lkdGggPSAxIC8gem9vbTtcclxuXHJcbiAgdmFyIHdoZWVscyA9IG15Q2FyLmNhci5jYXIud2hlZWxzO1xyXG5cclxuICBmb3IgKHZhciBpID0gMDsgaSA8IHdoZWVscy5sZW5ndGg7IGkrKykge1xyXG4gICAgdmFyIGIgPSB3aGVlbHNbaV07XHJcbiAgICBmb3IgKHZhciBmID0gYi5HZXRGaXh0dXJlTGlzdCgpOyBmOyBmID0gZi5tX25leHQpIHtcclxuICAgICAgdmFyIHMgPSBmLkdldFNoYXBlKCk7XHJcbiAgICAgIHZhciBjb2xvciA9IE1hdGgucm91bmQoMjU1IC0gKDI1NSAqIChmLm1fZGVuc2l0eSAtIHdoZWVsTWluRGVuc2l0eSkpIC8gd2hlZWxEZW5zaXR5UmFuZ2UpLnRvU3RyaW5nKCk7XHJcbiAgICAgIHZhciByZ2Jjb2xvciA9IFwicmdiKFwiICsgY29sb3IgKyBcIixcIiArIGNvbG9yICsgXCIsXCIgKyBjb2xvciArIFwiKVwiO1xyXG4gICAgICBjd19kcmF3Q2lyY2xlKGN0eCwgYiwgcy5tX3AsIHMubV9yYWRpdXMsIGIubV9zd2VlcC5hLCByZ2Jjb2xvcik7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBpZiAobXlDYXIuaXNfZWxpdGUpIHtcclxuICAgIGN0eC5zdHJva2VTdHlsZSA9IFwiIzNGNzJBRlwiO1xyXG4gICAgY3R4LmZpbGxTdHlsZSA9IFwiI0RCRTJFRlwiO1xyXG4gIH0gZWxzZSB7XHJcbiAgICBjdHguc3Ryb2tlU3R5bGUgPSBcIiNGN0M4NzNcIjtcclxuICAgIGN0eC5maWxsU3R5bGUgPSBcIiNGQUVCQ0RcIjtcclxuICB9XHJcbiAgY3R4LmJlZ2luUGF0aCgpO1xyXG5cclxuICB2YXIgY2hhc3NpcyA9IG15Q2FyLmNhci5jYXIuY2hhc3NpcztcclxuXHJcbiAgZm9yIChmID0gY2hhc3Npcy5HZXRGaXh0dXJlTGlzdCgpOyBmOyBmID0gZi5tX25leHQpIHtcclxuICAgIHZhciBjcyA9IGYuR2V0U2hhcGUoKTtcclxuICAgIGN3X2RyYXdWaXJ0dWFsUG9seShjdHgsIGNoYXNzaXMsIGNzLm1fdmVydGljZXMsIGNzLm1fdmVydGV4Q291bnQpO1xyXG4gIH1cclxuICBjdHguZmlsbCgpO1xyXG4gIGN0eC5zdHJva2UoKTtcclxufVxyXG4iLCJcclxubW9kdWxlLmV4cG9ydHMgPSBjd19kcmF3Q2lyY2xlO1xyXG5cclxuZnVuY3Rpb24gY3dfZHJhd0NpcmNsZShjdHgsIGJvZHksIGNlbnRlciwgcmFkaXVzLCBhbmdsZSwgY29sb3IpIHtcclxuICB2YXIgcCA9IGJvZHkuR2V0V29ybGRQb2ludChjZW50ZXIpO1xyXG4gIGN0eC5maWxsU3R5bGUgPSBjb2xvcjtcclxuXHJcbiAgY3R4LmJlZ2luUGF0aCgpO1xyXG4gIGN0eC5hcmMocC54LCBwLnksIHJhZGl1cywgMCwgMiAqIE1hdGguUEksIHRydWUpO1xyXG5cclxuICBjdHgubW92ZVRvKHAueCwgcC55KTtcclxuICBjdHgubGluZVRvKHAueCArIHJhZGl1cyAqIE1hdGguY29zKGFuZ2xlKSwgcC55ICsgcmFkaXVzICogTWF0aC5zaW4oYW5nbGUpKTtcclxuXHJcbiAgY3R4LmZpbGwoKTtcclxuICBjdHguc3Ryb2tlKCk7XHJcbn1cclxuIiwidmFyIGN3X2RyYXdWaXJ0dWFsUG9seSA9IHJlcXVpcmUoXCIuL2RyYXctdmlydHVhbC1wb2x5XCIpO1xyXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGN0eCwgY2FtZXJhLCBjd19mbG9vclRpbGVzKSB7XHJcbiAgdmFyIGNhbWVyYV94ID0gY2FtZXJhLnBvcy54O1xyXG4gIHZhciB6b29tID0gY2FtZXJhLnpvb207XHJcbiAgY3R4LnN0cm9rZVN0eWxlID0gXCIjMDAwXCI7XHJcbiAgY3R4LmZpbGxTdHlsZSA9IFwiIzc3N1wiO1xyXG4gIGN0eC5saW5lV2lkdGggPSAxIC8gem9vbTtcclxuICBjdHguYmVnaW5QYXRoKCk7XHJcblxyXG4gIHZhciBrO1xyXG4gIGlmKGNhbWVyYS5wb3MueCAtIDEwID4gMCl7XHJcbiAgICBrID0gTWF0aC5mbG9vcigoY2FtZXJhLnBvcy54IC0gMTApIC8gMS41KTtcclxuICB9IGVsc2Uge1xyXG4gICAgayA9IDA7XHJcbiAgfVxyXG5cclxuICAvLyBjb25zb2xlLmxvZyhrKTtcclxuXHJcbiAgb3V0ZXJfbG9vcDpcclxuICAgIGZvciAoazsgayA8IGN3X2Zsb29yVGlsZXMubGVuZ3RoOyBrKyspIHtcclxuICAgICAgdmFyIGIgPSBjd19mbG9vclRpbGVzW2tdO1xyXG4gICAgICBmb3IgKHZhciBmID0gYi5HZXRGaXh0dXJlTGlzdCgpOyBmOyBmID0gZi5tX25leHQpIHtcclxuICAgICAgICB2YXIgcyA9IGYuR2V0U2hhcGUoKTtcclxuICAgICAgICB2YXIgc2hhcGVQb3NpdGlvbiA9IGIuR2V0V29ybGRQb2ludChzLm1fdmVydGljZXNbMF0pLng7XHJcbiAgICAgICAgaWYgKChzaGFwZVBvc2l0aW9uID4gKGNhbWVyYV94IC0gNSkpICYmIChzaGFwZVBvc2l0aW9uIDwgKGNhbWVyYV94ICsgMTApKSkge1xyXG4gICAgICAgICAgY3dfZHJhd1ZpcnR1YWxQb2x5KGN0eCwgYiwgcy5tX3ZlcnRpY2VzLCBzLm1fdmVydGV4Q291bnQpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAoc2hhcGVQb3NpdGlvbiA+IGNhbWVyYV94ICsgMTApIHtcclxuICAgICAgICAgIGJyZWFrIG91dGVyX2xvb3A7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgY3R4LmZpbGwoKTtcclxuICBjdHguc3Ryb2tlKCk7XHJcbn1cclxuIiwiXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGN0eCwgYm9keSwgdnR4LCBuX3Z0eCkge1xyXG4gIC8vIHNldCBzdHJva2VzdHlsZSBhbmQgZmlsbHN0eWxlIGJlZm9yZSBjYWxsXHJcbiAgLy8gY2FsbCBiZWdpblBhdGggYmVmb3JlIGNhbGxcclxuXHJcbiAgdmFyIHAwID0gYm9keS5HZXRXb3JsZFBvaW50KHZ0eFswXSk7XHJcbiAgY3R4Lm1vdmVUbyhwMC54LCBwMC55KTtcclxuICBmb3IgKHZhciBpID0gMTsgaSA8IG5fdnR4OyBpKyspIHtcclxuICAgIHZhciBwID0gYm9keS5HZXRXb3JsZFBvaW50KHZ0eFtpXSk7XHJcbiAgICBjdHgubGluZVRvKHAueCwgcC55KTtcclxuICB9XHJcbiAgY3R4LmxpbmVUbyhwMC54LCBwMC55KTtcclxufVxyXG4iLCJ2YXIgc2NhdHRlclBsb3QgPSByZXF1aXJlKFwiLi9zY2F0dGVyLXBsb3RcIik7XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IHtcclxuICBwbG90R3JhcGhzOiBmdW5jdGlvbihncmFwaEVsZW0sIHRvcFNjb3Jlc0VsZW0sIHNjYXR0ZXJQbG90RWxlbSwgbGFzdFN0YXRlLCBzY29yZXMsIGNvbmZpZykge1xyXG4gICAgbGFzdFN0YXRlID0gbGFzdFN0YXRlIHx8IHt9O1xyXG4gICAgdmFyIGdlbmVyYXRpb25TaXplID0gc2NvcmVzLmxlbmd0aFxyXG4gICAgdmFyIGdyYXBoY2FudmFzID0gZ3JhcGhFbGVtO1xyXG4gICAgdmFyIGdyYXBoY3R4ID0gZ3JhcGhjYW52YXMuZ2V0Q29udGV4dChcIjJkXCIpO1xyXG4gICAgdmFyIGdyYXBod2lkdGggPSA0MDA7XHJcbiAgICB2YXIgZ3JhcGhoZWlnaHQgPSAyNTA7XHJcbiAgICB2YXIgbmV4dFN0YXRlID0gY3dfc3RvcmVHcmFwaFNjb3JlcyhcclxuICAgICAgbGFzdFN0YXRlLCBzY29yZXMsIGdlbmVyYXRpb25TaXplXHJcbiAgICApO1xyXG4gICAgY29uc29sZS5sb2coc2NvcmVzLCBuZXh0U3RhdGUpO1xyXG4gICAgY3dfY2xlYXJHcmFwaGljcyhncmFwaGNhbnZhcywgZ3JhcGhjdHgsIGdyYXBod2lkdGgsIGdyYXBoaGVpZ2h0KTtcclxuICAgIGN3X3Bsb3RBdmVyYWdlKG5leHRTdGF0ZSwgZ3JhcGhjdHgpO1xyXG4gICAgY3dfcGxvdEVsaXRlKG5leHRTdGF0ZSwgZ3JhcGhjdHgpO1xyXG4gICAgY3dfcGxvdFRvcChuZXh0U3RhdGUsIGdyYXBoY3R4KTtcclxuICAgIGN3X2xpc3RUb3BTY29yZXModG9wU2NvcmVzRWxlbSwgbmV4dFN0YXRlKTtcclxuICAgIG5leHRTdGF0ZS5zY2F0dGVyR3JhcGggPSBkcmF3QWxsUmVzdWx0cyhcclxuICAgICAgc2NhdHRlclBsb3RFbGVtLCBjb25maWcsIG5leHRTdGF0ZSwgbGFzdFN0YXRlLnNjYXR0ZXJHcmFwaFxyXG4gICAgKTtcclxuICAgIHJldHVybiBuZXh0U3RhdGU7XHJcbiAgfSxcclxuICBjbGVhckdyYXBoaWNzOiBmdW5jdGlvbihncmFwaEVsZW0pIHtcclxuICAgIHZhciBncmFwaGNhbnZhcyA9IGdyYXBoRWxlbTtcclxuICAgIHZhciBncmFwaGN0eCA9IGdyYXBoY2FudmFzLmdldENvbnRleHQoXCIyZFwiKTtcclxuICAgIHZhciBncmFwaHdpZHRoID0gNDAwO1xyXG4gICAgdmFyIGdyYXBoaGVpZ2h0ID0gMjUwO1xyXG4gICAgY3dfY2xlYXJHcmFwaGljcyhncmFwaGNhbnZhcywgZ3JhcGhjdHgsIGdyYXBod2lkdGgsIGdyYXBoaGVpZ2h0KTtcclxuICB9XHJcbn07XHJcblxyXG5cclxuZnVuY3Rpb24gY3dfc3RvcmVHcmFwaFNjb3JlcyhsYXN0U3RhdGUsIGN3X2NhclNjb3JlcywgZ2VuZXJhdGlvblNpemUpIHtcclxuICBjb25zb2xlLmxvZyhjd19jYXJTY29yZXMpO1xyXG4gIHJldHVybiB7XHJcbiAgICBjd190b3BTY29yZXM6IChsYXN0U3RhdGUuY3dfdG9wU2NvcmVzIHx8IFtdKVxyXG4gICAgLmNvbmNhdChbY3dfY2FyU2NvcmVzWzBdLnNjb3JlXSksXHJcbiAgICBjd19ncmFwaEF2ZXJhZ2U6IChsYXN0U3RhdGUuY3dfZ3JhcGhBdmVyYWdlIHx8IFtdKS5jb25jYXQoW1xyXG4gICAgICBjd19hdmVyYWdlKGN3X2NhclNjb3JlcywgZ2VuZXJhdGlvblNpemUpXHJcbiAgICBdKSxcclxuICAgIGN3X2dyYXBoRWxpdGU6IChsYXN0U3RhdGUuY3dfZ3JhcGhFbGl0ZSB8fCBbXSkuY29uY2F0KFtcclxuICAgICAgY3dfZWxpdGVhdmVyYWdlKGN3X2NhclNjb3JlcywgZ2VuZXJhdGlvblNpemUpXHJcbiAgICBdKSxcclxuICAgIGN3X2dyYXBoVG9wOiAobGFzdFN0YXRlLmN3X2dyYXBoVG9wIHx8IFtdKS5jb25jYXQoW1xyXG4gICAgICBjd19jYXJTY29yZXNbMF0uc2NvcmUudlxyXG4gICAgXSksXHJcbiAgICBhbGxSZXN1bHRzOiAobGFzdFN0YXRlLmFsbFJlc3VsdHMgfHwgW10pLmNvbmNhdChjd19jYXJTY29yZXMpLFxyXG4gIH1cclxufVxyXG5cclxuZnVuY3Rpb24gY3dfcGxvdFRvcChzdGF0ZSwgZ3JhcGhjdHgpIHtcclxuICB2YXIgY3dfZ3JhcGhUb3AgPSBzdGF0ZS5jd19ncmFwaFRvcDtcclxuICB2YXIgZ3JhcGhzaXplID0gY3dfZ3JhcGhUb3AubGVuZ3RoO1xyXG4gIGdyYXBoY3R4LnN0cm9rZVN0eWxlID0gXCIjQzgzQjNCXCI7XHJcbiAgZ3JhcGhjdHguYmVnaW5QYXRoKCk7XHJcbiAgZ3JhcGhjdHgubW92ZVRvKDAsIDApO1xyXG4gIGZvciAodmFyIGsgPSAwOyBrIDwgZ3JhcGhzaXplOyBrKyspIHtcclxuICAgIGdyYXBoY3R4LmxpbmVUbyg0MDAgKiAoayArIDEpIC8gZ3JhcGhzaXplLCBjd19ncmFwaFRvcFtrXSk7XHJcbiAgfVxyXG4gIGdyYXBoY3R4LnN0cm9rZSgpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBjd19wbG90RWxpdGUoc3RhdGUsIGdyYXBoY3R4KSB7XHJcbiAgdmFyIGN3X2dyYXBoRWxpdGUgPSBzdGF0ZS5jd19ncmFwaEVsaXRlO1xyXG4gIHZhciBncmFwaHNpemUgPSBjd19ncmFwaEVsaXRlLmxlbmd0aDtcclxuICBncmFwaGN0eC5zdHJva2VTdHlsZSA9IFwiIzdCQzc0RFwiO1xyXG4gIGdyYXBoY3R4LmJlZ2luUGF0aCgpO1xyXG4gIGdyYXBoY3R4Lm1vdmVUbygwLCAwKTtcclxuICBmb3IgKHZhciBrID0gMDsgayA8IGdyYXBoc2l6ZTsgaysrKSB7XHJcbiAgICBncmFwaGN0eC5saW5lVG8oNDAwICogKGsgKyAxKSAvIGdyYXBoc2l6ZSwgY3dfZ3JhcGhFbGl0ZVtrXSk7XHJcbiAgfVxyXG4gIGdyYXBoY3R4LnN0cm9rZSgpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBjd19wbG90QXZlcmFnZShzdGF0ZSwgZ3JhcGhjdHgpIHtcclxuICB2YXIgY3dfZ3JhcGhBdmVyYWdlID0gc3RhdGUuY3dfZ3JhcGhBdmVyYWdlO1xyXG4gIHZhciBncmFwaHNpemUgPSBjd19ncmFwaEF2ZXJhZ2UubGVuZ3RoO1xyXG4gIGdyYXBoY3R4LnN0cm9rZVN0eWxlID0gXCIjM0Y3MkFGXCI7XHJcbiAgZ3JhcGhjdHguYmVnaW5QYXRoKCk7XHJcbiAgZ3JhcGhjdHgubW92ZVRvKDAsIDApO1xyXG4gIGZvciAodmFyIGsgPSAwOyBrIDwgZ3JhcGhzaXplOyBrKyspIHtcclxuICAgIGdyYXBoY3R4LmxpbmVUbyg0MDAgKiAoayArIDEpIC8gZ3JhcGhzaXplLCBjd19ncmFwaEF2ZXJhZ2Vba10pO1xyXG4gIH1cclxuICBncmFwaGN0eC5zdHJva2UoKTtcclxufVxyXG5cclxuXHJcbmZ1bmN0aW9uIGN3X2VsaXRlYXZlcmFnZShzY29yZXMsIGdlbmVyYXRpb25TaXplKSB7XHJcbiAgdmFyIHN1bSA9IDA7XHJcbiAgZm9yICh2YXIgayA9IDA7IGsgPCBNYXRoLmZsb29yKGdlbmVyYXRpb25TaXplIC8gMik7IGsrKykge1xyXG4gICAgc3VtICs9IHNjb3Jlc1trXS5zY29yZS52O1xyXG4gIH1cclxuICByZXR1cm4gc3VtIC8gTWF0aC5mbG9vcihnZW5lcmF0aW9uU2l6ZSAvIDIpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBjd19hdmVyYWdlKHNjb3JlcywgZ2VuZXJhdGlvblNpemUpIHtcclxuICB2YXIgc3VtID0gMDtcclxuICBmb3IgKHZhciBrID0gMDsgayA8IGdlbmVyYXRpb25TaXplOyBrKyspIHtcclxuICAgIHN1bSArPSBzY29yZXNba10uc2NvcmUudjtcclxuICB9XHJcbiAgcmV0dXJuIHN1bSAvIGdlbmVyYXRpb25TaXplO1xyXG59XHJcblxyXG5mdW5jdGlvbiBjd19jbGVhckdyYXBoaWNzKGdyYXBoY2FudmFzLCBncmFwaGN0eCwgZ3JhcGh3aWR0aCwgZ3JhcGhoZWlnaHQpIHtcclxuICBncmFwaGNhbnZhcy53aWR0aCA9IGdyYXBoY2FudmFzLndpZHRoO1xyXG4gIGdyYXBoY3R4LnRyYW5zbGF0ZSgwLCBncmFwaGhlaWdodCk7XHJcbiAgZ3JhcGhjdHguc2NhbGUoMSwgLTEpO1xyXG4gIGdyYXBoY3R4LmxpbmVXaWR0aCA9IDE7XHJcbiAgZ3JhcGhjdHguc3Ryb2tlU3R5bGUgPSBcIiMzRjcyQUZcIjtcclxuICBncmFwaGN0eC5iZWdpblBhdGgoKTtcclxuICBncmFwaGN0eC5tb3ZlVG8oMCwgZ3JhcGhoZWlnaHQgLyAyKTtcclxuICBncmFwaGN0eC5saW5lVG8oZ3JhcGh3aWR0aCwgZ3JhcGhoZWlnaHQgLyAyKTtcclxuICBncmFwaGN0eC5tb3ZlVG8oMCwgZ3JhcGhoZWlnaHQgLyA0KTtcclxuICBncmFwaGN0eC5saW5lVG8oZ3JhcGh3aWR0aCwgZ3JhcGhoZWlnaHQgLyA0KTtcclxuICBncmFwaGN0eC5tb3ZlVG8oMCwgZ3JhcGhoZWlnaHQgKiAzIC8gNCk7XHJcbiAgZ3JhcGhjdHgubGluZVRvKGdyYXBod2lkdGgsIGdyYXBoaGVpZ2h0ICogMyAvIDQpO1xyXG4gIGdyYXBoY3R4LnN0cm9rZSgpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBjd19saXN0VG9wU2NvcmVzKGVsZW0sIHN0YXRlKSB7XHJcbiAgdmFyIGN3X3RvcFNjb3JlcyA9IHN0YXRlLmN3X3RvcFNjb3JlcztcclxuICB2YXIgdHMgPSBlbGVtO1xyXG4gIHRzLmlubmVySFRNTCA9IFwiPGI+VG9wIFNjb3Jlczo8L2I+PGJyIC8+XCI7XHJcbiAgY3dfdG9wU2NvcmVzLnNvcnQoZnVuY3Rpb24gKGEsIGIpIHtcclxuICAgIGlmIChhLnYgPiBiLnYpIHtcclxuICAgICAgcmV0dXJuIC0xXHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICByZXR1cm4gMVxyXG4gICAgfVxyXG4gIH0pO1xyXG5cclxuICBmb3IgKHZhciBrID0gMDsgayA8IE1hdGgubWluKDEwLCBjd190b3BTY29yZXMubGVuZ3RoKTsgaysrKSB7XHJcbiAgICB2YXIgdG9wU2NvcmUgPSBjd190b3BTY29yZXNba107XHJcbiAgICAvLyBjb25zb2xlLmxvZyh0b3BTY29yZSk7XHJcbiAgICB2YXIgbiA9IFwiI1wiICsgKGsgKyAxKSArIFwiOlwiO1xyXG4gICAgdmFyIHNjb3JlID0gTWF0aC5yb3VuZCh0b3BTY29yZS52ICogMTAwKSAvIDEwMDtcclxuICAgIHZhciBkaXN0YW5jZSA9IFwiZDpcIiArIE1hdGgucm91bmQodG9wU2NvcmUueCAqIDEwMCkgLyAxMDA7XHJcbiAgICB2YXIgeXJhbmdlID0gIFwiaDpcIiArIE1hdGgucm91bmQodG9wU2NvcmUueTIgKiAxMDApIC8gMTAwICsgXCIvXCIgKyBNYXRoLnJvdW5kKHRvcFNjb3JlLnkgKiAxMDApIC8gMTAwICsgXCJtXCI7XHJcbiAgICB2YXIgZ2VuID0gXCIoR2VuIFwiICsgY3dfdG9wU2NvcmVzW2tdLmkgKyBcIilcIlxyXG5cclxuICAgIHRzLmlubmVySFRNTCArPSAgW24sIHNjb3JlLCBkaXN0YW5jZSwgeXJhbmdlLCBnZW5dLmpvaW4oXCIgXCIpICsgXCI8YnIgLz5cIjtcclxuICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGRyYXdBbGxSZXN1bHRzKHNjYXR0ZXJQbG90RWxlbSwgY29uZmlnLCBhbGxSZXN1bHRzLCBwcmV2aW91c0dyYXBoKXtcclxuICBpZighc2NhdHRlclBsb3RFbGVtKSByZXR1cm47XHJcbiAgcmV0dXJuIHNjYXR0ZXJQbG90KHNjYXR0ZXJQbG90RWxlbSwgYWxsUmVzdWx0cywgY29uZmlnLnByb3BlcnR5TWFwLCBwcmV2aW91c0dyYXBoKVxyXG59XHJcbiIsIi8qIGdsb2JhbHMgdmlzIEhpZ2hjaGFydHMgKi9cclxuXHJcbi8vIENhbGxlZCB3aGVuIHRoZSBWaXN1YWxpemF0aW9uIEFQSSBpcyBsb2FkZWQuXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IGhpZ2hDaGFydHM7XHJcbmZ1bmN0aW9uIGhpZ2hDaGFydHMoZWxlbSwgc2NvcmVzKXtcclxuICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKHNjb3Jlc1swXS5kZWYpO1xyXG4gIGtleXMgPSBrZXlzLnJlZHVjZShmdW5jdGlvbihjdXJBcnJheSwga2V5KXtcclxuICAgIHZhciBsID0gc2NvcmVzWzBdLmRlZltrZXldLmxlbmd0aDtcclxuICAgIHZhciBzdWJBcnJheSA9IFtdO1xyXG4gICAgZm9yKHZhciBpID0gMDsgaSA8IGw7IGkrKyl7XHJcbiAgICAgIHN1YkFycmF5LnB1c2goa2V5ICsgXCIuXCIgKyBpKTtcclxuICAgIH1cclxuICAgIHJldHVybiBjdXJBcnJheS5jb25jYXQoc3ViQXJyYXkpO1xyXG4gIH0sIFtdKTtcclxuICBmdW5jdGlvbiByZXRyaWV2ZVZhbHVlKG9iaiwgcGF0aCl7XHJcbiAgICByZXR1cm4gcGF0aC5zcGxpdChcIi5cIikucmVkdWNlKGZ1bmN0aW9uKGN1clZhbHVlLCBrZXkpe1xyXG4gICAgICByZXR1cm4gY3VyVmFsdWVba2V5XTtcclxuICAgIH0sIG9iaik7XHJcbiAgfVxyXG5cclxuICB2YXIgZGF0YU9iaiA9IE9iamVjdC5rZXlzKHNjb3JlcykucmVkdWNlKGZ1bmN0aW9uKGt2LCBzY29yZSl7XHJcbiAgICBrZXlzLmZvckVhY2goZnVuY3Rpb24oa2V5KXtcclxuICAgICAga3Zba2V5XS5kYXRhLnB1c2goW1xyXG4gICAgICAgIHJldHJpZXZlVmFsdWUoc2NvcmUuZGVmLCBrZXkpLCBzY29yZS5zY29yZS52XHJcbiAgICAgIF0pXHJcbiAgICB9KVxyXG4gICAgcmV0dXJuIGt2O1xyXG4gIH0sIGtleXMucmVkdWNlKGZ1bmN0aW9uKGt2LCBrZXkpe1xyXG4gICAga3Zba2V5XSA9IHtcclxuICAgICAgbmFtZToga2V5LFxyXG4gICAgICBkYXRhOiBbXSxcclxuICAgIH1cclxuICAgIHJldHVybiBrdjtcclxuICB9LCB7fSkpXHJcbiAgSGlnaGNoYXJ0cy5jaGFydChlbGVtLmlkLCB7XHJcbiAgICAgIGNoYXJ0OiB7XHJcbiAgICAgICAgICB0eXBlOiAnc2NhdHRlcicsXHJcbiAgICAgICAgICB6b29tVHlwZTogJ3h5J1xyXG4gICAgICB9LFxyXG4gICAgICB0aXRsZToge1xyXG4gICAgICAgICAgdGV4dDogJ1Byb3BlcnR5IFZhbHVlIHRvIFNjb3JlJ1xyXG4gICAgICB9LFxyXG4gICAgICB4QXhpczoge1xyXG4gICAgICAgICAgdGl0bGU6IHtcclxuICAgICAgICAgICAgICBlbmFibGVkOiB0cnVlLFxyXG4gICAgICAgICAgICAgIHRleHQ6ICdOb3JtYWxpemVkJ1xyXG4gICAgICAgICAgfSxcclxuICAgICAgICAgIHN0YXJ0T25UaWNrOiB0cnVlLFxyXG4gICAgICAgICAgZW5kT25UaWNrOiB0cnVlLFxyXG4gICAgICAgICAgc2hvd0xhc3RMYWJlbDogdHJ1ZVxyXG4gICAgICB9LFxyXG4gICAgICB5QXhpczoge1xyXG4gICAgICAgICAgdGl0bGU6IHtcclxuICAgICAgICAgICAgICB0ZXh0OiAnU2NvcmUnXHJcbiAgICAgICAgICB9XHJcbiAgICAgIH0sXHJcbiAgICAgIGxlZ2VuZDoge1xyXG4gICAgICAgICAgbGF5b3V0OiAndmVydGljYWwnLFxyXG4gICAgICAgICAgYWxpZ246ICdsZWZ0JyxcclxuICAgICAgICAgIHZlcnRpY2FsQWxpZ246ICd0b3AnLFxyXG4gICAgICAgICAgeDogMTAwLFxyXG4gICAgICAgICAgeTogNzAsXHJcbiAgICAgICAgICBmbG9hdGluZzogdHJ1ZSxcclxuICAgICAgICAgIGJhY2tncm91bmRDb2xvcjogKEhpZ2hjaGFydHMudGhlbWUgJiYgSGlnaGNoYXJ0cy50aGVtZS5sZWdlbmRCYWNrZ3JvdW5kQ29sb3IpIHx8ICcjRkZGRkZGJyxcclxuICAgICAgICAgIGJvcmRlcldpZHRoOiAxXHJcbiAgICAgIH0sXHJcbiAgICAgIHBsb3RPcHRpb25zOiB7XHJcbiAgICAgICAgICBzY2F0dGVyOiB7XHJcbiAgICAgICAgICAgICAgbWFya2VyOiB7XHJcbiAgICAgICAgICAgICAgICAgIHJhZGl1czogNSxcclxuICAgICAgICAgICAgICAgICAgc3RhdGVzOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICBob3Zlcjoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgIGVuYWJsZWQ6IHRydWUsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgbGluZUNvbG9yOiAncmdiKDEwMCwxMDAsMTAwKSdcclxuICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgc3RhdGVzOiB7XHJcbiAgICAgICAgICAgICAgICAgIGhvdmVyOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICBtYXJrZXI6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICBlbmFibGVkOiBmYWxzZVxyXG4gICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICB0b29sdGlwOiB7XHJcbiAgICAgICAgICAgICAgICAgIGhlYWRlckZvcm1hdDogJzxiPntzZXJpZXMubmFtZX08L2I+PGJyPicsXHJcbiAgICAgICAgICAgICAgICAgIHBvaW50Rm9ybWF0OiAne3BvaW50Lnh9LCB7cG9pbnQueX0nXHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfVxyXG4gICAgICB9LFxyXG4gICAgICBzZXJpZXM6IGtleXMubWFwKGZ1bmN0aW9uKGtleSl7XHJcbiAgICAgICAgcmV0dXJuIGRhdGFPYmpba2V5XTtcclxuICAgICAgfSlcclxuICB9KTtcclxufVxyXG5cclxuZnVuY3Rpb24gdmlzQ2hhcnQoZWxlbSwgc2NvcmVzLCBwcm9wZXJ0eU1hcCwgZ3JhcGgpIHtcclxuXHJcbiAgLy8gQ3JlYXRlIGFuZCBwb3B1bGF0ZSBhIGRhdGEgdGFibGUuXHJcbiAgdmFyIGRhdGEgPSBuZXcgdmlzLkRhdGFTZXQoKTtcclxuICBzY29yZXMuZm9yRWFjaChmdW5jdGlvbihzY29yZUluZm8pe1xyXG4gICAgZGF0YS5hZGQoe1xyXG4gICAgICB4OiBnZXRQcm9wZXJ0eShzY29yZUluZm8sIHByb3BlcnR5TWFwLngpLFxyXG4gICAgICB5OiBnZXRQcm9wZXJ0eShzY29yZUluZm8sIHByb3BlcnR5TWFwLngpLFxyXG4gICAgICB6OiBnZXRQcm9wZXJ0eShzY29yZUluZm8sIHByb3BlcnR5TWFwLnopLFxyXG4gICAgICBzdHlsZTogZ2V0UHJvcGVydHkoc2NvcmVJbmZvLCBwcm9wZXJ0eU1hcC56KSxcclxuICAgICAgLy8gZXh0cmE6IGRlZi5hbmNlc3RyeVxyXG4gICAgfSk7XHJcbiAgfSk7XHJcblxyXG4gIGZ1bmN0aW9uIGdldFByb3BlcnR5KGluZm8sIGtleSl7XHJcbiAgICBpZihrZXkgPT09IFwic2NvcmVcIil7XHJcbiAgICAgIHJldHVybiBpbmZvLnNjb3JlLnZcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIHJldHVybiBpbmZvLmRlZltrZXldO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLy8gc3BlY2lmeSBvcHRpb25zXHJcbiAgdmFyIG9wdGlvbnMgPSB7XHJcbiAgICB3aWR0aDogICc2MDBweCcsXHJcbiAgICBoZWlnaHQ6ICc2MDBweCcsXHJcbiAgICBzdHlsZTogJ2RvdC1zaXplJyxcclxuICAgIHNob3dQZXJzcGVjdGl2ZTogdHJ1ZSxcclxuICAgIHNob3dMZWdlbmQ6IHRydWUsXHJcbiAgICBzaG93R3JpZDogdHJ1ZSxcclxuICAgIHNob3dTaGFkb3c6IGZhbHNlLFxyXG5cclxuICAgIC8vIE9wdGlvbiB0b29sdGlwIGNhbiBiZSB0cnVlLCBmYWxzZSwgb3IgYSBmdW5jdGlvbiByZXR1cm5pbmcgYSBzdHJpbmcgd2l0aCBIVE1MIGNvbnRlbnRzXHJcbiAgICB0b29sdGlwOiBmdW5jdGlvbiAocG9pbnQpIHtcclxuICAgICAgLy8gcGFyYW1ldGVyIHBvaW50IGNvbnRhaW5zIHByb3BlcnRpZXMgeCwgeSwgeiwgYW5kIGRhdGFcclxuICAgICAgLy8gZGF0YSBpcyB0aGUgb3JpZ2luYWwgb2JqZWN0IHBhc3NlZCB0byB0aGUgcG9pbnQgY29uc3RydWN0b3JcclxuICAgICAgcmV0dXJuICdzY29yZTogPGI+JyArIHBvaW50LnogKyAnPC9iPjxicj4nOyAvLyArIHBvaW50LmRhdGEuZXh0cmE7XHJcbiAgICB9LFxyXG5cclxuICAgIC8vIFRvb2x0aXAgZGVmYXVsdCBzdHlsaW5nIGNhbiBiZSBvdmVycmlkZGVuXHJcbiAgICB0b29sdGlwU3R5bGU6IHtcclxuICAgICAgY29udGVudDoge1xyXG4gICAgICAgIGJhY2tncm91bmQgICAgOiAncmdiYSgyNTUsIDI1NSwgMjU1LCAwLjcpJyxcclxuICAgICAgICBwYWRkaW5nICAgICAgIDogJzEwcHgnLFxyXG4gICAgICAgIGJvcmRlclJhZGl1cyAgOiAnMTBweCdcclxuICAgICAgfSxcclxuICAgICAgbGluZToge1xyXG4gICAgICAgIGJvcmRlckxlZnQgICAgOiAnMXB4IGRvdHRlZCByZ2JhKDAsIDAsIDAsIDAuNSknXHJcbiAgICAgIH0sXHJcbiAgICAgIGRvdDoge1xyXG4gICAgICAgIGJvcmRlciAgICAgICAgOiAnNXB4IHNvbGlkIHJnYmEoMCwgMCwgMCwgMC41KSdcclxuICAgICAgfVxyXG4gICAgfSxcclxuXHJcbiAgICBrZWVwQXNwZWN0UmF0aW86IHRydWUsXHJcbiAgICB2ZXJ0aWNhbFJhdGlvOiAwLjVcclxuICB9O1xyXG5cclxuICB2YXIgY2FtZXJhID0gZ3JhcGggPyBncmFwaC5nZXRDYW1lcmFQb3NpdGlvbigpIDogbnVsbDtcclxuXHJcbiAgLy8gY3JlYXRlIG91ciBncmFwaFxyXG4gIHZhciBjb250YWluZXIgPSBlbGVtO1xyXG4gIGdyYXBoID0gbmV3IHZpcy5HcmFwaDNkKGNvbnRhaW5lciwgZGF0YSwgb3B0aW9ucyk7XHJcblxyXG4gIGlmIChjYW1lcmEpIGdyYXBoLnNldENhbWVyYVBvc2l0aW9uKGNhbWVyYSk7IC8vIHJlc3RvcmUgY2FtZXJhIHBvc2l0aW9uXHJcbiAgcmV0dXJuIGdyYXBoO1xyXG59XHJcbiIsIlxyXG5tb2R1bGUuZXhwb3J0cyA9IGdlbmVyYXRlUmFuZG9tO1xyXG5mdW5jdGlvbiBnZW5lcmF0ZVJhbmRvbSgpe1xyXG4gIHJldHVybiBNYXRoLnJhbmRvbSgpO1xyXG59XHJcbiIsIi8vIGh0dHA6Ly9zdW5taW5ndGFvLmJsb2dzcG90LmNvbS8yMDE2LzExL2luYnJlZWRpbmctY29lZmZpY2llbnQuaHRtbFxyXG5tb2R1bGUuZXhwb3J0cyA9IGdldEluYnJlZWRpbmdDb2VmZmljaWVudDtcclxuXHJcbmZ1bmN0aW9uIGdldEluYnJlZWRpbmdDb2VmZmljaWVudChjaGlsZCl7XHJcbiAgdmFyIG5hbWVJbmRleCA9IG5ldyBNYXAoKTtcclxuICB2YXIgZmxhZ2dlZCA9IG5ldyBTZXQoKTtcclxuICB2YXIgY29udmVyZ2VuY2VQb2ludHMgPSBuZXcgU2V0KCk7XHJcbiAgY3JlYXRlQW5jZXN0cnlNYXAoY2hpbGQsIFtdKTtcclxuXHJcbiAgdmFyIHN0b3JlZENvZWZmaWNpZW50cyA9IG5ldyBNYXAoKTtcclxuXHJcbiAgcmV0dXJuIEFycmF5LmZyb20oY29udmVyZ2VuY2VQb2ludHMudmFsdWVzKCkpLnJlZHVjZShmdW5jdGlvbihzdW0sIHBvaW50KXtcclxuICAgIHZhciBpQ28gPSBnZXRDb2VmZmljaWVudChwb2ludCk7XHJcbiAgICByZXR1cm4gc3VtICsgaUNvO1xyXG4gIH0sIDApO1xyXG5cclxuICBmdW5jdGlvbiBjcmVhdGVBbmNlc3RyeU1hcChpbml0Tm9kZSl7XHJcbiAgICB2YXIgaXRlbXNJblF1ZXVlID0gW3sgbm9kZTogaW5pdE5vZGUsIHBhdGg6IFtdIH1dO1xyXG4gICAgZG97XHJcbiAgICAgIHZhciBpdGVtID0gaXRlbXNJblF1ZXVlLnNoaWZ0KCk7XHJcbiAgICAgIHZhciBub2RlID0gaXRlbS5ub2RlO1xyXG4gICAgICB2YXIgcGF0aCA9IGl0ZW0ucGF0aDtcclxuICAgICAgaWYocHJvY2Vzc0l0ZW0obm9kZSwgcGF0aCkpe1xyXG4gICAgICAgIHZhciBuZXh0UGF0aCA9IFsgbm9kZS5pZCBdLmNvbmNhdChwYXRoKTtcclxuICAgICAgICBpdGVtc0luUXVldWUgPSBpdGVtc0luUXVldWUuY29uY2F0KG5vZGUuYW5jZXN0cnkubWFwKGZ1bmN0aW9uKHBhcmVudCl7XHJcbiAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICBub2RlOiBwYXJlbnQsXHJcbiAgICAgICAgICAgIHBhdGg6IG5leHRQYXRoXHJcbiAgICAgICAgICB9O1xyXG4gICAgICAgIH0pKTtcclxuICAgICAgfVxyXG4gICAgfXdoaWxlKGl0ZW1zSW5RdWV1ZS5sZW5ndGgpO1xyXG5cclxuXHJcbiAgICBmdW5jdGlvbiBwcm9jZXNzSXRlbShub2RlLCBwYXRoKXtcclxuICAgICAgdmFyIG5ld0FuY2VzdG9yID0gIW5hbWVJbmRleC5oYXMobm9kZS5pZCk7XHJcbiAgICAgIGlmKG5ld0FuY2VzdG9yKXtcclxuICAgICAgICBuYW1lSW5kZXguc2V0KG5vZGUuaWQsIHtcclxuICAgICAgICAgIHBhcmVudHM6IChub2RlLmFuY2VzdHJ5IHx8IFtdKS5tYXAoZnVuY3Rpb24ocGFyZW50KXtcclxuICAgICAgICAgICAgcmV0dXJuIHBhcmVudC5pZDtcclxuICAgICAgICAgIH0pLFxyXG4gICAgICAgICAgaWQ6IG5vZGUuaWQsXHJcbiAgICAgICAgICBjaGlsZHJlbjogW10sXHJcbiAgICAgICAgICBjb252ZXJnZW5jZXM6IFtdLFxyXG4gICAgICAgIH0pO1xyXG4gICAgICB9IGVsc2Uge1xyXG5cclxuICAgICAgICBmbGFnZ2VkLmFkZChub2RlLmlkKVxyXG4gICAgICAgIG5hbWVJbmRleC5nZXQobm9kZS5pZCkuY2hpbGRyZW4uZm9yRWFjaChmdW5jdGlvbihjaGlsZElkZW50aWZpZXIpe1xyXG4gICAgICAgICAgdmFyIG9mZnNldHMgPSBmaW5kQ29udmVyZ2VuY2UoY2hpbGRJZGVudGlmaWVyLnBhdGgsIHBhdGgpO1xyXG4gICAgICAgICAgaWYoIW9mZnNldHMpe1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICB2YXIgY2hpbGRJRCA9IHBhdGhbb2Zmc2V0c1sxXV07XHJcbiAgICAgICAgICBjb252ZXJnZW5jZVBvaW50cy5hZGQoY2hpbGRJRCk7XHJcbiAgICAgICAgICBuYW1lSW5kZXguZ2V0KGNoaWxkSUQpLmNvbnZlcmdlbmNlcy5wdXNoKHtcclxuICAgICAgICAgICAgcGFyZW50OiBub2RlLmlkLFxyXG4gICAgICAgICAgICBvZmZzZXRzOiBvZmZzZXRzLFxyXG4gICAgICAgICAgfSk7XHJcbiAgICAgICAgfSk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGlmKHBhdGgubGVuZ3RoKXtcclxuICAgICAgICBuYW1lSW5kZXguZ2V0KG5vZGUuaWQpLmNoaWxkcmVuLnB1c2goe1xyXG4gICAgICAgICAgY2hpbGQ6IHBhdGhbMF0sXHJcbiAgICAgICAgICBwYXRoOiBwYXRoXHJcbiAgICAgICAgfSk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGlmKCFuZXdBbmNlc3Rvcil7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgICB9XHJcbiAgICAgIGlmKCFub2RlLmFuY2VzdHJ5KXtcclxuICAgICAgICByZXR1cm47XHJcbiAgICAgIH1cclxuICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBmdW5jdGlvbiBnZXRDb2VmZmljaWVudChpZCl7XHJcbiAgICBpZihzdG9yZWRDb2VmZmljaWVudHMuaGFzKGlkKSl7XHJcbiAgICAgIHJldHVybiBzdG9yZWRDb2VmZmljaWVudHMuZ2V0KGlkKTtcclxuICAgIH1cclxuICAgIHZhciBub2RlID0gbmFtZUluZGV4LmdldChpZCk7XHJcbiAgICB2YXIgdmFsID0gbm9kZS5jb252ZXJnZW5jZXMucmVkdWNlKGZ1bmN0aW9uKHN1bSwgcG9pbnQpe1xyXG4gICAgICByZXR1cm4gc3VtICsgTWF0aC5wb3coMSAvIDIsIHBvaW50Lm9mZnNldHMucmVkdWNlKGZ1bmN0aW9uKHN1bSwgdmFsdWUpe1xyXG4gICAgICAgIHJldHVybiBzdW0gKyB2YWx1ZTtcclxuICAgICAgfSwgMSkpICogKDEgKyBnZXRDb2VmZmljaWVudChwb2ludC5wYXJlbnQpKTtcclxuICAgIH0sIDApO1xyXG4gICAgc3RvcmVkQ29lZmZpY2llbnRzLnNldChpZCwgdmFsKTtcclxuXHJcbiAgICByZXR1cm4gdmFsO1xyXG5cclxuICB9XHJcbiAgZnVuY3Rpb24gZmluZENvbnZlcmdlbmNlKGxpc3RBLCBsaXN0Qil7XHJcbiAgICB2YXIgY2ksIGNqLCBsaSwgbGo7XHJcbiAgICBvdXRlcmxvb3A6XHJcbiAgICBmb3IoY2kgPSAwLCBsaSA9IGxpc3RBLmxlbmd0aDsgY2kgPCBsaTsgY2krKyl7XHJcbiAgICAgIGZvcihjaiA9IDAsIGxqID0gbGlzdEIubGVuZ3RoOyBjaiA8IGxqOyBjaisrKXtcclxuICAgICAgICBpZihsaXN0QVtjaV0gPT09IGxpc3RCW2NqXSl7XHJcbiAgICAgICAgICBicmVhayBvdXRlcmxvb3A7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgICBpZihjaSA9PT0gbGkpe1xyXG4gICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gW2NpLCBjal07XHJcbiAgfVxyXG59XHJcbiIsInZhciBjYXJDb25zdHJ1Y3QgPSByZXF1aXJlKFwiLi4vY2FyLXNjaGVtYS9jb25zdHJ1Y3QuanNcIik7XHJcblxyXG52YXIgY2FyQ29uc3RhbnRzID0gY2FyQ29uc3RydWN0LmNhckNvbnN0YW50cygpO1xyXG5cclxudmFyIHNjaGVtYSA9IGNhckNvbnN0cnVjdC5nZW5lcmF0ZVNjaGVtYShjYXJDb25zdGFudHMpO1xyXG52YXIgcGlja1BhcmVudCA9IHJlcXVpcmUoXCIuL3BpY2tQYXJlbnRcIik7XHJcbnZhciBzZWxlY3RGcm9tQWxsUGFyZW50cyA9IHJlcXVpcmUoXCIuL3NlbGVjdEZyb21BbGxQYXJlbnRzXCIpO1xyXG5jb25zdCBjb25zdGFudHMgPSB7XHJcbiAgZ2VuZXJhdGlvblNpemU6IDQwLFxyXG4gIHNjaGVtYTogc2NoZW1hLFxyXG4gIGNoYW1waW9uTGVuZ3RoOiAxLFxyXG4gIG11dGF0aW9uX3JhbmdlOiAxLFxyXG4gIGdlbl9tdXRhdGlvbjogMC4wNSxcclxufTtcclxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbigpe1xyXG4gIHZhciBjdXJyZW50Q2hvaWNlcyA9IG5ldyBNYXAoKTtcclxuICByZXR1cm4gT2JqZWN0LmFzc2lnbihcclxuICAgIHt9LFxyXG4gICAgY29uc3RhbnRzLFxyXG4gICAge1xyXG4gICAgICBzZWxlY3RGcm9tQWxsUGFyZW50czogc2VsZWN0RnJvbUFsbFBhcmVudHMsXHJcbiAgICAgIGdlbmVyYXRlUmFuZG9tOiByZXF1aXJlKFwiLi9nZW5lcmF0ZVJhbmRvbVwiKSxcclxuICAgICAgcGlja1BhcmVudDogcGlja1BhcmVudC5iaW5kKHZvaWQgMCwgY3VycmVudENob2ljZXMpLFxyXG4gICAgfVxyXG4gICk7XHJcbn1cclxubW9kdWxlLmV4cG9ydHMuY29uc3RhbnRzID0gY29uc3RhbnRzXHJcbiIsInZhciBuQXR0cmlidXRlcyA9IDE1O1xyXG5tb2R1bGUuZXhwb3J0cyA9IHBpY2tQYXJlbnQ7XHJcblxyXG5mdW5jdGlvbiBwaWNrUGFyZW50KGN1cnJlbnRDaG9pY2VzLCBjaG9vc2VJZCwga2V5IC8qICwgcGFyZW50cyAqLyl7XHJcbiAgaWYoIWN1cnJlbnRDaG9pY2VzLmhhcyhjaG9vc2VJZCkpe1xyXG4gICAgY3VycmVudENob2ljZXMuc2V0KGNob29zZUlkLCBpbml0aWFsaXplUGljaygpKVxyXG4gIH1cclxuICAvLyBjb25zb2xlLmxvZyhjaG9vc2VJZCk7XHJcbiAgdmFyIHN0YXRlID0gY3VycmVudENob2ljZXMuZ2V0KGNob29zZUlkKTtcclxuICAvLyBjb25zb2xlLmxvZyhzdGF0ZS5jdXJwYXJlbnQpO1xyXG4gIHN0YXRlLmkrK1xyXG4gIGlmKFtcIndoZWVsX3JhZGl1c1wiLCBcIndoZWVsX3ZlcnRleFwiLCBcIndoZWVsX2RlbnNpdHlcIl0uaW5kZXhPZihrZXkpID4gLTEpe1xyXG4gICAgc3RhdGUuY3VycGFyZW50ID0gY3dfY2hvb3NlUGFyZW50KHN0YXRlKTtcclxuICAgIHJldHVybiBzdGF0ZS5jdXJwYXJlbnQ7XHJcbiAgfVxyXG4gIHN0YXRlLmN1cnBhcmVudCA9IGN3X2Nob29zZVBhcmVudChzdGF0ZSk7XHJcbiAgcmV0dXJuIHN0YXRlLmN1cnBhcmVudDtcclxuXHJcbiAgZnVuY3Rpb24gY3dfY2hvb3NlUGFyZW50KHN0YXRlKSB7XHJcbiAgICB2YXIgY3VycGFyZW50ID0gc3RhdGUuY3VycGFyZW50O1xyXG4gICAgdmFyIGF0dHJpYnV0ZUluZGV4ID0gc3RhdGUuaTtcclxuICAgIHZhciBzd2FwUG9pbnQxID0gc3RhdGUuc3dhcFBvaW50MVxyXG4gICAgdmFyIHN3YXBQb2ludDIgPSBzdGF0ZS5zd2FwUG9pbnQyXHJcbiAgICAvLyBjb25zb2xlLmxvZyhzd2FwUG9pbnQxLCBzd2FwUG9pbnQyLCBhdHRyaWJ1dGVJbmRleClcclxuICAgIGlmICgoc3dhcFBvaW50MSA9PSBhdHRyaWJ1dGVJbmRleCkgfHwgKHN3YXBQb2ludDIgPT0gYXR0cmlidXRlSW5kZXgpKSB7XHJcbiAgICAgIHJldHVybiBjdXJwYXJlbnQgPT0gMSA/IDAgOiAxXHJcbiAgICB9XHJcbiAgICByZXR1cm4gY3VycGFyZW50XHJcbiAgfVxyXG5cclxuICBmdW5jdGlvbiBpbml0aWFsaXplUGljaygpe1xyXG4gICAgdmFyIGN1cnBhcmVudCA9IDA7XHJcblxyXG4gICAgdmFyIHN3YXBQb2ludDEgPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAobkF0dHJpYnV0ZXMpKTtcclxuICAgIHZhciBzd2FwUG9pbnQyID0gc3dhcFBvaW50MTtcclxuICAgIHdoaWxlIChzd2FwUG9pbnQyID09IHN3YXBQb2ludDEpIHtcclxuICAgICAgc3dhcFBvaW50MiA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIChuQXR0cmlidXRlcykpO1xyXG4gICAgfVxyXG4gICAgdmFyIGkgPSAwO1xyXG4gICAgcmV0dXJuIHtcclxuICAgICAgY3VycGFyZW50OiBjdXJwYXJlbnQsXHJcbiAgICAgIGk6IGksXHJcbiAgICAgIHN3YXBQb2ludDE6IHN3YXBQb2ludDEsXHJcbiAgICAgIHN3YXBQb2ludDI6IHN3YXBQb2ludDJcclxuICAgIH1cclxuICB9XHJcbn1cclxuIiwidmFyIGdldEluYnJlZWRpbmdDb2VmZmljaWVudCA9IHJlcXVpcmUoXCIuL2luYnJlZWRpbmctY29lZmZpY2llbnRcIik7XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IHNpbXBsZVNlbGVjdDtcclxuXHJcbmZ1bmN0aW9uIHNpbXBsZVNlbGVjdChwYXJlbnRzKXtcclxuICB2YXIgdG90YWxQYXJlbnRzID0gcGFyZW50cy5sZW5ndGhcclxuICB2YXIgciA9IE1hdGgucmFuZG9tKCk7XHJcbiAgaWYgKHIgPT0gMClcclxuICAgIHJldHVybiAwO1xyXG4gIHJldHVybiBNYXRoLmZsb29yKC1NYXRoLmxvZyhyKSAqIHRvdGFsUGFyZW50cykgJSB0b3RhbFBhcmVudHM7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHNlbGVjdEZyb21BbGxQYXJlbnRzKHBhcmVudHMsIHBhcmVudExpc3QsIHByZXZpb3VzUGFyZW50SW5kZXgpIHtcclxuICB2YXIgcHJldmlvdXNQYXJlbnQgPSBwYXJlbnRzW3ByZXZpb3VzUGFyZW50SW5kZXhdO1xyXG4gIHZhciB2YWxpZFBhcmVudHMgPSBwYXJlbnRzLmZpbHRlcihmdW5jdGlvbihwYXJlbnQsIGkpe1xyXG4gICAgaWYocHJldmlvdXNQYXJlbnRJbmRleCA9PT0gaSl7XHJcbiAgICAgIHJldHVybiBmYWxzZTtcclxuICAgIH1cclxuICAgIGlmKCFwcmV2aW91c1BhcmVudCl7XHJcbiAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgfVxyXG4gICAgdmFyIGNoaWxkID0ge1xyXG4gICAgICBpZDogTWF0aC5yYW5kb20oKS50b1N0cmluZygzMiksXHJcbiAgICAgIGFuY2VzdHJ5OiBbcHJldmlvdXNQYXJlbnQsIHBhcmVudF0ubWFwKGZ1bmN0aW9uKHApe1xyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICBpZDogcC5kZWYuaWQsXHJcbiAgICAgICAgICBhbmNlc3RyeTogcC5kZWYuYW5jZXN0cnlcclxuICAgICAgICB9XHJcbiAgICAgIH0pXHJcbiAgICB9XHJcbiAgICB2YXIgaUNvID0gZ2V0SW5icmVlZGluZ0NvZWZmaWNpZW50KGNoaWxkKTtcclxuICAgIGNvbnNvbGUubG9nKFwiaW5icmVlZGluZyBjb2VmZmljaWVudFwiLCBpQ28pXHJcbiAgICBpZihpQ28gPiAwLjI1KXtcclxuICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIHRydWU7XHJcbiAgfSlcclxuICBpZih2YWxpZFBhcmVudHMubGVuZ3RoID09PSAwKXtcclxuICAgIHJldHVybiBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiBwYXJlbnRzLmxlbmd0aClcclxuICB9XHJcbiAgdmFyIHRvdGFsU2NvcmUgPSB2YWxpZFBhcmVudHMucmVkdWNlKGZ1bmN0aW9uKHN1bSwgcGFyZW50KXtcclxuICAgIHJldHVybiBzdW0gKyBwYXJlbnQuc2NvcmUudjtcclxuICB9LCAwKTtcclxuICB2YXIgciA9IHRvdGFsU2NvcmUgKiBNYXRoLnJhbmRvbSgpO1xyXG4gIGZvcih2YXIgaSA9IDA7IGkgPCB2YWxpZFBhcmVudHMubGVuZ3RoOyBpKyspe1xyXG4gICAgdmFyIHNjb3JlID0gdmFsaWRQYXJlbnRzW2ldLnNjb3JlLnY7XHJcbiAgICBpZihyID4gc2NvcmUpe1xyXG4gICAgICByID0gciAtIHNjb3JlO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgYnJlYWs7XHJcbiAgICB9XHJcbiAgfVxyXG4gIHJldHVybiBpO1xyXG59XHJcbiIsIlxyXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGNhcikge1xyXG4gIHZhciBvdXQgPSB7XHJcbiAgICBjaGFzc2lzOiBnaG9zdF9nZXRfY2hhc3NpcyhjYXIuY2hhc3NpcyksXHJcbiAgICB3aGVlbHM6IFtdLFxyXG4gICAgcG9zOiB7eDogY2FyLmNoYXNzaXMuR2V0UG9zaXRpb24oKS54LCB5OiBjYXIuY2hhc3Npcy5HZXRQb3NpdGlvbigpLnl9XHJcbiAgfTtcclxuXHJcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBjYXIud2hlZWxzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICBvdXQud2hlZWxzW2ldID0gZ2hvc3RfZ2V0X3doZWVsKGNhci53aGVlbHNbaV0pO1xyXG4gIH1cclxuXHJcbiAgcmV0dXJuIG91dDtcclxufVxyXG5cclxuZnVuY3Rpb24gZ2hvc3RfZ2V0X2NoYXNzaXMoYykge1xyXG4gIHZhciBnYyA9IFtdO1xyXG5cclxuICBmb3IgKHZhciBmID0gYy5HZXRGaXh0dXJlTGlzdCgpOyBmOyBmID0gZi5tX25leHQpIHtcclxuICAgIHZhciBzID0gZi5HZXRTaGFwZSgpO1xyXG5cclxuICAgIHZhciBwID0ge1xyXG4gICAgICB2dHg6IFtdLFxyXG4gICAgICBudW06IDBcclxuICAgIH1cclxuXHJcbiAgICBwLm51bSA9IHMubV92ZXJ0ZXhDb3VudDtcclxuXHJcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHMubV92ZXJ0ZXhDb3VudDsgaSsrKSB7XHJcbiAgICAgIHAudnR4LnB1c2goYy5HZXRXb3JsZFBvaW50KHMubV92ZXJ0aWNlc1tpXSkpO1xyXG4gICAgfVxyXG5cclxuICAgIGdjLnB1c2gocCk7XHJcbiAgfVxyXG5cclxuICByZXR1cm4gZ2M7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdob3N0X2dldF93aGVlbCh3KSB7XHJcbiAgdmFyIGd3ID0gW107XHJcblxyXG4gIGZvciAodmFyIGYgPSB3LkdldEZpeHR1cmVMaXN0KCk7IGY7IGYgPSBmLm1fbmV4dCkge1xyXG4gICAgdmFyIHMgPSBmLkdldFNoYXBlKCk7XHJcblxyXG4gICAgdmFyIGMgPSB7XHJcbiAgICAgIHBvczogdy5HZXRXb3JsZFBvaW50KHMubV9wKSxcclxuICAgICAgcmFkOiBzLm1fcmFkaXVzLFxyXG4gICAgICBhbmc6IHcubV9zd2VlcC5hXHJcbiAgICB9XHJcblxyXG4gICAgZ3cucHVzaChjKTtcclxuICB9XHJcblxyXG4gIHJldHVybiBndztcclxufVxyXG4iLCJcclxudmFyIGdob3N0X2dldF9mcmFtZSA9IHJlcXVpcmUoXCIuL2Nhci10by1naG9zdC5qc1wiKTtcclxuXHJcbnZhciBlbmFibGVfZ2hvc3QgPSB0cnVlO1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSB7XHJcbiAgZ2hvc3RfY3JlYXRlX3JlcGxheTogZ2hvc3RfY3JlYXRlX3JlcGxheSxcclxuICBnaG9zdF9jcmVhdGVfZ2hvc3Q6IGdob3N0X2NyZWF0ZV9naG9zdCxcclxuICBnaG9zdF9wYXVzZTogZ2hvc3RfcGF1c2UsXHJcbiAgZ2hvc3RfcmVzdW1lOiBnaG9zdF9yZXN1bWUsXHJcbiAgZ2hvc3RfZ2V0X3Bvc2l0aW9uOiBnaG9zdF9nZXRfcG9zaXRpb24sXHJcbiAgZ2hvc3RfY29tcGFyZV90b19yZXBsYXk6IGdob3N0X2NvbXBhcmVfdG9fcmVwbGF5LFxyXG4gIGdob3N0X21vdmVfZnJhbWU6IGdob3N0X21vdmVfZnJhbWUsXHJcbiAgZ2hvc3RfYWRkX3JlcGxheV9mcmFtZTogZ2hvc3RfYWRkX3JlcGxheV9mcmFtZSxcclxuICBnaG9zdF9kcmF3X2ZyYW1lOiBnaG9zdF9kcmF3X2ZyYW1lLFxyXG4gIGdob3N0X3Jlc2V0X2dob3N0OiBnaG9zdF9yZXNldF9naG9zdFxyXG59XHJcblxyXG5mdW5jdGlvbiBnaG9zdF9jcmVhdGVfcmVwbGF5KCkge1xyXG4gIGlmICghZW5hYmxlX2dob3N0KVxyXG4gICAgcmV0dXJuIG51bGw7XHJcblxyXG4gIHJldHVybiB7XHJcbiAgICBudW1fZnJhbWVzOiAwLFxyXG4gICAgZnJhbWVzOiBbXSxcclxuICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdob3N0X2NyZWF0ZV9naG9zdCgpIHtcclxuICBpZiAoIWVuYWJsZV9naG9zdClcclxuICAgIHJldHVybiBudWxsO1xyXG5cclxuICByZXR1cm4ge1xyXG4gICAgcmVwbGF5OiBudWxsLFxyXG4gICAgZnJhbWU6IDAsXHJcbiAgICBkaXN0OiAtMTAwXHJcbiAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBnaG9zdF9yZXNldF9naG9zdChnaG9zdCkge1xyXG4gIGlmICghZW5hYmxlX2dob3N0KVxyXG4gICAgcmV0dXJuO1xyXG4gIGlmIChnaG9zdCA9PSBudWxsKVxyXG4gICAgcmV0dXJuO1xyXG4gIGdob3N0LmZyYW1lID0gMDtcclxufVxyXG5cclxuZnVuY3Rpb24gZ2hvc3RfcGF1c2UoZ2hvc3QpIHtcclxuICBpZiAoZ2hvc3QgIT0gbnVsbClcclxuICAgIGdob3N0Lm9sZF9mcmFtZSA9IGdob3N0LmZyYW1lO1xyXG4gIGdob3N0X3Jlc2V0X2dob3N0KGdob3N0KTtcclxufVxyXG5cclxuZnVuY3Rpb24gZ2hvc3RfcmVzdW1lKGdob3N0KSB7XHJcbiAgaWYgKGdob3N0ICE9IG51bGwpXHJcbiAgICBnaG9zdC5mcmFtZSA9IGdob3N0Lm9sZF9mcmFtZTtcclxufVxyXG5cclxuZnVuY3Rpb24gZ2hvc3RfZ2V0X3Bvc2l0aW9uKGdob3N0KSB7XHJcbiAgaWYgKCFlbmFibGVfZ2hvc3QpXHJcbiAgICByZXR1cm47XHJcbiAgaWYgKGdob3N0ID09IG51bGwpXHJcbiAgICByZXR1cm47XHJcbiAgaWYgKGdob3N0LmZyYW1lIDwgMClcclxuICAgIHJldHVybjtcclxuICBpZiAoZ2hvc3QucmVwbGF5ID09IG51bGwpXHJcbiAgICByZXR1cm47XHJcbiAgdmFyIGZyYW1lID0gZ2hvc3QucmVwbGF5LmZyYW1lc1tnaG9zdC5mcmFtZV07XHJcbiAgcmV0dXJuIGZyYW1lLnBvcztcclxufVxyXG5cclxuZnVuY3Rpb24gZ2hvc3RfY29tcGFyZV90b19yZXBsYXkocmVwbGF5LCBnaG9zdCwgbWF4KSB7XHJcbiAgaWYgKCFlbmFibGVfZ2hvc3QpXHJcbiAgICByZXR1cm47XHJcbiAgaWYgKGdob3N0ID09IG51bGwpXHJcbiAgICByZXR1cm47XHJcbiAgaWYgKHJlcGxheSA9PSBudWxsKVxyXG4gICAgcmV0dXJuO1xyXG5cclxuICBpZiAoZ2hvc3QuZGlzdCA8IG1heCkge1xyXG4gICAgZ2hvc3QucmVwbGF5ID0gcmVwbGF5O1xyXG4gICAgZ2hvc3QuZGlzdCA9IG1heDtcclxuICAgIGdob3N0LmZyYW1lID0gMDtcclxuICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdob3N0X21vdmVfZnJhbWUoZ2hvc3QpIHtcclxuICBpZiAoIWVuYWJsZV9naG9zdClcclxuICAgIHJldHVybjtcclxuICBpZiAoZ2hvc3QgPT0gbnVsbClcclxuICAgIHJldHVybjtcclxuICBpZiAoZ2hvc3QucmVwbGF5ID09IG51bGwpXHJcbiAgICByZXR1cm47XHJcbiAgZ2hvc3QuZnJhbWUrKztcclxuICBpZiAoZ2hvc3QuZnJhbWUgPj0gZ2hvc3QucmVwbGF5Lm51bV9mcmFtZXMpXHJcbiAgICBnaG9zdC5mcmFtZSA9IGdob3N0LnJlcGxheS5udW1fZnJhbWVzIC0gMTtcclxufVxyXG5cclxuZnVuY3Rpb24gZ2hvc3RfYWRkX3JlcGxheV9mcmFtZShyZXBsYXksIGNhcikge1xyXG4gIGlmICghZW5hYmxlX2dob3N0KVxyXG4gICAgcmV0dXJuO1xyXG4gIGlmIChyZXBsYXkgPT0gbnVsbClcclxuICAgIHJldHVybjtcclxuXHJcbiAgdmFyIGZyYW1lID0gZ2hvc3RfZ2V0X2ZyYW1lKGNhcik7XHJcbiAgcmVwbGF5LmZyYW1lcy5wdXNoKGZyYW1lKTtcclxuICByZXBsYXkubnVtX2ZyYW1lcysrO1xyXG59XHJcblxyXG5mdW5jdGlvbiBnaG9zdF9kcmF3X2ZyYW1lKGN0eCwgZ2hvc3QsIGNhbWVyYSkge1xyXG4gIHZhciB6b29tID0gY2FtZXJhLnpvb207XHJcbiAgaWYgKCFlbmFibGVfZ2hvc3QpXHJcbiAgICByZXR1cm47XHJcbiAgaWYgKGdob3N0ID09IG51bGwpXHJcbiAgICByZXR1cm47XHJcbiAgaWYgKGdob3N0LmZyYW1lIDwgMClcclxuICAgIHJldHVybjtcclxuICBpZiAoZ2hvc3QucmVwbGF5ID09IG51bGwpXHJcbiAgICByZXR1cm47XHJcblxyXG4gIHZhciBmcmFtZSA9IGdob3N0LnJlcGxheS5mcmFtZXNbZ2hvc3QuZnJhbWVdO1xyXG5cclxuICAvLyB3aGVlbCBzdHlsZVxyXG4gIGN0eC5maWxsU3R5bGUgPSBcIiNlZWVcIjtcclxuICBjdHguc3Ryb2tlU3R5bGUgPSBcIiNhYWFcIjtcclxuICBjdHgubGluZVdpZHRoID0gMSAvIHpvb207XHJcblxyXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgZnJhbWUud2hlZWxzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICBmb3IgKHZhciB3IGluIGZyYW1lLndoZWVsc1tpXSkge1xyXG4gICAgICBnaG9zdF9kcmF3X2NpcmNsZShjdHgsIGZyYW1lLndoZWVsc1tpXVt3XS5wb3MsIGZyYW1lLndoZWVsc1tpXVt3XS5yYWQsIGZyYW1lLndoZWVsc1tpXVt3XS5hbmcpO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLy8gY2hhc3NpcyBzdHlsZVxyXG4gIGN0eC5zdHJva2VTdHlsZSA9IFwiI2FhYVwiO1xyXG4gIGN0eC5maWxsU3R5bGUgPSBcIiNlZWVcIjtcclxuICBjdHgubGluZVdpZHRoID0gMSAvIHpvb207XHJcbiAgY3R4LmJlZ2luUGF0aCgpO1xyXG4gIGZvciAodmFyIGMgaW4gZnJhbWUuY2hhc3NpcylcclxuICAgIGdob3N0X2RyYXdfcG9seShjdHgsIGZyYW1lLmNoYXNzaXNbY10udnR4LCBmcmFtZS5jaGFzc2lzW2NdLm51bSk7XHJcbiAgY3R4LmZpbGwoKTtcclxuICBjdHguc3Ryb2tlKCk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdob3N0X2RyYXdfcG9seShjdHgsIHZ0eCwgbl92dHgpIHtcclxuICBjdHgubW92ZVRvKHZ0eFswXS54LCB2dHhbMF0ueSk7XHJcbiAgZm9yICh2YXIgaSA9IDE7IGkgPCBuX3Z0eDsgaSsrKSB7XHJcbiAgICBjdHgubGluZVRvKHZ0eFtpXS54LCB2dHhbaV0ueSk7XHJcbiAgfVxyXG4gIGN0eC5saW5lVG8odnR4WzBdLngsIHZ0eFswXS55KTtcclxufVxyXG5cclxuZnVuY3Rpb24gZ2hvc3RfZHJhd19jaXJjbGUoY3R4LCBjZW50ZXIsIHJhZGl1cywgYW5nbGUpIHtcclxuICBjdHguYmVnaW5QYXRoKCk7XHJcbiAgY3R4LmFyYyhjZW50ZXIueCwgY2VudGVyLnksIHJhZGl1cywgMCwgMiAqIE1hdGguUEksIHRydWUpO1xyXG5cclxuICBjdHgubW92ZVRvKGNlbnRlci54LCBjZW50ZXIueSk7XHJcbiAgY3R4LmxpbmVUbyhjZW50ZXIueCArIHJhZGl1cyAqIE1hdGguY29zKGFuZ2xlKSwgY2VudGVyLnkgKyByYWRpdXMgKiBNYXRoLnNpbihhbmdsZSkpO1xyXG5cclxuICBjdHguZmlsbCgpO1xyXG4gIGN0eC5zdHJva2UoKTtcclxufVxyXG4iLCIvKiBnbG9iYWxzIGRvY3VtZW50IHBlcmZvcm1hbmNlIGxvY2FsU3RvcmFnZSBhbGVydCBjb25maXJtIGJ0b2EgSFRNTERpdkVsZW1lbnQgKi9cclxuLyogZ2xvYmFscyBiMlZlYzIgKi9cclxuLy8gR2xvYmFsIFZhcnNcclxuXHJcbnZhciB3b3JsZFJ1biA9IHJlcXVpcmUoXCIuL3dvcmxkL3J1bi5qc1wiKTtcclxudmFyIGNhckNvbnN0cnVjdCA9IHJlcXVpcmUoXCIuL2Nhci1zY2hlbWEvY29uc3RydWN0LmpzXCIpO1xyXG5cclxudmFyIG1hbmFnZVJvdW5kID0gcmVxdWlyZShcIi4vbWFjaGluZS1sZWFybmluZy9nZW5ldGljLWFsZ29yaXRobS9tYW5hZ2Utcm91bmQuanNcIik7XHJcblxyXG52YXIgZ2hvc3RfZm5zID0gcmVxdWlyZShcIi4vZ2hvc3QvaW5kZXguanNcIik7XHJcblxyXG52YXIgZHJhd0NhciA9IHJlcXVpcmUoXCIuL2RyYXcvZHJhdy1jYXIuanNcIik7XHJcbnZhciBncmFwaF9mbnMgPSByZXF1aXJlKFwiLi9kcmF3L3Bsb3QtZ3JhcGhzLmpzXCIpO1xyXG52YXIgcGxvdF9ncmFwaHMgPSBncmFwaF9mbnMucGxvdEdyYXBocztcclxudmFyIGN3X2NsZWFyR3JhcGhpY3MgPSBncmFwaF9mbnMuY2xlYXJHcmFwaGljcztcclxudmFyIGN3X2RyYXdGbG9vciA9IHJlcXVpcmUoXCIuL2RyYXcvZHJhdy1mbG9vci5qc1wiKTtcclxuXHJcbnZhciBnaG9zdF9kcmF3X2ZyYW1lID0gZ2hvc3RfZm5zLmdob3N0X2RyYXdfZnJhbWU7XHJcbnZhciBnaG9zdF9jcmVhdGVfZ2hvc3QgPSBnaG9zdF9mbnMuZ2hvc3RfY3JlYXRlX2dob3N0O1xyXG52YXIgZ2hvc3RfYWRkX3JlcGxheV9mcmFtZSA9IGdob3N0X2Zucy5naG9zdF9hZGRfcmVwbGF5X2ZyYW1lO1xyXG52YXIgZ2hvc3RfY29tcGFyZV90b19yZXBsYXkgPSBnaG9zdF9mbnMuZ2hvc3RfY29tcGFyZV90b19yZXBsYXk7XHJcbnZhciBnaG9zdF9nZXRfcG9zaXRpb24gPSBnaG9zdF9mbnMuZ2hvc3RfZ2V0X3Bvc2l0aW9uO1xyXG52YXIgZ2hvc3RfbW92ZV9mcmFtZSA9IGdob3N0X2Zucy5naG9zdF9tb3ZlX2ZyYW1lO1xyXG52YXIgZ2hvc3RfcmVzZXRfZ2hvc3QgPSBnaG9zdF9mbnMuZ2hvc3RfcmVzZXRfZ2hvc3RcclxudmFyIGdob3N0X3BhdXNlID0gZ2hvc3RfZm5zLmdob3N0X3BhdXNlO1xyXG52YXIgZ2hvc3RfcmVzdW1lID0gZ2hvc3RfZm5zLmdob3N0X3Jlc3VtZTtcclxudmFyIGdob3N0X2NyZWF0ZV9yZXBsYXkgPSBnaG9zdF9mbnMuZ2hvc3RfY3JlYXRlX3JlcGxheTtcclxuXHJcbnZhciBjd19DYXIgPSByZXF1aXJlKFwiLi9kcmF3L2RyYXctY2FyLXN0YXRzLmpzXCIpO1xyXG52YXIgZ2hvc3Q7XHJcbnZhciBjYXJNYXAgPSBuZXcgTWFwKCk7XHJcblxyXG52YXIgZG9EcmF3ID0gdHJ1ZTtcclxudmFyIGN3X3BhdXNlZCA9IGZhbHNlO1xyXG5cclxudmFyIGJveDJkZnBzID0gNjA7XHJcbnZhciBzY3JlZW5mcHMgPSA2MDtcclxudmFyIHNraXBUaWNrcyA9IE1hdGgucm91bmQoMTAwMCAvIGJveDJkZnBzKTtcclxudmFyIG1heEZyYW1lU2tpcCA9IHNraXBUaWNrcyAqIDI7XHJcblxyXG52YXIgY2FudmFzID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJtYWluYm94XCIpO1xyXG52YXIgY3R4ID0gY2FudmFzLmdldENvbnRleHQoXCIyZFwiKTtcclxuXHJcbnZhciBjYW1lcmEgPSB7XHJcbiAgc3BlZWQ6IDAuMDUsXHJcbiAgcG9zOiB7XHJcbiAgICB4OiAwLCB5OiAwXHJcbiAgfSxcclxuICB0YXJnZXQ6IC0xLFxyXG4gIHpvb206IDcwXHJcbn1cclxuXHJcbnZhciBtaW5pbWFwY2FtZXJhID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJtaW5pbWFwY2FtZXJhXCIpLnN0eWxlO1xyXG52YXIgbWluaW1hcGhvbGRlciA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoXCIjbWluaW1hcGhvbGRlclwiKTtcclxuXHJcbnZhciBtaW5pbWFwY2FudmFzID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJtaW5pbWFwXCIpO1xyXG52YXIgbWluaW1hcGN0eCA9IG1pbmltYXBjYW52YXMuZ2V0Q29udGV4dChcIjJkXCIpO1xyXG52YXIgbWluaW1hcHNjYWxlID0gMztcclxudmFyIG1pbmltYXBmb2dkaXN0YW5jZSA9IDA7XHJcbnZhciBmb2dkaXN0YW5jZSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwibWluaW1hcGZvZ1wiKS5zdHlsZTtcclxuXHJcblxyXG52YXIgY2FyQ29uc3RhbnRzID0gY2FyQ29uc3RydWN0LmNhckNvbnN0YW50cygpO1xyXG5cclxuXHJcbnZhciBtYXhfY2FyX2hlYWx0aCA9IGJveDJkZnBzICogMTA7XHJcblxyXG52YXIgY3dfZ2hvc3RSZXBsYXlJbnRlcnZhbCA9IG51bGw7XHJcblxyXG52YXIgZGlzdGFuY2VNZXRlciA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiZGlzdGFuY2VtZXRlclwiKTtcclxudmFyIGhlaWdodE1ldGVyID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJoZWlnaHRtZXRlclwiKTtcclxuXHJcbnZhciBsZWFkZXJQb3NpdGlvbiA9IHtcclxuICB4OiAwLCB5OiAwXHJcbn1cclxuXHJcbm1pbmltYXBjYW1lcmEud2lkdGggPSAxMiAqIG1pbmltYXBzY2FsZSArIFwicHhcIjtcclxubWluaW1hcGNhbWVyYS5oZWlnaHQgPSA2ICogbWluaW1hcHNjYWxlICsgXCJweFwiO1xyXG5cclxuXHJcbi8vID09PT09PT0gV09STEQgU1RBVEUgPT09PT09XHJcbnZhciBnZW5lcmF0aW9uQ29uZmlnID0gcmVxdWlyZShcIi4vZ2VuZXJhdGlvbi1jb25maWdcIik7XHJcblxyXG5cclxudmFyIHdvcmxkX2RlZiA9IHtcclxuICBncmF2aXR5OiBuZXcgYjJWZWMyKDAuMCwgLTkuODEpLFxyXG4gIGRvU2xlZXA6IHRydWUsXHJcbiAgZmxvb3JzZWVkOiBidG9hKE1hdGguc2VlZHJhbmRvbSgpKSxcclxuICB0aWxlRGltZW5zaW9uczogbmV3IGIyVmVjMigxLjUsIDAuMTUpLFxyXG4gIG1heEZsb29yVGlsZXM6IDIwMCxcclxuICBtdXRhYmxlX2Zsb29yOiBmYWxzZSxcclxuICBib3gyZGZwczogYm94MmRmcHMsXHJcbiAgbW90b3JTcGVlZDogMjAsXHJcbiAgbWF4X2Nhcl9oZWFsdGg6IG1heF9jYXJfaGVhbHRoLFxyXG4gIHNjaGVtYTogZ2VuZXJhdGlvbkNvbmZpZy5jb25zdGFudHMuc2NoZW1hXHJcbn1cclxuXHJcbnZhciBjd19kZWFkQ2FycztcclxuXHJcbnZhciBhcnJPZkdyYXBoU3RhdGVzID0gW107XHJcblxyXG52YXIgZ3JhcGhTdGF0ZSA9IHtcclxuICBjd190b3BTY29yZXM6IFtdLFxyXG4gIGN3X2dyYXBoQXZlcmFnZTogW10sXHJcbiAgY3dfZ3JhcGhFbGl0ZTogW10sXHJcbiAgY3dfZ3JhcGhUb3A6IFtdLFxyXG59O1xyXG5cclxuZnVuY3Rpb24gcmVzZXRHcmFwaFN0YXRlKCl7XHJcbiAgZ3JhcGhTdGF0ZSA9IHtcclxuICAgIGN3X3RvcFNjb3JlczogW10sXHJcbiAgICBjd19ncmFwaEF2ZXJhZ2U6IFtdLFxyXG4gICAgY3dfZ3JhcGhFbGl0ZTogW10sXHJcbiAgICBjd19ncmFwaFRvcDogW10sXHJcbiAgfTtcclxufVxyXG5cclxuXHJcblxyXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PVxyXG5cclxudmFyIGdlbmVyYXRpb25TdGF0ZTtcclxuXHJcbi8vID09PT09PT09IEFjdGl2aXR5IFN0YXRlID09PT1cclxudmFyIGN1cnJlbnRSdW5uZXI7XHJcbnZhciBsb29wcyA9IDA7XHJcbnZhciBuZXh0R2FtZVRpY2sgPSAobmV3IERhdGUpLmdldFRpbWUoKTtcclxuXHJcbmZ1bmN0aW9uIHNob3dEaXN0YW5jZShkaXN0YW5jZSwgaGVpZ2h0KSB7XHJcbiAgZGlzdGFuY2VNZXRlci5pbm5lckhUTUwgPSBkaXN0YW5jZSArIFwiIG1ldGVyczxiciAvPlwiO1xyXG4gIGhlaWdodE1ldGVyLmlubmVySFRNTCA9IGhlaWdodCArIFwiIG1ldGVyc1wiO1xyXG4gIGlmIChkaXN0YW5jZSA+IG1pbmltYXBmb2dkaXN0YW5jZSkge1xyXG4gICAgZm9nZGlzdGFuY2Uud2lkdGggPSA4MDAgLSBNYXRoLnJvdW5kKGRpc3RhbmNlICsgMTUpICogbWluaW1hcHNjYWxlICsgXCJweFwiO1xyXG4gICAgbWluaW1hcGZvZ2Rpc3RhbmNlID0gZGlzdGFuY2U7XHJcbiAgfVxyXG59XHJcblxyXG5cclxuXHJcbi8qID09PSBFTkQgQ2FyID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0gKi9cclxuLyogPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSAqL1xyXG5cclxuXHJcbi8qID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0gKi9cclxuLyogPT09PSBHZW5lcmF0aW9uID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSAqL1xyXG5cclxuZnVuY3Rpb24gY3dfZ2VuZXJhdGlvblplcm8oKSB7XHJcblxyXG4gIGdlbmVyYXRpb25TdGF0ZSA9IG1hbmFnZVJvdW5kLmdlbmVyYXRpb25aZXJvKGdlbmVyYXRpb25Db25maWcoKSk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHJlc2V0Q2FyVUkoKXtcclxuICBjd19kZWFkQ2FycyA9IDA7XHJcbiAgbGVhZGVyUG9zaXRpb24gPSB7XHJcbiAgICB4OiAwLCB5OiAwXHJcbiAgfTtcclxuICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImdlbmVyYXRpb25cIikuaW5uZXJIVE1MID0gZ2VuZXJhdGlvblN0YXRlLmNvdW50ZXIudG9TdHJpbmcoKTtcclxuICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImNhcnNcIikuaW5uZXJIVE1MID0gXCJcIjtcclxuICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInBvcHVsYXRpb25cIikuaW5uZXJIVE1MID0gZ2VuZXJhdGlvbkNvbmZpZy5jb25zdGFudHMuZ2VuZXJhdGlvblNpemUudG9TdHJpbmcoKTtcclxufVxyXG5cclxuLyogPT09PSBFTkQgR2VucmF0aW9uID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSAqL1xyXG4vKiA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09ICovXHJcblxyXG4vKiA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09ICovXHJcbi8qID09PT0gRHJhd2luZyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0gKi9cclxuXHJcbmZ1bmN0aW9uIGN3X2RyYXdTY3JlZW4oKSB7XHJcbiAgdmFyIGZsb29yVGlsZXMgPSBjdXJyZW50UnVubmVyLnNjZW5lLmZsb29yVGlsZXM7XHJcbiAgY3R4LmNsZWFyUmVjdCgwLCAwLCBjYW52YXMud2lkdGgsIGNhbnZhcy5oZWlnaHQpO1xyXG4gIGN0eC5zYXZlKCk7XHJcbiAgY3dfc2V0Q2FtZXJhUG9zaXRpb24oKTtcclxuICB2YXIgY2FtZXJhX3ggPSBjYW1lcmEucG9zLng7XHJcbiAgdmFyIGNhbWVyYV95ID0gY2FtZXJhLnBvcy55O1xyXG4gIHZhciB6b29tID0gY2FtZXJhLnpvb207XHJcbiAgY3R4LnRyYW5zbGF0ZSgyMDAgLSAoY2FtZXJhX3ggKiB6b29tKSwgMjAwICsgKGNhbWVyYV95ICogem9vbSkpO1xyXG4gIGN0eC5zY2FsZSh6b29tLCAtem9vbSk7XHJcbiAgY3dfZHJhd0Zsb29yKGN0eCwgY2FtZXJhLCBmbG9vclRpbGVzKTtcclxuICBnaG9zdF9kcmF3X2ZyYW1lKGN0eCwgZ2hvc3QsIGNhbWVyYSk7XHJcbiAgY3dfZHJhd0NhcnMoKTtcclxuICBjdHgucmVzdG9yZSgpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBjd19taW5pbWFwQ2FtZXJhKC8qIHgsIHkqLykge1xyXG4gIHZhciBjYW1lcmFfeCA9IGNhbWVyYS5wb3MueFxyXG4gIHZhciBjYW1lcmFfeSA9IGNhbWVyYS5wb3MueVxyXG4gIG1pbmltYXBjYW1lcmEubGVmdCA9IE1hdGgucm91bmQoKDIgKyBjYW1lcmFfeCkgKiBtaW5pbWFwc2NhbGUpICsgXCJweFwiO1xyXG4gIG1pbmltYXBjYW1lcmEudG9wID0gTWF0aC5yb3VuZCgoMzEgLSBjYW1lcmFfeSkgKiBtaW5pbWFwc2NhbGUpICsgXCJweFwiO1xyXG59XHJcblxyXG5mdW5jdGlvbiBjd19zZXRDYW1lcmFUYXJnZXQoaykge1xyXG4gIGNhbWVyYS50YXJnZXQgPSBrO1xyXG59XHJcblxyXG5mdW5jdGlvbiBjd19zZXRDYW1lcmFQb3NpdGlvbigpIHtcclxuICB2YXIgY2FtZXJhVGFyZ2V0UG9zaXRpb25cclxuICBpZiAoY2FtZXJhLnRhcmdldCAhPT0gLTEpIHtcclxuICAgIGNhbWVyYVRhcmdldFBvc2l0aW9uID0gY2FyTWFwLmdldChjYW1lcmEudGFyZ2V0KS5nZXRQb3NpdGlvbigpO1xyXG4gIH0gZWxzZSB7XHJcbiAgICBjYW1lcmFUYXJnZXRQb3NpdGlvbiA9IGxlYWRlclBvc2l0aW9uO1xyXG4gIH1cclxuICB2YXIgZGlmZl95ID0gY2FtZXJhLnBvcy55IC0gY2FtZXJhVGFyZ2V0UG9zaXRpb24ueTtcclxuICB2YXIgZGlmZl94ID0gY2FtZXJhLnBvcy54IC0gY2FtZXJhVGFyZ2V0UG9zaXRpb24ueDtcclxuICBjYW1lcmEucG9zLnkgLT0gY2FtZXJhLnNwZWVkICogZGlmZl95O1xyXG4gIGNhbWVyYS5wb3MueCAtPSBjYW1lcmEuc3BlZWQgKiBkaWZmX3g7XHJcbiAgY3dfbWluaW1hcENhbWVyYShjYW1lcmEucG9zLngsIGNhbWVyYS5wb3MueSk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGN3X2RyYXdHaG9zdFJlcGxheSgpIHtcclxuICB2YXIgZmxvb3JUaWxlcyA9IGN1cnJlbnRSdW5uZXIuc2NlbmUuZmxvb3JUaWxlcztcclxuICB2YXIgY2FyUG9zaXRpb24gPSBnaG9zdF9nZXRfcG9zaXRpb24oZ2hvc3QpO1xyXG4gIGNhbWVyYS5wb3MueCA9IGNhclBvc2l0aW9uLng7XHJcbiAgY2FtZXJhLnBvcy55ID0gY2FyUG9zaXRpb24ueTtcclxuICBjd19taW5pbWFwQ2FtZXJhKGNhbWVyYS5wb3MueCwgY2FtZXJhLnBvcy55KTtcclxuICBzaG93RGlzdGFuY2UoXHJcbiAgICBNYXRoLnJvdW5kKGNhclBvc2l0aW9uLnggKiAxMDApIC8gMTAwLFxyXG4gICAgTWF0aC5yb3VuZChjYXJQb3NpdGlvbi55ICogMTAwKSAvIDEwMFxyXG4gICk7XHJcbiAgY3R4LmNsZWFyUmVjdCgwLCAwLCBjYW52YXMud2lkdGgsIGNhbnZhcy5oZWlnaHQpO1xyXG4gIGN0eC5zYXZlKCk7XHJcbiAgY3R4LnRyYW5zbGF0ZShcclxuICAgIDIwMCAtIChjYXJQb3NpdGlvbi54ICogY2FtZXJhLnpvb20pLFxyXG4gICAgMjAwICsgKGNhclBvc2l0aW9uLnkgKiBjYW1lcmEuem9vbSlcclxuICApO1xyXG4gIGN0eC5zY2FsZShjYW1lcmEuem9vbSwgLWNhbWVyYS56b29tKTtcclxuICBnaG9zdF9kcmF3X2ZyYW1lKGN0eCwgZ2hvc3QpO1xyXG4gIGdob3N0X21vdmVfZnJhbWUoZ2hvc3QpO1xyXG4gIGN3X2RyYXdGbG9vcihjdHgsIGNhbWVyYSwgZmxvb3JUaWxlcyk7XHJcbiAgY3R4LnJlc3RvcmUoKTtcclxufVxyXG5cclxuXHJcbmZ1bmN0aW9uIGN3X2RyYXdDYXJzKCkge1xyXG4gIHZhciBjd19jYXJBcnJheSA9IEFycmF5LmZyb20oY2FyTWFwLnZhbHVlcygpKTtcclxuICBmb3IgKHZhciBrID0gKGN3X2NhckFycmF5Lmxlbmd0aCAtIDEpOyBrID49IDA7IGstLSkge1xyXG4gICAgdmFyIG15Q2FyID0gY3dfY2FyQXJyYXlba107XHJcbiAgICBkcmF3Q2FyKGNhckNvbnN0YW50cywgbXlDYXIsIGNhbWVyYSwgY3R4KVxyXG4gIH1cclxufVxyXG5cclxuZnVuY3Rpb24gdG9nZ2xlRGlzcGxheSgpIHtcclxuICBjYW52YXMud2lkdGggPSBjYW52YXMud2lkdGg7XHJcbiAgaWYgKGRvRHJhdykge1xyXG4gICAgZG9EcmF3ID0gZmFsc2U7XHJcbiAgICBjd19zdG9wU2ltdWxhdGlvbigpO1xyXG4gICAgY3dfcnVubmluZ0ludGVydmFsID0gc2V0SW50ZXJ2YWwoZnVuY3Rpb24gKCkge1xyXG4gICAgICB2YXIgdGltZSA9IHBlcmZvcm1hbmNlLm5vdygpICsgKDEwMDAgLyBzY3JlZW5mcHMpO1xyXG4gICAgICB3aGlsZSAodGltZSA+IHBlcmZvcm1hbmNlLm5vdygpKSB7XHJcbiAgICAgICAgc2ltdWxhdGlvblN0ZXAoKTtcclxuICAgICAgfVxyXG4gICAgfSwgMSk7XHJcbiAgfSBlbHNlIHtcclxuICAgIGRvRHJhdyA9IHRydWU7XHJcbiAgICBjbGVhckludGVydmFsKGN3X3J1bm5pbmdJbnRlcnZhbCk7XHJcbiAgICBjd19zdGFydFNpbXVsYXRpb24oKTtcclxuICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGN3X2RyYXdNaW5pTWFwKCkge1xyXG4gIHZhciBmbG9vclRpbGVzID0gY3VycmVudFJ1bm5lci5zY2VuZS5mbG9vclRpbGVzO1xyXG4gIHZhciBsYXN0X3RpbGUgPSBudWxsO1xyXG4gIHZhciB0aWxlX3Bvc2l0aW9uID0gbmV3IGIyVmVjMigtNSwgMCk7XHJcbiAgbWluaW1hcGZvZ2Rpc3RhbmNlID0gMDtcclxuICBmb2dkaXN0YW5jZS53aWR0aCA9IFwiODAwcHhcIjtcclxuICBtaW5pbWFwY2FudmFzLndpZHRoID0gbWluaW1hcGNhbnZhcy53aWR0aDtcclxuICBtaW5pbWFwY3R4LnN0cm9rZVN0eWxlID0gXCIjM0Y3MkFGXCI7XHJcbiAgbWluaW1hcGN0eC5iZWdpblBhdGgoKTtcclxuICBtaW5pbWFwY3R4Lm1vdmVUbygwLCAzNSAqIG1pbmltYXBzY2FsZSk7XHJcbiAgZm9yICh2YXIgayA9IDA7IGsgPCBmbG9vclRpbGVzLmxlbmd0aDsgaysrKSB7XHJcbiAgICBsYXN0X3RpbGUgPSBmbG9vclRpbGVzW2tdO1xyXG4gICAgdmFyIGxhc3RfZml4dHVyZSA9IGxhc3RfdGlsZS5HZXRGaXh0dXJlTGlzdCgpO1xyXG4gICAgdmFyIGxhc3Rfd29ybGRfY29vcmRzID0gbGFzdF90aWxlLkdldFdvcmxkUG9pbnQobGFzdF9maXh0dXJlLkdldFNoYXBlKCkubV92ZXJ0aWNlc1szXSk7XHJcbiAgICB0aWxlX3Bvc2l0aW9uID0gbGFzdF93b3JsZF9jb29yZHM7XHJcbiAgICBtaW5pbWFwY3R4LmxpbmVUbygodGlsZV9wb3NpdGlvbi54ICsgNSkgKiBtaW5pbWFwc2NhbGUsICgtdGlsZV9wb3NpdGlvbi55ICsgMzUpICogbWluaW1hcHNjYWxlKTtcclxuICB9XHJcbiAgbWluaW1hcGN0eC5zdHJva2UoKTtcclxufVxyXG5cclxuLyogPT09PSBFTkQgRHJhd2luZyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSAqL1xyXG4vKiA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09ICovXHJcbnZhciB1aUxpc3RlbmVycyA9IHtcclxuICBwcmVDYXJTdGVwOiBmdW5jdGlvbigpe1xyXG4gICAgZ2hvc3RfbW92ZV9mcmFtZShnaG9zdCk7XHJcbiAgfSxcclxuICBjYXJTdGVwKGNhcil7XHJcbiAgICB1cGRhdGVDYXJVSShjYXIpO1xyXG4gIH0sXHJcbiAgY2FyRGVhdGgoY2FySW5mbyl7XHJcblxyXG4gICAgdmFyIGsgPSBjYXJJbmZvLmluZGV4O1xyXG5cclxuICAgIHZhciBjYXIgPSBjYXJJbmZvLmNhciwgc2NvcmUgPSBjYXJJbmZvLnNjb3JlO1xyXG4gICAgY2FyTWFwLmdldChjYXJJbmZvKS5raWxsKGN1cnJlbnRSdW5uZXIsIHdvcmxkX2RlZik7XHJcblxyXG4gICAgLy8gcmVmb2N1cyBjYW1lcmEgdG8gbGVhZGVyIG9uIGRlYXRoXHJcbiAgICBpZiAoY2FtZXJhLnRhcmdldCA9PSBjYXJJbmZvKSB7XHJcbiAgICAgIGN3X3NldENhbWVyYVRhcmdldCgtMSk7XHJcbiAgICB9XHJcbiAgICAvLyBjb25zb2xlLmxvZyhzY29yZSk7XHJcbiAgICBjYXJNYXAuZGVsZXRlKGNhckluZm8pO1xyXG4gICAgZ2hvc3RfY29tcGFyZV90b19yZXBsYXkoY2FyLnJlcGxheSwgZ2hvc3QsIHNjb3JlLnYpO1xyXG4gICAgc2NvcmUuaSA9IGdlbmVyYXRpb25TdGF0ZS5jb3VudGVyO1xyXG5cclxuICAgIGN3X2RlYWRDYXJzKys7XHJcbiAgICB2YXIgZ2VuZXJhdGlvblNpemUgPSBnZW5lcmF0aW9uQ29uZmlnLmNvbnN0YW50cy5nZW5lcmF0aW9uU2l6ZTtcclxuICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwicG9wdWxhdGlvblwiKS5pbm5lckhUTUwgPSAoZ2VuZXJhdGlvblNpemUgLSBjd19kZWFkQ2FycykudG9TdHJpbmcoKTtcclxuXHJcbiAgICAvLyBjb25zb2xlLmxvZyhsZWFkZXJQb3NpdGlvbi5sZWFkZXIsIGspXHJcbiAgICBpZiAobGVhZGVyUG9zaXRpb24ubGVhZGVyID09IGspIHtcclxuICAgICAgLy8gbGVhZGVyIGlzIGRlYWQsIGZpbmQgbmV3IGxlYWRlclxyXG4gICAgICBjd19maW5kTGVhZGVyKCk7XHJcbiAgICB9XHJcbiAgfSxcclxuICBnZW5lcmF0aW9uRW5kKHJlc3VsdHMpe1xyXG4gICAgY2xlYW51cFJvdW5kKHJlc3VsdHMpO1xyXG4gICAgcmV0dXJuIGN3X25ld1JvdW5kKHJlc3VsdHMpO1xyXG4gIH1cclxufVxyXG5cclxuZnVuY3Rpb24gc2ltdWxhdGlvblN0ZXAoKSB7ICBcclxuICBjdXJyZW50UnVubmVyLnN0ZXAoKTtcclxuICBzaG93RGlzdGFuY2UoXHJcbiAgICBNYXRoLnJvdW5kKGxlYWRlclBvc2l0aW9uLnggKiAxMDApIC8gMTAwLFxyXG4gICAgTWF0aC5yb3VuZChsZWFkZXJQb3NpdGlvbi55ICogMTAwKSAvIDEwMFxyXG4gICk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdhbWVMb29wKCkge1xyXG4gIC8qbG9vcHMgPSAwO1xyXG4gIHdoaWxlICghY3dfcGF1c2VkICYmIChuZXcgRGF0ZSkuZ2V0VGltZSgpID4gbmV4dEdhbWVUaWNrICYmIGxvb3BzIDwgbWF4RnJhbWVTa2lwKSB7ICAgXHJcbiAgICBuZXh0R2FtZVRpY2sgKz0gc2tpcFRpY2tzO1xyXG4gICAgbG9vcHMrKztcclxuICB9XHJcbiAgc2ltdWxhdGlvblN0ZXAoKTtcclxuICBjd19kcmF3U2NyZWVuKCk7XHJcblx0Ki9cclxuXHRmYXN0Rm9yd2FyZCgpOy8vdXNlZCBmb3IgdGVzdGluZyBkYXRhXHJcbiAgaWYoIWN3X3BhdXNlZCkgd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZShnYW1lTG9vcCk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHVwZGF0ZUNhclVJKGNhckluZm8pe1xyXG4gIHZhciBrID0gY2FySW5mby5pbmRleDtcclxuICB2YXIgY2FyID0gY2FyTWFwLmdldChjYXJJbmZvKTtcclxuICB2YXIgcG9zaXRpb24gPSBjYXIuZ2V0UG9zaXRpb24oKTtcclxuXHJcbiAgZ2hvc3RfYWRkX3JlcGxheV9mcmFtZShjYXIucmVwbGF5LCBjYXIuY2FyLmNhcik7XHJcbiAgY2FyLm1pbmltYXBtYXJrZXIuc3R5bGUubGVmdCA9IE1hdGgucm91bmQoKHBvc2l0aW9uLnggKyA1KSAqIG1pbmltYXBzY2FsZSkgKyBcInB4XCI7XHJcbiAgY2FyLmhlYWx0aEJhci53aWR0aCA9IE1hdGgucm91bmQoKGNhci5jYXIuc3RhdGUuaGVhbHRoIC8gbWF4X2Nhcl9oZWFsdGgpICogMTAwKSArIFwiJVwiO1xyXG4gIGlmIChwb3NpdGlvbi54ID4gbGVhZGVyUG9zaXRpb24ueCkge1xyXG4gICAgbGVhZGVyUG9zaXRpb24gPSBwb3NpdGlvbjtcclxuICAgIGxlYWRlclBvc2l0aW9uLmxlYWRlciA9IGs7XHJcbiAgICAvLyBjb25zb2xlLmxvZyhcIm5ldyBsZWFkZXI6IFwiLCBrKTtcclxuICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGN3X2ZpbmRMZWFkZXIoKSB7XHJcbiAgdmFyIGxlYWQgPSAwO1xyXG4gIHZhciBjd19jYXJBcnJheSA9IEFycmF5LmZyb20oY2FyTWFwLnZhbHVlcygpKTtcclxuICBmb3IgKHZhciBrID0gMDsgayA8IGN3X2NhckFycmF5Lmxlbmd0aDsgaysrKSB7XHJcbiAgICBpZiAoIWN3X2NhckFycmF5W2tdLmFsaXZlKSB7XHJcbiAgICAgIGNvbnRpbnVlO1xyXG4gICAgfVxyXG4gICAgdmFyIHBvc2l0aW9uID0gY3dfY2FyQXJyYXlba10uZ2V0UG9zaXRpb24oKTtcclxuICAgIGlmIChwb3NpdGlvbi54ID4gbGVhZCkge1xyXG4gICAgICBsZWFkZXJQb3NpdGlvbiA9IHBvc2l0aW9uO1xyXG4gICAgICBsZWFkZXJQb3NpdGlvbi5sZWFkZXIgPSBrO1xyXG4gICAgfVxyXG4gIH1cclxufVxyXG5cclxuZnVuY3Rpb24gZmFzdEZvcndhcmQoKXtcclxuICB2YXIgZ2VuID0gZ2VuZXJhdGlvblN0YXRlLmNvdW50ZXI7XHJcbiAgd2hpbGUoZ2VuID09PSBnZW5lcmF0aW9uU3RhdGUuY291bnRlcil7XHJcbiAgICBjdXJyZW50UnVubmVyLnN0ZXAoKTtcclxuICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNsZWFudXBSb3VuZChyZXN1bHRzKXtcclxuXHJcbiAgcmVzdWx0cy5zb3J0KGZ1bmN0aW9uIChhLCBiKSB7XHJcbiAgICBpZiAoYS5zY29yZS52ID4gYi5zY29yZS52KSB7XHJcbiAgICAgIHJldHVybiAtMVxyXG4gICAgfSBlbHNlIHtcclxuICAgICAgcmV0dXJuIDFcclxuICAgIH1cclxuICB9KVxyXG4gIGdyYXBoU3RhdGUgPSBwbG90X2dyYXBocyhcclxuICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiZ3JhcGhjYW52YXNcIiksXHJcbiAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInRvcHNjb3Jlc1wiKSxcclxuICAgIG51bGwsXHJcbiAgICBncmFwaFN0YXRlLFxyXG4gICAgcmVzdWx0c1xyXG4gICk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGN3X25ld1JvdW5kKHJlc3VsdHMpIHtcclxuICBjYW1lcmEucG9zLnggPSBjYW1lcmEucG9zLnkgPSAwO1xyXG4gIGN3X3NldENhbWVyYVRhcmdldCgtMSk7XHJcbiAgZ2VuZXJhdGlvblN0YXRlID1tYW5hZ2VSb3VuZC5uZXh0R2VuZXJhdGlvbihcclxuICAgIGdlbmVyYXRpb25TdGF0ZSwgcmVzdWx0cywgZ2VuZXJhdGlvbkNvbmZpZygpKTtcclxuXHRcclxuXHRpZihnZW5lcmF0aW9uU3RhdGUuY291bnRlcj09PTApe1xyXG5cdFx0dmFyIHJvdW5kcyA9IGxvY2FsU3RvcmFnZS5nZXRJdGVtKFwicm91bmRcIik7XHJcblx0XHR2YXIgbmV3Um91bmRzID0gZ2VuZXJhdGlvblN0YXRlLnJvdW5kK3JvdW5kcztcclxuXHRcdGxvY2FsU3RvcmFnZS5zZXRJdGVtKFwiRUFcIituZXdSb3VuZHMsIEpTT04uc3RyaW5naWZ5KGdyYXBoU3RhdGUuY3dfZ3JhcGhBdmVyYWdlKSk7XHJcblx0XHRsb2NhbFN0b3JhZ2Uuc2V0SXRlbShcInJvdW5kXCIsIG5ld1JvdW5kcyk7XHJcblx0XHQvL2dyYXBoU3RhdGUuY3dfZ3JhcGhBdmVyYWdlID0gbmV3IEFycmF5KCk7XHJcblx0XHQvL3Jlc2V0R3JhcGhTdGF0ZSgpO1xyXG5cdFx0bG9jYXRpb24ucmVsb2FkKCk7XHJcblx0fVxyXG5cdFxyXG5cdFxyXG4gIGlmICh3b3JsZF9kZWYubXV0YWJsZV9mbG9vcikge1xyXG4gICAgLy8gR0hPU1QgRElTQUJMRURcclxuICAgIGdob3N0ID0gbnVsbDtcclxuICAgIHdvcmxkX2RlZi5mbG9vcnNlZWQgPSBidG9hKE1hdGguc2VlZHJhbmRvbSgpKTtcclxuICB9IGVsc2Uge1xyXG4gICAgLy8gUkUtRU5BQkxFIEdIT1NUXHJcbiAgICBnaG9zdF9yZXNldF9naG9zdChnaG9zdCk7XHJcbiAgfVxyXG4gIGN1cnJlbnRSdW5uZXIgPSB3b3JsZFJ1bih3b3JsZF9kZWYsIGdlbmVyYXRpb25TdGF0ZS5nZW5lcmF0aW9uLCB1aUxpc3RlbmVycyk7XHJcbiAgc2V0dXBDYXJVSSgpO1xyXG4gIGN3X2RyYXdNaW5pTWFwKCk7XHJcbiAgcmVzZXRDYXJVSSgpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBjd19zdGFydFNpbXVsYXRpb24oKSB7XHJcbiAgY3dfcGF1c2VkID0gZmFsc2U7XHJcbiAgd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZShnYW1lTG9vcCk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGN3X3N0b3BTaW11bGF0aW9uKCkge1xyXG4gIGN3X3BhdXNlZCA9IHRydWU7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGN3X2NsZWFyUG9wdWxhdGlvbldvcmxkKCkge1xyXG4gIGNhck1hcC5mb3JFYWNoKGZ1bmN0aW9uKGNhcil7XHJcbiAgICBjYXIua2lsbChjdXJyZW50UnVubmVyLCB3b3JsZF9kZWYpO1xyXG4gIH0pO1xyXG59XHJcblxyXG5mdW5jdGlvbiBjd19yZXNldFBvcHVsYXRpb25VSSgpIHtcclxuICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImdlbmVyYXRpb25cIikuaW5uZXJIVE1MID0gXCJcIjtcclxuICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImNhcnNcIikuaW5uZXJIVE1MID0gXCJcIjtcclxuICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInRvcHNjb3Jlc1wiKS5pbm5lckhUTUwgPSBcIlwiO1xyXG4gIGN3X2NsZWFyR3JhcGhpY3MoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJncmFwaGNhbnZhc1wiKSk7XHJcbiAgcmVzZXRHcmFwaFN0YXRlKCk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGN3X3Jlc2V0V29ybGQoKSB7XHJcbiAgZG9EcmF3ID0gdHJ1ZTtcclxuICBjd19zdG9wU2ltdWxhdGlvbigpO1xyXG4gIHdvcmxkX2RlZi5mbG9vcnNlZWQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIm5ld3NlZWRcIikudmFsdWU7XHJcbiAgY3dfY2xlYXJQb3B1bGF0aW9uV29ybGQoKTtcclxuICBjd19yZXNldFBvcHVsYXRpb25VSSgpO1xyXG5cclxuICBNYXRoLnNlZWRyYW5kb20oKTtcclxuICBjd19nZW5lcmF0aW9uWmVybygpO1xyXG4gIGN1cnJlbnRSdW5uZXIgPSB3b3JsZFJ1bihcclxuICAgIHdvcmxkX2RlZiwgZ2VuZXJhdGlvblN0YXRlLmdlbmVyYXRpb24sIHVpTGlzdGVuZXJzXHJcbiAgKTtcclxuXHJcbiAgZ2hvc3QgPSBnaG9zdF9jcmVhdGVfZ2hvc3QoKTtcclxuICByZXNldENhclVJKCk7XHJcbiAgc2V0dXBDYXJVSSgpXHJcbiAgY3dfZHJhd01pbmlNYXAoKTtcclxuXHJcbiAgY3dfc3RhcnRTaW11bGF0aW9uKCk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHNldHVwQ2FyVUkoKXtcclxuICBjdXJyZW50UnVubmVyLmNhcnMubWFwKGZ1bmN0aW9uKGNhckluZm8pe1xyXG4gICAgdmFyIGNhciA9IG5ldyBjd19DYXIoY2FySW5mbywgY2FyTWFwKTtcclxuICAgIGNhck1hcC5zZXQoY2FySW5mbywgY2FyKTtcclxuICAgIGNhci5yZXBsYXkgPSBnaG9zdF9jcmVhdGVfcmVwbGF5KCk7XHJcbiAgICBnaG9zdF9hZGRfcmVwbGF5X2ZyYW1lKGNhci5yZXBsYXksIGNhci5jYXIuY2FyKTtcclxuICB9KVxyXG59XHJcblxyXG5cclxuZG9jdW1lbnQucXVlcnlTZWxlY3RvcihcIiNmYXN0LWZvcndhcmRcIikuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIGZ1bmN0aW9uKCl7XHJcbiAgZmFzdEZvcndhcmQoKVxyXG59KTtcclxuXHJcbmRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoXCIjc2F2ZS1wcm9ncmVzc1wiKS5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgZnVuY3Rpb24oKXtcclxuICBzYXZlUHJvZ3Jlc3MoKVxyXG59KTtcclxuXHJcbmRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoXCIjcmVzdG9yZS1wcm9ncmVzc1wiKS5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgZnVuY3Rpb24oKXtcclxuICByZXN0b3JlUHJvZ3Jlc3MoKVxyXG59KTtcclxuXHJcbmRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoXCIjdG9nZ2xlLWRpc3BsYXlcIikuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIGZ1bmN0aW9uKCl7XHJcbiAgdG9nZ2xlRGlzcGxheSgpXHJcbn0pXHJcblxyXG5kb2N1bWVudC5xdWVyeVNlbGVjdG9yKFwiI25ldy1wb3B1bGF0aW9uXCIpLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCBmdW5jdGlvbigpe1xyXG4gIGN3X3Jlc2V0UG9wdWxhdGlvblVJKClcclxuICBjd19nZW5lcmF0aW9uWmVybygpO1xyXG4gIGdob3N0ID0gZ2hvc3RfY3JlYXRlX2dob3N0KCk7XHJcbiAgcmVzZXRDYXJVSSgpO1xyXG59KVxyXG5cclxuZnVuY3Rpb24gc2F2ZVByb2dyZXNzKCkge1xyXG4gIGxvY2FsU3RvcmFnZS5jd19zYXZlZEdlbmVyYXRpb24gPSBKU09OLnN0cmluZ2lmeShnZW5lcmF0aW9uU3RhdGUuZ2VuZXJhdGlvbik7XHJcbiAgbG9jYWxTdG9yYWdlLmN3X2dlbkNvdW50ZXIgPSBnZW5lcmF0aW9uU3RhdGUuY291bnRlcjtcclxuICBsb2NhbFN0b3JhZ2UuY3dfZ2hvc3QgPSBKU09OLnN0cmluZ2lmeShnaG9zdCk7XHJcbiAgbG9jYWxTdG9yYWdlLmN3X3RvcFNjb3JlcyA9IEpTT04uc3RyaW5naWZ5KGdyYXBoU3RhdGUuY3dfdG9wU2NvcmVzKTtcclxuICBsb2NhbFN0b3JhZ2UuY3dfZmxvb3JTZWVkID0gd29ybGRfZGVmLmZsb29yc2VlZDtcclxufVxyXG5cclxuZnVuY3Rpb24gcmVzdG9yZVByb2dyZXNzKCkge1xyXG4gIGlmICh0eXBlb2YgbG9jYWxTdG9yYWdlLmN3X3NhdmVkR2VuZXJhdGlvbiA9PSAndW5kZWZpbmVkJyB8fCBsb2NhbFN0b3JhZ2UuY3dfc2F2ZWRHZW5lcmF0aW9uID09IG51bGwpIHtcclxuICAgIGFsZXJ0KFwiTm8gc2F2ZWQgcHJvZ3Jlc3MgZm91bmRcIik7XHJcbiAgICByZXR1cm47XHJcbiAgfVxyXG4gIGN3X3N0b3BTaW11bGF0aW9uKCk7XHJcbiAgZ2VuZXJhdGlvblN0YXRlLmdlbmVyYXRpb24gPSBKU09OLnBhcnNlKGxvY2FsU3RvcmFnZS5jd19zYXZlZEdlbmVyYXRpb24pO1xyXG4gIGdlbmVyYXRpb25TdGF0ZS5jb3VudGVyID0gbG9jYWxTdG9yYWdlLmN3X2dlbkNvdW50ZXI7XHJcbiAgZ2hvc3QgPSBKU09OLnBhcnNlKGxvY2FsU3RvcmFnZS5jd19naG9zdCk7XHJcbiAgZ3JhcGhTdGF0ZS5jd190b3BTY29yZXMgPSBKU09OLnBhcnNlKGxvY2FsU3RvcmFnZS5jd190b3BTY29yZXMpO1xyXG4gIHdvcmxkX2RlZi5mbG9vcnNlZWQgPSBsb2NhbFN0b3JhZ2UuY3dfZmxvb3JTZWVkO1xyXG4gIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwibmV3c2VlZFwiKS52YWx1ZSA9IHdvcmxkX2RlZi5mbG9vcnNlZWQ7XHJcblxyXG4gIGN1cnJlbnRSdW5uZXIgPSB3b3JsZFJ1bih3b3JsZF9kZWYsIGdlbmVyYXRpb25TdGF0ZS5nZW5lcmF0aW9uLCB1aUxpc3RlbmVycyk7XHJcbiAgY3dfZHJhd01pbmlNYXAoKTtcclxuICBNYXRoLnNlZWRyYW5kb20oKTtcclxuXHJcbiAgcmVzZXRDYXJVSSgpO1xyXG4gIGN3X3N0YXJ0U2ltdWxhdGlvbigpO1xyXG59XHJcblxyXG5kb2N1bWVudC5xdWVyeVNlbGVjdG9yKFwiI2NvbmZpcm0tcmVzZXRcIikuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIGZ1bmN0aW9uKCl7XHJcbiAgY3dfY29uZmlybVJlc2V0V29ybGQoKVxyXG59KVxyXG5cclxuZnVuY3Rpb24gY3dfY29uZmlybVJlc2V0V29ybGQoKSB7XHJcbiAgaWYgKGNvbmZpcm0oJ1JlYWxseSByZXNldCB3b3JsZD8nKSkge1xyXG4gICAgY3dfcmVzZXRXb3JsZCgpO1xyXG4gIH0gZWxzZSB7XHJcbiAgICByZXR1cm4gZmFsc2U7XHJcbiAgfVxyXG59XHJcblxyXG4vLyBnaG9zdCByZXBsYXkgc3R1ZmZcclxuXHJcblxyXG5mdW5jdGlvbiBjd19wYXVzZVNpbXVsYXRpb24oKSB7XHJcbiAgY3dfcGF1c2VkID0gdHJ1ZTtcclxuICBnaG9zdF9wYXVzZShnaG9zdCk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGN3X3Jlc3VtZVNpbXVsYXRpb24oKSB7XHJcbiAgY3dfcGF1c2VkID0gZmFsc2U7XHJcbiAgZ2hvc3RfcmVzdW1lKGdob3N0KTtcclxuICB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lKGdhbWVMb29wKTtcclxufVxyXG5cclxuZnVuY3Rpb24gY3dfc3RhcnRHaG9zdFJlcGxheSgpIHtcclxuICBpZiAoIWRvRHJhdykge1xyXG4gICAgdG9nZ2xlRGlzcGxheSgpO1xyXG4gIH1cclxuICBjd19wYXVzZVNpbXVsYXRpb24oKTtcclxuICBjd19naG9zdFJlcGxheUludGVydmFsID0gc2V0SW50ZXJ2YWwoY3dfZHJhd0dob3N0UmVwbGF5LCBNYXRoLnJvdW5kKDEwMDAgLyBzY3JlZW5mcHMpKTtcclxufVxyXG5cclxuZnVuY3Rpb24gY3dfc3RvcEdob3N0UmVwbGF5KCkge1xyXG4gIGNsZWFySW50ZXJ2YWwoY3dfZ2hvc3RSZXBsYXlJbnRlcnZhbCk7XHJcbiAgY3dfZ2hvc3RSZXBsYXlJbnRlcnZhbCA9IG51bGw7XHJcbiAgY3dfZmluZExlYWRlcigpO1xyXG4gIGNhbWVyYS5wb3MueCA9IGxlYWRlclBvc2l0aW9uLng7XHJcbiAgY2FtZXJhLnBvcy55ID0gbGVhZGVyUG9zaXRpb24ueTtcclxuICBjd19yZXN1bWVTaW11bGF0aW9uKCk7XHJcbn1cclxuXHJcbmRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoXCIjdG9nZ2xlLWdob3N0XCIpLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCBmdW5jdGlvbihlKXtcclxuICBjd190b2dnbGVHaG9zdFJlcGxheShlLnRhcmdldClcclxufSlcclxuXHJcbmZ1bmN0aW9uIGN3X3RvZ2dsZUdob3N0UmVwbGF5KGJ1dHRvbikge1xyXG4gIGlmIChjd19naG9zdFJlcGxheUludGVydmFsID09IG51bGwpIHtcclxuICAgIGN3X3N0YXJ0R2hvc3RSZXBsYXkoKTtcclxuICAgIGJ1dHRvbi52YWx1ZSA9IFwiUmVzdW1lIHNpbXVsYXRpb25cIjtcclxuICB9IGVsc2Uge1xyXG4gICAgY3dfc3RvcEdob3N0UmVwbGF5KCk7XHJcbiAgICBidXR0b24udmFsdWUgPSBcIlZpZXcgdG9wIHJlcGxheVwiO1xyXG4gIH1cclxufVxyXG4vLyBnaG9zdCByZXBsYXkgc3R1ZmYgRU5EXHJcblxyXG4vLyBpbml0aWFsIHN0dWZmLCBvbmx5IGNhbGxlZCBvbmNlIChob3BlZnVsbHkpXHJcbmZ1bmN0aW9uIGN3X2luaXQoKSB7XHJcbiAgLy8gY2xvbmUgc2lsdmVyIGRvdCBhbmQgaGVhbHRoIGJhclxyXG4gIHZhciBtbW0gPSBkb2N1bWVudC5nZXRFbGVtZW50c0J5TmFtZSgnbWluaW1hcG1hcmtlcicpWzBdO1xyXG4gIHZhciBoYmFyID0gZG9jdW1lbnQuZ2V0RWxlbWVudHNCeU5hbWUoJ2hlYWx0aGJhcicpWzBdO1xyXG4gIHZhciBnZW5lcmF0aW9uU2l6ZSA9IGdlbmVyYXRpb25Db25maWcuY29uc3RhbnRzLmdlbmVyYXRpb25TaXplO1xyXG5cclxuICBmb3IgKHZhciBrID0gMDsgayA8IGdlbmVyYXRpb25TaXplOyBrKyspIHtcclxuXHJcbiAgICAvLyBtaW5pbWFwIG1hcmtlcnNcclxuICAgIHZhciBuZXdiYXIgPSBtbW0uY2xvbmVOb2RlKHRydWUpO1xyXG4gICAgbmV3YmFyLmlkID0gXCJiYXJcIiArIGs7XHJcbiAgICBuZXdiYXIuc3R5bGUucGFkZGluZ1RvcCA9IGsgKiA5ICsgXCJweFwiO1xyXG4gICAgbWluaW1hcGhvbGRlci5hcHBlbmRDaGlsZChuZXdiYXIpO1xyXG5cclxuICAgIC8vIGhlYWx0aCBiYXJzXHJcbiAgICB2YXIgbmV3aGVhbHRoID0gaGJhci5jbG9uZU5vZGUodHJ1ZSk7XHJcbiAgICBuZXdoZWFsdGguZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJESVZcIilbMF0uaWQgPSBcImhlYWx0aFwiICsgaztcclxuICAgIG5ld2hlYWx0aC5jYXJfaW5kZXggPSBrO1xyXG4gICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJoZWFsdGhcIikuYXBwZW5kQ2hpbGQobmV3aGVhbHRoKTtcclxuICB9XHJcbiAgbW1tLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQobW1tKTtcclxuICBoYmFyLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQoaGJhcik7XHJcbiAgd29ybGRfZGVmLmZsb29yc2VlZCA9IGJ0b2EoTWF0aC5zZWVkcmFuZG9tKCkpO1xyXG4gIGN3X2dlbmVyYXRpb25aZXJvKCk7XHJcbiAgZ2hvc3QgPSBnaG9zdF9jcmVhdGVfZ2hvc3QoKTtcclxuICByZXNldENhclVJKCk7XHJcbiAgY3VycmVudFJ1bm5lciA9IHdvcmxkUnVuKHdvcmxkX2RlZiwgZ2VuZXJhdGlvblN0YXRlLmdlbmVyYXRpb24sIHVpTGlzdGVuZXJzKTtcclxuICBzZXR1cENhclVJKCk7XHJcbiAgY3dfZHJhd01pbmlNYXAoKTtcclxuICB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lKGdhbWVMb29wKTtcclxuICBcclxufVxyXG5cclxuZnVuY3Rpb24gcmVsTW91c2VDb29yZHMoZXZlbnQpIHtcclxuICB2YXIgdG90YWxPZmZzZXRYID0gMDtcclxuICB2YXIgdG90YWxPZmZzZXRZID0gMDtcclxuICB2YXIgY2FudmFzWCA9IDA7XHJcbiAgdmFyIGNhbnZhc1kgPSAwO1xyXG4gIHZhciBjdXJyZW50RWxlbWVudCA9IHRoaXM7XHJcblxyXG4gIGRvIHtcclxuICAgIHRvdGFsT2Zmc2V0WCArPSBjdXJyZW50RWxlbWVudC5vZmZzZXRMZWZ0IC0gY3VycmVudEVsZW1lbnQuc2Nyb2xsTGVmdDtcclxuICAgIHRvdGFsT2Zmc2V0WSArPSBjdXJyZW50RWxlbWVudC5vZmZzZXRUb3AgLSBjdXJyZW50RWxlbWVudC5zY3JvbGxUb3A7XHJcbiAgICBjdXJyZW50RWxlbWVudCA9IGN1cnJlbnRFbGVtZW50Lm9mZnNldFBhcmVudFxyXG4gIH1cclxuICB3aGlsZSAoY3VycmVudEVsZW1lbnQpO1xyXG5cclxuICBjYW52YXNYID0gZXZlbnQucGFnZVggLSB0b3RhbE9mZnNldFg7XHJcbiAgY2FudmFzWSA9IGV2ZW50LnBhZ2VZIC0gdG90YWxPZmZzZXRZO1xyXG5cclxuICByZXR1cm4ge3g6IGNhbnZhc1gsIHk6IGNhbnZhc1l9XHJcbn1cclxuSFRNTERpdkVsZW1lbnQucHJvdG90eXBlLnJlbE1vdXNlQ29vcmRzID0gcmVsTW91c2VDb29yZHM7XHJcbm1pbmltYXBob2xkZXIub25jbGljayA9IGZ1bmN0aW9uIChldmVudCkge1xyXG4gIHZhciBjb29yZHMgPSBtaW5pbWFwaG9sZGVyLnJlbE1vdXNlQ29vcmRzKGV2ZW50KTtcclxuICB2YXIgY3dfY2FyQXJyYXkgPSBBcnJheS5mcm9tKGNhck1hcC52YWx1ZXMoKSk7XHJcbiAgdmFyIGNsb3Nlc3QgPSB7XHJcbiAgICB2YWx1ZTogY3dfY2FyQXJyYXlbMF0uY2FyLFxyXG4gICAgZGlzdDogTWF0aC5hYnMoKChjd19jYXJBcnJheVswXS5nZXRQb3NpdGlvbigpLnggKyA2KSAqIG1pbmltYXBzY2FsZSkgLSBjb29yZHMueCksXHJcbiAgICB4OiBjd19jYXJBcnJheVswXS5nZXRQb3NpdGlvbigpLnhcclxuICB9XHJcblxyXG4gIHZhciBtYXhYID0gMDtcclxuICBmb3IgKHZhciBpID0gMDsgaSA8IGN3X2NhckFycmF5Lmxlbmd0aDsgaSsrKSB7XHJcbiAgICB2YXIgcG9zID0gY3dfY2FyQXJyYXlbaV0uZ2V0UG9zaXRpb24oKTtcclxuICAgIHZhciBkaXN0ID0gTWF0aC5hYnMoKChwb3MueCArIDYpICogbWluaW1hcHNjYWxlKSAtIGNvb3Jkcy54KTtcclxuICAgIGlmIChkaXN0IDwgY2xvc2VzdC5kaXN0KSB7XHJcbiAgICAgIGNsb3Nlc3QudmFsdWUgPSBjd19jYXJBcnJheS5jYXI7XHJcbiAgICAgIGNsb3Nlc3QuZGlzdCA9IGRpc3Q7XHJcbiAgICAgIGNsb3Nlc3QueCA9IHBvcy54O1xyXG4gICAgfVxyXG4gICAgbWF4WCA9IE1hdGgubWF4KHBvcy54LCBtYXhYKTtcclxuICB9XHJcblxyXG4gIGlmIChjbG9zZXN0LnggPT0gbWF4WCkgeyAvLyBmb2N1cyBvbiBsZWFkZXIgYWdhaW5cclxuICAgIGN3X3NldENhbWVyYVRhcmdldCgtMSk7XHJcbiAgfSBlbHNlIHtcclxuICAgIGN3X3NldENhbWVyYVRhcmdldChjbG9zZXN0LnZhbHVlKTtcclxuICB9XHJcbn1cclxuXHJcblxyXG5kb2N1bWVudC5xdWVyeVNlbGVjdG9yKFwiI211dGF0aW9ucmF0ZVwiKS5hZGRFdmVudExpc3RlbmVyKFwiY2hhbmdlXCIsIGZ1bmN0aW9uKGUpe1xyXG4gIHZhciBlbGVtID0gZS50YXJnZXRcclxuICBjd19zZXRNdXRhdGlvbihlbGVtLm9wdGlvbnNbZWxlbS5zZWxlY3RlZEluZGV4XS52YWx1ZSlcclxufSlcclxuXHJcbmRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoXCIjbXV0YXRpb25zaXplXCIpLmFkZEV2ZW50TGlzdGVuZXIoXCJjaGFuZ2VcIiwgZnVuY3Rpb24oZSl7XHJcbiAgdmFyIGVsZW0gPSBlLnRhcmdldFxyXG4gIGN3X3NldE11dGF0aW9uUmFuZ2UoZWxlbS5vcHRpb25zW2VsZW0uc2VsZWN0ZWRJbmRleF0udmFsdWUpXHJcbn0pXHJcblxyXG5kb2N1bWVudC5xdWVyeVNlbGVjdG9yKFwiI2Zsb29yXCIpLmFkZEV2ZW50TGlzdGVuZXIoXCJjaGFuZ2VcIiwgZnVuY3Rpb24oZSl7XHJcbiAgdmFyIGVsZW0gPSBlLnRhcmdldFxyXG4gIGN3X3NldE11dGFibGVGbG9vcihlbGVtLm9wdGlvbnNbZWxlbS5zZWxlY3RlZEluZGV4XS52YWx1ZSlcclxufSk7XHJcblxyXG5kb2N1bWVudC5xdWVyeVNlbGVjdG9yKFwiI2dyYXZpdHlcIikuYWRkRXZlbnRMaXN0ZW5lcihcImNoYW5nZVwiLCBmdW5jdGlvbihlKXtcclxuICB2YXIgZWxlbSA9IGUudGFyZ2V0XHJcbiAgY3dfc2V0R3Jhdml0eShlbGVtLm9wdGlvbnNbZWxlbS5zZWxlY3RlZEluZGV4XS52YWx1ZSlcclxufSlcclxuXHJcbmRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoXCIjZWxpdGVzaXplXCIpLmFkZEV2ZW50TGlzdGVuZXIoXCJjaGFuZ2VcIiwgZnVuY3Rpb24oZSl7XHJcbiAgdmFyIGVsZW0gPSBlLnRhcmdldFxyXG4gIGN3X3NldEVsaXRlU2l6ZShlbGVtLm9wdGlvbnNbZWxlbS5zZWxlY3RlZEluZGV4XS52YWx1ZSlcclxufSlcclxuXHJcbmZ1bmN0aW9uIGN3X3NldE11dGF0aW9uKG11dGF0aW9uKSB7XHJcbiAgZ2VuZXJhdGlvbkNvbmZpZy5jb25zdGFudHMuZ2VuX211dGF0aW9uID0gcGFyc2VGbG9hdChtdXRhdGlvbik7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGN3X3NldE11dGF0aW9uUmFuZ2UocmFuZ2UpIHtcclxuICBnZW5lcmF0aW9uQ29uZmlnLmNvbnN0YW50cy5tdXRhdGlvbl9yYW5nZSA9IHBhcnNlRmxvYXQocmFuZ2UpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBjd19zZXRNdXRhYmxlRmxvb3IoY2hvaWNlKSB7XHJcbiAgd29ybGRfZGVmLm11dGFibGVfZmxvb3IgPSAoY2hvaWNlID09IDEpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBjd19zZXRHcmF2aXR5KGNob2ljZSkge1xyXG4gIHdvcmxkX2RlZi5ncmF2aXR5ID0gbmV3IGIyVmVjMigwLjAsIC1wYXJzZUZsb2F0KGNob2ljZSkpO1xyXG4gIHZhciB3b3JsZCA9IGN1cnJlbnRSdW5uZXIuc2NlbmUud29ybGRcclxuICAvLyBDSEVDSyBHUkFWSVRZIENIQU5HRVNcclxuICBpZiAod29ybGQuR2V0R3Jhdml0eSgpLnkgIT0gd29ybGRfZGVmLmdyYXZpdHkueSkge1xyXG4gICAgd29ybGQuU2V0R3Jhdml0eSh3b3JsZF9kZWYuZ3Jhdml0eSk7XHJcbiAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBjd19zZXRFbGl0ZVNpemUoY2xvbmVzKSB7XHJcbiAgZ2VuZXJhdGlvbkNvbmZpZy5jb25zdGFudHMuY2hhbXBpb25MZW5ndGggPSBwYXJzZUludChjbG9uZXMsIDEwKTtcclxufVxyXG5cclxuY3dfaW5pdCgpO1xyXG4iLCJ2YXIgcmFuZG9tID0gcmVxdWlyZShcIi4vcmFuZG9tLmpzXCIpO1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSB7XHJcbiAgY3JlYXRlR2VuZXJhdGlvblplcm8oc2NoZW1hLCBnZW5lcmF0b3Ipe1xyXG4gICAgcmV0dXJuIE9iamVjdC5rZXlzKHNjaGVtYSkucmVkdWNlKGZ1bmN0aW9uKGluc3RhbmNlLCBrZXkpe1xyXG4gICAgICB2YXIgc2NoZW1hUHJvcCA9IHNjaGVtYVtrZXldO1xyXG4gICAgICB2YXIgdmFsdWVzID0gcmFuZG9tLmNyZWF0ZU5vcm1hbHMoc2NoZW1hUHJvcCwgZ2VuZXJhdG9yKTtcclxuICAgICAgaW5zdGFuY2Vba2V5XSA9IHZhbHVlcztcclxuICAgICAgcmV0dXJuIGluc3RhbmNlO1xyXG4gICAgfSwgeyBpZDogTWF0aC5yYW5kb20oKS50b1N0cmluZygzMikgfSk7XHJcbiAgfSxcclxuICBjcmVhdGVDcm9zc0JyZWVkKHNjaGVtYSwgcGFyZW50cywgcGFyZW50Q2hvb3Nlcil7XHJcbiAgICB2YXIgaWQgPSBNYXRoLnJhbmRvbSgpLnRvU3RyaW5nKDMyKTtcclxuICAgIHJldHVybiBPYmplY3Qua2V5cyhzY2hlbWEpLnJlZHVjZShmdW5jdGlvbihjcm9zc0RlZiwga2V5KXtcclxuICAgICAgdmFyIHNjaGVtYURlZiA9IHNjaGVtYVtrZXldO1xyXG4gICAgICB2YXIgdmFsdWVzID0gW107XHJcbiAgICAgIGZvcih2YXIgaSA9IDAsIGwgPSBzY2hlbWFEZWYubGVuZ3RoOyBpIDwgbDsgaSsrKXtcclxuICAgICAgICB2YXIgcCA9IHBhcmVudENob29zZXIoaWQsIGtleSwgcGFyZW50cyk7XHJcbiAgICAgICAgdmFsdWVzLnB1c2gocGFyZW50c1twXVtrZXldW2ldKTtcclxuICAgICAgfVxyXG4gICAgICBjcm9zc0RlZltrZXldID0gdmFsdWVzO1xyXG4gICAgICByZXR1cm4gY3Jvc3NEZWY7XHJcbiAgICB9LCB7XHJcbiAgICAgIGlkOiBpZCxcclxuICAgICAgYW5jZXN0cnk6IHBhcmVudHMubWFwKGZ1bmN0aW9uKHBhcmVudCl7XHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgIGlkOiBwYXJlbnQuaWQsXHJcbiAgICAgICAgICBhbmNlc3RyeTogcGFyZW50LmFuY2VzdHJ5LFxyXG4gICAgICAgIH07XHJcbiAgICAgIH0pXHJcbiAgICB9KTtcclxuICB9LFxyXG4gIGNyZWF0ZU11dGF0ZWRDbG9uZShzY2hlbWEsIGdlbmVyYXRvciwgcGFyZW50LCBmYWN0b3IsIGNoYW5jZVRvTXV0YXRlKXtcclxuICAgIHJldHVybiBPYmplY3Qua2V5cyhzY2hlbWEpLnJlZHVjZShmdW5jdGlvbihjbG9uZSwga2V5KXtcclxuICAgICAgdmFyIHNjaGVtYVByb3AgPSBzY2hlbWFba2V5XTtcclxuICAgICAgdmFyIG9yaWdpbmFsVmFsdWVzID0gcGFyZW50W2tleV07XHJcbiAgICAgIHZhciB2YWx1ZXMgPSByYW5kb20ubXV0YXRlTm9ybWFscyhcclxuICAgICAgICBzY2hlbWFQcm9wLCBnZW5lcmF0b3IsIG9yaWdpbmFsVmFsdWVzLCBmYWN0b3IsIGNoYW5jZVRvTXV0YXRlXHJcbiAgICAgICk7XHJcbiAgICAgIGNsb25lW2tleV0gPSB2YWx1ZXM7XHJcbiAgICAgIHJldHVybiBjbG9uZTtcclxuICAgIH0sIHtcclxuICAgICAgaWQ6IHBhcmVudC5pZCxcclxuICAgICAgYW5jZXN0cnk6IHBhcmVudC5hbmNlc3RyeVxyXG4gICAgfSk7XHJcbiAgfSxcclxuICBhcHBseVR5cGVzKHNjaGVtYSwgcGFyZW50KXtcclxuICAgIHJldHVybiBPYmplY3Qua2V5cyhzY2hlbWEpLnJlZHVjZShmdW5jdGlvbihjbG9uZSwga2V5KXtcclxuICAgICAgdmFyIHNjaGVtYVByb3AgPSBzY2hlbWFba2V5XTtcclxuICAgICAgdmFyIG9yaWdpbmFsVmFsdWVzID0gcGFyZW50W2tleV07XHJcbiAgICAgIHZhciB2YWx1ZXM7XHJcbiAgICAgIHN3aXRjaChzY2hlbWFQcm9wLnR5cGUpe1xyXG4gICAgICAgIGNhc2UgXCJzaHVmZmxlXCIgOlxyXG4gICAgICAgICAgdmFsdWVzID0gcmFuZG9tLm1hcFRvU2h1ZmZsZShzY2hlbWFQcm9wLCBvcmlnaW5hbFZhbHVlcyk7IGJyZWFrO1xyXG4gICAgICAgIGNhc2UgXCJmbG9hdFwiIDpcclxuICAgICAgICAgIHZhbHVlcyA9IHJhbmRvbS5tYXBUb0Zsb2F0KHNjaGVtYVByb3AsIG9yaWdpbmFsVmFsdWVzKTsgYnJlYWs7XHJcbiAgICAgICAgY2FzZSBcImludGVnZXJcIjpcclxuICAgICAgICAgIHZhbHVlcyA9IHJhbmRvbS5tYXBUb0ludGVnZXIoc2NoZW1hUHJvcCwgb3JpZ2luYWxWYWx1ZXMpOyBicmVhaztcclxuICAgICAgICBkZWZhdWx0OlxyXG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbmtub3duIHR5cGUgJHtzY2hlbWFQcm9wLnR5cGV9IG9mIHNjaGVtYSBmb3Iga2V5ICR7a2V5fWApO1xyXG4gICAgICB9XHJcbiAgICAgIGNsb25lW2tleV0gPSB2YWx1ZXM7XHJcbiAgICAgIHJldHVybiBjbG9uZTtcclxuICAgIH0sIHtcclxuICAgICAgaWQ6IHBhcmVudC5pZCxcclxuICAgICAgYW5jZXN0cnk6IHBhcmVudC5hbmNlc3RyeVxyXG4gICAgfSk7XHJcbiAgfSxcclxufVxyXG4iLCJtb2R1bGUuZXhwb3J0cyA9IHtcclxuXHRjcmVhdGVEYXRhUG9pbnRDbHVzdGVyOiBjcmVhdGVEYXRhUG9pbnRDbHVzdGVyLFxyXG5cdGNyZWF0ZURhdGFQb2ludDogY3JlYXRlRGF0YVBvaW50LFxyXG5cdGNyZWF0ZUNsdXN0ZXJJbnRlcmZhY2U6IGNyZWF0ZUNsdXN0ZXJJbnRlcmZhY2UsXHJcblx0ZmluZERhdGFQb2ludENsdXN0ZXI6IGZpbmREYXRhUG9pbnRDbHVzdGVyLFxyXG5cdGZpbmREYXRhUG9pbnQ6IGZpbmREYXRhUG9pbnQsXHJcblx0c29ydENsdXN0ZXI6IHNvcnRDbHVzdGVyLFxyXG5cdGZpbmRPamVjdE5laWdoYm9yczogZmluZE9qZWN0TmVpZ2hib3JzLFxyXG5cdHNjb3JlT2JqZWN0OiBzY29yZU9iamVjdCxcclxuXHRjcmVhdGVTdWJEYXRhUG9pbnRDbHVzdGVyOmNyZWF0ZVN1YkRhdGFQb2ludENsdXN0ZXJcclxuXHRcclxufVxyXG5cclxuZnVuY3Rpb24gY3JlYXRlRGF0YVBvaW50Q2x1c3RlcihjYXJEYXRhUG9pbnRUeXBlKXtcclxuXHR2YXIgY2x1c3RlciA9IHtcclxuXHRcdGlkOiBjYXJEYXRhUG9pbnRUeXBlLFxyXG5cdFx0ZGF0YUFycmF5OiBuZXcgQXJyYXkoKVxyXG5cdH07XHJcblx0cmV0dXJuIGNsdXN0ZXI7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNyZWF0ZVN1YkRhdGFQb2ludENsdXN0ZXIoY2FyRGF0YVBvaW50VHlwZSl7XHJcblx0dmFyIGNsdXN0ZXIgPSB7XHJcblx0XHRpZDogY2FyRGF0YVBvaW50VHlwZSxcclxuXHRcdGRhdGFBcnJheTogbmV3IEFycmF5KClcclxuXHR9O1xyXG5cdHJldHVybiBjbHVzdGVyO1xyXG59XHJcblxyXG5mdW5jdGlvbiBjcmVhdGVEYXRhUG9pbnQoZGF0YUlkLCBkYXRhUG9pbnRUeXBlLCBkLCBzKXtcclxuXHR2YXIgZGF0YVBvaW50ID0ge1xyXG5cdFx0aWQ6IGRhdGFJZCxcclxuXHRcdHR5cGU6IGRhdGFQb2ludFR5cGUsXHJcblx0XHRkYXRhOiBkLFxyXG5cdFx0c2NvcmU6IHNcclxuXHR9O1xyXG5cdHJldHVybiBkYXRhUG9pbnQ7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNyZWF0ZUNsdXN0ZXJJbnRlcmZhY2UoaWQpe1xyXG5cdHZhciBjbHVzdGVyID0ge1xyXG5cdFx0Y2Fyc0FycmF5OiBuZXcgQXJyYXkoKSxcclxuXHRcdGNsdXN0ZXJJRDogaWQsXHJcblx0XHRhcnJheU9mQ2x1c3RlcnM6IG5ldyBBcnJheSgpXHJcblx0fTtcclxuXHRyZXR1cm4gY2x1c3RlcjtcclxufVxyXG5cclxuZnVuY3Rpb24gc29ydENsdXN0ZXIoY2x1c3Rlcil7XHJcblx0Y2x1c3Rlci5zb3J0KGZ1bmN0aW9uKGEsIGIpe3JldHVybiBhLmRhdGEgLSBiLmRhdGF9KTtcclxufVxyXG5cclxuZnVuY3Rpb24gZmluZE9qZWN0TmVpZ2hib3JzKGRhdGFJZCwgY2x1c3RlciwgcmFuZ2UpIHtcclxuXHR2YXIgbmVpZ2hib3JzID0gbmV3IEFycmF5KCk7XHJcblx0dmFyIGluZGV4ID0gY2x1c3Rlci5maW5kSW5kZXgoeD0+IHguaWQ9PT1kYXRhSWQpO1xyXG5cdHZhciBnb25lUGFzdElkID0gZmFsc2U7XHJcblx0dmFyIGNsdXN0ZXJMZW5ndGggPSBjbHVzdGVyLmxlbmd0aDtcclxuXHRmb3IodmFyIGk9MDtpPHJhbmdlO2krKyl7XHJcblx0XHRpZigoaW5kZXgtcmFuZ2UpPDApe1xyXG5cdFx0XHRpZihjbHVzdGVyW2ldLmlkPT09ZGF0YUlkKXtnb25lUGFzdElkPXRydWU7fVxyXG5cdFx0XHRuZWlnaGJvcnMucHVzaCgoZ29uZVBhc3RJZD09PWZhbHNlKT9jbHVzdGVyW2ldOmNsdXN0ZXJbaSsxXSk7XHJcblx0XHR9XHJcblx0XHRlbHNlIGlmKChpbmRleCtyYW5nZSk+Y2x1c3Rlckxlbmd0aCl7XHJcblx0XHRcdGlmKGNsdXN0ZXJbKGNsdXN0ZXJMZW5ndGgtMSktaV0uaWQ9PT1kYXRhSWQpe2dvbmVQYXN0SWQ9dHJ1ZTt9XHJcblx0XHRcdG5laWdoYm9ycy5wdXNoKChnb25lUGFzdElkPT09ZmFsc2UpP2NsdXN0ZXJbKGNsdXN0ZXJMZW5ndGgtMSktaV06Y2x1c3RlclsoY2x1c3Rlckxlbmd0aC0xKS0oaSsxKV0pO1xyXG5cdFx0fVxyXG5cdFx0ZWxzZSB7XHJcblx0XHRcdGlmKGNsdXN0ZXJbaW5kZXgtKHJhbmdlLzIpK2ldLmlkPT09ZGF0YUlkKXtnb25lUGFzdElkPXRydWU7fVxyXG5cdFx0XHRuZWlnaGJvcnMucHVzaCgoZ29uZVBhc3RJZD09PWZhbHNlKT9jbHVzdGVyW2luZGV4LShyYW5nZS8yKStpXTpjbHVzdGVyWyhpbmRleCsxKS0ocmFuZ2UvMikraV0pO1xyXG5cdFx0fVxyXG5cdFx0XHJcblx0fVxyXG5cdHJldHVybiBuZWlnaGJvcnM7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGZpbmREYXRhUG9pbnRDbHVzdGVyKGRhdGFJZCwgY2x1c3Rlcil7XHJcblx0cmV0dXJuIGNsdXN0ZXIuYXJyYXlPZkNsdXN0ZXJzLmZpbmQoeD0+IHguaWQ9PT1kYXRhSWQpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBmaW5kRGF0YVBvaW50KGRhdGFJZCwgY2x1c3Rlcil7XHJcblx0cmV0dXJuIGNsdXN0ZXIuZGF0YUFycmF5LmZpbmQoZnVuY3Rpb24odmFsdWUpe1xyXG5cdFx0cmV0dXJuIHZhbHVlLmlkPT09aWQ7XHJcblx0fSk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHNjb3JlT2JqZWN0KGlkLCBjbHVzdGVyKXtcclxuXHR2YXIgbmVpZ2hib3JzID0gZmluZE9qZWN0TmVpZ2hib3JzKGlkLCBjbHVzdGVyLCAoKGNsdXN0ZXIubGVuZ3RoLzQpPDQwKT82OjQwKTtcclxuXHR2YXIgbmV3U2NvcmUgPSAwO1xyXG5cdGZvcih2YXIgaT0wO2k8bmVpZ2hib3JzLmxlbmd0aDtpKyspe1xyXG5cdFx0bmV3U2NvcmUrPW5laWdoYm9yc1tpXS5zY29yZTtcclxuXHR9XHJcblx0cmV0dXJuIG5ld1Njb3JlL25laWdoYm9ycy5sZW5ndGg7XHJcbn0iLCJ2YXIgY2x1c3RlciA9IHJlcXVpcmUoXCIuL2NsdXN0ZXIuanMvXCIpO1xyXG4vL3ZhciBjYXJPYmplY3RzID0gcmVxdWlyZShcIi4vY2FyLW9iamVjdHMuanNvblwiKTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0ge1xyXG5cdHNldHVwOiBzZXR1cCxcclxuXHRyZVNjb3JlQ2FyczogcmVTY29yZUNhcnNcclxufVxyXG5cclxuLy9cIndoZWVsX3JhZGl1c1wiLCBcImNoYXNzaXNfZGVuc2l0eVwiLCBcInZlcnRleF9saXN0XCIsIFwid2hlZWxfdmVydGV4XCIgYW5kIFwid2hlZWxfZGVuc2l0eVwiL1xyXG5mdW5jdGlvbiBzZXR1cChjYXJzLCBleHRDbHVzdGVyLCBjbHVzdGVyUHJlY3JlYXRlZCl7XHJcblx0dmFyIGNsdXN0ID0gKGNsdXN0ZXJQcmVjcmVhdGVkPT09ZmFsc2UpP3NldHVwRGF0YUNsdXN0ZXJzKGNsdXN0ZXIuY3JlYXRlQ2x1c3RlckludGVyZmFjZShcIm5ld0NsdXN0ZXJcIikpOiBleHRDbHVzdGVyO1xyXG5cdGZvcih2YXIgaSA9MDtpPGNhcnMubGVuZ3RoO2krKyl7XHJcblx0XHRpZihjYXJzW2ldLmRlZi5lbGl0ZT09PWZhbHNlKXtcclxuXHRcdFx0YWRkQ2Fyc1RvQ2x1c3RlcihjYXJzW2ldLCBjbHVzdCk7XHJcblx0XHRcdGNsdXN0LmNhcnNBcnJheS5wdXNoKGNhcnNbaV0pO1xyXG5cdFx0fVxyXG5cdH1cclxuXHRjb25zb2xlLmxvZyhjbHVzdCk7Ly90ZXN0XHJcblx0cmV0dXJuIGNsdXN0O1xyXG59XHJcblxyXG5mdW5jdGlvbiBzZXR1cERhdGFDbHVzdGVycyhtYWluQ2x1c3Rlcil7XHJcblx0bWFpbkNsdXN0ZXIuYXJyYXlPZkNsdXN0ZXJzLnB1c2goY2x1c3Rlci5jcmVhdGVEYXRhUG9pbnRDbHVzdGVyKFwid2hlZWxfcmFkaXVzXCIpKTtcclxuXHRtYWluQ2x1c3Rlci5hcnJheU9mQ2x1c3RlcnMucHVzaChjbHVzdGVyLmNyZWF0ZURhdGFQb2ludENsdXN0ZXIoXCJjaGFzc2lzX2RlbnNpdHlcIikpO1xyXG5cdG1haW5DbHVzdGVyLmFycmF5T2ZDbHVzdGVycy5wdXNoKGNsdXN0ZXIuY3JlYXRlRGF0YVBvaW50Q2x1c3RlcihcIndoZWVsX3ZlcnRleFwiKSk7XHJcblx0bWFpbkNsdXN0ZXIuYXJyYXlPZkNsdXN0ZXJzLnB1c2goY2x1c3Rlci5jcmVhdGVEYXRhUG9pbnRDbHVzdGVyKFwidmVydGV4X2xpc3RcIikpO1xyXG5cdG1haW5DbHVzdGVyLmFycmF5T2ZDbHVzdGVycy5wdXNoKGNsdXN0ZXIuY3JlYXRlRGF0YVBvaW50Q2x1c3RlcihcIndoZWVsX2RlbnNpdHlcIikpO1xyXG5cdHJldHVybiBtYWluQ2x1c3RlcjtcclxufVxyXG5cclxuZnVuY3Rpb24gYWRkQ2Fyc1RvQ2x1c3RlcihjYXIsIGNsdXN0KXtcclxuXHRhZGREYXRhVG9DbHVzdGVyKGNhci5kZWYuaWQsIGNhci5kZWYud2hlZWxfcmFkaXVzLGNhci5zY29yZS5zLCBjbHVzdGVyLmZpbmREYXRhUG9pbnRDbHVzdGVyKFwid2hlZWxfcmFkaXVzXCIsIGNsdXN0KSk7XHJcbiAgICBhZGREYXRhVG9DbHVzdGVyKGNhci5kZWYuaWQsIGNhci5kZWYuY2hhc3Npc19kZW5zaXR5LGNhci5zY29yZS5zLCBjbHVzdGVyLmZpbmREYXRhUG9pbnRDbHVzdGVyKFwiY2hhc3Npc19kZW5zaXR5XCIsIGNsdXN0KSk7XHJcblx0YWRkRGF0YVRvQ2x1c3RlcihjYXIuZGVmLmlkLCBjYXIuZGVmLnZlcnRleF9saXN0LGNhci5zY29yZS5zLCBjbHVzdGVyLmZpbmREYXRhUG9pbnRDbHVzdGVyKFwidmVydGV4X2xpc3RcIiwgY2x1c3QpKTtcclxuXHRhZGREYXRhVG9DbHVzdGVyKGNhci5kZWYuaWQsIGNhci5kZWYud2hlZWxfdmVydGV4LGNhci5zY29yZS5zLCBjbHVzdGVyLmZpbmREYXRhUG9pbnRDbHVzdGVyKFwid2hlZWxfdmVydGV4XCIsIGNsdXN0KSk7XHJcblx0YWRkRGF0YVRvQ2x1c3RlcihjYXIuZGVmLmlkLCBjYXIuZGVmLndoZWVsX2RlbnNpdHksY2FyLnNjb3JlLnMsIGNsdXN0ZXIuZmluZERhdGFQb2ludENsdXN0ZXIoXCJ3aGVlbF9kZW5zaXR5XCIsIGNsdXN0KSk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGFkZERhdGFUb0NsdXN0ZXIoaWQsIGNhckRhdGEsIHNjb3JlLCBjbHVzdCl7XHJcblx0aWYoY2x1c3QuZGF0YUFycmF5Lmxlbmd0aD09PWNhckRhdGEubGVuZ3RoKXtcclxuXHRcdGZvcih2YXIgeD0wO3g8Y2FyRGF0YS5sZW5ndGg7eCsrKXtcclxuXHRcdFx0Y2x1c3QuZGF0YUFycmF5W3hdLmRhdGFBcnJheS5wdXNoKGNsdXN0ZXIuY3JlYXRlRGF0YVBvaW50KGlkLCBcIlwiLCBjYXJEYXRhW3hdLCBzY29yZSkpO1xyXG5cdFx0XHRjbHVzdGVyLnNvcnRDbHVzdGVyKGNsdXN0LmRhdGFBcnJheVt4XS5kYXRhQXJyYXkpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHRlbHNlIHtcclxuXHRcdGZvcih2YXIgaT0wO2k8Y2FyRGF0YS5sZW5ndGg7aSsrKXtcclxuXHRcdFx0dmFyIG5ld0NsdXN0ID0gY2x1c3Rlci5jcmVhdGVTdWJEYXRhUG9pbnRDbHVzdGVyKFwiXCIpO1xyXG5cdFx0XHRuZXdDbHVzdC5kYXRhQXJyYXkucHVzaChjbHVzdGVyLmNyZWF0ZURhdGFQb2ludChpZCwgXCJcIiwgY2FyRGF0YVtpXSwgc2NvcmUpKTtcclxuXHRcdFx0Y2x1c3QuZGF0YUFycmF5LnB1c2gobmV3Q2x1c3QpO1xyXG5cdFx0fVxyXG5cdH1cclxufVxyXG5cclxuZnVuY3Rpb24gcmVTY29yZUNhcnMoY2FycywgY2x1c3Qpe1xyXG5cdGZvcih2YXIgaT0wO2k8Y2Fycy5sZW5ndGg7aSsrKXtcclxuXHRcdHZhciBzY29yZSA9IDA7XHJcblx0XHRmb3IodmFyIHg9MDt4PGNsdXN0LmFycmF5T2ZDbHVzdGVycy5sZW5ndGg7eCsrKXtcclxuXHRcdFx0Zm9yKHZhciB5PTA7eTxjbHVzdC5hcnJheU9mQ2x1c3RlcnNbeF0uZGF0YUFycmF5Lmxlbmd0aDt5Kyspe1xyXG5cdFx0XHRcdHNjb3JlICs9IGNsdXN0ZXIuc2NvcmVPYmplY3QoY2Fyc1tpXS5kZWYuaWQsIGNsdXN0LmFycmF5T2ZDbHVzdGVyc1t4XS5kYXRhQXJyYXlbeV0uZGF0YUFycmF5KTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdFx0Y2Fyc1tpXS5zY29yZS5zICs9IHNjb3JlL2NsdXN0LmFycmF5T2ZDbHVzdGVycy5sZW5ndGg7XHJcblx0fVxyXG59XHJcblxyXG4iLCIvKnZhciByYW5kb21JbnQgPSByZXF1aXJlKFwiLi9yYW5kb21JbnQuanMvXCIpO1xyXG52YXIgZ2V0UmFuZG9tSW50ID0gcmFuZG9tSW50LmdldFJhbmRvbUludDsqL1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSB7XHJcblx0cnVuQ3Jvc3NvdmVyOiBydW5Dcm9zc292ZXJcclxufVxyXG5cclxuLypUaGlzIGZ1bmN0aW9uIGNyZWF0ZXMgdGhlIGFjdWFsIG5ldyBjYXIgYW5kIHJldHVybmVkLiBUaGUgZnVuY3Rpb24gcnVucyBhIG9uZS1wb2ludCBjcm9zc292ZXIgdGFraW5nIGRhdGEgZnJvbSB0aGUgcGFyZW50cyBwYXNzZWQgdGhyb3VnaCBhbmQgYWRkaW5nIHRoZW0gdG8gdGhlIG5ldyBjYXIuXHJcbkBwYXJhbSBwYXJlbnRzIE9iamVjdEFycmF5IC0gRGF0YSBpcyB0YWtlbiBmcm9tIHRoZXNlIGNhcnMgYW5kIGFkZGVkIHRvIHRoZSBuZXcgY2FyIHVzaW5nIGNyb3Nzb3Zlci5cclxuQHBhcmFtIHNjaGVtYSAtIFRoZSBkYXRhIG9iamVjdHMgdGhhdCBjYXIgb2JqZWN0cyBoYXZlIHN1Y2ggYXMgXCJ3aGVlbF9yYWRpdXNcIiwgXCJjaGFzc2lzX2RlbnNpdHlcIiwgXCJ2ZXJ0ZXhfbGlzdFwiLCBcIndoZWVsX3ZlcnRleFwiIGFuZCBcIndoZWVsX2RlbnNpdHlcIlxyXG5AcGFyYW0gbm9Dcm9zc292ZXJQb2ludCBpbnQgLSBUaGUgZmlyc3QgY3Jvc3NvdmVyIHBvaW50IHJhbmRvbWx5IGdlbmVyYXRlZFxyXG5AcGFyYW0gbm9Dcm9zc292ZXJQb2ludFR3byBpbnQgLSBUaGUgc2Vjb25kIGNyb3Nzb3ZlciBwb2ludCByYW5kb21seSBnZW5lcmF0ZWQgXHJcbkBwYXJhbSBjYXJObyBpbnQgLSB3aGV0aGVyIHRoaXMgY2FyIGlzIHRoZSBmaXJzdCBvciBzZWNvbmQgY2hpbGQgZm9yIHRoZSBwYXJlbnQgY2Fyc1xyXG5AcGFyYW0gcGFyZW50U2NvcmUgaW50IC0gVGhlIGF2ZXJhZ2Ugc2NvcmUgb2YgdGhlIHR3byBwYXJlbnRzXHJcbkBwYXJhbSBub0NhcnNDcmVhdGVkIGludCAtIFRoZSBudW1iZXIgb2YgY2FycyBjcmVhdGVkIHNvIGZhciwgdXNlZCBmb3IgdGhlIG5ldyBjYXJzIGlkXHJcbkBwYXJhbSBjcm9zc292ZXJUeXBlIGludCAtIFRoZSB0eXBlIG9mIGNyb3Nzb3ZlciB0byB1c2Ugc3VjaCBhcyAxIGZvciBPbmUgcG9pbnQgY3Jvc3NvdmVyIGFueSBvdGhlciBUd28gcG9pbnQgY3Jvc3NvdmVyXHJcbkByZXR1cm4gY2FyIE9iamVjdCAtIEEgY2FyIG9iamVjdCBpcyBjcmVhdGVkIGFuZCByZXR1cm5lZCovXHJcbmZ1bmN0aW9uIGNvbWJpbmVEYXRhKHBhcmVudHMsIHNjaGVtYSwgbm9Dcm9zc292ZXJQb2ludCwgbm9Dcm9zc292ZXJQb2ludFR3bywgY2FyTm8sIHBhcmVudFNjb3JlLG5vQ2Fyc0NyZWF0ZWQsIGNyb3Nzb3ZlclR5cGUpe1xyXG5cdHZhciBpZCA9IG5vQ2Fyc0NyZWF0ZWQrY2FyTm87XHJcblx0dmFyIGtleUl0ZXJhdGlvbiA9IDA7XHJcblx0cmV0dXJuIE9iamVjdC5rZXlzKHNjaGVtYSkucmVkdWNlKGZ1bmN0aW9uKGNyb3NzRGVmLCBrZXkpe1xyXG4gICAgICB2YXIgc2NoZW1hRGVmID0gc2NoZW1hW2tleV07XHJcbiAgICAgIHZhciB2YWx1ZXMgPSBbXTtcclxuICAgICAgZm9yKHZhciBpID0gMCwgbCA9IHNjaGVtYURlZi5sZW5ndGg7IGkgPCBsOyBpKyspe1xyXG4gICAgICAgIHZhciBwID0gY3Jvc3NvdmVyKGNhck5vLCBub0Nyb3Nzb3ZlclBvaW50LCBub0Nyb3Nzb3ZlclBvaW50VHdvLCBrZXlJdGVyYXRpb24sIGNyb3Nzb3ZlclR5cGUpO1xyXG4gICAgICAgIHZhbHVlcy5wdXNoKHBhcmVudHNbcF1ba2V5XVtpXSk7XHJcbiAgICAgIH1cclxuICAgICAgY3Jvc3NEZWZba2V5XSA9IHZhbHVlcztcclxuXHQgIGtleUl0ZXJhdGlvbisrO1xyXG4gICAgICByZXR1cm4gY3Jvc3NEZWY7XHJcbiAgICB9ICwge1xyXG5cdFx0aWQ6IGlkLFxyXG5cdFx0cGFyZW50c1Njb3JlOiBwYXJlbnRTY29yZVxyXG5cdH0pO1xyXG59XHJcblxyXG4vKlRoaXMgZnVuY3Rpb24gY2hvb3NlcyB3aGljaCBjYXIgdGhlIGRhdGEgaXMgdGFrZW4gZnJvbSBiYXNlZCBvbiB0aGUgcGFyYW1ldGVycyBnaXZlbiB0byB0aGUgZnVuY3Rpb25cclxuQHBhcmFtIGNhck5vIGludCAtIFRoaXMgaXMgdGhlIG51bWJlciBvZiB0aGUgY2FyIGJlaW5nIGNyZWF0ZWQgYmV0d2VlbiAxLTIsIGZpbHRlcnMgY2FycyBkYXRhIGlzIGJlaW5nIHRha2VuXHJcbkBwYXJhbSBub0Nyb3Nzb3ZlclBvaW50IGludCAtIFRoZSBmaXJzdCBjcm9zc292ZXIgcG9pbnQgd2hlcmUgZGF0YSBiZWZvcmUgb3IgYWZ0ZXIgdGhlIHBvaW50IGlzIHRha2VuXHJcbkBwYXJhbSBub0Nyb3Nzb3ZlclBvaW50VHdvIGludCAtIFRoZSBzZWNvbmQgY3Jvc3NvdmVyIHBvaW50IHdoZXJlIGRhdGEgaXMgYmVmb3JlIG9yIGFmdGVyIHRoZSBwb2ludCBpcyB0YWtlblxyXG5AcGFyYW0ga2V5SXRlcmF0aW9uIGludCAtIFRoaXMgaXMgdGhlIHBvaW50IGF0IHdoaWNoIHRoZSBjcm9zc292ZXIgaXMgY3VycmVudGx5IGF0IHdoaWNoIGhlbHAgc3BlY2lmaWVzIHdoaWNoIGNhcnMgZGF0YSBpcyByZWxhdmVudCB0byB0YWtlIGNvbXBhcmluZyB0aGlzIHBvaW50IHRvIHRoZSBvbmUvdHdvIGNyb3Nzb3ZlIHBvaW50c1xyXG5AcGFyYW0gY3Jvc3NvdmVUeXBlIGludCAtIFRoaXMgc3BlY2lmaWVzIGlmIG9uZSBwb2ludCgxKSBvciB0d28gcG9pbnQgY3Jvc3NvdmVyKGFueSBpbnQpIGlzIHVzZWRcclxuQHJldHVybiBpbnQgLSBXaGljaCBwYXJlbnQgZGF0YSBzaG91bGQgYmUgdGFrZW4gZnJvbSBpcyByZXR1cm5lZCBlaXRoZXIgMCBvciAxKi9cclxuZnVuY3Rpb24gY3Jvc3NvdmVyKGNhck5vLCBub0Nyb3Nzb3ZlclBvaW50LCBub0Nyb3Nzb3ZlclBvaW50VHdvLGtleUl0ZXJhdGlvbixjcm9zc292ZXJUeXBlKXtcclxuXHRpZihjcm9zc292ZXJUeXBlPT09MSl7IC8vcnVuIG9uZS1wb2ludCBjcm9zc292ZXJcclxuXHRcdHJldHVybiAoY2FyTm89PT0xKT8oa2V5SXRlcmF0aW9uPj1ub0Nyb3Nzb3ZlclBvaW50KT8wOjE6KGtleUl0ZXJhdGlvbj49bm9Dcm9zc292ZXJQb2ludCk/MTowOy8vIGhhbmRsZXMgdGhlIGZpeGVkIG9uZS1wb2ludCBzd2l0Y2ggb3ZlclxyXG5cdH1cclxuXHRlbHNlIHsgLy9ydW4gdHdvLXBvaW50IGNyb3Nzb3ZlclxyXG5cdFx0aWYoY2FyTm89PT0xKXtcclxuXHRcdFx0aWYoKChrZXlJdGVyYXRpb24+bm9Dcm9zc292ZXJQb2ludCkmJihrZXlJdGVyYXRpb248bm9Dcm9zc292ZXJQb2ludFR3bykpfHwoKGtleUl0ZXJhdGlvbj5ub0Nyb3Nzb3ZlclBvaW50VHdvKSYmKGtleUl0ZXJhdGlvbjxub0Nyb3Nzb3ZlclBvaW50KSkpe1xyXG5cdFx0XHRcdHJldHVybiAwO1xyXG5cdFx0XHR9XHJcblx0XHRcdGVsc2UgeyByZXR1cm4gMTt9XHJcblx0XHR9XHJcblx0XHRlbHNle1xyXG5cdFx0XHRpZigoKGtleUl0ZXJhdGlvbj5ub0Nyb3Nzb3ZlclBvaW50KSYmKGtleUl0ZXJhdGlvbjxub0Nyb3Nzb3ZlclBvaW50VHdvKSl8fCgoa2V5SXRlcmF0aW9uPm5vQ3Jvc3NvdmVyUG9pbnRUd28pJiYoa2V5SXRlcmF0aW9uPG5vQ3Jvc3NvdmVyUG9pbnQpKSl7XHJcblx0XHRcdFx0cmV0dXJuIDE7XHJcblx0XHRcdH1cclxuXHRcdFx0ZWxzZSB7IHJldHVybiAwO31cclxuXHRcdH1cclxuXHR9XHJcbn1cclxuXHJcbi8qVGhpcyBmdW5jdGlvbiByYW5kb21seSBnZW5lcmF0ZXMgdHdvIGNyb3Nzb3ZlciBwb2ludHMgYW5kIHBhc3NlcyB0aGVtIHRvIHRoZSBjcm9zc292ZXIgZnVuY3Rpb25cclxuQHBhcmFtIHBhcmVudHMgT2JqZWN0QXJyYXkgLSBBbiBhcnJheSBvZiB0aGUgcGFyZW50cyBvYmplY3RzXHJcbkBwYXJhbSBjcm9zc292ZXJUcHllIGludCAtIFNwZWNpZmllZCB3aGljaCBjcm9zc292ZXIgc2hvdWxkIGJlIHVzZWRcclxuQHBhcmFtIHNjaGVtYSAtIENhciBvYmplY3QgZGF0YSB0ZW1wbGF0ZSB1c2VkIGZvciBjYXIgY3JlYXRpb25cclxuQHBhcmFtIHBhcmVudFNjb3JlIGludCAtIEF2ZXJhZ2UgbnVtYmVyIG9mIHRoZSBwYXJlbnRzIHNjb3JlXHJcbkBwYXJhbSBub0NhcnNDcmVhdGVkIGludCAtIG51bWJlciBvZiBjYXJzIGNyZWF0ZWQgZm9yIHRoZSBzaW11bGF0aW9uXHJcbkBwYXJhbSBub0NhcnNUb0NyZWF0ZSBpbnQgLSB0aGUgbnVtYmVyIG9mIG5ldyBjYXJzIHRoYXQgc2hvdWxkIGJlIGNyZWF0ZWQgdmlhIGNyb3Nzb3ZlclxyXG5AcmV0dXJuIGNhciBPYmplY3RBcnJheSAtIEFuIGFycmF5IG9mIG5ld2x5IGNyZWF0ZWQgY2FycyBmcm9tIHRoZSBjcm9zc292ZXIgYXJlIHJldHVybmVkKi9cclxuZnVuY3Rpb24gcnVuQ3Jvc3NvdmVyKHBhcmVudHMsY3Jvc3NvdmVyVHlwZSxzY2hlbWEsIHBhcmVudHNTY29yZSxub0NhcnNDcmVhdGVkLCBub0NhcnNUb0NyZWF0ZSl7XHJcblx0dmFyIG5ld0NhcnMgPSBuZXcgQXJyYXkoKTtcclxuXHR2YXIgY3Jvc3NvdmVyUG9pbnRPbmU9Z2V0UmFuZG9tSW50KDAsNCwgbmV3IEFycmF5KCkpO1xyXG5cdHZhciBjcm9zc292ZXJQb2ludFR3bz1nZXRSYW5kb21JbnQoMCw0LCBbY3Jvc3NvdmVyUG9pbnRPbmVdKTtcclxuXHRmb3IodmFyIGk9MDtpPG5vQ2Fyc1RvQ3JlYXRlO2krKyl7XHJcblx0XHRuZXdDYXJzLnB1c2goY29tYmluZURhdGEocGFyZW50cyxzY2hlbWEsIGNyb3Nzb3ZlclBvaW50T25lLCBjcm9zc292ZXJQb2ludFR3bywgaSwgcGFyZW50c1Njb3JlLG5vQ2Fyc0NyZWF0ZWQsY3Jvc3NvdmVyVHlwZSkpO1xyXG5cdH1cclxuXHRyZXR1cm4gbmV3Q2FycztcclxufVxyXG5cclxuLypUaGlzIGZ1bmN0aW9uIHJldHVybnMgd2hvbGUgaW50cyBiZXR3ZWVuIGEgbWluaW11bSBhbmQgbWF4aW11bVxyXG5AcGFyYW0gbWluIGludCAtIFRoZSBtaW5pbXVtIGludCB0aGF0IGNhbiBiZSByZXR1cm5lZFxyXG5AcGFyYW0gbWF4IGludCAtIFRoZSBtYXhpbXVtIGludCB0aGF0IGNhbiBiZSByZXR1cm5lZFxyXG5AcGFyYW0gbm90RXF1YWxzQXJyIGludEFycmF5IC0gQW4gYXJyYXkgb2YgdGhlIGludHMgdGhhdCB0aGUgZnVuY3Rpb24gc2hvdWxkIG5vdCByZXR1cm5cclxuQHJldHVybiBpbnQgLSBUaGUgaW50IHdpdGhpbiB0aGUgc3BlY2lmaWVkIHBhcmFtZXRlciBib3VuZHMgaXMgcmV0dXJuZWQuKi9cclxuZnVuY3Rpb24gZ2V0UmFuZG9tSW50KG1pbiwgbWF4LCBub3RFcXVhbHNBcnIpIHtcclxuXHR2YXIgdG9SZXR1cm47XHJcblx0dmFyIHJ1bkxvb3AgPSB0cnVlO1xyXG5cdHdoaWxlKHJ1bkxvb3A9PT10cnVlKXtcclxuXHRcdG1pbiA9IE1hdGguY2VpbChtaW4pO1xyXG5cdFx0bWF4ID0gTWF0aC5mbG9vcihtYXgpO1xyXG5cdFx0dG9SZXR1cm4gPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAobWF4IC0gbWluICsgMSkpICsgbWluO1xyXG5cdFx0aWYodHlwZW9mIGZpbmRJZkV4aXN0cyA9PT0gXCJ1bmRlZmluZWRcIil7XHJcblx0XHRcdHJ1bkxvb3A9ZmFsc2U7XHJcblx0XHR9XHJcblx0XHRlbHNlIGlmKG5vdEVxdWFsc0Fyci5maW5kKGZ1bmN0aW9uKHZhbHVlKXtyZXR1cm4gdmFsdWU9PT10b1JldHVybjt9KT09PWZhbHNlKXtcclxuXHRcdFx0cnVuTG9vcD1mYWxzZTtcclxuXHRcdH1cclxuXHR9XHJcbiAgICByZXR1cm4gdG9SZXR1cm47Ly8odHlwZW9mIGZpbmRJZkV4aXN0cyA9PT0gXCJ1bmRlZmluZWRcIik/dG9SZXR1cm46Z2V0UmFuZG9tSW50KG1pbiwgbWF4LCBub3RFcXVhbHNBcnIpO1xyXG59XHJcbiIsIm1vZHVsZS5leHBvcnRzPXtcIm5hbWVcIjpcIm9iamVjdHNcIixcImFycmF5XCI6W3tcImlkXCI6XCIwLmhkZjVxbjd2cm1cIixcIndoZWVsX3JhZGl1c1wiOlswLjU3Njc2OTA4MjQ3MjEyNDgsMC40MTc3Mjg2MTU0NDc2ODM2XSxcIndoZWVsX2RlbnNpdHlcIjpbMC4wNTgwNTgyODQ5OTMyMjc2MywwLjU1NTg0ODUwMjkyMTgyMTZdLFwiY2hhc3Npc19kZW5zaXR5XCI6WzAuMDE3NDY5MjI0ODI4MzA2MTVdLFwidmVydGV4X2xpc3RcIjpbMC43OTQxNTQ2MDI3NTMxNzk0LDAuMzM4NjEwNTgzMTM0MTgzNDYsMC45ODE3OTY2NzI3MzUwODg2LDAuMDQwNTgzOTE4OTkwMzk0NzEsMC42NzkyNzY0ODQwMDg0NTc3LDAuNzA5NTUxNjgzMzQyOTg2OSwwLjQ0NDI5Mjk2ODk3ODYwMzcsMC4zNzE1OTcwOTYzMzk3ODE0NCwwLjQ4NjU1NDkxMzg5ODA3MzE1LDAuODE5NDg5NzQzNDY3OTk0OSwwLjA2NzkxMjkyNzYyOTIyMjUyLDAuODUwMDYxNzE4Nzk4MTIwMV0sXCJ3aGVlbF92ZXJ0ZXhcIjpbMC4zMTk3NDU0ODMzODA0ODA1LDAuMDczMDY4MzI1NTM0NDM1MzIsMC45Njk2NjgwMjIxMzIxOTE4LDAuMjgyNDI5MTQ0NjI4ODY4NSwwLjIzODAxMDg0MzUzNTYyNjMsMC4wMzQyMDE2MzY1Mjg1MDAwNiwwLjM5MzAyMDQ0Nzg0OTQwMTUsMC45MjkyNTg5MDI2MTY4NjA1XSxcImluZGV4XCI6MH0se1wiaWRcIjpcIjAuZGR2cW85YzR1NVwiLFwid2hlZWxfcmFkaXVzXCI6WzAuMDc2MjczMTE2NTM2OTAzMDUsMC4zODA3NzU2NTgyNDcwNjM4M10sXCJ3aGVlbF9kZW5zaXR5XCI6WzAuMDE4NjM2OTc4ODEwODY0NjgsMC4wMjY4NjQzNjE3ODkzMTAyODddLFwiY2hhc3Npc19kZW5zaXR5XCI6WzAuNzA0NTU2ODU5Njk2OTgxOF0sXCJ2ZXJ0ZXhfbGlzdFwiOlswLjg4Mjc4MzY3Mzg0NTE0MTMsMC40MTkwNjE3NDkzNDk5OTg0LDAuMDE3MTQ3NjI2ODQ0NDE3MDYzLDAuMjI3NzU1MzUzNDUyNTIwMywwLjkzOTE4NTIzMDA1NjIzOTEsMC40MTYyMzUzNTA0NzQ3OTk3NiwwLjY2Nzg3NDI5NjY1NTQyMywwLjMxODQ5MzYwOTI5ODQyMjMsMC44ODU2MDE3OTIyNjMyMTQsMC4xMzQ2NTM5ODExNjIzOTY4LDAuMzIyMzg1MzAzODcyNDg4LDAuMTYxNDA3NDcyMzk2OTAxXSxcIndoZWVsX3ZlcnRleFwiOlswLjE3MjA2NjI1MTY3MTgyNTQzLDAuMjg2NDMwNjI3NzUwMjA2MiwwLjkzODUxMzg4NTkzODk2MTcsMC43MTIwNTE2MzQ2Nzg5NzAzLDAuNDc2ODE4NDE3NzYzMDEyMTUsMC45NTczNDIwMDU3MzcxNjE1LDAuMzQ3Nzk2NTc2MDM0MTkwNTYsMC40OTQyNDI4MDAxMzY5NTAxXSxcImluZGV4XCI6MX0se1wiaWRcIjpcIjAuaTU4ZWljdW9ncFwiLFwid2hlZWxfcmFkaXVzXCI6WzAuODc5Nzc0MjIwMjc5MzY5MiwwLjQ5NDYwOTAwNDE3MDE2NjNdLFwid2hlZWxfZGVuc2l0eVwiOlswLjY5MDc3MTU3MDAyMzk1NjMsMC4zNTQzMjk4NDk5MzU2MTU1Nl0sXCJjaGFzc2lzX2RlbnNpdHlcIjpbMC45OTcxMDk3NjM5MzU4NTk3XSxcInZlcnRleF9saXN0XCI6WzAuMzM1NTkzOTc2Njc5NTY4NiwwLjM2NzcwMzU2MTYxMjA5OTYsMC4yNTIyMTAxNzQwODEzMTQ3NCwwLjYwNDIxMzU3MTgxNjQzNSwwLjE0MzAzMDM2OTc2NTE3NDcsMC42NzA3NDE0NTM4NTAxMzQ0LDAuNzk3NjQxMDc5MDU4NTc5NywwLjAwMzMwNDAxOTMxNTc1ODI5OTgsMC40ODIyNTg2NDUwMDUzMDAzNiwwLjk3MjI0NjM0OTA3Mzk4NjMsMC4xMzMyNjY4NTE5MDYxODgxNCwwLjI0NTExODYzNjgxODYzMjY2XSxcIndoZWVsX3ZlcnRleFwiOlswLjkxMzQ2MzI1NzY3NjMzNTUsMC44MDI4NTU3MTc5MjMxMzUzLDAuMDY1MjA4ODc2MDIwMDI2NDUsMC41MDA4Nzg0ODQxNzUzNDE4LDAuMjk2NjA4MjI5NjQ5Mjk3MzQsMC44MjY4ODQ3OTcwNDk5MzMzLDAuNzAzNTEwNzcyNjc2ODc3OSwwLjAyMDE0OTE1NjcyMDMxMTE0NV0sXCJpbmRleFwiOjJ9LHtcImlkXCI6XCIwLmd1dGo3NmE4OGZcIixcIndoZWVsX3JhZGl1c1wiOlswLjkyOTMyMjkxNzk4MjE5ODUsMC4xNDA5NjAxODgwNjQyOTcyMl0sXCJ3aGVlbF9kZW5zaXR5XCI6WzAuOTYxMDY2ODc0MTc4NDQ1MiwwLjEyOTE4OTM1MDQ1NTQ0NjIyXSxcImNoYXNzaXNfZGVuc2l0eVwiOlswLjQ0MTI5Mzg2MTI3NzQ3NzNdLFwidmVydGV4X2xpc3RcIjpbMC41MDk2NjYyODUzOTAxMjcsMC4wNDQwNDI0NzAzNzE4ODM4LDAuMzIzNTU1MTQ2MTU0ODEwOTYsMC41MDI4NTYwNDkxNDY3ODM3LDAuODg1NTUyNTYxMTg0Njg4NiwwLjY2MzQ3NDc2MzM5MDg4MTcsMC4wNTM3MjAxMzU0Nzk3MjUyMDYsMC4wMzkzOTkxOTExMzQ3MzU3OCwwLjg2NTkxMzA0Nzk5ODgwMzMsMC41MjkyNjEwMTkxMTU1NzkzLDAuMjU4NDQ5NzQ0MTE3MzM5NDUsMC4xNTY3NDk1MzU5MzMwNTg2M10sXCJ3aGVlbF92ZXJ0ZXhcIjpbMC4xMDkyMjUyOTc5ODU0Njc1NCwwLjg2OTc2NzA3NTA0NjEyNjgsMC44MzA4MDc5NDU5ODc3MzEzLDAuNjM4MzEwMjc2NjE5NzUyOCwwLjcwOTk5Njk4NTgwOTYyOTYsMC41Mzg5NTA5NzQ1MTExNDIzLDAuODk3ODM3NjMzMTk2MTEyOSwwLjY0MjA2NjQ1MDEwODU4ODRdLFwiaW5kZXhcIjozfSx7XCJpZFwiOlwiMC5zMHFiOGdkMXVrOFwiLFwid2hlZWxfcmFkaXVzXCI6WzAuNzIxOTg2NTk0MTA1MDAwMywwLjg3NDkyMjg3NjQ4OTg2MjddLFwid2hlZWxfZGVuc2l0eVwiOlswLjg4ODg4MjczMTk3MzQ0NjcsMC4zNjMzNzgwOTcyMjg0ODE3XSxcImNoYXNzaXNfZGVuc2l0eVwiOlswLjc4MTE1MTQzNDE3ODg5NzJdLFwidmVydGV4X2xpc3RcIjpbMC4wNzEwMjk4MjUxOTAyMjI2LDAuMDQ3Nzc4Mzk5MjE3NjA3OTYsMC4xMzI1ODg4Mzg4OTkzODA1NiwwLjk3NjY2NDc2NzMzMDY4NTYsMC41NDAwMzk5MzM2NzI1NzA3LDAuMDA5NDkwMzAzMjcxNTgxODQ2LDAuNjEwNTYxODM0NTI5MzYwMiwwLjMwNzY5Njg0MDY0NjI4OTQ0LDAuOTUzNjgyMjEzMDM2MTM3NSwwLjY2MDg5NjA5ODE1NzM4NzMsMC4zODc4ODc2Njg0MTIzNTM1NiwwLjE0Njk4MjExMjczNTE1MTE2XSxcIndoZWVsX3ZlcnRleFwiOlswLjQ1Nzk2MDU1Mzk4MTE5NzA2LDAuNTA4MjM4NDAwNTM4NzkxNCwwLjY5MTAwNzA2MzczMzk1MjcsMC40OTQ5MTQ4MDU3NjE5NTA1NywwLjAxNzU2NDk4MzA1NjY2OTUzNiwwLjkwMDQxODcxMjE5MzkyMzYsMC45NTA4ODgxNDk0NDM3NzgsMC4zMTQ1NzcxODc5OTgzMTM5XSxcImluZGV4XCI6NH0se1wiaWRcIjpcIjAuYW01MHNrZmlmdjhcIixcIndoZWVsX3JhZGl1c1wiOlswLjQzNzE3ODIxNTE3MDUwMTcsMC4xNjkzNDQwNzUyODY2OTU5M10sXCJ3aGVlbF9kZW5zaXR5XCI6WzAuNTE1NTYxNTUzMDM4MjQ0NSwwLjM3NDYzOTg2MjY1NTg0ODddLFwiY2hhc3Npc19kZW5zaXR5XCI6WzAuOTc3NzgzMTAxMDM5ODU3OV0sXCJ2ZXJ0ZXhfbGlzdFwiOlswLjQyMTgyNTQzMzI5MTg0MDMsMC4xMzQwMjk5MTk3OTc5ODU5NSwwLjU2Nzk1MjM4MzM4MDQyNjEsMC45OTg2MzYwNDU0NzEyMTMxLDAuMTM3MDIyNjUyOTA0OTcxNCwwLjY4NjYyMjY3MjM5OTQzMDksMC4yMTA4NTA2NjcyMjg1ODE0OCwwLjExMjAxMjgxMDM2MzQ3ODU0LDAuNjQ1ODg2ODA4Mzg5NjI0MywwLjc2ODYzNDkxNzkxOTI1OTUsMC41NjMxMjc5NDEwODMzMDc3LDAuODkyOTUyNzg3MDI3NzM5NF0sXCJ3aGVlbF92ZXJ0ZXhcIjpbMC4zMjAxMzAwNDYzMzkzMTAyLDAuNzg4MTMwNDc4NTI5NzY2OSwwLjE5OTQ2MjI2NjM4NzA5NTMsMC41MzYxMzEyNDcwNzkwNTIyLDAuOTM3Mjg0NDcwNDMyNzA3NywwLjYwMjk1NjYxMDkyMDc5MzEsMC42NjU0OTU5OTIwMzkxODIxLDAuMjU0NDA3NTYwNzkyMDkxN10sXCJpbmRleFwiOjV9LHtcImlkXCI6XCIwLm1qY2c5ZmVtYW5nXCIsXCJ3aGVlbF9yYWRpdXNcIjpbMC42MDc1Mjg2MTc4OTk2MzM1LDAuMDI4OTMyMzUwODc4Mjk5OTNdLFwid2hlZWxfZGVuc2l0eVwiOlswLjY4ODExNzEwODkyMDU1NDksMC4zNjgxMzY5MDMwNTE3NzYyN10sXCJjaGFzc2lzX2RlbnNpdHlcIjpbMC45MTk0NzQzNjY3OTQ3OTMxXSxcInZlcnRleF9saXN0XCI6WzAuOTA0NTY2NjkwODEzMjg4MSwwLjAzMTcwMTQ0OTMwNDc4MDI1LDAuMzMzODQxMzAwMjEzNzQwNiwwLjc4NDgxNzAzODU0MDgyNjYsMC44ODMyNDA3NzcyMjQyODE2LDAuODI2NTMzNDcxODc2OTE0NCwwLjk2Mjk2OTU1MzEyNDQyMjksMC4yNzM2MDQxNDAyMDkyMTkxLDAuODA4ODA4NzQ0OTc2MzgwMSwwLjQxMDc2MTA3MzEyNzk0NTYzLDAuODIxNzk5NjYzMzY3OTcwNSwwLjE0ODM3MDIzNjUyMzE3MzZdLFwid2hlZWxfdmVydGV4XCI6WzAuMTE0ODA3ODE3NDM1MTMxMDIsMC4xNjk3MzY4OTk0OTc3MTczLDAuMjI5ODY0MTU5MjIwNTQ1MjYsMC45NTExNTM2NTQ2Mzc1MzU3LDAuNzgwOTIzMTI5MjM5MTQ1LDAuNzkxMDI2ODM4OTY2MzgyOCwwLjM0NTYxMDM0NjQ3NzYyNzcsMC45NjEzODU5Nzc2NTI3OTA3XSxcImluZGV4XCI6Nn0se1wiaWRcIjpcIjAuaWRmanZlNmY4dDhcIixcIndoZWVsX3JhZGl1c1wiOlswLjU0MTE1NTk1ODE0OTUxNzMsMC40NDEyNTA1MzA0ODA4OTA0N10sXCJ3aGVlbF9kZW5zaXR5XCI6WzAuMjU5MDk4NzU0OTI4MjYyODQsMC40NzAyMTM5OTA2OTQ1NjMyN10sXCJjaGFzc2lzX2RlbnNpdHlcIjpbMC4zNjEzNzI4MjAyMjg1MDE2XSxcInZlcnRleF9saXN0XCI6WzAuNDEwMjEzOTE1NDQyNjkzMTQsMC45ODgxOTMyOTY5NzY5NTg5LDAuNDk4NDcxMTQ4NTk1NTQ4ODYsMC4zNzMxOTc2ODc2ODgwNTk4MywwLjAwNTAwMjUxMzQ3NzkyOTkwNCwwLjQ4OTkzOTk0NTUwNzM3Njc0LDAuOTY3Mjc1NjgyNDAxMTY4MSwwLjYxMDkyNzExNzM5MjcsMC42Njk4MDE0NzUxMjM4ODcyLDAuOTk3MzY5MDI4MDk1MDA2NywwLjE5NDQzNjMyODY5NDQ2MjE1LDAuMDQ3NjU4NDcwNTUwNDU0MTM1XSxcIndoZWVsX3ZlcnRleFwiOlswLjI4NjQyNzA3NDQ4MDU0ODYsMC4xOTA0MDA4MzgwNjExMjg2MiwwLjc3MTk1NDc2MTgyMDc2NzYsMC4zMTMwNjg4MDIzOTkyNDIzLDAuNTUyOTkxNjM2NDI1OTIwMiwwLjkxMzM0MzQ4MDgzNzY2MTksMC40NzExNTI5MDYyMjY2ODg2LDAuODg3MTM2MDI0ODIxMDM5OF0sXCJpbmRleFwiOjd9LHtcImlkXCI6XCIwLjlrZXY3ZWVmcDNcIixcIndoZWVsX3JhZGl1c1wiOlswLjI5ODMxNTI3MzA0ODU4MTYzLDAuNzU0NDg5NTcxNjA4NzYwNV0sXCJ3aGVlbF9kZW5zaXR5XCI6WzAuMTk4MTg3Nzk4ODM1NjY4NCwwLjcwMTc0MDcxMjMyMjczNTVdLFwiY2hhc3Npc19kZW5zaXR5XCI6WzAuMTI2OTgwMDIxMTk3MjM2MDZdLFwidmVydGV4X2xpc3RcIjpbMC45MTg5MjgzMjQzNjQ0MjI4LDAuNjcxMTQxNjM3ODY3MzAyNSwwLjUwNzk0MTkyODk3OTkzNTQsMC42MTgxMDM2NDg0MjQ0MjQ0LDAuOTQ3OTY5NTY2MjIzOTQxMSwwLjI2OTczMzUzOTM4OTU2MzQ2LDAuNzc1NjUxMzU4ODkyMjk4LDAuODc1NjE2OTIzMzI5MzkwNywwLjA1NzcyNjAyNjc4ODExNTY3LDAuMjU1NDk1MDc3MzY5Mjg2OCwwLjczOTg2NDE2MzgxMDYyMDMsMC43MTE2ODY3NjQwMDM3NDc0XSxcIndoZWVsX3ZlcnRleFwiOlswLjEzMjExMDg4MjM5MjEzMTUzLDAuMDI3MDQyNDY0NjAzMzc2MDA0LDAuMDAyNzA0NjAyMjQ4NDgyNjc5MywwLjkxODg5MDg0MTIwNDcxMjgsMC4xMjczNDkzNzMzMDM0NjY5NiwwLjYzMTI0MDkxMzk3ODU3ODYsMC41NDU4MzYxMTQzNDgzNzcyLDAuNDIwMjc4MDEyMzAzNzcwOF0sXCJpbmRleFwiOjh9LHtcImlkXCI6XCIwLjk0b3YxaXZ2ZDFnXCIsXCJ3aGVlbF9yYWRpdXNcIjpbMC40MjE3NDU0ODY1NTY4NTQ2LDAuMTQ5MzA0NjI4Njc3Mzc3Nl0sXCJ3aGVlbF9kZW5zaXR5XCI6WzAuMTU3ODAwMTQ1Mzk3ODU3NDcsMC42MzQ5Mzg3OTA5MTAzOTA3XSxcImNoYXNzaXNfZGVuc2l0eVwiOlswLjI2MTEwMTUwODIwMjIwODFdLFwidmVydGV4X2xpc3RcIjpbMC4xNjE0MDU2MTk4MTE1MDY4LDAuNzA3MzM4NTMwODgzMTQ4MSwwLjg4NjU3NzUyMDQwNTk5MjUsMC4zODU5Mjk1OTU3MjI2ODE4LDAuMDA2MzIzNzQxNDkwNzIyOTAxLDAuNTYwMDcxNzE2MDMzODIyMiwwLjcxNTA4Mjg1ODQzNDQ0MDQsMC40NjQ1NDUxNTUzNDgzNzUyNiwwLjA4Nzg3MTE2OTA3MTU2NzIyLDAuNzQ4MjcyNjQyNDM4MTM4MywwLjYwMDczMzQwNzkxOTE4NjgsMC4zMTI3MTE4NzEwMzIyODg3XSxcIndoZWVsX3ZlcnRleFwiOlswLjI0MzYyMjgzNTc4MTExMzIsMC44NzcwOTkwMzY3Mzg4NDgzLDAuNTU2MzMyNDUxODUzODM5NSwwLjIxNTgwMDU3ODU2OTE4NywwLjc5NDc3NDE5MzY2Nzk1MzEsMC43NDUzMTQ3Mjk0NzQyNjA0LDAuNzMyNjY1NTA1MDEwNDk1MSwwLjgxMjU0MzM3NDcwNzM3MDldLFwiaW5kZXhcIjo5fSx7XCJpZFwiOlwiMC5ldXYzY2hmY29nXCIsXCJ3aGVlbF9yYWRpdXNcIjpbMC41MDYxODAxOTI1OTA5MDgsMC40MDc0MzAxMjQ4MDIzMjcxXSxcIndoZWVsX2RlbnNpdHlcIjpbMC4yMjgxOTM4NzA4ODUyNjc1NSwwLjIwMzg4NDA3OTk3OTcwMDgyXSxcImNoYXNzaXNfZGVuc2l0eVwiOlswLjk4NjgwOTg0OTk4Mjk3MzhdLFwidmVydGV4X2xpc3RcIjpbMC44OTAxMTA0OTE2MjIxNzk0LDAuMDM4MjQ2MDUzNjIzODQyNywwLjAxMjQ3NjIxNzc1MTg5MDQ1LDAuMzE5ODIzOTM3NTM5MDAwNCwwLjI0NjE0MjYxNzAyNTg0MTE3LDAuNjYxMjE0MjA1NjEwODk1LDAuMjA4ODc4NjE0MDcxNzkzNzYsMC4zMDcyNDQyNzIzNTIzNDg3NSwwLjY5MDY0Nzc5OTMyMTk0NzEsMC4xMzQyMDMyODI2MTA0NTI0NSwwLjU1NjIwNTc2NjM5MjUwNjQsMC41NjM2OTEyMzM2MDYwNzEzXSxcIndoZWVsX3ZlcnRleFwiOlswLjI3MjkyOTQwMzE1ODI3OTg1LDAuODExNjY5NDgxMTA0OTk5NCwwLjM0MzA1NDI3MDgxMjY3NjI1LDAuNzM3NzkwMzcwOTI2Mzk4LDAuNzE0NDA0OTYzMjA1MTk3NiwwLjQxMzY1NTM0OTI4MjI5NTQsMC45MDY1Nzg4NjUwNjY5NDg2LDAuMjY3MzQzNjY4NDIyMDQ2N10sXCJpbmRleFwiOjEwfSx7XCJpZFwiOlwiMC4zdDczcjA4OTg3OFwiLFwid2hlZWxfcmFkaXVzXCI6WzAuMzM0MzQ3NzgyMzYwODE4OTcsMC4zMzExMDc1MDA0NDcyODkyXSxcIndoZWVsX2RlbnNpdHlcIjpbMC4xNDgyNjUxMDg4Nzc1MjA2NSwwLjc0ODc0MDA1NzcwMTg2OV0sXCJjaGFzc2lzX2RlbnNpdHlcIjpbMC4wOTY4Njk2NDc3ODA1OTU0OF0sXCJ2ZXJ0ZXhfbGlzdFwiOlswLjE3MzQ1MTg5MDk3MzM1OCwwLjk1NDk1Nzg1MzUwNDQ4NiwwLjEyOTY5MDEyMzg4NjM5MzY3LDAuODA5MzQ0MDA0OTU3OTc1OSwwLjIwNjYyMTcwMjIzNjMzMjM2LDAuNTk1NzQ3NTQ5NDMwODM2OSwwLjEyMDkzMDkzNjQ0NjI3NjczLDAuMjM4Mjc2Nzg1MTU0MDY0MTQsMC44NzgyMzY5NzcxNTUwNTkxLDAuMTg3OTM5NzI0NDA5MDIxNzQsMC41MzQwMjQ5ODQ0NjEyNzc0LDAuNjc0NjkzNjI1NTg5NjQyM10sXCJ3aGVlbF92ZXJ0ZXhcIjpbMC43NzM3NDUyODI4NTY1NTI4LDAuMjE3OTczMjcwNDIyMzEyMywwLjY0MzM5MjYxMjY5MzMyMjcsMC4wNTU5NzM5OTEyODg2MzIxMiwwLjgzNjQ5MDkyMDEwMjgwODEsMC41NTk0MjY2MzY4NTQwODg4LDAuNDgwMjY4OTI2NzE3MzYzNjUsMC4xMzI4NjMzODU0NDc0NTkwMV0sXCJpbmRleFwiOjExfSx7XCJpZFwiOlwiMC5vdHA0bWhnZmZsZ1wiLFwid2hlZWxfcmFkaXVzXCI6WzAuMzA5NjcyMzg5MDg5OTA3NiwwLjMyNzA5MDU4NDU4NjI1MzVdLFwid2hlZWxfZGVuc2l0eVwiOlswLjk1MTk3OTc3Nzk0NzA2NTgsMC40ODI0NjU5MTI3OTQ4Njk0XSxcImNoYXNzaXNfZGVuc2l0eVwiOlswLjUwODg0OTUxMzk3MTYzNF0sXCJ2ZXJ0ZXhfbGlzdFwiOlswLjA1Mzg1MDc2ODA0ODIxMDMyLDAuNDcyNDYxNTc2OTc1NDU3MiwwLjQ3NTkxODc2MDc1NzE5OTMsMC44NDA0MzkyMTAzOTA0Njk0LDAuNjA2ODAzOTE4NDA1Njk4NiwwLjI0NTA2MDM3OTU3NjI0NTE2LDAuNzg5MDU4MzU5MTA5NzIxOCwwLjQyODA3MjczNDgyODUwMTQsMC45MTQzMDgzOTk4MTQ3NDMsMC4wMTY2NzkyNDU3ODYzNTA0OTQsMC4wMjM1OTczNjU5MjI3OTQxNTYsMC41NDcyMTUwNDc4Mjk2NTI1XSxcIndoZWVsX3ZlcnRleFwiOlswLjk2ODEzMjU0NzEwODY5MjMsMC44NDQwNTkyODA0ODMyNDM2LDAuNTYzMzA0Mzg4NzU3Mjk1MywwLjM4NjU5OTk3MTkwNTczMTE0LDAuOTQ1NzI1Njk3NjgwMjA3MywwLjE1Njg5NTk1NzQ2ODM4NDM2LDAuNTQ1OTkwMzI4MTA2MzQ0MywwLjY4MzQ3NjY2MDE2NDMzNDFdLFwiaW5kZXhcIjoxMn0se1wiaWRcIjpcIjAubTcyY204Z2xjaVwiLFwid2hlZWxfcmFkaXVzXCI6WzAuNDkyMTE5MDIwNTcwMjU1NywwLjk3MzAxMjMxMjIxODc0NDhdLFwid2hlZWxfZGVuc2l0eVwiOlswLjYxMzg3MzExMDc2MjIyNzEsMC44MDE4ODgyNjA3NDA3N10sXCJjaGFzc2lzX2RlbnNpdHlcIjpbMC4yNzMzNjM2NjIyMTI2NTQ5Nl0sXCJ2ZXJ0ZXhfbGlzdFwiOlswLjQ4NjczMzc5MzcxMzQ3NzI1LDAuNTYxNjYzOTQyMTE4NjgwOSwwLjY2NTI2Mjg2NzU0NTM3MzMsMC41MjExMjc4Njk0ODMwOTUsMC44ODI2MjM2NjgwMjgzNzE0LDAuNzcyNDM3MDE1OTY3MTk2MywwLjUzMjg1NDM2NDMwMTQ4NzQsMC40ODI4OTk0NTM5NTAzMTk3NSwwLjcwMTExMjg5Mzk5ODU4NDUsMC45NDA3OTE5Mzc0OTU5MTMzLDAuNTE5Njc1ODAxNjI2ODE0NCwwLjI2MjE0NjA3NzMyNjIyNTYzXSxcIndoZWVsX3ZlcnRleFwiOlswLjAyNjk2ODAzNzEzNTIyODc3MywwLjgwNzgxMTUwOTA0Njg3NzgsMC4xMTU2Nzg3MTY5NDk5ODA0NCwwLjI4ODc2NTMxNTIyMTA0ODEsMC4xMDg3MTYzNjE2OTczNTY1NCwwLjI5MDA1ODMxMDM4NDE1Njk3LDAuOTcwNTIwODI4NTg1NjM5NSwwLjg1MjE2OTk2MzI3NjIzMDVdLFwiaW5kZXhcIjoxM30se1wiaWRcIjpcIjAuOWhqdXEwdmFyazhcIixcIndoZWVsX3JhZGl1c1wiOlswLjczNzc3NDIyNzI0MjQ2MDYsMC4yNzc2NjQxOTcxMTUzOTAxNF0sXCJ3aGVlbF9kZW5zaXR5XCI6WzAuMTIwNjc5ODIyODgzODA5NzQsMC41NTA4NDI5NDc3NDk3ODAzXSxcImNoYXNzaXNfZGVuc2l0eVwiOlswLjQ3NDI3NzczMDcxOTEyNzddLFwidmVydGV4X2xpc3RcIjpbMC40NzUzMjU3Mzg1MDk2MTUsMC42NTM0NjI2OTYyNjgxODYsMC4yMzYyNDQ1MjE4NTA1OTk1MiwwLjg2MjQ3NzMyOTUzMzYyNzksMC4zODQzNjYzMDUzNTY3NzI1LDAuMjk2MjQxNjM4NzYzNjE2NjQsMC44NTU1ODY0MDI4MDYwMzYzLDAuNjE1Mzc5NzcxMjYyMTQwNSwwLjAyMjkwOTMxMzMwODc3NzY1NywwLjcwNzgwNzM4MTk0MDUzNzMsMC4yOTk1NjAzMjMzMDIzODQ3LDAuOTU5MTU5OTg1NTM5OTE5MV0sXCJ3aGVlbF92ZXJ0ZXhcIjpbMC45MTU5MTQ2MjY5MTMyNTksMC42OTU2ODQ0NjkyMDc5ODc4LDAuMzMyODQ2OTE5NjMxNzY0MDUsMC43OTE5OTg1MTkzNjMwODkyLDAuODg0Njk5NjQ4MzgyNjA3NywwLjc4NjI2MDY0MzM1MTU1NjcsMC42NTIzMzI1NzYzODk1MDk4LDAuODAxNjEwOTQyMDc2ODQwN10sXCJpbmRleFwiOjE0fSx7XCJpZFwiOlwiMC5wazR1cXJvNDF1XCIsXCJ3aGVlbF9yYWRpdXNcIjpbMC44NjU4ODgxMDA3ODAzMTY1LDAuMzM1NzMzMTk4NjM5ODQ3M10sXCJ3aGVlbF9kZW5zaXR5XCI6WzAuNTY5MjA2NDU1NzMwNzMyNCwwLjI3OTE0NTQ4NzEwMTE1NjNdLFwiY2hhc3Npc19kZW5zaXR5XCI6WzAuMzEyMDM3NTQwMDM2NzA4Nl0sXCJ2ZXJ0ZXhfbGlzdFwiOlswLjkxODk1NTQwMDk5OTI1MjQsMC4zNTQyNTc5MTAwNDc4NDY5LDAuMTQ5NjQ4MjY5NjM0NDcxNjQsMC45NTQ4OTkyMDM4MTA5NDQ3LDAuNTEzNjk4MTg0Nzk1ODAzMSwwLjU0MjU0MjIyMzMzMjQwNzgsMC41MzgyMzIyNjY3MzM5NDQ4LDAuNjg2NzQwNDgxOTA2MTk3MSwwLjI0MDMwNzE0MDk3MDQxNzYsMC41OTYwMTkyMDI2MTUxNzI5LDAuMTk4MTM5MTg1NDY2MDcyOCwwLjA2NTIxMTk1NTUyMTU5ODJdLFwid2hlZWxfdmVydGV4XCI6WzAuOTM4MjE0NzI4NzI4NDIwNiwwLjYzODkwMzI4OTc2MzkzNDYsMC41NzQ1MDY4NjA2ODk2ODU5LDAuMzI5ODAwNzk1NjIwMzczOSwwLjM3NDgwMTAyMjUyNDM2NTQsMC4xNTU1MzEyNzQ1NzU5NDM0LDAuMzQ4ODg2NTM2ODgwOTgxNSwwLjIyODg2MDg5MDE1ODAwNDddLFwiaW5kZXhcIjoxNX0se1wiaWRcIjpcIjAuOTJwbXFmdG0wNzhcIixcIndoZWVsX3JhZGl1c1wiOlswLjIwOTQwMTg2MzU3ODA0MzAyLDAuOTYwMTgzMTg1NTY4NDUwMl0sXCJ3aGVlbF9kZW5zaXR5XCI6WzAuNjA3NDg2NTA2MjU1MjUzNSwwLjQ4NzIxNDA4NDg1Nzc0NF0sXCJjaGFzc2lzX2RlbnNpdHlcIjpbMC44ODc5Nzc5NTgxNDE3MzczXSxcInZlcnRleF9saXN0XCI6WzAuMzcyMjkzNTg5MTE3MDk1NzYsMC4zMjUwNjM4MTQ5MzAyNDYzLDAuMDIzOTk2MjQzMzQxNjcyOTQsMC41MDc2ODQ0OTI1OTI5MzY5LDAuOTM2MTc4ODcwNjM2MDA3NywwLjU1OTk4Nzc2NzUxOTgwMTMsMC42MTc4NzYxNzAxOTQ1MTk3LDAuMTkxOTk1MTU0MTI0NTkzMjMsMC40MzY4OTM5OTQ0OTA5NjIsMC4zNDA5NzMxNDIzMzc3NDk4LDAuNDk4MjU1OTUwMDU2MDI3NSwwLjMwMTgwNTQ3Nzk4NjMzNDRdLFwid2hlZWxfdmVydGV4XCI6WzAuNDgwNTU2Nzk5MjQxNjkyOCwwLjUyOTE3Mjk3MTUwODQyNSwwLjQ1NzY4MjQ0OTAxODU4NjcsMC4yODgxNTgxNjI1OTk2Njg1MywwLjQxMzA3MDM4MDIxMjc3NTc2LDAuODQ5NjMwMzEwMjE1MDMxNSwwLjQ0MjYyNDA5NDEwMjgwOTIzLDAuMTE4OTkwODM1Mzk3MzYxXSxcImluZGV4XCI6MTZ9LHtcImlkXCI6XCIwLnAwYmIzamNzYTZvXCIsXCJ3aGVlbF9yYWRpdXNcIjpbMC44MDUzNzcwNDA5MzYzODc2LDAuMDA0NjA4NTExNTA1ODc2NDg5XSxcIndoZWVsX2RlbnNpdHlcIjpbMC4zNzAzMjkzNjU4NTMxOTg1MywwLjkxMTA3MTgyOTA3Mzk5MDNdLFwiY2hhc3Npc19kZW5zaXR5XCI6WzAuNDEyNjg5MzEzNjY1NTU1MTddLFwidmVydGV4X2xpc3RcIjpbMC4zNzUwNTUyOTYxNjg4NzQ0NSwwLjMyNjk4OTQ1NTU3ODg0NzMsMC43ODI0Mjg3MzM5NjE3ODk3LDAuMDg5MTY3NTUyNjAyNzI2MDIsMC4xMTg0NjM2ODc4OTk1ODc3MiwwLjYxODIzMDU0MDIwNjk4NDgsMC42ODgzNDY3NDgwMTU4OTI5LDAuMzgxNzc5MDUyMTQ5OTU2NjcsMC43MjA4MTgxNjA5NTkxNDMzLDAuNzE4MjgxMTY3Mjk4MDczMSwwLjUwNTM0MDM5ODI0MzM5NjYsMC42Nzg1NDg1OTAzODg5MzkyXSxcIndoZWVsX3ZlcnRleFwiOlswLjg2MDI1MTY0MzQ2NjcxMjcsMC45MTgyNDEyODk1NjQ4NzEzLDAuNDk0MzMyMTQ0NjQ5NDA1OCwwLjQwNjY4MTQ0MjQwNTM2MzMsMC45NDUwMDMzOTM0NDM2OTY1LDAuMDQxNDc2Nzg0MTY5MDMsMC45MDc0MzAzMTQxMDI1MjgyLDAuNzkyMDgwNTMxODEzOTI5NV0sXCJpbmRleFwiOjE3fSx7XCJpZFwiOlwiMC5nNm51ZTQwbzZ1XCIsXCJ3aGVlbF9yYWRpdXNcIjpbMC4yNTk1MDM2NTE3OTA4OTI4NSwwLjQ1MTE3MTk2Njk2MzYxNTE3XSxcIndoZWVsX2RlbnNpdHlcIjpbMC44NzM3NzczMjA3NDkxNjQ2LDAuMzgyNTA0OTQ1OTE3NTk4NF0sXCJjaGFzc2lzX2RlbnNpdHlcIjpbMC41NzUwNjM2MDU2NDMyNjQzXSxcInZlcnRleF9saXN0XCI6WzAuMTYxNTUwNzcyNzIyNzQzNjUsMC4xNzQwMTkxNDc3MzE3MDIzNSwwLjQyODc1ODA3ODEwNzY0ODEsMC40MjkzMjkyMzg2MDMwNTgyNywwLjQ3NjA4MTQzNTA2NzMxMzI2LDAuMDE2MTQxNjY2MTgyMTk4MDMzLDAuNzQ5MDA2OTU5OTI4MzY5NywwLjg3NzkxNTY2MzM3NTQ5NzYsMC42MDgwOTI4NDcwMTg1NTc4LDAuNDg0NTc2MzE1NDk2MDYwNSwwLjE1OTg5Njk0NTI1ODc2MDQxLDAuNTQ5MjMzMDYzMjk3MTczNF0sXCJ3aGVlbF92ZXJ0ZXhcIjpbMC40ODg2NjA0MjY3ODU5OTYyLDAuOTUwNzEwMDU1MzM2MDI5OSwwLjg5NjM3ODYwMDQxMDY5MDYsMC4xMzk2MjAwNDI2ODg5MDM4MiwwLjAxNzEwNTMwNTc2MTMzOTI4NCwwLjEyMDMyMDgxMzAzMjg1NjgsMC45MDE2ODU5NjQ1NDQwMjU0LDAuMzEyODI3OTY1OTU2MjYyMDZdLFwiaW5kZXhcIjoxOH0se1wiaWRcIjpcIjAudWlrcG05cm1iYlwiLFwid2hlZWxfcmFkaXVzXCI6WzAuMDgwNjQ1MTUwNDc2MjA3OCwwLjA4NDIzMTAxNDY5ODQxNTMyXSxcIndoZWVsX2RlbnNpdHlcIjpbMC4zNDQ2MzkyODM1MDQwNjEyNiwwLjg2OTQ4OTUwMzE0Nzg2NzFdLFwiY2hhc3Npc19kZW5zaXR5XCI6WzAuMTQwMDg0ODE3OTY0NjE1MjVdLFwidmVydGV4X2xpc3RcIjpbMC42ODYwMzU1ODI3ODIzNjcyLDAuOTQ3NTYzNzgzNDE4Mzc0NiwwLjU0ODA0NDY0ODE4ODE5NDYsMC4yNzI5MDcyOTEyNjc4MzM0LDAuOTE1ODA3MTYyOTAxMTU4MiwwLjU0MDM2NzczMTI5MTkyNzcsMC43MTEwNDM4Mzc1ODQ4MDM2LDAuMzQ2NjYxMzUzNTE0MTA0NTQsMC43ODM1ODkyNjQ3NjEzMTU0LDAuMjY5MTQwMzI3MTY5OTQwNCwwLjE0NDM2MDQ2NDExNjI5MDMzLDAuMjcxNjg1MTY3OTQ3MDg3OTddLFwid2hlZWxfdmVydGV4XCI6WzAuODE3NjU5NDc1NTk0NjE4NywwLjY2MzczNTUyNDE0NDkxNjgsMC44NDAyNDczOTQ0OTU5MzgxLDAuNjQzNTU4MjEzMTMwMTc3OCwwLjkxNzA0MDg0MTA0MjYyMywwLjk4MjQzODc1MjU1ODMyMTEsMC40OTc5MTYzOTQ0NjY3MDY0NCwwLjAwNTM3NzgzMDE4MjM2MTQ4N10sXCJpbmRleFwiOjE5fSx7XCJpZFwiOlwiMC5waGtvZDRoNjY2b1wiLFwid2hlZWxfcmFkaXVzXCI6WzAuMzg4NTEyMTU0NzA1MjExNSwwLjk0MDgxNDc3OTY4NjcxNzVdLFwid2hlZWxfZGVuc2l0eVwiOlswLjYwNjY3NjA0OTk5MjAzODcsMC43NDM3ODUzNzM1MTQxNDc4XSxcImNoYXNzaXNfZGVuc2l0eVwiOlswLjA0NzYxOTM0ODQ2Mzc0NDgyNl0sXCJ2ZXJ0ZXhfbGlzdFwiOlswLjI4MTgwMTgxODg5OTQ2NzEsMC41Mzc2NzExMjgzMjM1NTExLDAuMjc4MjY1MjQ5MzQ3MDU3LDAuMzcxODAzODA3NDk0MDQwNjMsMC4wMDE2MzU0MTEyNDQwNzcwNjc0LDAuMzczNDkyMDI5ODQwNjUzOSwwLjkyNTgyNDM2NDk0MzM1NDYsMC45NjExMjgyMDEwNjQ4MDk5LDAuMjYzNTY3Nzc1ODQ0MzMwMiwwLjI5OTUxMjI2Njk2OTg3NjksMC40NTAwOTUzNzYyMTY2MzE3NiwwLjE0MTIwNDk1MDE4OTYxOTU0XSxcIndoZWVsX3ZlcnRleFwiOlswLjgyMTE1MjcwMjUzMDAyNDMsMC42Mzc4NTIwNjQ2MTUwMDg1LDAuODQzMzY5MTI0MjQ1MDg4NywwLjEwMDgwMTEyNTMwNTE0OTA2LDAuNzQyMDU3MTcxODY0MzI5NCwwLjA2MjQwNjU5NDQ5NTM3NTc4LDAuNTAxOTk2Mzc5ODIyOTE5MiwwLjEzOTU4ODAzMzI3MDMzMjc2XSxcImluZGV4XCI6MjB9LHtcImlkXCI6XCIwLmNkc2IydDBhMGdnXCIsXCJ3aGVlbF9yYWRpdXNcIjpbMC4yNDUwNTg0MjE3NjYwMTk2NiwwLjQ3OTM3NTcwNjYxNTg4MDM2XSxcIndoZWVsX2RlbnNpdHlcIjpbMC43MzE4OTYzMzU5MTk4ODgyLDAuMjA0MzM1OTE5MDY3MTQyNTVdLFwiY2hhc3Npc19kZW5zaXR5XCI6WzAuOTQ0MDgwNDAxMzgwODAxN10sXCJ2ZXJ0ZXhfbGlzdFwiOlswLjI3NjcxNzcxODU3MzU1NzIsMC40MDE5MTIwNjkxOTczOTI1MywwLjY5OTI1MjA2MzE3NTM2NDksMC41ODA1MzY3MDU0NzY1NjczLDAuNTMyODc2MDY5NDU5NTg5MywwLjYwNTE2NTUyNjYzOTY4NTYsMC44NjU5Mzc0OTIzNjk4MjMzLDAuNjM4NTc0MDUxODE2NDU5MSwwLjA5MTM2MTc1NjcyNDk1Mjk1LDAuMTk0NjI2NzE2MjYwNzkzMywwLjU4NDgzMjQ3ODM0MTk0NzIsMC45NjEyMTE1MDY5ODg5ODE3XSxcIndoZWVsX3ZlcnRleFwiOlswLjk4NDA0MTk3MDg2NzQ0MDQsMC40MDAyMDc4MzI4ODc3NTM0LDAuNjExNDY2ODQ5MzAwNDk2OSwwLjA1NDc2NjI4MjY5NjM4NzUsMC43NTkwMjYzMjM2MTg2ODk2LDAuOTA5NTgyMTcxODQ0MzY1MSwwLjgyNTI3ODUwMDE0NDUxOTMsMC45MzU0NTczNTAzMTQ0Nzc5XSxcImluZGV4XCI6MjF9LHtcImlkXCI6XCIwLjVlYzNmN3VjODZnXCIsXCJ3aGVlbF9yYWRpdXNcIjpbMC43NDI4Nzk0NTI2NzM3NzM5LDAuMTQ3MjcwNzkwNTUzNTM1NTRdLFwid2hlZWxfZGVuc2l0eVwiOlswLjIxNzIwMTM0MzI0NjU3NTU4LDAuNTc1NDI2ODc5NDE0NjgzN10sXCJjaGFzc2lzX2RlbnNpdHlcIjpbMC4yMjQ3NjQyMTQyNDg5NzAwOF0sXCJ2ZXJ0ZXhfbGlzdFwiOlswLjgyMTI5NjM3MjgxNjAxMDUsMC4yMjk3MzMxODkyMjA3NDg2LDAuMjEwNTg4MTc5Nzc2NDU1MjgsMC4zMDAyODYzMzQ5MTkxNDQ5LDAuMTYwOTU0MjQxMTM5NTMwODMsMC4yODU3MDk3OTAzNTAwMTg3NiwwLjg1MDUwNTMyMjU5NTkyMDUsMC4wMTIwOTk3NzU1NjUyNDU2NjMsMC40MzA3MTkwOTcwMjk2MTQ2NCwwLjM1ODE4MjA2NzMzOTAzMzcsMC45OTQxMzk2NjYzMzUwOTUyLDAuMTcxMTUyMDQ2NjMxNjQ3NjNdLFwid2hlZWxfdmVydGV4XCI6WzAuNjM0OTM2NTA0MzY0NzM5MywwLjg1NjQxNjgwNTY1NTkyMjcsMC44MzQ3MzE0MTAzOTgzMTk3LDAuMDEzNTYxNjAwOTg5MTE1NTE5LDAuMjA0NzM4MTM1NTU4OTkwNzksMC45NzM3ODg5NDk1MzE1MjgsMC4zMjk4OTU1NDc1NzIwMTkxLDAuNzA0MDQ5ODcwMjY4MjQzXSxcImluZGV4XCI6MjJ9LHtcImlkXCI6XCIwLm8ybTdlM2psNW1cIixcIndoZWVsX3JhZGl1c1wiOlswLjg2NjEzNjk0NDc0MjMwOTEsMC4zNjIwOTE4NjYzNjg1NTE3M10sXCJ3aGVlbF9kZW5zaXR5XCI6WzAuMjQ4ODYzNjk5NDgyOTYyNzIsMC45NDgxMTM2NzA4OTYxNjk3XSxcImNoYXNzaXNfZGVuc2l0eVwiOlswLjQ2NDUzNDkwNzE0Mjg1OTddLFwidmVydGV4X2xpc3RcIjpbMC4zOTYzMTU4MTcxNzQwMjMzLDAuMzI1NjI3ODgyMjQ1MjkxNiwwLjQzNTg4NjU2MjE2OTMwODIsMC40MTgwMDY1NzU2NzIwMTI0LDAuMDMzNTA3NTc3OTAxMjY2MTMsMC4yNjgxMDY3NDk1OTYyNzE5LDAuMTkxNDU3OTk1MjYyNjczMzcsMC43MzcxMTExODg0OTExNTY1LDAuNDUwMDQwODk1NTE5NTg4NSwwLjEwNjg4MjYxNTY3Njc5MzQ3LDAuMzgyMTU0MTMxMTQ2NDkyMiwwLjAwOTQxNjc1MDU0MTE3MjE5Ml0sXCJ3aGVlbF92ZXJ0ZXhcIjpbMC45NTc1NDYyNzEyODY3NTUxLDAuNTY5NTUwMDc2MjM1NTgwMywwLjc5ODE0NDMwMDIxNTQ2MDUsMC45NDc0MzI4NDAzNzQ5ODIzLDAuNzAyNzAxNjA5NjQwMDcxMSwwLjgyODY0MjQ2NjM3MTM2OTYsMC44MzEwNTAwMDA5NDYxNzcyLDAuMjAzODk0NTE3OTgzMjM1NDNdLFwiaW5kZXhcIjoyM30se1wiaWRcIjpcIjAudmlqN2g0bGwzaWdcIixcIndoZWVsX3JhZGl1c1wiOlswLjE4MTQ5ODAwNzYxNTU0ODgsMC4yNjM4OTc2MjA1MDcyMjU2NV0sXCJ3aGVlbF9kZW5zaXR5XCI6WzAuMjgyOTM1Mjk3MjcwMzUxOCwwLjc0MjY0Njg5NzgxNzY1MDZdLFwiY2hhc3Npc19kZW5zaXR5XCI6WzAuMDE0NDg2NjYyNjEzODIzMzY1XSxcInZlcnRleF9saXN0XCI6WzAuMDUzMDg2Nzc3NTg2MDYyMTcsMC4zNjYwMzI5OTIwMDAwMTA1LDAuOTE1NDU4ODExMTEwOTc1NiwwLjY1OTkzNjc0MDMxNDI0NzEsMC4wMDYyMzY3MDEwMDAzNzIxMDIsMC45NDE2Nzc5NzU3NzM0NzE3LDAuODA4MDgwOTI3ODMzOTYxOCwwLjQyNDk5NzE1ODU3MjkxODIsMC40Mzk0MjAyMzYyMzI3MDc3NiwwLjQ0NjMyMTc4MjA0NDMzNDgsMC43NDA3NTcwMjA2Mzg5NTgsMC4wOTE1NDI4NjM2Mjg1NDI0N10sXCJ3aGVlbF92ZXJ0ZXhcIjpbMC4xNzAxNDc4ODg3MTEzOTk0LDAuMjM5NTE1MDAwMjY2NTE2OTUsMC44NDE3MTYwNzUzMDUwMDgxLDAuNDQ2Njg2MzIxOTczMTM3ODUsMC43OTg0NzQ2NjIwMTEwOTAzLDAuMjQ5OTMwNTA1MDk3Mjk2NDIsMC41OTgyNjEzNDEzNzE4MDM2LDAuMDI0NjM0MTQzMzgwMzc1NjE3XSxcImluZGV4XCI6MjR9LHtcImlkXCI6XCIwLnZidWRwcTdyOGpnXCIsXCJ3aGVlbF9yYWRpdXNcIjpbMC4xODgwODMzNzkyMDg2NTM4LDAuMjkwOTQxNzU1NjI1MzcyNF0sXCJ3aGVlbF9kZW5zaXR5XCI6WzAuMzgzNTM1MzYwNzQ4NzYzNywwLjEyNTQyNDcxMTI3ODA2MTk4XSxcImNoYXNzaXNfZGVuc2l0eVwiOlswLjk5MTQ4ODcyNjY3ODc4MzVdLFwidmVydGV4X2xpc3RcIjpbMC4xNDA4MjAyMzI3OTUxOTUzLDAuOTAwNjU2Mzc0OTE3MjQ1NCwwLjI4NjAxMzE4OTY1NDY3NDcsMC41MDM2MDU4MjY4MDE1MDk2LDAuMjgyMzcxNzUzNTE0NjQ1OTQsMC42OTIwOTM1MDk3NzE3NTQ5LDAuNDAzMDAyMTQzMDIwNTg1OSwwLjQ1MjYzNDk2MjUzMzQ5MzgsMC4zMjk1MTA2NjEzODY3NTA2NywwLjk5MTU2MzkzMDMyNDg5MjQsMC4xNTQyMTQ5MTc4MDE4MDUwNywwLjU2NTgxMjAzNzY0NDUwMjhdLFwid2hlZWxfdmVydGV4XCI6WzAuNjIwNzc5NjA4MTI1MTQ5OCwwLjA4NDU3NTI5MzIxODc5OTk3LDAuMzA5NTk2MDg5MzQ1MDQ1NTcsMC45Mjg5ODg3OTAxNTA2MDc1LDAuMjExMzQ0MjAwOTAwMDEwMzgsMC4yNjYxNTg0NzQwNDc4MTA0NiwwLjk2Nzk5ODYzMjU5OTI1NzYsMC4wMzYzOTMyNjY2MDkwNTYyODVdLFwiaW5kZXhcIjoyNX0se1wiaWRcIjpcIjAuNGlna3M3N2RmbGdcIixcIndoZWVsX3JhZGl1c1wiOlswLjYxNjI2MzA2ODg4MDUxMDksMC45OTYzMjIxOTU3MjQxMTZdLFwid2hlZWxfZGVuc2l0eVwiOlswLjA3MjE5Mzg5NTU4Mzk1MDI4LDAuODE2MzA5MDA0MTU3OTQyMl0sXCJjaGFzc2lzX2RlbnNpdHlcIjpbMC42NDYzODcxNzI0OTI0NzY4XSxcInZlcnRleF9saXN0XCI6WzAuMTQ2ODYyODI5Mzk1OTI3MzIsMC4zNTM4NjI0MzM4MDg5MDM4LDAuNzM1Mjc4OTEwNzE3MjUwOCwwLjgzMzYyMTkxMzEzMzQ5MDEsMC4xMzQ1ODQ0MjE0OTQ3OTExLDAuMDY5NTcxMTY2NjIzNTMyOCwwLjA1ODkxNTc0OTYxMTQyMDU0LDAuNTkxNTA4MjExMzI2OTU2NywwLjgxMDYwOTkwODE3NTY2OTUsMC4wOTU4NzYzMTc0MjU4Nzg5OSwwLjk3NzU3ODkxNjIxMzA1NTcsMC42MjAwMTEwMDAyNTExMzddLFwid2hlZWxfdmVydGV4XCI6WzAuMjM4NjkxNjQzMTcyOTkwNjMsMC40Njk2MDgyMDUzNDM0Mjc4NCwwLjk4MDkyMDk0MzM5ODAyNjgsMC4wOTQwODcxNzUxNzU5ODk1MiwwLjk1OTYyMjg0NTg2MTU0OTQsMC4xNDkzMTA2NjUwMzg1MDEyLDAuNTQyNDExNjk0OTg4MzQxNSwwLjM1MDY4NzYyMDM5MTQ5MjM3XSxcImluZGV4XCI6MjZ9LHtcImlkXCI6XCIwLmk3aW43MTBmMzk4XCIsXCJ3aGVlbF9yYWRpdXNcIjpbMC4wMTA3NDI0MzUzNTcwNjk5OCwwLjM3NDk2MTUwMjQ0Mzk1NDc2XSxcIndoZWVsX2RlbnNpdHlcIjpbMC4yMTc2MTE2MzAzMzk4NzU4NSwwLjI4NzcwNjkwNDE3MjY2OTg2XSxcImNoYXNzaXNfZGVuc2l0eVwiOlswLjc3ODg1MDQ3NzQ3MDg3MDddLFwidmVydGV4X2xpc3RcIjpbMC45MDY1MDQ1Mjk0NTI3MDYxLDAuMDgzMjAzMDgzNDk4NzU3MzgsMC4wMzQ2MDg2NDcyODI3ODA2OCwwLjEyODg1NDU5NDk4MjAzNzQ0LDAuNzAzNjEyMDExMzU4OTI5NywwLjgzMDExNTgxNTE4NTg3MTIsMC4zOTU3NzY5MTU4NDQyNzAxLDAuOTg5NzYxNDM0NTE4MTM5MSwwLjA4MDg4MTUzNzA1NjE5NTUsMC45NDM1NDYwNjY3MzUxNjg1LDAuMzA3MDI2NjEzNDkwMTQyNywwLjA1NTIzMzQ3MTAyNjI0Mzg3NF0sXCJ3aGVlbF92ZXJ0ZXhcIjpbMC4yMjcwNjI0MDc4NjI5MDEzMywwLjQ1MzYzODgyODU4MTM0NjYzLDAuNDA0MzExMDU0MzM4ODA3MSwwLjA0NjYyMTMzMjY3ODU3MzYsMC4xNzM3NjEzMDU0ODc3NzMxMywwLjY0MTk0MTYwNTU0MjIxOTYsMC40NTAzNDE4MjA1MzYzODg5NCwwLjA2MzAzNDg2NDk1NDYyMzUyXSxcImluZGV4XCI6Mjd9LHtcImlkXCI6XCIwLjk2aXZxcHBlZ2FnXCIsXCJ3aGVlbF9yYWRpdXNcIjpbMC40OTExMTc5MjMwOTAyMDA1LDAuMzUwNDY0NDQ2OTE5MzkwOTRdLFwid2hlZWxfZGVuc2l0eVwiOlswLjMzNTM0NDQ5NjcyODk3MDI2LDAuOTMzNTE3NjU4MDAzMjQyN10sXCJjaGFzc2lzX2RlbnNpdHlcIjpbMC4zMTk1NzUzODY2NDExMDU3NF0sXCJ2ZXJ0ZXhfbGlzdFwiOlswLjU5MjYyNTQ4NzM4NTkzNTEsMC43MTkyMDg3OTk1MjI5ODQ2LDAuNDg0NDkxNjMwNDY5Mzg4MjYsMC43ODIwNzU3NjE2MjA4NTgyLDAuNzQ2MjA1NDM5ODI0NTc3NCwwLjA5MDQyNjI0NjUzMjAzMDQ2LDAuMTA3MDI1ODE1MDM1NDc5OTIsMC45MDYxODc4NzczNjI2OTYzLDAuNjUyMjI5NDEyMjg0NTI5NCwwLjY3NzI3MTEzNTE5MjM0OTcsMC4wMjQ1MTE2OTM1NTIyNDM4MDcsMC44MDU0NTkzMTQzMDU4MzU1XSxcIndoZWVsX3ZlcnRleFwiOlswLjM2MDI5ODEwNDM4MzMzMDY1LDAuNjA2NTIzNzYwNjIzNzE0NCwwLjMyNjAyMTMyMTcxMjQyNjM3LDAuNTk0MDQxNTcxOTA3NjQwNiwwLjU4MjEwNTg2OTQ4MDQ0NDIsMC42NDc0NjkwODAwNjUwMTA3LDAuNTkwNjU2MjI1NDgxNzcwMiwwLjQ3NzU0ODQzOTkzMjY1NTk0XSxcImluZGV4XCI6Mjh9LHtcImlkXCI6XCIwLmZmcThkZXBjaHBnXCIsXCJ3aGVlbF9yYWRpdXNcIjpbMC4xOTQyNDExNDQwMzc4NDU1NCwwLjQxMTE2MTUwMjU0NjY3NTddLFwid2hlZWxfZGVuc2l0eVwiOlswLjcxNjExMTk1MjY5NjkwMzUsMC45MjEwOTE0MjE4OTc5MzY3XSxcImNoYXNzaXNfZGVuc2l0eVwiOlswLjY3MjYwNjY0MjU4Nzc1OTddLFwidmVydGV4X2xpc3RcIjpbMC42MDg3MjUxNDkxNzkwNjMxLDAuNzEyNjkyMjU2MzYwODI5OCwwLjI4NDgxMzMyMTgyNDUwMjgsMC4yNTc3Nzc4OTMwNTYwMjY0LDAuOTMyMjkxNzUwNTYwODY5LDAuMjYwMjQ2MzQzODYxODA0NTYsMC45MDA4NjA4MzY5NzUxNzQ5LDAuODE5Njg2MTc5MzQwMjY4OCwwLjA0OTc4MTEyODI1MDQ0NjExNiwwLjQ5ODQ2ODk2NDk5MTc2MDYzLDAuNDIyMDY3NzYyNjc5ODk4NzYsMC4xMzI4MjY0NzM4OTkxODJdLFwid2hlZWxfdmVydGV4XCI6WzAuNTUyNzA3MTI3MTY0NzQzMiwwLjYwMDY2NjMwOTM5MTkxNDcsMC44ODg4NzA3NjQ3ODQzNzE0LDAuMjQ0NzI3MTMwNDE2MzAyMTIsMC45MjY0NDQ5MzY3Nzg2NDk0LDAuMDA4NjczOTgzMjIwMzQyODUxLDAuNjU2MTI2ODYzOTMwNTkzNywwLjgwMDg2OTg0MDYwMTkxNV0sXCJpbmRleFwiOjI5fSx7XCJpZFwiOlwiMC4zMWsxYnNhMjl2OFwiLFwid2hlZWxfcmFkaXVzXCI6WzAuNTIxNjU3OTcyMzIyNjg4NCwwLjY5MzgwMzg3ODI1MjA1NzJdLFwid2hlZWxfZGVuc2l0eVwiOlswLjc1MTA1MDQ5MzA4NDYzNzgsMC45MzYwMjExNjcxNjQxMzM5XSxcImNoYXNzaXNfZGVuc2l0eVwiOlswLjk5MTk2OTI1NDc4MzM1ODVdLFwidmVydGV4X2xpc3RcIjpbMC42MjAyMjUzNDUwNjYyNzk4LDAuODQwODkzMjkwMjI4ODAyOSwwLjE0NjcwNzk5NTU2MDg5NDMsMC45ODUwNDUwMzAxMjQxNzI0LDAuMjMzNDQ0OTc2MTkxMjIwMywwLjI4OTc5MTIzMjczMjU0NjAzLDAuMjcwOTM4MDgwMTc1Njc4NjYsMC4xOTA3MDQ2MjM3NDc4Mzg5MiwwLjA1MzM2MDU5NzgyOTQyODI2LDAuODI3NjA3MjkyNjYzMTgzLDAuOTMxOTEyMzQyMTkyNTQ5LDAuNDM3NjcxNzYyODU5NTc2NzZdLFwid2hlZWxfdmVydGV4XCI6WzAuMDQxNTg2Njk0NzI4NjcwNzE0LDAuMDcyOTgyNzE3NTE5MDgwNywwLjAxNjkxNjE1NDkwNTI5MDc0OCwwLjQ5MDE0NTQ1OTg4MjMyMDUsMC4yMzExOTg5MzY3OTY2NTgyNiwwLjAyNTEzMDA2ODIzMjE0OTM2LDAuNDg5Mzg5MDk4NjM5MjU5OTUsMC4zODg0MzUwMTcwNTM3NzQ1XSxcImluZGV4XCI6MzB9LHtcImlkXCI6XCIwLjkwa2t2YjR1Y2hvXCIsXCJ3aGVlbF9yYWRpdXNcIjpbMC45MTAxMDM3OTkyNzg1NDcyLDAuNDg3ODU5MjQ3MDExNTkxMl0sXCJ3aGVlbF9kZW5zaXR5XCI6WzAuMzg0ODQ3Nzk3MDgyNDYzMSwwLjQ1Mzg5MDQ5Njk3OTYxMjAzXSxcImNoYXNzaXNfZGVuc2l0eVwiOlswLjI2MDgwMDc5ODkzNjkzMTY0XSxcInZlcnRleF9saXN0XCI6WzAuNTMxNzkzMjA3NTkzNTIxNCwwLjY4NzgxODkzMTAyMTQxOTEsMC45ODAzMTAxNDkzNzExMTc3LDAuNzY1NzUxNjU1MDUzNDM0LDAuNDA2MDE4NzE4MzIxNjk4OCwwLjExODQ4NzI5NDg5MDcyODUxLDAuNTczNTI0MjI1OTA3ODUyMywwLjk4ODgzNzMxNDAxNzEzNDMsMC42NjMxNDIxNzQ3ODIwOTExLDAuNTQzMDMyOTg2MzYyMDIxNiwwLjQ1OTgyOTk5NDM1ODM2NjEzLDAuODk2OTY3NjUxNzAzNjAyM10sXCJ3aGVlbF92ZXJ0ZXhcIjpbMC40MDU0NTcyNjIwODc4NDk2LDAuMzgxNzA1NjU4MzM1MTYxLDAuNjIzNDk1MTQ2MjM4MTY1NywwLjY0MzMyODg1NTk3MzQ1MzgsMC44NTcyMjgyNjY0OTc5MzIsMC44OTk1NTQ5NzQxMTk5MzY3LDAuMDc2NTExMzI3OTMyMzE4ODUsMC43NzExNzY1Mjg2OTg1MzY4XSxcImluZGV4XCI6MzF9LHtcImlkXCI6XCIwLmFqZ3RjaTNzY2c4XCIsXCJ3aGVlbF9yYWRpdXNcIjpbMC4zMzUxOTQ4MTQwNjE3MTg5LDAuNjI5OTczMTg3OTA4NzUzOF0sXCJ3aGVlbF9kZW5zaXR5XCI6WzAuNDE1MzQxODY4MTAyODg1NTQsMC4yNzA0NDEzNTI3MjIzMDQyXSxcImNoYXNzaXNfZGVuc2l0eVwiOlswLjcwMTM3MjM1MjYyNzE1MDldLFwidmVydGV4X2xpc3RcIjpbMC43NDE1NzgyNTkyNjY5MTM4LDAuNjM1MjY0NDQzMjkxODI5MywwLjE3MzY2NjAyNTk2MjEwOTY3LDAuNTA3MjA2NzkzNDI3NDk3MywwLjU5MTU1NjA0MzIwMTM4NzUsMC40NTQ5MzAxMTMyNTE2ODQ1MywwLjI2NDk0MDkyMzA1MjQ0OTMsMC43NTYyMTEwMzU2NTI0OTIzLDAuMDc4NTMyOTIxNjY4MTM3NDEsMC42MTU0MzU4NzYwNzYyNzIxLDAuODE4ODAzMDk4OTg1MTgwNCwwLjg3NDgzMTAzODkxNTM0NTddLFwid2hlZWxfdmVydGV4XCI6WzAuMTA4NjIzNDk3MzE4MDYzMDksMC41ODU3NjIzNjY4NDc3ODQ1LDAuNDczNDA3ODYwNzk3NTc5MzUsMC4yNjY2NjE2MDE1NjE0MTQwNSwwLjcxMTcwMjU5MzI4MDY1MjIsMC41MzM0MzkyODUxMjk0OTk4LDAuOTc0MDIwNDcxMDM0Njg3NiwwLjgxMTk0ODk0MTE0ODQ5MjFdLFwiaW5kZXhcIjozMn0se1wiaWRcIjpcIjAuaWo2bmxsY2M2ajhcIixcIndoZWVsX3JhZGl1c1wiOlswLjA2NTc2NTM2MDcxODgzNzc2LDAuMjY5ODEzNDYwNjE2ODY1Nl0sXCJ3aGVlbF9kZW5zaXR5XCI6WzAuMTA4MjY5ODg5NjQxNDI3ODEsMC40MjgwNzkzODQwNjM5Nzc2XSxcImNoYXNzaXNfZGVuc2l0eVwiOlswLjEyNDUxNzUzNTU1ODg5MDU2XSxcInZlcnRleF9saXN0XCI6WzAuOTg1OTI3Njc1NjU5MTk4MSwwLjMyMzYxNTYxNzgzMTgyNTcsMC4yMzg4MTcxMDk4OTA2MDcxMiwwLjkwODUwNDQ4MzgzMTI5ODYsMC4wNzU5MDkxODUxOTE0MzI4NiwwLjExNzgzMDI2NzYxNTAxNDkyLDAuNzU0NTQ5NDc0MzE4MDEwOCwwLjk4MzA5MjYyMjI2MTE4MzMsMC4yMDU1MTkwNzQzMTI4NzgzLDAuNzA4NDI3MzU1Mzg5MTQwNSwwLjYxODA3OTgxMjQ3NzcyMjUsMC4wMzgzNzY1ODM3ODgwODQ5NV0sXCJ3aGVlbF92ZXJ0ZXhcIjpbMC4yNjI1Nzk1ODMyOTM2NzgxNCwwLjM3NDIyNzU2MzQzNTQ0ODgzLDAuOTcwNjYzNzA5NzcyMzgzOCwwLjgyNzA0MDI4NzI5MTY5NzUsMC42NDIzNDcwNjAyODYxNTI3LDAuMzA0OTQ2OTYwMzkzNjg0MSwwLjAyMDMxNTQyNDQyMTAyNTA3NSwwLjY3MzE1NDIzMTU2OTIxOTZdLFwiaW5kZXhcIjozM30se1wiaWRcIjpcIjAuY2ZhbWprZ2UxNFwiLFwid2hlZWxfcmFkaXVzXCI6WzAuNTU1MzM3MTIyMzQ0MTMyNiwwLjQ4MjU1OTUyNTQ1MzAxMTk1XSxcIndoZWVsX2RlbnNpdHlcIjpbMC4xMDIzMzU2Nzk1NTk1NzExMiwwLjQxMTg2NjM5OTQ2MDY0NjJdLFwiY2hhc3Npc19kZW5zaXR5XCI6WzAuODUwNzAxMDM3MjQ5ODIwM10sXCJ2ZXJ0ZXhfbGlzdFwiOlswLjQ0MzU1MjYxNDQ0MTA4MTUsMC43OTUyNTcxMTYxMjE2MDE1LDAuNjk1NjY3NDI5ODQ4MTY5OCwwLjc3MDAzODExNTA0MjYyNjgsMC4wMjQ0Mzc3OTE5MjI2NTcyNywwLjMzMTQ5MjQyMDIyNjQ1MjQsMC41MzQ4NDcyODcyMTc2ODkzLDAuMTY5OTg5ODM1ODcxMTc0NDQsMC4zNzAyNTY3NTMxNjM2MzU4LDAuMTMyNDg4NzExMDgzNTkzOTUsMC4zMjQyMTE1MjkwODA4MDI1MywwLjEyMzg0Mzg5OTM1NDI5NTg1XSxcIndoZWVsX3ZlcnRleFwiOlswLjU1NjIzNjE3Nzc0MTMxMTgsMC4wMjAxODE5NzMyNzMwMDA0MiwwLjY2NTY3NzM5NjY5ODY4ODIsMC4zNDA1NjcwNzU0OTE2Nzg5NywwLjMyMjg2ODcyNDgyODMwMzEsMC4wMDU0Njg5NjMyODA3OTIyNzIsMC4yNDg3NDEzMjMxMjMxMzE2OSwwLjAwNzU2ODAyOTQxNzMyOTI1OF0sXCJpbmRleFwiOjM0fSx7XCJpZFwiOlwiMC44OTd1cHVzcDAwb1wiLFwid2hlZWxfcmFkaXVzXCI6WzAuOTUwNjIyMTA1NzczOTI4OCwwLjI2MzQ2NzgyODg3ODcyNl0sXCJ3aGVlbF9kZW5zaXR5XCI6WzAuNzgxMDE2NjQ1MzQ2NDM3MywwLjM4NjQ3OTkyOTk4ODk4MjA2XSxcImNoYXNzaXNfZGVuc2l0eVwiOlswLjA3MzU0MjE4MjU3ODEyNTVdLFwidmVydGV4X2xpc3RcIjpbMC4zMzM3MzExNDExNTg3MTExNiwwLjA5ODY5ODYxMTIxNzI4Mjk2LDAuMTU1NTg1NTE0NjUxOTAyNSwwLjMxNzQ4NzMxODcyMTc4NTUsMC40NzUyODI2NzcwNzczMzI2LDAuMzI5OTE1OTg5Mjc5NzY1NCwwLjE5NjAwMDk3OTY3NTI0NTU1LDAuMTQ5MjUxNzA5NjQxOTU2MzMsMC4wMDY4NjQ1MjQwNTI3MTI5ODQsMC43NTMyNDg5MDE3NTU0MDIzLDAuNDM4MzU0MTcyMDUyNjc2LDAuMzExMjQwMTI0Nzc2ODUyMTVdLFwid2hlZWxfdmVydGV4XCI6WzAuODQ5ODY3MzMyODk1MjU3NSwwLjQ4ODMzMjUwMTM5NjMzMzU1LDAuNzE0ODAxNjQ3NTU0Mjc2LDAuODk4NzEwNDEzNjI4NTE5NiwwLjkzODQxMDg0OTQ3OTI2NDcsMC44ODM5ODUzODc2NDkxNjM5LDAuNDE5NDAxMTA1NzU2MjEyNiwwLjUwMjI0NzY5NDkwMzY0NTJdLFwiaW5kZXhcIjozNX0se1wiaWRcIjpcIjAuZXVndWU5cGM3cW9cIixcIndoZWVsX3JhZGl1c1wiOlswLjE0NTgwODc5MzgyODE0NDkzLDAuODc0NDAwOTM3NTgxMzQyXSxcIndoZWVsX2RlbnNpdHlcIjpbMC4zNTA1NzgyNjM3NjQ3NDM0NCwwLjQ5MDg1NzEyNzU3MzcxOTQ3XSxcImNoYXNzaXNfZGVuc2l0eVwiOlswLjkyNjE0NDk4MTc4NTA1MjddLFwidmVydGV4X2xpc3RcIjpbMC4xNjY5MDI3OTc4MTU3MTU2LDAuMjY4ODUzMDU2MTM0ODI3OSwwLjQxMDIzNzkyOTAyMDQ3OTIsMC41ODE0MjU5NTU2NDA1NTY4LDAuNDQ5NTc4MTIzMDkwOTY2MzQsMC43NTA3MDgzNTcyNDE2NzQ0LDAuMDcyODc3NzMzMjk3MDE1ODYsMC43OTc0MzY3NzM2NjI1NzI1LDAuMDY4NDYxODA3ODMwNzc1MjcsMC43MzQ0NzU0MjkxMTkxNTQ5LDAuNTcwMzAyNjc1OTMyOTY3NywwLjYyODkzMzU1NzQ5NTU2N10sXCJ3aGVlbF92ZXJ0ZXhcIjpbMC43OTE3MTkyMzI4MDg2MjI5LDAuNTcwODAxOTAyMzY1OTYyMywwLjc3NjUyNTAyMDkxNTc5MzIsMC4yOTI2NDIzNDY2MDE0NzIyNiwwLjI3OTM4OTIzMzc4OTc1MzQ0LDAuMTQzNDgxMDYxMzUxMDYwNDIsMC41NjA5MTY3NTU1MDg3ODU1LDAuNTA0NzQ0MjkzODE5MjMzOV0sXCJpbmRleFwiOjM2fSx7XCJpZFwiOlwiMC5sNnNjbDVudGpkXCIsXCJ3aGVlbF9yYWRpdXNcIjpbMC4yNDU1NzgxMjE0ODc1MjU2NywwLjY3NDA0OTYwNDM3MDY4ODFdLFwid2hlZWxfZGVuc2l0eVwiOlswLjA3ODAwNDc4NzkwNjAzNjgyLDAuNTIyNDI5NTY3MzM4NTQ1N10sXCJjaGFzc2lzX2RlbnNpdHlcIjpbMC4wNDYwODg1MTE3MDMyMDU0OV0sXCJ2ZXJ0ZXhfbGlzdFwiOlswLjMwNzUzNTMyNTgwNjczMDYsMC45NDY0OTc0MTk5Njc4MDIsMC40MDYyOTIyMzAyOTQzODU2NiwwLjI3NjM3NDEwNzg5ODIzODcsMC4yNTY0MDQ3NDEzMjQ1NDI3LDAuOTMxMTUzODk5MzI0MDM4OSwwLjY0NTMyNTQxNjM0MDUzMjIsMC42MTE0Nzk2ODI4OTY0NTQ0LDAuNTM3ODI4Mjg4MzkxMDI0NCwwLjE5OTIxNjA5ODQ2NjQ0NTI4LDAuOTY1Mzc4NTM0NTI1MDE5NCwwLjM5Nzg5MDk2ODQ5OTE0NjA3XSxcIndoZWVsX3ZlcnRleFwiOlswLjE3NTI2MDYzNzExMTk2NDA1LDAuNTIxOTIyNzM2NDc4NTcxNSwwLjE5MjI4NDAwODI4Mjg1NjUyLDAuNDc0NzExOTgxMjA4MjgzNCwwLjEyOTM5OTUxOTc2Mzc2NDA3LDAuOTcxOTE1NzQ1OTMzNjQyMywwLjA1ODU1MDU3NTUwMDMzOTcxLDAuMTcwMTE2MDY4MDAzNTkwNDddLFwiaW5kZXhcIjozN30se1wiaWRcIjpcIjAuc2tyNm1taTBzdWdcIixcIndoZWVsX3JhZGl1c1wiOlswLjEzMDE5OTAzNTk1MzE1MTc0LDAuNjk3ODg0NzQxMjE1MzA4OV0sXCJ3aGVlbF9kZW5zaXR5XCI6WzAuOTM4MDM4MzkyOTE2ODM3OSwwLjkwMDYyNjMxNTI3OTc1OTZdLFwiY2hhc3Npc19kZW5zaXR5XCI6WzAuNTM2MjE1MzU3MjIxNTQ5Nl0sXCJ2ZXJ0ZXhfbGlzdFwiOlswLjc4OTg1MzMyMDM0NTIwMzIsMC4wNDgyNjk5NjA5NTk1MjE4NSwwLjEwNDYxNjkwODA3NDM2Mjg2LDAuMTkxNDM1MDg2MDA4NDkxNDYsMC44MTg3NTYxODQ2ODkyNTQ0LDAuMjUzNTc2NTAxNjU2ODQ4MywwLjQ2NDQyNzEwOTMxMDMxNTQsMC43NzQ3MzIxNjYzNTY1NjA1LDAuNzE1NTg4ODU2NDA5OTU2NiwwLjIyNzczNjg0OTg1MDIwNzQ4LDAuODc2NDA0MjQwODA2OTcxMiwwLjI1NjUwMDE5ODIyMzQ5MzU3XSxcIndoZWVsX3ZlcnRleFwiOlswLjk3NDIyNDU0OTY1MDcyODUsMC4zODY0OTUxNTM0NjI4NjU1NiwwLjMzMDcwNDgzMTAyNzA5NywwLjg2OTUxMTczMDcyMTczNzUsMC44MzI0MjEzNTU2MDk5MDc0LDAuMTgxNTczNDE3MDA0NjAwNCwwLjQwNjg1MjkzNzE0Nzc3NzE1LDAuMzY3NzQwODU4MTMxOTM2MzVdLFwiaW5kZXhcIjozOH0se1wiaWRcIjpcIjAuMGJvZDh1bHZlNThcIixcIndoZWVsX3JhZGl1c1wiOlswLjU2OTA4MzgyMDIzNTQxNTYsMC4yNDk0NzMxNzcwNzIzMzY2M10sXCJ3aGVlbF9kZW5zaXR5XCI6WzAuNTMyNzE3MjQ0MjQxNjA5NSwwLjUyMjE4MzE0OTYxNzg3NTddLFwiY2hhc3Npc19kZW5zaXR5XCI6WzAuODU4NjM4MzAzOTI3NDMzXSxcInZlcnRleF9saXN0XCI6WzAuNjU0NDE2NTg0OTg1NjcwNywwLjc5MjE2NzA2NTYxMjA2OTQsMC4yMjgyODEwMTU5MTg4NjU1MiwwLjY2MDg5MTA1MzY1NTg4NjcsMC4wMjUyNjAzNTY0Mjg5MzEwOTcsMC43MDQ0NjE0MjA5MjcxOTI0LDAuOTc2MTkwNzIyODk2MjE5NCwwLjQ3MTE2NDkyMDkxNDY4OTMsMC41NzI3MDUwMjc1NDczNTg0LDAuODI3Mjc1NjYzNTIwNDI0MSwwLjM5ODI1NTcyMTUzNDUyODQsMC41NDY3MDg4MzM0MTU2MTRdLFwid2hlZWxfdmVydGV4XCI6WzAuMjAyNTU5NDY0MTY2ODE2MDMsMC4yODI0NTc5OTIwNzgyMjkxLDAuMzAxODUxODk1MDQwNjM3MjUsMC43MzczMDkxOTIxMjQzNDIyLDAuODM1MzExMzYzOTE2OTU0NSwwLjg3ODczMDgwNjI3MDc0MzcsMC4yMDIyMzAwNDQ4NDkzMDI4NSwwLjc4MTI3NjY0NDM3ODg5NTldLFwiaW5kZXhcIjozOX1dfSIsInZhciBjcmVhdGUgPSByZXF1aXJlKFwiLi4vY3JlYXRlLWluc3RhbmNlXCIpO1xyXG52YXIgc2VsZWN0aW9uID0gcmVxdWlyZShcIi4vc2VsZWN0aW9uLmpzL1wiKTtcclxudmFyIG11dGF0aW9uID0gcmVxdWlyZShcIi4vbXV0YXRpb24uanMvXCIpO1xyXG52YXIgY3Jvc3NvdmVyID0gcmVxdWlyZShcIi4vY3Jvc3NvdmVyLmpzL1wiKTtcclxudmFyIGNsdXN0ZXIgPSByZXF1aXJlKFwiLi9jbHVzdGVyaW5nL2NsdXN0ZXJTZXR1cC5qcy9cIik7XHJcbnZhciByYW5kb21JbnQgPSByZXF1aXJlKFwiLi9yYW5kb21JbnQuanMvXCIpO1xyXG52YXIgZ2V0UmFuZG9tSW50ID0gcmFuZG9tSW50LmdldFJhbmRvbUludDtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0ge1xyXG4gIGdlbmVyYXRpb25aZXJvOiBnZW5lcmF0aW9uWmVybyxcclxuICBuZXh0R2VuZXJhdGlvbjogbmV4dEdlbmVyYXRpb25cclxufVxyXG5cclxuZnVuY3Rpb24gZ2VuZXJhdGlvblplcm8oY29uZmlnKXtcclxuICB2YXIgZ2VuZXJhdGlvblNpemUgPSBjb25maWcuZ2VuZXJhdGlvblNpemUsXHJcbiAgc2NoZW1hID0gY29uZmlnLnNjaGVtYTtcclxuICB2YXIgdXNlRmlsZSA9IGZhbHNlO1xyXG4gIHZhciBjd19jYXJHZW5lcmF0aW9uID0gW107XHJcbiAgaWYodXNlRmlsZT09PXRydWUpe1xyXG5cdCAgY3dfY2FyR2VuZXJhdGlvbj0gcmVhZEZpbGUoKTtcclxuICB9XHJcbiAgZWxzZSB7XHJcblx0ICBmb3IgKHZhciBrID0gMDsgayA8IGdlbmVyYXRpb25TaXplOyBrKyspIHtcclxuXHRcdHZhciBkZWYgPSBjcmVhdGUuY3JlYXRlR2VuZXJhdGlvblplcm8oc2NoZW1hLCBmdW5jdGlvbigpe1xyXG5cdFx0cmV0dXJuIE1hdGgucmFuZG9tKClcclxuXHRcdH0pO1xyXG5cdFx0ZGVmLmluZGV4ID0gaztcclxuXHRcdGN3X2NhckdlbmVyYXRpb24ucHVzaChkZWYpO1xyXG5cdH1cclxuICB9XHJcbiAgcmV0dXJuIHtcclxuICAgIGNvdW50ZXI6IDAsXHJcbiAgICBnZW5lcmF0aW9uOiBjd19jYXJHZW5lcmF0aW9uLFxyXG4gIH07XHJcbn1cclxuXHJcbi8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tIG15IGNvZGUgam9iNjRcclxuLypUaGlzIGZ1bmN0aW9uIGxvYWRzIGFuIGluaXRpYWwgY2FyIHBvcHVsYXRpb24gZnJvbSBhIC5qc29uIGZpbGUqL1xyXG5mdW5jdGlvbiByZWFkRmlsZSgpe1xyXG5cdHZhciBmcyA9IHJlcXVpcmUoJ2ZzJyk7XHJcblx0dmFyIGFycmF5ID0gW107XHJcblx0dmFyIGZpbGUgPSByZXF1aXJlKFwiLi9pbml0aWFsQ2Fycy5qc29uL1wiKTtcclxuXHRmb3IodmFyIGkgPSAwO2k8ZmlsZS5hcnJheS5sZW5ndGg7aSsrKXtcclxuXHRcdGFycmF5LnB1c2goZmlsZS5hcnJheVtpXSk7XHJcblx0fVxyXG5cdHJldHVybiBhcnJheTtcclxufVxyXG5cclxuLypUaGlzIGZ1bmN0aW9uIENob29zZXMgd2hpY2ggc2VsZWN0aW9uIG9wZXJhdG9yIHRvIHVzZSBpbiB0aGUgc2VsZWN0aW9uIG9mIHR3byBwYXJlbnRzIGZvciB0d28gbmV3IGNhcnMgc3VjaCBhcyBlaXRoZXIgVG91cm5hbWVudCBvciBSb3VsZXR0ZS13aGVlbCBzZWxlY3Rpb25cclxuQHBhcmFtIHBhcmVudHMgT2JqZWN0QXJyYXkgLSBBZGRpbmcgdGhlIHNlbGVjdGVkIG9iamVjdCBpbnRvIHRoaXMgYXJyYXlcclxuQHBhcmFtIHNjb3JlcyBPYmplY3RBcnJheSAtIEFuIGFycmF5IG9mIGNhcnMgd2hlcmUgdGhlIHBhcmVudHMgd2lsbCBiZSBzZWxlY3RlZCBmcm9tXHJcbkBwYXJhbSBpbmNyZWFzZU1hdGUgQm9vbGVhbiAtIFdoZXRoZXIgdGhlIGN1cnJlbnQgc2VsZWN0aW9uIHdpbGwgaW5jbHVkZSBhbiBlbGl0ZSB3aGVyZSBpZiB0cnVlIGl0IHdvbnQgYmUgZGVsZXRlZCBmcm9tIHRoZSBPYmplY3QgYXJyYXkgYWxsb3dpbmcgaXQgdG8gYmUgdXNlZCBhZ2FpblxyXG5AcmV0dXJuIHBhcmVudHNTY29yZSBpbnQgLSByZXR1cm5zIHRoZSBhdmVyYWdlIHNjb3JlIG9mIHRoZSBwYXJlbnRzKi9cclxuZnVuY3Rpb24gc2VsZWN0UGFyZW50cyhwYXJlbnRzLCBzY29yZXMsIGluY3JlYXNlTWF0ZSl7XHJcblx0dmFyIHBhcmVudDEgPSBzZWxlY3Rpb24ucnVuU2VsZWN0aW9uKHNjb3JlcywoaW5jcmVhc2VNYXRlPT09ZmFsc2UpPzI6Mix0cnVlLCB0cnVlLCB0cnVlKTtcclxuXHRwYXJlbnRzLnB1c2gocGFyZW50MS5kZWYpO1xyXG5cdGlmKGluY3JlYXNlTWF0ZT09PWZhbHNlKXtcclxuXHRcdHNjb3Jlcy5zcGxpY2Uoc2NvcmVzLmZpbmRJbmRleCh4PT4geC5kZWYuaWQ9PT1wYXJlbnRzWzBdLmlkKSwxKTtcclxuXHR9XHJcblx0dmFyIHBhcmVudDIgPSBzZWxlY3Rpb24ucnVuU2VsZWN0aW9uKHNjb3JlcywoaW5jcmVhc2VNYXRlPT09ZmFsc2UpPzI6Mix0cnVlLCB0cnVlLCB0cnVlKTtcclxuXHRwYXJlbnRzLnB1c2gocGFyZW50Mi5kZWYpO1xyXG5cdHNjb3Jlcy5zcGxpY2Uoc2NvcmVzLmZpbmRJbmRleCh4PT4geC5kZWYuaWQ9PT1wYXJlbnRzWzFdLmlkKSwxKTtcclxuXHRyZXR1cm4gKHBhcmVudDEuc2NvcmUucyArIHBhcmVudDIuc2NvcmUucykvMjtcclxufVxyXG5cclxuLypUaGlzIGZ1bmN0aW9uIHJ1bnMgYSBFdm9sdXRpb25hcnkgYWxnb3JpdGhtIHdoaWNoIHVzZXMgU2VsZWN0aW9uLCBDcm9zc292ZXIgYW5kIG11dGF0aW9ucyB0byBjcmVhdGUgdGhlIG5ldyBwb3B1bGF0aW9ucyBvZiBjYXJzLlxyXG5AcGFyYW0gc2NvcmVzIE9iamVjdEFycmF5IC0gQW4gYXJyYXkgd2hpY2ggaG9sZHMgdGhlIGNhciBvYmplY3RzIGFuZCB0aGVyZSBwZXJmb3JtYW5jZSBzY29yZXNcclxuQHBhcmFtIGNvbmZpZyAtIFRoaXMgaXMgdGhlIGdlbmVyYXRpb25Db25maWcgZmlsZSBwYXNzZWQgdGhyb3VnaCB3aGljaCBnaXZlcyB0aGUgY2FycyB0ZW1wbGF0ZS9ibHVlcHJpbnQgZm9yIGNyZWF0aW9uXHJcbkBwYXJhbSBub0NhcnNDcmVhdGVkIGludCAtIFRoZSBudW1iZXIgb2YgY2FycyB0aGVyZSBjdXJyZW50bHkgZXhpc3QgdXNlZCBmb3IgY3JlYXRpbmcgdGhlIGlkIG9mIG5ldyBjYXJzXHJcbkByZXR1cm4gbmV3R2VuZXJhdGlvbiBPYmplY3RBcnJheSAtIGlzIHJldHVybmVkIHdpdGggYWxsIHRoZSBuZXdseSBjcmVhdGVkIGNhcnMgdGhhdCB3aWxsIGJlIGluIHRoZSBzaW11bGF0aW9uKi9cclxuZnVuY3Rpb24gcnVuRUEoc2NvcmVzLCBjb25maWcsIG5vQ2Fyc0NyZWF0ZWQpe1xyXG5cdHNjb3Jlcy5zb3J0KGZ1bmN0aW9uKGEsIGIpe3JldHVybiBiLnNjb3JlLnMgLSBhLnNjb3JlLnM7fSk7XHJcblx0dmFyIGdlbmVyYXRpb25TaXplPXNjb3Jlcy5sZW5ndGg7XHJcblx0dmFyIG5ld0dlbmVyYXRpb24gPSBuZXcgQXJyYXkoKTtcclxuXHR2YXIgcmFuZG9tTWF0ZUluY3JlYXNlID0gZ2V0UmFuZG9tSW50KDAsbWF4Tm9NYXRlc0luY3JlYXNlcywgbmV3IEFycmF5KCkpO1xyXG5cdHZhciBtYXhOb01hdGVzSW5jcmVhc2VzID0gMDtcclxuXHR2YXIgY3VycmVudE5vTWF0ZUluY3JlYXNlcyA9IDE7XHJcblx0dmFyIG5vRWxpdGVzPTM7XHJcblx0Zm9yKHZhciBpPTA7aTxub0VsaXRlcztpKyspey8vYWRkIG5ldyBlbGl0ZXMgdG8gbmV3R2VuZXJhdGlvblxyXG5cdFx0dmFyIG5ld0VsaXRlID0gc2NvcmVzWzBdLmRlZjtcclxuXHRcdG5ld0VsaXRlLmVsaXRlID0gdHJ1ZTtcclxuXHRcdG5ld0dlbmVyYXRpb24ucHVzaChuZXdFbGl0ZSk7XHJcblx0fVxyXG5cdGZvcih2YXIgayA9IDA7azxnZW5lcmF0aW9uU2l6ZS8yO2srKyl7XHJcblx0XHRpZihuZXdHZW5lcmF0aW9uLmxlbmd0aCE9PTQwKXtcclxuXHRcdHZhciBwaWNrZWRQYXJlbnRzID0gW107XHJcblx0XHR2YXIgcGFyZW50c1Njb3JlID0gc2VsZWN0UGFyZW50cyhwaWNrZWRQYXJlbnRzLCBzY29yZXMsICgoaz09PXJhbmRvbU1hdGVJbmNyZWFzZSkmJihjdXJyZW50Tm9NYXRlSW5jcmVhc2VzPG1heE5vTWF0ZXNJbmNyZWFzZXMpKT90cnVlOmZhbHNlKTsgXHJcblx0XHRpZihjdXJyZW50Tm9NYXRlSW5jcmVhc2VzPG1heE5vTWF0ZXNJbmNyZWFzZXMpe2N1cnJlbnROb01hdGVJbmNyZWFzZXMrKzt9XHJcblx0XHRcdHZhciBuZXdDYXJzID0gY3Jvc3NvdmVyLnJ1bkNyb3Nzb3ZlcihwaWNrZWRQYXJlbnRzLDAsY29uZmlnLnNjaGVtYSwgcGFyZW50c1Njb3JlLCBub0NhcnNDcmVhdGVkLCAobmV3R2VuZXJhdGlvbi5sZW5ndGg9PT0zOSk/MToyKTtcclxuXHRcdFx0Zm9yKHZhciBpPTA7aTxuZXdDYXJzLmxlbmd0aDtpKyspe1xyXG5cdFx0XHRcdG5ld0NhcnNbaV0uZWxpdGUgPSBmYWxzZTtcclxuXHRcdFx0XHRuZXdDYXJzW2ldLmluZGV4ID0gaztcclxuXHRcdFx0XHRuZXdHZW5lcmF0aW9uLnB1c2gobmV3Q2Fyc1tpXSk7XHJcblx0XHRcdFx0bm9DYXJzQ3JlYXRlZCsrOy8vIHVzZWQgaW4gY2FyIGlkIGNyZWF0aW9uXHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHR9XHRcclxuXHRuZXdHZW5lcmF0aW9uLnNvcnQoZnVuY3Rpb24oYSwgYil7cmV0dXJuIGEucGFyZW50c1Njb3JlIC0gYi5wYXJlbnRzU2NvcmU7fSk7XHJcblx0Zm9yKHZhciB4ID0gMDt4PG5ld0dlbmVyYXRpb24ubGVuZ3RoO3grKyl7XHJcblx0XHRcdHZhciBjdXJyZW50SUQgPSBuZXdHZW5lcmF0aW9uW3hdLmlkO1xyXG5cdFx0XHRpZihuZXdHZW5lcmF0aW9uW3hdLmVsaXRlPT09ZmFsc2Upe1xyXG5cdFx0XHRcdC8vbmV3R2VuZXJhdGlvblt4XSA9IG11dGF0aW9uLm11bHRpTXV0YXRpb25zKG5ld0dlbmVyYXRpb25beF0sbmV3R2VuZXJhdGlvbi5maW5kSW5kZXgoeD0+IHguaWQ9PT1jdXJyZW50SUQpLDIwKTtcclxuXHRcdFx0XHRuZXdHZW5lcmF0aW9uW3hdID0gbXV0YXRpb24ubXV0YXRlKG5ld0dlbmVyYXRpb25beF0pO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0XHRjb25zb2xlLmxvZyhuZXdHZW5lcmF0aW9uKTtcclxuXHRyZXR1cm4gbmV3R2VuZXJhdGlvbjtcclxufVxyXG5cclxuLypUaGlzIGZ1bmN0aW9uIHJ1bnMgdGhlIEJhc2VsaW5lIEV2b2x1dGlvbmFyeSBhbGdvcml0aG0gd2hpY2ggb25seSBydW5zIGEgbXV0YXRpb24gb3IgbXVsdGlNdXRhdGlvbnMgb3ZlciBhbGwgdGhlIGNhcnMgcGFzc2VkIHRob3VnaCBpbiB0aGUgc2NvcmVzIHBhcmFtZXRlci5cclxuQHBhcmFtIHNjb3JlcyBBcnJheSAtIFRoaXMgcGFyYW1ldGVyIGlzIGFuIGFycmF5IG9mIGNhcnMgdGhhdCBob2xkcyB0aGUgc2NvcmUgc3RhdGlzdGljcyBhbmQgY2FyIGRhdGEgc3VjaCBhcyBpZCBhbmQgXCJ3aGVlbF9yYWRpdXNcIiwgXCJjaGFzc2lzX2RlbnNpdHlcIiwgXCJ2ZXJ0ZXhfbGlzdFwiLCBcIndoZWVsX3ZlcnRleFwiIGFuZCBcIndoZWVsX2RlbnNpdHlcIlxyXG5AcGFyYW0gY29uZmlnIC0gVGhpcyBwYXNzZXMgYSBmaWxlIHdpdGggZnVuY3Rpb25zIHRoYXQgY2FuIGJlIGNhbGxlZC5cclxuQHJldHVybiBuZXdHZW5lcmF0aW9uIC0gdGhpcyBpcyB0aGUgbmV3IHBvcHVsYXRpb24gdGhhdCBoYXZlIGhhZCBtdXRhdGlvbnMgYXBwbGllZCB0byB0aGVtLiovXHJcbmZ1bmN0aW9uIHJ1bkJhc2VsaW5lRUEoc2NvcmVzLCBjb25maWcpe1xyXG5cdHNjb3Jlcy5zb3J0KGZ1bmN0aW9uKGEsIGIpe3JldHVybiBhLnNjb3JlLnMgLSBiLnNjb3JlLnM7fSk7XHJcblx0dmFyIHNjaGVtYSA9IGNvbmZpZy5zY2hlbWE7Ly9saXN0IG9mIGNhciB2YXJpYWJsZXMgaS5lIFwid2hlZWxfcmFkaXVzXCIsIFwiY2hhc3Npc19kZW5zaXR5XCIsIFwidmVydGV4X2xpc3RcIiwgXCJ3aGVlbF92ZXJ0ZXhcIiBhbmQgXCJ3aGVlbF9kZW5zaXR5XCJcclxuXHR2YXIgbmV3R2VuZXJhdGlvbiA9IG5ldyBBcnJheSgpO1xyXG5cdHZhciBnZW5lcmF0aW9uU2l6ZT1zY29yZXMubGVuZ3RoO1xyXG5cdGNvbnNvbGUubG9nKHNjb3Jlcyk7Ly90ZXN0IGRhdGFcclxuXHRmb3IgKHZhciBrID0gMDsgayA8IGdlbmVyYXRpb25TaXplOyBrKyspIHtcclxuXHRcdC8vbmV3R2VuZXJhdGlvbi5wdXNoKG11dGF0aW9uLm11dGF0ZShzY29yZXNba10uZGVmKSk7XHJcblx0XHRuZXdHZW5lcmF0aW9uLnB1c2gobXV0YXRpb24ubXVsdGlNdXRhdGlvbnMoc2NvcmVzW2tdLmRlZixzY29yZXMuZmluZEluZGV4KHg9PiB4LmRlZi5pZD09PXNjb3Jlc1trXS5kZWYuaWQpLDIwKSk7XHJcblx0XHRuZXdHZW5lcmF0aW9uW2tdLmlzX2VsaXRlID0gZmFsc2U7XHJcblx0XHRuZXdHZW5lcmF0aW9uW2tdLmluZGV4ID0gaztcclxuXHR9XHJcblx0XHJcblx0cmV0dXJuIG5ld0dlbmVyYXRpb247XHJcbn1cdFxyXG5cclxuLypcclxuVGhpcyBmdW5jdGlvbiBoYW5kbGVzIHRoZSBjaG9vc2luZyBvZiB3aGljaCBFdm9sdXRpb25hcnkgYWxnb3JpdGhtIHRvIHJ1biBhbmQgcmV0dXJucyB0aGUgbmV3IHBvcHVsYXRpb24gdG8gdGhlIHNpbXVsYXRpb24qL1xyXG5mdW5jdGlvbiBuZXh0R2VuZXJhdGlvbihwcmV2aW91c1N0YXRlLCBzY29yZXMsIGNvbmZpZyl7XHJcblx0dmFyIG5ld0dlbmVyYXRpb24gPSBuZXcgQXJyYXkoKTtcclxuXHR2YXIgY291bnQ7XHJcblx0dmFyIHRlbXBSb3VuZD0wO1xyXG5cdFxyXG5cdFx0dGVtcFJvdW5kPSh0eXBlb2YgcHJldmlvdXNTdGF0ZS5yb3VuZCA9PT1cInVuZGVmaW5lZFwiKT8wOnByZXZpb3VzU3RhdGUucm91bmQ7XHJcblx0XHRjb3VudCA9IHByZXZpb3VzU3RhdGUuY291bnRlciArIDE7XHJcblx0XHQvL3ZhciBjbHVzdGVySW50ID0gKHByZXZpb3VzU3RhdGUuY291bnRlcj09PTApP2NsdXN0ZXIuc2V0dXAoc2NvcmVzLG51bGwsZmFsc2UpOmNsdXN0ZXIuc2V0dXAoc2NvcmVzLHByZXZpb3VzU3RhdGUuY2x1c3QsdHJ1ZSk7XHJcblx0XHQvL2NsdXN0ZXIucmVTY29yZUNhcnMoc2NvcmVzICxjbHVzdGVySW50KTtcclxuXHRcdHNjb3Jlcy5zb3J0KGZ1bmN0aW9uKGEsIGIpe3JldHVybiBhLnNjb3JlLnMgLSBiLnNjb3JlLnM7fSk7XHJcblx0XHR2YXIgbnVtYmVyT2ZDYXJzID0gKHByZXZpb3VzU3RhdGUuY291bnRlcj09PTApPzQwOnByZXZpb3VzU3RhdGUubm9DYXJzKzQwO1xyXG5cdFx0dmFyIHNjaGVtYSA9IGNvbmZpZy5zY2hlbWE7Ly9saXN0IG9mIGNhciB2YXJpYWJsZXMgaS5lIFwid2hlZWxfcmFkaXVzXCIsIFwiY2hhc3Npc19kZW5zaXR5XCIsIFwidmVydGV4X2xpc3RcIiwgXCJ3aGVlbF92ZXJ0ZXhcIlxyXG5cdFxyXG5cdFx0Y29uc29sZS5sb2coXCJMb2cgLS0gXCIrcHJldmlvdXNTdGF0ZS5jb3VudGVyKTtcclxuXHRcdC8vY29uc29sZS5sb2coc2NvcmVzRGF0YSk7Ly90ZXN0IGRhdGFcclxuXHRcdHZhciBlYVR5cGUgPSAxO1xyXG5cdFx0bmV3R2VuZXJhdGlvbiA9IChlYVR5cGU9PT0xKT9ydW5FQShzY29yZXMsIGNvbmZpZywgbnVtYmVyT2ZDYXJzLCBwcmV2aW91c1N0YXRlLnN0YXRlQXZlcmFnZXNBcnIpOnJ1bkJhc2VsaW5lRUEoc2NvcmVzLCBjb25maWcpO1xyXG5cdFx0Ly9jb25zb2xlLmxvZyhuZXdHZW5lcmF0aW9uKTsvL3Rlc3QgZGF0YVxyXG5cdGlmKHByZXZpb3VzU3RhdGUuY291bnRlcj4xNTApe1xyXG5cdFx0Y291bnQ9MDtcclxuXHRcdHRlbXBSb3VuZCsrO1xyXG5cdFx0Ly9uZXdHZW5lcmF0aW9uPWdlbmVyYXRpb25aZXJvKGNvbmZpZykuZ2VuZXJhdGlvbjtcclxuXHRcdFxyXG5cdH1cclxuXHRcclxuICByZXR1cm4ge1xyXG4gICAgY291bnRlcjogY291bnQsXHJcbiAgICBnZW5lcmF0aW9uOiBuZXdHZW5lcmF0aW9uLFxyXG5cdC8vY2x1c3Q6IGNsdXN0ZXJJbnQsXHJcblx0bm9DYXJzOiBudW1iZXJPZkNhcnMsXHJcblx0cm91bmQ6IHRlbXBSb3VuZFxyXG4gIH07XHJcbn1cclxuXHJcblxyXG4vLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSBlbmQgb2YgbXkgY29kZSBqb2I2NFxyXG5cclxuXHJcbmZ1bmN0aW9uIG1ha2VDaGlsZChjb25maWcsIHBhcmVudHMpe1xyXG4gIHZhciBzY2hlbWEgPSBjb25maWcuc2NoZW1hLFxyXG4gICAgcGlja1BhcmVudCA9IGNvbmZpZy5waWNrUGFyZW50O1xyXG4gIHJldHVybiBjcmVhdGUuY3JlYXRlQ3Jvc3NCcmVlZChzY2hlbWEsIHBhcmVudHMsIHBpY2tQYXJlbnQpXHJcbn1cclxuXHJcblxyXG5cclxuZnVuY3Rpb24gbXV0YXRlKGNvbmZpZywgcGFyZW50KXtcclxuICB2YXIgc2NoZW1hID0gY29uZmlnLnNjaGVtYSxcclxuICAgIG11dGF0aW9uX3JhbmdlID0gY29uZmlnLm11dGF0aW9uX3JhbmdlLFxyXG4gICAgZ2VuX211dGF0aW9uID0gY29uZmlnLmdlbl9tdXRhdGlvbixcclxuICAgIGdlbmVyYXRlUmFuZG9tID0gY29uZmlnLmdlbmVyYXRlUmFuZG9tO1xyXG4gIHJldHVybiBjcmVhdGUuY3JlYXRlTXV0YXRlZENsb25lKFxyXG4gICAgc2NoZW1hLFxyXG4gICAgZ2VuZXJhdGVSYW5kb20sXHJcbiAgICBwYXJlbnQsXHJcbiAgICBNYXRoLm1heChtdXRhdGlvbl9yYW5nZSksXHJcbiAgICBnZW5fbXV0YXRpb25cclxuICApXHJcbn1cclxuIiwibW9kdWxlLmV4cG9ydHMgPSB7XHJcblx0bXV0YXRlOiBtdXRhdGUsXHJcblx0bXVsdGlNdXRhdGlvbnM6IG11bHRpTXV0YXRpb25zXHJcbn1cclxuXHJcbi8qVGhpcyBmdW5jdGlvbiByZXR1cm5zIHdob2xlIGludHMgYmV0d2VlbiBhIG1pbmltdW0gYW5kIG1heGltdW1cclxuQHBhcmFtIG1pbiBpbnQgLSBUaGUgbWluaW11bSBpbnQgdGhhdCBjYW4gYmUgcmV0dXJuZWRcclxuQHBhcmFtIG1heCBpbnQgLSBUaGUgbWF4aW11bSBpbnQgdGhhdCBjYW4gYmUgcmV0dXJuZWRcclxuQHBhcmFtIG5vdEVxdWFsc0FyciBpbnRBcnJheSAtIEFuIGFycmF5IG9mIHRoZSBpbnRzIHRoYXQgdGhlIGZ1bmN0aW9uIHNob3VsZCBub3QgcmV0dXJuXHJcbkByZXR1cm4gaW50IC0gVGhlIGludCB3aXRoaW4gdGhlIHNwZWNpZmllZCBwYXJhbWV0ZXIgYm91bmRzIGlzIHJldHVybmVkLiovXHJcbmZ1bmN0aW9uIGdldFJhbmRvbUludChtaW4sIG1heCwgbm90RXF1YWxzQXJyKSB7XHJcblx0dmFyIHRvUmV0dXJuO1xyXG5cdHZhciBydW5Mb29wID0gdHJ1ZTtcclxuXHR3aGlsZShydW5Mb29wPT09dHJ1ZSl7XHJcblx0XHRtaW4gPSBNYXRoLmNlaWwobWluKTtcclxuXHRcdG1heCA9IE1hdGguZmxvb3IobWF4KTtcclxuXHRcdHRvUmV0dXJuID0gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogKG1heCAtIG1pbiArIDEpKSArIG1pbjtcclxuXHRcdGlmKHR5cGVvZiBmaW5kSWZFeGlzdHMgPT09IFwidW5kZWZpbmVkXCIpe1xyXG5cdFx0XHRydW5Mb29wPWZhbHNlO1xyXG5cdFx0fVxyXG5cdFx0ZWxzZSBpZihub3RFcXVhbHNBcnIuZmluZChmdW5jdGlvbih2YWx1ZSl7cmV0dXJuIHZhbHVlPT09dG9SZXR1cm47fSk9PT1mYWxzZSl7XHJcblx0XHRcdHJ1bkxvb3A9ZmFsc2U7XHJcblx0XHR9XHJcblx0fVxyXG4gICAgcmV0dXJuIHRvUmV0dXJuOy8vKHR5cGVvZiBmaW5kSWZFeGlzdHMgPT09IFwidW5kZWZpbmVkXCIpP3RvUmV0dXJuOmdldFJhbmRvbUludChtaW4sIG1heCwgbm90RXF1YWxzQXJyKTtcclxufVxyXG5cclxuXHJcbmZ1bmN0aW9uIGNoYW5nZUFycmF5VmFsdWUob3JpZ2luYWxWYWx1ZSl7XHJcblx0Zm9yKHZhciBpPTA7aTxvcmlnaW5hbFZhbHVlLmxlbmd0aDtpKyspe1xyXG5cdFx0dmFyIHJhbmRvbUZsb2F0ID0gTWF0aC5yYW5kb20oKTtcclxuXHRcdHZhciBtdXRhdGlvblJhdGUgPSAwLjUqcmFuZG9tRmxvYXQ7Ly9NYXRoLnJhbmRvbSgpO1xyXG5cdFx0dmFyIGluY3JlYXNlT3JEZWNyZWFzZSA9IGdldFJhbmRvbUludCgwLDEsW10pO1xyXG5cdFx0bmV3VmFsdWUgPSAoaW5jcmVhc2VPckRlY3JlYXNlPT09MCk/b3JpZ2luYWxWYWx1ZVtpXS1tdXRhdGlvblJhdGU6b3JpZ2luYWxWYWx1ZVtpXSttdXRhdGlvblJhdGU7XHJcblx0XHRpZihuZXdWYWx1ZTwwKXtcclxuXHRcdFx0bmV3VmFsdWUgPSBvcmlnaW5hbFZhbHVlW2ldK211dGF0aW9uUmF0ZTtcclxuXHRcdH0gZWxzZSBpZihuZXdWYWx1ZT4xKXtcclxuXHRcdFx0bmV3VmFsdWUgPSBvcmlnaW5hbFZhbHVlW2ldLW11dGF0aW9uUmF0ZTtcclxuXHRcdH1cclxuXHRcdG9yaWdpbmFsVmFsdWVbaV0gPSBuZXdWYWx1ZTtcclxuXHR9XHJcblx0cmV0dXJuIG9yaWdpbmFsVmFsdWU7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIG11dGF0ZShjYXIpe1xyXG5cdHJldHVybiBjaGFuZ2VEYXRhKGNhcixuZXcgQXJyYXkoKSwxKTtcclxufVxyXG5cclxuZnVuY3Rpb24gY2hhbmdlRGF0YShjYXIsIG11bHRpTXV0YXRpb25zLCBub011dGF0aW9ucyl7XHJcblx0dmFyIHJhbmRvbUludCA9IGdldFJhbmRvbUludCgxLDQsIG11bHRpTXV0YXRpb25zKTtcclxuXHRpZihyYW5kb21JbnQ9PT0xKXtcclxuXHRcdGNhci5jaGFzc2lzX2RlbnNpdHk9Y2hhbmdlQXJyYXlWYWx1ZShjYXIuY2hhc3Npc19kZW5zaXR5KTtcclxuXHR9XHJcblx0ZWxzZSBpZihyYW5kb21JbnQ9PT0yKXtcclxuXHRcdGNhci52ZXJ0ZXhfbGlzdD1jaGFuZ2VBcnJheVZhbHVlKGNhci52ZXJ0ZXhfbGlzdCk7XHJcblx0fVxyXG5cdGVsc2UgaWYocmFuZG9tSW50PT09Myl7XHJcblx0XHRjYXIud2hlZWxfZGVuc2l0eT1jaGFuZ2VBcnJheVZhbHVlKGNhci53aGVlbF9kZW5zaXR5KTtcclxuXHR9XHJcblx0ZWxzZSBpZihyYW5kb21JbnQ9PT00KXtcclxuXHRcdGNhci53aGVlbF9yYWRpdXM9Y2hhbmdlQXJyYXlWYWx1ZShjYXIud2hlZWxfcmFkaXVzKTtcclxuXHR9XHJcblx0ZWxzZSB7XHJcblx0XHRjYXIud2hlZWxfdmVydGV4PWNoYW5nZUFycmF5VmFsdWUoY2FyLndoZWVsX3ZlcnRleCk7XHJcblx0fVxyXG5cdG11bHRpTXV0YXRpb25zLnB1c2gocmFuZG9tSW50KTtcclxuXHRub011dGF0aW9ucy0tO1xyXG5cdHJldHVybiAobm9NdXRhdGlvbnM9PT0wKT9jYXI6Y2hhbmdlRGF0YShjYXIsIG11bHRpTXV0YXRpb25zLCBub011dGF0aW9ucyk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIG11bHRpTXV0YXRpb25zKGNhciwgYXJyUG9zaXRpb24sIGFyclNpemUpe1xyXG5cdC8vdmFyIG5vTXV0YXRpb25zID0gKGFyclBvc2l0aW9uPChhcnJTaXplLzIpKT8oYXJyUG9zaXRpb248KGFyclNpemUvNCkpPzQ6MzooYXJyUG9zaXRpb24+YXJyU2l6ZS0oYXJyU2l6ZS80KSk/MToyO1xyXG5cdHZhciBub011dGF0aW9ucyA9IChhcnJQb3NpdGlvbjwxMCk/MzoxO1xyXG5cdHJldHVybiBjaGFuZ2VEYXRhKGNhciwgbmV3IEFycmF5KCksbm9NdXRhdGlvbnMpO1xyXG59IiwiIG1vZHVsZS5leHBvcnRzID0ge1xyXG5cdGdldFJhbmRvbUludDogZ2V0UmFuZG9tSW50XHJcbiB9XHJcbiBcclxuLypUaGlzIGlzIGEgcmVjdXJzaXZlIGZ1bmN0aW9uIHdoaWNoIHJldHVybnMgd2hvbGUgaW50cyBiZXR3ZWVuIGEgbWluaW11bSBhbmQgbWF4aW11bVxyXG5AcGFyYW0gbWluIGludCAtIFRoZSBtaW5pbXVtIGludCB0aGF0IGNhbiBiZSByZXR1cm5lZFxyXG5AcGFyYW0gbWF4IGludCAtIFRoZSBtYXhpbXVtIGludCB0aGF0IGNhbiBiZSByZXR1cm5lZFxyXG5AcGFyYW0gbm90RXF1YWxzQXJyIGludEFycmF5IC0gQW4gYXJyYXkgb2YgdGhlIGludHMgdGhhdCB0aGUgZnVuY3Rpb24gc2hvdWxkIG5vdCByZXR1cm5cclxuQHJldHVybiBpbnQgLSBUaGUgaW50IHdpdGhpbiB0aGUgc3BlY2lmaWVkIHBhcmFtZXRlciBib3VuZHMgaXMgcmV0dXJuZWQuKi9cclxuZnVuY3Rpb24gZ2V0UmFuZG9tSW50KG1pbiwgbWF4LCBub3RFcXVhbHNBcnIpIHtcclxuXHR2YXIgdG9SZXR1cm47XHJcblx0dmFyIHJ1bkxvb3AgPSB0cnVlO1xyXG5cdHdoaWxlKHJ1bkxvb3A9PT10cnVlKXtcclxuXHRcdG1pbiA9IE1hdGguY2VpbChtaW4pO1xyXG5cdFx0bWF4ID0gTWF0aC5mbG9vcihtYXgpO1xyXG5cdFx0dG9SZXR1cm4gPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAobWF4IC0gbWluICsgMSkpICsgbWluO1xyXG5cdFx0aWYodHlwZW9mIGZpbmRJZkV4aXN0cyA9PT0gXCJ1bmRlZmluZWRcIil7XHJcblx0XHRcdHJ1bkxvb3A9ZmFsc2U7XHJcblx0XHR9XHJcblx0XHRlbHNlIGlmKG5vdEVxdWFsc0Fyci5maW5kKGZ1bmN0aW9uKHZhbHVlKXtyZXR1cm4gdmFsdWU9PT10b1JldHVybjt9KT09PWZhbHNlKXtcclxuXHRcdFx0cnVuTG9vcD1mYWxzZTtcclxuXHRcdH1cclxuXHR9XHJcbiAgICByZXR1cm4gdG9SZXR1cm47Ly8odHlwZW9mIGZpbmRJZkV4aXN0cyA9PT0gXCJ1bmRlZmluZWRcIik/dG9SZXR1cm46Z2V0UmFuZG9tSW50KG1pbiwgbWF4LCBub3RFcXVhbHNBcnIpO1xyXG59IiwiLy92YXIgcmFuZG9tSW50ID0gcmVxdWlyZShcIi4vcmFuZG9tSW50LmpzL1wiKTtcclxuLy92YXIgZ2V0UmFuZG9tSW50ID0gcmFuZG9tSW50LmdldFJhbmRvbUludDtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0ge1xyXG5cdHJ1blNlbGVjdGlvbjogcnVuU2VsZWN0aW9uXHJcbn1cclxuLypcclxuVGhpcyBmdW5jdGlvbiBjaGFuZ2VzIHRoZSB0eXBlIG9mIHNlbGVjdGlvbiB1c2VkIGRlcGVuZGluZyBvbiB0aGUgcGFyYW1ldGVyIG51bWJlciBcInNlbGVjdFR5cGVcIiA9IChyb3VsZXRlV2hlZWxTZWwgLSAxLCB0b3VybmFtZW50U2VsZWN0aW9uIC0gMilcclxuQHBhcmFtIHN0cm9uZ2VzdCBib29sZWFuICAtIHRoaXMgcGFyYW1ldGVyIGlzIHBhc3NlZCB0aHJvdWdoIHRvIHRoZSB0b3VybmFtZW50U2VsZWN0aW9uIGZ1bmN0aW9uIHdoZXJlIHRydWUgaXMgcmV0dXJuIHRoZSBzdHJvbmdlc3QgYW5kIGZhbHNlIGdldCB3ZWFrZXN0XHJcbkBwYXJhbSBzZWxlY3RUeXBlIGludCAtIHRoaXMgcGFyYW1ldGVyIGRldGVybWluZXMgdGhlIHR5cGUgb2Ygc2VsZWN0aW9uIHVzZWQuXHJcbkBwYXJhbSBjYXJzQXJyIEFycmF5IC0gdGhpcyBwYXJhbWV0ZXIgaXMgdGhlIHBvcHVsYXRpb24gd2hpY2ggdGhlIHNlbGVjdGlvbiBmdW5jdGlvbnMgYXJlIHVzZWQgb24uXHJcbkBwYXJhbSB1c2VTdWJTZXQgYm9vbGVhbiAtIHRydWUgaWYgeW91IHdhbnQgdG91cm5hbWVudFNlbGVjdGlvbiB0byB1c2Ugc3ViIHNldHMgbm90IHRoZSBnbG9iYWwgcG9wdWxhdGlvblxyXG5AcmV0dXJuIE9iamVjdEFycmF5IC0gdGhlIHBhcmVudHMgYXJyYXkgb2YgdHdvIGlzIHJldHVybmVkIGZyb20gZWl0aGVyIHRvdXJuYW1lbnQgb3Igcm91bGxldGUgd2hlZWwgc2VsZWN0aW9uKi9cclxuZnVuY3Rpb24gcnVuU2VsZWN0aW9uKGNhcnNBcnIsIHNlbGVjdFR5cGUsIHN0cm9uZ2VzdCwgdXNlU3ViU2V0LCB1bmlmb3JtKXtcclxuXHRpZihzZWxlY3RUeXBlPT09MSl7XHJcblx0XHRyZXR1cm4gcm91bGV0ZVdoZWVsU2VsKGNhcnNBcnIsIGZhbHNlKTtcclxuXHR9IFxyXG5cdGVsc2UgaWYoc2VsZWN0VHlwZT09PTIpe1xyXG5cdFx0cmV0dXJuIHRvdXJuYW1lbnRTZWxlY3Rpb24oY2Fyc0FycixzdHJvbmdlc3QsNywgdXNlU3ViU2V0KTtcclxuXHR9XHJcbn1cclxuXHJcbi8qVGhpcyBmdW5jdGlvbiB1c2VzIGZpbmVzcyBwcm9wb3J0aW9uYXRlIHNlbGVjdGlvbiB3aGVyZSBhIHByb3BvcnRpb24gb2YgdGhlIHdoZWVsIGlzIGdpdmVuIHRvIGEgY2FyIGJhc2VkIG9uIGZpdG5lc3NcclxuQHBhcmFtIGNhcnNBcnIgT2JqZWN0QXJyYXkgLSBUaGUgYXJyYXkgb2YgY2FycyB3aGVyZSB0aGUgcGFyZW50cyBhcmUgY2hvc2VuIGZyb21cclxuQHBhcmFtIHVuaWZvcm0gYm9vbGVhbiAtIHdoZXRoZXIgdGhlIHNlbGVjdGlvbiBzaG91bGQgYmUgdW5pZm9ybVxyXG5AcmV0dXJuIGNhciBPYmplY3QgLSBBIGNhciBvYmplY3QgaXMgcmV0dXJuZWQgYWZ0ZXIgc2VsZWN0aW9uKi9cclxuZnVuY3Rpb24gcm91bGV0ZVdoZWVsU2VsKGNhcnNBcnIsIHVuaWZvcm0pe1xyXG5cdGlmKHVuaWZvcm0gPT09ZmFsc2Upe1xyXG5cdFx0dmFyIHN1bUNhclNjb3JlID0gMDtcclxuXHRcdGZvcih2YXIgaSA9MDtpPGNhcnNBcnIubGVuZ3RoO2krKyl7XHJcblx0XHRcdHN1bUNhclNjb3JlICs9IGNhcnNBcnJbaV0uc2NvcmUucztcclxuXHRcdH1cclxuXHRcdC8qY29uc29sZS5sb2coXCJzZWxlY3Rpb24gZGF0YSAtXCIpO1xyXG5cdFx0Y29uc29sZS5sb2coY2Fyc0Fyci5sZW5ndGgpO1xyXG5cdFx0Y29uc29sZS5sb2coc3VtQ2FyU2NvcmUpOy8vdGVzdCBub1xyXG5cdFx0Ki9cclxuXHRcdHZhciBubyA9IE1hdGgucmFuZG9tKCkgKiBzdW1DYXJTY29yZTtcclxuXHRcdGlmKHN1bUNhclNjb3JlIT0wKXtcclxuXHRcdFx0Zm9yKHZhciB4ID0wO3g8Y2Fyc0Fyci5sZW5ndGg7eCsrKXtcclxuXHRcdFx0XHRubyAtPSBjYXJzQXJyW3hdLnNjb3JlLnM7XHJcblx0XHRcdFx0aWYobm88MCl7XHJcblx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKGNhcnNBcnJbeF0pOy8vcmV0dXJuZWQgY2FyXHJcblx0XHRcdFx0XHRyZXR1cm4gY2Fyc0Fyclt4XTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHRcdGVsc2V7XHJcblx0XHRcdHJldHVybiBjYXJzQXJyWzBdO1xyXG5cdFx0fVxyXG5cdH0gZWxzZSB7XHJcblx0XHR2YXIgcmFuZE5vID0gZ2V0UmFuZG9tSW50KDAsIGNhcnNBcnIubGVuZ3RoLTEsW10pO1xyXG5cdFx0cmV0dXJuIGNhcnNBcnJbcmFuZE5vXTtcclxuXHR9XHJcbn1cclxuXHJcbi8qVGhpcyBmdW5jdGlvbiB1c2VzIHRvdXJuYW1lbnRTZWxlY3Rpb24gd2hlcmUgYSBhcnJheSBpcyBzb3J0ZWQgYW5kIHRoZSBzdHJvbmdlc3Qgb3Igd2Vha2VzdCBpcyByZXR1cm5lZFxyXG5AcGFyYW0gY2Fyc0FyciBPYmplY3RBcnJheSAtIFRoZSBhcnJheSBvZiBjYXJzIHdoZXJlIHRoZSBwYXJlbnRzIGFyZSBjaG9zZW4gZnJvbVxyXG5AcGFyYW0gc3Ryb25nZXN0IEJvb2xlYW4gLSBpZiB0cnVlIHRoZSBzdHJvbmdlc3QgY2FyIGlzIGNob3NlbiwgZWxzZSBpZiBmYWxzZSB0aGUgd2Vha2VzdCBpcyByZXR1cm5lZCBcclxuQHBhcmFtIHN1YlNldFJhbmdlIGludCAtIEhvdyBiaWcgdGhlIHN1YlNldCBvZiB0aGUgZ2xvYmFsIGFycmF5IHNob3VsZCBiZVxyXG5AcGFyYW0gdXNlU3ViU2V0IGJvb2xlYW4gLSB0cnVlIGlmIHlvdSB3YW50IHRvIHVzZSBzdWIgc2V0IG9mIHJhbmRvbWx5IGNob3NlbiBvYmplY3RzIGZyb20gdGhlIGdsb2JhbCwgb3IgZmFsc2UgdG8ganVzdCB1c2UgdGhlIGdsb2JhbFxyXG5AcmV0dXJuIGNhciBPYmplY3QgLSBBIGNhciBvYmplY3QgaXMgcmV0dXJuZWQgYWZ0ZXIgc2VsZWN0aW9uKi9cclxuZnVuY3Rpb24gdG91cm5hbWVudFNlbGVjdGlvbihjYXJzQXJyLCBzdHJvbmdlc3QsIHN1YlNldFJhbmdlLCB1c2VTdWJTZXQpe1xyXG5cdHZhciBzdWJTZXQgPSBbXTtcclxuXHRpZih1c2VTdWJTZXQ9PT10cnVlKXtcclxuXHR2YXIgY2hvc2VuSW50cyA9IFtdO1xyXG5cdGZvcih2YXIgaSA9MDtpPHN1YlNldFJhbmdlO2krKyl7XHJcblx0XHR2YXIgY2hvc2VuTm8gPSBnZXRSYW5kb21JbnQoMCxjYXJzQXJyLmxlbmd0aC0xLGNob3NlbkludHMpO1xyXG5cdFx0Y2hvc2VuSW50cy5wdXNoKGNob3Nlbk5vKTtcclxuXHRcdHN1YlNldC5wdXNoKGNhcnNBcnJbY2hvc2VuTm9dKTtcclxuXHR9XHJcblx0fVxyXG5cdCh1c2VTdWJTZXQ9PT10cnVlKT9zdWJTZXQ6Y2Fyc0Fyci5zb3J0KGZ1bmN0aW9uKGEsYil7cmV0dXJuIChzdHJvbmdlc3Q9PT10cnVlKT9iLnNjb3JlLnMgLSBhLnNjb3JlLnM6YS5zY29yZS5zIC0gYS5zY29yZS5iO30pO1xyXG5cdHJldHVybiAodXNlU3ViU2V0PT09dHJ1ZSk/c3ViU2V0WzBdOmNhcnNBcnJbMF07XHJcbn1cclxuXHJcbi8qVGhpcyBmdW5jdGlvbiByZXR1cm5zIHdob2xlIGludHMgYmV0d2VlbiBhIG1pbmltdW0gYW5kIG1heGltdW1cclxuQHBhcmFtIG1pbiBpbnQgLSBUaGUgbWluaW11bSBpbnQgdGhhdCBjYW4gYmUgcmV0dXJuZWRcclxuQHBhcmFtIG1heCBpbnQgLSBUaGUgbWF4aW11bSBpbnQgdGhhdCBjYW4gYmUgcmV0dXJuZWRcclxuQHBhcmFtIG5vdEVxdWFsc0FyciBpbnRBcnJheSAtIEFuIGFycmF5IG9mIHRoZSBpbnRzIHRoYXQgdGhlIGZ1bmN0aW9uIHNob3VsZCBub3QgcmV0dXJuXHJcbkByZXR1cm4gaW50IC0gVGhlIGludCB3aXRoaW4gdGhlIHNwZWNpZmllZCBwYXJhbWV0ZXIgYm91bmRzIGlzIHJldHVybmVkLiovXHJcbmZ1bmN0aW9uIGdldFJhbmRvbUludChtaW4sIG1heCwgbm90RXF1YWxzQXJyKSB7XHJcblx0dmFyIHRvUmV0dXJuO1xyXG5cdHZhciBydW5Mb29wID0gdHJ1ZTtcclxuXHR3aGlsZShydW5Mb29wPT09dHJ1ZSl7XHJcblx0XHRtaW4gPSBNYXRoLmNlaWwobWluKTtcclxuXHRcdG1heCA9IE1hdGguZmxvb3IobWF4KTtcclxuXHRcdHRvUmV0dXJuID0gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogKG1heCAtIG1pbiArIDEpKSArIG1pbjtcclxuXHRcdGlmKHR5cGVvZiBmaW5kSWZFeGlzdHMgPT09IFwidW5kZWZpbmVkXCIpe1xyXG5cdFx0XHRydW5Mb29wPWZhbHNlO1xyXG5cdFx0fVxyXG5cdFx0ZWxzZSBpZihub3RFcXVhbHNBcnIuZmluZChmdW5jdGlvbih2YWx1ZSl7cmV0dXJuIHZhbHVlPT09dG9SZXR1cm47fSk9PT1mYWxzZSl7XHJcblx0XHRcdHJ1bkxvb3A9ZmFsc2U7XHJcblx0XHR9XHJcblx0fVxyXG4gICAgcmV0dXJuIHRvUmV0dXJuOy8vKHR5cGVvZiBmaW5kSWZFeGlzdHMgPT09IFwidW5kZWZpbmVkXCIpP3RvUmV0dXJuOmdldFJhbmRvbUludChtaW4sIG1heCwgbm90RXF1YWxzQXJyKTtcclxufVxyXG5cclxuIiwiXHJcblxyXG5jb25zdCByYW5kb20gPSB7XHJcbiAgc2h1ZmZsZUludGVnZXJzKHByb3AsIGdlbmVyYXRvcil7XHJcbiAgICByZXR1cm4gcmFuZG9tLm1hcFRvU2h1ZmZsZShwcm9wLCByYW5kb20uY3JlYXRlTm9ybWFscyh7XHJcbiAgICAgIGxlbmd0aDogcHJvcC5sZW5ndGggfHwgMTAsXHJcbiAgICAgIGluY2x1c2l2ZTogdHJ1ZSxcclxuICAgIH0sIGdlbmVyYXRvcikpO1xyXG4gIH0sXHJcbiAgY3JlYXRlSW50ZWdlcnMocHJvcCwgZ2VuZXJhdG9yKXtcclxuICAgIHJldHVybiByYW5kb20ubWFwVG9JbnRlZ2VyKHByb3AsIHJhbmRvbS5jcmVhdGVOb3JtYWxzKHtcclxuICAgICAgbGVuZ3RoOiBwcm9wLmxlbmd0aCxcclxuICAgICAgaW5jbHVzaXZlOiB0cnVlLFxyXG4gICAgfSwgZ2VuZXJhdG9yKSk7XHJcbiAgfSxcclxuICBjcmVhdGVGbG9hdHMocHJvcCwgZ2VuZXJhdG9yKXtcclxuICAgIHJldHVybiByYW5kb20ubWFwVG9GbG9hdChwcm9wLCByYW5kb20uY3JlYXRlTm9ybWFscyh7XHJcbiAgICAgIGxlbmd0aDogcHJvcC5sZW5ndGgsXHJcbiAgICAgIGluY2x1c2l2ZTogdHJ1ZSxcclxuICAgIH0sIGdlbmVyYXRvcikpO1xyXG4gIH0sXHJcbiAgY3JlYXRlTm9ybWFscyhwcm9wLCBnZW5lcmF0b3Ipe1xyXG4gICAgdmFyIGwgPSBwcm9wLmxlbmd0aDtcclxuICAgIHZhciB2YWx1ZXMgPSBbXTtcclxuICAgIGZvcih2YXIgaSA9IDA7IGkgPCBsOyBpKyspe1xyXG4gICAgICB2YWx1ZXMucHVzaChcclxuICAgICAgICBjcmVhdGVOb3JtYWwocHJvcCwgZ2VuZXJhdG9yKVxyXG4gICAgICApO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIHZhbHVlcztcclxuICB9LFxyXG4gIG11dGF0ZVNodWZmbGUoXHJcbiAgICBwcm9wLCBnZW5lcmF0b3IsIG9yaWdpbmFsVmFsdWVzLCBtdXRhdGlvbl9yYW5nZSwgY2hhbmNlVG9NdXRhdGVcclxuICApe1xyXG4gICAgcmV0dXJuIHJhbmRvbS5tYXBUb1NodWZmbGUocHJvcCwgcmFuZG9tLm11dGF0ZU5vcm1hbHMoXHJcbiAgICAgIHByb3AsIGdlbmVyYXRvciwgb3JpZ2luYWxWYWx1ZXMsIG11dGF0aW9uX3JhbmdlLCBjaGFuY2VUb011dGF0ZVxyXG4gICAgKSk7XHJcbiAgfSxcclxuICBtdXRhdGVJbnRlZ2Vycyhwcm9wLCBnZW5lcmF0b3IsIG9yaWdpbmFsVmFsdWVzLCBtdXRhdGlvbl9yYW5nZSwgY2hhbmNlVG9NdXRhdGUpe1xyXG4gICAgcmV0dXJuIHJhbmRvbS5tYXBUb0ludGVnZXIocHJvcCwgcmFuZG9tLm11dGF0ZU5vcm1hbHMoXHJcbiAgICAgIHByb3AsIGdlbmVyYXRvciwgb3JpZ2luYWxWYWx1ZXMsIG11dGF0aW9uX3JhbmdlLCBjaGFuY2VUb011dGF0ZVxyXG4gICAgKSk7XHJcbiAgfSxcclxuICBtdXRhdGVGbG9hdHMocHJvcCwgZ2VuZXJhdG9yLCBvcmlnaW5hbFZhbHVlcywgbXV0YXRpb25fcmFuZ2UsIGNoYW5jZVRvTXV0YXRlKXtcclxuICAgIHJldHVybiByYW5kb20ubWFwVG9GbG9hdChwcm9wLCByYW5kb20ubXV0YXRlTm9ybWFscyhcclxuICAgICAgcHJvcCwgZ2VuZXJhdG9yLCBvcmlnaW5hbFZhbHVlcywgbXV0YXRpb25fcmFuZ2UsIGNoYW5jZVRvTXV0YXRlXHJcbiAgICApKTtcclxuICB9LFxyXG4gIG1hcFRvU2h1ZmZsZShwcm9wLCBub3JtYWxzKXtcclxuICAgIHZhciBvZmZzZXQgPSBwcm9wLm9mZnNldCB8fCAwO1xyXG4gICAgdmFyIGxpbWl0ID0gcHJvcC5saW1pdCB8fCBwcm9wLmxlbmd0aDtcclxuICAgIHZhciBzb3J0ZWQgPSBub3JtYWxzLnNsaWNlKCkuc29ydChmdW5jdGlvbihhLCBiKXtcclxuICAgICAgcmV0dXJuIGEgLSBiO1xyXG4gICAgfSk7XHJcbiAgICByZXR1cm4gbm9ybWFscy5tYXAoZnVuY3Rpb24odmFsKXtcclxuICAgICAgcmV0dXJuIHNvcnRlZC5pbmRleE9mKHZhbCk7XHJcbiAgICB9KS5tYXAoZnVuY3Rpb24oaSl7XHJcbiAgICAgIHJldHVybiBpICsgb2Zmc2V0O1xyXG4gICAgfSkuc2xpY2UoMCwgbGltaXQpO1xyXG4gIH0sXHJcbiAgbWFwVG9JbnRlZ2VyKHByb3AsIG5vcm1hbHMpe1xyXG4gICAgcHJvcCA9IHtcclxuICAgICAgbWluOiBwcm9wLm1pbiB8fCAwLFxyXG4gICAgICByYW5nZTogcHJvcC5yYW5nZSB8fCAxMCxcclxuICAgICAgbGVuZ3RoOiBwcm9wLmxlbmd0aFxyXG4gICAgfVxyXG4gICAgcmV0dXJuIHJhbmRvbS5tYXBUb0Zsb2F0KHByb3AsIG5vcm1hbHMpLm1hcChmdW5jdGlvbihmbG9hdCl7XHJcbiAgICAgIHJldHVybiBNYXRoLnJvdW5kKGZsb2F0KTtcclxuICAgIH0pO1xyXG4gIH0sXHJcbiAgbWFwVG9GbG9hdChwcm9wLCBub3JtYWxzKXtcclxuICAgIHByb3AgPSB7XHJcbiAgICAgIG1pbjogcHJvcC5taW4gfHwgMCxcclxuICAgICAgcmFuZ2U6IHByb3AucmFuZ2UgfHwgMVxyXG4gICAgfVxyXG4gICAgcmV0dXJuIG5vcm1hbHMubWFwKGZ1bmN0aW9uKG5vcm1hbCl7XHJcbiAgICAgIHZhciBtaW4gPSBwcm9wLm1pbjtcclxuICAgICAgdmFyIHJhbmdlID0gcHJvcC5yYW5nZTtcclxuICAgICAgcmV0dXJuIG1pbiArIG5vcm1hbCAqIHJhbmdlXHJcbiAgICB9KVxyXG4gIH0sXHJcbiAgbXV0YXRlTm9ybWFscyhwcm9wLCBnZW5lcmF0b3IsIG9yaWdpbmFsVmFsdWVzLCBtdXRhdGlvbl9yYW5nZSwgY2hhbmNlVG9NdXRhdGUpe1xyXG4gICAgdmFyIGZhY3RvciA9IChwcm9wLmZhY3RvciB8fCAxKSAqIG11dGF0aW9uX3JhbmdlXHJcbiAgICByZXR1cm4gb3JpZ2luYWxWYWx1ZXMubWFwKGZ1bmN0aW9uKG9yaWdpbmFsVmFsdWUpe1xyXG4gICAgICBpZihnZW5lcmF0b3IoKSA+IGNoYW5jZVRvTXV0YXRlKXtcclxuICAgICAgICByZXR1cm4gb3JpZ2luYWxWYWx1ZTtcclxuICAgICAgfVxyXG4gICAgICByZXR1cm4gbXV0YXRlTm9ybWFsKFxyXG4gICAgICAgIHByb3AsIGdlbmVyYXRvciwgb3JpZ2luYWxWYWx1ZSwgZmFjdG9yXHJcbiAgICAgICk7XHJcbiAgICB9KTtcclxuICB9XHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IHJhbmRvbTtcclxuXHJcbmZ1bmN0aW9uIG11dGF0ZU5vcm1hbChwcm9wLCBnZW5lcmF0b3IsIG9yaWdpbmFsVmFsdWUsIG11dGF0aW9uX3JhbmdlKXtcclxuICBpZihtdXRhdGlvbl9yYW5nZSA+IDEpe1xyXG4gICAgdGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IG11dGF0ZSBiZXlvbmQgYm91bmRzXCIpO1xyXG4gIH1cclxuICB2YXIgbmV3TWluID0gb3JpZ2luYWxWYWx1ZSAtIDAuNTtcclxuICBpZiAobmV3TWluIDwgMCkgbmV3TWluID0gMDtcclxuICBpZiAobmV3TWluICsgbXV0YXRpb25fcmFuZ2UgID4gMSlcclxuICAgIG5ld01pbiA9IDEgLSBtdXRhdGlvbl9yYW5nZTtcclxuICB2YXIgcmFuZ2VWYWx1ZSA9IGNyZWF0ZU5vcm1hbCh7XHJcbiAgICBpbmNsdXNpdmU6IHRydWUsXHJcbiAgfSwgZ2VuZXJhdG9yKTtcclxuICByZXR1cm4gbmV3TWluICsgcmFuZ2VWYWx1ZSAqIG11dGF0aW9uX3JhbmdlO1xyXG59XHJcblxyXG5mdW5jdGlvbiBjcmVhdGVOb3JtYWwocHJvcCwgZ2VuZXJhdG9yKXtcclxuICBpZighcHJvcC5pbmNsdXNpdmUpe1xyXG4gICAgcmV0dXJuIGdlbmVyYXRvcigpO1xyXG4gIH0gZWxzZSB7XHJcbiAgICByZXR1cm4gZ2VuZXJhdG9yKCkgPCAwLjUgP1xyXG4gICAgZ2VuZXJhdG9yKCkgOlxyXG4gICAgMSAtIGdlbmVyYXRvcigpO1xyXG4gIH1cclxufVxyXG4iLCIvKiBnbG9iYWxzIGJ0b2EgKi9cclxudmFyIHNldHVwU2NlbmUgPSByZXF1aXJlKFwiLi9zZXR1cC1zY2VuZVwiKTtcclxudmFyIGNhclJ1biA9IHJlcXVpcmUoXCIuLi9jYXItc2NoZW1hL3J1blwiKTtcclxudmFyIGRlZlRvQ2FyID0gcmVxdWlyZShcIi4uL2Nhci1zY2hlbWEvZGVmLXRvLWNhclwiKTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gcnVuRGVmcztcclxuZnVuY3Rpb24gcnVuRGVmcyh3b3JsZF9kZWYsIGRlZnMsIGxpc3RlbmVycykge1xyXG4gIGlmICh3b3JsZF9kZWYubXV0YWJsZV9mbG9vcikge1xyXG4gICAgLy8gR0hPU1QgRElTQUJMRURcclxuICAgIHdvcmxkX2RlZi5mbG9vcnNlZWQgPSBidG9hKE1hdGguc2VlZHJhbmRvbSgpKTtcclxuICB9XHJcblxyXG4gIHZhciBzY2VuZSA9IHNldHVwU2NlbmUod29ybGRfZGVmKTtcclxuICBzY2VuZS53b3JsZC5TdGVwKDEgLyB3b3JsZF9kZWYuYm94MmRmcHMsIDIwLCAyMCk7XHJcbiAgY29uc29sZS5sb2coXCJhYm91dCB0byBidWlsZCBjYXJzXCIpO1xyXG4gIHZhciBjYXJzID0gZGVmcy5tYXAoKGRlZiwgaSkgPT4ge1xyXG4gICAgcmV0dXJuIHtcclxuICAgICAgaW5kZXg6IGksXHJcbiAgICAgIGRlZjogZGVmLFxyXG4gICAgICBjYXI6IGRlZlRvQ2FyKGRlZiwgc2NlbmUud29ybGQsIHdvcmxkX2RlZiksXHJcbiAgICAgIHN0YXRlOiBjYXJSdW4uZ2V0SW5pdGlhbFN0YXRlKHdvcmxkX2RlZilcclxuICAgIH07XHJcbiAgfSk7XHJcbiAgdmFyIGFsaXZlY2FycyA9IGNhcnM7XHJcbiAgcmV0dXJuIHtcclxuICAgIHNjZW5lOiBzY2VuZSxcclxuICAgIGNhcnM6IGNhcnMsXHJcbiAgICBzdGVwOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgIGlmIChhbGl2ZWNhcnMubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwibm8gbW9yZSBjYXJzXCIpO1xyXG4gICAgICB9XHJcbiAgICAgIHNjZW5lLndvcmxkLlN0ZXAoMSAvIHdvcmxkX2RlZi5ib3gyZGZwcywgMjAsIDIwKTtcclxuICAgICAgbGlzdGVuZXJzLnByZUNhclN0ZXAoKTtcclxuICAgICAgYWxpdmVjYXJzID0gYWxpdmVjYXJzLmZpbHRlcihmdW5jdGlvbiAoY2FyKSB7XHJcbiAgICAgICAgY2FyLnN0YXRlID0gY2FyUnVuLnVwZGF0ZVN0YXRlKFxyXG4gICAgICAgICAgd29ybGRfZGVmLCBjYXIuY2FyLCBjYXIuc3RhdGVcclxuICAgICAgICApO1xyXG4gICAgICAgIHZhciBzdGF0dXMgPSBjYXJSdW4uZ2V0U3RhdHVzKGNhci5zdGF0ZSwgd29ybGRfZGVmKTtcclxuICAgICAgICBsaXN0ZW5lcnMuY2FyU3RlcChjYXIpO1xyXG4gICAgICAgIGlmIChzdGF0dXMgPT09IDApIHtcclxuICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgIH1cclxuICAgICAgICBjYXIuc2NvcmUgPSBjYXJSdW4uY2FsY3VsYXRlU2NvcmUoY2FyLnN0YXRlLCB3b3JsZF9kZWYpO1xyXG4gICAgICAgIGxpc3RlbmVycy5jYXJEZWF0aChjYXIpO1xyXG5cclxuICAgICAgICB2YXIgd29ybGQgPSBzY2VuZS53b3JsZDtcclxuICAgICAgICB2YXIgd29ybGRDYXIgPSBjYXIuY2FyO1xyXG4gICAgICAgIHdvcmxkLkRlc3Ryb3lCb2R5KHdvcmxkQ2FyLmNoYXNzaXMpO1xyXG5cclxuICAgICAgICBmb3IgKHZhciB3ID0gMDsgdyA8IHdvcmxkQ2FyLndoZWVscy5sZW5ndGg7IHcrKykge1xyXG4gICAgICAgICAgd29ybGQuRGVzdHJveUJvZHkod29ybGRDYXIud2hlZWxzW3ddKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgfSlcclxuICAgICAgaWYgKGFsaXZlY2Fycy5sZW5ndGggPT09IDApIHtcclxuICAgICAgICBsaXN0ZW5lcnMuZ2VuZXJhdGlvbkVuZChjYXJzKTtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH1cclxuXHJcbn1cclxuIiwiLyogZ2xvYmFscyBiMldvcmxkIGIyVmVjMiBiMkJvZHlEZWYgYjJGaXh0dXJlRGVmIGIyUG9seWdvblNoYXBlICovXHJcblxyXG4vKlxyXG5cclxud29ybGRfZGVmID0ge1xyXG4gIGdyYXZpdHk6IHt4LCB5fSxcclxuICBkb1NsZWVwOiBib29sZWFuLFxyXG4gIGZsb29yc2VlZDogc3RyaW5nLFxyXG4gIHRpbGVEaW1lbnNpb25zLFxyXG4gIG1heEZsb29yVGlsZXMsXHJcbiAgbXV0YWJsZV9mbG9vcjogYm9vbGVhblxyXG59XHJcblxyXG4qL1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbih3b3JsZF9kZWYpe1xyXG5cclxuICB2YXIgd29ybGQgPSBuZXcgYjJXb3JsZCh3b3JsZF9kZWYuZ3Jhdml0eSwgd29ybGRfZGVmLmRvU2xlZXApO1xyXG4gIHZhciBmbG9vclRpbGVzID0gY3dfY3JlYXRlRmxvb3IoXHJcbiAgICB3b3JsZCxcclxuICAgIHdvcmxkX2RlZi5mbG9vcnNlZWQsXHJcbiAgICB3b3JsZF9kZWYudGlsZURpbWVuc2lvbnMsXHJcbiAgICB3b3JsZF9kZWYubWF4Rmxvb3JUaWxlcyxcclxuICAgIHdvcmxkX2RlZi5tdXRhYmxlX2Zsb29yXHJcbiAgKTtcclxuXHJcbiAgdmFyIGxhc3RfdGlsZSA9IGZsb29yVGlsZXNbXHJcbiAgICBmbG9vclRpbGVzLmxlbmd0aCAtIDFcclxuICBdO1xyXG4gIHZhciBsYXN0X2ZpeHR1cmUgPSBsYXN0X3RpbGUuR2V0Rml4dHVyZUxpc3QoKTtcclxuICB2YXIgdGlsZV9wb3NpdGlvbiA9IGxhc3RfdGlsZS5HZXRXb3JsZFBvaW50KFxyXG4gICAgbGFzdF9maXh0dXJlLkdldFNoYXBlKCkubV92ZXJ0aWNlc1szXVxyXG4gICk7XHJcbiAgd29ybGQuZmluaXNoTGluZSA9IHRpbGVfcG9zaXRpb24ueDtcclxuICByZXR1cm4ge1xyXG4gICAgd29ybGQ6IHdvcmxkLFxyXG4gICAgZmxvb3JUaWxlczogZmxvb3JUaWxlcyxcclxuICAgIGZpbmlzaExpbmU6IHRpbGVfcG9zaXRpb24ueFxyXG4gIH07XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGN3X2NyZWF0ZUZsb29yKHdvcmxkLCBmbG9vcnNlZWQsIGRpbWVuc2lvbnMsIG1heEZsb29yVGlsZXMsIG11dGFibGVfZmxvb3IpIHtcclxuICB2YXIgbGFzdF90aWxlID0gbnVsbDtcclxuICB2YXIgdGlsZV9wb3NpdGlvbiA9IG5ldyBiMlZlYzIoLTUsIDApO1xyXG4gIHZhciBjd19mbG9vclRpbGVzID0gW107XHJcbiAgTWF0aC5zZWVkcmFuZG9tKGZsb29yc2VlZCk7XHJcbiAgZm9yICh2YXIgayA9IDA7IGsgPCBtYXhGbG9vclRpbGVzOyBrKyspIHtcclxuICAgIGlmICghbXV0YWJsZV9mbG9vcikge1xyXG4gICAgICAvLyBrZWVwIG9sZCBpbXBvc3NpYmxlIHRyYWNrcyBpZiBub3QgdXNpbmcgbXV0YWJsZSBmbG9vcnNcclxuICAgICAgbGFzdF90aWxlID0gY3dfY3JlYXRlRmxvb3JUaWxlKFxyXG4gICAgICAgIHdvcmxkLCBkaW1lbnNpb25zLCB0aWxlX3Bvc2l0aW9uLCAoTWF0aC5yYW5kb20oKSAqIDMgLSAxLjUpICogMS41ICogayAvIG1heEZsb29yVGlsZXNcclxuICAgICAgKTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIC8vIGlmIHBhdGggaXMgbXV0YWJsZSBvdmVyIHJhY2VzLCBjcmVhdGUgc21vb3RoZXIgdHJhY2tzXHJcbiAgICAgIGxhc3RfdGlsZSA9IGN3X2NyZWF0ZUZsb29yVGlsZShcclxuICAgICAgICB3b3JsZCwgZGltZW5zaW9ucywgdGlsZV9wb3NpdGlvbiwgKE1hdGgucmFuZG9tKCkgKiAzIC0gMS41KSAqIDEuMiAqIGsgLyBtYXhGbG9vclRpbGVzXHJcbiAgICAgICk7XHJcbiAgICB9XHJcbiAgICBjd19mbG9vclRpbGVzLnB1c2gobGFzdF90aWxlKTtcclxuICAgIHZhciBsYXN0X2ZpeHR1cmUgPSBsYXN0X3RpbGUuR2V0Rml4dHVyZUxpc3QoKTtcclxuICAgIHRpbGVfcG9zaXRpb24gPSBsYXN0X3RpbGUuR2V0V29ybGRQb2ludChsYXN0X2ZpeHR1cmUuR2V0U2hhcGUoKS5tX3ZlcnRpY2VzWzNdKTtcclxuICB9XHJcbiAgcmV0dXJuIGN3X2Zsb29yVGlsZXM7XHJcbn1cclxuXHJcblxyXG5mdW5jdGlvbiBjd19jcmVhdGVGbG9vclRpbGUod29ybGQsIGRpbSwgcG9zaXRpb24sIGFuZ2xlKSB7XHJcbiAgdmFyIGJvZHlfZGVmID0gbmV3IGIyQm9keURlZigpO1xyXG5cclxuICBib2R5X2RlZi5wb3NpdGlvbi5TZXQocG9zaXRpb24ueCwgcG9zaXRpb24ueSk7XHJcbiAgdmFyIGJvZHkgPSB3b3JsZC5DcmVhdGVCb2R5KGJvZHlfZGVmKTtcclxuICB2YXIgZml4X2RlZiA9IG5ldyBiMkZpeHR1cmVEZWYoKTtcclxuICBmaXhfZGVmLnNoYXBlID0gbmV3IGIyUG9seWdvblNoYXBlKCk7XHJcbiAgZml4X2RlZi5mcmljdGlvbiA9IDAuNTtcclxuXHJcbiAgdmFyIGNvb3JkcyA9IG5ldyBBcnJheSgpO1xyXG4gIGNvb3Jkcy5wdXNoKG5ldyBiMlZlYzIoMCwgMCkpO1xyXG4gIGNvb3Jkcy5wdXNoKG5ldyBiMlZlYzIoMCwgLWRpbS55KSk7XHJcbiAgY29vcmRzLnB1c2gobmV3IGIyVmVjMihkaW0ueCwgLWRpbS55KSk7XHJcbiAgY29vcmRzLnB1c2gobmV3IGIyVmVjMihkaW0ueCwgMCkpO1xyXG5cclxuICB2YXIgY2VudGVyID0gbmV3IGIyVmVjMigwLCAwKTtcclxuXHJcbiAgdmFyIG5ld2Nvb3JkcyA9IGN3X3JvdGF0ZUZsb29yVGlsZShjb29yZHMsIGNlbnRlciwgYW5nbGUpO1xyXG5cclxuICBmaXhfZGVmLnNoYXBlLlNldEFzQXJyYXkobmV3Y29vcmRzKTtcclxuXHJcbiAgYm9keS5DcmVhdGVGaXh0dXJlKGZpeF9kZWYpO1xyXG4gIHJldHVybiBib2R5O1xyXG59XHJcblxyXG5mdW5jdGlvbiBjd19yb3RhdGVGbG9vclRpbGUoY29vcmRzLCBjZW50ZXIsIGFuZ2xlKSB7XHJcbiAgcmV0dXJuIGNvb3Jkcy5tYXAoZnVuY3Rpb24oY29vcmQpe1xyXG4gICAgcmV0dXJuIHtcclxuICAgICAgeDogTWF0aC5jb3MoYW5nbGUpICogKGNvb3JkLnggLSBjZW50ZXIueCkgLSBNYXRoLnNpbihhbmdsZSkgKiAoY29vcmQueSAtIGNlbnRlci55KSArIGNlbnRlci54LFxyXG4gICAgICB5OiBNYXRoLnNpbihhbmdsZSkgKiAoY29vcmQueCAtIGNlbnRlci54KSArIE1hdGguY29zKGFuZ2xlKSAqIChjb29yZC55IC0gY2VudGVyLnkpICsgY2VudGVyLnksXHJcbiAgICB9O1xyXG4gIH0pO1xyXG59XHJcbiJdfQ==
