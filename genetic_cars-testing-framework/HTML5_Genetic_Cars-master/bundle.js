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
  generationSize: 20,
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
var testing = true;// job64, boolean if the program is used to output test data to local storage.


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
  if(testing===false){
	loops = 0;
	while (!cw_paused && (new Date).getTime() > nextGameTick && loops < maxFrameSkip) {   
		nextGameTick += skipTicks;
		loops++;
	}
	simulationStep();
	cw_drawScreen();
  }else{
	fastForward();//used for testing data
  }
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
  generationState =manageRound.nextGeneration(generationState, results, generationConfig());
	
	if((generationState.counter===0) && (testing===true)){
		var rounds = localStorage.getItem("round");
		var newRounds = generationState.round+rounds;
		localStorage.setItem("EA-A-"+newRounds, JSON.stringify(graphState.cw_graphAverage));
		localStorage.setItem("EA-T-"+newRounds, JSON.stringify(graphState.cw_graphTop));
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
function selectParents(parents, scores, increaseMate, selectionTypeOne, selectionTypeTwo){
	var parent1 = selection.runSelection(scores,(increaseMate===false)?selectionTypeOne:2);
	parents.push(parent1.def);
	if(increaseMate===false){
		scores.splice(scores.findIndex(x=> x.def.id===parents[0].id),1);
	}
	var parent2 = selection.runSelection(scores,(increaseMate===false)?selectionTypeTwo:2);
	parents.push(parent2.def);
	scores.splice(scores.findIndex(x=> x.def.id===parents[1].id),1);
	return (parent1.score.s + parent2.score.s)/2;
}

/*This function runs a Evolutionary algorithm which uses Selection, Crossover and mutations to create the new populations of cars.
@param scores ObjectArray - An array which holds the car objects and there performance scores
@param config - This is the generationConfig file passed through which gives the cars template/blueprint for creation
@param noCarsCreated int - The number of cars there currently exist used for creating the id of new cars
@return newGeneration ObjectArray - is returned with all the newly created cars that will be in the simulation*/
function runEA(scores, config, noCarsCreated, noElites, crossoverType, noMateIncrease, selectionTypeOne, selectionTypeTwo, mutationType){
	scores.sort(function(a, b){return b.score.s - a.score.s;});
	var generationSize=scores.length;
	var newGeneration = new Array();
	var randomMateIncrease = getRandomInt(0,maxNoMatesIncreases, new Array());
	var maxNoMatesIncreases = noMateIncrease;
	var currentNoMateIncreases = 0;
	var noElites=noElites;
	for(var i=0;i<noElites;i++){//add new elites to newGeneration
		var newElite = scores[0].def;
		newElite.elite = true;
		newGeneration.push(newElite);
	}
	for(var k = 0;k<generationSize/2;k++){
		if(newGeneration.length!==generationSize){
		var pickedParents = [];
		var parentsScore = selectParents(pickedParents, scores, ((k===randomMateIncrease)&&(currentNoMateIncreases<maxNoMatesIncreases))?true:false, selectionTypeOne, selectionTypeTwo); 
		if(currentNoMateIncreases<maxNoMatesIncreases){currentNoMateIncreases++;}
			var newCars = crossover.runCrossover(pickedParents, crossoverType,config.schema, parentsScore, noCarsCreated, (newGeneration.length===generationSize-1)?1:2);
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
				newGeneration[x] = (mutationType===0)?mutation.mutate(newGeneration[x]):mutation.multiMutations(newGeneration[x],newGeneration.findIndex(x=> x.id===currentID),20);
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
	//--------------------------------------------------------- SET EVOLUTIONARY ALGORITHM OPERATORS HERE <---------------
	var noElites = 1;//type the number of elites for the program to use
	var crossoverType=0;//write 1 for one-point crossover anyother for two-point crossover
	var noMateIncrease=0;//The number of cars that can mate twice producing 4 kids not 2
	// selectionType for selection the two parents selectionTypeOne for the first slection, selectionTypeTwo for the second parent
	var selectionTypeOne = 3;// 1 for tournament selection using sub-arrays/ 2 for tournament selection to get weakest car/3 for roulette-selection/ 4 for uniform random selection
	var selectionTypeTwo = 3;// 1 for tournament selection using sub-arrays/ 2 for tournament selection to get weakest car/3 for roulette-selection/ 4 for uniform random selection
	var mutationType =0;//0 for standard 1 mutation type 1 for multi-mutations
	//--------------------------------------------------------------------------------------------------------------------
	var generationSize=scores.length;
	var newGeneration = new Array();
	var count;
	var tempRound=0;
	
		tempRound=(typeof previousState.round ==="undefined")?0:previousState.round;
		count = previousState.counter + 1;
		//var clusterInt = (previousState.counter===0)?cluster.setup(scores,null,false):cluster.setup(scores,previousState.clust,true);
		//cluster.reScoreCars(scores ,clusterInt);
		scores.sort(function(a, b){return a.score.s - b.score.s;});
		var numberOfCars = (previousState.counter===0)?generationSize:previousState.noCars+generationSize;
		var schema = config.schema;//list of car variables i.e "wheel_radius", "chassis_density", "vertex_list", "wheel_vertex"
	
		console.log("Log -- "+previousState.counter);
		//console.log(scoresData);//test data
		var eaType = 1;
		newGeneration = (eaType===1)?runEA(scores, config, numberOfCars, noElites, crossoverType, noMateIncrease, selectionTypeOne, selectionTypeTwo, mutationType):runBaselineEA(scores, config);
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
@param selectType int - this parameter determines the type of selection used - 1 for tournament selection using sub-arrays/ 2 for tournament selection to get weakest car/3 for roulette-selection/ 4 for uniform random selection.
@param carsArr Array - this parameter is the population which the selection functions are used on.
@return ObjectArray - the parents array of two is returned from either tournament or roullete wheel selection*/
function runSelection(carsArr, selectType){
	// SelectType - 1 for tournament selection using sub-arrays/ 2 for tournament selection to get weakest car/3 for roulette-selection/ 4 for uniform random selection
	var strongest = (selectType===1)?true:false;
	var useSubSet = ((selectType===1)||(selectType===2))?true:false;
	var uniform = (selectType===4)?true:false;
	if((selectType===3)||(selectType===4)){
		return rouleteWheelSel(carsArr, uniform);
	} 
	else if((selectType===1)||selectType===2){
		return tournamentSelection(carsArr,strongest,carsArr.length/4, useSubSet);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9saWIvX2VtcHR5LmpzIiwic3JjL2Nhci1zY2hlbWEvY2FyLWNvbnN0YW50cy5qc29uIiwic3JjL2Nhci1zY2hlbWEvY29uc3RydWN0LmpzIiwic3JjL2Nhci1zY2hlbWEvZGVmLXRvLWNhci5qcyIsInNyYy9jYXItc2NoZW1hL3J1bi5qcyIsInNyYy9kcmF3L2RyYXctY2FyLXN0YXRzLmpzIiwic3JjL2RyYXcvZHJhdy1jYXIuanMiLCJzcmMvZHJhdy9kcmF3LWNpcmNsZS5qcyIsInNyYy9kcmF3L2RyYXctZmxvb3IuanMiLCJzcmMvZHJhdy9kcmF3LXZpcnR1YWwtcG9seS5qcyIsInNyYy9kcmF3L3Bsb3QtZ3JhcGhzLmpzIiwic3JjL2RyYXcvc2NhdHRlci1wbG90LmpzIiwic3JjL2dlbmVyYXRpb24tY29uZmlnL2dlbmVyYXRlUmFuZG9tLmpzIiwic3JjL2dlbmVyYXRpb24tY29uZmlnL2luYnJlZWRpbmctY29lZmZpY2llbnQuanMiLCJzcmMvZ2VuZXJhdGlvbi1jb25maWcvaW5kZXguanMiLCJzcmMvZ2VuZXJhdGlvbi1jb25maWcvcGlja1BhcmVudC5qcyIsInNyYy9nZW5lcmF0aW9uLWNvbmZpZy9zZWxlY3RGcm9tQWxsUGFyZW50cy5qcyIsInNyYy9naG9zdC9jYXItdG8tZ2hvc3QuanMiLCJzcmMvZ2hvc3QvaW5kZXguanMiLCJzcmMvaW5kZXguanMiLCJzcmMvbWFjaGluZS1sZWFybmluZy9jcmVhdGUtaW5zdGFuY2UuanMiLCJzcmMvbWFjaGluZS1sZWFybmluZy9nZW5ldGljLWFsZ29yaXRobS9jbHVzdGVyaW5nL2NsdXN0ZXIuanMiLCJzcmMvbWFjaGluZS1sZWFybmluZy9nZW5ldGljLWFsZ29yaXRobS9jbHVzdGVyaW5nL2NsdXN0ZXJTZXR1cC5qcyIsInNyYy9tYWNoaW5lLWxlYXJuaW5nL2dlbmV0aWMtYWxnb3JpdGhtL2Nyb3Nzb3Zlci5qcyIsInNyYy9tYWNoaW5lLWxlYXJuaW5nL2dlbmV0aWMtYWxnb3JpdGhtL2luaXRpYWxDYXJzLmpzb24iLCJzcmMvbWFjaGluZS1sZWFybmluZy9nZW5ldGljLWFsZ29yaXRobS9tYW5hZ2Utcm91bmQuanMiLCJzcmMvbWFjaGluZS1sZWFybmluZy9nZW5ldGljLWFsZ29yaXRobS9tdXRhdGlvbi5qcyIsInNyYy9tYWNoaW5lLWxlYXJuaW5nL2dlbmV0aWMtYWxnb3JpdGhtL3JhbmRvbUludC5qcyIsInNyYy9tYWNoaW5lLWxlYXJuaW5nL2dlbmV0aWMtYWxnb3JpdGhtL3NlbGVjdGlvbi5qcyIsInNyYy9tYWNoaW5lLWxlYXJuaW5nL3JhbmRvbS5qcyIsInNyYy93b3JsZC9ydW4uanMiLCJzcmMvd29ybGQvc2V0dXAtc2NlbmUuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTs7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDWEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNySEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9EQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25DQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDZEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwS0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ0xBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5R0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeHRCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEdBOztBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdk1BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2SEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uKCl7ZnVuY3Rpb24gcihlLG4sdCl7ZnVuY3Rpb24gbyhpLGYpe2lmKCFuW2ldKXtpZighZVtpXSl7dmFyIGM9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZTtpZighZiYmYylyZXR1cm4gYyhpLCEwKTtpZih1KXJldHVybiB1KGksITApO3ZhciBhPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIraStcIidcIik7dGhyb3cgYS5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGF9dmFyIHA9bltpXT17ZXhwb3J0czp7fX07ZVtpXVswXS5jYWxsKHAuZXhwb3J0cyxmdW5jdGlvbihyKXt2YXIgbj1lW2ldWzFdW3JdO3JldHVybiBvKG58fHIpfSxwLHAuZXhwb3J0cyxyLGUsbix0KX1yZXR1cm4gbltpXS5leHBvcnRzfWZvcih2YXIgdT1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlLGk9MDtpPHQubGVuZ3RoO2krKylvKHRbaV0pO3JldHVybiBvfXJldHVybiByfSkoKSIsIiIsIm1vZHVsZS5leHBvcnRzPXtcclxuICBcIndoZWVsQ291bnRcIjogMixcclxuICBcIndoZWVsTWluUmFkaXVzXCI6IDAuMixcclxuICBcIndoZWVsUmFkaXVzUmFuZ2VcIjogMC41LFxyXG4gIFwid2hlZWxNaW5EZW5zaXR5XCI6IDQwLFxyXG4gIFwid2hlZWxEZW5zaXR5UmFuZ2VcIjogMTAwLFxyXG4gIFwiY2hhc3Npc0RlbnNpdHlSYW5nZVwiOiAzMDAsXHJcbiAgXCJjaGFzc2lzTWluRGVuc2l0eVwiOiAzMCxcclxuICBcImNoYXNzaXNNaW5BeGlzXCI6IDAuMSxcclxuICBcImNoYXNzaXNBeGlzUmFuZ2VcIjogMS4xXHJcbn1cclxuIiwidmFyIGNhckNvbnN0YW50cyA9IHJlcXVpcmUoXCIuL2Nhci1jb25zdGFudHMuanNvblwiKTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0ge1xyXG4gIHdvcmxkRGVmOiB3b3JsZERlZixcclxuICBjYXJDb25zdGFudHM6IGdldENhckNvbnN0YW50cyxcclxuICBnZW5lcmF0ZVNjaGVtYTogZ2VuZXJhdGVTY2hlbWFcclxufVxyXG5cclxuZnVuY3Rpb24gd29ybGREZWYoKXtcclxuICB2YXIgYm94MmRmcHMgPSA2MDtcclxuICByZXR1cm4ge1xyXG4gICAgZ3Jhdml0eTogeyB5OiAwIH0sXHJcbiAgICBkb1NsZWVwOiB0cnVlLFxyXG4gICAgZmxvb3JzZWVkOiBcImFiY1wiLFxyXG4gICAgbWF4Rmxvb3JUaWxlczogMjAwLFxyXG4gICAgbXV0YWJsZV9mbG9vcjogZmFsc2UsXHJcbiAgICBtb3RvclNwZWVkOiAyMCxcclxuICAgIGJveDJkZnBzOiBib3gyZGZwcyxcclxuICAgIG1heF9jYXJfaGVhbHRoOiBib3gyZGZwcyAqIDEwLFxyXG4gICAgdGlsZURpbWVuc2lvbnM6IHtcclxuICAgICAgd2lkdGg6IDEuNSxcclxuICAgICAgaGVpZ2h0OiAwLjE1XHJcbiAgICB9XHJcbiAgfTtcclxufVxyXG5cclxuZnVuY3Rpb24gZ2V0Q2FyQ29uc3RhbnRzKCl7XHJcbiAgcmV0dXJuIGNhckNvbnN0YW50cztcclxufVxyXG5cclxuZnVuY3Rpb24gZ2VuZXJhdGVTY2hlbWEodmFsdWVzKXtcclxuICByZXR1cm4ge1xyXG4gICAgd2hlZWxfcmFkaXVzOiB7XHJcbiAgICAgIHR5cGU6IFwiZmxvYXRcIixcclxuICAgICAgbGVuZ3RoOiB2YWx1ZXMud2hlZWxDb3VudCxcclxuICAgICAgbWluOiB2YWx1ZXMud2hlZWxNaW5SYWRpdXMsXHJcbiAgICAgIHJhbmdlOiB2YWx1ZXMud2hlZWxSYWRpdXNSYW5nZSxcclxuICAgICAgZmFjdG9yOiAxLFxyXG4gICAgfSxcclxuICAgIHdoZWVsX2RlbnNpdHk6IHtcclxuICAgICAgdHlwZTogXCJmbG9hdFwiLFxyXG4gICAgICBsZW5ndGg6IHZhbHVlcy53aGVlbENvdW50LFxyXG4gICAgICBtaW46IHZhbHVlcy53aGVlbE1pbkRlbnNpdHksXHJcbiAgICAgIHJhbmdlOiB2YWx1ZXMud2hlZWxEZW5zaXR5UmFuZ2UsXHJcbiAgICAgIGZhY3RvcjogMSxcclxuICAgIH0sXHJcbiAgICBjaGFzc2lzX2RlbnNpdHk6IHtcclxuICAgICAgdHlwZTogXCJmbG9hdFwiLFxyXG4gICAgICBsZW5ndGg6IDEsXHJcbiAgICAgIG1pbjogdmFsdWVzLmNoYXNzaXNEZW5zaXR5UmFuZ2UsXHJcbiAgICAgIHJhbmdlOiB2YWx1ZXMuY2hhc3Npc01pbkRlbnNpdHksXHJcbiAgICAgIGZhY3RvcjogMSxcclxuICAgIH0sXHJcbiAgICB2ZXJ0ZXhfbGlzdDoge1xyXG4gICAgICB0eXBlOiBcImZsb2F0XCIsXHJcbiAgICAgIGxlbmd0aDogMTIsXHJcbiAgICAgIG1pbjogdmFsdWVzLmNoYXNzaXNNaW5BeGlzLFxyXG4gICAgICByYW5nZTogdmFsdWVzLmNoYXNzaXNBeGlzUmFuZ2UsXHJcbiAgICAgIGZhY3RvcjogMSxcclxuICAgIH0sXHJcbiAgICB3aGVlbF92ZXJ0ZXg6IHtcclxuICAgICAgdHlwZTogXCJzaHVmZmxlXCIsXHJcbiAgICAgIGxlbmd0aDogOCxcclxuICAgICAgbGltaXQ6IHZhbHVlcy53aGVlbENvdW50LFxyXG4gICAgICBmYWN0b3I6IDEsXHJcbiAgICB9LFxyXG4gIH07XHJcbn1cclxuIiwiLypcclxuICBnbG9iYWxzIGIyUmV2b2x1dGVKb2ludERlZiBiMlZlYzIgYjJCb2R5RGVmIGIyQm9keSBiMkZpeHR1cmVEZWYgYjJQb2x5Z29uU2hhcGUgYjJDaXJjbGVTaGFwZVxyXG4qL1xyXG5cclxudmFyIGNyZWF0ZUluc3RhbmNlID0gcmVxdWlyZShcIi4uL21hY2hpbmUtbGVhcm5pbmcvY3JlYXRlLWluc3RhbmNlXCIpO1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBkZWZUb0NhcjtcclxuXHJcbmZ1bmN0aW9uIGRlZlRvQ2FyKG5vcm1hbF9kZWYsIHdvcmxkLCBjb25zdGFudHMpe1xyXG4gIHZhciBjYXJfZGVmID0gY3JlYXRlSW5zdGFuY2UuYXBwbHlUeXBlcyhjb25zdGFudHMuc2NoZW1hLCBub3JtYWxfZGVmKVxyXG4gIHZhciBpbnN0YW5jZSA9IHt9O1xyXG4gIGluc3RhbmNlLmNoYXNzaXMgPSBjcmVhdGVDaGFzc2lzKFxyXG4gICAgd29ybGQsIGNhcl9kZWYudmVydGV4X2xpc3QsIGNhcl9kZWYuY2hhc3Npc19kZW5zaXR5XHJcbiAgKTtcclxuICB2YXIgaTtcclxuXHJcbiAgdmFyIHdoZWVsQ291bnQgPSBjYXJfZGVmLndoZWVsX3JhZGl1cy5sZW5ndGg7XHJcblxyXG4gIGluc3RhbmNlLndoZWVscyA9IFtdO1xyXG4gIGZvciAoaSA9IDA7IGkgPCB3aGVlbENvdW50OyBpKyspIHtcclxuICAgIGluc3RhbmNlLndoZWVsc1tpXSA9IGNyZWF0ZVdoZWVsKFxyXG4gICAgICB3b3JsZCxcclxuICAgICAgY2FyX2RlZi53aGVlbF9yYWRpdXNbaV0sXHJcbiAgICAgIGNhcl9kZWYud2hlZWxfZGVuc2l0eVtpXVxyXG4gICAgKTtcclxuICB9XHJcblxyXG4gIHZhciBjYXJtYXNzID0gaW5zdGFuY2UuY2hhc3Npcy5HZXRNYXNzKCk7XHJcbiAgZm9yIChpID0gMDsgaSA8IHdoZWVsQ291bnQ7IGkrKykge1xyXG4gICAgY2FybWFzcyArPSBpbnN0YW5jZS53aGVlbHNbaV0uR2V0TWFzcygpO1xyXG4gIH1cclxuXHJcbiAgdmFyIGpvaW50X2RlZiA9IG5ldyBiMlJldm9sdXRlSm9pbnREZWYoKTtcclxuXHJcbiAgZm9yIChpID0gMDsgaSA8IHdoZWVsQ291bnQ7IGkrKykge1xyXG4gICAgdmFyIHRvcnF1ZSA9IGNhcm1hc3MgKiAtY29uc3RhbnRzLmdyYXZpdHkueSAvIGNhcl9kZWYud2hlZWxfcmFkaXVzW2ldO1xyXG5cclxuICAgIHZhciByYW5kdmVydGV4ID0gaW5zdGFuY2UuY2hhc3Npcy52ZXJ0ZXhfbGlzdFtjYXJfZGVmLndoZWVsX3ZlcnRleFtpXV07XHJcbiAgICBqb2ludF9kZWYubG9jYWxBbmNob3JBLlNldChyYW5kdmVydGV4LngsIHJhbmR2ZXJ0ZXgueSk7XHJcbiAgICBqb2ludF9kZWYubG9jYWxBbmNob3JCLlNldCgwLCAwKTtcclxuICAgIGpvaW50X2RlZi5tYXhNb3RvclRvcnF1ZSA9IHRvcnF1ZTtcclxuICAgIGpvaW50X2RlZi5tb3RvclNwZWVkID0gLWNvbnN0YW50cy5tb3RvclNwZWVkO1xyXG4gICAgam9pbnRfZGVmLmVuYWJsZU1vdG9yID0gdHJ1ZTtcclxuICAgIGpvaW50X2RlZi5ib2R5QSA9IGluc3RhbmNlLmNoYXNzaXM7XHJcbiAgICBqb2ludF9kZWYuYm9keUIgPSBpbnN0YW5jZS53aGVlbHNbaV07XHJcbiAgICB3b3JsZC5DcmVhdGVKb2ludChqb2ludF9kZWYpO1xyXG4gIH1cclxuXHJcbiAgcmV0dXJuIGluc3RhbmNlO1xyXG59XHJcblxyXG5mdW5jdGlvbiBjcmVhdGVDaGFzc2lzKHdvcmxkLCB2ZXJ0ZXhzLCBkZW5zaXR5KSB7XHJcblxyXG4gIHZhciB2ZXJ0ZXhfbGlzdCA9IG5ldyBBcnJheSgpO1xyXG4gIHZlcnRleF9saXN0LnB1c2gobmV3IGIyVmVjMih2ZXJ0ZXhzWzBdLCAwKSk7XHJcbiAgdmVydGV4X2xpc3QucHVzaChuZXcgYjJWZWMyKHZlcnRleHNbMV0sIHZlcnRleHNbMl0pKTtcclxuICB2ZXJ0ZXhfbGlzdC5wdXNoKG5ldyBiMlZlYzIoMCwgdmVydGV4c1szXSkpO1xyXG4gIHZlcnRleF9saXN0LnB1c2gobmV3IGIyVmVjMigtdmVydGV4c1s0XSwgdmVydGV4c1s1XSkpO1xyXG4gIHZlcnRleF9saXN0LnB1c2gobmV3IGIyVmVjMigtdmVydGV4c1s2XSwgMCkpO1xyXG4gIHZlcnRleF9saXN0LnB1c2gobmV3IGIyVmVjMigtdmVydGV4c1s3XSwgLXZlcnRleHNbOF0pKTtcclxuICB2ZXJ0ZXhfbGlzdC5wdXNoKG5ldyBiMlZlYzIoMCwgLXZlcnRleHNbOV0pKTtcclxuICB2ZXJ0ZXhfbGlzdC5wdXNoKG5ldyBiMlZlYzIodmVydGV4c1sxMF0sIC12ZXJ0ZXhzWzExXSkpO1xyXG5cclxuICB2YXIgYm9keV9kZWYgPSBuZXcgYjJCb2R5RGVmKCk7XHJcbiAgYm9keV9kZWYudHlwZSA9IGIyQm9keS5iMl9keW5hbWljQm9keTtcclxuICBib2R5X2RlZi5wb3NpdGlvbi5TZXQoMC4wLCA0LjApO1xyXG5cclxuICB2YXIgYm9keSA9IHdvcmxkLkNyZWF0ZUJvZHkoYm9keV9kZWYpO1xyXG5cclxuICBjcmVhdGVDaGFzc2lzUGFydChib2R5LCB2ZXJ0ZXhfbGlzdFswXSwgdmVydGV4X2xpc3RbMV0sIGRlbnNpdHkpO1xyXG4gIGNyZWF0ZUNoYXNzaXNQYXJ0KGJvZHksIHZlcnRleF9saXN0WzFdLCB2ZXJ0ZXhfbGlzdFsyXSwgZGVuc2l0eSk7XHJcbiAgY3JlYXRlQ2hhc3Npc1BhcnQoYm9keSwgdmVydGV4X2xpc3RbMl0sIHZlcnRleF9saXN0WzNdLCBkZW5zaXR5KTtcclxuICBjcmVhdGVDaGFzc2lzUGFydChib2R5LCB2ZXJ0ZXhfbGlzdFszXSwgdmVydGV4X2xpc3RbNF0sIGRlbnNpdHkpO1xyXG4gIGNyZWF0ZUNoYXNzaXNQYXJ0KGJvZHksIHZlcnRleF9saXN0WzRdLCB2ZXJ0ZXhfbGlzdFs1XSwgZGVuc2l0eSk7XHJcbiAgY3JlYXRlQ2hhc3Npc1BhcnQoYm9keSwgdmVydGV4X2xpc3RbNV0sIHZlcnRleF9saXN0WzZdLCBkZW5zaXR5KTtcclxuICBjcmVhdGVDaGFzc2lzUGFydChib2R5LCB2ZXJ0ZXhfbGlzdFs2XSwgdmVydGV4X2xpc3RbN10sIGRlbnNpdHkpO1xyXG4gIGNyZWF0ZUNoYXNzaXNQYXJ0KGJvZHksIHZlcnRleF9saXN0WzddLCB2ZXJ0ZXhfbGlzdFswXSwgZGVuc2l0eSk7XHJcblxyXG4gIGJvZHkudmVydGV4X2xpc3QgPSB2ZXJ0ZXhfbGlzdDtcclxuXHJcbiAgcmV0dXJuIGJvZHk7XHJcbn1cclxuXHJcblxyXG5mdW5jdGlvbiBjcmVhdGVDaGFzc2lzUGFydChib2R5LCB2ZXJ0ZXgxLCB2ZXJ0ZXgyLCBkZW5zaXR5KSB7XHJcbiAgdmFyIHZlcnRleF9saXN0ID0gbmV3IEFycmF5KCk7XHJcbiAgdmVydGV4X2xpc3QucHVzaCh2ZXJ0ZXgxKTtcclxuICB2ZXJ0ZXhfbGlzdC5wdXNoKHZlcnRleDIpO1xyXG4gIHZlcnRleF9saXN0LnB1c2goYjJWZWMyLk1ha2UoMCwgMCkpO1xyXG4gIHZhciBmaXhfZGVmID0gbmV3IGIyRml4dHVyZURlZigpO1xyXG4gIGZpeF9kZWYuc2hhcGUgPSBuZXcgYjJQb2x5Z29uU2hhcGUoKTtcclxuICBmaXhfZGVmLmRlbnNpdHkgPSBkZW5zaXR5O1xyXG4gIGZpeF9kZWYuZnJpY3Rpb24gPSAxMDtcclxuICBmaXhfZGVmLnJlc3RpdHV0aW9uID0gMC4yO1xyXG4gIGZpeF9kZWYuZmlsdGVyLmdyb3VwSW5kZXggPSAtMTtcclxuICBmaXhfZGVmLnNoYXBlLlNldEFzQXJyYXkodmVydGV4X2xpc3QsIDMpO1xyXG5cclxuICBib2R5LkNyZWF0ZUZpeHR1cmUoZml4X2RlZik7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNyZWF0ZVdoZWVsKHdvcmxkLCByYWRpdXMsIGRlbnNpdHkpIHtcclxuICB2YXIgYm9keV9kZWYgPSBuZXcgYjJCb2R5RGVmKCk7XHJcbiAgYm9keV9kZWYudHlwZSA9IGIyQm9keS5iMl9keW5hbWljQm9keTtcclxuICBib2R5X2RlZi5wb3NpdGlvbi5TZXQoMCwgMCk7XHJcblxyXG4gIHZhciBib2R5ID0gd29ybGQuQ3JlYXRlQm9keShib2R5X2RlZik7XHJcblxyXG4gIHZhciBmaXhfZGVmID0gbmV3IGIyRml4dHVyZURlZigpO1xyXG4gIGZpeF9kZWYuc2hhcGUgPSBuZXcgYjJDaXJjbGVTaGFwZShyYWRpdXMpO1xyXG4gIGZpeF9kZWYuZGVuc2l0eSA9IGRlbnNpdHk7XHJcbiAgZml4X2RlZi5mcmljdGlvbiA9IDE7XHJcbiAgZml4X2RlZi5yZXN0aXR1dGlvbiA9IDAuMjtcclxuICBmaXhfZGVmLmZpbHRlci5ncm91cEluZGV4ID0gLTE7XHJcblxyXG4gIGJvZHkuQ3JlYXRlRml4dHVyZShmaXhfZGVmKTtcclxuICByZXR1cm4gYm9keTtcclxufVxyXG4iLCJcclxuXHJcbm1vZHVsZS5leHBvcnRzID0ge1xyXG4gIGdldEluaXRpYWxTdGF0ZTogZ2V0SW5pdGlhbFN0YXRlLFxyXG4gIHVwZGF0ZVN0YXRlOiB1cGRhdGVTdGF0ZSxcclxuICBnZXRTdGF0dXM6IGdldFN0YXR1cyxcclxuICBjYWxjdWxhdGVTY29yZTogY2FsY3VsYXRlU2NvcmUsXHJcbn07XHJcblxyXG5mdW5jdGlvbiBnZXRJbml0aWFsU3RhdGUod29ybGRfZGVmKXtcclxuICByZXR1cm4ge1xyXG4gICAgZnJhbWVzOiAwLFxyXG4gICAgaGVhbHRoOiB3b3JsZF9kZWYubWF4X2Nhcl9oZWFsdGgsXHJcbiAgICBtYXhQb3NpdGlvbnk6IDAsXHJcbiAgICBtaW5Qb3NpdGlvbnk6IDAsXHJcbiAgICBtYXhQb3NpdGlvbng6IDAsXHJcbiAgfTtcclxufVxyXG5cclxuZnVuY3Rpb24gdXBkYXRlU3RhdGUoY29uc3RhbnRzLCB3b3JsZENvbnN0cnVjdCwgc3RhdGUpe1xyXG4gIGlmKHN0YXRlLmhlYWx0aCA8PSAwKXtcclxuICAgIHRocm93IG5ldyBFcnJvcihcIkFscmVhZHkgRGVhZFwiKTtcclxuICB9XHJcbiAgaWYoc3RhdGUubWF4UG9zaXRpb254ID4gY29uc3RhbnRzLmZpbmlzaExpbmUpe1xyXG4gICAgdGhyb3cgbmV3IEVycm9yKFwiYWxyZWFkeSBGaW5pc2hlZFwiKTtcclxuICB9XHJcblxyXG4gIC8vIGNvbnNvbGUubG9nKHN0YXRlKTtcclxuICAvLyBjaGVjayBoZWFsdGhcclxuICB2YXIgcG9zaXRpb24gPSB3b3JsZENvbnN0cnVjdC5jaGFzc2lzLkdldFBvc2l0aW9uKCk7XHJcbiAgLy8gY2hlY2sgaWYgY2FyIHJlYWNoZWQgZW5kIG9mIHRoZSBwYXRoXHJcbiAgdmFyIG5leHRTdGF0ZSA9IHtcclxuICAgIGZyYW1lczogc3RhdGUuZnJhbWVzICsgMSxcclxuICAgIG1heFBvc2l0aW9ueDogcG9zaXRpb24ueCA+IHN0YXRlLm1heFBvc2l0aW9ueCA/IHBvc2l0aW9uLnggOiBzdGF0ZS5tYXhQb3NpdGlvbngsXHJcbiAgICBtYXhQb3NpdGlvbnk6IHBvc2l0aW9uLnkgPiBzdGF0ZS5tYXhQb3NpdGlvbnkgPyBwb3NpdGlvbi55IDogc3RhdGUubWF4UG9zaXRpb255LFxyXG4gICAgbWluUG9zaXRpb255OiBwb3NpdGlvbi55IDwgc3RhdGUubWluUG9zaXRpb255ID8gcG9zaXRpb24ueSA6IHN0YXRlLm1pblBvc2l0aW9ueVxyXG4gIH07XHJcblxyXG4gIGlmIChwb3NpdGlvbi54ID4gY29uc3RhbnRzLmZpbmlzaExpbmUpIHtcclxuICAgIHJldHVybiBuZXh0U3RhdGU7XHJcbiAgfVxyXG5cclxuICBpZiAocG9zaXRpb24ueCA+IHN0YXRlLm1heFBvc2l0aW9ueCArIDAuMDIpIHtcclxuICAgIG5leHRTdGF0ZS5oZWFsdGggPSBjb25zdGFudHMubWF4X2Nhcl9oZWFsdGg7XHJcbiAgICByZXR1cm4gbmV4dFN0YXRlO1xyXG4gIH1cclxuICBuZXh0U3RhdGUuaGVhbHRoID0gc3RhdGUuaGVhbHRoIC0gMTtcclxuICBpZiAoTWF0aC5hYnMod29ybGRDb25zdHJ1Y3QuY2hhc3Npcy5HZXRMaW5lYXJWZWxvY2l0eSgpLngpIDwgMC4wMDEpIHtcclxuICAgIG5leHRTdGF0ZS5oZWFsdGggLT0gNTtcclxuICB9XHJcbiAgcmV0dXJuIG5leHRTdGF0ZTtcclxufVxyXG5cclxuZnVuY3Rpb24gZ2V0U3RhdHVzKHN0YXRlLCBjb25zdGFudHMpe1xyXG4gIGlmKGhhc0ZhaWxlZChzdGF0ZSwgY29uc3RhbnRzKSkgcmV0dXJuIC0xO1xyXG4gIGlmKGhhc1N1Y2Nlc3Moc3RhdGUsIGNvbnN0YW50cykpIHJldHVybiAxO1xyXG4gIHJldHVybiAwO1xyXG59XHJcblxyXG5mdW5jdGlvbiBoYXNGYWlsZWQoc3RhdGUgLyosIGNvbnN0YW50cyAqLyl7XHJcbiAgcmV0dXJuIHN0YXRlLmhlYWx0aCA8PSAwO1xyXG59XHJcbmZ1bmN0aW9uIGhhc1N1Y2Nlc3Moc3RhdGUsIGNvbnN0YW50cyl7XHJcbiAgcmV0dXJuIHN0YXRlLm1heFBvc2l0aW9ueCA+IGNvbnN0YW50cy5maW5pc2hMaW5lO1xyXG59XHJcblxyXG5mdW5jdGlvbiBjYWxjdWxhdGVTY29yZShzdGF0ZSwgY29uc3RhbnRzKXtcclxuICB2YXIgYXZnc3BlZWQgPSAoc3RhdGUubWF4UG9zaXRpb254IC8gc3RhdGUuZnJhbWVzKSAqIGNvbnN0YW50cy5ib3gyZGZwcztcclxuICB2YXIgcG9zaXRpb24gPSBzdGF0ZS5tYXhQb3NpdGlvbng7XHJcbiAgdmFyIHNjb3JlID0gcG9zaXRpb24gKyBhdmdzcGVlZDtcclxuICByZXR1cm4ge1xyXG4gICAgdjogc2NvcmUsXHJcbiAgICBzOiBhdmdzcGVlZCxcclxuICAgIHg6IHBvc2l0aW9uLFxyXG4gICAgeTogc3RhdGUubWF4UG9zaXRpb255LFxyXG4gICAgeTI6IHN0YXRlLm1pblBvc2l0aW9ueVxyXG4gIH1cclxufVxyXG4iLCIvKiBnbG9iYWxzIGRvY3VtZW50ICovXHJcblxyXG52YXIgcnVuID0gcmVxdWlyZShcIi4uL2Nhci1zY2hlbWEvcnVuXCIpO1xyXG5cclxuLyogPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSAqL1xyXG4vKiA9PT0gQ2FyID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09ICovXHJcbnZhciBjd19DYXIgPSBmdW5jdGlvbiAoKSB7XHJcbiAgdGhpcy5fX2NvbnN0cnVjdG9yLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XHJcbn1cclxuXHJcbmN3X0Nhci5wcm90b3R5cGUuX19jb25zdHJ1Y3RvciA9IGZ1bmN0aW9uIChjYXIpIHtcclxuICB0aGlzLmNhciA9IGNhcjtcclxuICB0aGlzLmNhcl9kZWYgPSBjYXIuZGVmO1xyXG4gIHZhciBjYXJfZGVmID0gdGhpcy5jYXJfZGVmO1xyXG5cclxuICB0aGlzLmZyYW1lcyA9IDA7XHJcbiAgdGhpcy5hbGl2ZSA9IHRydWU7XHJcbiAgdGhpcy5pc19lbGl0ZSA9IGNhci5kZWYuaXNfZWxpdGU7XHJcbiAgdGhpcy5oZWFsdGhCYXIgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImhlYWx0aFwiICsgY2FyX2RlZi5pbmRleCkuc3R5bGU7XHJcbiAgdGhpcy5oZWFsdGhCYXJUZXh0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJoZWFsdGhcIiArIGNhcl9kZWYuaW5kZXgpLm5leHRTaWJsaW5nLm5leHRTaWJsaW5nO1xyXG4gIHRoaXMuaGVhbHRoQmFyVGV4dC5pbm5lckhUTUwgPSBjYXJfZGVmLmluZGV4O1xyXG4gIHRoaXMubWluaW1hcG1hcmtlciA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiYmFyXCIgKyBjYXJfZGVmLmluZGV4KTtcclxuXHJcbiAgaWYgKHRoaXMuaXNfZWxpdGUpIHtcclxuICAgIHRoaXMuaGVhbHRoQmFyLmJhY2tncm91bmRDb2xvciA9IFwiIzNGNzJBRlwiO1xyXG4gICAgdGhpcy5taW5pbWFwbWFya2VyLnN0eWxlLmJvcmRlckxlZnQgPSBcIjFweCBzb2xpZCAjM0Y3MkFGXCI7XHJcbiAgICB0aGlzLm1pbmltYXBtYXJrZXIuaW5uZXJIVE1MID0gY2FyX2RlZi5pbmRleDtcclxuICB9IGVsc2Uge1xyXG4gICAgdGhpcy5oZWFsdGhCYXIuYmFja2dyb3VuZENvbG9yID0gXCIjRjdDODczXCI7XHJcbiAgICB0aGlzLm1pbmltYXBtYXJrZXIuc3R5bGUuYm9yZGVyTGVmdCA9IFwiMXB4IHNvbGlkICNGN0M4NzNcIjtcclxuICAgIHRoaXMubWluaW1hcG1hcmtlci5pbm5lckhUTUwgPSBjYXJfZGVmLmluZGV4O1xyXG4gIH1cclxuXHJcbn1cclxuXHJcbmN3X0Nhci5wcm90b3R5cGUuZ2V0UG9zaXRpb24gPSBmdW5jdGlvbiAoKSB7XHJcbiAgcmV0dXJuIHRoaXMuY2FyLmNhci5jaGFzc2lzLkdldFBvc2l0aW9uKCk7XHJcbn1cclxuXHJcbmN3X0Nhci5wcm90b3R5cGUua2lsbCA9IGZ1bmN0aW9uIChjdXJyZW50UnVubmVyLCBjb25zdGFudHMpIHtcclxuICB0aGlzLm1pbmltYXBtYXJrZXIuc3R5bGUuYm9yZGVyTGVmdCA9IFwiMXB4IHNvbGlkICMzRjcyQUZcIjtcclxuICB2YXIgZmluaXNoTGluZSA9IGN1cnJlbnRSdW5uZXIuc2NlbmUuZmluaXNoTGluZVxyXG4gIHZhciBtYXhfY2FyX2hlYWx0aCA9IGNvbnN0YW50cy5tYXhfY2FyX2hlYWx0aDtcclxuICB2YXIgc3RhdHVzID0gcnVuLmdldFN0YXR1cyh0aGlzLmNhci5zdGF0ZSwge1xyXG4gICAgZmluaXNoTGluZTogZmluaXNoTGluZSxcclxuICAgIG1heF9jYXJfaGVhbHRoOiBtYXhfY2FyX2hlYWx0aCxcclxuICB9KVxyXG4gIHN3aXRjaChzdGF0dXMpe1xyXG4gICAgY2FzZSAxOiB7XHJcbiAgICAgIHRoaXMuaGVhbHRoQmFyLndpZHRoID0gXCIwXCI7XHJcbiAgICAgIGJyZWFrXHJcbiAgICB9XHJcbiAgICBjYXNlIC0xOiB7XHJcbiAgICAgIHRoaXMuaGVhbHRoQmFyVGV4dC5pbm5lckhUTUwgPSBcIiZkYWdnZXI7XCI7XHJcbiAgICAgIHRoaXMuaGVhbHRoQmFyLndpZHRoID0gXCIwXCI7XHJcbiAgICAgIGJyZWFrXHJcbiAgICB9XHJcbiAgfVxyXG4gIHRoaXMuYWxpdmUgPSBmYWxzZTtcclxuXHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gY3dfQ2FyO1xyXG4iLCJcclxudmFyIGN3X2RyYXdWaXJ0dWFsUG9seSA9IHJlcXVpcmUoXCIuL2RyYXctdmlydHVhbC1wb2x5XCIpO1xyXG52YXIgY3dfZHJhd0NpcmNsZSA9IHJlcXVpcmUoXCIuL2RyYXctY2lyY2xlXCIpO1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihjYXJfY29uc3RhbnRzLCBteUNhciwgY2FtZXJhLCBjdHgpe1xyXG4gIHZhciBjYW1lcmFfeCA9IGNhbWVyYS5wb3MueDtcclxuICB2YXIgem9vbSA9IGNhbWVyYS56b29tO1xyXG5cclxuICB2YXIgd2hlZWxNaW5EZW5zaXR5ID0gY2FyX2NvbnN0YW50cy53aGVlbE1pbkRlbnNpdHlcclxuICB2YXIgd2hlZWxEZW5zaXR5UmFuZ2UgPSBjYXJfY29uc3RhbnRzLndoZWVsRGVuc2l0eVJhbmdlXHJcblxyXG4gIGlmICghbXlDYXIuYWxpdmUpIHtcclxuICAgIHJldHVybjtcclxuICB9XHJcbiAgdmFyIG15Q2FyUG9zID0gbXlDYXIuZ2V0UG9zaXRpb24oKTtcclxuXHJcbiAgaWYgKG15Q2FyUG9zLnggPCAoY2FtZXJhX3ggLSA1KSkge1xyXG4gICAgLy8gdG9vIGZhciBiZWhpbmQsIGRvbid0IGRyYXdcclxuICAgIHJldHVybjtcclxuICB9XHJcblxyXG4gIGN0eC5zdHJva2VTdHlsZSA9IFwiIzQ0NFwiO1xyXG4gIGN0eC5saW5lV2lkdGggPSAxIC8gem9vbTtcclxuXHJcbiAgdmFyIHdoZWVscyA9IG15Q2FyLmNhci5jYXIud2hlZWxzO1xyXG5cclxuICBmb3IgKHZhciBpID0gMDsgaSA8IHdoZWVscy5sZW5ndGg7IGkrKykge1xyXG4gICAgdmFyIGIgPSB3aGVlbHNbaV07XHJcbiAgICBmb3IgKHZhciBmID0gYi5HZXRGaXh0dXJlTGlzdCgpOyBmOyBmID0gZi5tX25leHQpIHtcclxuICAgICAgdmFyIHMgPSBmLkdldFNoYXBlKCk7XHJcbiAgICAgIHZhciBjb2xvciA9IE1hdGgucm91bmQoMjU1IC0gKDI1NSAqIChmLm1fZGVuc2l0eSAtIHdoZWVsTWluRGVuc2l0eSkpIC8gd2hlZWxEZW5zaXR5UmFuZ2UpLnRvU3RyaW5nKCk7XHJcbiAgICAgIHZhciByZ2Jjb2xvciA9IFwicmdiKFwiICsgY29sb3IgKyBcIixcIiArIGNvbG9yICsgXCIsXCIgKyBjb2xvciArIFwiKVwiO1xyXG4gICAgICBjd19kcmF3Q2lyY2xlKGN0eCwgYiwgcy5tX3AsIHMubV9yYWRpdXMsIGIubV9zd2VlcC5hLCByZ2Jjb2xvcik7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBpZiAobXlDYXIuaXNfZWxpdGUpIHtcclxuICAgIGN0eC5zdHJva2VTdHlsZSA9IFwiIzNGNzJBRlwiO1xyXG4gICAgY3R4LmZpbGxTdHlsZSA9IFwiI0RCRTJFRlwiO1xyXG4gIH0gZWxzZSB7XHJcbiAgICBjdHguc3Ryb2tlU3R5bGUgPSBcIiNGN0M4NzNcIjtcclxuICAgIGN0eC5maWxsU3R5bGUgPSBcIiNGQUVCQ0RcIjtcclxuICB9XHJcbiAgY3R4LmJlZ2luUGF0aCgpO1xyXG5cclxuICB2YXIgY2hhc3NpcyA9IG15Q2FyLmNhci5jYXIuY2hhc3NpcztcclxuXHJcbiAgZm9yIChmID0gY2hhc3Npcy5HZXRGaXh0dXJlTGlzdCgpOyBmOyBmID0gZi5tX25leHQpIHtcclxuICAgIHZhciBjcyA9IGYuR2V0U2hhcGUoKTtcclxuICAgIGN3X2RyYXdWaXJ0dWFsUG9seShjdHgsIGNoYXNzaXMsIGNzLm1fdmVydGljZXMsIGNzLm1fdmVydGV4Q291bnQpO1xyXG4gIH1cclxuICBjdHguZmlsbCgpO1xyXG4gIGN0eC5zdHJva2UoKTtcclxufVxyXG4iLCJcclxubW9kdWxlLmV4cG9ydHMgPSBjd19kcmF3Q2lyY2xlO1xyXG5cclxuZnVuY3Rpb24gY3dfZHJhd0NpcmNsZShjdHgsIGJvZHksIGNlbnRlciwgcmFkaXVzLCBhbmdsZSwgY29sb3IpIHtcclxuICB2YXIgcCA9IGJvZHkuR2V0V29ybGRQb2ludChjZW50ZXIpO1xyXG4gIGN0eC5maWxsU3R5bGUgPSBjb2xvcjtcclxuXHJcbiAgY3R4LmJlZ2luUGF0aCgpO1xyXG4gIGN0eC5hcmMocC54LCBwLnksIHJhZGl1cywgMCwgMiAqIE1hdGguUEksIHRydWUpO1xyXG5cclxuICBjdHgubW92ZVRvKHAueCwgcC55KTtcclxuICBjdHgubGluZVRvKHAueCArIHJhZGl1cyAqIE1hdGguY29zKGFuZ2xlKSwgcC55ICsgcmFkaXVzICogTWF0aC5zaW4oYW5nbGUpKTtcclxuXHJcbiAgY3R4LmZpbGwoKTtcclxuICBjdHguc3Ryb2tlKCk7XHJcbn1cclxuIiwidmFyIGN3X2RyYXdWaXJ0dWFsUG9seSA9IHJlcXVpcmUoXCIuL2RyYXctdmlydHVhbC1wb2x5XCIpO1xyXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGN0eCwgY2FtZXJhLCBjd19mbG9vclRpbGVzKSB7XHJcbiAgdmFyIGNhbWVyYV94ID0gY2FtZXJhLnBvcy54O1xyXG4gIHZhciB6b29tID0gY2FtZXJhLnpvb207XHJcbiAgY3R4LnN0cm9rZVN0eWxlID0gXCIjMDAwXCI7XHJcbiAgY3R4LmZpbGxTdHlsZSA9IFwiIzc3N1wiO1xyXG4gIGN0eC5saW5lV2lkdGggPSAxIC8gem9vbTtcclxuICBjdHguYmVnaW5QYXRoKCk7XHJcblxyXG4gIHZhciBrO1xyXG4gIGlmKGNhbWVyYS5wb3MueCAtIDEwID4gMCl7XHJcbiAgICBrID0gTWF0aC5mbG9vcigoY2FtZXJhLnBvcy54IC0gMTApIC8gMS41KTtcclxuICB9IGVsc2Uge1xyXG4gICAgayA9IDA7XHJcbiAgfVxyXG5cclxuICAvLyBjb25zb2xlLmxvZyhrKTtcclxuXHJcbiAgb3V0ZXJfbG9vcDpcclxuICAgIGZvciAoazsgayA8IGN3X2Zsb29yVGlsZXMubGVuZ3RoOyBrKyspIHtcclxuICAgICAgdmFyIGIgPSBjd19mbG9vclRpbGVzW2tdO1xyXG4gICAgICBmb3IgKHZhciBmID0gYi5HZXRGaXh0dXJlTGlzdCgpOyBmOyBmID0gZi5tX25leHQpIHtcclxuICAgICAgICB2YXIgcyA9IGYuR2V0U2hhcGUoKTtcclxuICAgICAgICB2YXIgc2hhcGVQb3NpdGlvbiA9IGIuR2V0V29ybGRQb2ludChzLm1fdmVydGljZXNbMF0pLng7XHJcbiAgICAgICAgaWYgKChzaGFwZVBvc2l0aW9uID4gKGNhbWVyYV94IC0gNSkpICYmIChzaGFwZVBvc2l0aW9uIDwgKGNhbWVyYV94ICsgMTApKSkge1xyXG4gICAgICAgICAgY3dfZHJhd1ZpcnR1YWxQb2x5KGN0eCwgYiwgcy5tX3ZlcnRpY2VzLCBzLm1fdmVydGV4Q291bnQpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAoc2hhcGVQb3NpdGlvbiA+IGNhbWVyYV94ICsgMTApIHtcclxuICAgICAgICAgIGJyZWFrIG91dGVyX2xvb3A7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgY3R4LmZpbGwoKTtcclxuICBjdHguc3Ryb2tlKCk7XHJcbn1cclxuIiwiXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGN0eCwgYm9keSwgdnR4LCBuX3Z0eCkge1xyXG4gIC8vIHNldCBzdHJva2VzdHlsZSBhbmQgZmlsbHN0eWxlIGJlZm9yZSBjYWxsXHJcbiAgLy8gY2FsbCBiZWdpblBhdGggYmVmb3JlIGNhbGxcclxuXHJcbiAgdmFyIHAwID0gYm9keS5HZXRXb3JsZFBvaW50KHZ0eFswXSk7XHJcbiAgY3R4Lm1vdmVUbyhwMC54LCBwMC55KTtcclxuICBmb3IgKHZhciBpID0gMTsgaSA8IG5fdnR4OyBpKyspIHtcclxuICAgIHZhciBwID0gYm9keS5HZXRXb3JsZFBvaW50KHZ0eFtpXSk7XHJcbiAgICBjdHgubGluZVRvKHAueCwgcC55KTtcclxuICB9XHJcbiAgY3R4LmxpbmVUbyhwMC54LCBwMC55KTtcclxufVxyXG4iLCJ2YXIgc2NhdHRlclBsb3QgPSByZXF1aXJlKFwiLi9zY2F0dGVyLXBsb3RcIik7XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IHtcclxuICBwbG90R3JhcGhzOiBmdW5jdGlvbihncmFwaEVsZW0sIHRvcFNjb3Jlc0VsZW0sIHNjYXR0ZXJQbG90RWxlbSwgbGFzdFN0YXRlLCBzY29yZXMsIGNvbmZpZykge1xyXG4gICAgbGFzdFN0YXRlID0gbGFzdFN0YXRlIHx8IHt9O1xyXG4gICAgdmFyIGdlbmVyYXRpb25TaXplID0gc2NvcmVzLmxlbmd0aFxyXG4gICAgdmFyIGdyYXBoY2FudmFzID0gZ3JhcGhFbGVtO1xyXG4gICAgdmFyIGdyYXBoY3R4ID0gZ3JhcGhjYW52YXMuZ2V0Q29udGV4dChcIjJkXCIpO1xyXG4gICAgdmFyIGdyYXBod2lkdGggPSA0MDA7XHJcbiAgICB2YXIgZ3JhcGhoZWlnaHQgPSAyNTA7XHJcbiAgICB2YXIgbmV4dFN0YXRlID0gY3dfc3RvcmVHcmFwaFNjb3JlcyhcclxuICAgICAgbGFzdFN0YXRlLCBzY29yZXMsIGdlbmVyYXRpb25TaXplXHJcbiAgICApO1xyXG4gICAgY29uc29sZS5sb2coc2NvcmVzLCBuZXh0U3RhdGUpO1xyXG4gICAgY3dfY2xlYXJHcmFwaGljcyhncmFwaGNhbnZhcywgZ3JhcGhjdHgsIGdyYXBod2lkdGgsIGdyYXBoaGVpZ2h0KTtcclxuICAgIGN3X3Bsb3RBdmVyYWdlKG5leHRTdGF0ZSwgZ3JhcGhjdHgpO1xyXG4gICAgY3dfcGxvdEVsaXRlKG5leHRTdGF0ZSwgZ3JhcGhjdHgpO1xyXG4gICAgY3dfcGxvdFRvcChuZXh0U3RhdGUsIGdyYXBoY3R4KTtcclxuICAgIGN3X2xpc3RUb3BTY29yZXModG9wU2NvcmVzRWxlbSwgbmV4dFN0YXRlKTtcclxuICAgIG5leHRTdGF0ZS5zY2F0dGVyR3JhcGggPSBkcmF3QWxsUmVzdWx0cyhcclxuICAgICAgc2NhdHRlclBsb3RFbGVtLCBjb25maWcsIG5leHRTdGF0ZSwgbGFzdFN0YXRlLnNjYXR0ZXJHcmFwaFxyXG4gICAgKTtcclxuICAgIHJldHVybiBuZXh0U3RhdGU7XHJcbiAgfSxcclxuICBjbGVhckdyYXBoaWNzOiBmdW5jdGlvbihncmFwaEVsZW0pIHtcclxuICAgIHZhciBncmFwaGNhbnZhcyA9IGdyYXBoRWxlbTtcclxuICAgIHZhciBncmFwaGN0eCA9IGdyYXBoY2FudmFzLmdldENvbnRleHQoXCIyZFwiKTtcclxuICAgIHZhciBncmFwaHdpZHRoID0gNDAwO1xyXG4gICAgdmFyIGdyYXBoaGVpZ2h0ID0gMjUwO1xyXG4gICAgY3dfY2xlYXJHcmFwaGljcyhncmFwaGNhbnZhcywgZ3JhcGhjdHgsIGdyYXBod2lkdGgsIGdyYXBoaGVpZ2h0KTtcclxuICB9XHJcbn07XHJcblxyXG5cclxuZnVuY3Rpb24gY3dfc3RvcmVHcmFwaFNjb3JlcyhsYXN0U3RhdGUsIGN3X2NhclNjb3JlcywgZ2VuZXJhdGlvblNpemUpIHtcclxuICBjb25zb2xlLmxvZyhjd19jYXJTY29yZXMpO1xyXG4gIHJldHVybiB7XHJcbiAgICBjd190b3BTY29yZXM6IChsYXN0U3RhdGUuY3dfdG9wU2NvcmVzIHx8IFtdKVxyXG4gICAgLmNvbmNhdChbY3dfY2FyU2NvcmVzWzBdLnNjb3JlXSksXHJcbiAgICBjd19ncmFwaEF2ZXJhZ2U6IChsYXN0U3RhdGUuY3dfZ3JhcGhBdmVyYWdlIHx8IFtdKS5jb25jYXQoW1xyXG4gICAgICBjd19hdmVyYWdlKGN3X2NhclNjb3JlcywgZ2VuZXJhdGlvblNpemUpXHJcbiAgICBdKSxcclxuICAgIGN3X2dyYXBoRWxpdGU6IChsYXN0U3RhdGUuY3dfZ3JhcGhFbGl0ZSB8fCBbXSkuY29uY2F0KFtcclxuICAgICAgY3dfZWxpdGVhdmVyYWdlKGN3X2NhclNjb3JlcywgZ2VuZXJhdGlvblNpemUpXHJcbiAgICBdKSxcclxuICAgIGN3X2dyYXBoVG9wOiAobGFzdFN0YXRlLmN3X2dyYXBoVG9wIHx8IFtdKS5jb25jYXQoW1xyXG4gICAgICBjd19jYXJTY29yZXNbMF0uc2NvcmUudlxyXG4gICAgXSksXHJcbiAgICBhbGxSZXN1bHRzOiAobGFzdFN0YXRlLmFsbFJlc3VsdHMgfHwgW10pLmNvbmNhdChjd19jYXJTY29yZXMpLFxyXG4gIH1cclxufVxyXG5cclxuZnVuY3Rpb24gY3dfcGxvdFRvcChzdGF0ZSwgZ3JhcGhjdHgpIHtcclxuICB2YXIgY3dfZ3JhcGhUb3AgPSBzdGF0ZS5jd19ncmFwaFRvcDtcclxuICB2YXIgZ3JhcGhzaXplID0gY3dfZ3JhcGhUb3AubGVuZ3RoO1xyXG4gIGdyYXBoY3R4LnN0cm9rZVN0eWxlID0gXCIjQzgzQjNCXCI7XHJcbiAgZ3JhcGhjdHguYmVnaW5QYXRoKCk7XHJcbiAgZ3JhcGhjdHgubW92ZVRvKDAsIDApO1xyXG4gIGZvciAodmFyIGsgPSAwOyBrIDwgZ3JhcGhzaXplOyBrKyspIHtcclxuICAgIGdyYXBoY3R4LmxpbmVUbyg0MDAgKiAoayArIDEpIC8gZ3JhcGhzaXplLCBjd19ncmFwaFRvcFtrXSk7XHJcbiAgfVxyXG4gIGdyYXBoY3R4LnN0cm9rZSgpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBjd19wbG90RWxpdGUoc3RhdGUsIGdyYXBoY3R4KSB7XHJcbiAgdmFyIGN3X2dyYXBoRWxpdGUgPSBzdGF0ZS5jd19ncmFwaEVsaXRlO1xyXG4gIHZhciBncmFwaHNpemUgPSBjd19ncmFwaEVsaXRlLmxlbmd0aDtcclxuICBncmFwaGN0eC5zdHJva2VTdHlsZSA9IFwiIzdCQzc0RFwiO1xyXG4gIGdyYXBoY3R4LmJlZ2luUGF0aCgpO1xyXG4gIGdyYXBoY3R4Lm1vdmVUbygwLCAwKTtcclxuICBmb3IgKHZhciBrID0gMDsgayA8IGdyYXBoc2l6ZTsgaysrKSB7XHJcbiAgICBncmFwaGN0eC5saW5lVG8oNDAwICogKGsgKyAxKSAvIGdyYXBoc2l6ZSwgY3dfZ3JhcGhFbGl0ZVtrXSk7XHJcbiAgfVxyXG4gIGdyYXBoY3R4LnN0cm9rZSgpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBjd19wbG90QXZlcmFnZShzdGF0ZSwgZ3JhcGhjdHgpIHtcclxuICB2YXIgY3dfZ3JhcGhBdmVyYWdlID0gc3RhdGUuY3dfZ3JhcGhBdmVyYWdlO1xyXG4gIHZhciBncmFwaHNpemUgPSBjd19ncmFwaEF2ZXJhZ2UubGVuZ3RoO1xyXG4gIGdyYXBoY3R4LnN0cm9rZVN0eWxlID0gXCIjM0Y3MkFGXCI7XHJcbiAgZ3JhcGhjdHguYmVnaW5QYXRoKCk7XHJcbiAgZ3JhcGhjdHgubW92ZVRvKDAsIDApO1xyXG4gIGZvciAodmFyIGsgPSAwOyBrIDwgZ3JhcGhzaXplOyBrKyspIHtcclxuICAgIGdyYXBoY3R4LmxpbmVUbyg0MDAgKiAoayArIDEpIC8gZ3JhcGhzaXplLCBjd19ncmFwaEF2ZXJhZ2Vba10pO1xyXG4gIH1cclxuICBncmFwaGN0eC5zdHJva2UoKTtcclxufVxyXG5cclxuXHJcbmZ1bmN0aW9uIGN3X2VsaXRlYXZlcmFnZShzY29yZXMsIGdlbmVyYXRpb25TaXplKSB7XHJcbiAgdmFyIHN1bSA9IDA7XHJcbiAgZm9yICh2YXIgayA9IDA7IGsgPCBNYXRoLmZsb29yKGdlbmVyYXRpb25TaXplIC8gMik7IGsrKykge1xyXG4gICAgc3VtICs9IHNjb3Jlc1trXS5zY29yZS52O1xyXG4gIH1cclxuICByZXR1cm4gc3VtIC8gTWF0aC5mbG9vcihnZW5lcmF0aW9uU2l6ZSAvIDIpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBjd19hdmVyYWdlKHNjb3JlcywgZ2VuZXJhdGlvblNpemUpIHtcclxuICB2YXIgc3VtID0gMDtcclxuICBmb3IgKHZhciBrID0gMDsgayA8IGdlbmVyYXRpb25TaXplOyBrKyspIHtcclxuICAgIHN1bSArPSBzY29yZXNba10uc2NvcmUudjtcclxuICB9XHJcbiAgcmV0dXJuIHN1bSAvIGdlbmVyYXRpb25TaXplO1xyXG59XHJcblxyXG5mdW5jdGlvbiBjd19jbGVhckdyYXBoaWNzKGdyYXBoY2FudmFzLCBncmFwaGN0eCwgZ3JhcGh3aWR0aCwgZ3JhcGhoZWlnaHQpIHtcclxuICBncmFwaGNhbnZhcy53aWR0aCA9IGdyYXBoY2FudmFzLndpZHRoO1xyXG4gIGdyYXBoY3R4LnRyYW5zbGF0ZSgwLCBncmFwaGhlaWdodCk7XHJcbiAgZ3JhcGhjdHguc2NhbGUoMSwgLTEpO1xyXG4gIGdyYXBoY3R4LmxpbmVXaWR0aCA9IDE7XHJcbiAgZ3JhcGhjdHguc3Ryb2tlU3R5bGUgPSBcIiMzRjcyQUZcIjtcclxuICBncmFwaGN0eC5iZWdpblBhdGgoKTtcclxuICBncmFwaGN0eC5tb3ZlVG8oMCwgZ3JhcGhoZWlnaHQgLyAyKTtcclxuICBncmFwaGN0eC5saW5lVG8oZ3JhcGh3aWR0aCwgZ3JhcGhoZWlnaHQgLyAyKTtcclxuICBncmFwaGN0eC5tb3ZlVG8oMCwgZ3JhcGhoZWlnaHQgLyA0KTtcclxuICBncmFwaGN0eC5saW5lVG8oZ3JhcGh3aWR0aCwgZ3JhcGhoZWlnaHQgLyA0KTtcclxuICBncmFwaGN0eC5tb3ZlVG8oMCwgZ3JhcGhoZWlnaHQgKiAzIC8gNCk7XHJcbiAgZ3JhcGhjdHgubGluZVRvKGdyYXBod2lkdGgsIGdyYXBoaGVpZ2h0ICogMyAvIDQpO1xyXG4gIGdyYXBoY3R4LnN0cm9rZSgpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBjd19saXN0VG9wU2NvcmVzKGVsZW0sIHN0YXRlKSB7XHJcbiAgdmFyIGN3X3RvcFNjb3JlcyA9IHN0YXRlLmN3X3RvcFNjb3JlcztcclxuICB2YXIgdHMgPSBlbGVtO1xyXG4gIHRzLmlubmVySFRNTCA9IFwiPGI+VG9wIFNjb3Jlczo8L2I+PGJyIC8+XCI7XHJcbiAgY3dfdG9wU2NvcmVzLnNvcnQoZnVuY3Rpb24gKGEsIGIpIHtcclxuICAgIGlmIChhLnYgPiBiLnYpIHtcclxuICAgICAgcmV0dXJuIC0xXHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICByZXR1cm4gMVxyXG4gICAgfVxyXG4gIH0pO1xyXG5cclxuICBmb3IgKHZhciBrID0gMDsgayA8IE1hdGgubWluKDEwLCBjd190b3BTY29yZXMubGVuZ3RoKTsgaysrKSB7XHJcbiAgICB2YXIgdG9wU2NvcmUgPSBjd190b3BTY29yZXNba107XHJcbiAgICAvLyBjb25zb2xlLmxvZyh0b3BTY29yZSk7XHJcbiAgICB2YXIgbiA9IFwiI1wiICsgKGsgKyAxKSArIFwiOlwiO1xyXG4gICAgdmFyIHNjb3JlID0gTWF0aC5yb3VuZCh0b3BTY29yZS52ICogMTAwKSAvIDEwMDtcclxuICAgIHZhciBkaXN0YW5jZSA9IFwiZDpcIiArIE1hdGgucm91bmQodG9wU2NvcmUueCAqIDEwMCkgLyAxMDA7XHJcbiAgICB2YXIgeXJhbmdlID0gIFwiaDpcIiArIE1hdGgucm91bmQodG9wU2NvcmUueTIgKiAxMDApIC8gMTAwICsgXCIvXCIgKyBNYXRoLnJvdW5kKHRvcFNjb3JlLnkgKiAxMDApIC8gMTAwICsgXCJtXCI7XHJcbiAgICB2YXIgZ2VuID0gXCIoR2VuIFwiICsgY3dfdG9wU2NvcmVzW2tdLmkgKyBcIilcIlxyXG5cclxuICAgIHRzLmlubmVySFRNTCArPSAgW24sIHNjb3JlLCBkaXN0YW5jZSwgeXJhbmdlLCBnZW5dLmpvaW4oXCIgXCIpICsgXCI8YnIgLz5cIjtcclxuICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGRyYXdBbGxSZXN1bHRzKHNjYXR0ZXJQbG90RWxlbSwgY29uZmlnLCBhbGxSZXN1bHRzLCBwcmV2aW91c0dyYXBoKXtcclxuICBpZighc2NhdHRlclBsb3RFbGVtKSByZXR1cm47XHJcbiAgcmV0dXJuIHNjYXR0ZXJQbG90KHNjYXR0ZXJQbG90RWxlbSwgYWxsUmVzdWx0cywgY29uZmlnLnByb3BlcnR5TWFwLCBwcmV2aW91c0dyYXBoKVxyXG59XHJcbiIsIi8qIGdsb2JhbHMgdmlzIEhpZ2hjaGFydHMgKi9cclxuXHJcbi8vIENhbGxlZCB3aGVuIHRoZSBWaXN1YWxpemF0aW9uIEFQSSBpcyBsb2FkZWQuXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IGhpZ2hDaGFydHM7XHJcbmZ1bmN0aW9uIGhpZ2hDaGFydHMoZWxlbSwgc2NvcmVzKXtcclxuICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKHNjb3Jlc1swXS5kZWYpO1xyXG4gIGtleXMgPSBrZXlzLnJlZHVjZShmdW5jdGlvbihjdXJBcnJheSwga2V5KXtcclxuICAgIHZhciBsID0gc2NvcmVzWzBdLmRlZltrZXldLmxlbmd0aDtcclxuICAgIHZhciBzdWJBcnJheSA9IFtdO1xyXG4gICAgZm9yKHZhciBpID0gMDsgaSA8IGw7IGkrKyl7XHJcbiAgICAgIHN1YkFycmF5LnB1c2goa2V5ICsgXCIuXCIgKyBpKTtcclxuICAgIH1cclxuICAgIHJldHVybiBjdXJBcnJheS5jb25jYXQoc3ViQXJyYXkpO1xyXG4gIH0sIFtdKTtcclxuICBmdW5jdGlvbiByZXRyaWV2ZVZhbHVlKG9iaiwgcGF0aCl7XHJcbiAgICByZXR1cm4gcGF0aC5zcGxpdChcIi5cIikucmVkdWNlKGZ1bmN0aW9uKGN1clZhbHVlLCBrZXkpe1xyXG4gICAgICByZXR1cm4gY3VyVmFsdWVba2V5XTtcclxuICAgIH0sIG9iaik7XHJcbiAgfVxyXG5cclxuICB2YXIgZGF0YU9iaiA9IE9iamVjdC5rZXlzKHNjb3JlcykucmVkdWNlKGZ1bmN0aW9uKGt2LCBzY29yZSl7XHJcbiAgICBrZXlzLmZvckVhY2goZnVuY3Rpb24oa2V5KXtcclxuICAgICAga3Zba2V5XS5kYXRhLnB1c2goW1xyXG4gICAgICAgIHJldHJpZXZlVmFsdWUoc2NvcmUuZGVmLCBrZXkpLCBzY29yZS5zY29yZS52XHJcbiAgICAgIF0pXHJcbiAgICB9KVxyXG4gICAgcmV0dXJuIGt2O1xyXG4gIH0sIGtleXMucmVkdWNlKGZ1bmN0aW9uKGt2LCBrZXkpe1xyXG4gICAga3Zba2V5XSA9IHtcclxuICAgICAgbmFtZToga2V5LFxyXG4gICAgICBkYXRhOiBbXSxcclxuICAgIH1cclxuICAgIHJldHVybiBrdjtcclxuICB9LCB7fSkpXHJcbiAgSGlnaGNoYXJ0cy5jaGFydChlbGVtLmlkLCB7XHJcbiAgICAgIGNoYXJ0OiB7XHJcbiAgICAgICAgICB0eXBlOiAnc2NhdHRlcicsXHJcbiAgICAgICAgICB6b29tVHlwZTogJ3h5J1xyXG4gICAgICB9LFxyXG4gICAgICB0aXRsZToge1xyXG4gICAgICAgICAgdGV4dDogJ1Byb3BlcnR5IFZhbHVlIHRvIFNjb3JlJ1xyXG4gICAgICB9LFxyXG4gICAgICB4QXhpczoge1xyXG4gICAgICAgICAgdGl0bGU6IHtcclxuICAgICAgICAgICAgICBlbmFibGVkOiB0cnVlLFxyXG4gICAgICAgICAgICAgIHRleHQ6ICdOb3JtYWxpemVkJ1xyXG4gICAgICAgICAgfSxcclxuICAgICAgICAgIHN0YXJ0T25UaWNrOiB0cnVlLFxyXG4gICAgICAgICAgZW5kT25UaWNrOiB0cnVlLFxyXG4gICAgICAgICAgc2hvd0xhc3RMYWJlbDogdHJ1ZVxyXG4gICAgICB9LFxyXG4gICAgICB5QXhpczoge1xyXG4gICAgICAgICAgdGl0bGU6IHtcclxuICAgICAgICAgICAgICB0ZXh0OiAnU2NvcmUnXHJcbiAgICAgICAgICB9XHJcbiAgICAgIH0sXHJcbiAgICAgIGxlZ2VuZDoge1xyXG4gICAgICAgICAgbGF5b3V0OiAndmVydGljYWwnLFxyXG4gICAgICAgICAgYWxpZ246ICdsZWZ0JyxcclxuICAgICAgICAgIHZlcnRpY2FsQWxpZ246ICd0b3AnLFxyXG4gICAgICAgICAgeDogMTAwLFxyXG4gICAgICAgICAgeTogNzAsXHJcbiAgICAgICAgICBmbG9hdGluZzogdHJ1ZSxcclxuICAgICAgICAgIGJhY2tncm91bmRDb2xvcjogKEhpZ2hjaGFydHMudGhlbWUgJiYgSGlnaGNoYXJ0cy50aGVtZS5sZWdlbmRCYWNrZ3JvdW5kQ29sb3IpIHx8ICcjRkZGRkZGJyxcclxuICAgICAgICAgIGJvcmRlcldpZHRoOiAxXHJcbiAgICAgIH0sXHJcbiAgICAgIHBsb3RPcHRpb25zOiB7XHJcbiAgICAgICAgICBzY2F0dGVyOiB7XHJcbiAgICAgICAgICAgICAgbWFya2VyOiB7XHJcbiAgICAgICAgICAgICAgICAgIHJhZGl1czogNSxcclxuICAgICAgICAgICAgICAgICAgc3RhdGVzOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICBob3Zlcjoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgIGVuYWJsZWQ6IHRydWUsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgbGluZUNvbG9yOiAncmdiKDEwMCwxMDAsMTAwKSdcclxuICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgc3RhdGVzOiB7XHJcbiAgICAgICAgICAgICAgICAgIGhvdmVyOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICBtYXJrZXI6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICBlbmFibGVkOiBmYWxzZVxyXG4gICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICB0b29sdGlwOiB7XHJcbiAgICAgICAgICAgICAgICAgIGhlYWRlckZvcm1hdDogJzxiPntzZXJpZXMubmFtZX08L2I+PGJyPicsXHJcbiAgICAgICAgICAgICAgICAgIHBvaW50Rm9ybWF0OiAne3BvaW50Lnh9LCB7cG9pbnQueX0nXHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfVxyXG4gICAgICB9LFxyXG4gICAgICBzZXJpZXM6IGtleXMubWFwKGZ1bmN0aW9uKGtleSl7XHJcbiAgICAgICAgcmV0dXJuIGRhdGFPYmpba2V5XTtcclxuICAgICAgfSlcclxuICB9KTtcclxufVxyXG5cclxuZnVuY3Rpb24gdmlzQ2hhcnQoZWxlbSwgc2NvcmVzLCBwcm9wZXJ0eU1hcCwgZ3JhcGgpIHtcclxuXHJcbiAgLy8gQ3JlYXRlIGFuZCBwb3B1bGF0ZSBhIGRhdGEgdGFibGUuXHJcbiAgdmFyIGRhdGEgPSBuZXcgdmlzLkRhdGFTZXQoKTtcclxuICBzY29yZXMuZm9yRWFjaChmdW5jdGlvbihzY29yZUluZm8pe1xyXG4gICAgZGF0YS5hZGQoe1xyXG4gICAgICB4OiBnZXRQcm9wZXJ0eShzY29yZUluZm8sIHByb3BlcnR5TWFwLngpLFxyXG4gICAgICB5OiBnZXRQcm9wZXJ0eShzY29yZUluZm8sIHByb3BlcnR5TWFwLngpLFxyXG4gICAgICB6OiBnZXRQcm9wZXJ0eShzY29yZUluZm8sIHByb3BlcnR5TWFwLnopLFxyXG4gICAgICBzdHlsZTogZ2V0UHJvcGVydHkoc2NvcmVJbmZvLCBwcm9wZXJ0eU1hcC56KSxcclxuICAgICAgLy8gZXh0cmE6IGRlZi5hbmNlc3RyeVxyXG4gICAgfSk7XHJcbiAgfSk7XHJcblxyXG4gIGZ1bmN0aW9uIGdldFByb3BlcnR5KGluZm8sIGtleSl7XHJcbiAgICBpZihrZXkgPT09IFwic2NvcmVcIil7XHJcbiAgICAgIHJldHVybiBpbmZvLnNjb3JlLnZcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIHJldHVybiBpbmZvLmRlZltrZXldO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLy8gc3BlY2lmeSBvcHRpb25zXHJcbiAgdmFyIG9wdGlvbnMgPSB7XHJcbiAgICB3aWR0aDogICc2MDBweCcsXHJcbiAgICBoZWlnaHQ6ICc2MDBweCcsXHJcbiAgICBzdHlsZTogJ2RvdC1zaXplJyxcclxuICAgIHNob3dQZXJzcGVjdGl2ZTogdHJ1ZSxcclxuICAgIHNob3dMZWdlbmQ6IHRydWUsXHJcbiAgICBzaG93R3JpZDogdHJ1ZSxcclxuICAgIHNob3dTaGFkb3c6IGZhbHNlLFxyXG5cclxuICAgIC8vIE9wdGlvbiB0b29sdGlwIGNhbiBiZSB0cnVlLCBmYWxzZSwgb3IgYSBmdW5jdGlvbiByZXR1cm5pbmcgYSBzdHJpbmcgd2l0aCBIVE1MIGNvbnRlbnRzXHJcbiAgICB0b29sdGlwOiBmdW5jdGlvbiAocG9pbnQpIHtcclxuICAgICAgLy8gcGFyYW1ldGVyIHBvaW50IGNvbnRhaW5zIHByb3BlcnRpZXMgeCwgeSwgeiwgYW5kIGRhdGFcclxuICAgICAgLy8gZGF0YSBpcyB0aGUgb3JpZ2luYWwgb2JqZWN0IHBhc3NlZCB0byB0aGUgcG9pbnQgY29uc3RydWN0b3JcclxuICAgICAgcmV0dXJuICdzY29yZTogPGI+JyArIHBvaW50LnogKyAnPC9iPjxicj4nOyAvLyArIHBvaW50LmRhdGEuZXh0cmE7XHJcbiAgICB9LFxyXG5cclxuICAgIC8vIFRvb2x0aXAgZGVmYXVsdCBzdHlsaW5nIGNhbiBiZSBvdmVycmlkZGVuXHJcbiAgICB0b29sdGlwU3R5bGU6IHtcclxuICAgICAgY29udGVudDoge1xyXG4gICAgICAgIGJhY2tncm91bmQgICAgOiAncmdiYSgyNTUsIDI1NSwgMjU1LCAwLjcpJyxcclxuICAgICAgICBwYWRkaW5nICAgICAgIDogJzEwcHgnLFxyXG4gICAgICAgIGJvcmRlclJhZGl1cyAgOiAnMTBweCdcclxuICAgICAgfSxcclxuICAgICAgbGluZToge1xyXG4gICAgICAgIGJvcmRlckxlZnQgICAgOiAnMXB4IGRvdHRlZCByZ2JhKDAsIDAsIDAsIDAuNSknXHJcbiAgICAgIH0sXHJcbiAgICAgIGRvdDoge1xyXG4gICAgICAgIGJvcmRlciAgICAgICAgOiAnNXB4IHNvbGlkIHJnYmEoMCwgMCwgMCwgMC41KSdcclxuICAgICAgfVxyXG4gICAgfSxcclxuXHJcbiAgICBrZWVwQXNwZWN0UmF0aW86IHRydWUsXHJcbiAgICB2ZXJ0aWNhbFJhdGlvOiAwLjVcclxuICB9O1xyXG5cclxuICB2YXIgY2FtZXJhID0gZ3JhcGggPyBncmFwaC5nZXRDYW1lcmFQb3NpdGlvbigpIDogbnVsbDtcclxuXHJcbiAgLy8gY3JlYXRlIG91ciBncmFwaFxyXG4gIHZhciBjb250YWluZXIgPSBlbGVtO1xyXG4gIGdyYXBoID0gbmV3IHZpcy5HcmFwaDNkKGNvbnRhaW5lciwgZGF0YSwgb3B0aW9ucyk7XHJcblxyXG4gIGlmIChjYW1lcmEpIGdyYXBoLnNldENhbWVyYVBvc2l0aW9uKGNhbWVyYSk7IC8vIHJlc3RvcmUgY2FtZXJhIHBvc2l0aW9uXHJcbiAgcmV0dXJuIGdyYXBoO1xyXG59XHJcbiIsIlxyXG5tb2R1bGUuZXhwb3J0cyA9IGdlbmVyYXRlUmFuZG9tO1xyXG5mdW5jdGlvbiBnZW5lcmF0ZVJhbmRvbSgpe1xyXG4gIHJldHVybiBNYXRoLnJhbmRvbSgpO1xyXG59XHJcbiIsIi8vIGh0dHA6Ly9zdW5taW5ndGFvLmJsb2dzcG90LmNvbS8yMDE2LzExL2luYnJlZWRpbmctY29lZmZpY2llbnQuaHRtbFxyXG5tb2R1bGUuZXhwb3J0cyA9IGdldEluYnJlZWRpbmdDb2VmZmljaWVudDtcclxuXHJcbmZ1bmN0aW9uIGdldEluYnJlZWRpbmdDb2VmZmljaWVudChjaGlsZCl7XHJcbiAgdmFyIG5hbWVJbmRleCA9IG5ldyBNYXAoKTtcclxuICB2YXIgZmxhZ2dlZCA9IG5ldyBTZXQoKTtcclxuICB2YXIgY29udmVyZ2VuY2VQb2ludHMgPSBuZXcgU2V0KCk7XHJcbiAgY3JlYXRlQW5jZXN0cnlNYXAoY2hpbGQsIFtdKTtcclxuXHJcbiAgdmFyIHN0b3JlZENvZWZmaWNpZW50cyA9IG5ldyBNYXAoKTtcclxuXHJcbiAgcmV0dXJuIEFycmF5LmZyb20oY29udmVyZ2VuY2VQb2ludHMudmFsdWVzKCkpLnJlZHVjZShmdW5jdGlvbihzdW0sIHBvaW50KXtcclxuICAgIHZhciBpQ28gPSBnZXRDb2VmZmljaWVudChwb2ludCk7XHJcbiAgICByZXR1cm4gc3VtICsgaUNvO1xyXG4gIH0sIDApO1xyXG5cclxuICBmdW5jdGlvbiBjcmVhdGVBbmNlc3RyeU1hcChpbml0Tm9kZSl7XHJcbiAgICB2YXIgaXRlbXNJblF1ZXVlID0gW3sgbm9kZTogaW5pdE5vZGUsIHBhdGg6IFtdIH1dO1xyXG4gICAgZG97XHJcbiAgICAgIHZhciBpdGVtID0gaXRlbXNJblF1ZXVlLnNoaWZ0KCk7XHJcbiAgICAgIHZhciBub2RlID0gaXRlbS5ub2RlO1xyXG4gICAgICB2YXIgcGF0aCA9IGl0ZW0ucGF0aDtcclxuICAgICAgaWYocHJvY2Vzc0l0ZW0obm9kZSwgcGF0aCkpe1xyXG4gICAgICAgIHZhciBuZXh0UGF0aCA9IFsgbm9kZS5pZCBdLmNvbmNhdChwYXRoKTtcclxuICAgICAgICBpdGVtc0luUXVldWUgPSBpdGVtc0luUXVldWUuY29uY2F0KG5vZGUuYW5jZXN0cnkubWFwKGZ1bmN0aW9uKHBhcmVudCl7XHJcbiAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICBub2RlOiBwYXJlbnQsXHJcbiAgICAgICAgICAgIHBhdGg6IG5leHRQYXRoXHJcbiAgICAgICAgICB9O1xyXG4gICAgICAgIH0pKTtcclxuICAgICAgfVxyXG4gICAgfXdoaWxlKGl0ZW1zSW5RdWV1ZS5sZW5ndGgpO1xyXG5cclxuXHJcbiAgICBmdW5jdGlvbiBwcm9jZXNzSXRlbShub2RlLCBwYXRoKXtcclxuICAgICAgdmFyIG5ld0FuY2VzdG9yID0gIW5hbWVJbmRleC5oYXMobm9kZS5pZCk7XHJcbiAgICAgIGlmKG5ld0FuY2VzdG9yKXtcclxuICAgICAgICBuYW1lSW5kZXguc2V0KG5vZGUuaWQsIHtcclxuICAgICAgICAgIHBhcmVudHM6IChub2RlLmFuY2VzdHJ5IHx8IFtdKS5tYXAoZnVuY3Rpb24ocGFyZW50KXtcclxuICAgICAgICAgICAgcmV0dXJuIHBhcmVudC5pZDtcclxuICAgICAgICAgIH0pLFxyXG4gICAgICAgICAgaWQ6IG5vZGUuaWQsXHJcbiAgICAgICAgICBjaGlsZHJlbjogW10sXHJcbiAgICAgICAgICBjb252ZXJnZW5jZXM6IFtdLFxyXG4gICAgICAgIH0pO1xyXG4gICAgICB9IGVsc2Uge1xyXG5cclxuICAgICAgICBmbGFnZ2VkLmFkZChub2RlLmlkKVxyXG4gICAgICAgIG5hbWVJbmRleC5nZXQobm9kZS5pZCkuY2hpbGRyZW4uZm9yRWFjaChmdW5jdGlvbihjaGlsZElkZW50aWZpZXIpe1xyXG4gICAgICAgICAgdmFyIG9mZnNldHMgPSBmaW5kQ29udmVyZ2VuY2UoY2hpbGRJZGVudGlmaWVyLnBhdGgsIHBhdGgpO1xyXG4gICAgICAgICAgaWYoIW9mZnNldHMpe1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICB2YXIgY2hpbGRJRCA9IHBhdGhbb2Zmc2V0c1sxXV07XHJcbiAgICAgICAgICBjb252ZXJnZW5jZVBvaW50cy5hZGQoY2hpbGRJRCk7XHJcbiAgICAgICAgICBuYW1lSW5kZXguZ2V0KGNoaWxkSUQpLmNvbnZlcmdlbmNlcy5wdXNoKHtcclxuICAgICAgICAgICAgcGFyZW50OiBub2RlLmlkLFxyXG4gICAgICAgICAgICBvZmZzZXRzOiBvZmZzZXRzLFxyXG4gICAgICAgICAgfSk7XHJcbiAgICAgICAgfSk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGlmKHBhdGgubGVuZ3RoKXtcclxuICAgICAgICBuYW1lSW5kZXguZ2V0KG5vZGUuaWQpLmNoaWxkcmVuLnB1c2goe1xyXG4gICAgICAgICAgY2hpbGQ6IHBhdGhbMF0sXHJcbiAgICAgICAgICBwYXRoOiBwYXRoXHJcbiAgICAgICAgfSk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGlmKCFuZXdBbmNlc3Rvcil7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgICB9XHJcbiAgICAgIGlmKCFub2RlLmFuY2VzdHJ5KXtcclxuICAgICAgICByZXR1cm47XHJcbiAgICAgIH1cclxuICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBmdW5jdGlvbiBnZXRDb2VmZmljaWVudChpZCl7XHJcbiAgICBpZihzdG9yZWRDb2VmZmljaWVudHMuaGFzKGlkKSl7XHJcbiAgICAgIHJldHVybiBzdG9yZWRDb2VmZmljaWVudHMuZ2V0KGlkKTtcclxuICAgIH1cclxuICAgIHZhciBub2RlID0gbmFtZUluZGV4LmdldChpZCk7XHJcbiAgICB2YXIgdmFsID0gbm9kZS5jb252ZXJnZW5jZXMucmVkdWNlKGZ1bmN0aW9uKHN1bSwgcG9pbnQpe1xyXG4gICAgICByZXR1cm4gc3VtICsgTWF0aC5wb3coMSAvIDIsIHBvaW50Lm9mZnNldHMucmVkdWNlKGZ1bmN0aW9uKHN1bSwgdmFsdWUpe1xyXG4gICAgICAgIHJldHVybiBzdW0gKyB2YWx1ZTtcclxuICAgICAgfSwgMSkpICogKDEgKyBnZXRDb2VmZmljaWVudChwb2ludC5wYXJlbnQpKTtcclxuICAgIH0sIDApO1xyXG4gICAgc3RvcmVkQ29lZmZpY2llbnRzLnNldChpZCwgdmFsKTtcclxuXHJcbiAgICByZXR1cm4gdmFsO1xyXG5cclxuICB9XHJcbiAgZnVuY3Rpb24gZmluZENvbnZlcmdlbmNlKGxpc3RBLCBsaXN0Qil7XHJcbiAgICB2YXIgY2ksIGNqLCBsaSwgbGo7XHJcbiAgICBvdXRlcmxvb3A6XHJcbiAgICBmb3IoY2kgPSAwLCBsaSA9IGxpc3RBLmxlbmd0aDsgY2kgPCBsaTsgY2krKyl7XHJcbiAgICAgIGZvcihjaiA9IDAsIGxqID0gbGlzdEIubGVuZ3RoOyBjaiA8IGxqOyBjaisrKXtcclxuICAgICAgICBpZihsaXN0QVtjaV0gPT09IGxpc3RCW2NqXSl7XHJcbiAgICAgICAgICBicmVhayBvdXRlcmxvb3A7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgICBpZihjaSA9PT0gbGkpe1xyXG4gICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gW2NpLCBjal07XHJcbiAgfVxyXG59XHJcbiIsInZhciBjYXJDb25zdHJ1Y3QgPSByZXF1aXJlKFwiLi4vY2FyLXNjaGVtYS9jb25zdHJ1Y3QuanNcIik7XHJcblxyXG52YXIgY2FyQ29uc3RhbnRzID0gY2FyQ29uc3RydWN0LmNhckNvbnN0YW50cygpO1xyXG5cclxudmFyIHNjaGVtYSA9IGNhckNvbnN0cnVjdC5nZW5lcmF0ZVNjaGVtYShjYXJDb25zdGFudHMpO1xyXG52YXIgcGlja1BhcmVudCA9IHJlcXVpcmUoXCIuL3BpY2tQYXJlbnRcIik7XHJcbnZhciBzZWxlY3RGcm9tQWxsUGFyZW50cyA9IHJlcXVpcmUoXCIuL3NlbGVjdEZyb21BbGxQYXJlbnRzXCIpO1xyXG5jb25zdCBjb25zdGFudHMgPSB7XHJcbiAgZ2VuZXJhdGlvblNpemU6IDIwLFxyXG4gIHNjaGVtYTogc2NoZW1hLFxyXG4gIGNoYW1waW9uTGVuZ3RoOiAxLFxyXG4gIG11dGF0aW9uX3JhbmdlOiAxLFxyXG4gIGdlbl9tdXRhdGlvbjogMC4wNSxcclxufTtcclxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbigpe1xyXG4gIHZhciBjdXJyZW50Q2hvaWNlcyA9IG5ldyBNYXAoKTtcclxuICByZXR1cm4gT2JqZWN0LmFzc2lnbihcclxuICAgIHt9LFxyXG4gICAgY29uc3RhbnRzLFxyXG4gICAge1xyXG4gICAgICBzZWxlY3RGcm9tQWxsUGFyZW50czogc2VsZWN0RnJvbUFsbFBhcmVudHMsXHJcbiAgICAgIGdlbmVyYXRlUmFuZG9tOiByZXF1aXJlKFwiLi9nZW5lcmF0ZVJhbmRvbVwiKSxcclxuICAgICAgcGlja1BhcmVudDogcGlja1BhcmVudC5iaW5kKHZvaWQgMCwgY3VycmVudENob2ljZXMpLFxyXG4gICAgfVxyXG4gICk7XHJcbn1cclxubW9kdWxlLmV4cG9ydHMuY29uc3RhbnRzID0gY29uc3RhbnRzXHJcbiIsInZhciBuQXR0cmlidXRlcyA9IDE1O1xyXG5tb2R1bGUuZXhwb3J0cyA9IHBpY2tQYXJlbnQ7XHJcblxyXG5mdW5jdGlvbiBwaWNrUGFyZW50KGN1cnJlbnRDaG9pY2VzLCBjaG9vc2VJZCwga2V5IC8qICwgcGFyZW50cyAqLyl7XHJcbiAgaWYoIWN1cnJlbnRDaG9pY2VzLmhhcyhjaG9vc2VJZCkpe1xyXG4gICAgY3VycmVudENob2ljZXMuc2V0KGNob29zZUlkLCBpbml0aWFsaXplUGljaygpKVxyXG4gIH1cclxuICAvLyBjb25zb2xlLmxvZyhjaG9vc2VJZCk7XHJcbiAgdmFyIHN0YXRlID0gY3VycmVudENob2ljZXMuZ2V0KGNob29zZUlkKTtcclxuICAvLyBjb25zb2xlLmxvZyhzdGF0ZS5jdXJwYXJlbnQpO1xyXG4gIHN0YXRlLmkrK1xyXG4gIGlmKFtcIndoZWVsX3JhZGl1c1wiLCBcIndoZWVsX3ZlcnRleFwiLCBcIndoZWVsX2RlbnNpdHlcIl0uaW5kZXhPZihrZXkpID4gLTEpe1xyXG4gICAgc3RhdGUuY3VycGFyZW50ID0gY3dfY2hvb3NlUGFyZW50KHN0YXRlKTtcclxuICAgIHJldHVybiBzdGF0ZS5jdXJwYXJlbnQ7XHJcbiAgfVxyXG4gIHN0YXRlLmN1cnBhcmVudCA9IGN3X2Nob29zZVBhcmVudChzdGF0ZSk7XHJcbiAgcmV0dXJuIHN0YXRlLmN1cnBhcmVudDtcclxuXHJcbiAgZnVuY3Rpb24gY3dfY2hvb3NlUGFyZW50KHN0YXRlKSB7XHJcbiAgICB2YXIgY3VycGFyZW50ID0gc3RhdGUuY3VycGFyZW50O1xyXG4gICAgdmFyIGF0dHJpYnV0ZUluZGV4ID0gc3RhdGUuaTtcclxuICAgIHZhciBzd2FwUG9pbnQxID0gc3RhdGUuc3dhcFBvaW50MVxyXG4gICAgdmFyIHN3YXBQb2ludDIgPSBzdGF0ZS5zd2FwUG9pbnQyXHJcbiAgICAvLyBjb25zb2xlLmxvZyhzd2FwUG9pbnQxLCBzd2FwUG9pbnQyLCBhdHRyaWJ1dGVJbmRleClcclxuICAgIGlmICgoc3dhcFBvaW50MSA9PSBhdHRyaWJ1dGVJbmRleCkgfHwgKHN3YXBQb2ludDIgPT0gYXR0cmlidXRlSW5kZXgpKSB7XHJcbiAgICAgIHJldHVybiBjdXJwYXJlbnQgPT0gMSA/IDAgOiAxXHJcbiAgICB9XHJcbiAgICByZXR1cm4gY3VycGFyZW50XHJcbiAgfVxyXG5cclxuICBmdW5jdGlvbiBpbml0aWFsaXplUGljaygpe1xyXG4gICAgdmFyIGN1cnBhcmVudCA9IDA7XHJcblxyXG4gICAgdmFyIHN3YXBQb2ludDEgPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAobkF0dHJpYnV0ZXMpKTtcclxuICAgIHZhciBzd2FwUG9pbnQyID0gc3dhcFBvaW50MTtcclxuICAgIHdoaWxlIChzd2FwUG9pbnQyID09IHN3YXBQb2ludDEpIHtcclxuICAgICAgc3dhcFBvaW50MiA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIChuQXR0cmlidXRlcykpO1xyXG4gICAgfVxyXG4gICAgdmFyIGkgPSAwO1xyXG4gICAgcmV0dXJuIHtcclxuICAgICAgY3VycGFyZW50OiBjdXJwYXJlbnQsXHJcbiAgICAgIGk6IGksXHJcbiAgICAgIHN3YXBQb2ludDE6IHN3YXBQb2ludDEsXHJcbiAgICAgIHN3YXBQb2ludDI6IHN3YXBQb2ludDJcclxuICAgIH1cclxuICB9XHJcbn1cclxuIiwidmFyIGdldEluYnJlZWRpbmdDb2VmZmljaWVudCA9IHJlcXVpcmUoXCIuL2luYnJlZWRpbmctY29lZmZpY2llbnRcIik7XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IHNpbXBsZVNlbGVjdDtcclxuXHJcbmZ1bmN0aW9uIHNpbXBsZVNlbGVjdChwYXJlbnRzKXtcclxuICB2YXIgdG90YWxQYXJlbnRzID0gcGFyZW50cy5sZW5ndGhcclxuICB2YXIgciA9IE1hdGgucmFuZG9tKCk7XHJcbiAgaWYgKHIgPT0gMClcclxuICAgIHJldHVybiAwO1xyXG4gIHJldHVybiBNYXRoLmZsb29yKC1NYXRoLmxvZyhyKSAqIHRvdGFsUGFyZW50cykgJSB0b3RhbFBhcmVudHM7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHNlbGVjdEZyb21BbGxQYXJlbnRzKHBhcmVudHMsIHBhcmVudExpc3QsIHByZXZpb3VzUGFyZW50SW5kZXgpIHtcclxuICB2YXIgcHJldmlvdXNQYXJlbnQgPSBwYXJlbnRzW3ByZXZpb3VzUGFyZW50SW5kZXhdO1xyXG4gIHZhciB2YWxpZFBhcmVudHMgPSBwYXJlbnRzLmZpbHRlcihmdW5jdGlvbihwYXJlbnQsIGkpe1xyXG4gICAgaWYocHJldmlvdXNQYXJlbnRJbmRleCA9PT0gaSl7XHJcbiAgICAgIHJldHVybiBmYWxzZTtcclxuICAgIH1cclxuICAgIGlmKCFwcmV2aW91c1BhcmVudCl7XHJcbiAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgfVxyXG4gICAgdmFyIGNoaWxkID0ge1xyXG4gICAgICBpZDogTWF0aC5yYW5kb20oKS50b1N0cmluZygzMiksXHJcbiAgICAgIGFuY2VzdHJ5OiBbcHJldmlvdXNQYXJlbnQsIHBhcmVudF0ubWFwKGZ1bmN0aW9uKHApe1xyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICBpZDogcC5kZWYuaWQsXHJcbiAgICAgICAgICBhbmNlc3RyeTogcC5kZWYuYW5jZXN0cnlcclxuICAgICAgICB9XHJcbiAgICAgIH0pXHJcbiAgICB9XHJcbiAgICB2YXIgaUNvID0gZ2V0SW5icmVlZGluZ0NvZWZmaWNpZW50KGNoaWxkKTtcclxuICAgIGNvbnNvbGUubG9nKFwiaW5icmVlZGluZyBjb2VmZmljaWVudFwiLCBpQ28pXHJcbiAgICBpZihpQ28gPiAwLjI1KXtcclxuICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIHRydWU7XHJcbiAgfSlcclxuICBpZih2YWxpZFBhcmVudHMubGVuZ3RoID09PSAwKXtcclxuICAgIHJldHVybiBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiBwYXJlbnRzLmxlbmd0aClcclxuICB9XHJcbiAgdmFyIHRvdGFsU2NvcmUgPSB2YWxpZFBhcmVudHMucmVkdWNlKGZ1bmN0aW9uKHN1bSwgcGFyZW50KXtcclxuICAgIHJldHVybiBzdW0gKyBwYXJlbnQuc2NvcmUudjtcclxuICB9LCAwKTtcclxuICB2YXIgciA9IHRvdGFsU2NvcmUgKiBNYXRoLnJhbmRvbSgpO1xyXG4gIGZvcih2YXIgaSA9IDA7IGkgPCB2YWxpZFBhcmVudHMubGVuZ3RoOyBpKyspe1xyXG4gICAgdmFyIHNjb3JlID0gdmFsaWRQYXJlbnRzW2ldLnNjb3JlLnY7XHJcbiAgICBpZihyID4gc2NvcmUpe1xyXG4gICAgICByID0gciAtIHNjb3JlO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgYnJlYWs7XHJcbiAgICB9XHJcbiAgfVxyXG4gIHJldHVybiBpO1xyXG59XHJcbiIsIlxyXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGNhcikge1xyXG4gIHZhciBvdXQgPSB7XHJcbiAgICBjaGFzc2lzOiBnaG9zdF9nZXRfY2hhc3NpcyhjYXIuY2hhc3NpcyksXHJcbiAgICB3aGVlbHM6IFtdLFxyXG4gICAgcG9zOiB7eDogY2FyLmNoYXNzaXMuR2V0UG9zaXRpb24oKS54LCB5OiBjYXIuY2hhc3Npcy5HZXRQb3NpdGlvbigpLnl9XHJcbiAgfTtcclxuXHJcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBjYXIud2hlZWxzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICBvdXQud2hlZWxzW2ldID0gZ2hvc3RfZ2V0X3doZWVsKGNhci53aGVlbHNbaV0pO1xyXG4gIH1cclxuXHJcbiAgcmV0dXJuIG91dDtcclxufVxyXG5cclxuZnVuY3Rpb24gZ2hvc3RfZ2V0X2NoYXNzaXMoYykge1xyXG4gIHZhciBnYyA9IFtdO1xyXG5cclxuICBmb3IgKHZhciBmID0gYy5HZXRGaXh0dXJlTGlzdCgpOyBmOyBmID0gZi5tX25leHQpIHtcclxuICAgIHZhciBzID0gZi5HZXRTaGFwZSgpO1xyXG5cclxuICAgIHZhciBwID0ge1xyXG4gICAgICB2dHg6IFtdLFxyXG4gICAgICBudW06IDBcclxuICAgIH1cclxuXHJcbiAgICBwLm51bSA9IHMubV92ZXJ0ZXhDb3VudDtcclxuXHJcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHMubV92ZXJ0ZXhDb3VudDsgaSsrKSB7XHJcbiAgICAgIHAudnR4LnB1c2goYy5HZXRXb3JsZFBvaW50KHMubV92ZXJ0aWNlc1tpXSkpO1xyXG4gICAgfVxyXG5cclxuICAgIGdjLnB1c2gocCk7XHJcbiAgfVxyXG5cclxuICByZXR1cm4gZ2M7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdob3N0X2dldF93aGVlbCh3KSB7XHJcbiAgdmFyIGd3ID0gW107XHJcblxyXG4gIGZvciAodmFyIGYgPSB3LkdldEZpeHR1cmVMaXN0KCk7IGY7IGYgPSBmLm1fbmV4dCkge1xyXG4gICAgdmFyIHMgPSBmLkdldFNoYXBlKCk7XHJcblxyXG4gICAgdmFyIGMgPSB7XHJcbiAgICAgIHBvczogdy5HZXRXb3JsZFBvaW50KHMubV9wKSxcclxuICAgICAgcmFkOiBzLm1fcmFkaXVzLFxyXG4gICAgICBhbmc6IHcubV9zd2VlcC5hXHJcbiAgICB9XHJcblxyXG4gICAgZ3cucHVzaChjKTtcclxuICB9XHJcblxyXG4gIHJldHVybiBndztcclxufVxyXG4iLCJcclxudmFyIGdob3N0X2dldF9mcmFtZSA9IHJlcXVpcmUoXCIuL2Nhci10by1naG9zdC5qc1wiKTtcclxuXHJcbnZhciBlbmFibGVfZ2hvc3QgPSB0cnVlO1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSB7XHJcbiAgZ2hvc3RfY3JlYXRlX3JlcGxheTogZ2hvc3RfY3JlYXRlX3JlcGxheSxcclxuICBnaG9zdF9jcmVhdGVfZ2hvc3Q6IGdob3N0X2NyZWF0ZV9naG9zdCxcclxuICBnaG9zdF9wYXVzZTogZ2hvc3RfcGF1c2UsXHJcbiAgZ2hvc3RfcmVzdW1lOiBnaG9zdF9yZXN1bWUsXHJcbiAgZ2hvc3RfZ2V0X3Bvc2l0aW9uOiBnaG9zdF9nZXRfcG9zaXRpb24sXHJcbiAgZ2hvc3RfY29tcGFyZV90b19yZXBsYXk6IGdob3N0X2NvbXBhcmVfdG9fcmVwbGF5LFxyXG4gIGdob3N0X21vdmVfZnJhbWU6IGdob3N0X21vdmVfZnJhbWUsXHJcbiAgZ2hvc3RfYWRkX3JlcGxheV9mcmFtZTogZ2hvc3RfYWRkX3JlcGxheV9mcmFtZSxcclxuICBnaG9zdF9kcmF3X2ZyYW1lOiBnaG9zdF9kcmF3X2ZyYW1lLFxyXG4gIGdob3N0X3Jlc2V0X2dob3N0OiBnaG9zdF9yZXNldF9naG9zdFxyXG59XHJcblxyXG5mdW5jdGlvbiBnaG9zdF9jcmVhdGVfcmVwbGF5KCkge1xyXG4gIGlmICghZW5hYmxlX2dob3N0KVxyXG4gICAgcmV0dXJuIG51bGw7XHJcblxyXG4gIHJldHVybiB7XHJcbiAgICBudW1fZnJhbWVzOiAwLFxyXG4gICAgZnJhbWVzOiBbXSxcclxuICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdob3N0X2NyZWF0ZV9naG9zdCgpIHtcclxuICBpZiAoIWVuYWJsZV9naG9zdClcclxuICAgIHJldHVybiBudWxsO1xyXG5cclxuICByZXR1cm4ge1xyXG4gICAgcmVwbGF5OiBudWxsLFxyXG4gICAgZnJhbWU6IDAsXHJcbiAgICBkaXN0OiAtMTAwXHJcbiAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBnaG9zdF9yZXNldF9naG9zdChnaG9zdCkge1xyXG4gIGlmICghZW5hYmxlX2dob3N0KVxyXG4gICAgcmV0dXJuO1xyXG4gIGlmIChnaG9zdCA9PSBudWxsKVxyXG4gICAgcmV0dXJuO1xyXG4gIGdob3N0LmZyYW1lID0gMDtcclxufVxyXG5cclxuZnVuY3Rpb24gZ2hvc3RfcGF1c2UoZ2hvc3QpIHtcclxuICBpZiAoZ2hvc3QgIT0gbnVsbClcclxuICAgIGdob3N0Lm9sZF9mcmFtZSA9IGdob3N0LmZyYW1lO1xyXG4gIGdob3N0X3Jlc2V0X2dob3N0KGdob3N0KTtcclxufVxyXG5cclxuZnVuY3Rpb24gZ2hvc3RfcmVzdW1lKGdob3N0KSB7XHJcbiAgaWYgKGdob3N0ICE9IG51bGwpXHJcbiAgICBnaG9zdC5mcmFtZSA9IGdob3N0Lm9sZF9mcmFtZTtcclxufVxyXG5cclxuZnVuY3Rpb24gZ2hvc3RfZ2V0X3Bvc2l0aW9uKGdob3N0KSB7XHJcbiAgaWYgKCFlbmFibGVfZ2hvc3QpXHJcbiAgICByZXR1cm47XHJcbiAgaWYgKGdob3N0ID09IG51bGwpXHJcbiAgICByZXR1cm47XHJcbiAgaWYgKGdob3N0LmZyYW1lIDwgMClcclxuICAgIHJldHVybjtcclxuICBpZiAoZ2hvc3QucmVwbGF5ID09IG51bGwpXHJcbiAgICByZXR1cm47XHJcbiAgdmFyIGZyYW1lID0gZ2hvc3QucmVwbGF5LmZyYW1lc1tnaG9zdC5mcmFtZV07XHJcbiAgcmV0dXJuIGZyYW1lLnBvcztcclxufVxyXG5cclxuZnVuY3Rpb24gZ2hvc3RfY29tcGFyZV90b19yZXBsYXkocmVwbGF5LCBnaG9zdCwgbWF4KSB7XHJcbiAgaWYgKCFlbmFibGVfZ2hvc3QpXHJcbiAgICByZXR1cm47XHJcbiAgaWYgKGdob3N0ID09IG51bGwpXHJcbiAgICByZXR1cm47XHJcbiAgaWYgKHJlcGxheSA9PSBudWxsKVxyXG4gICAgcmV0dXJuO1xyXG5cclxuICBpZiAoZ2hvc3QuZGlzdCA8IG1heCkge1xyXG4gICAgZ2hvc3QucmVwbGF5ID0gcmVwbGF5O1xyXG4gICAgZ2hvc3QuZGlzdCA9IG1heDtcclxuICAgIGdob3N0LmZyYW1lID0gMDtcclxuICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdob3N0X21vdmVfZnJhbWUoZ2hvc3QpIHtcclxuICBpZiAoIWVuYWJsZV9naG9zdClcclxuICAgIHJldHVybjtcclxuICBpZiAoZ2hvc3QgPT0gbnVsbClcclxuICAgIHJldHVybjtcclxuICBpZiAoZ2hvc3QucmVwbGF5ID09IG51bGwpXHJcbiAgICByZXR1cm47XHJcbiAgZ2hvc3QuZnJhbWUrKztcclxuICBpZiAoZ2hvc3QuZnJhbWUgPj0gZ2hvc3QucmVwbGF5Lm51bV9mcmFtZXMpXHJcbiAgICBnaG9zdC5mcmFtZSA9IGdob3N0LnJlcGxheS5udW1fZnJhbWVzIC0gMTtcclxufVxyXG5cclxuZnVuY3Rpb24gZ2hvc3RfYWRkX3JlcGxheV9mcmFtZShyZXBsYXksIGNhcikge1xyXG4gIGlmICghZW5hYmxlX2dob3N0KVxyXG4gICAgcmV0dXJuO1xyXG4gIGlmIChyZXBsYXkgPT0gbnVsbClcclxuICAgIHJldHVybjtcclxuXHJcbiAgdmFyIGZyYW1lID0gZ2hvc3RfZ2V0X2ZyYW1lKGNhcik7XHJcbiAgcmVwbGF5LmZyYW1lcy5wdXNoKGZyYW1lKTtcclxuICByZXBsYXkubnVtX2ZyYW1lcysrO1xyXG59XHJcblxyXG5mdW5jdGlvbiBnaG9zdF9kcmF3X2ZyYW1lKGN0eCwgZ2hvc3QsIGNhbWVyYSkge1xyXG4gIHZhciB6b29tID0gY2FtZXJhLnpvb207XHJcbiAgaWYgKCFlbmFibGVfZ2hvc3QpXHJcbiAgICByZXR1cm47XHJcbiAgaWYgKGdob3N0ID09IG51bGwpXHJcbiAgICByZXR1cm47XHJcbiAgaWYgKGdob3N0LmZyYW1lIDwgMClcclxuICAgIHJldHVybjtcclxuICBpZiAoZ2hvc3QucmVwbGF5ID09IG51bGwpXHJcbiAgICByZXR1cm47XHJcblxyXG4gIHZhciBmcmFtZSA9IGdob3N0LnJlcGxheS5mcmFtZXNbZ2hvc3QuZnJhbWVdO1xyXG5cclxuICAvLyB3aGVlbCBzdHlsZVxyXG4gIGN0eC5maWxsU3R5bGUgPSBcIiNlZWVcIjtcclxuICBjdHguc3Ryb2tlU3R5bGUgPSBcIiNhYWFcIjtcclxuICBjdHgubGluZVdpZHRoID0gMSAvIHpvb207XHJcblxyXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgZnJhbWUud2hlZWxzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICBmb3IgKHZhciB3IGluIGZyYW1lLndoZWVsc1tpXSkge1xyXG4gICAgICBnaG9zdF9kcmF3X2NpcmNsZShjdHgsIGZyYW1lLndoZWVsc1tpXVt3XS5wb3MsIGZyYW1lLndoZWVsc1tpXVt3XS5yYWQsIGZyYW1lLndoZWVsc1tpXVt3XS5hbmcpO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLy8gY2hhc3NpcyBzdHlsZVxyXG4gIGN0eC5zdHJva2VTdHlsZSA9IFwiI2FhYVwiO1xyXG4gIGN0eC5maWxsU3R5bGUgPSBcIiNlZWVcIjtcclxuICBjdHgubGluZVdpZHRoID0gMSAvIHpvb207XHJcbiAgY3R4LmJlZ2luUGF0aCgpO1xyXG4gIGZvciAodmFyIGMgaW4gZnJhbWUuY2hhc3NpcylcclxuICAgIGdob3N0X2RyYXdfcG9seShjdHgsIGZyYW1lLmNoYXNzaXNbY10udnR4LCBmcmFtZS5jaGFzc2lzW2NdLm51bSk7XHJcbiAgY3R4LmZpbGwoKTtcclxuICBjdHguc3Ryb2tlKCk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdob3N0X2RyYXdfcG9seShjdHgsIHZ0eCwgbl92dHgpIHtcclxuICBjdHgubW92ZVRvKHZ0eFswXS54LCB2dHhbMF0ueSk7XHJcbiAgZm9yICh2YXIgaSA9IDE7IGkgPCBuX3Z0eDsgaSsrKSB7XHJcbiAgICBjdHgubGluZVRvKHZ0eFtpXS54LCB2dHhbaV0ueSk7XHJcbiAgfVxyXG4gIGN0eC5saW5lVG8odnR4WzBdLngsIHZ0eFswXS55KTtcclxufVxyXG5cclxuZnVuY3Rpb24gZ2hvc3RfZHJhd19jaXJjbGUoY3R4LCBjZW50ZXIsIHJhZGl1cywgYW5nbGUpIHtcclxuICBjdHguYmVnaW5QYXRoKCk7XHJcbiAgY3R4LmFyYyhjZW50ZXIueCwgY2VudGVyLnksIHJhZGl1cywgMCwgMiAqIE1hdGguUEksIHRydWUpO1xyXG5cclxuICBjdHgubW92ZVRvKGNlbnRlci54LCBjZW50ZXIueSk7XHJcbiAgY3R4LmxpbmVUbyhjZW50ZXIueCArIHJhZGl1cyAqIE1hdGguY29zKGFuZ2xlKSwgY2VudGVyLnkgKyByYWRpdXMgKiBNYXRoLnNpbihhbmdsZSkpO1xyXG5cclxuICBjdHguZmlsbCgpO1xyXG4gIGN0eC5zdHJva2UoKTtcclxufVxyXG4iLCIvKiBnbG9iYWxzIGRvY3VtZW50IHBlcmZvcm1hbmNlIGxvY2FsU3RvcmFnZSBhbGVydCBjb25maXJtIGJ0b2EgSFRNTERpdkVsZW1lbnQgKi9cclxuLyogZ2xvYmFscyBiMlZlYzIgKi9cclxuLy8gR2xvYmFsIFZhcnNcclxudmFyIHRlc3RpbmcgPSB0cnVlOy8vIGpvYjY0LCBib29sZWFuIGlmIHRoZSBwcm9ncmFtIGlzIHVzZWQgdG8gb3V0cHV0IHRlc3QgZGF0YSB0byBsb2NhbCBzdG9yYWdlLlxyXG5cclxuXHJcbnZhciB3b3JsZFJ1biA9IHJlcXVpcmUoXCIuL3dvcmxkL3J1bi5qc1wiKTtcclxudmFyIGNhckNvbnN0cnVjdCA9IHJlcXVpcmUoXCIuL2Nhci1zY2hlbWEvY29uc3RydWN0LmpzXCIpO1xyXG5cclxudmFyIG1hbmFnZVJvdW5kID0gcmVxdWlyZShcIi4vbWFjaGluZS1sZWFybmluZy9nZW5ldGljLWFsZ29yaXRobS9tYW5hZ2Utcm91bmQuanNcIik7XHJcblxyXG52YXIgZ2hvc3RfZm5zID0gcmVxdWlyZShcIi4vZ2hvc3QvaW5kZXguanNcIik7XHJcblxyXG52YXIgZHJhd0NhciA9IHJlcXVpcmUoXCIuL2RyYXcvZHJhdy1jYXIuanNcIik7XHJcbnZhciBncmFwaF9mbnMgPSByZXF1aXJlKFwiLi9kcmF3L3Bsb3QtZ3JhcGhzLmpzXCIpO1xyXG52YXIgcGxvdF9ncmFwaHMgPSBncmFwaF9mbnMucGxvdEdyYXBocztcclxudmFyIGN3X2NsZWFyR3JhcGhpY3MgPSBncmFwaF9mbnMuY2xlYXJHcmFwaGljcztcclxudmFyIGN3X2RyYXdGbG9vciA9IHJlcXVpcmUoXCIuL2RyYXcvZHJhdy1mbG9vci5qc1wiKTtcclxuXHJcbnZhciBnaG9zdF9kcmF3X2ZyYW1lID0gZ2hvc3RfZm5zLmdob3N0X2RyYXdfZnJhbWU7XHJcbnZhciBnaG9zdF9jcmVhdGVfZ2hvc3QgPSBnaG9zdF9mbnMuZ2hvc3RfY3JlYXRlX2dob3N0O1xyXG52YXIgZ2hvc3RfYWRkX3JlcGxheV9mcmFtZSA9IGdob3N0X2Zucy5naG9zdF9hZGRfcmVwbGF5X2ZyYW1lO1xyXG52YXIgZ2hvc3RfY29tcGFyZV90b19yZXBsYXkgPSBnaG9zdF9mbnMuZ2hvc3RfY29tcGFyZV90b19yZXBsYXk7XHJcbnZhciBnaG9zdF9nZXRfcG9zaXRpb24gPSBnaG9zdF9mbnMuZ2hvc3RfZ2V0X3Bvc2l0aW9uO1xyXG52YXIgZ2hvc3RfbW92ZV9mcmFtZSA9IGdob3N0X2Zucy5naG9zdF9tb3ZlX2ZyYW1lO1xyXG52YXIgZ2hvc3RfcmVzZXRfZ2hvc3QgPSBnaG9zdF9mbnMuZ2hvc3RfcmVzZXRfZ2hvc3RcclxudmFyIGdob3N0X3BhdXNlID0gZ2hvc3RfZm5zLmdob3N0X3BhdXNlO1xyXG52YXIgZ2hvc3RfcmVzdW1lID0gZ2hvc3RfZm5zLmdob3N0X3Jlc3VtZTtcclxudmFyIGdob3N0X2NyZWF0ZV9yZXBsYXkgPSBnaG9zdF9mbnMuZ2hvc3RfY3JlYXRlX3JlcGxheTtcclxuXHJcbnZhciBjd19DYXIgPSByZXF1aXJlKFwiLi9kcmF3L2RyYXctY2FyLXN0YXRzLmpzXCIpO1xyXG52YXIgZ2hvc3Q7XHJcbnZhciBjYXJNYXAgPSBuZXcgTWFwKCk7XHJcblxyXG52YXIgZG9EcmF3ID0gdHJ1ZTtcclxudmFyIGN3X3BhdXNlZCA9IGZhbHNlO1xyXG5cclxudmFyIGJveDJkZnBzID0gNjA7XHJcbnZhciBzY3JlZW5mcHMgPSA2MDtcclxudmFyIHNraXBUaWNrcyA9IE1hdGgucm91bmQoMTAwMCAvIGJveDJkZnBzKTtcclxudmFyIG1heEZyYW1lU2tpcCA9IHNraXBUaWNrcyAqIDI7XHJcblxyXG52YXIgY2FudmFzID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJtYWluYm94XCIpO1xyXG52YXIgY3R4ID0gY2FudmFzLmdldENvbnRleHQoXCIyZFwiKTtcclxuXHJcbnZhciBjYW1lcmEgPSB7XHJcbiAgc3BlZWQ6IDAuMDUsXHJcbiAgcG9zOiB7XHJcbiAgICB4OiAwLCB5OiAwXHJcbiAgfSxcclxuICB0YXJnZXQ6IC0xLFxyXG4gIHpvb206IDcwXHJcbn1cclxuXHJcbnZhciBtaW5pbWFwY2FtZXJhID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJtaW5pbWFwY2FtZXJhXCIpLnN0eWxlO1xyXG52YXIgbWluaW1hcGhvbGRlciA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoXCIjbWluaW1hcGhvbGRlclwiKTtcclxuXHJcbnZhciBtaW5pbWFwY2FudmFzID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJtaW5pbWFwXCIpO1xyXG52YXIgbWluaW1hcGN0eCA9IG1pbmltYXBjYW52YXMuZ2V0Q29udGV4dChcIjJkXCIpO1xyXG52YXIgbWluaW1hcHNjYWxlID0gMztcclxudmFyIG1pbmltYXBmb2dkaXN0YW5jZSA9IDA7XHJcbnZhciBmb2dkaXN0YW5jZSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwibWluaW1hcGZvZ1wiKS5zdHlsZTtcclxuXHJcblxyXG52YXIgY2FyQ29uc3RhbnRzID0gY2FyQ29uc3RydWN0LmNhckNvbnN0YW50cygpO1xyXG5cclxuXHJcbnZhciBtYXhfY2FyX2hlYWx0aCA9IGJveDJkZnBzICogMTA7XHJcblxyXG52YXIgY3dfZ2hvc3RSZXBsYXlJbnRlcnZhbCA9IG51bGw7XHJcblxyXG52YXIgZGlzdGFuY2VNZXRlciA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiZGlzdGFuY2VtZXRlclwiKTtcclxudmFyIGhlaWdodE1ldGVyID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJoZWlnaHRtZXRlclwiKTtcclxuXHJcbnZhciBsZWFkZXJQb3NpdGlvbiA9IHtcclxuICB4OiAwLCB5OiAwXHJcbn1cclxuXHJcbm1pbmltYXBjYW1lcmEud2lkdGggPSAxMiAqIG1pbmltYXBzY2FsZSArIFwicHhcIjtcclxubWluaW1hcGNhbWVyYS5oZWlnaHQgPSA2ICogbWluaW1hcHNjYWxlICsgXCJweFwiO1xyXG5cclxuXHJcbi8vID09PT09PT0gV09STEQgU1RBVEUgPT09PT09XHJcbnZhciBnZW5lcmF0aW9uQ29uZmlnID0gcmVxdWlyZShcIi4vZ2VuZXJhdGlvbi1jb25maWdcIik7XHJcblxyXG5cclxudmFyIHdvcmxkX2RlZiA9IHtcclxuICBncmF2aXR5OiBuZXcgYjJWZWMyKDAuMCwgLTkuODEpLFxyXG4gIGRvU2xlZXA6IHRydWUsXHJcbiAgZmxvb3JzZWVkOiBidG9hKE1hdGguc2VlZHJhbmRvbSgpKSxcclxuICB0aWxlRGltZW5zaW9uczogbmV3IGIyVmVjMigxLjUsIDAuMTUpLFxyXG4gIG1heEZsb29yVGlsZXM6IDIwMCxcclxuICBtdXRhYmxlX2Zsb29yOiBmYWxzZSxcclxuICBib3gyZGZwczogYm94MmRmcHMsXHJcbiAgbW90b3JTcGVlZDogMjAsXHJcbiAgbWF4X2Nhcl9oZWFsdGg6IG1heF9jYXJfaGVhbHRoLFxyXG4gIHNjaGVtYTogZ2VuZXJhdGlvbkNvbmZpZy5jb25zdGFudHMuc2NoZW1hXHJcbn1cclxuXHJcbnZhciBjd19kZWFkQ2FycztcclxuXHJcbnZhciBhcnJPZkdyYXBoU3RhdGVzID0gW107XHJcblxyXG52YXIgZ3JhcGhTdGF0ZSA9IHtcclxuICBjd190b3BTY29yZXM6IFtdLFxyXG4gIGN3X2dyYXBoQXZlcmFnZTogW10sXHJcbiAgY3dfZ3JhcGhFbGl0ZTogW10sXHJcbiAgY3dfZ3JhcGhUb3A6IFtdLFxyXG59O1xyXG5cclxuZnVuY3Rpb24gcmVzZXRHcmFwaFN0YXRlKCl7XHJcbiAgZ3JhcGhTdGF0ZSA9IHtcclxuICAgIGN3X3RvcFNjb3JlczogW10sXHJcbiAgICBjd19ncmFwaEF2ZXJhZ2U6IFtdLFxyXG4gICAgY3dfZ3JhcGhFbGl0ZTogW10sXHJcbiAgICBjd19ncmFwaFRvcDogW10sXHJcbiAgfTtcclxufVxyXG5cclxuXHJcblxyXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PVxyXG5cclxudmFyIGdlbmVyYXRpb25TdGF0ZTtcclxuXHJcbi8vID09PT09PT09IEFjdGl2aXR5IFN0YXRlID09PT1cclxudmFyIGN1cnJlbnRSdW5uZXI7XHJcbnZhciBsb29wcyA9IDA7XHJcbnZhciBuZXh0R2FtZVRpY2sgPSAobmV3IERhdGUpLmdldFRpbWUoKTtcclxuXHJcbmZ1bmN0aW9uIHNob3dEaXN0YW5jZShkaXN0YW5jZSwgaGVpZ2h0KSB7XHJcbiAgZGlzdGFuY2VNZXRlci5pbm5lckhUTUwgPSBkaXN0YW5jZSArIFwiIG1ldGVyczxiciAvPlwiO1xyXG4gIGhlaWdodE1ldGVyLmlubmVySFRNTCA9IGhlaWdodCArIFwiIG1ldGVyc1wiO1xyXG4gIGlmIChkaXN0YW5jZSA+IG1pbmltYXBmb2dkaXN0YW5jZSkge1xyXG4gICAgZm9nZGlzdGFuY2Uud2lkdGggPSA4MDAgLSBNYXRoLnJvdW5kKGRpc3RhbmNlICsgMTUpICogbWluaW1hcHNjYWxlICsgXCJweFwiO1xyXG4gICAgbWluaW1hcGZvZ2Rpc3RhbmNlID0gZGlzdGFuY2U7XHJcbiAgfVxyXG59XHJcblxyXG5cclxuXHJcbi8qID09PSBFTkQgQ2FyID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0gKi9cclxuLyogPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSAqL1xyXG5cclxuXHJcbi8qID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0gKi9cclxuLyogPT09PSBHZW5lcmF0aW9uID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSAqL1xyXG5cclxuZnVuY3Rpb24gY3dfZ2VuZXJhdGlvblplcm8oKSB7XHJcblxyXG4gIGdlbmVyYXRpb25TdGF0ZSA9IG1hbmFnZVJvdW5kLmdlbmVyYXRpb25aZXJvKGdlbmVyYXRpb25Db25maWcoKSk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHJlc2V0Q2FyVUkoKXtcclxuICBjd19kZWFkQ2FycyA9IDA7XHJcbiAgbGVhZGVyUG9zaXRpb24gPSB7XHJcbiAgICB4OiAwLCB5OiAwXHJcbiAgfTtcclxuICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImdlbmVyYXRpb25cIikuaW5uZXJIVE1MID0gZ2VuZXJhdGlvblN0YXRlLmNvdW50ZXIudG9TdHJpbmcoKTtcclxuICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImNhcnNcIikuaW5uZXJIVE1MID0gXCJcIjtcclxuICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInBvcHVsYXRpb25cIikuaW5uZXJIVE1MID0gZ2VuZXJhdGlvbkNvbmZpZy5jb25zdGFudHMuZ2VuZXJhdGlvblNpemUudG9TdHJpbmcoKTtcclxufVxyXG5cclxuLyogPT09PSBFTkQgR2VucmF0aW9uID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSAqL1xyXG4vKiA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09ICovXHJcblxyXG4vKiA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09ICovXHJcbi8qID09PT0gRHJhd2luZyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0gKi9cclxuXHJcbmZ1bmN0aW9uIGN3X2RyYXdTY3JlZW4oKSB7XHJcbiAgdmFyIGZsb29yVGlsZXMgPSBjdXJyZW50UnVubmVyLnNjZW5lLmZsb29yVGlsZXM7XHJcbiAgY3R4LmNsZWFyUmVjdCgwLCAwLCBjYW52YXMud2lkdGgsIGNhbnZhcy5oZWlnaHQpO1xyXG4gIGN0eC5zYXZlKCk7XHJcbiAgY3dfc2V0Q2FtZXJhUG9zaXRpb24oKTtcclxuICB2YXIgY2FtZXJhX3ggPSBjYW1lcmEucG9zLng7XHJcbiAgdmFyIGNhbWVyYV95ID0gY2FtZXJhLnBvcy55O1xyXG4gIHZhciB6b29tID0gY2FtZXJhLnpvb207XHJcbiAgY3R4LnRyYW5zbGF0ZSgyMDAgLSAoY2FtZXJhX3ggKiB6b29tKSwgMjAwICsgKGNhbWVyYV95ICogem9vbSkpO1xyXG4gIGN0eC5zY2FsZSh6b29tLCAtem9vbSk7XHJcbiAgY3dfZHJhd0Zsb29yKGN0eCwgY2FtZXJhLCBmbG9vclRpbGVzKTtcclxuICBnaG9zdF9kcmF3X2ZyYW1lKGN0eCwgZ2hvc3QsIGNhbWVyYSk7XHJcbiAgY3dfZHJhd0NhcnMoKTtcclxuICBjdHgucmVzdG9yZSgpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBjd19taW5pbWFwQ2FtZXJhKC8qIHgsIHkqLykge1xyXG4gIHZhciBjYW1lcmFfeCA9IGNhbWVyYS5wb3MueFxyXG4gIHZhciBjYW1lcmFfeSA9IGNhbWVyYS5wb3MueVxyXG4gIG1pbmltYXBjYW1lcmEubGVmdCA9IE1hdGgucm91bmQoKDIgKyBjYW1lcmFfeCkgKiBtaW5pbWFwc2NhbGUpICsgXCJweFwiO1xyXG4gIG1pbmltYXBjYW1lcmEudG9wID0gTWF0aC5yb3VuZCgoMzEgLSBjYW1lcmFfeSkgKiBtaW5pbWFwc2NhbGUpICsgXCJweFwiO1xyXG59XHJcblxyXG5mdW5jdGlvbiBjd19zZXRDYW1lcmFUYXJnZXQoaykge1xyXG4gIGNhbWVyYS50YXJnZXQgPSBrO1xyXG59XHJcblxyXG5mdW5jdGlvbiBjd19zZXRDYW1lcmFQb3NpdGlvbigpIHtcclxuICB2YXIgY2FtZXJhVGFyZ2V0UG9zaXRpb25cclxuICBpZiAoY2FtZXJhLnRhcmdldCAhPT0gLTEpIHtcclxuICAgIGNhbWVyYVRhcmdldFBvc2l0aW9uID0gY2FyTWFwLmdldChjYW1lcmEudGFyZ2V0KS5nZXRQb3NpdGlvbigpO1xyXG4gIH0gZWxzZSB7XHJcbiAgICBjYW1lcmFUYXJnZXRQb3NpdGlvbiA9IGxlYWRlclBvc2l0aW9uO1xyXG4gIH1cclxuICB2YXIgZGlmZl95ID0gY2FtZXJhLnBvcy55IC0gY2FtZXJhVGFyZ2V0UG9zaXRpb24ueTtcclxuICB2YXIgZGlmZl94ID0gY2FtZXJhLnBvcy54IC0gY2FtZXJhVGFyZ2V0UG9zaXRpb24ueDtcclxuICBjYW1lcmEucG9zLnkgLT0gY2FtZXJhLnNwZWVkICogZGlmZl95O1xyXG4gIGNhbWVyYS5wb3MueCAtPSBjYW1lcmEuc3BlZWQgKiBkaWZmX3g7XHJcbiAgY3dfbWluaW1hcENhbWVyYShjYW1lcmEucG9zLngsIGNhbWVyYS5wb3MueSk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGN3X2RyYXdHaG9zdFJlcGxheSgpIHtcclxuICB2YXIgZmxvb3JUaWxlcyA9IGN1cnJlbnRSdW5uZXIuc2NlbmUuZmxvb3JUaWxlcztcclxuICB2YXIgY2FyUG9zaXRpb24gPSBnaG9zdF9nZXRfcG9zaXRpb24oZ2hvc3QpO1xyXG4gIGNhbWVyYS5wb3MueCA9IGNhclBvc2l0aW9uLng7XHJcbiAgY2FtZXJhLnBvcy55ID0gY2FyUG9zaXRpb24ueTtcclxuICBjd19taW5pbWFwQ2FtZXJhKGNhbWVyYS5wb3MueCwgY2FtZXJhLnBvcy55KTtcclxuICBzaG93RGlzdGFuY2UoXHJcbiAgICBNYXRoLnJvdW5kKGNhclBvc2l0aW9uLnggKiAxMDApIC8gMTAwLFxyXG4gICAgTWF0aC5yb3VuZChjYXJQb3NpdGlvbi55ICogMTAwKSAvIDEwMFxyXG4gICk7XHJcbiAgY3R4LmNsZWFyUmVjdCgwLCAwLCBjYW52YXMud2lkdGgsIGNhbnZhcy5oZWlnaHQpO1xyXG4gIGN0eC5zYXZlKCk7XHJcbiAgY3R4LnRyYW5zbGF0ZShcclxuICAgIDIwMCAtIChjYXJQb3NpdGlvbi54ICogY2FtZXJhLnpvb20pLFxyXG4gICAgMjAwICsgKGNhclBvc2l0aW9uLnkgKiBjYW1lcmEuem9vbSlcclxuICApO1xyXG4gIGN0eC5zY2FsZShjYW1lcmEuem9vbSwgLWNhbWVyYS56b29tKTtcclxuICBnaG9zdF9kcmF3X2ZyYW1lKGN0eCwgZ2hvc3QpO1xyXG4gIGdob3N0X21vdmVfZnJhbWUoZ2hvc3QpO1xyXG4gIGN3X2RyYXdGbG9vcihjdHgsIGNhbWVyYSwgZmxvb3JUaWxlcyk7XHJcbiAgY3R4LnJlc3RvcmUoKTtcclxufVxyXG5cclxuXHJcbmZ1bmN0aW9uIGN3X2RyYXdDYXJzKCkge1xyXG4gIHZhciBjd19jYXJBcnJheSA9IEFycmF5LmZyb20oY2FyTWFwLnZhbHVlcygpKTtcclxuICBmb3IgKHZhciBrID0gKGN3X2NhckFycmF5Lmxlbmd0aCAtIDEpOyBrID49IDA7IGstLSkge1xyXG4gICAgdmFyIG15Q2FyID0gY3dfY2FyQXJyYXlba107XHJcbiAgICBkcmF3Q2FyKGNhckNvbnN0YW50cywgbXlDYXIsIGNhbWVyYSwgY3R4KVxyXG4gIH1cclxufVxyXG5cclxuZnVuY3Rpb24gdG9nZ2xlRGlzcGxheSgpIHtcclxuICBjYW52YXMud2lkdGggPSBjYW52YXMud2lkdGg7XHJcbiAgaWYgKGRvRHJhdykge1xyXG4gICAgZG9EcmF3ID0gZmFsc2U7XHJcbiAgICBjd19zdG9wU2ltdWxhdGlvbigpO1xyXG4gICAgY3dfcnVubmluZ0ludGVydmFsID0gc2V0SW50ZXJ2YWwoZnVuY3Rpb24gKCkge1xyXG4gICAgICB2YXIgdGltZSA9IHBlcmZvcm1hbmNlLm5vdygpICsgKDEwMDAgLyBzY3JlZW5mcHMpO1xyXG4gICAgICB3aGlsZSAodGltZSA+IHBlcmZvcm1hbmNlLm5vdygpKSB7XHJcbiAgICAgICAgc2ltdWxhdGlvblN0ZXAoKTtcclxuICAgICAgfVxyXG4gICAgfSwgMSk7XHJcbiAgfSBlbHNlIHtcclxuICAgIGRvRHJhdyA9IHRydWU7XHJcbiAgICBjbGVhckludGVydmFsKGN3X3J1bm5pbmdJbnRlcnZhbCk7XHJcbiAgICBjd19zdGFydFNpbXVsYXRpb24oKTtcclxuICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGN3X2RyYXdNaW5pTWFwKCkge1xyXG4gIHZhciBmbG9vclRpbGVzID0gY3VycmVudFJ1bm5lci5zY2VuZS5mbG9vclRpbGVzO1xyXG4gIHZhciBsYXN0X3RpbGUgPSBudWxsO1xyXG4gIHZhciB0aWxlX3Bvc2l0aW9uID0gbmV3IGIyVmVjMigtNSwgMCk7XHJcbiAgbWluaW1hcGZvZ2Rpc3RhbmNlID0gMDtcclxuICBmb2dkaXN0YW5jZS53aWR0aCA9IFwiODAwcHhcIjtcclxuICBtaW5pbWFwY2FudmFzLndpZHRoID0gbWluaW1hcGNhbnZhcy53aWR0aDtcclxuICBtaW5pbWFwY3R4LnN0cm9rZVN0eWxlID0gXCIjM0Y3MkFGXCI7XHJcbiAgbWluaW1hcGN0eC5iZWdpblBhdGgoKTtcclxuICBtaW5pbWFwY3R4Lm1vdmVUbygwLCAzNSAqIG1pbmltYXBzY2FsZSk7XHJcbiAgZm9yICh2YXIgayA9IDA7IGsgPCBmbG9vclRpbGVzLmxlbmd0aDsgaysrKSB7XHJcbiAgICBsYXN0X3RpbGUgPSBmbG9vclRpbGVzW2tdO1xyXG4gICAgdmFyIGxhc3RfZml4dHVyZSA9IGxhc3RfdGlsZS5HZXRGaXh0dXJlTGlzdCgpO1xyXG4gICAgdmFyIGxhc3Rfd29ybGRfY29vcmRzID0gbGFzdF90aWxlLkdldFdvcmxkUG9pbnQobGFzdF9maXh0dXJlLkdldFNoYXBlKCkubV92ZXJ0aWNlc1szXSk7XHJcbiAgICB0aWxlX3Bvc2l0aW9uID0gbGFzdF93b3JsZF9jb29yZHM7XHJcbiAgICBtaW5pbWFwY3R4LmxpbmVUbygodGlsZV9wb3NpdGlvbi54ICsgNSkgKiBtaW5pbWFwc2NhbGUsICgtdGlsZV9wb3NpdGlvbi55ICsgMzUpICogbWluaW1hcHNjYWxlKTtcclxuICB9XHJcbiAgbWluaW1hcGN0eC5zdHJva2UoKTtcclxufVxyXG5cclxuLyogPT09PSBFTkQgRHJhd2luZyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSAqL1xyXG4vKiA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09ICovXHJcbnZhciB1aUxpc3RlbmVycyA9IHtcclxuICBwcmVDYXJTdGVwOiBmdW5jdGlvbigpe1xyXG4gICAgZ2hvc3RfbW92ZV9mcmFtZShnaG9zdCk7XHJcbiAgfSxcclxuICBjYXJTdGVwKGNhcil7XHJcbiAgICB1cGRhdGVDYXJVSShjYXIpO1xyXG4gIH0sXHJcbiAgY2FyRGVhdGgoY2FySW5mbyl7XHJcblxyXG4gICAgdmFyIGsgPSBjYXJJbmZvLmluZGV4O1xyXG5cclxuICAgIHZhciBjYXIgPSBjYXJJbmZvLmNhciwgc2NvcmUgPSBjYXJJbmZvLnNjb3JlO1xyXG4gICAgY2FyTWFwLmdldChjYXJJbmZvKS5raWxsKGN1cnJlbnRSdW5uZXIsIHdvcmxkX2RlZik7XHJcblxyXG4gICAgLy8gcmVmb2N1cyBjYW1lcmEgdG8gbGVhZGVyIG9uIGRlYXRoXHJcbiAgICBpZiAoY2FtZXJhLnRhcmdldCA9PSBjYXJJbmZvKSB7XHJcbiAgICAgIGN3X3NldENhbWVyYVRhcmdldCgtMSk7XHJcbiAgICB9XHJcbiAgICAvLyBjb25zb2xlLmxvZyhzY29yZSk7XHJcbiAgICBjYXJNYXAuZGVsZXRlKGNhckluZm8pO1xyXG4gICAgZ2hvc3RfY29tcGFyZV90b19yZXBsYXkoY2FyLnJlcGxheSwgZ2hvc3QsIHNjb3JlLnYpO1xyXG4gICAgc2NvcmUuaSA9IGdlbmVyYXRpb25TdGF0ZS5jb3VudGVyO1xyXG5cclxuICAgIGN3X2RlYWRDYXJzKys7XHJcbiAgICB2YXIgZ2VuZXJhdGlvblNpemUgPSBnZW5lcmF0aW9uQ29uZmlnLmNvbnN0YW50cy5nZW5lcmF0aW9uU2l6ZTtcclxuICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwicG9wdWxhdGlvblwiKS5pbm5lckhUTUwgPSAoZ2VuZXJhdGlvblNpemUgLSBjd19kZWFkQ2FycykudG9TdHJpbmcoKTtcclxuXHJcbiAgICAvLyBjb25zb2xlLmxvZyhsZWFkZXJQb3NpdGlvbi5sZWFkZXIsIGspXHJcbiAgICBpZiAobGVhZGVyUG9zaXRpb24ubGVhZGVyID09IGspIHtcclxuICAgICAgLy8gbGVhZGVyIGlzIGRlYWQsIGZpbmQgbmV3IGxlYWRlclxyXG4gICAgICBjd19maW5kTGVhZGVyKCk7XHJcbiAgICB9XHJcbiAgfSxcclxuICBnZW5lcmF0aW9uRW5kKHJlc3VsdHMpe1xyXG4gICAgY2xlYW51cFJvdW5kKHJlc3VsdHMpO1xyXG4gICAgcmV0dXJuIGN3X25ld1JvdW5kKHJlc3VsdHMpO1xyXG4gIH1cclxufVxyXG5cclxuZnVuY3Rpb24gc2ltdWxhdGlvblN0ZXAoKSB7ICBcclxuICBjdXJyZW50UnVubmVyLnN0ZXAoKTtcclxuICBzaG93RGlzdGFuY2UoXHJcbiAgICBNYXRoLnJvdW5kKGxlYWRlclBvc2l0aW9uLnggKiAxMDApIC8gMTAwLFxyXG4gICAgTWF0aC5yb3VuZChsZWFkZXJQb3NpdGlvbi55ICogMTAwKSAvIDEwMFxyXG4gICk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdhbWVMb29wKCkge1xyXG4gIGlmKHRlc3Rpbmc9PT1mYWxzZSl7XHJcblx0bG9vcHMgPSAwO1xyXG5cdHdoaWxlICghY3dfcGF1c2VkICYmIChuZXcgRGF0ZSkuZ2V0VGltZSgpID4gbmV4dEdhbWVUaWNrICYmIGxvb3BzIDwgbWF4RnJhbWVTa2lwKSB7ICAgXHJcblx0XHRuZXh0R2FtZVRpY2sgKz0gc2tpcFRpY2tzO1xyXG5cdFx0bG9vcHMrKztcclxuXHR9XHJcblx0c2ltdWxhdGlvblN0ZXAoKTtcclxuXHRjd19kcmF3U2NyZWVuKCk7XHJcbiAgfWVsc2V7XHJcblx0ZmFzdEZvcndhcmQoKTsvL3VzZWQgZm9yIHRlc3RpbmcgZGF0YVxyXG4gIH1cclxuICBpZighY3dfcGF1c2VkKSB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lKGdhbWVMb29wKTtcclxufVxyXG5cclxuZnVuY3Rpb24gdXBkYXRlQ2FyVUkoY2FySW5mbyl7XHJcbiAgdmFyIGsgPSBjYXJJbmZvLmluZGV4O1xyXG4gIHZhciBjYXIgPSBjYXJNYXAuZ2V0KGNhckluZm8pO1xyXG4gIHZhciBwb3NpdGlvbiA9IGNhci5nZXRQb3NpdGlvbigpO1xyXG5cclxuICBnaG9zdF9hZGRfcmVwbGF5X2ZyYW1lKGNhci5yZXBsYXksIGNhci5jYXIuY2FyKTtcclxuICBjYXIubWluaW1hcG1hcmtlci5zdHlsZS5sZWZ0ID0gTWF0aC5yb3VuZCgocG9zaXRpb24ueCArIDUpICogbWluaW1hcHNjYWxlKSArIFwicHhcIjtcclxuICBjYXIuaGVhbHRoQmFyLndpZHRoID0gTWF0aC5yb3VuZCgoY2FyLmNhci5zdGF0ZS5oZWFsdGggLyBtYXhfY2FyX2hlYWx0aCkgKiAxMDApICsgXCIlXCI7XHJcbiAgaWYgKHBvc2l0aW9uLnggPiBsZWFkZXJQb3NpdGlvbi54KSB7XHJcbiAgICBsZWFkZXJQb3NpdGlvbiA9IHBvc2l0aW9uO1xyXG4gICAgbGVhZGVyUG9zaXRpb24ubGVhZGVyID0gaztcclxuICAgIC8vIGNvbnNvbGUubG9nKFwibmV3IGxlYWRlcjogXCIsIGspO1xyXG4gIH1cclxufVxyXG5cclxuZnVuY3Rpb24gY3dfZmluZExlYWRlcigpIHtcclxuICB2YXIgbGVhZCA9IDA7XHJcbiAgdmFyIGN3X2NhckFycmF5ID0gQXJyYXkuZnJvbShjYXJNYXAudmFsdWVzKCkpO1xyXG4gIGZvciAodmFyIGsgPSAwOyBrIDwgY3dfY2FyQXJyYXkubGVuZ3RoOyBrKyspIHtcclxuICAgIGlmICghY3dfY2FyQXJyYXlba10uYWxpdmUpIHtcclxuICAgICAgY29udGludWU7XHJcbiAgICB9XHJcbiAgICB2YXIgcG9zaXRpb24gPSBjd19jYXJBcnJheVtrXS5nZXRQb3NpdGlvbigpO1xyXG4gICAgaWYgKHBvc2l0aW9uLnggPiBsZWFkKSB7XHJcbiAgICAgIGxlYWRlclBvc2l0aW9uID0gcG9zaXRpb247XHJcbiAgICAgIGxlYWRlclBvc2l0aW9uLmxlYWRlciA9IGs7XHJcbiAgICB9XHJcbiAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBmYXN0Rm9yd2FyZCgpe1xyXG4gIHZhciBnZW4gPSBnZW5lcmF0aW9uU3RhdGUuY291bnRlcjtcclxuICB3aGlsZShnZW4gPT09IGdlbmVyYXRpb25TdGF0ZS5jb3VudGVyKXtcclxuICAgIGN1cnJlbnRSdW5uZXIuc3RlcCgpO1xyXG4gIH1cclxufVxyXG5cclxuZnVuY3Rpb24gY2xlYW51cFJvdW5kKHJlc3VsdHMpe1xyXG5cclxuICByZXN1bHRzLnNvcnQoZnVuY3Rpb24gKGEsIGIpIHtcclxuICAgIGlmIChhLnNjb3JlLnYgPiBiLnNjb3JlLnYpIHtcclxuICAgICAgcmV0dXJuIC0xXHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICByZXR1cm4gMVxyXG4gICAgfVxyXG4gIH0pXHJcbiAgZ3JhcGhTdGF0ZSA9IHBsb3RfZ3JhcGhzKFxyXG4gICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJncmFwaGNhbnZhc1wiKSxcclxuICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwidG9wc2NvcmVzXCIpLFxyXG4gICAgbnVsbCxcclxuICAgIGdyYXBoU3RhdGUsXHJcbiAgICByZXN1bHRzXHJcbiAgKTtcclxufVxyXG5cclxuZnVuY3Rpb24gY3dfbmV3Um91bmQocmVzdWx0cykge1xyXG4gIGNhbWVyYS5wb3MueCA9IGNhbWVyYS5wb3MueSA9IDA7XHJcbiAgY3dfc2V0Q2FtZXJhVGFyZ2V0KC0xKTtcclxuICBnZW5lcmF0aW9uU3RhdGUgPW1hbmFnZVJvdW5kLm5leHRHZW5lcmF0aW9uKGdlbmVyYXRpb25TdGF0ZSwgcmVzdWx0cywgZ2VuZXJhdGlvbkNvbmZpZygpKTtcclxuXHRcclxuXHRpZigoZ2VuZXJhdGlvblN0YXRlLmNvdW50ZXI9PT0wKSAmJiAodGVzdGluZz09PXRydWUpKXtcclxuXHRcdHZhciByb3VuZHMgPSBsb2NhbFN0b3JhZ2UuZ2V0SXRlbShcInJvdW5kXCIpO1xyXG5cdFx0dmFyIG5ld1JvdW5kcyA9IGdlbmVyYXRpb25TdGF0ZS5yb3VuZCtyb3VuZHM7XHJcblx0XHRsb2NhbFN0b3JhZ2Uuc2V0SXRlbShcIkVBLUEtXCIrbmV3Um91bmRzLCBKU09OLnN0cmluZ2lmeShncmFwaFN0YXRlLmN3X2dyYXBoQXZlcmFnZSkpO1xyXG5cdFx0bG9jYWxTdG9yYWdlLnNldEl0ZW0oXCJFQS1ULVwiK25ld1JvdW5kcywgSlNPTi5zdHJpbmdpZnkoZ3JhcGhTdGF0ZS5jd19ncmFwaFRvcCkpO1xyXG5cdFx0bG9jYWxTdG9yYWdlLnNldEl0ZW0oXCJyb3VuZFwiLCBuZXdSb3VuZHMpO1xyXG5cdFx0Ly9ncmFwaFN0YXRlLmN3X2dyYXBoQXZlcmFnZSA9IG5ldyBBcnJheSgpO1xyXG5cdFx0Ly9yZXNldEdyYXBoU3RhdGUoKTtcclxuXHRcdGxvY2F0aW9uLnJlbG9hZCgpO1xyXG5cdH1cclxuXHRcclxuXHRcclxuICBpZiAod29ybGRfZGVmLm11dGFibGVfZmxvb3IpIHtcclxuICAgIC8vIEdIT1NUIERJU0FCTEVEXHJcbiAgICBnaG9zdCA9IG51bGw7XHJcbiAgICB3b3JsZF9kZWYuZmxvb3JzZWVkID0gYnRvYShNYXRoLnNlZWRyYW5kb20oKSk7XHJcbiAgfSBlbHNlIHtcclxuICAgIC8vIFJFLUVOQUJMRSBHSE9TVFxyXG4gICAgZ2hvc3RfcmVzZXRfZ2hvc3QoZ2hvc3QpO1xyXG4gIH1cclxuICBjdXJyZW50UnVubmVyID0gd29ybGRSdW4od29ybGRfZGVmLCBnZW5lcmF0aW9uU3RhdGUuZ2VuZXJhdGlvbiwgdWlMaXN0ZW5lcnMpO1xyXG4gIHNldHVwQ2FyVUkoKTtcclxuICBjd19kcmF3TWluaU1hcCgpO1xyXG4gIHJlc2V0Q2FyVUkoKTtcclxufVxyXG5cclxuZnVuY3Rpb24gY3dfc3RhcnRTaW11bGF0aW9uKCkge1xyXG4gIGN3X3BhdXNlZCA9IGZhbHNlO1xyXG4gIHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUoZ2FtZUxvb3ApO1xyXG59XHJcblxyXG5mdW5jdGlvbiBjd19zdG9wU2ltdWxhdGlvbigpIHtcclxuICBjd19wYXVzZWQgPSB0cnVlO1xyXG59XHJcblxyXG5mdW5jdGlvbiBjd19jbGVhclBvcHVsYXRpb25Xb3JsZCgpIHtcclxuICBjYXJNYXAuZm9yRWFjaChmdW5jdGlvbihjYXIpe1xyXG4gICAgY2FyLmtpbGwoY3VycmVudFJ1bm5lciwgd29ybGRfZGVmKTtcclxuICB9KTtcclxufVxyXG5cclxuZnVuY3Rpb24gY3dfcmVzZXRQb3B1bGF0aW9uVUkoKSB7XHJcbiAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJnZW5lcmF0aW9uXCIpLmlubmVySFRNTCA9IFwiXCI7XHJcbiAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJjYXJzXCIpLmlubmVySFRNTCA9IFwiXCI7XHJcbiAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJ0b3BzY29yZXNcIikuaW5uZXJIVE1MID0gXCJcIjtcclxuICBjd19jbGVhckdyYXBoaWNzKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiZ3JhcGhjYW52YXNcIikpO1xyXG4gIHJlc2V0R3JhcGhTdGF0ZSgpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBjd19yZXNldFdvcmxkKCkge1xyXG4gIGRvRHJhdyA9IHRydWU7XHJcbiAgY3dfc3RvcFNpbXVsYXRpb24oKTtcclxuICB3b3JsZF9kZWYuZmxvb3JzZWVkID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJuZXdzZWVkXCIpLnZhbHVlO1xyXG4gIGN3X2NsZWFyUG9wdWxhdGlvbldvcmxkKCk7XHJcbiAgY3dfcmVzZXRQb3B1bGF0aW9uVUkoKTtcclxuXHJcbiAgTWF0aC5zZWVkcmFuZG9tKCk7XHJcbiAgY3dfZ2VuZXJhdGlvblplcm8oKTtcclxuICBjdXJyZW50UnVubmVyID0gd29ybGRSdW4oXHJcbiAgICB3b3JsZF9kZWYsIGdlbmVyYXRpb25TdGF0ZS5nZW5lcmF0aW9uLCB1aUxpc3RlbmVyc1xyXG4gICk7XHJcblxyXG4gIGdob3N0ID0gZ2hvc3RfY3JlYXRlX2dob3N0KCk7XHJcbiAgcmVzZXRDYXJVSSgpO1xyXG4gIHNldHVwQ2FyVUkoKVxyXG4gIGN3X2RyYXdNaW5pTWFwKCk7XHJcblxyXG4gIGN3X3N0YXJ0U2ltdWxhdGlvbigpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBzZXR1cENhclVJKCl7XHJcbiAgY3VycmVudFJ1bm5lci5jYXJzLm1hcChmdW5jdGlvbihjYXJJbmZvKXtcclxuICAgIHZhciBjYXIgPSBuZXcgY3dfQ2FyKGNhckluZm8sIGNhck1hcCk7XHJcbiAgICBjYXJNYXAuc2V0KGNhckluZm8sIGNhcik7XHJcbiAgICBjYXIucmVwbGF5ID0gZ2hvc3RfY3JlYXRlX3JlcGxheSgpO1xyXG4gICAgZ2hvc3RfYWRkX3JlcGxheV9mcmFtZShjYXIucmVwbGF5LCBjYXIuY2FyLmNhcik7XHJcbiAgfSlcclxufVxyXG5cclxuXHJcbmRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoXCIjZmFzdC1mb3J3YXJkXCIpLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCBmdW5jdGlvbigpe1xyXG4gIGZhc3RGb3J3YXJkKClcclxufSk7XHJcblxyXG5kb2N1bWVudC5xdWVyeVNlbGVjdG9yKFwiI3NhdmUtcHJvZ3Jlc3NcIikuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIGZ1bmN0aW9uKCl7XHJcbiAgc2F2ZVByb2dyZXNzKClcclxufSk7XHJcblxyXG5kb2N1bWVudC5xdWVyeVNlbGVjdG9yKFwiI3Jlc3RvcmUtcHJvZ3Jlc3NcIikuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIGZ1bmN0aW9uKCl7XHJcbiAgcmVzdG9yZVByb2dyZXNzKClcclxufSk7XHJcblxyXG5kb2N1bWVudC5xdWVyeVNlbGVjdG9yKFwiI3RvZ2dsZS1kaXNwbGF5XCIpLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCBmdW5jdGlvbigpe1xyXG4gIHRvZ2dsZURpc3BsYXkoKVxyXG59KVxyXG5cclxuZG9jdW1lbnQucXVlcnlTZWxlY3RvcihcIiNuZXctcG9wdWxhdGlvblwiKS5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgZnVuY3Rpb24oKXtcclxuICBjd19yZXNldFBvcHVsYXRpb25VSSgpXHJcbiAgY3dfZ2VuZXJhdGlvblplcm8oKTtcclxuICBnaG9zdCA9IGdob3N0X2NyZWF0ZV9naG9zdCgpO1xyXG4gIHJlc2V0Q2FyVUkoKTtcclxufSlcclxuXHJcbmZ1bmN0aW9uIHNhdmVQcm9ncmVzcygpIHtcclxuICBsb2NhbFN0b3JhZ2UuY3dfc2F2ZWRHZW5lcmF0aW9uID0gSlNPTi5zdHJpbmdpZnkoZ2VuZXJhdGlvblN0YXRlLmdlbmVyYXRpb24pO1xyXG4gIGxvY2FsU3RvcmFnZS5jd19nZW5Db3VudGVyID0gZ2VuZXJhdGlvblN0YXRlLmNvdW50ZXI7XHJcbiAgbG9jYWxTdG9yYWdlLmN3X2dob3N0ID0gSlNPTi5zdHJpbmdpZnkoZ2hvc3QpO1xyXG4gIGxvY2FsU3RvcmFnZS5jd190b3BTY29yZXMgPSBKU09OLnN0cmluZ2lmeShncmFwaFN0YXRlLmN3X3RvcFNjb3Jlcyk7XHJcbiAgbG9jYWxTdG9yYWdlLmN3X2Zsb29yU2VlZCA9IHdvcmxkX2RlZi5mbG9vcnNlZWQ7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHJlc3RvcmVQcm9ncmVzcygpIHtcclxuICBpZiAodHlwZW9mIGxvY2FsU3RvcmFnZS5jd19zYXZlZEdlbmVyYXRpb24gPT0gJ3VuZGVmaW5lZCcgfHwgbG9jYWxTdG9yYWdlLmN3X3NhdmVkR2VuZXJhdGlvbiA9PSBudWxsKSB7XHJcbiAgICBhbGVydChcIk5vIHNhdmVkIHByb2dyZXNzIGZvdW5kXCIpO1xyXG4gICAgcmV0dXJuO1xyXG4gIH1cclxuICBjd19zdG9wU2ltdWxhdGlvbigpO1xyXG4gIGdlbmVyYXRpb25TdGF0ZS5nZW5lcmF0aW9uID0gSlNPTi5wYXJzZShsb2NhbFN0b3JhZ2UuY3dfc2F2ZWRHZW5lcmF0aW9uKTtcclxuICBnZW5lcmF0aW9uU3RhdGUuY291bnRlciA9IGxvY2FsU3RvcmFnZS5jd19nZW5Db3VudGVyO1xyXG4gIGdob3N0ID0gSlNPTi5wYXJzZShsb2NhbFN0b3JhZ2UuY3dfZ2hvc3QpO1xyXG4gIGdyYXBoU3RhdGUuY3dfdG9wU2NvcmVzID0gSlNPTi5wYXJzZShsb2NhbFN0b3JhZ2UuY3dfdG9wU2NvcmVzKTtcclxuICB3b3JsZF9kZWYuZmxvb3JzZWVkID0gbG9jYWxTdG9yYWdlLmN3X2Zsb29yU2VlZDtcclxuICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIm5ld3NlZWRcIikudmFsdWUgPSB3b3JsZF9kZWYuZmxvb3JzZWVkO1xyXG5cclxuICBjdXJyZW50UnVubmVyID0gd29ybGRSdW4od29ybGRfZGVmLCBnZW5lcmF0aW9uU3RhdGUuZ2VuZXJhdGlvbiwgdWlMaXN0ZW5lcnMpO1xyXG4gIGN3X2RyYXdNaW5pTWFwKCk7XHJcbiAgTWF0aC5zZWVkcmFuZG9tKCk7XHJcblxyXG4gIHJlc2V0Q2FyVUkoKTtcclxuICBjd19zdGFydFNpbXVsYXRpb24oKTtcclxufVxyXG5cclxuZG9jdW1lbnQucXVlcnlTZWxlY3RvcihcIiNjb25maXJtLXJlc2V0XCIpLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCBmdW5jdGlvbigpe1xyXG4gIGN3X2NvbmZpcm1SZXNldFdvcmxkKClcclxufSlcclxuXHJcbmZ1bmN0aW9uIGN3X2NvbmZpcm1SZXNldFdvcmxkKCkge1xyXG4gIGlmIChjb25maXJtKCdSZWFsbHkgcmVzZXQgd29ybGQ/JykpIHtcclxuICAgIGN3X3Jlc2V0V29ybGQoKTtcclxuICB9IGVsc2Uge1xyXG4gICAgcmV0dXJuIGZhbHNlO1xyXG4gIH1cclxufVxyXG5cclxuLy8gZ2hvc3QgcmVwbGF5IHN0dWZmXHJcblxyXG5cclxuZnVuY3Rpb24gY3dfcGF1c2VTaW11bGF0aW9uKCkge1xyXG4gIGN3X3BhdXNlZCA9IHRydWU7XHJcbiAgZ2hvc3RfcGF1c2UoZ2hvc3QpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBjd19yZXN1bWVTaW11bGF0aW9uKCkge1xyXG4gIGN3X3BhdXNlZCA9IGZhbHNlO1xyXG4gIGdob3N0X3Jlc3VtZShnaG9zdCk7XHJcbiAgd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZShnYW1lTG9vcCk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGN3X3N0YXJ0R2hvc3RSZXBsYXkoKSB7XHJcbiAgaWYgKCFkb0RyYXcpIHtcclxuICAgIHRvZ2dsZURpc3BsYXkoKTtcclxuICB9XHJcbiAgY3dfcGF1c2VTaW11bGF0aW9uKCk7XHJcbiAgY3dfZ2hvc3RSZXBsYXlJbnRlcnZhbCA9IHNldEludGVydmFsKGN3X2RyYXdHaG9zdFJlcGxheSwgTWF0aC5yb3VuZCgxMDAwIC8gc2NyZWVuZnBzKSk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGN3X3N0b3BHaG9zdFJlcGxheSgpIHtcclxuICBjbGVhckludGVydmFsKGN3X2dob3N0UmVwbGF5SW50ZXJ2YWwpO1xyXG4gIGN3X2dob3N0UmVwbGF5SW50ZXJ2YWwgPSBudWxsO1xyXG4gIGN3X2ZpbmRMZWFkZXIoKTtcclxuICBjYW1lcmEucG9zLnggPSBsZWFkZXJQb3NpdGlvbi54O1xyXG4gIGNhbWVyYS5wb3MueSA9IGxlYWRlclBvc2l0aW9uLnk7XHJcbiAgY3dfcmVzdW1lU2ltdWxhdGlvbigpO1xyXG59XHJcblxyXG5kb2N1bWVudC5xdWVyeVNlbGVjdG9yKFwiI3RvZ2dsZS1naG9zdFwiKS5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgZnVuY3Rpb24oZSl7XHJcbiAgY3dfdG9nZ2xlR2hvc3RSZXBsYXkoZS50YXJnZXQpXHJcbn0pXHJcblxyXG5mdW5jdGlvbiBjd190b2dnbGVHaG9zdFJlcGxheShidXR0b24pIHtcclxuICBpZiAoY3dfZ2hvc3RSZXBsYXlJbnRlcnZhbCA9PSBudWxsKSB7XHJcbiAgICBjd19zdGFydEdob3N0UmVwbGF5KCk7XHJcbiAgICBidXR0b24udmFsdWUgPSBcIlJlc3VtZSBzaW11bGF0aW9uXCI7XHJcbiAgfSBlbHNlIHtcclxuICAgIGN3X3N0b3BHaG9zdFJlcGxheSgpO1xyXG4gICAgYnV0dG9uLnZhbHVlID0gXCJWaWV3IHRvcCByZXBsYXlcIjtcclxuICB9XHJcbn1cclxuLy8gZ2hvc3QgcmVwbGF5IHN0dWZmIEVORFxyXG5cclxuLy8gaW5pdGlhbCBzdHVmZiwgb25seSBjYWxsZWQgb25jZSAoaG9wZWZ1bGx5KVxyXG5mdW5jdGlvbiBjd19pbml0KCkge1xyXG4gIC8vIGNsb25lIHNpbHZlciBkb3QgYW5kIGhlYWx0aCBiYXJcclxuICB2YXIgbW1tID0gZG9jdW1lbnQuZ2V0RWxlbWVudHNCeU5hbWUoJ21pbmltYXBtYXJrZXInKVswXTtcclxuICB2YXIgaGJhciA9IGRvY3VtZW50LmdldEVsZW1lbnRzQnlOYW1lKCdoZWFsdGhiYXInKVswXTtcclxuICB2YXIgZ2VuZXJhdGlvblNpemUgPSBnZW5lcmF0aW9uQ29uZmlnLmNvbnN0YW50cy5nZW5lcmF0aW9uU2l6ZTtcclxuXHJcbiAgZm9yICh2YXIgayA9IDA7IGsgPCBnZW5lcmF0aW9uU2l6ZTsgaysrKSB7XHJcblxyXG4gICAgLy8gbWluaW1hcCBtYXJrZXJzXHJcbiAgICB2YXIgbmV3YmFyID0gbW1tLmNsb25lTm9kZSh0cnVlKTtcclxuICAgIG5ld2Jhci5pZCA9IFwiYmFyXCIgKyBrO1xyXG4gICAgbmV3YmFyLnN0eWxlLnBhZGRpbmdUb3AgPSBrICogOSArIFwicHhcIjtcclxuICAgIG1pbmltYXBob2xkZXIuYXBwZW5kQ2hpbGQobmV3YmFyKTtcclxuXHJcbiAgICAvLyBoZWFsdGggYmFyc1xyXG4gICAgdmFyIG5ld2hlYWx0aCA9IGhiYXIuY2xvbmVOb2RlKHRydWUpO1xyXG4gICAgbmV3aGVhbHRoLmdldEVsZW1lbnRzQnlUYWdOYW1lKFwiRElWXCIpWzBdLmlkID0gXCJoZWFsdGhcIiArIGs7XHJcbiAgICBuZXdoZWFsdGguY2FyX2luZGV4ID0gaztcclxuICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiaGVhbHRoXCIpLmFwcGVuZENoaWxkKG5ld2hlYWx0aCk7XHJcbiAgfVxyXG4gIG1tbS5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKG1tbSk7XHJcbiAgaGJhci5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKGhiYXIpO1xyXG4gIHdvcmxkX2RlZi5mbG9vcnNlZWQgPSBidG9hKE1hdGguc2VlZHJhbmRvbSgpKTtcclxuICBjd19nZW5lcmF0aW9uWmVybygpO1xyXG4gIGdob3N0ID0gZ2hvc3RfY3JlYXRlX2dob3N0KCk7XHJcbiAgcmVzZXRDYXJVSSgpO1xyXG4gIGN1cnJlbnRSdW5uZXIgPSB3b3JsZFJ1bih3b3JsZF9kZWYsIGdlbmVyYXRpb25TdGF0ZS5nZW5lcmF0aW9uLCB1aUxpc3RlbmVycyk7XHJcbiAgc2V0dXBDYXJVSSgpO1xyXG4gIGN3X2RyYXdNaW5pTWFwKCk7XHJcbiAgd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZShnYW1lTG9vcCk7XHJcbiAgXHJcbn1cclxuXHJcbmZ1bmN0aW9uIHJlbE1vdXNlQ29vcmRzKGV2ZW50KSB7XHJcbiAgdmFyIHRvdGFsT2Zmc2V0WCA9IDA7XHJcbiAgdmFyIHRvdGFsT2Zmc2V0WSA9IDA7XHJcbiAgdmFyIGNhbnZhc1ggPSAwO1xyXG4gIHZhciBjYW52YXNZID0gMDtcclxuICB2YXIgY3VycmVudEVsZW1lbnQgPSB0aGlzO1xyXG5cclxuICBkbyB7XHJcbiAgICB0b3RhbE9mZnNldFggKz0gY3VycmVudEVsZW1lbnQub2Zmc2V0TGVmdCAtIGN1cnJlbnRFbGVtZW50LnNjcm9sbExlZnQ7XHJcbiAgICB0b3RhbE9mZnNldFkgKz0gY3VycmVudEVsZW1lbnQub2Zmc2V0VG9wIC0gY3VycmVudEVsZW1lbnQuc2Nyb2xsVG9wO1xyXG4gICAgY3VycmVudEVsZW1lbnQgPSBjdXJyZW50RWxlbWVudC5vZmZzZXRQYXJlbnRcclxuICB9XHJcbiAgd2hpbGUgKGN1cnJlbnRFbGVtZW50KTtcclxuXHJcbiAgY2FudmFzWCA9IGV2ZW50LnBhZ2VYIC0gdG90YWxPZmZzZXRYO1xyXG4gIGNhbnZhc1kgPSBldmVudC5wYWdlWSAtIHRvdGFsT2Zmc2V0WTtcclxuXHJcbiAgcmV0dXJuIHt4OiBjYW52YXNYLCB5OiBjYW52YXNZfVxyXG59XHJcbkhUTUxEaXZFbGVtZW50LnByb3RvdHlwZS5yZWxNb3VzZUNvb3JkcyA9IHJlbE1vdXNlQ29vcmRzO1xyXG5taW5pbWFwaG9sZGVyLm9uY2xpY2sgPSBmdW5jdGlvbiAoZXZlbnQpIHtcclxuICB2YXIgY29vcmRzID0gbWluaW1hcGhvbGRlci5yZWxNb3VzZUNvb3JkcyhldmVudCk7XHJcbiAgdmFyIGN3X2NhckFycmF5ID0gQXJyYXkuZnJvbShjYXJNYXAudmFsdWVzKCkpO1xyXG4gIHZhciBjbG9zZXN0ID0ge1xyXG4gICAgdmFsdWU6IGN3X2NhckFycmF5WzBdLmNhcixcclxuICAgIGRpc3Q6IE1hdGguYWJzKCgoY3dfY2FyQXJyYXlbMF0uZ2V0UG9zaXRpb24oKS54ICsgNikgKiBtaW5pbWFwc2NhbGUpIC0gY29vcmRzLngpLFxyXG4gICAgeDogY3dfY2FyQXJyYXlbMF0uZ2V0UG9zaXRpb24oKS54XHJcbiAgfVxyXG5cclxuICB2YXIgbWF4WCA9IDA7XHJcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBjd19jYXJBcnJheS5sZW5ndGg7IGkrKykge1xyXG4gICAgdmFyIHBvcyA9IGN3X2NhckFycmF5W2ldLmdldFBvc2l0aW9uKCk7XHJcbiAgICB2YXIgZGlzdCA9IE1hdGguYWJzKCgocG9zLnggKyA2KSAqIG1pbmltYXBzY2FsZSkgLSBjb29yZHMueCk7XHJcbiAgICBpZiAoZGlzdCA8IGNsb3Nlc3QuZGlzdCkge1xyXG4gICAgICBjbG9zZXN0LnZhbHVlID0gY3dfY2FyQXJyYXkuY2FyO1xyXG4gICAgICBjbG9zZXN0LmRpc3QgPSBkaXN0O1xyXG4gICAgICBjbG9zZXN0LnggPSBwb3MueDtcclxuICAgIH1cclxuICAgIG1heFggPSBNYXRoLm1heChwb3MueCwgbWF4WCk7XHJcbiAgfVxyXG5cclxuICBpZiAoY2xvc2VzdC54ID09IG1heFgpIHsgLy8gZm9jdXMgb24gbGVhZGVyIGFnYWluXHJcbiAgICBjd19zZXRDYW1lcmFUYXJnZXQoLTEpO1xyXG4gIH0gZWxzZSB7XHJcbiAgICBjd19zZXRDYW1lcmFUYXJnZXQoY2xvc2VzdC52YWx1ZSk7XHJcbiAgfVxyXG59XHJcblxyXG5cclxuZG9jdW1lbnQucXVlcnlTZWxlY3RvcihcIiNtdXRhdGlvbnJhdGVcIikuYWRkRXZlbnRMaXN0ZW5lcihcImNoYW5nZVwiLCBmdW5jdGlvbihlKXtcclxuICB2YXIgZWxlbSA9IGUudGFyZ2V0XHJcbiAgY3dfc2V0TXV0YXRpb24oZWxlbS5vcHRpb25zW2VsZW0uc2VsZWN0ZWRJbmRleF0udmFsdWUpXHJcbn0pXHJcblxyXG5kb2N1bWVudC5xdWVyeVNlbGVjdG9yKFwiI211dGF0aW9uc2l6ZVwiKS5hZGRFdmVudExpc3RlbmVyKFwiY2hhbmdlXCIsIGZ1bmN0aW9uKGUpe1xyXG4gIHZhciBlbGVtID0gZS50YXJnZXRcclxuICBjd19zZXRNdXRhdGlvblJhbmdlKGVsZW0ub3B0aW9uc1tlbGVtLnNlbGVjdGVkSW5kZXhdLnZhbHVlKVxyXG59KVxyXG5cclxuZG9jdW1lbnQucXVlcnlTZWxlY3RvcihcIiNmbG9vclwiKS5hZGRFdmVudExpc3RlbmVyKFwiY2hhbmdlXCIsIGZ1bmN0aW9uKGUpe1xyXG4gIHZhciBlbGVtID0gZS50YXJnZXRcclxuICBjd19zZXRNdXRhYmxlRmxvb3IoZWxlbS5vcHRpb25zW2VsZW0uc2VsZWN0ZWRJbmRleF0udmFsdWUpXHJcbn0pO1xyXG5cclxuZG9jdW1lbnQucXVlcnlTZWxlY3RvcihcIiNncmF2aXR5XCIpLmFkZEV2ZW50TGlzdGVuZXIoXCJjaGFuZ2VcIiwgZnVuY3Rpb24oZSl7XHJcbiAgdmFyIGVsZW0gPSBlLnRhcmdldFxyXG4gIGN3X3NldEdyYXZpdHkoZWxlbS5vcHRpb25zW2VsZW0uc2VsZWN0ZWRJbmRleF0udmFsdWUpXHJcbn0pXHJcblxyXG5kb2N1bWVudC5xdWVyeVNlbGVjdG9yKFwiI2VsaXRlc2l6ZVwiKS5hZGRFdmVudExpc3RlbmVyKFwiY2hhbmdlXCIsIGZ1bmN0aW9uKGUpe1xyXG4gIHZhciBlbGVtID0gZS50YXJnZXRcclxuICBjd19zZXRFbGl0ZVNpemUoZWxlbS5vcHRpb25zW2VsZW0uc2VsZWN0ZWRJbmRleF0udmFsdWUpXHJcbn0pXHJcblxyXG5mdW5jdGlvbiBjd19zZXRNdXRhdGlvbihtdXRhdGlvbikge1xyXG4gIGdlbmVyYXRpb25Db25maWcuY29uc3RhbnRzLmdlbl9tdXRhdGlvbiA9IHBhcnNlRmxvYXQobXV0YXRpb24pO1xyXG59XHJcblxyXG5mdW5jdGlvbiBjd19zZXRNdXRhdGlvblJhbmdlKHJhbmdlKSB7XHJcbiAgZ2VuZXJhdGlvbkNvbmZpZy5jb25zdGFudHMubXV0YXRpb25fcmFuZ2UgPSBwYXJzZUZsb2F0KHJhbmdlKTtcclxufVxyXG5cclxuZnVuY3Rpb24gY3dfc2V0TXV0YWJsZUZsb29yKGNob2ljZSkge1xyXG4gIHdvcmxkX2RlZi5tdXRhYmxlX2Zsb29yID0gKGNob2ljZSA9PSAxKTtcclxufVxyXG5cclxuZnVuY3Rpb24gY3dfc2V0R3Jhdml0eShjaG9pY2UpIHtcclxuICB3b3JsZF9kZWYuZ3Jhdml0eSA9IG5ldyBiMlZlYzIoMC4wLCAtcGFyc2VGbG9hdChjaG9pY2UpKTtcclxuICB2YXIgd29ybGQgPSBjdXJyZW50UnVubmVyLnNjZW5lLndvcmxkXHJcbiAgLy8gQ0hFQ0sgR1JBVklUWSBDSEFOR0VTXHJcbiAgaWYgKHdvcmxkLkdldEdyYXZpdHkoKS55ICE9IHdvcmxkX2RlZi5ncmF2aXR5LnkpIHtcclxuICAgIHdvcmxkLlNldEdyYXZpdHkod29ybGRfZGVmLmdyYXZpdHkpO1xyXG4gIH1cclxufVxyXG5cclxuZnVuY3Rpb24gY3dfc2V0RWxpdGVTaXplKGNsb25lcykge1xyXG4gIGdlbmVyYXRpb25Db25maWcuY29uc3RhbnRzLmNoYW1waW9uTGVuZ3RoID0gcGFyc2VJbnQoY2xvbmVzLCAxMCk7XHJcbn1cclxuXHJcbmN3X2luaXQoKTtcclxuIiwidmFyIHJhbmRvbSA9IHJlcXVpcmUoXCIuL3JhbmRvbS5qc1wiKTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0ge1xyXG4gIGNyZWF0ZUdlbmVyYXRpb25aZXJvKHNjaGVtYSwgZ2VuZXJhdG9yKXtcclxuICAgIHJldHVybiBPYmplY3Qua2V5cyhzY2hlbWEpLnJlZHVjZShmdW5jdGlvbihpbnN0YW5jZSwga2V5KXtcclxuICAgICAgdmFyIHNjaGVtYVByb3AgPSBzY2hlbWFba2V5XTtcclxuICAgICAgdmFyIHZhbHVlcyA9IHJhbmRvbS5jcmVhdGVOb3JtYWxzKHNjaGVtYVByb3AsIGdlbmVyYXRvcik7XHJcbiAgICAgIGluc3RhbmNlW2tleV0gPSB2YWx1ZXM7XHJcbiAgICAgIHJldHVybiBpbnN0YW5jZTtcclxuICAgIH0sIHsgaWQ6IE1hdGgucmFuZG9tKCkudG9TdHJpbmcoMzIpIH0pO1xyXG4gIH0sXHJcbiAgY3JlYXRlQ3Jvc3NCcmVlZChzY2hlbWEsIHBhcmVudHMsIHBhcmVudENob29zZXIpe1xyXG4gICAgdmFyIGlkID0gTWF0aC5yYW5kb20oKS50b1N0cmluZygzMik7XHJcbiAgICByZXR1cm4gT2JqZWN0LmtleXMoc2NoZW1hKS5yZWR1Y2UoZnVuY3Rpb24oY3Jvc3NEZWYsIGtleSl7XHJcbiAgICAgIHZhciBzY2hlbWFEZWYgPSBzY2hlbWFba2V5XTtcclxuICAgICAgdmFyIHZhbHVlcyA9IFtdO1xyXG4gICAgICBmb3IodmFyIGkgPSAwLCBsID0gc2NoZW1hRGVmLmxlbmd0aDsgaSA8IGw7IGkrKyl7XHJcbiAgICAgICAgdmFyIHAgPSBwYXJlbnRDaG9vc2VyKGlkLCBrZXksIHBhcmVudHMpO1xyXG4gICAgICAgIHZhbHVlcy5wdXNoKHBhcmVudHNbcF1ba2V5XVtpXSk7XHJcbiAgICAgIH1cclxuICAgICAgY3Jvc3NEZWZba2V5XSA9IHZhbHVlcztcclxuICAgICAgcmV0dXJuIGNyb3NzRGVmO1xyXG4gICAgfSwge1xyXG4gICAgICBpZDogaWQsXHJcbiAgICAgIGFuY2VzdHJ5OiBwYXJlbnRzLm1hcChmdW5jdGlvbihwYXJlbnQpe1xyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICBpZDogcGFyZW50LmlkLFxyXG4gICAgICAgICAgYW5jZXN0cnk6IHBhcmVudC5hbmNlc3RyeSxcclxuICAgICAgICB9O1xyXG4gICAgICB9KVxyXG4gICAgfSk7XHJcbiAgfSxcclxuICBjcmVhdGVNdXRhdGVkQ2xvbmUoc2NoZW1hLCBnZW5lcmF0b3IsIHBhcmVudCwgZmFjdG9yLCBjaGFuY2VUb011dGF0ZSl7XHJcbiAgICByZXR1cm4gT2JqZWN0LmtleXMoc2NoZW1hKS5yZWR1Y2UoZnVuY3Rpb24oY2xvbmUsIGtleSl7XHJcbiAgICAgIHZhciBzY2hlbWFQcm9wID0gc2NoZW1hW2tleV07XHJcbiAgICAgIHZhciBvcmlnaW5hbFZhbHVlcyA9IHBhcmVudFtrZXldO1xyXG4gICAgICB2YXIgdmFsdWVzID0gcmFuZG9tLm11dGF0ZU5vcm1hbHMoXHJcbiAgICAgICAgc2NoZW1hUHJvcCwgZ2VuZXJhdG9yLCBvcmlnaW5hbFZhbHVlcywgZmFjdG9yLCBjaGFuY2VUb011dGF0ZVxyXG4gICAgICApO1xyXG4gICAgICBjbG9uZVtrZXldID0gdmFsdWVzO1xyXG4gICAgICByZXR1cm4gY2xvbmU7XHJcbiAgICB9LCB7XHJcbiAgICAgIGlkOiBwYXJlbnQuaWQsXHJcbiAgICAgIGFuY2VzdHJ5OiBwYXJlbnQuYW5jZXN0cnlcclxuICAgIH0pO1xyXG4gIH0sXHJcbiAgYXBwbHlUeXBlcyhzY2hlbWEsIHBhcmVudCl7XHJcbiAgICByZXR1cm4gT2JqZWN0LmtleXMoc2NoZW1hKS5yZWR1Y2UoZnVuY3Rpb24oY2xvbmUsIGtleSl7XHJcbiAgICAgIHZhciBzY2hlbWFQcm9wID0gc2NoZW1hW2tleV07XHJcbiAgICAgIHZhciBvcmlnaW5hbFZhbHVlcyA9IHBhcmVudFtrZXldO1xyXG4gICAgICB2YXIgdmFsdWVzO1xyXG4gICAgICBzd2l0Y2goc2NoZW1hUHJvcC50eXBlKXtcclxuICAgICAgICBjYXNlIFwic2h1ZmZsZVwiIDpcclxuICAgICAgICAgIHZhbHVlcyA9IHJhbmRvbS5tYXBUb1NodWZmbGUoc2NoZW1hUHJvcCwgb3JpZ2luYWxWYWx1ZXMpOyBicmVhaztcclxuICAgICAgICBjYXNlIFwiZmxvYXRcIiA6XHJcbiAgICAgICAgICB2YWx1ZXMgPSByYW5kb20ubWFwVG9GbG9hdChzY2hlbWFQcm9wLCBvcmlnaW5hbFZhbHVlcyk7IGJyZWFrO1xyXG4gICAgICAgIGNhc2UgXCJpbnRlZ2VyXCI6XHJcbiAgICAgICAgICB2YWx1ZXMgPSByYW5kb20ubWFwVG9JbnRlZ2VyKHNjaGVtYVByb3AsIG9yaWdpbmFsVmFsdWVzKTsgYnJlYWs7XHJcbiAgICAgICAgZGVmYXVsdDpcclxuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgVW5rbm93biB0eXBlICR7c2NoZW1hUHJvcC50eXBlfSBvZiBzY2hlbWEgZm9yIGtleSAke2tleX1gKTtcclxuICAgICAgfVxyXG4gICAgICBjbG9uZVtrZXldID0gdmFsdWVzO1xyXG4gICAgICByZXR1cm4gY2xvbmU7XHJcbiAgICB9LCB7XHJcbiAgICAgIGlkOiBwYXJlbnQuaWQsXHJcbiAgICAgIGFuY2VzdHJ5OiBwYXJlbnQuYW5jZXN0cnlcclxuICAgIH0pO1xyXG4gIH0sXHJcbn1cclxuIiwibW9kdWxlLmV4cG9ydHMgPSB7XHJcblx0Y3JlYXRlRGF0YVBvaW50Q2x1c3RlcjogY3JlYXRlRGF0YVBvaW50Q2x1c3RlcixcclxuXHRjcmVhdGVEYXRhUG9pbnQ6IGNyZWF0ZURhdGFQb2ludCxcclxuXHRjcmVhdGVDbHVzdGVySW50ZXJmYWNlOiBjcmVhdGVDbHVzdGVySW50ZXJmYWNlLFxyXG5cdGZpbmREYXRhUG9pbnRDbHVzdGVyOiBmaW5kRGF0YVBvaW50Q2x1c3RlcixcclxuXHRmaW5kRGF0YVBvaW50OiBmaW5kRGF0YVBvaW50LFxyXG5cdHNvcnRDbHVzdGVyOiBzb3J0Q2x1c3RlcixcclxuXHRmaW5kT2plY3ROZWlnaGJvcnM6IGZpbmRPamVjdE5laWdoYm9ycyxcclxuXHRzY29yZU9iamVjdDogc2NvcmVPYmplY3QsXHJcblx0Y3JlYXRlU3ViRGF0YVBvaW50Q2x1c3RlcjpjcmVhdGVTdWJEYXRhUG9pbnRDbHVzdGVyXHJcblx0XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNyZWF0ZURhdGFQb2ludENsdXN0ZXIoY2FyRGF0YVBvaW50VHlwZSl7XHJcblx0dmFyIGNsdXN0ZXIgPSB7XHJcblx0XHRpZDogY2FyRGF0YVBvaW50VHlwZSxcclxuXHRcdGRhdGFBcnJheTogbmV3IEFycmF5KClcclxuXHR9O1xyXG5cdHJldHVybiBjbHVzdGVyO1xyXG59XHJcblxyXG5mdW5jdGlvbiBjcmVhdGVTdWJEYXRhUG9pbnRDbHVzdGVyKGNhckRhdGFQb2ludFR5cGUpe1xyXG5cdHZhciBjbHVzdGVyID0ge1xyXG5cdFx0aWQ6IGNhckRhdGFQb2ludFR5cGUsXHJcblx0XHRkYXRhQXJyYXk6IG5ldyBBcnJheSgpXHJcblx0fTtcclxuXHRyZXR1cm4gY2x1c3RlcjtcclxufVxyXG5cclxuZnVuY3Rpb24gY3JlYXRlRGF0YVBvaW50KGRhdGFJZCwgZGF0YVBvaW50VHlwZSwgZCwgcyl7XHJcblx0dmFyIGRhdGFQb2ludCA9IHtcclxuXHRcdGlkOiBkYXRhSWQsXHJcblx0XHR0eXBlOiBkYXRhUG9pbnRUeXBlLFxyXG5cdFx0ZGF0YTogZCxcclxuXHRcdHNjb3JlOiBzXHJcblx0fTtcclxuXHRyZXR1cm4gZGF0YVBvaW50O1xyXG59XHJcblxyXG5mdW5jdGlvbiBjcmVhdGVDbHVzdGVySW50ZXJmYWNlKGlkKXtcclxuXHR2YXIgY2x1c3RlciA9IHtcclxuXHRcdGNhcnNBcnJheTogbmV3IEFycmF5KCksXHJcblx0XHRjbHVzdGVySUQ6IGlkLFxyXG5cdFx0YXJyYXlPZkNsdXN0ZXJzOiBuZXcgQXJyYXkoKVxyXG5cdH07XHJcblx0cmV0dXJuIGNsdXN0ZXI7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHNvcnRDbHVzdGVyKGNsdXN0ZXIpe1xyXG5cdGNsdXN0ZXIuc29ydChmdW5jdGlvbihhLCBiKXtyZXR1cm4gYS5kYXRhIC0gYi5kYXRhfSk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGZpbmRPamVjdE5laWdoYm9ycyhkYXRhSWQsIGNsdXN0ZXIsIHJhbmdlKSB7XHJcblx0dmFyIG5laWdoYm9ycyA9IG5ldyBBcnJheSgpO1xyXG5cdHZhciBpbmRleCA9IGNsdXN0ZXIuZmluZEluZGV4KHg9PiB4LmlkPT09ZGF0YUlkKTtcclxuXHR2YXIgZ29uZVBhc3RJZCA9IGZhbHNlO1xyXG5cdHZhciBjbHVzdGVyTGVuZ3RoID0gY2x1c3Rlci5sZW5ndGg7XHJcblx0Zm9yKHZhciBpPTA7aTxyYW5nZTtpKyspe1xyXG5cdFx0aWYoKGluZGV4LXJhbmdlKTwwKXtcclxuXHRcdFx0aWYoY2x1c3RlcltpXS5pZD09PWRhdGFJZCl7Z29uZVBhc3RJZD10cnVlO31cclxuXHRcdFx0bmVpZ2hib3JzLnB1c2goKGdvbmVQYXN0SWQ9PT1mYWxzZSk/Y2x1c3RlcltpXTpjbHVzdGVyW2krMV0pO1xyXG5cdFx0fVxyXG5cdFx0ZWxzZSBpZigoaW5kZXgrcmFuZ2UpPmNsdXN0ZXJMZW5ndGgpe1xyXG5cdFx0XHRpZihjbHVzdGVyWyhjbHVzdGVyTGVuZ3RoLTEpLWldLmlkPT09ZGF0YUlkKXtnb25lUGFzdElkPXRydWU7fVxyXG5cdFx0XHRuZWlnaGJvcnMucHVzaCgoZ29uZVBhc3RJZD09PWZhbHNlKT9jbHVzdGVyWyhjbHVzdGVyTGVuZ3RoLTEpLWldOmNsdXN0ZXJbKGNsdXN0ZXJMZW5ndGgtMSktKGkrMSldKTtcclxuXHRcdH1cclxuXHRcdGVsc2Uge1xyXG5cdFx0XHRpZihjbHVzdGVyW2luZGV4LShyYW5nZS8yKStpXS5pZD09PWRhdGFJZCl7Z29uZVBhc3RJZD10cnVlO31cclxuXHRcdFx0bmVpZ2hib3JzLnB1c2goKGdvbmVQYXN0SWQ9PT1mYWxzZSk/Y2x1c3RlcltpbmRleC0ocmFuZ2UvMikraV06Y2x1c3RlclsoaW5kZXgrMSktKHJhbmdlLzIpK2ldKTtcclxuXHRcdH1cclxuXHRcdFxyXG5cdH1cclxuXHRyZXR1cm4gbmVpZ2hib3JzO1xyXG59XHJcblxyXG5mdW5jdGlvbiBmaW5kRGF0YVBvaW50Q2x1c3RlcihkYXRhSWQsIGNsdXN0ZXIpe1xyXG5cdHJldHVybiBjbHVzdGVyLmFycmF5T2ZDbHVzdGVycy5maW5kKHg9PiB4LmlkPT09ZGF0YUlkKTtcclxufVxyXG5cclxuZnVuY3Rpb24gZmluZERhdGFQb2ludChkYXRhSWQsIGNsdXN0ZXIpe1xyXG5cdHJldHVybiBjbHVzdGVyLmRhdGFBcnJheS5maW5kKGZ1bmN0aW9uKHZhbHVlKXtcclxuXHRcdHJldHVybiB2YWx1ZS5pZD09PWlkO1xyXG5cdH0pO1xyXG59XHJcblxyXG5mdW5jdGlvbiBzY29yZU9iamVjdChpZCwgY2x1c3Rlcil7XHJcblx0dmFyIG5laWdoYm9ycyA9IGZpbmRPamVjdE5laWdoYm9ycyhpZCwgY2x1c3RlciwgKChjbHVzdGVyLmxlbmd0aC80KTw0MCk/Njo0MCk7XHJcblx0dmFyIG5ld1Njb3JlID0gMDtcclxuXHRmb3IodmFyIGk9MDtpPG5laWdoYm9ycy5sZW5ndGg7aSsrKXtcclxuXHRcdG5ld1Njb3JlKz1uZWlnaGJvcnNbaV0uc2NvcmU7XHJcblx0fVxyXG5cdHJldHVybiBuZXdTY29yZS9uZWlnaGJvcnMubGVuZ3RoO1xyXG59IiwidmFyIGNsdXN0ZXIgPSByZXF1aXJlKFwiLi9jbHVzdGVyLmpzL1wiKTtcclxuLy92YXIgY2FyT2JqZWN0cyA9IHJlcXVpcmUoXCIuL2Nhci1vYmplY3RzLmpzb25cIik7XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IHtcclxuXHRzZXR1cDogc2V0dXAsXHJcblx0cmVTY29yZUNhcnM6IHJlU2NvcmVDYXJzXHJcbn1cclxuXHJcbi8vXCJ3aGVlbF9yYWRpdXNcIiwgXCJjaGFzc2lzX2RlbnNpdHlcIiwgXCJ2ZXJ0ZXhfbGlzdFwiLCBcIndoZWVsX3ZlcnRleFwiIGFuZCBcIndoZWVsX2RlbnNpdHlcIi9cclxuZnVuY3Rpb24gc2V0dXAoY2FycywgZXh0Q2x1c3RlciwgY2x1c3RlclByZWNyZWF0ZWQpe1xyXG5cdHZhciBjbHVzdCA9IChjbHVzdGVyUHJlY3JlYXRlZD09PWZhbHNlKT9zZXR1cERhdGFDbHVzdGVycyhjbHVzdGVyLmNyZWF0ZUNsdXN0ZXJJbnRlcmZhY2UoXCJuZXdDbHVzdGVyXCIpKTogZXh0Q2x1c3RlcjtcclxuXHRmb3IodmFyIGkgPTA7aTxjYXJzLmxlbmd0aDtpKyspe1xyXG5cdFx0aWYoY2Fyc1tpXS5kZWYuZWxpdGU9PT1mYWxzZSl7XHJcblx0XHRcdGFkZENhcnNUb0NsdXN0ZXIoY2Fyc1tpXSwgY2x1c3QpO1xyXG5cdFx0XHRjbHVzdC5jYXJzQXJyYXkucHVzaChjYXJzW2ldKTtcclxuXHRcdH1cclxuXHR9XHJcblx0Y29uc29sZS5sb2coY2x1c3QpOy8vdGVzdFxyXG5cdHJldHVybiBjbHVzdDtcclxufVxyXG5cclxuZnVuY3Rpb24gc2V0dXBEYXRhQ2x1c3RlcnMobWFpbkNsdXN0ZXIpe1xyXG5cdG1haW5DbHVzdGVyLmFycmF5T2ZDbHVzdGVycy5wdXNoKGNsdXN0ZXIuY3JlYXRlRGF0YVBvaW50Q2x1c3RlcihcIndoZWVsX3JhZGl1c1wiKSk7XHJcblx0bWFpbkNsdXN0ZXIuYXJyYXlPZkNsdXN0ZXJzLnB1c2goY2x1c3Rlci5jcmVhdGVEYXRhUG9pbnRDbHVzdGVyKFwiY2hhc3Npc19kZW5zaXR5XCIpKTtcclxuXHRtYWluQ2x1c3Rlci5hcnJheU9mQ2x1c3RlcnMucHVzaChjbHVzdGVyLmNyZWF0ZURhdGFQb2ludENsdXN0ZXIoXCJ3aGVlbF92ZXJ0ZXhcIikpO1xyXG5cdG1haW5DbHVzdGVyLmFycmF5T2ZDbHVzdGVycy5wdXNoKGNsdXN0ZXIuY3JlYXRlRGF0YVBvaW50Q2x1c3RlcihcInZlcnRleF9saXN0XCIpKTtcclxuXHRtYWluQ2x1c3Rlci5hcnJheU9mQ2x1c3RlcnMucHVzaChjbHVzdGVyLmNyZWF0ZURhdGFQb2ludENsdXN0ZXIoXCJ3aGVlbF9kZW5zaXR5XCIpKTtcclxuXHRyZXR1cm4gbWFpbkNsdXN0ZXI7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGFkZENhcnNUb0NsdXN0ZXIoY2FyLCBjbHVzdCl7XHJcblx0YWRkRGF0YVRvQ2x1c3RlcihjYXIuZGVmLmlkLCBjYXIuZGVmLndoZWVsX3JhZGl1cyxjYXIuc2NvcmUucywgY2x1c3Rlci5maW5kRGF0YVBvaW50Q2x1c3RlcihcIndoZWVsX3JhZGl1c1wiLCBjbHVzdCkpO1xyXG4gICAgYWRkRGF0YVRvQ2x1c3RlcihjYXIuZGVmLmlkLCBjYXIuZGVmLmNoYXNzaXNfZGVuc2l0eSxjYXIuc2NvcmUucywgY2x1c3Rlci5maW5kRGF0YVBvaW50Q2x1c3RlcihcImNoYXNzaXNfZGVuc2l0eVwiLCBjbHVzdCkpO1xyXG5cdGFkZERhdGFUb0NsdXN0ZXIoY2FyLmRlZi5pZCwgY2FyLmRlZi52ZXJ0ZXhfbGlzdCxjYXIuc2NvcmUucywgY2x1c3Rlci5maW5kRGF0YVBvaW50Q2x1c3RlcihcInZlcnRleF9saXN0XCIsIGNsdXN0KSk7XHJcblx0YWRkRGF0YVRvQ2x1c3RlcihjYXIuZGVmLmlkLCBjYXIuZGVmLndoZWVsX3ZlcnRleCxjYXIuc2NvcmUucywgY2x1c3Rlci5maW5kRGF0YVBvaW50Q2x1c3RlcihcIndoZWVsX3ZlcnRleFwiLCBjbHVzdCkpO1xyXG5cdGFkZERhdGFUb0NsdXN0ZXIoY2FyLmRlZi5pZCwgY2FyLmRlZi53aGVlbF9kZW5zaXR5LGNhci5zY29yZS5zLCBjbHVzdGVyLmZpbmREYXRhUG9pbnRDbHVzdGVyKFwid2hlZWxfZGVuc2l0eVwiLCBjbHVzdCkpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBhZGREYXRhVG9DbHVzdGVyKGlkLCBjYXJEYXRhLCBzY29yZSwgY2x1c3Qpe1xyXG5cdGlmKGNsdXN0LmRhdGFBcnJheS5sZW5ndGg9PT1jYXJEYXRhLmxlbmd0aCl7XHJcblx0XHRmb3IodmFyIHg9MDt4PGNhckRhdGEubGVuZ3RoO3grKyl7XHJcblx0XHRcdGNsdXN0LmRhdGFBcnJheVt4XS5kYXRhQXJyYXkucHVzaChjbHVzdGVyLmNyZWF0ZURhdGFQb2ludChpZCwgXCJcIiwgY2FyRGF0YVt4XSwgc2NvcmUpKTtcclxuXHRcdFx0Y2x1c3Rlci5zb3J0Q2x1c3RlcihjbHVzdC5kYXRhQXJyYXlbeF0uZGF0YUFycmF5KTtcclxuXHRcdH1cclxuXHR9XHJcblx0ZWxzZSB7XHJcblx0XHRmb3IodmFyIGk9MDtpPGNhckRhdGEubGVuZ3RoO2krKyl7XHJcblx0XHRcdHZhciBuZXdDbHVzdCA9IGNsdXN0ZXIuY3JlYXRlU3ViRGF0YVBvaW50Q2x1c3RlcihcIlwiKTtcclxuXHRcdFx0bmV3Q2x1c3QuZGF0YUFycmF5LnB1c2goY2x1c3Rlci5jcmVhdGVEYXRhUG9pbnQoaWQsIFwiXCIsIGNhckRhdGFbaV0sIHNjb3JlKSk7XHJcblx0XHRcdGNsdXN0LmRhdGFBcnJheS5wdXNoKG5ld0NsdXN0KTtcclxuXHRcdH1cclxuXHR9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHJlU2NvcmVDYXJzKGNhcnMsIGNsdXN0KXtcclxuXHRmb3IodmFyIGk9MDtpPGNhcnMubGVuZ3RoO2krKyl7XHJcblx0XHR2YXIgc2NvcmUgPSAwO1xyXG5cdFx0Zm9yKHZhciB4PTA7eDxjbHVzdC5hcnJheU9mQ2x1c3RlcnMubGVuZ3RoO3grKyl7XHJcblx0XHRcdGZvcih2YXIgeT0wO3k8Y2x1c3QuYXJyYXlPZkNsdXN0ZXJzW3hdLmRhdGFBcnJheS5sZW5ndGg7eSsrKXtcclxuXHRcdFx0XHRzY29yZSArPSBjbHVzdGVyLnNjb3JlT2JqZWN0KGNhcnNbaV0uZGVmLmlkLCBjbHVzdC5hcnJheU9mQ2x1c3RlcnNbeF0uZGF0YUFycmF5W3ldLmRhdGFBcnJheSk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHRcdGNhcnNbaV0uc2NvcmUucyArPSBzY29yZS9jbHVzdC5hcnJheU9mQ2x1c3RlcnMubGVuZ3RoO1xyXG5cdH1cclxufVxyXG5cclxuIiwiLyp2YXIgcmFuZG9tSW50ID0gcmVxdWlyZShcIi4vcmFuZG9tSW50LmpzL1wiKTtcclxudmFyIGdldFJhbmRvbUludCA9IHJhbmRvbUludC5nZXRSYW5kb21JbnQ7Ki9cclxuXHJcbm1vZHVsZS5leHBvcnRzID0ge1xyXG5cdHJ1bkNyb3Nzb3ZlcjogcnVuQ3Jvc3NvdmVyXHJcbn1cclxuXHJcbi8qVGhpcyBmdW5jdGlvbiBjcmVhdGVzIHRoZSBhY3VhbCBuZXcgY2FyIGFuZCByZXR1cm5lZC4gVGhlIGZ1bmN0aW9uIHJ1bnMgYSBvbmUtcG9pbnQgY3Jvc3NvdmVyIHRha2luZyBkYXRhIGZyb20gdGhlIHBhcmVudHMgcGFzc2VkIHRocm91Z2ggYW5kIGFkZGluZyB0aGVtIHRvIHRoZSBuZXcgY2FyLlxyXG5AcGFyYW0gcGFyZW50cyBPYmplY3RBcnJheSAtIERhdGEgaXMgdGFrZW4gZnJvbSB0aGVzZSBjYXJzIGFuZCBhZGRlZCB0byB0aGUgbmV3IGNhciB1c2luZyBjcm9zc292ZXIuXHJcbkBwYXJhbSBzY2hlbWEgLSBUaGUgZGF0YSBvYmplY3RzIHRoYXQgY2FyIG9iamVjdHMgaGF2ZSBzdWNoIGFzIFwid2hlZWxfcmFkaXVzXCIsIFwiY2hhc3Npc19kZW5zaXR5XCIsIFwidmVydGV4X2xpc3RcIiwgXCJ3aGVlbF92ZXJ0ZXhcIiBhbmQgXCJ3aGVlbF9kZW5zaXR5XCJcclxuQHBhcmFtIG5vQ3Jvc3NvdmVyUG9pbnQgaW50IC0gVGhlIGZpcnN0IGNyb3Nzb3ZlciBwb2ludCByYW5kb21seSBnZW5lcmF0ZWRcclxuQHBhcmFtIG5vQ3Jvc3NvdmVyUG9pbnRUd28gaW50IC0gVGhlIHNlY29uZCBjcm9zc292ZXIgcG9pbnQgcmFuZG9tbHkgZ2VuZXJhdGVkIFxyXG5AcGFyYW0gY2FyTm8gaW50IC0gd2hldGhlciB0aGlzIGNhciBpcyB0aGUgZmlyc3Qgb3Igc2Vjb25kIGNoaWxkIGZvciB0aGUgcGFyZW50IGNhcnNcclxuQHBhcmFtIHBhcmVudFNjb3JlIGludCAtIFRoZSBhdmVyYWdlIHNjb3JlIG9mIHRoZSB0d28gcGFyZW50c1xyXG5AcGFyYW0gbm9DYXJzQ3JlYXRlZCBpbnQgLSBUaGUgbnVtYmVyIG9mIGNhcnMgY3JlYXRlZCBzbyBmYXIsIHVzZWQgZm9yIHRoZSBuZXcgY2FycyBpZFxyXG5AcGFyYW0gY3Jvc3NvdmVyVHlwZSBpbnQgLSBUaGUgdHlwZSBvZiBjcm9zc292ZXIgdG8gdXNlIHN1Y2ggYXMgMSBmb3IgT25lIHBvaW50IGNyb3Nzb3ZlciBhbnkgb3RoZXIgVHdvIHBvaW50IGNyb3Nzb3ZlclxyXG5AcmV0dXJuIGNhciBPYmplY3QgLSBBIGNhciBvYmplY3QgaXMgY3JlYXRlZCBhbmQgcmV0dXJuZWQqL1xyXG5mdW5jdGlvbiBjb21iaW5lRGF0YShwYXJlbnRzLCBzY2hlbWEsIG5vQ3Jvc3NvdmVyUG9pbnQsIG5vQ3Jvc3NvdmVyUG9pbnRUd28sIGNhck5vLCBwYXJlbnRTY29yZSxub0NhcnNDcmVhdGVkLCBjcm9zc292ZXJUeXBlKXtcclxuXHR2YXIgaWQgPSBub0NhcnNDcmVhdGVkK2Nhck5vO1xyXG5cdHZhciBrZXlJdGVyYXRpb24gPSAwO1xyXG5cdHJldHVybiBPYmplY3Qua2V5cyhzY2hlbWEpLnJlZHVjZShmdW5jdGlvbihjcm9zc0RlZiwga2V5KXtcclxuICAgICAgdmFyIHNjaGVtYURlZiA9IHNjaGVtYVtrZXldO1xyXG4gICAgICB2YXIgdmFsdWVzID0gW107XHJcbiAgICAgIGZvcih2YXIgaSA9IDAsIGwgPSBzY2hlbWFEZWYubGVuZ3RoOyBpIDwgbDsgaSsrKXtcclxuICAgICAgICB2YXIgcCA9IGNyb3Nzb3ZlcihjYXJObywgbm9Dcm9zc292ZXJQb2ludCwgbm9Dcm9zc292ZXJQb2ludFR3bywga2V5SXRlcmF0aW9uLCBjcm9zc292ZXJUeXBlKTtcclxuICAgICAgICB2YWx1ZXMucHVzaChwYXJlbnRzW3BdW2tleV1baV0pO1xyXG4gICAgICB9XHJcbiAgICAgIGNyb3NzRGVmW2tleV0gPSB2YWx1ZXM7XHJcblx0ICBrZXlJdGVyYXRpb24rKztcclxuICAgICAgcmV0dXJuIGNyb3NzRGVmO1xyXG4gICAgfSAsIHtcclxuXHRcdGlkOiBpZCxcclxuXHRcdHBhcmVudHNTY29yZTogcGFyZW50U2NvcmVcclxuXHR9KTtcclxufVxyXG5cclxuLypUaGlzIGZ1bmN0aW9uIGNob29zZXMgd2hpY2ggY2FyIHRoZSBkYXRhIGlzIHRha2VuIGZyb20gYmFzZWQgb24gdGhlIHBhcmFtZXRlcnMgZ2l2ZW4gdG8gdGhlIGZ1bmN0aW9uXHJcbkBwYXJhbSBjYXJObyBpbnQgLSBUaGlzIGlzIHRoZSBudW1iZXIgb2YgdGhlIGNhciBiZWluZyBjcmVhdGVkIGJldHdlZW4gMS0yLCBmaWx0ZXJzIGNhcnMgZGF0YSBpcyBiZWluZyB0YWtlblxyXG5AcGFyYW0gbm9Dcm9zc292ZXJQb2ludCBpbnQgLSBUaGUgZmlyc3QgY3Jvc3NvdmVyIHBvaW50IHdoZXJlIGRhdGEgYmVmb3JlIG9yIGFmdGVyIHRoZSBwb2ludCBpcyB0YWtlblxyXG5AcGFyYW0gbm9Dcm9zc292ZXJQb2ludFR3byBpbnQgLSBUaGUgc2Vjb25kIGNyb3Nzb3ZlciBwb2ludCB3aGVyZSBkYXRhIGlzIGJlZm9yZSBvciBhZnRlciB0aGUgcG9pbnQgaXMgdGFrZW5cclxuQHBhcmFtIGtleUl0ZXJhdGlvbiBpbnQgLSBUaGlzIGlzIHRoZSBwb2ludCBhdCB3aGljaCB0aGUgY3Jvc3NvdmVyIGlzIGN1cnJlbnRseSBhdCB3aGljaCBoZWxwIHNwZWNpZmllcyB3aGljaCBjYXJzIGRhdGEgaXMgcmVsYXZlbnQgdG8gdGFrZSBjb21wYXJpbmcgdGhpcyBwb2ludCB0byB0aGUgb25lL3R3byBjcm9zc292ZSBwb2ludHNcclxuQHBhcmFtIGNyb3Nzb3ZlVHlwZSBpbnQgLSBUaGlzIHNwZWNpZmllcyBpZiBvbmUgcG9pbnQoMSkgb3IgdHdvIHBvaW50IGNyb3Nzb3ZlcihhbnkgaW50KSBpcyB1c2VkXHJcbkByZXR1cm4gaW50IC0gV2hpY2ggcGFyZW50IGRhdGEgc2hvdWxkIGJlIHRha2VuIGZyb20gaXMgcmV0dXJuZWQgZWl0aGVyIDAgb3IgMSovXHJcbmZ1bmN0aW9uIGNyb3Nzb3ZlcihjYXJObywgbm9Dcm9zc292ZXJQb2ludCwgbm9Dcm9zc292ZXJQb2ludFR3byxrZXlJdGVyYXRpb24sY3Jvc3NvdmVyVHlwZSl7XHJcblx0aWYoY3Jvc3NvdmVyVHlwZT09PTEpeyAvL3J1biBvbmUtcG9pbnQgY3Jvc3NvdmVyXHJcblx0XHRyZXR1cm4gKGNhck5vPT09MSk/KGtleUl0ZXJhdGlvbj49bm9Dcm9zc292ZXJQb2ludCk/MDoxOihrZXlJdGVyYXRpb24+PW5vQ3Jvc3NvdmVyUG9pbnQpPzE6MDsvLyBoYW5kbGVzIHRoZSBmaXhlZCBvbmUtcG9pbnQgc3dpdGNoIG92ZXJcclxuXHR9XHJcblx0ZWxzZSB7IC8vcnVuIHR3by1wb2ludCBjcm9zc292ZXJcclxuXHRcdGlmKGNhck5vPT09MSl7XHJcblx0XHRcdGlmKCgoa2V5SXRlcmF0aW9uPm5vQ3Jvc3NvdmVyUG9pbnQpJiYoa2V5SXRlcmF0aW9uPG5vQ3Jvc3NvdmVyUG9pbnRUd28pKXx8KChrZXlJdGVyYXRpb24+bm9Dcm9zc292ZXJQb2ludFR3bykmJihrZXlJdGVyYXRpb248bm9Dcm9zc292ZXJQb2ludCkpKXtcclxuXHRcdFx0XHRyZXR1cm4gMDtcclxuXHRcdFx0fVxyXG5cdFx0XHRlbHNlIHsgcmV0dXJuIDE7fVxyXG5cdFx0fVxyXG5cdFx0ZWxzZXtcclxuXHRcdFx0aWYoKChrZXlJdGVyYXRpb24+bm9Dcm9zc292ZXJQb2ludCkmJihrZXlJdGVyYXRpb248bm9Dcm9zc292ZXJQb2ludFR3bykpfHwoKGtleUl0ZXJhdGlvbj5ub0Nyb3Nzb3ZlclBvaW50VHdvKSYmKGtleUl0ZXJhdGlvbjxub0Nyb3Nzb3ZlclBvaW50KSkpe1xyXG5cdFx0XHRcdHJldHVybiAxO1xyXG5cdFx0XHR9XHJcblx0XHRcdGVsc2UgeyByZXR1cm4gMDt9XHJcblx0XHR9XHJcblx0fVxyXG59XHJcblxyXG4vKlRoaXMgZnVuY3Rpb24gcmFuZG9tbHkgZ2VuZXJhdGVzIHR3byBjcm9zc292ZXIgcG9pbnRzIGFuZCBwYXNzZXMgdGhlbSB0byB0aGUgY3Jvc3NvdmVyIGZ1bmN0aW9uXHJcbkBwYXJhbSBwYXJlbnRzIE9iamVjdEFycmF5IC0gQW4gYXJyYXkgb2YgdGhlIHBhcmVudHMgb2JqZWN0c1xyXG5AcGFyYW0gY3Jvc3NvdmVyVHB5ZSBpbnQgLSBTcGVjaWZpZWQgd2hpY2ggY3Jvc3NvdmVyIHNob3VsZCBiZSB1c2VkXHJcbkBwYXJhbSBzY2hlbWEgLSBDYXIgb2JqZWN0IGRhdGEgdGVtcGxhdGUgdXNlZCBmb3IgY2FyIGNyZWF0aW9uXHJcbkBwYXJhbSBwYXJlbnRTY29yZSBpbnQgLSBBdmVyYWdlIG51bWJlciBvZiB0aGUgcGFyZW50cyBzY29yZVxyXG5AcGFyYW0gbm9DYXJzQ3JlYXRlZCBpbnQgLSBudW1iZXIgb2YgY2FycyBjcmVhdGVkIGZvciB0aGUgc2ltdWxhdGlvblxyXG5AcGFyYW0gbm9DYXJzVG9DcmVhdGUgaW50IC0gdGhlIG51bWJlciBvZiBuZXcgY2FycyB0aGF0IHNob3VsZCBiZSBjcmVhdGVkIHZpYSBjcm9zc292ZXJcclxuQHJldHVybiBjYXIgT2JqZWN0QXJyYXkgLSBBbiBhcnJheSBvZiBuZXdseSBjcmVhdGVkIGNhcnMgZnJvbSB0aGUgY3Jvc3NvdmVyIGFyZSByZXR1cm5lZCovXHJcbmZ1bmN0aW9uIHJ1bkNyb3Nzb3ZlcihwYXJlbnRzLGNyb3Nzb3ZlclR5cGUsc2NoZW1hLCBwYXJlbnRzU2NvcmUsbm9DYXJzQ3JlYXRlZCwgbm9DYXJzVG9DcmVhdGUpe1xyXG5cdHZhciBuZXdDYXJzID0gbmV3IEFycmF5KCk7XHJcblx0dmFyIGNyb3Nzb3ZlclBvaW50T25lPWdldFJhbmRvbUludCgwLDQsIG5ldyBBcnJheSgpKTtcclxuXHR2YXIgY3Jvc3NvdmVyUG9pbnRUd289Z2V0UmFuZG9tSW50KDAsNCwgW2Nyb3Nzb3ZlclBvaW50T25lXSk7XHJcblx0Zm9yKHZhciBpPTA7aTxub0NhcnNUb0NyZWF0ZTtpKyspe1xyXG5cdFx0bmV3Q2Fycy5wdXNoKGNvbWJpbmVEYXRhKHBhcmVudHMsc2NoZW1hLCBjcm9zc292ZXJQb2ludE9uZSwgY3Jvc3NvdmVyUG9pbnRUd28sIGksIHBhcmVudHNTY29yZSxub0NhcnNDcmVhdGVkLGNyb3Nzb3ZlclR5cGUpKTtcclxuXHR9XHJcblx0cmV0dXJuIG5ld0NhcnM7XHJcbn1cclxuXHJcbi8qVGhpcyBmdW5jdGlvbiByZXR1cm5zIHdob2xlIGludHMgYmV0d2VlbiBhIG1pbmltdW0gYW5kIG1heGltdW1cclxuQHBhcmFtIG1pbiBpbnQgLSBUaGUgbWluaW11bSBpbnQgdGhhdCBjYW4gYmUgcmV0dXJuZWRcclxuQHBhcmFtIG1heCBpbnQgLSBUaGUgbWF4aW11bSBpbnQgdGhhdCBjYW4gYmUgcmV0dXJuZWRcclxuQHBhcmFtIG5vdEVxdWFsc0FyciBpbnRBcnJheSAtIEFuIGFycmF5IG9mIHRoZSBpbnRzIHRoYXQgdGhlIGZ1bmN0aW9uIHNob3VsZCBub3QgcmV0dXJuXHJcbkByZXR1cm4gaW50IC0gVGhlIGludCB3aXRoaW4gdGhlIHNwZWNpZmllZCBwYXJhbWV0ZXIgYm91bmRzIGlzIHJldHVybmVkLiovXHJcbmZ1bmN0aW9uIGdldFJhbmRvbUludChtaW4sIG1heCwgbm90RXF1YWxzQXJyKSB7XHJcblx0dmFyIHRvUmV0dXJuO1xyXG5cdHZhciBydW5Mb29wID0gdHJ1ZTtcclxuXHR3aGlsZShydW5Mb29wPT09dHJ1ZSl7XHJcblx0XHRtaW4gPSBNYXRoLmNlaWwobWluKTtcclxuXHRcdG1heCA9IE1hdGguZmxvb3IobWF4KTtcclxuXHRcdHRvUmV0dXJuID0gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogKG1heCAtIG1pbiArIDEpKSArIG1pbjtcclxuXHRcdGlmKHR5cGVvZiBmaW5kSWZFeGlzdHMgPT09IFwidW5kZWZpbmVkXCIpe1xyXG5cdFx0XHRydW5Mb29wPWZhbHNlO1xyXG5cdFx0fVxyXG5cdFx0ZWxzZSBpZihub3RFcXVhbHNBcnIuZmluZChmdW5jdGlvbih2YWx1ZSl7cmV0dXJuIHZhbHVlPT09dG9SZXR1cm47fSk9PT1mYWxzZSl7XHJcblx0XHRcdHJ1bkxvb3A9ZmFsc2U7XHJcblx0XHR9XHJcblx0fVxyXG4gICAgcmV0dXJuIHRvUmV0dXJuOy8vKHR5cGVvZiBmaW5kSWZFeGlzdHMgPT09IFwidW5kZWZpbmVkXCIpP3RvUmV0dXJuOmdldFJhbmRvbUludChtaW4sIG1heCwgbm90RXF1YWxzQXJyKTtcclxufVxyXG4iLCJtb2R1bGUuZXhwb3J0cz17XCJuYW1lXCI6XCJvYmplY3RzXCIsXCJhcnJheVwiOlt7XCJpZFwiOlwiMC5oZGY1cW43dnJtXCIsXCJ3aGVlbF9yYWRpdXNcIjpbMC41NzY3NjkwODI0NzIxMjQ4LDAuNDE3NzI4NjE1NDQ3NjgzNl0sXCJ3aGVlbF9kZW5zaXR5XCI6WzAuMDU4MDU4Mjg0OTkzMjI3NjMsMC41NTU4NDg1MDI5MjE4MjE2XSxcImNoYXNzaXNfZGVuc2l0eVwiOlswLjAxNzQ2OTIyNDgyODMwNjE1XSxcInZlcnRleF9saXN0XCI6WzAuNzk0MTU0NjAyNzUzMTc5NCwwLjMzODYxMDU4MzEzNDE4MzQ2LDAuOTgxNzk2NjcyNzM1MDg4NiwwLjA0MDU4MzkxODk5MDM5NDcxLDAuNjc5Mjc2NDg0MDA4NDU3NywwLjcwOTU1MTY4MzM0Mjk4NjksMC40NDQyOTI5Njg5Nzg2MDM3LDAuMzcxNTk3MDk2MzM5NzgxNDQsMC40ODY1NTQ5MTM4OTgwNzMxNSwwLjgxOTQ4OTc0MzQ2Nzk5NDksMC4wNjc5MTI5Mjc2MjkyMjI1MiwwLjg1MDA2MTcxODc5ODEyMDFdLFwid2hlZWxfdmVydGV4XCI6WzAuMzE5NzQ1NDgzMzgwNDgwNSwwLjA3MzA2ODMyNTUzNDQzNTMyLDAuOTY5NjY4MDIyMTMyMTkxOCwwLjI4MjQyOTE0NDYyODg2ODUsMC4yMzgwMTA4NDM1MzU2MjYzLDAuMDM0MjAxNjM2NTI4NTAwMDYsMC4zOTMwMjA0NDc4NDk0MDE1LDAuOTI5MjU4OTAyNjE2ODYwNV0sXCJpbmRleFwiOjB9LHtcImlkXCI6XCIwLmRkdnFvOWM0dTVcIixcIndoZWVsX3JhZGl1c1wiOlswLjA3NjI3MzExNjUzNjkwMzA1LDAuMzgwNzc1NjU4MjQ3MDYzODNdLFwid2hlZWxfZGVuc2l0eVwiOlswLjAxODYzNjk3ODgxMDg2NDY4LDAuMDI2ODY0MzYxNzg5MzEwMjg3XSxcImNoYXNzaXNfZGVuc2l0eVwiOlswLjcwNDU1Njg1OTY5Njk4MThdLFwidmVydGV4X2xpc3RcIjpbMC44ODI3ODM2NzM4NDUxNDEzLDAuNDE5MDYxNzQ5MzQ5OTk4NCwwLjAxNzE0NzYyNjg0NDQxNzA2MywwLjIyNzc1NTM1MzQ1MjUyMDMsMC45MzkxODUyMzAwNTYyMzkxLDAuNDE2MjM1MzUwNDc0Nzk5NzYsMC42Njc4NzQyOTY2NTU0MjMsMC4zMTg0OTM2MDkyOTg0MjIzLDAuODg1NjAxNzkyMjYzMjE0LDAuMTM0NjUzOTgxMTYyMzk2OCwwLjMyMjM4NTMwMzg3MjQ4OCwwLjE2MTQwNzQ3MjM5NjkwMV0sXCJ3aGVlbF92ZXJ0ZXhcIjpbMC4xNzIwNjYyNTE2NzE4MjU0MywwLjI4NjQzMDYyNzc1MDIwNjIsMC45Mzg1MTM4ODU5Mzg5NjE3LDAuNzEyMDUxNjM0Njc4OTcwMywwLjQ3NjgxODQxNzc2MzAxMjE1LDAuOTU3MzQyMDA1NzM3MTYxNSwwLjM0Nzc5NjU3NjAzNDE5MDU2LDAuNDk0MjQyODAwMTM2OTUwMV0sXCJpbmRleFwiOjF9LHtcImlkXCI6XCIwLmk1OGVpY3VvZ3BcIixcIndoZWVsX3JhZGl1c1wiOlswLjg3OTc3NDIyMDI3OTM2OTIsMC40OTQ2MDkwMDQxNzAxNjYzXSxcIndoZWVsX2RlbnNpdHlcIjpbMC42OTA3NzE1NzAwMjM5NTYzLDAuMzU0MzI5ODQ5OTM1NjE1NTZdLFwiY2hhc3Npc19kZW5zaXR5XCI6WzAuOTk3MTA5NzYzOTM1ODU5N10sXCJ2ZXJ0ZXhfbGlzdFwiOlswLjMzNTU5Mzk3NjY3OTU2ODYsMC4zNjc3MDM1NjE2MTIwOTk2LDAuMjUyMjEwMTc0MDgxMzE0NzQsMC42MDQyMTM1NzE4MTY0MzUsMC4xNDMwMzAzNjk3NjUxNzQ3LDAuNjcwNzQxNDUzODUwMTM0NCwwLjc5NzY0MTA3OTA1ODU3OTcsMC4wMDMzMDQwMTkzMTU3NTgyOTk4LDAuNDgyMjU4NjQ1MDA1MzAwMzYsMC45NzIyNDYzNDkwNzM5ODYzLDAuMTMzMjY2ODUxOTA2MTg4MTQsMC4yNDUxMTg2MzY4MTg2MzI2Nl0sXCJ3aGVlbF92ZXJ0ZXhcIjpbMC45MTM0NjMyNTc2NzYzMzU1LDAuODAyODU1NzE3OTIzMTM1MywwLjA2NTIwODg3NjAyMDAyNjQ1LDAuNTAwODc4NDg0MTc1MzQxOCwwLjI5NjYwODIyOTY0OTI5NzM0LDAuODI2ODg0Nzk3MDQ5OTMzMywwLjcwMzUxMDc3MjY3Njg3NzksMC4wMjAxNDkxNTY3MjAzMTExNDVdLFwiaW5kZXhcIjoyfSx7XCJpZFwiOlwiMC5ndXRqNzZhODhmXCIsXCJ3aGVlbF9yYWRpdXNcIjpbMC45MjkzMjI5MTc5ODIxOTg1LDAuMTQwOTYwMTg4MDY0Mjk3MjJdLFwid2hlZWxfZGVuc2l0eVwiOlswLjk2MTA2Njg3NDE3ODQ0NTIsMC4xMjkxODkzNTA0NTU0NDYyMl0sXCJjaGFzc2lzX2RlbnNpdHlcIjpbMC40NDEyOTM4NjEyNzc0NzczXSxcInZlcnRleF9saXN0XCI6WzAuNTA5NjY2Mjg1MzkwMTI3LDAuMDQ0MDQyNDcwMzcxODgzOCwwLjMyMzU1NTE0NjE1NDgxMDk2LDAuNTAyODU2MDQ5MTQ2NzgzNywwLjg4NTU1MjU2MTE4NDY4ODYsMC42NjM0NzQ3NjMzOTA4ODE3LDAuMDUzNzIwMTM1NDc5NzI1MjA2LDAuMDM5Mzk5MTkxMTM0NzM1NzgsMC44NjU5MTMwNDc5OTg4MDMzLDAuNTI5MjYxMDE5MTE1NTc5MywwLjI1ODQ0OTc0NDExNzMzOTQ1LDAuMTU2NzQ5NTM1OTMzMDU4NjNdLFwid2hlZWxfdmVydGV4XCI6WzAuMTA5MjI1Mjk3OTg1NDY3NTQsMC44Njk3NjcwNzUwNDYxMjY4LDAuODMwODA3OTQ1OTg3NzMxMywwLjYzODMxMDI3NjYxOTc1MjgsMC43MDk5OTY5ODU4MDk2Mjk2LDAuNTM4OTUwOTc0NTExMTQyMywwLjg5NzgzNzYzMzE5NjExMjksMC42NDIwNjY0NTAxMDg1ODg0XSxcImluZGV4XCI6M30se1wiaWRcIjpcIjAuczBxYjhnZDF1azhcIixcIndoZWVsX3JhZGl1c1wiOlswLjcyMTk4NjU5NDEwNTAwMDMsMC44NzQ5MjI4NzY0ODk4NjI3XSxcIndoZWVsX2RlbnNpdHlcIjpbMC44ODg4ODI3MzE5NzM0NDY3LDAuMzYzMzc4MDk3MjI4NDgxN10sXCJjaGFzc2lzX2RlbnNpdHlcIjpbMC43ODExNTE0MzQxNzg4OTcyXSxcInZlcnRleF9saXN0XCI6WzAuMDcxMDI5ODI1MTkwMjIyNiwwLjA0Nzc3ODM5OTIxNzYwNzk2LDAuMTMyNTg4ODM4ODk5MzgwNTYsMC45NzY2NjQ3NjczMzA2ODU2LDAuNTQwMDM5OTMzNjcyNTcwNywwLjAwOTQ5MDMwMzI3MTU4MTg0NiwwLjYxMDU2MTgzNDUyOTM2MDIsMC4zMDc2OTY4NDA2NDYyODk0NCwwLjk1MzY4MjIxMzAzNjEzNzUsMC42NjA4OTYwOTgxNTczODczLDAuMzg3ODg3NjY4NDEyMzUzNTYsMC4xNDY5ODIxMTI3MzUxNTExNl0sXCJ3aGVlbF92ZXJ0ZXhcIjpbMC40NTc5NjA1NTM5ODExOTcwNiwwLjUwODIzODQwMDUzODc5MTQsMC42OTEwMDcwNjM3MzM5NTI3LDAuNDk0OTE0ODA1NzYxOTUwNTcsMC4wMTc1NjQ5ODMwNTY2Njk1MzYsMC45MDA0MTg3MTIxOTM5MjM2LDAuOTUwODg4MTQ5NDQzNzc4LDAuMzE0NTc3MTg3OTk4MzEzOV0sXCJpbmRleFwiOjR9LHtcImlkXCI6XCIwLmFtNTBza2ZpZnY4XCIsXCJ3aGVlbF9yYWRpdXNcIjpbMC40MzcxNzgyMTUxNzA1MDE3LDAuMTY5MzQ0MDc1Mjg2Njk1OTNdLFwid2hlZWxfZGVuc2l0eVwiOlswLjUxNTU2MTU1MzAzODI0NDUsMC4zNzQ2Mzk4NjI2NTU4NDg3XSxcImNoYXNzaXNfZGVuc2l0eVwiOlswLjk3Nzc4MzEwMTAzOTg1NzldLFwidmVydGV4X2xpc3RcIjpbMC40MjE4MjU0MzMyOTE4NDAzLDAuMTM0MDI5OTE5Nzk3OTg1OTUsMC41Njc5NTIzODMzODA0MjYxLDAuOTk4NjM2MDQ1NDcxMjEzMSwwLjEzNzAyMjY1MjkwNDk3MTQsMC42ODY2MjI2NzIzOTk0MzA5LDAuMjEwODUwNjY3MjI4NTgxNDgsMC4xMTIwMTI4MTAzNjM0Nzg1NCwwLjY0NTg4NjgwODM4OTYyNDMsMC43Njg2MzQ5MTc5MTkyNTk1LDAuNTYzMTI3OTQxMDgzMzA3NywwLjg5Mjk1Mjc4NzAyNzczOTRdLFwid2hlZWxfdmVydGV4XCI6WzAuMzIwMTMwMDQ2MzM5MzEwMiwwLjc4ODEzMDQ3ODUyOTc2NjksMC4xOTk0NjIyNjYzODcwOTUzLDAuNTM2MTMxMjQ3MDc5MDUyMiwwLjkzNzI4NDQ3MDQzMjcwNzcsMC42MDI5NTY2MTA5MjA3OTMxLDAuNjY1NDk1OTkyMDM5MTgyMSwwLjI1NDQwNzU2MDc5MjA5MTddLFwiaW5kZXhcIjo1fSx7XCJpZFwiOlwiMC5tamNnOWZlbWFuZ1wiLFwid2hlZWxfcmFkaXVzXCI6WzAuNjA3NTI4NjE3ODk5NjMzNSwwLjAyODkzMjM1MDg3ODI5OTkzXSxcIndoZWVsX2RlbnNpdHlcIjpbMC42ODgxMTcxMDg5MjA1NTQ5LDAuMzY4MTM2OTAzMDUxNzc2MjddLFwiY2hhc3Npc19kZW5zaXR5XCI6WzAuOTE5NDc0MzY2Nzk0NzkzMV0sXCJ2ZXJ0ZXhfbGlzdFwiOlswLjkwNDU2NjY5MDgxMzI4ODEsMC4wMzE3MDE0NDkzMDQ3ODAyNSwwLjMzMzg0MTMwMDIxMzc0MDYsMC43ODQ4MTcwMzg1NDA4MjY2LDAuODgzMjQwNzc3MjI0MjgxNiwwLjgyNjUzMzQ3MTg3NjkxNDQsMC45NjI5Njk1NTMxMjQ0MjI5LDAuMjczNjA0MTQwMjA5MjE5MSwwLjgwODgwODc0NDk3NjM4MDEsMC40MTA3NjEwNzMxMjc5NDU2MywwLjgyMTc5OTY2MzM2Nzk3MDUsMC4xNDgzNzAyMzY1MjMxNzM2XSxcIndoZWVsX3ZlcnRleFwiOlswLjExNDgwNzgxNzQzNTEzMTAyLDAuMTY5NzM2ODk5NDk3NzE3MywwLjIyOTg2NDE1OTIyMDU0NTI2LDAuOTUxMTUzNjU0NjM3NTM1NywwLjc4MDkyMzEyOTIzOTE0NSwwLjc5MTAyNjgzODk2NjM4MjgsMC4zNDU2MTAzNDY0Nzc2Mjc3LDAuOTYxMzg1OTc3NjUyNzkwN10sXCJpbmRleFwiOjZ9LHtcImlkXCI6XCIwLmlkZmp2ZTZmOHQ4XCIsXCJ3aGVlbF9yYWRpdXNcIjpbMC41NDExNTU5NTgxNDk1MTczLDAuNDQxMjUwNTMwNDgwODkwNDddLFwid2hlZWxfZGVuc2l0eVwiOlswLjI1OTA5ODc1NDkyODI2Mjg0LDAuNDcwMjEzOTkwNjk0NTYzMjddLFwiY2hhc3Npc19kZW5zaXR5XCI6WzAuMzYxMzcyODIwMjI4NTAxNl0sXCJ2ZXJ0ZXhfbGlzdFwiOlswLjQxMDIxMzkxNTQ0MjY5MzE0LDAuOTg4MTkzMjk2OTc2OTU4OSwwLjQ5ODQ3MTE0ODU5NTU0ODg2LDAuMzczMTk3Njg3Njg4MDU5ODMsMC4wMDUwMDI1MTM0Nzc5Mjk5MDQsMC40ODk5Mzk5NDU1MDczNzY3NCwwLjk2NzI3NTY4MjQwMTE2ODEsMC42MTA5MjcxMTczOTI3LDAuNjY5ODAxNDc1MTIzODg3MiwwLjk5NzM2OTAyODA5NTAwNjcsMC4xOTQ0MzYzMjg2OTQ0NjIxNSwwLjA0NzY1ODQ3MDU1MDQ1NDEzNV0sXCJ3aGVlbF92ZXJ0ZXhcIjpbMC4yODY0MjcwNzQ0ODA1NDg2LDAuMTkwNDAwODM4MDYxMTI4NjIsMC43NzE5NTQ3NjE4MjA3Njc2LDAuMzEzMDY4ODAyMzk5MjQyMywwLjU1Mjk5MTYzNjQyNTkyMDIsMC45MTMzNDM0ODA4Mzc2NjE5LDAuNDcxMTUyOTA2MjI2Njg4NiwwLjg4NzEzNjAyNDgyMTAzOThdLFwiaW5kZXhcIjo3fSx7XCJpZFwiOlwiMC45a2V2N2VlZnAzXCIsXCJ3aGVlbF9yYWRpdXNcIjpbMC4yOTgzMTUyNzMwNDg1ODE2MywwLjc1NDQ4OTU3MTYwODc2MDVdLFwid2hlZWxfZGVuc2l0eVwiOlswLjE5ODE4Nzc5ODgzNTY2ODQsMC43MDE3NDA3MTIzMjI3MzU1XSxcImNoYXNzaXNfZGVuc2l0eVwiOlswLjEyNjk4MDAyMTE5NzIzNjA2XSxcInZlcnRleF9saXN0XCI6WzAuOTE4OTI4MzI0MzY0NDIyOCwwLjY3MTE0MTYzNzg2NzMwMjUsMC41MDc5NDE5Mjg5Nzk5MzU0LDAuNjE4MTAzNjQ4NDI0NDI0NCwwLjk0Nzk2OTU2NjIyMzk0MTEsMC4yNjk3MzM1MzkzODk1NjM0NiwwLjc3NTY1MTM1ODg5MjI5OCwwLjg3NTYxNjkyMzMyOTM5MDcsMC4wNTc3MjYwMjY3ODgxMTU2NywwLjI1NTQ5NTA3NzM2OTI4NjgsMC43Mzk4NjQxNjM4MTA2MjAzLDAuNzExNjg2NzY0MDAzNzQ3NF0sXCJ3aGVlbF92ZXJ0ZXhcIjpbMC4xMzIxMTA4ODIzOTIxMzE1MywwLjAyNzA0MjQ2NDYwMzM3NjAwNCwwLjAwMjcwNDYwMjI0ODQ4MjY3OTMsMC45MTg4OTA4NDEyMDQ3MTI4LDAuMTI3MzQ5MzczMzAzNDY2OTYsMC42MzEyNDA5MTM5Nzg1Nzg2LDAuNTQ1ODM2MTE0MzQ4Mzc3MiwwLjQyMDI3ODAxMjMwMzc3MDhdLFwiaW5kZXhcIjo4fSx7XCJpZFwiOlwiMC45NG92MWl2dmQxZ1wiLFwid2hlZWxfcmFkaXVzXCI6WzAuNDIxNzQ1NDg2NTU2ODU0NiwwLjE0OTMwNDYyODY3NzM3NzZdLFwid2hlZWxfZGVuc2l0eVwiOlswLjE1NzgwMDE0NTM5Nzg1NzQ3LDAuNjM0OTM4NzkwOTEwMzkwN10sXCJjaGFzc2lzX2RlbnNpdHlcIjpbMC4yNjExMDE1MDgyMDIyMDgxXSxcInZlcnRleF9saXN0XCI6WzAuMTYxNDA1NjE5ODExNTA2OCwwLjcwNzMzODUzMDg4MzE0ODEsMC44ODY1Nzc1MjA0MDU5OTI1LDAuMzg1OTI5NTk1NzIyNjgxOCwwLjAwNjMyMzc0MTQ5MDcyMjkwMSwwLjU2MDA3MTcxNjAzMzgyMjIsMC43MTUwODI4NTg0MzQ0NDA0LDAuNDY0NTQ1MTU1MzQ4Mzc1MjYsMC4wODc4NzExNjkwNzE1NjcyMiwwLjc0ODI3MjY0MjQzODEzODMsMC42MDA3MzM0MDc5MTkxODY4LDAuMzEyNzExODcxMDMyMjg4N10sXCJ3aGVlbF92ZXJ0ZXhcIjpbMC4yNDM2MjI4MzU3ODExMTMyLDAuODc3MDk5MDM2NzM4ODQ4MywwLjU1NjMzMjQ1MTg1MzgzOTUsMC4yMTU4MDA1Nzg1NjkxODcsMC43OTQ3NzQxOTM2Njc5NTMxLDAuNzQ1MzE0NzI5NDc0MjYwNCwwLjczMjY2NTUwNTAxMDQ5NTEsMC44MTI1NDMzNzQ3MDczNzA5XSxcImluZGV4XCI6OX0se1wiaWRcIjpcIjAuZXV2M2NoZmNvZ1wiLFwid2hlZWxfcmFkaXVzXCI6WzAuNTA2MTgwMTkyNTkwOTA4LDAuNDA3NDMwMTI0ODAyMzI3MV0sXCJ3aGVlbF9kZW5zaXR5XCI6WzAuMjI4MTkzODcwODg1MjY3NTUsMC4yMDM4ODQwNzk5Nzk3MDA4Ml0sXCJjaGFzc2lzX2RlbnNpdHlcIjpbMC45ODY4MDk4NDk5ODI5NzM4XSxcInZlcnRleF9saXN0XCI6WzAuODkwMTEwNDkxNjIyMTc5NCwwLjAzODI0NjA1MzYyMzg0MjcsMC4wMTI0NzYyMTc3NTE4OTA0NSwwLjMxOTgyMzkzNzUzOTAwMDQsMC4yNDYxNDI2MTcwMjU4NDExNywwLjY2MTIxNDIwNTYxMDg5NSwwLjIwODg3ODYxNDA3MTc5Mzc2LDAuMzA3MjQ0MjcyMzUyMzQ4NzUsMC42OTA2NDc3OTkzMjE5NDcxLDAuMTM0MjAzMjgyNjEwNDUyNDUsMC41NTYyMDU3NjYzOTI1MDY0LDAuNTYzNjkxMjMzNjA2MDcxM10sXCJ3aGVlbF92ZXJ0ZXhcIjpbMC4yNzI5Mjk0MDMxNTgyNzk4NSwwLjgxMTY2OTQ4MTEwNDk5OTQsMC4zNDMwNTQyNzA4MTI2NzYyNSwwLjczNzc5MDM3MDkyNjM5OCwwLjcxNDQwNDk2MzIwNTE5NzYsMC40MTM2NTUzNDkyODIyOTU0LDAuOTA2NTc4ODY1MDY2OTQ4NiwwLjI2NzM0MzY2ODQyMjA0NjddLFwiaW5kZXhcIjoxMH0se1wiaWRcIjpcIjAuM3Q3M3IwODk4NzhcIixcIndoZWVsX3JhZGl1c1wiOlswLjMzNDM0Nzc4MjM2MDgxODk3LDAuMzMxMTA3NTAwNDQ3Mjg5Ml0sXCJ3aGVlbF9kZW5zaXR5XCI6WzAuMTQ4MjY1MTA4ODc3NTIwNjUsMC43NDg3NDAwNTc3MDE4NjldLFwiY2hhc3Npc19kZW5zaXR5XCI6WzAuMDk2ODY5NjQ3NzgwNTk1NDhdLFwidmVydGV4X2xpc3RcIjpbMC4xNzM0NTE4OTA5NzMzNTgsMC45NTQ5NTc4NTM1MDQ0ODYsMC4xMjk2OTAxMjM4ODYzOTM2NywwLjgwOTM0NDAwNDk1Nzk3NTksMC4yMDY2MjE3MDIyMzYzMzIzNiwwLjU5NTc0NzU0OTQzMDgzNjksMC4xMjA5MzA5MzY0NDYyNzY3MywwLjIzODI3Njc4NTE1NDA2NDE0LDAuODc4MjM2OTc3MTU1MDU5MSwwLjE4NzkzOTcyNDQwOTAyMTc0LDAuNTM0MDI0OTg0NDYxMjc3NCwwLjY3NDY5MzYyNTU4OTY0MjNdLFwid2hlZWxfdmVydGV4XCI6WzAuNzczNzQ1MjgyODU2NTUyOCwwLjIxNzk3MzI3MDQyMjMxMjMsMC42NDMzOTI2MTI2OTMzMjI3LDAuMDU1OTczOTkxMjg4NjMyMTIsMC44MzY0OTA5MjAxMDI4MDgxLDAuNTU5NDI2NjM2ODU0MDg4OCwwLjQ4MDI2ODkyNjcxNzM2MzY1LDAuMTMyODYzMzg1NDQ3NDU5MDFdLFwiaW5kZXhcIjoxMX0se1wiaWRcIjpcIjAub3RwNG1oZ2ZmbGdcIixcIndoZWVsX3JhZGl1c1wiOlswLjMwOTY3MjM4OTA4OTkwNzYsMC4zMjcwOTA1ODQ1ODYyNTM1XSxcIndoZWVsX2RlbnNpdHlcIjpbMC45NTE5Nzk3Nzc5NDcwNjU4LDAuNDgyNDY1OTEyNzk0ODY5NF0sXCJjaGFzc2lzX2RlbnNpdHlcIjpbMC41MDg4NDk1MTM5NzE2MzRdLFwidmVydGV4X2xpc3RcIjpbMC4wNTM4NTA3NjgwNDgyMTAzMiwwLjQ3MjQ2MTU3Njk3NTQ1NzIsMC40NzU5MTg3NjA3NTcxOTkzLDAuODQwNDM5MjEwMzkwNDY5NCwwLjYwNjgwMzkxODQwNTY5ODYsMC4yNDUwNjAzNzk1NzYyNDUxNiwwLjc4OTA1ODM1OTEwOTcyMTgsMC40MjgwNzI3MzQ4Mjg1MDE0LDAuOTE0MzA4Mzk5ODE0NzQzLDAuMDE2Njc5MjQ1Nzg2MzUwNDk0LDAuMDIzNTk3MzY1OTIyNzk0MTU2LDAuNTQ3MjE1MDQ3ODI5NjUyNV0sXCJ3aGVlbF92ZXJ0ZXhcIjpbMC45NjgxMzI1NDcxMDg2OTIzLDAuODQ0MDU5MjgwNDgzMjQzNiwwLjU2MzMwNDM4ODc1NzI5NTMsMC4zODY1OTk5NzE5MDU3MzExNCwwLjk0NTcyNTY5NzY4MDIwNzMsMC4xNTY4OTU5NTc0NjgzODQzNiwwLjU0NTk5MDMyODEwNjM0NDMsMC42ODM0NzY2NjAxNjQzMzQxXSxcImluZGV4XCI6MTJ9LHtcImlkXCI6XCIwLm03MmNtOGdsY2lcIixcIndoZWVsX3JhZGl1c1wiOlswLjQ5MjExOTAyMDU3MDI1NTcsMC45NzMwMTIzMTIyMTg3NDQ4XSxcIndoZWVsX2RlbnNpdHlcIjpbMC42MTM4NzMxMTA3NjIyMjcxLDAuODAxODg4MjYwNzQwNzddLFwiY2hhc3Npc19kZW5zaXR5XCI6WzAuMjczMzYzNjYyMjEyNjU0OTZdLFwidmVydGV4X2xpc3RcIjpbMC40ODY3MzM3OTM3MTM0NzcyNSwwLjU2MTY2Mzk0MjExODY4MDksMC42NjUyNjI4Njc1NDUzNzMzLDAuNTIxMTI3ODY5NDgzMDk1LDAuODgyNjIzNjY4MDI4MzcxNCwwLjc3MjQzNzAxNTk2NzE5NjMsMC41MzI4NTQzNjQzMDE0ODc0LDAuNDgyODk5NDUzOTUwMzE5NzUsMC43MDExMTI4OTM5OTg1ODQ1LDAuOTQwNzkxOTM3NDk1OTEzMywwLjUxOTY3NTgwMTYyNjgxNDQsMC4yNjIxNDYwNzczMjYyMjU2M10sXCJ3aGVlbF92ZXJ0ZXhcIjpbMC4wMjY5NjgwMzcxMzUyMjg3NzMsMC44MDc4MTE1MDkwNDY4Nzc4LDAuMTE1Njc4NzE2OTQ5OTgwNDQsMC4yODg3NjUzMTUyMjEwNDgxLDAuMTA4NzE2MzYxNjk3MzU2NTQsMC4yOTAwNTgzMTAzODQxNTY5NywwLjk3MDUyMDgyODU4NTYzOTUsMC44NTIxNjk5NjMyNzYyMzA1XSxcImluZGV4XCI6MTN9LHtcImlkXCI6XCIwLjloanVxMHZhcms4XCIsXCJ3aGVlbF9yYWRpdXNcIjpbMC43Mzc3NzQyMjcyNDI0NjA2LDAuMjc3NjY0MTk3MTE1MzkwMTRdLFwid2hlZWxfZGVuc2l0eVwiOlswLjEyMDY3OTgyMjg4MzgwOTc0LDAuNTUwODQyOTQ3NzQ5NzgwM10sXCJjaGFzc2lzX2RlbnNpdHlcIjpbMC40NzQyNzc3MzA3MTkxMjc3XSxcInZlcnRleF9saXN0XCI6WzAuNDc1MzI1NzM4NTA5NjE1LDAuNjUzNDYyNjk2MjY4MTg2LDAuMjM2MjQ0NTIxODUwNTk5NTIsMC44NjI0NzczMjk1MzM2Mjc5LDAuMzg0MzY2MzA1MzU2NzcyNSwwLjI5NjI0MTYzODc2MzYxNjY0LDAuODU1NTg2NDAyODA2MDM2MywwLjYxNTM3OTc3MTI2MjE0MDUsMC4wMjI5MDkzMTMzMDg3Nzc2NTcsMC43MDc4MDczODE5NDA1MzczLDAuMjk5NTYwMzIzMzAyMzg0NywwLjk1OTE1OTk4NTUzOTkxOTFdLFwid2hlZWxfdmVydGV4XCI6WzAuOTE1OTE0NjI2OTEzMjU5LDAuNjk1Njg0NDY5MjA3OTg3OCwwLjMzMjg0NjkxOTYzMTc2NDA1LDAuNzkxOTk4NTE5MzYzMDg5MiwwLjg4NDY5OTY0ODM4MjYwNzcsMC43ODYyNjA2NDMzNTE1NTY3LDAuNjUyMzMyNTc2Mzg5NTA5OCwwLjgwMTYxMDk0MjA3Njg0MDddLFwiaW5kZXhcIjoxNH0se1wiaWRcIjpcIjAucGs0dXFybzQxdVwiLFwid2hlZWxfcmFkaXVzXCI6WzAuODY1ODg4MTAwNzgwMzE2NSwwLjMzNTczMzE5ODYzOTg0NzNdLFwid2hlZWxfZGVuc2l0eVwiOlswLjU2OTIwNjQ1NTczMDczMjQsMC4yNzkxNDU0ODcxMDExNTYzXSxcImNoYXNzaXNfZGVuc2l0eVwiOlswLjMxMjAzNzU0MDAzNjcwODZdLFwidmVydGV4X2xpc3RcIjpbMC45MTg5NTU0MDA5OTkyNTI0LDAuMzU0MjU3OTEwMDQ3ODQ2OSwwLjE0OTY0ODI2OTYzNDQ3MTY0LDAuOTU0ODk5MjAzODEwOTQ0NywwLjUxMzY5ODE4NDc5NTgwMzEsMC41NDI1NDIyMjMzMzI0MDc4LDAuNTM4MjMyMjY2NzMzOTQ0OCwwLjY4Njc0MDQ4MTkwNjE5NzEsMC4yNDAzMDcxNDA5NzA0MTc2LDAuNTk2MDE5MjAyNjE1MTcyOSwwLjE5ODEzOTE4NTQ2NjA3MjgsMC4wNjUyMTE5NTU1MjE1OTgyXSxcIndoZWVsX3ZlcnRleFwiOlswLjkzODIxNDcyODcyODQyMDYsMC42Mzg5MDMyODk3NjM5MzQ2LDAuNTc0NTA2ODYwNjg5Njg1OSwwLjMyOTgwMDc5NTYyMDM3MzksMC4zNzQ4MDEwMjI1MjQzNjU0LDAuMTU1NTMxMjc0NTc1OTQzNCwwLjM0ODg4NjUzNjg4MDk4MTUsMC4yMjg4NjA4OTAxNTgwMDQ3XSxcImluZGV4XCI6MTV9LHtcImlkXCI6XCIwLjkycG1xZnRtMDc4XCIsXCJ3aGVlbF9yYWRpdXNcIjpbMC4yMDk0MDE4NjM1NzgwNDMwMiwwLjk2MDE4MzE4NTU2ODQ1MDJdLFwid2hlZWxfZGVuc2l0eVwiOlswLjYwNzQ4NjUwNjI1NTI1MzUsMC40ODcyMTQwODQ4NTc3NDRdLFwiY2hhc3Npc19kZW5zaXR5XCI6WzAuODg3OTc3OTU4MTQxNzM3M10sXCJ2ZXJ0ZXhfbGlzdFwiOlswLjM3MjI5MzU4OTExNzA5NTc2LDAuMzI1MDYzODE0OTMwMjQ2MywwLjAyMzk5NjI0MzM0MTY3Mjk0LDAuNTA3Njg0NDkyNTkyOTM2OSwwLjkzNjE3ODg3MDYzNjAwNzcsMC41NTk5ODc3Njc1MTk4MDEzLDAuNjE3ODc2MTcwMTk0NTE5NywwLjE5MTk5NTE1NDEyNDU5MzIzLDAuNDM2ODkzOTk0NDkwOTYyLDAuMzQwOTczMTQyMzM3NzQ5OCwwLjQ5ODI1NTk1MDA1NjAyNzUsMC4zMDE4MDU0Nzc5ODYzMzQ0XSxcIndoZWVsX3ZlcnRleFwiOlswLjQ4MDU1Njc5OTI0MTY5MjgsMC41MjkxNzI5NzE1MDg0MjUsMC40NTc2ODI0NDkwMTg1ODY3LDAuMjg4MTU4MTYyNTk5NjY4NTMsMC40MTMwNzAzODAyMTI3NzU3NiwwLjg0OTYzMDMxMDIxNTAzMTUsMC40NDI2MjQwOTQxMDI4MDkyMywwLjExODk5MDgzNTM5NzM2MV0sXCJpbmRleFwiOjE2fSx7XCJpZFwiOlwiMC5wMGJiM2pjc2E2b1wiLFwid2hlZWxfcmFkaXVzXCI6WzAuODA1Mzc3MDQwOTM2Mzg3NiwwLjAwNDYwODUxMTUwNTg3NjQ4OV0sXCJ3aGVlbF9kZW5zaXR5XCI6WzAuMzcwMzI5MzY1ODUzMTk4NTMsMC45MTEwNzE4MjkwNzM5OTAzXSxcImNoYXNzaXNfZGVuc2l0eVwiOlswLjQxMjY4OTMxMzY2NTU1NTE3XSxcInZlcnRleF9saXN0XCI6WzAuMzc1MDU1Mjk2MTY4ODc0NDUsMC4zMjY5ODk0NTU1Nzg4NDczLDAuNzgyNDI4NzMzOTYxNzg5NywwLjA4OTE2NzU1MjYwMjcyNjAyLDAuMTE4NDYzNjg3ODk5NTg3NzIsMC42MTgyMzA1NDAyMDY5ODQ4LDAuNjg4MzQ2NzQ4MDE1ODkyOSwwLjM4MTc3OTA1MjE0OTk1NjY3LDAuNzIwODE4MTYwOTU5MTQzMywwLjcxODI4MTE2NzI5ODA3MzEsMC41MDUzNDAzOTgyNDMzOTY2LDAuNjc4NTQ4NTkwMzg4OTM5Ml0sXCJ3aGVlbF92ZXJ0ZXhcIjpbMC44NjAyNTE2NDM0NjY3MTI3LDAuOTE4MjQxMjg5NTY0ODcxMywwLjQ5NDMzMjE0NDY0OTQwNTgsMC40MDY2ODE0NDI0MDUzNjMzLDAuOTQ1MDAzMzkzNDQzNjk2NSwwLjA0MTQ3Njc4NDE2OTAzLDAuOTA3NDMwMzE0MTAyNTI4MiwwLjc5MjA4MDUzMTgxMzkyOTVdLFwiaW5kZXhcIjoxN30se1wiaWRcIjpcIjAuZzZudWU0MG82dVwiLFwid2hlZWxfcmFkaXVzXCI6WzAuMjU5NTAzNjUxNzkwODkyODUsMC40NTExNzE5NjY5NjM2MTUxN10sXCJ3aGVlbF9kZW5zaXR5XCI6WzAuODczNzc3MzIwNzQ5MTY0NiwwLjM4MjUwNDk0NTkxNzU5ODRdLFwiY2hhc3Npc19kZW5zaXR5XCI6WzAuNTc1MDYzNjA1NjQzMjY0M10sXCJ2ZXJ0ZXhfbGlzdFwiOlswLjE2MTU1MDc3MjcyMjc0MzY1LDAuMTc0MDE5MTQ3NzMxNzAyMzUsMC40Mjg3NTgwNzgxMDc2NDgxLDAuNDI5MzI5MjM4NjAzMDU4MjcsMC40NzYwODE0MzUwNjczMTMyNiwwLjAxNjE0MTY2NjE4MjE5ODAzMywwLjc0OTAwNjk1OTkyODM2OTcsMC44Nzc5MTU2NjMzNzU0OTc2LDAuNjA4MDkyODQ3MDE4NTU3OCwwLjQ4NDU3NjMxNTQ5NjA2MDUsMC4xNTk4OTY5NDUyNTg3NjA0MSwwLjU0OTIzMzA2MzI5NzE3MzRdLFwid2hlZWxfdmVydGV4XCI6WzAuNDg4NjYwNDI2Nzg1OTk2MiwwLjk1MDcxMDA1NTMzNjAyOTksMC44OTYzNzg2MDA0MTA2OTA2LDAuMTM5NjIwMDQyNjg4OTAzODIsMC4wMTcxMDUzMDU3NjEzMzkyODQsMC4xMjAzMjA4MTMwMzI4NTY4LDAuOTAxNjg1OTY0NTQ0MDI1NCwwLjMxMjgyNzk2NTk1NjI2MjA2XSxcImluZGV4XCI6MTh9LHtcImlkXCI6XCIwLnVpa3BtOXJtYmJcIixcIndoZWVsX3JhZGl1c1wiOlswLjA4MDY0NTE1MDQ3NjIwNzgsMC4wODQyMzEwMTQ2OTg0MTUzMl0sXCJ3aGVlbF9kZW5zaXR5XCI6WzAuMzQ0NjM5MjgzNTA0MDYxMjYsMC44Njk0ODk1MDMxNDc4NjcxXSxcImNoYXNzaXNfZGVuc2l0eVwiOlswLjE0MDA4NDgxNzk2NDYxNTI1XSxcInZlcnRleF9saXN0XCI6WzAuNjg2MDM1NTgyNzgyMzY3MiwwLjk0NzU2Mzc4MzQxODM3NDYsMC41NDgwNDQ2NDgxODgxOTQ2LDAuMjcyOTA3MjkxMjY3ODMzNCwwLjkxNTgwNzE2MjkwMTE1ODIsMC41NDAzNjc3MzEyOTE5Mjc3LDAuNzExMDQzODM3NTg0ODAzNiwwLjM0NjY2MTM1MzUxNDEwNDU0LDAuNzgzNTg5MjY0NzYxMzE1NCwwLjI2OTE0MDMyNzE2OTk0MDQsMC4xNDQzNjA0NjQxMTYyOTAzMywwLjI3MTY4NTE2Nzk0NzA4Nzk3XSxcIndoZWVsX3ZlcnRleFwiOlswLjgxNzY1OTQ3NTU5NDYxODcsMC42NjM3MzU1MjQxNDQ5MTY4LDAuODQwMjQ3Mzk0NDk1OTM4MSwwLjY0MzU1ODIxMzEzMDE3NzgsMC45MTcwNDA4NDEwNDI2MjMsMC45ODI0Mzg3NTI1NTgzMjExLDAuNDk3OTE2Mzk0NDY2NzA2NDQsMC4wMDUzNzc4MzAxODIzNjE0ODddLFwiaW5kZXhcIjoxOX0se1wiaWRcIjpcIjAucGhrb2Q0aDY2Nm9cIixcIndoZWVsX3JhZGl1c1wiOlswLjM4ODUxMjE1NDcwNTIxMTUsMC45NDA4MTQ3Nzk2ODY3MTc1XSxcIndoZWVsX2RlbnNpdHlcIjpbMC42MDY2NzYwNDk5OTIwMzg3LDAuNzQzNzg1MzczNTE0MTQ3OF0sXCJjaGFzc2lzX2RlbnNpdHlcIjpbMC4wNDc2MTkzNDg0NjM3NDQ4MjZdLFwidmVydGV4X2xpc3RcIjpbMC4yODE4MDE4MTg4OTk0NjcxLDAuNTM3NjcxMTI4MzIzNTUxMSwwLjI3ODI2NTI0OTM0NzA1NywwLjM3MTgwMzgwNzQ5NDA0MDYzLDAuMDAxNjM1NDExMjQ0MDc3MDY3NCwwLjM3MzQ5MjAyOTg0MDY1MzksMC45MjU4MjQzNjQ5NDMzNTQ2LDAuOTYxMTI4MjAxMDY0ODA5OSwwLjI2MzU2Nzc3NTg0NDMzMDIsMC4yOTk1MTIyNjY5Njk4NzY5LDAuNDUwMDk1Mzc2MjE2NjMxNzYsMC4xNDEyMDQ5NTAxODk2MTk1NF0sXCJ3aGVlbF92ZXJ0ZXhcIjpbMC44MjExNTI3MDI1MzAwMjQzLDAuNjM3ODUyMDY0NjE1MDA4NSwwLjg0MzM2OTEyNDI0NTA4ODcsMC4xMDA4MDExMjUzMDUxNDkwNiwwLjc0MjA1NzE3MTg2NDMyOTQsMC4wNjI0MDY1OTQ0OTUzNzU3OCwwLjUwMTk5NjM3OTgyMjkxOTIsMC4xMzk1ODgwMzMyNzAzMzI3Nl0sXCJpbmRleFwiOjIwfSx7XCJpZFwiOlwiMC5jZHNiMnQwYTBnZ1wiLFwid2hlZWxfcmFkaXVzXCI6WzAuMjQ1MDU4NDIxNzY2MDE5NjYsMC40NzkzNzU3MDY2MTU4ODAzNl0sXCJ3aGVlbF9kZW5zaXR5XCI6WzAuNzMxODk2MzM1OTE5ODg4MiwwLjIwNDMzNTkxOTA2NzE0MjU1XSxcImNoYXNzaXNfZGVuc2l0eVwiOlswLjk0NDA4MDQwMTM4MDgwMTddLFwidmVydGV4X2xpc3RcIjpbMC4yNzY3MTc3MTg1NzM1NTcyLDAuNDAxOTEyMDY5MTk3MzkyNTMsMC42OTkyNTIwNjMxNzUzNjQ5LDAuNTgwNTM2NzA1NDc2NTY3MywwLjUzMjg3NjA2OTQ1OTU4OTMsMC42MDUxNjU1MjY2Mzk2ODU2LDAuODY1OTM3NDkyMzY5ODIzMywwLjYzODU3NDA1MTgxNjQ1OTEsMC4wOTEzNjE3NTY3MjQ5NTI5NSwwLjE5NDYyNjcxNjI2MDc5MzMsMC41ODQ4MzI0NzgzNDE5NDcyLDAuOTYxMjExNTA2OTg4OTgxN10sXCJ3aGVlbF92ZXJ0ZXhcIjpbMC45ODQwNDE5NzA4Njc0NDA0LDAuNDAwMjA3ODMyODg3NzUzNCwwLjYxMTQ2Njg0OTMwMDQ5NjksMC4wNTQ3NjYyODI2OTYzODc1LDAuNzU5MDI2MzIzNjE4Njg5NiwwLjkwOTU4MjE3MTg0NDM2NTEsMC44MjUyNzg1MDAxNDQ1MTkzLDAuOTM1NDU3MzUwMzE0NDc3OV0sXCJpbmRleFwiOjIxfSx7XCJpZFwiOlwiMC41ZWMzZjd1Yzg2Z1wiLFwid2hlZWxfcmFkaXVzXCI6WzAuNzQyODc5NDUyNjczNzczOSwwLjE0NzI3MDc5MDU1MzUzNTU0XSxcIndoZWVsX2RlbnNpdHlcIjpbMC4yMTcyMDEzNDMyNDY1NzU1OCwwLjU3NTQyNjg3OTQxNDY4MzddLFwiY2hhc3Npc19kZW5zaXR5XCI6WzAuMjI0NzY0MjE0MjQ4OTcwMDhdLFwidmVydGV4X2xpc3RcIjpbMC44MjEyOTYzNzI4MTYwMTA1LDAuMjI5NzMzMTg5MjIwNzQ4NiwwLjIxMDU4ODE3OTc3NjQ1NTI4LDAuMzAwMjg2MzM0OTE5MTQ0OSwwLjE2MDk1NDI0MTEzOTUzMDgzLDAuMjg1NzA5NzkwMzUwMDE4NzYsMC44NTA1MDUzMjI1OTU5MjA1LDAuMDEyMDk5Nzc1NTY1MjQ1NjYzLDAuNDMwNzE5MDk3MDI5NjE0NjQsMC4zNTgxODIwNjczMzkwMzM3LDAuOTk0MTM5NjY2MzM1MDk1MiwwLjE3MTE1MjA0NjYzMTY0NzYzXSxcIndoZWVsX3ZlcnRleFwiOlswLjYzNDkzNjUwNDM2NDczOTMsMC44NTY0MTY4MDU2NTU5MjI3LDAuODM0NzMxNDEwMzk4MzE5NywwLjAxMzU2MTYwMDk4OTExNTUxOSwwLjIwNDczODEzNTU1ODk5MDc5LDAuOTczNzg4OTQ5NTMxNTI4LDAuMzI5ODk1NTQ3NTcyMDE5MSwwLjcwNDA0OTg3MDI2ODI0M10sXCJpbmRleFwiOjIyfSx7XCJpZFwiOlwiMC5vMm03ZTNqbDVtXCIsXCJ3aGVlbF9yYWRpdXNcIjpbMC44NjYxMzY5NDQ3NDIzMDkxLDAuMzYyMDkxODY2MzY4NTUxNzNdLFwid2hlZWxfZGVuc2l0eVwiOlswLjI0ODg2MzY5OTQ4Mjk2MjcyLDAuOTQ4MTEzNjcwODk2MTY5N10sXCJjaGFzc2lzX2RlbnNpdHlcIjpbMC40NjQ1MzQ5MDcxNDI4NTk3XSxcInZlcnRleF9saXN0XCI6WzAuMzk2MzE1ODE3MTc0MDIzMywwLjMyNTYyNzg4MjI0NTI5MTYsMC40MzU4ODY1NjIxNjkzMDgyLDAuNDE4MDA2NTc1NjcyMDEyNCwwLjAzMzUwNzU3NzkwMTI2NjEzLDAuMjY4MTA2NzQ5NTk2MjcxOSwwLjE5MTQ1Nzk5NTI2MjY3MzM3LDAuNzM3MTExMTg4NDkxMTU2NSwwLjQ1MDA0MDg5NTUxOTU4ODUsMC4xMDY4ODI2MTU2NzY3OTM0NywwLjM4MjE1NDEzMTE0NjQ5MjIsMC4wMDk0MTY3NTA1NDExNzIxOTJdLFwid2hlZWxfdmVydGV4XCI6WzAuOTU3NTQ2MjcxMjg2NzU1MSwwLjU2OTU1MDA3NjIzNTU4MDMsMC43OTgxNDQzMDAyMTU0NjA1LDAuOTQ3NDMyODQwMzc0OTgyMywwLjcwMjcwMTYwOTY0MDA3MTEsMC44Mjg2NDI0NjYzNzEzNjk2LDAuODMxMDUwMDAwOTQ2MTc3MiwwLjIwMzg5NDUxNzk4MzIzNTQzXSxcImluZGV4XCI6MjN9LHtcImlkXCI6XCIwLnZpajdoNGxsM2lnXCIsXCJ3aGVlbF9yYWRpdXNcIjpbMC4xODE0OTgwMDc2MTU1NDg4LDAuMjYzODk3NjIwNTA3MjI1NjVdLFwid2hlZWxfZGVuc2l0eVwiOlswLjI4MjkzNTI5NzI3MDM1MTgsMC43NDI2NDY4OTc4MTc2NTA2XSxcImNoYXNzaXNfZGVuc2l0eVwiOlswLjAxNDQ4NjY2MjYxMzgyMzM2NV0sXCJ2ZXJ0ZXhfbGlzdFwiOlswLjA1MzA4Njc3NzU4NjA2MjE3LDAuMzY2MDMyOTkyMDAwMDEwNSwwLjkxNTQ1ODgxMTExMDk3NTYsMC42NTk5MzY3NDAzMTQyNDcxLDAuMDA2MjM2NzAxMDAwMzcyMTAyLDAuOTQxNjc3OTc1NzczNDcxNywwLjgwODA4MDkyNzgzMzk2MTgsMC40MjQ5OTcxNTg1NzI5MTgyLDAuNDM5NDIwMjM2MjMyNzA3NzYsMC40NDYzMjE3ODIwNDQzMzQ4LDAuNzQwNzU3MDIwNjM4OTU4LDAuMDkxNTQyODYzNjI4NTQyNDddLFwid2hlZWxfdmVydGV4XCI6WzAuMTcwMTQ3ODg4NzExMzk5NCwwLjIzOTUxNTAwMDI2NjUxNjk1LDAuODQxNzE2MDc1MzA1MDA4MSwwLjQ0NjY4NjMyMTk3MzEzNzg1LDAuNzk4NDc0NjYyMDExMDkwMywwLjI0OTkzMDUwNTA5NzI5NjQyLDAuNTk4MjYxMzQxMzcxODAzNiwwLjAyNDYzNDE0MzM4MDM3NTYxN10sXCJpbmRleFwiOjI0fSx7XCJpZFwiOlwiMC52YnVkcHE3cjhqZ1wiLFwid2hlZWxfcmFkaXVzXCI6WzAuMTg4MDgzMzc5MjA4NjUzOCwwLjI5MDk0MTc1NTYyNTM3MjRdLFwid2hlZWxfZGVuc2l0eVwiOlswLjM4MzUzNTM2MDc0ODc2MzcsMC4xMjU0MjQ3MTEyNzgwNjE5OF0sXCJjaGFzc2lzX2RlbnNpdHlcIjpbMC45OTE0ODg3MjY2Nzg3ODM1XSxcInZlcnRleF9saXN0XCI6WzAuMTQwODIwMjMyNzk1MTk1MywwLjkwMDY1NjM3NDkxNzI0NTQsMC4yODYwMTMxODk2NTQ2NzQ3LDAuNTAzNjA1ODI2ODAxNTA5NiwwLjI4MjM3MTc1MzUxNDY0NTk0LDAuNjkyMDkzNTA5NzcxNzU0OSwwLjQwMzAwMjE0MzAyMDU4NTksMC40NTI2MzQ5NjI1MzM0OTM4LDAuMzI5NTEwNjYxMzg2NzUwNjcsMC45OTE1NjM5MzAzMjQ4OTI0LDAuMTU0MjE0OTE3ODAxODA1MDcsMC41NjU4MTIwMzc2NDQ1MDI4XSxcIndoZWVsX3ZlcnRleFwiOlswLjYyMDc3OTYwODEyNTE0OTgsMC4wODQ1NzUyOTMyMTg3OTk5NywwLjMwOTU5NjA4OTM0NTA0NTU3LDAuOTI4OTg4NzkwMTUwNjA3NSwwLjIxMTM0NDIwMDkwMDAxMDM4LDAuMjY2MTU4NDc0MDQ3ODEwNDYsMC45Njc5OTg2MzI1OTkyNTc2LDAuMDM2MzkzMjY2NjA5MDU2Mjg1XSxcImluZGV4XCI6MjV9LHtcImlkXCI6XCIwLjRpZ2tzNzdkZmxnXCIsXCJ3aGVlbF9yYWRpdXNcIjpbMC42MTYyNjMwNjg4ODA1MTA5LDAuOTk2MzIyMTk1NzI0MTE2XSxcIndoZWVsX2RlbnNpdHlcIjpbMC4wNzIxOTM4OTU1ODM5NTAyOCwwLjgxNjMwOTAwNDE1Nzk0MjJdLFwiY2hhc3Npc19kZW5zaXR5XCI6WzAuNjQ2Mzg3MTcyNDkyNDc2OF0sXCJ2ZXJ0ZXhfbGlzdFwiOlswLjE0Njg2MjgyOTM5NTkyNzMyLDAuMzUzODYyNDMzODA4OTAzOCwwLjczNTI3ODkxMDcxNzI1MDgsMC44MzM2MjE5MTMxMzM0OTAxLDAuMTM0NTg0NDIxNDk0NzkxMSwwLjA2OTU3MTE2NjYyMzUzMjgsMC4wNTg5MTU3NDk2MTE0MjA1NCwwLjU5MTUwODIxMTMyNjk1NjcsMC44MTA2MDk5MDgxNzU2Njk1LDAuMDk1ODc2MzE3NDI1ODc4OTksMC45Nzc1Nzg5MTYyMTMwNTU3LDAuNjIwMDExMDAwMjUxMTM3XSxcIndoZWVsX3ZlcnRleFwiOlswLjIzODY5MTY0MzE3Mjk5MDYzLDAuNDY5NjA4MjA1MzQzNDI3ODQsMC45ODA5MjA5NDMzOTgwMjY4LDAuMDk0MDg3MTc1MTc1OTg5NTIsMC45NTk2MjI4NDU4NjE1NDk0LDAuMTQ5MzEwNjY1MDM4NTAxMiwwLjU0MjQxMTY5NDk4ODM0MTUsMC4zNTA2ODc2MjAzOTE0OTIzN10sXCJpbmRleFwiOjI2fSx7XCJpZFwiOlwiMC5pN2luNzEwZjM5OFwiLFwid2hlZWxfcmFkaXVzXCI6WzAuMDEwNzQyNDM1MzU3MDY5OTgsMC4zNzQ5NjE1MDI0NDM5NTQ3Nl0sXCJ3aGVlbF9kZW5zaXR5XCI6WzAuMjE3NjExNjMwMzM5ODc1ODUsMC4yODc3MDY5MDQxNzI2Njk4Nl0sXCJjaGFzc2lzX2RlbnNpdHlcIjpbMC43Nzg4NTA0Nzc0NzA4NzA3XSxcInZlcnRleF9saXN0XCI6WzAuOTA2NTA0NTI5NDUyNzA2MSwwLjA4MzIwMzA4MzQ5ODc1NzM4LDAuMDM0NjA4NjQ3MjgyNzgwNjgsMC4xMjg4NTQ1OTQ5ODIwMzc0NCwwLjcwMzYxMjAxMTM1ODkyOTcsMC44MzAxMTU4MTUxODU4NzEyLDAuMzk1Nzc2OTE1ODQ0MjcwMSwwLjk4OTc2MTQzNDUxODEzOTEsMC4wODA4ODE1MzcwNTYxOTU1LDAuOTQzNTQ2MDY2NzM1MTY4NSwwLjMwNzAyNjYxMzQ5MDE0MjcsMC4wNTUyMzM0NzEwMjYyNDM4NzRdLFwid2hlZWxfdmVydGV4XCI6WzAuMjI3MDYyNDA3ODYyOTAxMzMsMC40NTM2Mzg4Mjg1ODEzNDY2MywwLjQwNDMxMTA1NDMzODgwNzEsMC4wNDY2MjEzMzI2Nzg1NzM2LDAuMTczNzYxMzA1NDg3NzczMTMsMC42NDE5NDE2MDU1NDIyMTk2LDAuNDUwMzQxODIwNTM2Mzg4OTQsMC4wNjMwMzQ4NjQ5NTQ2MjM1Ml0sXCJpbmRleFwiOjI3fSx7XCJpZFwiOlwiMC45Nml2cXBwZWdhZ1wiLFwid2hlZWxfcmFkaXVzXCI6WzAuNDkxMTE3OTIzMDkwMjAwNSwwLjM1MDQ2NDQ0NjkxOTM5MDk0XSxcIndoZWVsX2RlbnNpdHlcIjpbMC4zMzUzNDQ0OTY3Mjg5NzAyNiwwLjkzMzUxNzY1ODAwMzI0MjddLFwiY2hhc3Npc19kZW5zaXR5XCI6WzAuMzE5NTc1Mzg2NjQxMTA1NzRdLFwidmVydGV4X2xpc3RcIjpbMC41OTI2MjU0ODczODU5MzUxLDAuNzE5MjA4Nzk5NTIyOTg0NiwwLjQ4NDQ5MTYzMDQ2OTM4ODI2LDAuNzgyMDc1NzYxNjIwODU4MiwwLjc0NjIwNTQzOTgyNDU3NzQsMC4wOTA0MjYyNDY1MzIwMzA0NiwwLjEwNzAyNTgxNTAzNTQ3OTkyLDAuOTA2MTg3ODc3MzYyNjk2MywwLjY1MjIyOTQxMjI4NDUyOTQsMC42NzcyNzExMzUxOTIzNDk3LDAuMDI0NTExNjkzNTUyMjQzODA3LDAuODA1NDU5MzE0MzA1ODM1NV0sXCJ3aGVlbF92ZXJ0ZXhcIjpbMC4zNjAyOTgxMDQzODMzMzA2NSwwLjYwNjUyMzc2MDYyMzcxNDQsMC4zMjYwMjEzMjE3MTI0MjYzNywwLjU5NDA0MTU3MTkwNzY0MDYsMC41ODIxMDU4Njk0ODA0NDQyLDAuNjQ3NDY5MDgwMDY1MDEwNywwLjU5MDY1NjIyNTQ4MTc3MDIsMC40Nzc1NDg0Mzk5MzI2NTU5NF0sXCJpbmRleFwiOjI4fSx7XCJpZFwiOlwiMC5mZnE4ZGVwY2hwZ1wiLFwid2hlZWxfcmFkaXVzXCI6WzAuMTk0MjQxMTQ0MDM3ODQ1NTQsMC40MTExNjE1MDI1NDY2NzU3XSxcIndoZWVsX2RlbnNpdHlcIjpbMC43MTYxMTE5NTI2OTY5MDM1LDAuOTIxMDkxNDIxODk3OTM2N10sXCJjaGFzc2lzX2RlbnNpdHlcIjpbMC42NzI2MDY2NDI1ODc3NTk3XSxcInZlcnRleF9saXN0XCI6WzAuNjA4NzI1MTQ5MTc5MDYzMSwwLjcxMjY5MjI1NjM2MDgyOTgsMC4yODQ4MTMzMjE4MjQ1MDI4LDAuMjU3Nzc3ODkzMDU2MDI2NCwwLjkzMjI5MTc1MDU2MDg2OSwwLjI2MDI0NjM0Mzg2MTgwNDU2LDAuOTAwODYwODM2OTc1MTc0OSwwLjgxOTY4NjE3OTM0MDI2ODgsMC4wNDk3ODExMjgyNTA0NDYxMTYsMC40OTg0Njg5NjQ5OTE3NjA2MywwLjQyMjA2Nzc2MjY3OTg5ODc2LDAuMTMyODI2NDczODk5MTgyXSxcIndoZWVsX3ZlcnRleFwiOlswLjU1MjcwNzEyNzE2NDc0MzIsMC42MDA2NjYzMDkzOTE5MTQ3LDAuODg4ODcwNzY0Nzg0MzcxNCwwLjI0NDcyNzEzMDQxNjMwMjEyLDAuOTI2NDQ0OTM2Nzc4NjQ5NCwwLjAwODY3Mzk4MzIyMDM0Mjg1MSwwLjY1NjEyNjg2MzkzMDU5MzcsMC44MDA4Njk4NDA2MDE5MTVdLFwiaW5kZXhcIjoyOX0se1wiaWRcIjpcIjAuMzFrMWJzYTI5djhcIixcIndoZWVsX3JhZGl1c1wiOlswLjUyMTY1Nzk3MjMyMjY4ODQsMC42OTM4MDM4NzgyNTIwNTcyXSxcIndoZWVsX2RlbnNpdHlcIjpbMC43NTEwNTA0OTMwODQ2Mzc4LDAuOTM2MDIxMTY3MTY0MTMzOV0sXCJjaGFzc2lzX2RlbnNpdHlcIjpbMC45OTE5NjkyNTQ3ODMzNTg1XSxcInZlcnRleF9saXN0XCI6WzAuNjIwMjI1MzQ1MDY2Mjc5OCwwLjg0MDg5MzI5MDIyODgwMjksMC4xNDY3MDc5OTU1NjA4OTQzLDAuOTg1MDQ1MDMwMTI0MTcyNCwwLjIzMzQ0NDk3NjE5MTIyMDMsMC4yODk3OTEyMzI3MzI1NDYwMywwLjI3MDkzODA4MDE3NTY3ODY2LDAuMTkwNzA0NjIzNzQ3ODM4OTIsMC4wNTMzNjA1OTc4Mjk0MjgyNiwwLjgyNzYwNzI5MjY2MzE4MywwLjkzMTkxMjM0MjE5MjU0OSwwLjQzNzY3MTc2Mjg1OTU3Njc2XSxcIndoZWVsX3ZlcnRleFwiOlswLjA0MTU4NjY5NDcyODY3MDcxNCwwLjA3Mjk4MjcxNzUxOTA4MDcsMC4wMTY5MTYxNTQ5MDUyOTA3NDgsMC40OTAxNDU0NTk4ODIzMjA1LDAuMjMxMTk4OTM2Nzk2NjU4MjYsMC4wMjUxMzAwNjgyMzIxNDkzNiwwLjQ4OTM4OTA5ODYzOTI1OTk1LDAuMzg4NDM1MDE3MDUzNzc0NV0sXCJpbmRleFwiOjMwfSx7XCJpZFwiOlwiMC45MGtrdmI0dWNob1wiLFwid2hlZWxfcmFkaXVzXCI6WzAuOTEwMTAzNzk5Mjc4NTQ3MiwwLjQ4Nzg1OTI0NzAxMTU5MTJdLFwid2hlZWxfZGVuc2l0eVwiOlswLjM4NDg0Nzc5NzA4MjQ2MzEsMC40NTM4OTA0OTY5Nzk2MTIwM10sXCJjaGFzc2lzX2RlbnNpdHlcIjpbMC4yNjA4MDA3OTg5MzY5MzE2NF0sXCJ2ZXJ0ZXhfbGlzdFwiOlswLjUzMTc5MzIwNzU5MzUyMTQsMC42ODc4MTg5MzEwMjE0MTkxLDAuOTgwMzEwMTQ5MzcxMTE3NywwLjc2NTc1MTY1NTA1MzQzNCwwLjQwNjAxODcxODMyMTY5ODgsMC4xMTg0ODcyOTQ4OTA3Mjg1MSwwLjU3MzUyNDIyNTkwNzg1MjMsMC45ODg4MzczMTQwMTcxMzQzLDAuNjYzMTQyMTc0NzgyMDkxMSwwLjU0MzAzMjk4NjM2MjAyMTYsMC40NTk4Mjk5OTQzNTgzNjYxMywwLjg5Njk2NzY1MTcwMzYwMjNdLFwid2hlZWxfdmVydGV4XCI6WzAuNDA1NDU3MjYyMDg3ODQ5NiwwLjM4MTcwNTY1ODMzNTE2MSwwLjYyMzQ5NTE0NjIzODE2NTcsMC42NDMzMjg4NTU5NzM0NTM4LDAuODU3MjI4MjY2NDk3OTMyLDAuODk5NTU0OTc0MTE5OTM2NywwLjA3NjUxMTMyNzkzMjMxODg1LDAuNzcxMTc2NTI4Njk4NTM2OF0sXCJpbmRleFwiOjMxfSx7XCJpZFwiOlwiMC5hamd0Y2kzc2NnOFwiLFwid2hlZWxfcmFkaXVzXCI6WzAuMzM1MTk0ODE0MDYxNzE4OSwwLjYyOTk3MzE4NzkwODc1MzhdLFwid2hlZWxfZGVuc2l0eVwiOlswLjQxNTM0MTg2ODEwMjg4NTU0LDAuMjcwNDQxMzUyNzIyMzA0Ml0sXCJjaGFzc2lzX2RlbnNpdHlcIjpbMC43MDEzNzIzNTI2MjcxNTA5XSxcInZlcnRleF9saXN0XCI6WzAuNzQxNTc4MjU5MjY2OTEzOCwwLjYzNTI2NDQ0MzI5MTgyOTMsMC4xNzM2NjYwMjU5NjIxMDk2NywwLjUwNzIwNjc5MzQyNzQ5NzMsMC41OTE1NTYwNDMyMDEzODc1LDAuNDU0OTMwMTEzMjUxNjg0NTMsMC4yNjQ5NDA5MjMwNTI0NDkzLDAuNzU2MjExMDM1NjUyNDkyMywwLjA3ODUzMjkyMTY2ODEzNzQxLDAuNjE1NDM1ODc2MDc2MjcyMSwwLjgxODgwMzA5ODk4NTE4MDQsMC44NzQ4MzEwMzg5MTUzNDU3XSxcIndoZWVsX3ZlcnRleFwiOlswLjEwODYyMzQ5NzMxODA2MzA5LDAuNTg1NzYyMzY2ODQ3Nzg0NSwwLjQ3MzQwNzg2MDc5NzU3OTM1LDAuMjY2NjYxNjAxNTYxNDE0MDUsMC43MTE3MDI1OTMyODA2NTIyLDAuNTMzNDM5Mjg1MTI5NDk5OCwwLjk3NDAyMDQ3MTAzNDY4NzYsMC44MTE5NDg5NDExNDg0OTIxXSxcImluZGV4XCI6MzJ9LHtcImlkXCI6XCIwLmlqNm5sbGNjNmo4XCIsXCJ3aGVlbF9yYWRpdXNcIjpbMC4wNjU3NjUzNjA3MTg4Mzc3NiwwLjI2OTgxMzQ2MDYxNjg2NTZdLFwid2hlZWxfZGVuc2l0eVwiOlswLjEwODI2OTg4OTY0MTQyNzgxLDAuNDI4MDc5Mzg0MDYzOTc3Nl0sXCJjaGFzc2lzX2RlbnNpdHlcIjpbMC4xMjQ1MTc1MzU1NTg4OTA1Nl0sXCJ2ZXJ0ZXhfbGlzdFwiOlswLjk4NTkyNzY3NTY1OTE5ODEsMC4zMjM2MTU2MTc4MzE4MjU3LDAuMjM4ODE3MTA5ODkwNjA3MTIsMC45MDg1MDQ0ODM4MzEyOTg2LDAuMDc1OTA5MTg1MTkxNDMyODYsMC4xMTc4MzAyNjc2MTUwMTQ5MiwwLjc1NDU0OTQ3NDMxODAxMDgsMC45ODMwOTI2MjIyNjExODMzLDAuMjA1NTE5MDc0MzEyODc4MywwLjcwODQyNzM1NTM4OTE0MDUsMC42MTgwNzk4MTI0Nzc3MjI1LDAuMDM4Mzc2NTgzNzg4MDg0OTVdLFwid2hlZWxfdmVydGV4XCI6WzAuMjYyNTc5NTgzMjkzNjc4MTQsMC4zNzQyMjc1NjM0MzU0NDg4MywwLjk3MDY2MzcwOTc3MjM4MzgsMC44MjcwNDAyODcyOTE2OTc1LDAuNjQyMzQ3MDYwMjg2MTUyNywwLjMwNDk0Njk2MDM5MzY4NDEsMC4wMjAzMTU0MjQ0MjEwMjUwNzUsMC42NzMxNTQyMzE1NjkyMTk2XSxcImluZGV4XCI6MzN9LHtcImlkXCI6XCIwLmNmYW1qa2dlMTRcIixcIndoZWVsX3JhZGl1c1wiOlswLjU1NTMzNzEyMjM0NDEzMjYsMC40ODI1NTk1MjU0NTMwMTE5NV0sXCJ3aGVlbF9kZW5zaXR5XCI6WzAuMTAyMzM1Njc5NTU5NTcxMTIsMC40MTE4NjYzOTk0NjA2NDYyXSxcImNoYXNzaXNfZGVuc2l0eVwiOlswLjg1MDcwMTAzNzI0OTgyMDNdLFwidmVydGV4X2xpc3RcIjpbMC40NDM1NTI2MTQ0NDEwODE1LDAuNzk1MjU3MTE2MTIxNjAxNSwwLjY5NTY2NzQyOTg0ODE2OTgsMC43NzAwMzgxMTUwNDI2MjY4LDAuMDI0NDM3NzkxOTIyNjU3MjcsMC4zMzE0OTI0MjAyMjY0NTI0LDAuNTM0ODQ3Mjg3MjE3Njg5MywwLjE2OTk4OTgzNTg3MTE3NDQ0LDAuMzcwMjU2NzUzMTYzNjM1OCwwLjEzMjQ4ODcxMTA4MzU5Mzk1LDAuMzI0MjExNTI5MDgwODAyNTMsMC4xMjM4NDM4OTkzNTQyOTU4NV0sXCJ3aGVlbF92ZXJ0ZXhcIjpbMC41NTYyMzYxNzc3NDEzMTE4LDAuMDIwMTgxOTczMjczMDAwNDIsMC42NjU2NzczOTY2OTg2ODgyLDAuMzQwNTY3MDc1NDkxNjc4OTcsMC4zMjI4Njg3MjQ4MjgzMDMxLDAuMDA1NDY4OTYzMjgwNzkyMjcyLDAuMjQ4NzQxMzIzMTIzMTMxNjksMC4wMDc1NjgwMjk0MTczMjkyNThdLFwiaW5kZXhcIjozNH0se1wiaWRcIjpcIjAuODk3dXB1c3AwMG9cIixcIndoZWVsX3JhZGl1c1wiOlswLjk1MDYyMjEwNTc3MzkyODgsMC4yNjM0Njc4Mjg4Nzg3MjZdLFwid2hlZWxfZGVuc2l0eVwiOlswLjc4MTAxNjY0NTM0NjQzNzMsMC4zODY0Nzk5Mjk5ODg5ODIwNl0sXCJjaGFzc2lzX2RlbnNpdHlcIjpbMC4wNzM1NDIxODI1NzgxMjU1XSxcInZlcnRleF9saXN0XCI6WzAuMzMzNzMxMTQxMTU4NzExMTYsMC4wOTg2OTg2MTEyMTcyODI5NiwwLjE1NTU4NTUxNDY1MTkwMjUsMC4zMTc0ODczMTg3MjE3ODU1LDAuNDc1MjgyNjc3MDc3MzMyNiwwLjMyOTkxNTk4OTI3OTc2NTQsMC4xOTYwMDA5Nzk2NzUyNDU1NSwwLjE0OTI1MTcwOTY0MTk1NjMzLDAuMDA2ODY0NTI0MDUyNzEyOTg0LDAuNzUzMjQ4OTAxNzU1NDAyMywwLjQzODM1NDE3MjA1MjY3NiwwLjMxMTI0MDEyNDc3Njg1MjE1XSxcIndoZWVsX3ZlcnRleFwiOlswLjg0OTg2NzMzMjg5NTI1NzUsMC40ODgzMzI1MDEzOTYzMzM1NSwwLjcxNDgwMTY0NzU1NDI3NiwwLjg5ODcxMDQxMzYyODUxOTYsMC45Mzg0MTA4NDk0NzkyNjQ3LDAuODgzOTg1Mzg3NjQ5MTYzOSwwLjQxOTQwMTEwNTc1NjIxMjYsMC41MDIyNDc2OTQ5MDM2NDUyXSxcImluZGV4XCI6MzV9LHtcImlkXCI6XCIwLmV1Z3VlOXBjN3FvXCIsXCJ3aGVlbF9yYWRpdXNcIjpbMC4xNDU4MDg3OTM4MjgxNDQ5MywwLjg3NDQwMDkzNzU4MTM0Ml0sXCJ3aGVlbF9kZW5zaXR5XCI6WzAuMzUwNTc4MjYzNzY0NzQzNDQsMC40OTA4NTcxMjc1NzM3MTk0N10sXCJjaGFzc2lzX2RlbnNpdHlcIjpbMC45MjYxNDQ5ODE3ODUwNTI3XSxcInZlcnRleF9saXN0XCI6WzAuMTY2OTAyNzk3ODE1NzE1NiwwLjI2ODg1MzA1NjEzNDgyNzksMC40MTAyMzc5MjkwMjA0NzkyLDAuNTgxNDI1OTU1NjQwNTU2OCwwLjQ0OTU3ODEyMzA5MDk2NjM0LDAuNzUwNzA4MzU3MjQxNjc0NCwwLjA3Mjg3NzczMzI5NzAxNTg2LDAuNzk3NDM2NzczNjYyNTcyNSwwLjA2ODQ2MTgwNzgzMDc3NTI3LDAuNzM0NDc1NDI5MTE5MTU0OSwwLjU3MDMwMjY3NTkzMjk2NzcsMC42Mjg5MzM1NTc0OTU1NjddLFwid2hlZWxfdmVydGV4XCI6WzAuNzkxNzE5MjMyODA4NjIyOSwwLjU3MDgwMTkwMjM2NTk2MjMsMC43NzY1MjUwMjA5MTU3OTMyLDAuMjkyNjQyMzQ2NjAxNDcyMjYsMC4yNzkzODkyMzM3ODk3NTM0NCwwLjE0MzQ4MTA2MTM1MTA2MDQyLDAuNTYwOTE2NzU1NTA4Nzg1NSwwLjUwNDc0NDI5MzgxOTIzMzldLFwiaW5kZXhcIjozNn0se1wiaWRcIjpcIjAubDZzY2w1bnRqZFwiLFwid2hlZWxfcmFkaXVzXCI6WzAuMjQ1NTc4MTIxNDg3NTI1NjcsMC42NzQwNDk2MDQzNzA2ODgxXSxcIndoZWVsX2RlbnNpdHlcIjpbMC4wNzgwMDQ3ODc5MDYwMzY4MiwwLjUyMjQyOTU2NzMzODU0NTddLFwiY2hhc3Npc19kZW5zaXR5XCI6WzAuMDQ2MDg4NTExNzAzMjA1NDldLFwidmVydGV4X2xpc3RcIjpbMC4zMDc1MzUzMjU4MDY3MzA2LDAuOTQ2NDk3NDE5OTY3ODAyLDAuNDA2MjkyMjMwMjk0Mzg1NjYsMC4yNzYzNzQxMDc4OTgyMzg3LDAuMjU2NDA0NzQxMzI0NTQyNywwLjkzMTE1Mzg5OTMyNDAzODksMC42NDUzMjU0MTYzNDA1MzIyLDAuNjExNDc5NjgyODk2NDU0NCwwLjUzNzgyODI4ODM5MTAyNDQsMC4xOTkyMTYwOTg0NjY0NDUyOCwwLjk2NTM3ODUzNDUyNTAxOTQsMC4zOTc4OTA5Njg0OTkxNDYwN10sXCJ3aGVlbF92ZXJ0ZXhcIjpbMC4xNzUyNjA2MzcxMTE5NjQwNSwwLjUyMTkyMjczNjQ3ODU3MTUsMC4xOTIyODQwMDgyODI4NTY1MiwwLjQ3NDcxMTk4MTIwODI4MzQsMC4xMjkzOTk1MTk3NjM3NjQwNywwLjk3MTkxNTc0NTkzMzY0MjMsMC4wNTg1NTA1NzU1MDAzMzk3MSwwLjE3MDExNjA2ODAwMzU5MDQ3XSxcImluZGV4XCI6Mzd9LHtcImlkXCI6XCIwLnNrcjZtbWkwc3VnXCIsXCJ3aGVlbF9yYWRpdXNcIjpbMC4xMzAxOTkwMzU5NTMxNTE3NCwwLjY5Nzg4NDc0MTIxNTMwODldLFwid2hlZWxfZGVuc2l0eVwiOlswLjkzODAzODM5MjkxNjgzNzksMC45MDA2MjYzMTUyNzk3NTk2XSxcImNoYXNzaXNfZGVuc2l0eVwiOlswLjUzNjIxNTM1NzIyMTU0OTZdLFwidmVydGV4X2xpc3RcIjpbMC43ODk4NTMzMjAzNDUyMDMyLDAuMDQ4MjY5OTYwOTU5NTIxODUsMC4xMDQ2MTY5MDgwNzQzNjI4NiwwLjE5MTQzNTA4NjAwODQ5MTQ2LDAuODE4NzU2MTg0Njg5MjU0NCwwLjI1MzU3NjUwMTY1Njg0ODMsMC40NjQ0MjcxMDkzMTAzMTU0LDAuNzc0NzMyMTY2MzU2NTYwNSwwLjcxNTU4ODg1NjQwOTk1NjYsMC4yMjc3MzY4NDk4NTAyMDc0OCwwLjg3NjQwNDI0MDgwNjk3MTIsMC4yNTY1MDAxOTgyMjM0OTM1N10sXCJ3aGVlbF92ZXJ0ZXhcIjpbMC45NzQyMjQ1NDk2NTA3Mjg1LDAuMzg2NDk1MTUzNDYyODY1NTYsMC4zMzA3MDQ4MzEwMjcwOTcsMC44Njk1MTE3MzA3MjE3Mzc1LDAuODMyNDIxMzU1NjA5OTA3NCwwLjE4MTU3MzQxNzAwNDYwMDQsMC40MDY4NTI5MzcxNDc3NzcxNSwwLjM2Nzc0MDg1ODEzMTkzNjM1XSxcImluZGV4XCI6Mzh9LHtcImlkXCI6XCIwLjBib2Q4dWx2ZTU4XCIsXCJ3aGVlbF9yYWRpdXNcIjpbMC41NjkwODM4MjAyMzU0MTU2LDAuMjQ5NDczMTc3MDcyMzM2NjNdLFwid2hlZWxfZGVuc2l0eVwiOlswLjUzMjcxNzI0NDI0MTYwOTUsMC41MjIxODMxNDk2MTc4NzU3XSxcImNoYXNzaXNfZGVuc2l0eVwiOlswLjg1ODYzODMwMzkyNzQzM10sXCJ2ZXJ0ZXhfbGlzdFwiOlswLjY1NDQxNjU4NDk4NTY3MDcsMC43OTIxNjcwNjU2MTIwNjk0LDAuMjI4MjgxMDE1OTE4ODY1NTIsMC42NjA4OTEwNTM2NTU4ODY3LDAuMDI1MjYwMzU2NDI4OTMxMDk3LDAuNzA0NDYxNDIwOTI3MTkyNCwwLjk3NjE5MDcyMjg5NjIxOTQsMC40NzExNjQ5MjA5MTQ2ODkzLDAuNTcyNzA1MDI3NTQ3MzU4NCwwLjgyNzI3NTY2MzUyMDQyNDEsMC4zOTgyNTU3MjE1MzQ1Mjg0LDAuNTQ2NzA4ODMzNDE1NjE0XSxcIndoZWVsX3ZlcnRleFwiOlswLjIwMjU1OTQ2NDE2NjgxNjAzLDAuMjgyNDU3OTkyMDc4MjI5MSwwLjMwMTg1MTg5NTA0MDYzNzI1LDAuNzM3MzA5MTkyMTI0MzQyMiwwLjgzNTMxMTM2MzkxNjk1NDUsMC44Nzg3MzA4MDYyNzA3NDM3LDAuMjAyMjMwMDQ0ODQ5MzAyODUsMC43ODEyNzY2NDQzNzg4OTU5XSxcImluZGV4XCI6Mzl9XX0iLCJ2YXIgY3JlYXRlID0gcmVxdWlyZShcIi4uL2NyZWF0ZS1pbnN0YW5jZVwiKTtcclxudmFyIHNlbGVjdGlvbiA9IHJlcXVpcmUoXCIuL3NlbGVjdGlvbi5qcy9cIik7XHJcbnZhciBtdXRhdGlvbiA9IHJlcXVpcmUoXCIuL211dGF0aW9uLmpzL1wiKTtcclxudmFyIGNyb3Nzb3ZlciA9IHJlcXVpcmUoXCIuL2Nyb3Nzb3Zlci5qcy9cIik7XHJcbnZhciBjbHVzdGVyID0gcmVxdWlyZShcIi4vY2x1c3RlcmluZy9jbHVzdGVyU2V0dXAuanMvXCIpO1xyXG52YXIgcmFuZG9tSW50ID0gcmVxdWlyZShcIi4vcmFuZG9tSW50LmpzL1wiKTtcclxudmFyIGdldFJhbmRvbUludCA9IHJhbmRvbUludC5nZXRSYW5kb21JbnQ7XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IHtcclxuICBnZW5lcmF0aW9uWmVybzogZ2VuZXJhdGlvblplcm8sXHJcbiAgbmV4dEdlbmVyYXRpb246IG5leHRHZW5lcmF0aW9uXHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdlbmVyYXRpb25aZXJvKGNvbmZpZyl7XHJcbiAgdmFyIGdlbmVyYXRpb25TaXplID0gY29uZmlnLmdlbmVyYXRpb25TaXplLFxyXG4gIHNjaGVtYSA9IGNvbmZpZy5zY2hlbWE7XHJcbiAgdmFyIHVzZUZpbGUgPSBmYWxzZTtcclxuICB2YXIgY3dfY2FyR2VuZXJhdGlvbiA9IFtdO1xyXG4gIGlmKHVzZUZpbGU9PT10cnVlKXtcclxuXHQgIGN3X2NhckdlbmVyYXRpb249IHJlYWRGaWxlKCk7XHJcbiAgfVxyXG4gIGVsc2Uge1xyXG5cdCAgZm9yICh2YXIgayA9IDA7IGsgPCBnZW5lcmF0aW9uU2l6ZTsgaysrKSB7XHJcblx0XHR2YXIgZGVmID0gY3JlYXRlLmNyZWF0ZUdlbmVyYXRpb25aZXJvKHNjaGVtYSwgZnVuY3Rpb24oKXtcclxuXHRcdHJldHVybiBNYXRoLnJhbmRvbSgpXHJcblx0XHR9KTtcclxuXHRcdGRlZi5pbmRleCA9IGs7XHJcblx0XHRjd19jYXJHZW5lcmF0aW9uLnB1c2goZGVmKTtcclxuXHR9XHJcbiAgfVxyXG4gIHJldHVybiB7XHJcbiAgICBjb3VudGVyOiAwLFxyXG4gICAgZ2VuZXJhdGlvbjogY3dfY2FyR2VuZXJhdGlvbixcclxuICB9O1xyXG59XHJcblxyXG4vLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSBteSBjb2RlIGpvYjY0XHJcbi8qVGhpcyBmdW5jdGlvbiBsb2FkcyBhbiBpbml0aWFsIGNhciBwb3B1bGF0aW9uIGZyb20gYSAuanNvbiBmaWxlKi9cclxuZnVuY3Rpb24gcmVhZEZpbGUoKXtcclxuXHR2YXIgZnMgPSByZXF1aXJlKCdmcycpO1xyXG5cdHZhciBhcnJheSA9IFtdO1xyXG5cdHZhciBmaWxlID0gcmVxdWlyZShcIi4vaW5pdGlhbENhcnMuanNvbi9cIik7XHJcblx0Zm9yKHZhciBpID0gMDtpPGZpbGUuYXJyYXkubGVuZ3RoO2krKyl7XHJcblx0XHRhcnJheS5wdXNoKGZpbGUuYXJyYXlbaV0pO1xyXG5cdH1cclxuXHRyZXR1cm4gYXJyYXk7XHJcbn1cclxuXHJcbi8qVGhpcyBmdW5jdGlvbiBDaG9vc2VzIHdoaWNoIHNlbGVjdGlvbiBvcGVyYXRvciB0byB1c2UgaW4gdGhlIHNlbGVjdGlvbiBvZiB0d28gcGFyZW50cyBmb3IgdHdvIG5ldyBjYXJzIHN1Y2ggYXMgZWl0aGVyIFRvdXJuYW1lbnQgb3IgUm91bGV0dGUtd2hlZWwgc2VsZWN0aW9uXHJcbkBwYXJhbSBwYXJlbnRzIE9iamVjdEFycmF5IC0gQWRkaW5nIHRoZSBzZWxlY3RlZCBvYmplY3QgaW50byB0aGlzIGFycmF5XHJcbkBwYXJhbSBzY29yZXMgT2JqZWN0QXJyYXkgLSBBbiBhcnJheSBvZiBjYXJzIHdoZXJlIHRoZSBwYXJlbnRzIHdpbGwgYmUgc2VsZWN0ZWQgZnJvbVxyXG5AcGFyYW0gaW5jcmVhc2VNYXRlIEJvb2xlYW4gLSBXaGV0aGVyIHRoZSBjdXJyZW50IHNlbGVjdGlvbiB3aWxsIGluY2x1ZGUgYW4gZWxpdGUgd2hlcmUgaWYgdHJ1ZSBpdCB3b250IGJlIGRlbGV0ZWQgZnJvbSB0aGUgT2JqZWN0IGFycmF5IGFsbG93aW5nIGl0IHRvIGJlIHVzZWQgYWdhaW5cclxuQHJldHVybiBwYXJlbnRzU2NvcmUgaW50IC0gcmV0dXJucyB0aGUgYXZlcmFnZSBzY29yZSBvZiB0aGUgcGFyZW50cyovXHJcbmZ1bmN0aW9uIHNlbGVjdFBhcmVudHMocGFyZW50cywgc2NvcmVzLCBpbmNyZWFzZU1hdGUsIHNlbGVjdGlvblR5cGVPbmUsIHNlbGVjdGlvblR5cGVUd28pe1xyXG5cdHZhciBwYXJlbnQxID0gc2VsZWN0aW9uLnJ1blNlbGVjdGlvbihzY29yZXMsKGluY3JlYXNlTWF0ZT09PWZhbHNlKT9zZWxlY3Rpb25UeXBlT25lOjIpO1xyXG5cdHBhcmVudHMucHVzaChwYXJlbnQxLmRlZik7XHJcblx0aWYoaW5jcmVhc2VNYXRlPT09ZmFsc2Upe1xyXG5cdFx0c2NvcmVzLnNwbGljZShzY29yZXMuZmluZEluZGV4KHg9PiB4LmRlZi5pZD09PXBhcmVudHNbMF0uaWQpLDEpO1xyXG5cdH1cclxuXHR2YXIgcGFyZW50MiA9IHNlbGVjdGlvbi5ydW5TZWxlY3Rpb24oc2NvcmVzLChpbmNyZWFzZU1hdGU9PT1mYWxzZSk/c2VsZWN0aW9uVHlwZVR3bzoyKTtcclxuXHRwYXJlbnRzLnB1c2gocGFyZW50Mi5kZWYpO1xyXG5cdHNjb3Jlcy5zcGxpY2Uoc2NvcmVzLmZpbmRJbmRleCh4PT4geC5kZWYuaWQ9PT1wYXJlbnRzWzFdLmlkKSwxKTtcclxuXHRyZXR1cm4gKHBhcmVudDEuc2NvcmUucyArIHBhcmVudDIuc2NvcmUucykvMjtcclxufVxyXG5cclxuLypUaGlzIGZ1bmN0aW9uIHJ1bnMgYSBFdm9sdXRpb25hcnkgYWxnb3JpdGhtIHdoaWNoIHVzZXMgU2VsZWN0aW9uLCBDcm9zc292ZXIgYW5kIG11dGF0aW9ucyB0byBjcmVhdGUgdGhlIG5ldyBwb3B1bGF0aW9ucyBvZiBjYXJzLlxyXG5AcGFyYW0gc2NvcmVzIE9iamVjdEFycmF5IC0gQW4gYXJyYXkgd2hpY2ggaG9sZHMgdGhlIGNhciBvYmplY3RzIGFuZCB0aGVyZSBwZXJmb3JtYW5jZSBzY29yZXNcclxuQHBhcmFtIGNvbmZpZyAtIFRoaXMgaXMgdGhlIGdlbmVyYXRpb25Db25maWcgZmlsZSBwYXNzZWQgdGhyb3VnaCB3aGljaCBnaXZlcyB0aGUgY2FycyB0ZW1wbGF0ZS9ibHVlcHJpbnQgZm9yIGNyZWF0aW9uXHJcbkBwYXJhbSBub0NhcnNDcmVhdGVkIGludCAtIFRoZSBudW1iZXIgb2YgY2FycyB0aGVyZSBjdXJyZW50bHkgZXhpc3QgdXNlZCBmb3IgY3JlYXRpbmcgdGhlIGlkIG9mIG5ldyBjYXJzXHJcbkByZXR1cm4gbmV3R2VuZXJhdGlvbiBPYmplY3RBcnJheSAtIGlzIHJldHVybmVkIHdpdGggYWxsIHRoZSBuZXdseSBjcmVhdGVkIGNhcnMgdGhhdCB3aWxsIGJlIGluIHRoZSBzaW11bGF0aW9uKi9cclxuZnVuY3Rpb24gcnVuRUEoc2NvcmVzLCBjb25maWcsIG5vQ2Fyc0NyZWF0ZWQsIG5vRWxpdGVzLCBjcm9zc292ZXJUeXBlLCBub01hdGVJbmNyZWFzZSwgc2VsZWN0aW9uVHlwZU9uZSwgc2VsZWN0aW9uVHlwZVR3bywgbXV0YXRpb25UeXBlKXtcclxuXHRzY29yZXMuc29ydChmdW5jdGlvbihhLCBiKXtyZXR1cm4gYi5zY29yZS5zIC0gYS5zY29yZS5zO30pO1xyXG5cdHZhciBnZW5lcmF0aW9uU2l6ZT1zY29yZXMubGVuZ3RoO1xyXG5cdHZhciBuZXdHZW5lcmF0aW9uID0gbmV3IEFycmF5KCk7XHJcblx0dmFyIHJhbmRvbU1hdGVJbmNyZWFzZSA9IGdldFJhbmRvbUludCgwLG1heE5vTWF0ZXNJbmNyZWFzZXMsIG5ldyBBcnJheSgpKTtcclxuXHR2YXIgbWF4Tm9NYXRlc0luY3JlYXNlcyA9IG5vTWF0ZUluY3JlYXNlO1xyXG5cdHZhciBjdXJyZW50Tm9NYXRlSW5jcmVhc2VzID0gMDtcclxuXHR2YXIgbm9FbGl0ZXM9bm9FbGl0ZXM7XHJcblx0Zm9yKHZhciBpPTA7aTxub0VsaXRlcztpKyspey8vYWRkIG5ldyBlbGl0ZXMgdG8gbmV3R2VuZXJhdGlvblxyXG5cdFx0dmFyIG5ld0VsaXRlID0gc2NvcmVzWzBdLmRlZjtcclxuXHRcdG5ld0VsaXRlLmVsaXRlID0gdHJ1ZTtcclxuXHRcdG5ld0dlbmVyYXRpb24ucHVzaChuZXdFbGl0ZSk7XHJcblx0fVxyXG5cdGZvcih2YXIgayA9IDA7azxnZW5lcmF0aW9uU2l6ZS8yO2srKyl7XHJcblx0XHRpZihuZXdHZW5lcmF0aW9uLmxlbmd0aCE9PWdlbmVyYXRpb25TaXplKXtcclxuXHRcdHZhciBwaWNrZWRQYXJlbnRzID0gW107XHJcblx0XHR2YXIgcGFyZW50c1Njb3JlID0gc2VsZWN0UGFyZW50cyhwaWNrZWRQYXJlbnRzLCBzY29yZXMsICgoaz09PXJhbmRvbU1hdGVJbmNyZWFzZSkmJihjdXJyZW50Tm9NYXRlSW5jcmVhc2VzPG1heE5vTWF0ZXNJbmNyZWFzZXMpKT90cnVlOmZhbHNlLCBzZWxlY3Rpb25UeXBlT25lLCBzZWxlY3Rpb25UeXBlVHdvKTsgXHJcblx0XHRpZihjdXJyZW50Tm9NYXRlSW5jcmVhc2VzPG1heE5vTWF0ZXNJbmNyZWFzZXMpe2N1cnJlbnROb01hdGVJbmNyZWFzZXMrKzt9XHJcblx0XHRcdHZhciBuZXdDYXJzID0gY3Jvc3NvdmVyLnJ1bkNyb3Nzb3ZlcihwaWNrZWRQYXJlbnRzLCBjcm9zc292ZXJUeXBlLGNvbmZpZy5zY2hlbWEsIHBhcmVudHNTY29yZSwgbm9DYXJzQ3JlYXRlZCwgKG5ld0dlbmVyYXRpb24ubGVuZ3RoPT09Z2VuZXJhdGlvblNpemUtMSk/MToyKTtcclxuXHRcdFx0Zm9yKHZhciBpPTA7aTxuZXdDYXJzLmxlbmd0aDtpKyspe1xyXG5cdFx0XHRcdG5ld0NhcnNbaV0uZWxpdGUgPSBmYWxzZTtcclxuXHRcdFx0XHRuZXdDYXJzW2ldLmluZGV4ID0gaztcclxuXHRcdFx0XHRuZXdHZW5lcmF0aW9uLnB1c2gobmV3Q2Fyc1tpXSk7XHJcblx0XHRcdFx0bm9DYXJzQ3JlYXRlZCsrOy8vIHVzZWQgaW4gY2FyIGlkIGNyZWF0aW9uXHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHR9XHRcclxuXHRuZXdHZW5lcmF0aW9uLnNvcnQoZnVuY3Rpb24oYSwgYil7cmV0dXJuIGEucGFyZW50c1Njb3JlIC0gYi5wYXJlbnRzU2NvcmU7fSk7XHJcblx0Zm9yKHZhciB4ID0gMDt4PG5ld0dlbmVyYXRpb24ubGVuZ3RoO3grKyl7XHJcblx0XHRcdHZhciBjdXJyZW50SUQgPSBuZXdHZW5lcmF0aW9uW3hdLmlkO1xyXG5cdFx0XHRpZihuZXdHZW5lcmF0aW9uW3hdLmVsaXRlPT09ZmFsc2Upe1xyXG5cdFx0XHRcdG5ld0dlbmVyYXRpb25beF0gPSAobXV0YXRpb25UeXBlPT09MCk/bXV0YXRpb24ubXV0YXRlKG5ld0dlbmVyYXRpb25beF0pOm11dGF0aW9uLm11bHRpTXV0YXRpb25zKG5ld0dlbmVyYXRpb25beF0sbmV3R2VuZXJhdGlvbi5maW5kSW5kZXgoeD0+IHguaWQ9PT1jdXJyZW50SUQpLDIwKTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdFx0Y29uc29sZS5sb2cobmV3R2VuZXJhdGlvbik7XHJcblx0cmV0dXJuIG5ld0dlbmVyYXRpb247XHJcbn1cclxuXHJcbi8qVGhpcyBmdW5jdGlvbiBydW5zIHRoZSBCYXNlbGluZSBFdm9sdXRpb25hcnkgYWxnb3JpdGhtIHdoaWNoIG9ubHkgcnVucyBhIG11dGF0aW9uIG9yIG11bHRpTXV0YXRpb25zIG92ZXIgYWxsIHRoZSBjYXJzIHBhc3NlZCB0aG91Z2ggaW4gdGhlIHNjb3JlcyBwYXJhbWV0ZXIuXHJcbkBwYXJhbSBzY29yZXMgQXJyYXkgLSBUaGlzIHBhcmFtZXRlciBpcyBhbiBhcnJheSBvZiBjYXJzIHRoYXQgaG9sZHMgdGhlIHNjb3JlIHN0YXRpc3RpY3MgYW5kIGNhciBkYXRhIHN1Y2ggYXMgaWQgYW5kIFwid2hlZWxfcmFkaXVzXCIsIFwiY2hhc3Npc19kZW5zaXR5XCIsIFwidmVydGV4X2xpc3RcIiwgXCJ3aGVlbF92ZXJ0ZXhcIiBhbmQgXCJ3aGVlbF9kZW5zaXR5XCJcclxuQHBhcmFtIGNvbmZpZyAtIFRoaXMgcGFzc2VzIGEgZmlsZSB3aXRoIGZ1bmN0aW9ucyB0aGF0IGNhbiBiZSBjYWxsZWQuXHJcbkByZXR1cm4gbmV3R2VuZXJhdGlvbiAtIHRoaXMgaXMgdGhlIG5ldyBwb3B1bGF0aW9uIHRoYXQgaGF2ZSBoYWQgbXV0YXRpb25zIGFwcGxpZWQgdG8gdGhlbS4qL1xyXG5mdW5jdGlvbiBydW5CYXNlbGluZUVBKHNjb3JlcywgY29uZmlnKXtcclxuXHRzY29yZXMuc29ydChmdW5jdGlvbihhLCBiKXtyZXR1cm4gYS5zY29yZS5zIC0gYi5zY29yZS5zO30pO1xyXG5cdHZhciBzY2hlbWEgPSBjb25maWcuc2NoZW1hOy8vbGlzdCBvZiBjYXIgdmFyaWFibGVzIGkuZSBcIndoZWVsX3JhZGl1c1wiLCBcImNoYXNzaXNfZGVuc2l0eVwiLCBcInZlcnRleF9saXN0XCIsIFwid2hlZWxfdmVydGV4XCIgYW5kIFwid2hlZWxfZGVuc2l0eVwiXHJcblx0dmFyIG5ld0dlbmVyYXRpb24gPSBuZXcgQXJyYXkoKTtcclxuXHR2YXIgZ2VuZXJhdGlvblNpemU9c2NvcmVzLmxlbmd0aDtcclxuXHRjb25zb2xlLmxvZyhzY29yZXMpOy8vdGVzdCBkYXRhXHJcblx0Zm9yICh2YXIgayA9IDA7IGsgPCBnZW5lcmF0aW9uU2l6ZTsgaysrKSB7XHJcblx0XHQvL25ld0dlbmVyYXRpb24ucHVzaChtdXRhdGlvbi5tdXRhdGUoc2NvcmVzW2tdLmRlZikpO1xyXG5cdFx0bmV3R2VuZXJhdGlvbi5wdXNoKG11dGF0aW9uLm11bHRpTXV0YXRpb25zKHNjb3Jlc1trXS5kZWYsc2NvcmVzLmZpbmRJbmRleCh4PT4geC5kZWYuaWQ9PT1zY29yZXNba10uZGVmLmlkKSwyMCkpO1xyXG5cdFx0bmV3R2VuZXJhdGlvbltrXS5pc19lbGl0ZSA9IGZhbHNlO1xyXG5cdFx0bmV3R2VuZXJhdGlvbltrXS5pbmRleCA9IGs7XHJcblx0fVxyXG5cdFxyXG5cdHJldHVybiBuZXdHZW5lcmF0aW9uO1xyXG59XHRcclxuXHJcbi8qXHJcblRoaXMgZnVuY3Rpb24gaGFuZGxlcyB0aGUgY2hvb3Npbmcgb2Ygd2hpY2ggRXZvbHV0aW9uYXJ5IGFsZ29yaXRobSB0byBydW4gYW5kIHJldHVybnMgdGhlIG5ldyBwb3B1bGF0aW9uIHRvIHRoZSBzaW11bGF0aW9uKi9cclxuZnVuY3Rpb24gbmV4dEdlbmVyYXRpb24ocHJldmlvdXNTdGF0ZSwgc2NvcmVzLCBjb25maWcpe1xyXG5cdC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tIFNFVCBFVk9MVVRJT05BUlkgQUxHT1JJVEhNIE9QRVJBVE9SUyBIRVJFIDwtLS0tLS0tLS0tLS0tLS1cclxuXHR2YXIgbm9FbGl0ZXMgPSAxOy8vdHlwZSB0aGUgbnVtYmVyIG9mIGVsaXRlcyBmb3IgdGhlIHByb2dyYW0gdG8gdXNlXHJcblx0dmFyIGNyb3Nzb3ZlclR5cGU9MDsvL3dyaXRlIDEgZm9yIG9uZS1wb2ludCBjcm9zc292ZXIgYW55b3RoZXIgZm9yIHR3by1wb2ludCBjcm9zc292ZXJcclxuXHR2YXIgbm9NYXRlSW5jcmVhc2U9MDsvL1RoZSBudW1iZXIgb2YgY2FycyB0aGF0IGNhbiBtYXRlIHR3aWNlIHByb2R1Y2luZyA0IGtpZHMgbm90IDJcclxuXHQvLyBzZWxlY3Rpb25UeXBlIGZvciBzZWxlY3Rpb24gdGhlIHR3byBwYXJlbnRzIHNlbGVjdGlvblR5cGVPbmUgZm9yIHRoZSBmaXJzdCBzbGVjdGlvbiwgc2VsZWN0aW9uVHlwZVR3byBmb3IgdGhlIHNlY29uZCBwYXJlbnRcclxuXHR2YXIgc2VsZWN0aW9uVHlwZU9uZSA9IDM7Ly8gMSBmb3IgdG91cm5hbWVudCBzZWxlY3Rpb24gdXNpbmcgc3ViLWFycmF5cy8gMiBmb3IgdG91cm5hbWVudCBzZWxlY3Rpb24gdG8gZ2V0IHdlYWtlc3QgY2FyLzMgZm9yIHJvdWxldHRlLXNlbGVjdGlvbi8gNCBmb3IgdW5pZm9ybSByYW5kb20gc2VsZWN0aW9uXHJcblx0dmFyIHNlbGVjdGlvblR5cGVUd28gPSAzOy8vIDEgZm9yIHRvdXJuYW1lbnQgc2VsZWN0aW9uIHVzaW5nIHN1Yi1hcnJheXMvIDIgZm9yIHRvdXJuYW1lbnQgc2VsZWN0aW9uIHRvIGdldCB3ZWFrZXN0IGNhci8zIGZvciByb3VsZXR0ZS1zZWxlY3Rpb24vIDQgZm9yIHVuaWZvcm0gcmFuZG9tIHNlbGVjdGlvblxyXG5cdHZhciBtdXRhdGlvblR5cGUgPTA7Ly8wIGZvciBzdGFuZGFyZCAxIG11dGF0aW9uIHR5cGUgMSBmb3IgbXVsdGktbXV0YXRpb25zXHJcblx0Ly8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG5cdHZhciBnZW5lcmF0aW9uU2l6ZT1zY29yZXMubGVuZ3RoO1xyXG5cdHZhciBuZXdHZW5lcmF0aW9uID0gbmV3IEFycmF5KCk7XHJcblx0dmFyIGNvdW50O1xyXG5cdHZhciB0ZW1wUm91bmQ9MDtcclxuXHRcclxuXHRcdHRlbXBSb3VuZD0odHlwZW9mIHByZXZpb3VzU3RhdGUucm91bmQgPT09XCJ1bmRlZmluZWRcIik/MDpwcmV2aW91c1N0YXRlLnJvdW5kO1xyXG5cdFx0Y291bnQgPSBwcmV2aW91c1N0YXRlLmNvdW50ZXIgKyAxO1xyXG5cdFx0Ly92YXIgY2x1c3RlckludCA9IChwcmV2aW91c1N0YXRlLmNvdW50ZXI9PT0wKT9jbHVzdGVyLnNldHVwKHNjb3JlcyxudWxsLGZhbHNlKTpjbHVzdGVyLnNldHVwKHNjb3JlcyxwcmV2aW91c1N0YXRlLmNsdXN0LHRydWUpO1xyXG5cdFx0Ly9jbHVzdGVyLnJlU2NvcmVDYXJzKHNjb3JlcyAsY2x1c3RlckludCk7XHJcblx0XHRzY29yZXMuc29ydChmdW5jdGlvbihhLCBiKXtyZXR1cm4gYS5zY29yZS5zIC0gYi5zY29yZS5zO30pO1xyXG5cdFx0dmFyIG51bWJlck9mQ2FycyA9IChwcmV2aW91c1N0YXRlLmNvdW50ZXI9PT0wKT9nZW5lcmF0aW9uU2l6ZTpwcmV2aW91c1N0YXRlLm5vQ2FycytnZW5lcmF0aW9uU2l6ZTtcclxuXHRcdHZhciBzY2hlbWEgPSBjb25maWcuc2NoZW1hOy8vbGlzdCBvZiBjYXIgdmFyaWFibGVzIGkuZSBcIndoZWVsX3JhZGl1c1wiLCBcImNoYXNzaXNfZGVuc2l0eVwiLCBcInZlcnRleF9saXN0XCIsIFwid2hlZWxfdmVydGV4XCJcclxuXHRcclxuXHRcdGNvbnNvbGUubG9nKFwiTG9nIC0tIFwiK3ByZXZpb3VzU3RhdGUuY291bnRlcik7XHJcblx0XHQvL2NvbnNvbGUubG9nKHNjb3Jlc0RhdGEpOy8vdGVzdCBkYXRhXHJcblx0XHR2YXIgZWFUeXBlID0gMTtcclxuXHRcdG5ld0dlbmVyYXRpb24gPSAoZWFUeXBlPT09MSk/cnVuRUEoc2NvcmVzLCBjb25maWcsIG51bWJlck9mQ2Fycywgbm9FbGl0ZXMsIGNyb3Nzb3ZlclR5cGUsIG5vTWF0ZUluY3JlYXNlLCBzZWxlY3Rpb25UeXBlT25lLCBzZWxlY3Rpb25UeXBlVHdvLCBtdXRhdGlvblR5cGUpOnJ1bkJhc2VsaW5lRUEoc2NvcmVzLCBjb25maWcpO1xyXG5cdFx0Ly9jb25zb2xlLmxvZyhuZXdHZW5lcmF0aW9uKTsvL3Rlc3QgZGF0YVxyXG5cdGlmKHByZXZpb3VzU3RhdGUuY291bnRlcj4xNTApe1xyXG5cdFx0Y291bnQ9MDtcclxuXHRcdHRlbXBSb3VuZCsrO1xyXG5cdFx0Ly9uZXdHZW5lcmF0aW9uPWdlbmVyYXRpb25aZXJvKGNvbmZpZykuZ2VuZXJhdGlvbjtcclxuXHRcdFxyXG5cdH1cclxuXHRcclxuICByZXR1cm4ge1xyXG4gICAgY291bnRlcjogY291bnQsXHJcbiAgICBnZW5lcmF0aW9uOiBuZXdHZW5lcmF0aW9uLFxyXG5cdC8vY2x1c3Q6IGNsdXN0ZXJJbnQsXHJcblx0bm9DYXJzOiBudW1iZXJPZkNhcnMsXHJcblx0cm91bmQ6IHRlbXBSb3VuZFxyXG4gIH07XHJcbn1cclxuXHJcblxyXG4vLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSBlbmQgb2YgbXkgY29kZSBqb2I2NFxyXG5cclxuXHJcbmZ1bmN0aW9uIG1ha2VDaGlsZChjb25maWcsIHBhcmVudHMpe1xyXG4gIHZhciBzY2hlbWEgPSBjb25maWcuc2NoZW1hLFxyXG4gICAgcGlja1BhcmVudCA9IGNvbmZpZy5waWNrUGFyZW50O1xyXG4gIHJldHVybiBjcmVhdGUuY3JlYXRlQ3Jvc3NCcmVlZChzY2hlbWEsIHBhcmVudHMsIHBpY2tQYXJlbnQpXHJcbn1cclxuXHJcblxyXG5cclxuZnVuY3Rpb24gbXV0YXRlKGNvbmZpZywgcGFyZW50KXtcclxuICB2YXIgc2NoZW1hID0gY29uZmlnLnNjaGVtYSxcclxuICAgIG11dGF0aW9uX3JhbmdlID0gY29uZmlnLm11dGF0aW9uX3JhbmdlLFxyXG4gICAgZ2VuX211dGF0aW9uID0gY29uZmlnLmdlbl9tdXRhdGlvbixcclxuICAgIGdlbmVyYXRlUmFuZG9tID0gY29uZmlnLmdlbmVyYXRlUmFuZG9tO1xyXG4gIHJldHVybiBjcmVhdGUuY3JlYXRlTXV0YXRlZENsb25lKFxyXG4gICAgc2NoZW1hLFxyXG4gICAgZ2VuZXJhdGVSYW5kb20sXHJcbiAgICBwYXJlbnQsXHJcbiAgICBNYXRoLm1heChtdXRhdGlvbl9yYW5nZSksXHJcbiAgICBnZW5fbXV0YXRpb25cclxuICApXHJcbn1cclxuIiwibW9kdWxlLmV4cG9ydHMgPSB7XHJcblx0bXV0YXRlOiBtdXRhdGUsXHJcblx0bXVsdGlNdXRhdGlvbnM6IG11bHRpTXV0YXRpb25zXHJcbn1cclxuXHJcbi8qVGhpcyBmdW5jdGlvbiByZXR1cm5zIHdob2xlIGludHMgYmV0d2VlbiBhIG1pbmltdW0gYW5kIG1heGltdW1cclxuQHBhcmFtIG1pbiBpbnQgLSBUaGUgbWluaW11bSBpbnQgdGhhdCBjYW4gYmUgcmV0dXJuZWRcclxuQHBhcmFtIG1heCBpbnQgLSBUaGUgbWF4aW11bSBpbnQgdGhhdCBjYW4gYmUgcmV0dXJuZWRcclxuQHBhcmFtIG5vdEVxdWFsc0FyciBpbnRBcnJheSAtIEFuIGFycmF5IG9mIHRoZSBpbnRzIHRoYXQgdGhlIGZ1bmN0aW9uIHNob3VsZCBub3QgcmV0dXJuXHJcbkByZXR1cm4gaW50IC0gVGhlIGludCB3aXRoaW4gdGhlIHNwZWNpZmllZCBwYXJhbWV0ZXIgYm91bmRzIGlzIHJldHVybmVkLiovXHJcbmZ1bmN0aW9uIGdldFJhbmRvbUludChtaW4sIG1heCwgbm90RXF1YWxzQXJyKSB7XHJcblx0dmFyIHRvUmV0dXJuO1xyXG5cdHZhciBydW5Mb29wID0gdHJ1ZTtcclxuXHR3aGlsZShydW5Mb29wPT09dHJ1ZSl7XHJcblx0XHRtaW4gPSBNYXRoLmNlaWwobWluKTtcclxuXHRcdG1heCA9IE1hdGguZmxvb3IobWF4KTtcclxuXHRcdHRvUmV0dXJuID0gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogKG1heCAtIG1pbiArIDEpKSArIG1pbjtcclxuXHRcdGlmKHR5cGVvZiBmaW5kSWZFeGlzdHMgPT09IFwidW5kZWZpbmVkXCIpe1xyXG5cdFx0XHRydW5Mb29wPWZhbHNlO1xyXG5cdFx0fVxyXG5cdFx0ZWxzZSBpZihub3RFcXVhbHNBcnIuZmluZChmdW5jdGlvbih2YWx1ZSl7cmV0dXJuIHZhbHVlPT09dG9SZXR1cm47fSk9PT1mYWxzZSl7XHJcblx0XHRcdHJ1bkxvb3A9ZmFsc2U7XHJcblx0XHR9XHJcblx0fVxyXG4gICAgcmV0dXJuIHRvUmV0dXJuOy8vKHR5cGVvZiBmaW5kSWZFeGlzdHMgPT09IFwidW5kZWZpbmVkXCIpP3RvUmV0dXJuOmdldFJhbmRvbUludChtaW4sIG1heCwgbm90RXF1YWxzQXJyKTtcclxufVxyXG5cclxuXHJcbmZ1bmN0aW9uIGNoYW5nZUFycmF5VmFsdWUob3JpZ2luYWxWYWx1ZSl7XHJcblx0Zm9yKHZhciBpPTA7aTxvcmlnaW5hbFZhbHVlLmxlbmd0aDtpKyspe1xyXG5cdFx0dmFyIHJhbmRvbUZsb2F0ID0gTWF0aC5yYW5kb20oKTtcclxuXHRcdHZhciBtdXRhdGlvblJhdGUgPSAwLjUqcmFuZG9tRmxvYXQ7Ly9NYXRoLnJhbmRvbSgpO1xyXG5cdFx0dmFyIGluY3JlYXNlT3JEZWNyZWFzZSA9IGdldFJhbmRvbUludCgwLDEsW10pO1xyXG5cdFx0bmV3VmFsdWUgPSAoaW5jcmVhc2VPckRlY3JlYXNlPT09MCk/b3JpZ2luYWxWYWx1ZVtpXS1tdXRhdGlvblJhdGU6b3JpZ2luYWxWYWx1ZVtpXSttdXRhdGlvblJhdGU7XHJcblx0XHRpZihuZXdWYWx1ZTwwKXtcclxuXHRcdFx0bmV3VmFsdWUgPSBvcmlnaW5hbFZhbHVlW2ldK211dGF0aW9uUmF0ZTtcclxuXHRcdH0gZWxzZSBpZihuZXdWYWx1ZT4xKXtcclxuXHRcdFx0bmV3VmFsdWUgPSBvcmlnaW5hbFZhbHVlW2ldLW11dGF0aW9uUmF0ZTtcclxuXHRcdH1cclxuXHRcdG9yaWdpbmFsVmFsdWVbaV0gPSBuZXdWYWx1ZTtcclxuXHR9XHJcblx0cmV0dXJuIG9yaWdpbmFsVmFsdWU7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIG11dGF0ZShjYXIpe1xyXG5cdHJldHVybiBjaGFuZ2VEYXRhKGNhcixuZXcgQXJyYXkoKSwxKTtcclxufVxyXG5cclxuZnVuY3Rpb24gY2hhbmdlRGF0YShjYXIsIG11bHRpTXV0YXRpb25zLCBub011dGF0aW9ucyl7XHJcblx0dmFyIHJhbmRvbUludCA9IGdldFJhbmRvbUludCgxLDQsIG11bHRpTXV0YXRpb25zKTtcclxuXHRpZihyYW5kb21JbnQ9PT0xKXtcclxuXHRcdGNhci5jaGFzc2lzX2RlbnNpdHk9Y2hhbmdlQXJyYXlWYWx1ZShjYXIuY2hhc3Npc19kZW5zaXR5KTtcclxuXHR9XHJcblx0ZWxzZSBpZihyYW5kb21JbnQ9PT0yKXtcclxuXHRcdGNhci52ZXJ0ZXhfbGlzdD1jaGFuZ2VBcnJheVZhbHVlKGNhci52ZXJ0ZXhfbGlzdCk7XHJcblx0fVxyXG5cdGVsc2UgaWYocmFuZG9tSW50PT09Myl7XHJcblx0XHRjYXIud2hlZWxfZGVuc2l0eT1jaGFuZ2VBcnJheVZhbHVlKGNhci53aGVlbF9kZW5zaXR5KTtcclxuXHR9XHJcblx0ZWxzZSBpZihyYW5kb21JbnQ9PT00KXtcclxuXHRcdGNhci53aGVlbF9yYWRpdXM9Y2hhbmdlQXJyYXlWYWx1ZShjYXIud2hlZWxfcmFkaXVzKTtcclxuXHR9XHJcblx0ZWxzZSB7XHJcblx0XHRjYXIud2hlZWxfdmVydGV4PWNoYW5nZUFycmF5VmFsdWUoY2FyLndoZWVsX3ZlcnRleCk7XHJcblx0fVxyXG5cdG11bHRpTXV0YXRpb25zLnB1c2gocmFuZG9tSW50KTtcclxuXHRub011dGF0aW9ucy0tO1xyXG5cdHJldHVybiAobm9NdXRhdGlvbnM9PT0wKT9jYXI6Y2hhbmdlRGF0YShjYXIsIG11bHRpTXV0YXRpb25zLCBub011dGF0aW9ucyk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIG11bHRpTXV0YXRpb25zKGNhciwgYXJyUG9zaXRpb24sIGFyclNpemUpe1xyXG5cdC8vdmFyIG5vTXV0YXRpb25zID0gKGFyclBvc2l0aW9uPChhcnJTaXplLzIpKT8oYXJyUG9zaXRpb248KGFyclNpemUvNCkpPzQ6MzooYXJyUG9zaXRpb24+YXJyU2l6ZS0oYXJyU2l6ZS80KSk/MToyO1xyXG5cdHZhciBub011dGF0aW9ucyA9IChhcnJQb3NpdGlvbjwxMCk/MzoxO1xyXG5cdHJldHVybiBjaGFuZ2VEYXRhKGNhciwgbmV3IEFycmF5KCksbm9NdXRhdGlvbnMpO1xyXG59IiwiIG1vZHVsZS5leHBvcnRzID0ge1xyXG5cdGdldFJhbmRvbUludDogZ2V0UmFuZG9tSW50XHJcbiB9XHJcbiBcclxuLypUaGlzIGlzIGEgcmVjdXJzaXZlIGZ1bmN0aW9uIHdoaWNoIHJldHVybnMgd2hvbGUgaW50cyBiZXR3ZWVuIGEgbWluaW11bSBhbmQgbWF4aW11bVxyXG5AcGFyYW0gbWluIGludCAtIFRoZSBtaW5pbXVtIGludCB0aGF0IGNhbiBiZSByZXR1cm5lZFxyXG5AcGFyYW0gbWF4IGludCAtIFRoZSBtYXhpbXVtIGludCB0aGF0IGNhbiBiZSByZXR1cm5lZFxyXG5AcGFyYW0gbm90RXF1YWxzQXJyIGludEFycmF5IC0gQW4gYXJyYXkgb2YgdGhlIGludHMgdGhhdCB0aGUgZnVuY3Rpb24gc2hvdWxkIG5vdCByZXR1cm5cclxuQHJldHVybiBpbnQgLSBUaGUgaW50IHdpdGhpbiB0aGUgc3BlY2lmaWVkIHBhcmFtZXRlciBib3VuZHMgaXMgcmV0dXJuZWQuKi9cclxuZnVuY3Rpb24gZ2V0UmFuZG9tSW50KG1pbiwgbWF4LCBub3RFcXVhbHNBcnIpIHtcclxuXHR2YXIgdG9SZXR1cm47XHJcblx0dmFyIHJ1bkxvb3AgPSB0cnVlO1xyXG5cdHdoaWxlKHJ1bkxvb3A9PT10cnVlKXtcclxuXHRcdG1pbiA9IE1hdGguY2VpbChtaW4pO1xyXG5cdFx0bWF4ID0gTWF0aC5mbG9vcihtYXgpO1xyXG5cdFx0dG9SZXR1cm4gPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAobWF4IC0gbWluICsgMSkpICsgbWluO1xyXG5cdFx0aWYodHlwZW9mIGZpbmRJZkV4aXN0cyA9PT0gXCJ1bmRlZmluZWRcIil7XHJcblx0XHRcdHJ1bkxvb3A9ZmFsc2U7XHJcblx0XHR9XHJcblx0XHRlbHNlIGlmKG5vdEVxdWFsc0Fyci5maW5kKGZ1bmN0aW9uKHZhbHVlKXtyZXR1cm4gdmFsdWU9PT10b1JldHVybjt9KT09PWZhbHNlKXtcclxuXHRcdFx0cnVuTG9vcD1mYWxzZTtcclxuXHRcdH1cclxuXHR9XHJcbiAgICByZXR1cm4gdG9SZXR1cm47Ly8odHlwZW9mIGZpbmRJZkV4aXN0cyA9PT0gXCJ1bmRlZmluZWRcIik/dG9SZXR1cm46Z2V0UmFuZG9tSW50KG1pbiwgbWF4LCBub3RFcXVhbHNBcnIpO1xyXG59IiwiLy92YXIgcmFuZG9tSW50ID0gcmVxdWlyZShcIi4vcmFuZG9tSW50LmpzL1wiKTtcclxuLy92YXIgZ2V0UmFuZG9tSW50ID0gcmFuZG9tSW50LmdldFJhbmRvbUludDtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0ge1xyXG5cdHJ1blNlbGVjdGlvbjogcnVuU2VsZWN0aW9uXHJcbn1cclxuLypcclxuVGhpcyBmdW5jdGlvbiBjaGFuZ2VzIHRoZSB0eXBlIG9mIHNlbGVjdGlvbiB1c2VkIGRlcGVuZGluZyBvbiB0aGUgcGFyYW1ldGVyIG51bWJlciBcInNlbGVjdFR5cGVcIiA9IChyb3VsZXRlV2hlZWxTZWwgLSAxLCB0b3VybmFtZW50U2VsZWN0aW9uIC0gMilcclxuQHBhcmFtIHNlbGVjdFR5cGUgaW50IC0gdGhpcyBwYXJhbWV0ZXIgZGV0ZXJtaW5lcyB0aGUgdHlwZSBvZiBzZWxlY3Rpb24gdXNlZCAtIDEgZm9yIHRvdXJuYW1lbnQgc2VsZWN0aW9uIHVzaW5nIHN1Yi1hcnJheXMvIDIgZm9yIHRvdXJuYW1lbnQgc2VsZWN0aW9uIHRvIGdldCB3ZWFrZXN0IGNhci8zIGZvciByb3VsZXR0ZS1zZWxlY3Rpb24vIDQgZm9yIHVuaWZvcm0gcmFuZG9tIHNlbGVjdGlvbi5cclxuQHBhcmFtIGNhcnNBcnIgQXJyYXkgLSB0aGlzIHBhcmFtZXRlciBpcyB0aGUgcG9wdWxhdGlvbiB3aGljaCB0aGUgc2VsZWN0aW9uIGZ1bmN0aW9ucyBhcmUgdXNlZCBvbi5cclxuQHJldHVybiBPYmplY3RBcnJheSAtIHRoZSBwYXJlbnRzIGFycmF5IG9mIHR3byBpcyByZXR1cm5lZCBmcm9tIGVpdGhlciB0b3VybmFtZW50IG9yIHJvdWxsZXRlIHdoZWVsIHNlbGVjdGlvbiovXHJcbmZ1bmN0aW9uIHJ1blNlbGVjdGlvbihjYXJzQXJyLCBzZWxlY3RUeXBlKXtcclxuXHQvLyBTZWxlY3RUeXBlIC0gMSBmb3IgdG91cm5hbWVudCBzZWxlY3Rpb24gdXNpbmcgc3ViLWFycmF5cy8gMiBmb3IgdG91cm5hbWVudCBzZWxlY3Rpb24gdG8gZ2V0IHdlYWtlc3QgY2FyLzMgZm9yIHJvdWxldHRlLXNlbGVjdGlvbi8gNCBmb3IgdW5pZm9ybSByYW5kb20gc2VsZWN0aW9uXHJcblx0dmFyIHN0cm9uZ2VzdCA9IChzZWxlY3RUeXBlPT09MSk/dHJ1ZTpmYWxzZTtcclxuXHR2YXIgdXNlU3ViU2V0ID0gKChzZWxlY3RUeXBlPT09MSl8fChzZWxlY3RUeXBlPT09MikpP3RydWU6ZmFsc2U7XHJcblx0dmFyIHVuaWZvcm0gPSAoc2VsZWN0VHlwZT09PTQpP3RydWU6ZmFsc2U7XHJcblx0aWYoKHNlbGVjdFR5cGU9PT0zKXx8KHNlbGVjdFR5cGU9PT00KSl7XHJcblx0XHRyZXR1cm4gcm91bGV0ZVdoZWVsU2VsKGNhcnNBcnIsIHVuaWZvcm0pO1xyXG5cdH0gXHJcblx0ZWxzZSBpZigoc2VsZWN0VHlwZT09PTEpfHxzZWxlY3RUeXBlPT09Mil7XHJcblx0XHRyZXR1cm4gdG91cm5hbWVudFNlbGVjdGlvbihjYXJzQXJyLHN0cm9uZ2VzdCxjYXJzQXJyLmxlbmd0aC80LCB1c2VTdWJTZXQpO1xyXG5cdH1cclxufVxyXG5cclxuLypUaGlzIGZ1bmN0aW9uIHVzZXMgZmluZXNzIHByb3BvcnRpb25hdGUgc2VsZWN0aW9uIHdoZXJlIGEgcHJvcG9ydGlvbiBvZiB0aGUgd2hlZWwgaXMgZ2l2ZW4gdG8gYSBjYXIgYmFzZWQgb24gZml0bmVzc1xyXG5AcGFyYW0gY2Fyc0FyciBPYmplY3RBcnJheSAtIFRoZSBhcnJheSBvZiBjYXJzIHdoZXJlIHRoZSBwYXJlbnRzIGFyZSBjaG9zZW4gZnJvbVxyXG5AcGFyYW0gdW5pZm9ybSBib29sZWFuIC0gd2hldGhlciB0aGUgc2VsZWN0aW9uIHNob3VsZCBiZSB1bmlmb3JtXHJcbkByZXR1cm4gY2FyIE9iamVjdCAtIEEgY2FyIG9iamVjdCBpcyByZXR1cm5lZCBhZnRlciBzZWxlY3Rpb24qL1xyXG5mdW5jdGlvbiByb3VsZXRlV2hlZWxTZWwoY2Fyc0FyciwgdW5pZm9ybSl7XHJcblx0aWYodW5pZm9ybSA9PT1mYWxzZSl7XHJcblx0XHR2YXIgc3VtQ2FyU2NvcmUgPSAwO1xyXG5cdFx0Zm9yKHZhciBpID0wO2k8Y2Fyc0Fyci5sZW5ndGg7aSsrKXtcclxuXHRcdFx0c3VtQ2FyU2NvcmUgKz0gY2Fyc0FycltpXS5zY29yZS5zO1xyXG5cdFx0fVxyXG5cdFx0Lypjb25zb2xlLmxvZyhcInNlbGVjdGlvbiBkYXRhIC1cIik7XHJcblx0XHRjb25zb2xlLmxvZyhjYXJzQXJyLmxlbmd0aCk7XHJcblx0XHRjb25zb2xlLmxvZyhzdW1DYXJTY29yZSk7Ly90ZXN0IG5vXHJcblx0XHQqL1xyXG5cdFx0dmFyIG5vID0gTWF0aC5yYW5kb20oKSAqIHN1bUNhclNjb3JlO1xyXG5cdFx0aWYoc3VtQ2FyU2NvcmUhPTApe1xyXG5cdFx0XHRmb3IodmFyIHggPTA7eDxjYXJzQXJyLmxlbmd0aDt4Kyspe1xyXG5cdFx0XHRcdG5vIC09IGNhcnNBcnJbeF0uc2NvcmUucztcclxuXHRcdFx0XHRpZihubzwwKXtcclxuXHRcdFx0XHRcdC8vY29uc29sZS5sb2coY2Fyc0Fyclt4XSk7Ly9yZXR1cm5lZCBjYXJcclxuXHRcdFx0XHRcdHJldHVybiBjYXJzQXJyW3hdO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdFx0ZWxzZXtcclxuXHRcdFx0cmV0dXJuIGNhcnNBcnJbMF07XHJcblx0XHR9XHJcblx0fSBlbHNlIHtcclxuXHRcdHZhciByYW5kTm8gPSBnZXRSYW5kb21JbnQoMCwgY2Fyc0Fyci5sZW5ndGgtMSxbXSk7XHJcblx0XHRyZXR1cm4gY2Fyc0FycltyYW5kTm9dO1xyXG5cdH1cclxufVxyXG5cclxuLypUaGlzIGZ1bmN0aW9uIHVzZXMgdG91cm5hbWVudFNlbGVjdGlvbiB3aGVyZSBhIGFycmF5IGlzIHNvcnRlZCBhbmQgdGhlIHN0cm9uZ2VzdCBvciB3ZWFrZXN0IGlzIHJldHVybmVkXHJcbkBwYXJhbSBjYXJzQXJyIE9iamVjdEFycmF5IC0gVGhlIGFycmF5IG9mIGNhcnMgd2hlcmUgdGhlIHBhcmVudHMgYXJlIGNob3NlbiBmcm9tXHJcbkBwYXJhbSBzdHJvbmdlc3QgQm9vbGVhbiAtIGlmIHRydWUgdGhlIHN0cm9uZ2VzdCBjYXIgaXMgY2hvc2VuLCBlbHNlIGlmIGZhbHNlIHRoZSB3ZWFrZXN0IGlzIHJldHVybmVkIFxyXG5AcGFyYW0gc3ViU2V0UmFuZ2UgaW50IC0gSG93IGJpZyB0aGUgc3ViU2V0IG9mIHRoZSBnbG9iYWwgYXJyYXkgc2hvdWxkIGJlXHJcbkBwYXJhbSB1c2VTdWJTZXQgYm9vbGVhbiAtIHRydWUgaWYgeW91IHdhbnQgdG8gdXNlIHN1YiBzZXQgb2YgcmFuZG9tbHkgY2hvc2VuIG9iamVjdHMgZnJvbSB0aGUgZ2xvYmFsLCBvciBmYWxzZSB0byBqdXN0IHVzZSB0aGUgZ2xvYmFsXHJcbkByZXR1cm4gY2FyIE9iamVjdCAtIEEgY2FyIG9iamVjdCBpcyByZXR1cm5lZCBhZnRlciBzZWxlY3Rpb24qL1xyXG5mdW5jdGlvbiB0b3VybmFtZW50U2VsZWN0aW9uKGNhcnNBcnIsIHN0cm9uZ2VzdCwgc3ViU2V0UmFuZ2UsIHVzZVN1YlNldCl7XHJcblx0dmFyIHN1YlNldCA9IFtdO1xyXG5cdGlmKHVzZVN1YlNldD09PXRydWUpe1xyXG5cdHZhciBjaG9zZW5JbnRzID0gW107XHJcblx0Zm9yKHZhciBpID0wO2k8c3ViU2V0UmFuZ2U7aSsrKXtcclxuXHRcdHZhciBjaG9zZW5ObyA9IGdldFJhbmRvbUludCgwLGNhcnNBcnIubGVuZ3RoLTEsY2hvc2VuSW50cyk7XHJcblx0XHRjaG9zZW5JbnRzLnB1c2goY2hvc2VuTm8pO1xyXG5cdFx0c3ViU2V0LnB1c2goY2Fyc0FycltjaG9zZW5Ob10pO1xyXG5cdH1cclxuXHR9XHJcblx0KHVzZVN1YlNldD09PXRydWUpP3N1YlNldDpjYXJzQXJyLnNvcnQoZnVuY3Rpb24oYSxiKXtyZXR1cm4gKHN0cm9uZ2VzdD09PXRydWUpP2Iuc2NvcmUucyAtIGEuc2NvcmUuczphLnNjb3JlLnMgLSBhLnNjb3JlLmI7fSk7XHJcblx0cmV0dXJuICh1c2VTdWJTZXQ9PT10cnVlKT9zdWJTZXRbMF06Y2Fyc0FyclswXTtcclxufVxyXG5cclxuLypUaGlzIGZ1bmN0aW9uIHJldHVybnMgd2hvbGUgaW50cyBiZXR3ZWVuIGEgbWluaW11bSBhbmQgbWF4aW11bVxyXG5AcGFyYW0gbWluIGludCAtIFRoZSBtaW5pbXVtIGludCB0aGF0IGNhbiBiZSByZXR1cm5lZFxyXG5AcGFyYW0gbWF4IGludCAtIFRoZSBtYXhpbXVtIGludCB0aGF0IGNhbiBiZSByZXR1cm5lZFxyXG5AcGFyYW0gbm90RXF1YWxzQXJyIGludEFycmF5IC0gQW4gYXJyYXkgb2YgdGhlIGludHMgdGhhdCB0aGUgZnVuY3Rpb24gc2hvdWxkIG5vdCByZXR1cm5cclxuQHJldHVybiBpbnQgLSBUaGUgaW50IHdpdGhpbiB0aGUgc3BlY2lmaWVkIHBhcmFtZXRlciBib3VuZHMgaXMgcmV0dXJuZWQuKi9cclxuZnVuY3Rpb24gZ2V0UmFuZG9tSW50KG1pbiwgbWF4LCBub3RFcXVhbHNBcnIpIHtcclxuXHR2YXIgdG9SZXR1cm47XHJcblx0dmFyIHJ1bkxvb3AgPSB0cnVlO1xyXG5cdHdoaWxlKHJ1bkxvb3A9PT10cnVlKXtcclxuXHRcdG1pbiA9IE1hdGguY2VpbChtaW4pO1xyXG5cdFx0bWF4ID0gTWF0aC5mbG9vcihtYXgpO1xyXG5cdFx0dG9SZXR1cm4gPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAobWF4IC0gbWluICsgMSkpICsgbWluO1xyXG5cdFx0aWYodHlwZW9mIGZpbmRJZkV4aXN0cyA9PT0gXCJ1bmRlZmluZWRcIil7XHJcblx0XHRcdHJ1bkxvb3A9ZmFsc2U7XHJcblx0XHR9XHJcblx0XHRlbHNlIGlmKG5vdEVxdWFsc0Fyci5maW5kKGZ1bmN0aW9uKHZhbHVlKXtyZXR1cm4gdmFsdWU9PT10b1JldHVybjt9KT09PWZhbHNlKXtcclxuXHRcdFx0cnVuTG9vcD1mYWxzZTtcclxuXHRcdH1cclxuXHR9XHJcbiAgICByZXR1cm4gdG9SZXR1cm47Ly8odHlwZW9mIGZpbmRJZkV4aXN0cyA9PT0gXCJ1bmRlZmluZWRcIik/dG9SZXR1cm46Z2V0UmFuZG9tSW50KG1pbiwgbWF4LCBub3RFcXVhbHNBcnIpO1xyXG59XHJcblxyXG4iLCJcclxuXHJcbmNvbnN0IHJhbmRvbSA9IHtcclxuICBzaHVmZmxlSW50ZWdlcnMocHJvcCwgZ2VuZXJhdG9yKXtcclxuICAgIHJldHVybiByYW5kb20ubWFwVG9TaHVmZmxlKHByb3AsIHJhbmRvbS5jcmVhdGVOb3JtYWxzKHtcclxuICAgICAgbGVuZ3RoOiBwcm9wLmxlbmd0aCB8fCAxMCxcclxuICAgICAgaW5jbHVzaXZlOiB0cnVlLFxyXG4gICAgfSwgZ2VuZXJhdG9yKSk7XHJcbiAgfSxcclxuICBjcmVhdGVJbnRlZ2Vycyhwcm9wLCBnZW5lcmF0b3Ipe1xyXG4gICAgcmV0dXJuIHJhbmRvbS5tYXBUb0ludGVnZXIocHJvcCwgcmFuZG9tLmNyZWF0ZU5vcm1hbHMoe1xyXG4gICAgICBsZW5ndGg6IHByb3AubGVuZ3RoLFxyXG4gICAgICBpbmNsdXNpdmU6IHRydWUsXHJcbiAgICB9LCBnZW5lcmF0b3IpKTtcclxuICB9LFxyXG4gIGNyZWF0ZUZsb2F0cyhwcm9wLCBnZW5lcmF0b3Ipe1xyXG4gICAgcmV0dXJuIHJhbmRvbS5tYXBUb0Zsb2F0KHByb3AsIHJhbmRvbS5jcmVhdGVOb3JtYWxzKHtcclxuICAgICAgbGVuZ3RoOiBwcm9wLmxlbmd0aCxcclxuICAgICAgaW5jbHVzaXZlOiB0cnVlLFxyXG4gICAgfSwgZ2VuZXJhdG9yKSk7XHJcbiAgfSxcclxuICBjcmVhdGVOb3JtYWxzKHByb3AsIGdlbmVyYXRvcil7XHJcbiAgICB2YXIgbCA9IHByb3AubGVuZ3RoO1xyXG4gICAgdmFyIHZhbHVlcyA9IFtdO1xyXG4gICAgZm9yKHZhciBpID0gMDsgaSA8IGw7IGkrKyl7XHJcbiAgICAgIHZhbHVlcy5wdXNoKFxyXG4gICAgICAgIGNyZWF0ZU5vcm1hbChwcm9wLCBnZW5lcmF0b3IpXHJcbiAgICAgICk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gdmFsdWVzO1xyXG4gIH0sXHJcbiAgbXV0YXRlU2h1ZmZsZShcclxuICAgIHByb3AsIGdlbmVyYXRvciwgb3JpZ2luYWxWYWx1ZXMsIG11dGF0aW9uX3JhbmdlLCBjaGFuY2VUb011dGF0ZVxyXG4gICl7XHJcbiAgICByZXR1cm4gcmFuZG9tLm1hcFRvU2h1ZmZsZShwcm9wLCByYW5kb20ubXV0YXRlTm9ybWFscyhcclxuICAgICAgcHJvcCwgZ2VuZXJhdG9yLCBvcmlnaW5hbFZhbHVlcywgbXV0YXRpb25fcmFuZ2UsIGNoYW5jZVRvTXV0YXRlXHJcbiAgICApKTtcclxuICB9LFxyXG4gIG11dGF0ZUludGVnZXJzKHByb3AsIGdlbmVyYXRvciwgb3JpZ2luYWxWYWx1ZXMsIG11dGF0aW9uX3JhbmdlLCBjaGFuY2VUb011dGF0ZSl7XHJcbiAgICByZXR1cm4gcmFuZG9tLm1hcFRvSW50ZWdlcihwcm9wLCByYW5kb20ubXV0YXRlTm9ybWFscyhcclxuICAgICAgcHJvcCwgZ2VuZXJhdG9yLCBvcmlnaW5hbFZhbHVlcywgbXV0YXRpb25fcmFuZ2UsIGNoYW5jZVRvTXV0YXRlXHJcbiAgICApKTtcclxuICB9LFxyXG4gIG11dGF0ZUZsb2F0cyhwcm9wLCBnZW5lcmF0b3IsIG9yaWdpbmFsVmFsdWVzLCBtdXRhdGlvbl9yYW5nZSwgY2hhbmNlVG9NdXRhdGUpe1xyXG4gICAgcmV0dXJuIHJhbmRvbS5tYXBUb0Zsb2F0KHByb3AsIHJhbmRvbS5tdXRhdGVOb3JtYWxzKFxyXG4gICAgICBwcm9wLCBnZW5lcmF0b3IsIG9yaWdpbmFsVmFsdWVzLCBtdXRhdGlvbl9yYW5nZSwgY2hhbmNlVG9NdXRhdGVcclxuICAgICkpO1xyXG4gIH0sXHJcbiAgbWFwVG9TaHVmZmxlKHByb3AsIG5vcm1hbHMpe1xyXG4gICAgdmFyIG9mZnNldCA9IHByb3Aub2Zmc2V0IHx8IDA7XHJcbiAgICB2YXIgbGltaXQgPSBwcm9wLmxpbWl0IHx8IHByb3AubGVuZ3RoO1xyXG4gICAgdmFyIHNvcnRlZCA9IG5vcm1hbHMuc2xpY2UoKS5zb3J0KGZ1bmN0aW9uKGEsIGIpe1xyXG4gICAgICByZXR1cm4gYSAtIGI7XHJcbiAgICB9KTtcclxuICAgIHJldHVybiBub3JtYWxzLm1hcChmdW5jdGlvbih2YWwpe1xyXG4gICAgICByZXR1cm4gc29ydGVkLmluZGV4T2YodmFsKTtcclxuICAgIH0pLm1hcChmdW5jdGlvbihpKXtcclxuICAgICAgcmV0dXJuIGkgKyBvZmZzZXQ7XHJcbiAgICB9KS5zbGljZSgwLCBsaW1pdCk7XHJcbiAgfSxcclxuICBtYXBUb0ludGVnZXIocHJvcCwgbm9ybWFscyl7XHJcbiAgICBwcm9wID0ge1xyXG4gICAgICBtaW46IHByb3AubWluIHx8IDAsXHJcbiAgICAgIHJhbmdlOiBwcm9wLnJhbmdlIHx8IDEwLFxyXG4gICAgICBsZW5ndGg6IHByb3AubGVuZ3RoXHJcbiAgICB9XHJcbiAgICByZXR1cm4gcmFuZG9tLm1hcFRvRmxvYXQocHJvcCwgbm9ybWFscykubWFwKGZ1bmN0aW9uKGZsb2F0KXtcclxuICAgICAgcmV0dXJuIE1hdGgucm91bmQoZmxvYXQpO1xyXG4gICAgfSk7XHJcbiAgfSxcclxuICBtYXBUb0Zsb2F0KHByb3AsIG5vcm1hbHMpe1xyXG4gICAgcHJvcCA9IHtcclxuICAgICAgbWluOiBwcm9wLm1pbiB8fCAwLFxyXG4gICAgICByYW5nZTogcHJvcC5yYW5nZSB8fCAxXHJcbiAgICB9XHJcbiAgICByZXR1cm4gbm9ybWFscy5tYXAoZnVuY3Rpb24obm9ybWFsKXtcclxuICAgICAgdmFyIG1pbiA9IHByb3AubWluO1xyXG4gICAgICB2YXIgcmFuZ2UgPSBwcm9wLnJhbmdlO1xyXG4gICAgICByZXR1cm4gbWluICsgbm9ybWFsICogcmFuZ2VcclxuICAgIH0pXHJcbiAgfSxcclxuICBtdXRhdGVOb3JtYWxzKHByb3AsIGdlbmVyYXRvciwgb3JpZ2luYWxWYWx1ZXMsIG11dGF0aW9uX3JhbmdlLCBjaGFuY2VUb011dGF0ZSl7XHJcbiAgICB2YXIgZmFjdG9yID0gKHByb3AuZmFjdG9yIHx8IDEpICogbXV0YXRpb25fcmFuZ2VcclxuICAgIHJldHVybiBvcmlnaW5hbFZhbHVlcy5tYXAoZnVuY3Rpb24ob3JpZ2luYWxWYWx1ZSl7XHJcbiAgICAgIGlmKGdlbmVyYXRvcigpID4gY2hhbmNlVG9NdXRhdGUpe1xyXG4gICAgICAgIHJldHVybiBvcmlnaW5hbFZhbHVlO1xyXG4gICAgICB9XHJcbiAgICAgIHJldHVybiBtdXRhdGVOb3JtYWwoXHJcbiAgICAgICAgcHJvcCwgZ2VuZXJhdG9yLCBvcmlnaW5hbFZhbHVlLCBmYWN0b3JcclxuICAgICAgKTtcclxuICAgIH0pO1xyXG4gIH1cclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gcmFuZG9tO1xyXG5cclxuZnVuY3Rpb24gbXV0YXRlTm9ybWFsKHByb3AsIGdlbmVyYXRvciwgb3JpZ2luYWxWYWx1ZSwgbXV0YXRpb25fcmFuZ2Upe1xyXG4gIGlmKG11dGF0aW9uX3JhbmdlID4gMSl7XHJcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgbXV0YXRlIGJleW9uZCBib3VuZHNcIik7XHJcbiAgfVxyXG4gIHZhciBuZXdNaW4gPSBvcmlnaW5hbFZhbHVlIC0gMC41O1xyXG4gIGlmIChuZXdNaW4gPCAwKSBuZXdNaW4gPSAwO1xyXG4gIGlmIChuZXdNaW4gKyBtdXRhdGlvbl9yYW5nZSAgPiAxKVxyXG4gICAgbmV3TWluID0gMSAtIG11dGF0aW9uX3JhbmdlO1xyXG4gIHZhciByYW5nZVZhbHVlID0gY3JlYXRlTm9ybWFsKHtcclxuICAgIGluY2x1c2l2ZTogdHJ1ZSxcclxuICB9LCBnZW5lcmF0b3IpO1xyXG4gIHJldHVybiBuZXdNaW4gKyByYW5nZVZhbHVlICogbXV0YXRpb25fcmFuZ2U7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNyZWF0ZU5vcm1hbChwcm9wLCBnZW5lcmF0b3Ipe1xyXG4gIGlmKCFwcm9wLmluY2x1c2l2ZSl7XHJcbiAgICByZXR1cm4gZ2VuZXJhdG9yKCk7XHJcbiAgfSBlbHNlIHtcclxuICAgIHJldHVybiBnZW5lcmF0b3IoKSA8IDAuNSA/XHJcbiAgICBnZW5lcmF0b3IoKSA6XHJcbiAgICAxIC0gZ2VuZXJhdG9yKCk7XHJcbiAgfVxyXG59XHJcbiIsIi8qIGdsb2JhbHMgYnRvYSAqL1xyXG52YXIgc2V0dXBTY2VuZSA9IHJlcXVpcmUoXCIuL3NldHVwLXNjZW5lXCIpO1xyXG52YXIgY2FyUnVuID0gcmVxdWlyZShcIi4uL2Nhci1zY2hlbWEvcnVuXCIpO1xyXG52YXIgZGVmVG9DYXIgPSByZXF1aXJlKFwiLi4vY2FyLXNjaGVtYS9kZWYtdG8tY2FyXCIpO1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBydW5EZWZzO1xyXG5mdW5jdGlvbiBydW5EZWZzKHdvcmxkX2RlZiwgZGVmcywgbGlzdGVuZXJzKSB7XHJcbiAgaWYgKHdvcmxkX2RlZi5tdXRhYmxlX2Zsb29yKSB7XHJcbiAgICAvLyBHSE9TVCBESVNBQkxFRFxyXG4gICAgd29ybGRfZGVmLmZsb29yc2VlZCA9IGJ0b2EoTWF0aC5zZWVkcmFuZG9tKCkpO1xyXG4gIH1cclxuXHJcbiAgdmFyIHNjZW5lID0gc2V0dXBTY2VuZSh3b3JsZF9kZWYpO1xyXG4gIHNjZW5lLndvcmxkLlN0ZXAoMSAvIHdvcmxkX2RlZi5ib3gyZGZwcywgMjAsIDIwKTtcclxuICBjb25zb2xlLmxvZyhcImFib3V0IHRvIGJ1aWxkIGNhcnNcIik7XHJcbiAgdmFyIGNhcnMgPSBkZWZzLm1hcCgoZGVmLCBpKSA9PiB7XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBpbmRleDogaSxcclxuICAgICAgZGVmOiBkZWYsXHJcbiAgICAgIGNhcjogZGVmVG9DYXIoZGVmLCBzY2VuZS53b3JsZCwgd29ybGRfZGVmKSxcclxuICAgICAgc3RhdGU6IGNhclJ1bi5nZXRJbml0aWFsU3RhdGUod29ybGRfZGVmKVxyXG4gICAgfTtcclxuICB9KTtcclxuICB2YXIgYWxpdmVjYXJzID0gY2FycztcclxuICByZXR1cm4ge1xyXG4gICAgc2NlbmU6IHNjZW5lLFxyXG4gICAgY2FyczogY2FycyxcclxuICAgIHN0ZXA6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgaWYgKGFsaXZlY2Fycy5sZW5ndGggPT09IDApIHtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJubyBtb3JlIGNhcnNcIik7XHJcbiAgICAgIH1cclxuICAgICAgc2NlbmUud29ybGQuU3RlcCgxIC8gd29ybGRfZGVmLmJveDJkZnBzLCAyMCwgMjApO1xyXG4gICAgICBsaXN0ZW5lcnMucHJlQ2FyU3RlcCgpO1xyXG4gICAgICBhbGl2ZWNhcnMgPSBhbGl2ZWNhcnMuZmlsdGVyKGZ1bmN0aW9uIChjYXIpIHtcclxuICAgICAgICBjYXIuc3RhdGUgPSBjYXJSdW4udXBkYXRlU3RhdGUoXHJcbiAgICAgICAgICB3b3JsZF9kZWYsIGNhci5jYXIsIGNhci5zdGF0ZVxyXG4gICAgICAgICk7XHJcbiAgICAgICAgdmFyIHN0YXR1cyA9IGNhclJ1bi5nZXRTdGF0dXMoY2FyLnN0YXRlLCB3b3JsZF9kZWYpO1xyXG4gICAgICAgIGxpc3RlbmVycy5jYXJTdGVwKGNhcik7XHJcbiAgICAgICAgaWYgKHN0YXR1cyA9PT0gMCkge1xyXG4gICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGNhci5zY29yZSA9IGNhclJ1bi5jYWxjdWxhdGVTY29yZShjYXIuc3RhdGUsIHdvcmxkX2RlZik7XHJcbiAgICAgICAgbGlzdGVuZXJzLmNhckRlYXRoKGNhcik7XHJcblxyXG4gICAgICAgIHZhciB3b3JsZCA9IHNjZW5lLndvcmxkO1xyXG4gICAgICAgIHZhciB3b3JsZENhciA9IGNhci5jYXI7XHJcbiAgICAgICAgd29ybGQuRGVzdHJveUJvZHkod29ybGRDYXIuY2hhc3Npcyk7XHJcblxyXG4gICAgICAgIGZvciAodmFyIHcgPSAwOyB3IDwgd29ybGRDYXIud2hlZWxzLmxlbmd0aDsgdysrKSB7XHJcbiAgICAgICAgICB3b3JsZC5EZXN0cm95Qm9keSh3b3JsZENhci53aGVlbHNbd10pO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICB9KVxyXG4gICAgICBpZiAoYWxpdmVjYXJzLmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICAgIGxpc3RlbmVycy5nZW5lcmF0aW9uRW5kKGNhcnMpO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfVxyXG5cclxufVxyXG4iLCIvKiBnbG9iYWxzIGIyV29ybGQgYjJWZWMyIGIyQm9keURlZiBiMkZpeHR1cmVEZWYgYjJQb2x5Z29uU2hhcGUgKi9cclxuXHJcbi8qXHJcblxyXG53b3JsZF9kZWYgPSB7XHJcbiAgZ3Jhdml0eToge3gsIHl9LFxyXG4gIGRvU2xlZXA6IGJvb2xlYW4sXHJcbiAgZmxvb3JzZWVkOiBzdHJpbmcsXHJcbiAgdGlsZURpbWVuc2lvbnMsXHJcbiAgbWF4Rmxvb3JUaWxlcyxcclxuICBtdXRhYmxlX2Zsb29yOiBib29sZWFuXHJcbn1cclxuXHJcbiovXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKHdvcmxkX2RlZil7XHJcblxyXG4gIHZhciB3b3JsZCA9IG5ldyBiMldvcmxkKHdvcmxkX2RlZi5ncmF2aXR5LCB3b3JsZF9kZWYuZG9TbGVlcCk7XHJcbiAgdmFyIGZsb29yVGlsZXMgPSBjd19jcmVhdGVGbG9vcihcclxuICAgIHdvcmxkLFxyXG4gICAgd29ybGRfZGVmLmZsb29yc2VlZCxcclxuICAgIHdvcmxkX2RlZi50aWxlRGltZW5zaW9ucyxcclxuICAgIHdvcmxkX2RlZi5tYXhGbG9vclRpbGVzLFxyXG4gICAgd29ybGRfZGVmLm11dGFibGVfZmxvb3JcclxuICApO1xyXG5cclxuICB2YXIgbGFzdF90aWxlID0gZmxvb3JUaWxlc1tcclxuICAgIGZsb29yVGlsZXMubGVuZ3RoIC0gMVxyXG4gIF07XHJcbiAgdmFyIGxhc3RfZml4dHVyZSA9IGxhc3RfdGlsZS5HZXRGaXh0dXJlTGlzdCgpO1xyXG4gIHZhciB0aWxlX3Bvc2l0aW9uID0gbGFzdF90aWxlLkdldFdvcmxkUG9pbnQoXHJcbiAgICBsYXN0X2ZpeHR1cmUuR2V0U2hhcGUoKS5tX3ZlcnRpY2VzWzNdXHJcbiAgKTtcclxuICB3b3JsZC5maW5pc2hMaW5lID0gdGlsZV9wb3NpdGlvbi54O1xyXG4gIHJldHVybiB7XHJcbiAgICB3b3JsZDogd29ybGQsXHJcbiAgICBmbG9vclRpbGVzOiBmbG9vclRpbGVzLFxyXG4gICAgZmluaXNoTGluZTogdGlsZV9wb3NpdGlvbi54XHJcbiAgfTtcclxufVxyXG5cclxuZnVuY3Rpb24gY3dfY3JlYXRlRmxvb3Iod29ybGQsIGZsb29yc2VlZCwgZGltZW5zaW9ucywgbWF4Rmxvb3JUaWxlcywgbXV0YWJsZV9mbG9vcikge1xyXG4gIHZhciBsYXN0X3RpbGUgPSBudWxsO1xyXG4gIHZhciB0aWxlX3Bvc2l0aW9uID0gbmV3IGIyVmVjMigtNSwgMCk7XHJcbiAgdmFyIGN3X2Zsb29yVGlsZXMgPSBbXTtcclxuICBNYXRoLnNlZWRyYW5kb20oZmxvb3JzZWVkKTtcclxuICBmb3IgKHZhciBrID0gMDsgayA8IG1heEZsb29yVGlsZXM7IGsrKykge1xyXG4gICAgaWYgKCFtdXRhYmxlX2Zsb29yKSB7XHJcbiAgICAgIC8vIGtlZXAgb2xkIGltcG9zc2libGUgdHJhY2tzIGlmIG5vdCB1c2luZyBtdXRhYmxlIGZsb29yc1xyXG4gICAgICBsYXN0X3RpbGUgPSBjd19jcmVhdGVGbG9vclRpbGUoXHJcbiAgICAgICAgd29ybGQsIGRpbWVuc2lvbnMsIHRpbGVfcG9zaXRpb24sIChNYXRoLnJhbmRvbSgpICogMyAtIDEuNSkgKiAxLjUgKiBrIC8gbWF4Rmxvb3JUaWxlc1xyXG4gICAgICApO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgLy8gaWYgcGF0aCBpcyBtdXRhYmxlIG92ZXIgcmFjZXMsIGNyZWF0ZSBzbW9vdGhlciB0cmFja3NcclxuICAgICAgbGFzdF90aWxlID0gY3dfY3JlYXRlRmxvb3JUaWxlKFxyXG4gICAgICAgIHdvcmxkLCBkaW1lbnNpb25zLCB0aWxlX3Bvc2l0aW9uLCAoTWF0aC5yYW5kb20oKSAqIDMgLSAxLjUpICogMS4yICogayAvIG1heEZsb29yVGlsZXNcclxuICAgICAgKTtcclxuICAgIH1cclxuICAgIGN3X2Zsb29yVGlsZXMucHVzaChsYXN0X3RpbGUpO1xyXG4gICAgdmFyIGxhc3RfZml4dHVyZSA9IGxhc3RfdGlsZS5HZXRGaXh0dXJlTGlzdCgpO1xyXG4gICAgdGlsZV9wb3NpdGlvbiA9IGxhc3RfdGlsZS5HZXRXb3JsZFBvaW50KGxhc3RfZml4dHVyZS5HZXRTaGFwZSgpLm1fdmVydGljZXNbM10pO1xyXG4gIH1cclxuICByZXR1cm4gY3dfZmxvb3JUaWxlcztcclxufVxyXG5cclxuXHJcbmZ1bmN0aW9uIGN3X2NyZWF0ZUZsb29yVGlsZSh3b3JsZCwgZGltLCBwb3NpdGlvbiwgYW5nbGUpIHtcclxuICB2YXIgYm9keV9kZWYgPSBuZXcgYjJCb2R5RGVmKCk7XHJcblxyXG4gIGJvZHlfZGVmLnBvc2l0aW9uLlNldChwb3NpdGlvbi54LCBwb3NpdGlvbi55KTtcclxuICB2YXIgYm9keSA9IHdvcmxkLkNyZWF0ZUJvZHkoYm9keV9kZWYpO1xyXG4gIHZhciBmaXhfZGVmID0gbmV3IGIyRml4dHVyZURlZigpO1xyXG4gIGZpeF9kZWYuc2hhcGUgPSBuZXcgYjJQb2x5Z29uU2hhcGUoKTtcclxuICBmaXhfZGVmLmZyaWN0aW9uID0gMC41O1xyXG5cclxuICB2YXIgY29vcmRzID0gbmV3IEFycmF5KCk7XHJcbiAgY29vcmRzLnB1c2gobmV3IGIyVmVjMigwLCAwKSk7XHJcbiAgY29vcmRzLnB1c2gobmV3IGIyVmVjMigwLCAtZGltLnkpKTtcclxuICBjb29yZHMucHVzaChuZXcgYjJWZWMyKGRpbS54LCAtZGltLnkpKTtcclxuICBjb29yZHMucHVzaChuZXcgYjJWZWMyKGRpbS54LCAwKSk7XHJcblxyXG4gIHZhciBjZW50ZXIgPSBuZXcgYjJWZWMyKDAsIDApO1xyXG5cclxuICB2YXIgbmV3Y29vcmRzID0gY3dfcm90YXRlRmxvb3JUaWxlKGNvb3JkcywgY2VudGVyLCBhbmdsZSk7XHJcblxyXG4gIGZpeF9kZWYuc2hhcGUuU2V0QXNBcnJheShuZXdjb29yZHMpO1xyXG5cclxuICBib2R5LkNyZWF0ZUZpeHR1cmUoZml4X2RlZik7XHJcbiAgcmV0dXJuIGJvZHk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGN3X3JvdGF0ZUZsb29yVGlsZShjb29yZHMsIGNlbnRlciwgYW5nbGUpIHtcclxuICByZXR1cm4gY29vcmRzLm1hcChmdW5jdGlvbihjb29yZCl7XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICB4OiBNYXRoLmNvcyhhbmdsZSkgKiAoY29vcmQueCAtIGNlbnRlci54KSAtIE1hdGguc2luKGFuZ2xlKSAqIChjb29yZC55IC0gY2VudGVyLnkpICsgY2VudGVyLngsXHJcbiAgICAgIHk6IE1hdGguc2luKGFuZ2xlKSAqIChjb29yZC54IC0gY2VudGVyLngpICsgTWF0aC5jb3MoYW5nbGUpICogKGNvb3JkLnkgLSBjZW50ZXIueSkgKyBjZW50ZXIueSxcclxuICAgIH07XHJcbiAgfSk7XHJcbn1cclxuIl19
