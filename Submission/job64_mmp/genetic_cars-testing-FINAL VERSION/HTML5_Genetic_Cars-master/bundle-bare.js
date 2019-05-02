(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){

},{}],2:[function(require,module,exports){
/* globals document confirm btoa */
/* globals b2Vec2 */
// Global Vars

var worldRun = require("./world/run.js");

var graph_fns = require("./draw/plot-graphs.js");
var plot_graphs = graph_fns.plotGraphs;


// ======= WORLD STATE ======

var $graphList = document.querySelector("#graph-list");
var $graphTemplate = document.querySelector("#graph-template");

function stringToHTML(s){
  var temp = document.createElement('div');
  temp.innerHTML = s;
  return temp.children[0];
}

var states, runners, results, graphState = {};

function updateUI(key, scores){
  var $graph = $graphList.querySelector("#graph-" + key);
  var $newGraph = stringToHTML($graphTemplate.innerHTML);
  $newGraph.id = "graph-" + key;
  if($graph){
    $graphList.replaceChild($graph, $newGraph);
  } else {
    $graphList.appendChild($newGraph);
  }
  console.log($newGraph);
  var scatterPlotElem = $newGraph.querySelector(".scatterplot");
  scatterPlotElem.id = "graph-" + key + "-scatter";
  graphState[key] = plot_graphs(
    $newGraph.querySelector(".graphcanvas"),
    $newGraph.querySelector(".topscores"),
    scatterPlotElem,
    graphState[key],
    scores,
    {}
  );
}

var generationConfig = require("./generation-config");

var box2dfps = 60;
var max_car_health = box2dfps * 10;

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

var manageRound = {
  genetic: require("./machine-learning/genetic-algorithm/manage-round.js"),
  annealing: require("./machine-learning/simulated-annealing/manage-round.js"),
};

var createListeners = function(key){
  return {
    preCarStep: function(){},
    carStep: function(){},
    carDeath: function(carInfo){
      carInfo.score.i = states[key].counter;
    },
    generationEnd: function(results){
      handleRoundEnd(key, results);
    }
  }
}

function generationZero(){
  var obj = Object.keys(manageRound).reduce(function(obj, key){
    obj.states[key] = manageRound[key].generationZero(generationConfig());
    obj.runners[key] = worldRun(
      world_def, obj.states[key].generation, createListeners(key)
    );
    obj.results[key] = [];
    graphState[key] = {}
    return obj;
  }, {states: {}, runners: {}, results: {}});
  states = obj.states;
  runners = obj.runners;
  results = obj.results;
}

function handleRoundEnd(key, scores){
  var previousCounter = states[key].counter;
  states[key] = manageRound[key].nextGeneration(
    states[key], scores, generationConfig()
  );
  runners[key] = worldRun(
    world_def, states[key].generation, createListeners(key)
  );
  if(states[key].counter === previousCounter){
    console.log(results);
    results[key] = results[key].concat(scores);
  } else {
    handleGenerationEnd(key);
    results[key] = [];
  }
}

function runRound(){
  var toRun = new Map();
  Object.keys(states).forEach(function(key){ toRun.set(key, states[key].counter) });
  console.log(toRun);
  while(toRun.size){
    console.log("running");
    Array.from(toRun.keys()).forEach(function(key){
      if(states[key].counter === toRun.get(key)){
        runners[key].step();
      } else {
        toRun.delete(key);
      }
    });
  }
}

function handleGenerationEnd(key){
  var scores = results[key];
  scores.sort(function (a, b) {
    if (a.score.v > b.score.v) {
      return -1
    } else {
      return 1
    }
  })
  updateUI(key, scores);
  results[key] = [];
}

function cw_resetPopulationUI() {
  $graphList.innerHTML = "";
}

function cw_resetWorld() {
  cw_resetPopulationUI();
  Math.seedrandom();
  generationZero();
}

document.querySelector("#new-population").addEventListener("click", function(){
  cw_resetPopulationUI()
  generationZero();
})


document.querySelector("#confirm-reset").addEventListener("click", function(){
  cw_confirmResetWorld()
})

document.querySelector("#fast-forward").addEventListener("click", function(){
  runRound();
})

function cw_confirmResetWorld() {
  if (confirm('Really reset world?')) {
    cw_resetWorld();
  } else {
    return false;
  }
}

cw_resetWorld();

},{"./draw/plot-graphs.js":7,"./generation-config":11,"./machine-learning/genetic-algorithm/manage-round.js":19,"./machine-learning/simulated-annealing/manage-round.js":24,"./world/run.js":25}],3:[function(require,module,exports){
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

},{}],4:[function(require,module,exports){
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

},{"./car-constants.json":3}],5:[function(require,module,exports){
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

},{"../machine-learning/create-instance":14}],6:[function(require,module,exports){


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

},{}],7:[function(require,module,exports){
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

},{"./scatter-plot":8}],8:[function(require,module,exports){
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

},{}],9:[function(require,module,exports){

module.exports = generateRandom;
function generateRandom(){
  return Math.random();
}

},{}],10:[function(require,module,exports){
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

},{}],11:[function(require,module,exports){
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

},{"../car-schema/construct.js":4,"./generateRandom":9,"./pickParent":12,"./selectFromAllParents":13}],12:[function(require,module,exports){
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

},{}],13:[function(require,module,exports){
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

},{"./inbreeding-coefficient":10}],14:[function(require,module,exports){
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

},{"./random.js":23}],15:[function(require,module,exports){
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

function findOjectNeighbors(dataId, cluster, rangeInt) {
	var range = Math.round(rangeInt);
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
},{}],16:[function(require,module,exports){
var cluster = require("./cluster.js/");
//var carObjects = require("./car-objects.json");

module.exports = {
	setup: setup,
	reScoreCars: reScoreCars,
	clusterMutate: clusterMutate
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

function clusterMutate(id, clust){
	var neighbors = cluster.findOjectNeighbors(id, clust, ((clust.length/4)<40)?6:40);//((clust.length/4)>700)?700:(clust.length/4));
	neighbors.sort(function(a, b){return b.score.s - a.score.s;});
	return neighbors[0].data;
}


},{"./cluster.js/":15}],17:[function(require,module,exports){
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
		if(typeof notEqualsArr === "undefined"){
			runLoop=false;
		}
		else if(notEqualsArr.find(function(value){return value===toReturn;})!==toReturn){
			runLoop=false;
		}
	}
    return toReturn;//(typeof findIfExists === "undefined")?toReturn:getRandomInt(min, max, notEqualsArr);
}

},{}],18:[function(require,module,exports){
module.exports={"name":"objects","array":[{"id":"0.hdf5qn7vrm","wheel_radius":[0.5767690824721248,0.4177286154476836],"wheel_density":[0.05805828499322763,0.5558485029218216],"chassis_density":[0.01746922482830615],"vertex_list":[0.7941546027531794,0.33861058313418346,0.9817966727350886,0.04058391899039471,0.6792764840084577,0.7095516833429869,0.4442929689786037,0.37159709633978144,0.48655491389807315,0.8194897434679949,0.06791292762922252,0.8500617187981201],"wheel_vertex":[0.3197454833804805,0.07306832553443532,0.9696680221321918,0.2824291446288685,0.2380108435356263,0.03420163652850006,0.3930204478494015,0.9292589026168605],"index":0},{"id":"0.ddvqo9c4u5","wheel_radius":[0.07627311653690305,0.38077565824706383],"wheel_density":[0.01863697881086468,0.026864361789310287],"chassis_density":[0.7045568596969818],"vertex_list":[0.8827836738451413,0.4190617493499984,0.017147626844417063,0.2277553534525203,0.9391852300562391,0.41623535047479976,0.667874296655423,0.3184936092984223,0.885601792263214,0.1346539811623968,0.322385303872488,0.161407472396901],"wheel_vertex":[0.17206625167182543,0.2864306277502062,0.9385138859389617,0.7120516346789703,0.47681841776301215,0.9573420057371615,0.34779657603419056,0.4942428001369501],"index":1},{"id":"0.i58eicuogp","wheel_radius":[0.8797742202793692,0.4946090041701663],"wheel_density":[0.6907715700239563,0.35432984993561556],"chassis_density":[0.9971097639358597],"vertex_list":[0.3355939766795686,0.3677035616120996,0.25221017408131474,0.604213571816435,0.1430303697651747,0.6707414538501344,0.7976410790585797,0.0033040193157582998,0.48225864500530036,0.9722463490739863,0.13326685190618814,0.24511863681863266],"wheel_vertex":[0.9134632576763355,0.8028557179231353,0.06520887602002645,0.5008784841753418,0.29660822964929734,0.8268847970499333,0.7035107726768779,0.020149156720311145],"index":2},{"id":"0.gutj76a88f","wheel_radius":[0.9293229179821985,0.14096018806429722],"wheel_density":[0.9610668741784452,0.12918935045544622],"chassis_density":[0.4412938612774773],"vertex_list":[0.509666285390127,0.0440424703718838,0.32355514615481096,0.5028560491467837,0.8855525611846886,0.6634747633908817,0.053720135479725206,0.03939919113473578,0.8659130479988033,0.5292610191155793,0.25844974411733945,0.15674953593305863],"wheel_vertex":[0.10922529798546754,0.8697670750461268,0.8308079459877313,0.6383102766197528,0.7099969858096296,0.5389509745111423,0.8978376331961129,0.6420664501085884],"index":3},{"id":"0.s0qb8gd1uk8","wheel_radius":[0.7219865941050003,0.8749228764898627],"wheel_density":[0.8888827319734467,0.3633780972284817],"chassis_density":[0.7811514341788972],"vertex_list":[0.0710298251902226,0.04777839921760796,0.13258883889938056,0.9766647673306856,0.5400399336725707,0.009490303271581846,0.6105618345293602,0.30769684064628944,0.9536822130361375,0.6608960981573873,0.38788766841235356,0.14698211273515116],"wheel_vertex":[0.45796055398119706,0.5082384005387914,0.6910070637339527,0.49491480576195057,0.017564983056669536,0.9004187121939236,0.950888149443778,0.3145771879983139],"index":4},{"id":"0.am50skfifv8","wheel_radius":[0.4371782151705017,0.16934407528669593],"wheel_density":[0.5155615530382445,0.3746398626558487],"chassis_density":[0.9777831010398579],"vertex_list":[0.4218254332918403,0.13402991979798595,0.5679523833804261,0.9986360454712131,0.1370226529049714,0.6866226723994309,0.21085066722858148,0.11201281036347854,0.6458868083896243,0.7686349179192595,0.5631279410833077,0.8929527870277394],"wheel_vertex":[0.3201300463393102,0.7881304785297669,0.1994622663870953,0.5361312470790522,0.9372844704327077,0.6029566109207931,0.6654959920391821,0.2544075607920917],"index":5},{"id":"0.mjcg9femang","wheel_radius":[0.6075286178996335,0.02893235087829993],"wheel_density":[0.6881171089205549,0.36813690305177627],"chassis_density":[0.9194743667947931],"vertex_list":[0.9045666908132881,0.03170144930478025,0.3338413002137406,0.7848170385408266,0.8832407772242816,0.8265334718769144,0.9629695531244229,0.2736041402092191,0.8088087449763801,0.41076107312794563,0.8217996633679705,0.1483702365231736],"wheel_vertex":[0.11480781743513102,0.1697368994977173,0.22986415922054526,0.9511536546375357,0.780923129239145,0.7910268389663828,0.3456103464776277,0.9613859776527907],"index":6},{"id":"0.idfjve6f8t8","wheel_radius":[0.5411559581495173,0.44125053048089047],"wheel_density":[0.25909875492826284,0.47021399069456327],"chassis_density":[0.3613728202285016],"vertex_list":[0.41021391544269314,0.9881932969769589,0.49847114859554886,0.37319768768805983,0.005002513477929904,0.48993994550737674,0.9672756824011681,0.6109271173927,0.6698014751238872,0.9973690280950067,0.19443632869446215,0.047658470550454135],"wheel_vertex":[0.2864270744805486,0.19040083806112862,0.7719547618207676,0.3130688023992423,0.5529916364259202,0.9133434808376619,0.4711529062266886,0.8871360248210398],"index":7},{"id":"0.9kev7eefp3","wheel_radius":[0.29831527304858163,0.7544895716087605],"wheel_density":[0.1981877988356684,0.7017407123227355],"chassis_density":[0.12698002119723606],"vertex_list":[0.9189283243644228,0.6711416378673025,0.5079419289799354,0.6181036484244244,0.9479695662239411,0.26973353938956346,0.775651358892298,0.8756169233293907,0.05772602678811567,0.2554950773692868,0.7398641638106203,0.7116867640037474],"wheel_vertex":[0.13211088239213153,0.027042464603376004,0.0027046022484826793,0.9188908412047128,0.12734937330346696,0.6312409139785786,0.5458361143483772,0.4202780123037708],"index":8},{"id":"0.94ov1ivvd1g","wheel_radius":[0.4217454865568546,0.1493046286773776],"wheel_density":[0.15780014539785747,0.6349387909103907],"chassis_density":[0.2611015082022081],"vertex_list":[0.1614056198115068,0.7073385308831481,0.8865775204059925,0.3859295957226818,0.006323741490722901,0.5600717160338222,0.7150828584344404,0.46454515534837526,0.08787116907156722,0.7482726424381383,0.6007334079191868,0.3127118710322887],"wheel_vertex":[0.2436228357811132,0.8770990367388483,0.5563324518538395,0.215800578569187,0.7947741936679531,0.7453147294742604,0.7326655050104951,0.8125433747073709],"index":9},{"id":"0.euv3chfcog","wheel_radius":[0.506180192590908,0.4074301248023271],"wheel_density":[0.22819387088526755,0.20388407997970082],"chassis_density":[0.9868098499829738],"vertex_list":[0.8901104916221794,0.0382460536238427,0.01247621775189045,0.3198239375390004,0.24614261702584117,0.661214205610895,0.20887861407179376,0.30724427235234875,0.6906477993219471,0.13420328261045245,0.5562057663925064,0.5636912336060713],"wheel_vertex":[0.27292940315827985,0.8116694811049994,0.34305427081267625,0.737790370926398,0.7144049632051976,0.4136553492822954,0.9065788650669486,0.2673436684220467],"index":10},{"id":"0.3t73r089878","wheel_radius":[0.33434778236081897,0.3311075004472892],"wheel_density":[0.14826510887752065,0.748740057701869],"chassis_density":[0.09686964778059548],"vertex_list":[0.173451890973358,0.954957853504486,0.12969012388639367,0.8093440049579759,0.20662170223633236,0.5957475494308369,0.12093093644627673,0.23827678515406414,0.8782369771550591,0.18793972440902174,0.5340249844612774,0.6746936255896423],"wheel_vertex":[0.7737452828565528,0.2179732704223123,0.6433926126933227,0.05597399128863212,0.8364909201028081,0.5594266368540888,0.48026892671736365,0.13286338544745901],"index":11},{"id":"0.otp4mhgfflg","wheel_radius":[0.3096723890899076,0.3270905845862535],"wheel_density":[0.9519797779470658,0.4824659127948694],"chassis_density":[0.508849513971634],"vertex_list":[0.05385076804821032,0.4724615769754572,0.4759187607571993,0.8404392103904694,0.6068039184056986,0.24506037957624516,0.7890583591097218,0.4280727348285014,0.914308399814743,0.016679245786350494,0.023597365922794156,0.5472150478296525],"wheel_vertex":[0.9681325471086923,0.8440592804832436,0.5633043887572953,0.38659997190573114,0.9457256976802073,0.15689595746838436,0.5459903281063443,0.6834766601643341],"index":12},{"id":"0.m72cm8glci","wheel_radius":[0.4921190205702557,0.9730123122187448],"wheel_density":[0.6138731107622271,0.80188826074077],"chassis_density":[0.27336366221265496],"vertex_list":[0.48673379371347725,0.5616639421186809,0.6652628675453733,0.521127869483095,0.8826236680283714,0.7724370159671963,0.5328543643014874,0.48289945395031975,0.7011128939985845,0.9407919374959133,0.5196758016268144,0.26214607732622563],"wheel_vertex":[0.026968037135228773,0.8078115090468778,0.11567871694998044,0.2887653152210481,0.10871636169735654,0.29005831038415697,0.9705208285856395,0.8521699632762305],"index":13},{"id":"0.9hjuq0vark8","wheel_radius":[0.7377742272424606,0.27766419711539014],"wheel_density":[0.12067982288380974,0.5508429477497803],"chassis_density":[0.4742777307191277],"vertex_list":[0.475325738509615,0.653462696268186,0.23624452185059952,0.8624773295336279,0.3843663053567725,0.29624163876361664,0.8555864028060363,0.6153797712621405,0.022909313308777657,0.7078073819405373,0.2995603233023847,0.9591599855399191],"wheel_vertex":[0.915914626913259,0.6956844692079878,0.33284691963176405,0.7919985193630892,0.8846996483826077,0.7862606433515567,0.6523325763895098,0.8016109420768407],"index":14},{"id":"0.pk4uqro41u","wheel_radius":[0.8658881007803165,0.3357331986398473],"wheel_density":[0.5692064557307324,0.2791454871011563],"chassis_density":[0.3120375400367086],"vertex_list":[0.9189554009992524,0.3542579100478469,0.14964826963447164,0.9548992038109447,0.5136981847958031,0.5425422233324078,0.5382322667339448,0.6867404819061971,0.2403071409704176,0.5960192026151729,0.1981391854660728,0.0652119555215982],"wheel_vertex":[0.9382147287284206,0.6389032897639346,0.5745068606896859,0.3298007956203739,0.3748010225243654,0.1555312745759434,0.3488865368809815,0.2288608901580047],"index":15},{"id":"0.92pmqftm078","wheel_radius":[0.20940186357804302,0.9601831855684502],"wheel_density":[0.6074865062552535,0.487214084857744],"chassis_density":[0.8879779581417373],"vertex_list":[0.37229358911709576,0.3250638149302463,0.02399624334167294,0.5076844925929369,0.9361788706360077,0.5599877675198013,0.6178761701945197,0.19199515412459323,0.436893994490962,0.3409731423377498,0.4982559500560275,0.3018054779863344],"wheel_vertex":[0.4805567992416928,0.529172971508425,0.4576824490185867,0.28815816259966853,0.41307038021277576,0.8496303102150315,0.44262409410280923,0.118990835397361],"index":16},{"id":"0.p0bb3jcsa6o","wheel_radius":[0.8053770409363876,0.004608511505876489],"wheel_density":[0.37032936585319853,0.9110718290739903],"chassis_density":[0.41268931366555517],"vertex_list":[0.37505529616887445,0.3269894555788473,0.7824287339617897,0.08916755260272602,0.11846368789958772,0.6182305402069848,0.6883467480158929,0.38177905214995667,0.7208181609591433,0.7182811672980731,0.5053403982433966,0.6785485903889392],"wheel_vertex":[0.8602516434667127,0.9182412895648713,0.4943321446494058,0.4066814424053633,0.9450033934436965,0.04147678416903,0.9074303141025282,0.7920805318139295],"index":17},{"id":"0.g6nue40o6u","wheel_radius":[0.25950365179089285,0.45117196696361517],"wheel_density":[0.8737773207491646,0.3825049459175984],"chassis_density":[0.5750636056432643],"vertex_list":[0.16155077272274365,0.17401914773170235,0.4287580781076481,0.42932923860305827,0.47608143506731326,0.016141666182198033,0.7490069599283697,0.8779156633754976,0.6080928470185578,0.4845763154960605,0.15989694525876041,0.5492330632971734],"wheel_vertex":[0.4886604267859962,0.9507100553360299,0.8963786004106906,0.13962004268890382,0.017105305761339284,0.1203208130328568,0.9016859645440254,0.31282796595626206],"index":18},{"id":"0.uikpm9rmbb","wheel_radius":[0.0806451504762078,0.08423101469841532],"wheel_density":[0.34463928350406126,0.8694895031478671],"chassis_density":[0.14008481796461525],"vertex_list":[0.6860355827823672,0.9475637834183746,0.5480446481881946,0.2729072912678334,0.9158071629011582,0.5403677312919277,0.7110438375848036,0.34666135351410454,0.7835892647613154,0.2691403271699404,0.14436046411629033,0.27168516794708797],"wheel_vertex":[0.8176594755946187,0.6637355241449168,0.8402473944959381,0.6435582131301778,0.917040841042623,0.9824387525583211,0.49791639446670644,0.005377830182361487],"index":19},{"id":"0.phkod4h666o","wheel_radius":[0.3885121547052115,0.9408147796867175],"wheel_density":[0.6066760499920387,0.7437853735141478],"chassis_density":[0.047619348463744826],"vertex_list":[0.2818018188994671,0.5376711283235511,0.278265249347057,0.37180380749404063,0.0016354112440770674,0.3734920298406539,0.9258243649433546,0.9611282010648099,0.2635677758443302,0.2995122669698769,0.45009537621663176,0.14120495018961954],"wheel_vertex":[0.8211527025300243,0.6378520646150085,0.8433691242450887,0.10080112530514906,0.7420571718643294,0.06240659449537578,0.5019963798229192,0.13958803327033276],"index":20},{"id":"0.cdsb2t0a0gg","wheel_radius":[0.24505842176601966,0.47937570661588036],"wheel_density":[0.7318963359198882,0.20433591906714255],"chassis_density":[0.9440804013808017],"vertex_list":[0.2767177185735572,0.40191206919739253,0.6992520631753649,0.5805367054765673,0.5328760694595893,0.6051655266396856,0.8659374923698233,0.6385740518164591,0.09136175672495295,0.1946267162607933,0.5848324783419472,0.9612115069889817],"wheel_vertex":[0.9840419708674404,0.4002078328877534,0.6114668493004969,0.0547662826963875,0.7590263236186896,0.9095821718443651,0.8252785001445193,0.9354573503144779],"index":21},{"id":"0.5ec3f7uc86g","wheel_radius":[0.7428794526737739,0.14727079055353554],"wheel_density":[0.21720134324657558,0.5754268794146837],"chassis_density":[0.22476421424897008],"vertex_list":[0.8212963728160105,0.2297331892207486,0.21058817977645528,0.3002863349191449,0.16095424113953083,0.28570979035001876,0.8505053225959205,0.012099775565245663,0.43071909702961464,0.3581820673390337,0.9941396663350952,0.17115204663164763],"wheel_vertex":[0.6349365043647393,0.8564168056559227,0.8347314103983197,0.013561600989115519,0.20473813555899079,0.973788949531528,0.3298955475720191,0.704049870268243],"index":22},{"id":"0.o2m7e3jl5m","wheel_radius":[0.8661369447423091,0.36209186636855173],"wheel_density":[0.24886369948296272,0.9481136708961697],"chassis_density":[0.4645349071428597],"vertex_list":[0.3963158171740233,0.3256278822452916,0.4358865621693082,0.4180065756720124,0.03350757790126613,0.2681067495962719,0.19145799526267337,0.7371111884911565,0.4500408955195885,0.10688261567679347,0.3821541311464922,0.009416750541172192],"wheel_vertex":[0.9575462712867551,0.5695500762355803,0.7981443002154605,0.9474328403749823,0.7027016096400711,0.8286424663713696,0.8310500009461772,0.20389451798323543],"index":23},{"id":"0.vij7h4ll3ig","wheel_radius":[0.1814980076155488,0.26389762050722565],"wheel_density":[0.2829352972703518,0.7426468978176506],"chassis_density":[0.014486662613823365],"vertex_list":[0.05308677758606217,0.3660329920000105,0.9154588111109756,0.6599367403142471,0.006236701000372102,0.9416779757734717,0.8080809278339618,0.4249971585729182,0.43942023623270776,0.4463217820443348,0.740757020638958,0.09154286362854247],"wheel_vertex":[0.1701478887113994,0.23951500026651695,0.8417160753050081,0.44668632197313785,0.7984746620110903,0.24993050509729642,0.5982613413718036,0.024634143380375617],"index":24},{"id":"0.vbudpq7r8jg","wheel_radius":[0.1880833792086538,0.2909417556253724],"wheel_density":[0.3835353607487637,0.12542471127806198],"chassis_density":[0.9914887266787835],"vertex_list":[0.1408202327951953,0.9006563749172454,0.2860131896546747,0.5036058268015096,0.28237175351464594,0.6920935097717549,0.4030021430205859,0.4526349625334938,0.32951066138675067,0.9915639303248924,0.15421491780180507,0.5658120376445028],"wheel_vertex":[0.6207796081251498,0.08457529321879997,0.30959608934504557,0.9289887901506075,0.21134420090001038,0.26615847404781046,0.9679986325992576,0.036393266609056285],"index":25},{"id":"0.4igks77dflg","wheel_radius":[0.6162630688805109,0.996322195724116],"wheel_density":[0.07219389558395028,0.8163090041579422],"chassis_density":[0.6463871724924768],"vertex_list":[0.14686282939592732,0.3538624338089038,0.7352789107172508,0.8336219131334901,0.1345844214947911,0.0695711666235328,0.05891574961142054,0.5915082113269567,0.8106099081756695,0.09587631742587899,0.9775789162130557,0.620011000251137],"wheel_vertex":[0.23869164317299063,0.46960820534342784,0.9809209433980268,0.09408717517598952,0.9596228458615494,0.1493106650385012,0.5424116949883415,0.35068762039149237],"index":26},{"id":"0.i7in710f398","wheel_radius":[0.01074243535706998,0.37496150244395476],"wheel_density":[0.21761163033987585,0.28770690417266986],"chassis_density":[0.7788504774708707],"vertex_list":[0.9065045294527061,0.08320308349875738,0.03460864728278068,0.12885459498203744,0.7036120113589297,0.8301158151858712,0.3957769158442701,0.9897614345181391,0.0808815370561955,0.9435460667351685,0.3070266134901427,0.055233471026243874],"wheel_vertex":[0.22706240786290133,0.45363882858134663,0.4043110543388071,0.0466213326785736,0.17376130548777313,0.6419416055422196,0.45034182053638894,0.06303486495462352],"index":27},{"id":"0.96ivqppegag","wheel_radius":[0.4911179230902005,0.35046444691939094],"wheel_density":[0.33534449672897026,0.9335176580032427],"chassis_density":[0.31957538664110574],"vertex_list":[0.5926254873859351,0.7192087995229846,0.48449163046938826,0.7820757616208582,0.7462054398245774,0.09042624653203046,0.10702581503547992,0.9061878773626963,0.6522294122845294,0.6772711351923497,0.024511693552243807,0.8054593143058355],"wheel_vertex":[0.36029810438333065,0.6065237606237144,0.32602132171242637,0.5940415719076406,0.5821058694804442,0.6474690800650107,0.5906562254817702,0.47754843993265594],"index":28},{"id":"0.ffq8depchpg","wheel_radius":[0.19424114403784554,0.4111615025466757],"wheel_density":[0.7161119526969035,0.9210914218979367],"chassis_density":[0.6726066425877597],"vertex_list":[0.6087251491790631,0.7126922563608298,0.2848133218245028,0.2577778930560264,0.932291750560869,0.26024634386180456,0.9008608369751749,0.8196861793402688,0.049781128250446116,0.49846896499176063,0.42206776267989876,0.132826473899182],"wheel_vertex":[0.5527071271647432,0.6006663093919147,0.8888707647843714,0.24472713041630212,0.9264449367786494,0.008673983220342851,0.6561268639305937,0.800869840601915],"index":29},{"id":"0.31k1bsa29v8","wheel_radius":[0.5216579723226884,0.6938038782520572],"wheel_density":[0.7510504930846378,0.9360211671641339],"chassis_density":[0.9919692547833585],"vertex_list":[0.6202253450662798,0.8408932902288029,0.1467079955608943,0.9850450301241724,0.2334449761912203,0.28979123273254603,0.27093808017567866,0.19070462374783892,0.05336059782942826,0.827607292663183,0.931912342192549,0.43767176285957676],"wheel_vertex":[0.041586694728670714,0.0729827175190807,0.016916154905290748,0.4901454598823205,0.23119893679665826,0.02513006823214936,0.48938909863925995,0.3884350170537745],"index":30},{"id":"0.90kkvb4ucho","wheel_radius":[0.9101037992785472,0.4878592470115912],"wheel_density":[0.3848477970824631,0.45389049697961203],"chassis_density":[0.26080079893693164],"vertex_list":[0.5317932075935214,0.6878189310214191,0.9803101493711177,0.765751655053434,0.4060187183216988,0.11848729489072851,0.5735242259078523,0.9888373140171343,0.6631421747820911,0.5430329863620216,0.45982999435836613,0.8969676517036023],"wheel_vertex":[0.4054572620878496,0.381705658335161,0.6234951462381657,0.6433288559734538,0.857228266497932,0.8995549741199367,0.07651132793231885,0.7711765286985368],"index":31},{"id":"0.ajgtci3scg8","wheel_radius":[0.3351948140617189,0.6299731879087538],"wheel_density":[0.41534186810288554,0.2704413527223042],"chassis_density":[0.7013723526271509],"vertex_list":[0.7415782592669138,0.6352644432918293,0.17366602596210967,0.5072067934274973,0.5915560432013875,0.45493011325168453,0.2649409230524493,0.7562110356524923,0.07853292166813741,0.6154358760762721,0.8188030989851804,0.8748310389153457],"wheel_vertex":[0.10862349731806309,0.5857623668477845,0.47340786079757935,0.26666160156141405,0.7117025932806522,0.5334392851294998,0.9740204710346876,0.8119489411484921],"index":32},{"id":"0.ij6nllcc6j8","wheel_radius":[0.06576536071883776,0.2698134606168656],"wheel_density":[0.10826988964142781,0.4280793840639776],"chassis_density":[0.12451753555889056],"vertex_list":[0.9859276756591981,0.3236156178318257,0.23881710989060712,0.9085044838312986,0.07590918519143286,0.11783026761501492,0.7545494743180108,0.9830926222611833,0.2055190743128783,0.7084273553891405,0.6180798124777225,0.03837658378808495],"wheel_vertex":[0.26257958329367814,0.37422756343544883,0.9706637097723838,0.8270402872916975,0.6423470602861527,0.3049469603936841,0.020315424421025075,0.6731542315692196],"index":33},{"id":"0.cfamjkge14","wheel_radius":[0.5553371223441326,0.48255952545301195],"wheel_density":[0.10233567955957112,0.4118663994606462],"chassis_density":[0.8507010372498203],"vertex_list":[0.4435526144410815,0.7952571161216015,0.6956674298481698,0.7700381150426268,0.02443779192265727,0.3314924202264524,0.5348472872176893,0.16998983587117444,0.3702567531636358,0.13248871108359395,0.32421152908080253,0.12384389935429585],"wheel_vertex":[0.5562361777413118,0.02018197327300042,0.6656773966986882,0.34056707549167897,0.3228687248283031,0.005468963280792272,0.24874132312313169,0.007568029417329258],"index":34},{"id":"0.897upusp00o","wheel_radius":[0.9506221057739288,0.263467828878726],"wheel_density":[0.7810166453464373,0.38647992998898206],"chassis_density":[0.0735421825781255],"vertex_list":[0.33373114115871116,0.09869861121728296,0.1555855146519025,0.3174873187217855,0.4752826770773326,0.3299159892797654,0.19600097967524555,0.14925170964195633,0.006864524052712984,0.7532489017554023,0.438354172052676,0.31124012477685215],"wheel_vertex":[0.8498673328952575,0.48833250139633355,0.714801647554276,0.8987104136285196,0.9384108494792647,0.8839853876491639,0.4194011057562126,0.5022476949036452],"index":35},{"id":"0.eugue9pc7qo","wheel_radius":[0.14580879382814493,0.874400937581342],"wheel_density":[0.35057826376474344,0.49085712757371947],"chassis_density":[0.9261449817850527],"vertex_list":[0.1669027978157156,0.2688530561348279,0.4102379290204792,0.5814259556405568,0.44957812309096634,0.7507083572416744,0.07287773329701586,0.7974367736625725,0.06846180783077527,0.7344754291191549,0.5703026759329677,0.628933557495567],"wheel_vertex":[0.7917192328086229,0.5708019023659623,0.7765250209157932,0.29264234660147226,0.27938923378975344,0.14348106135106042,0.5609167555087855,0.5047442938192339],"index":36},{"id":"0.l6scl5ntjd","wheel_radius":[0.24557812148752567,0.6740496043706881],"wheel_density":[0.07800478790603682,0.5224295673385457],"chassis_density":[0.04608851170320549],"vertex_list":[0.3075353258067306,0.946497419967802,0.40629223029438566,0.2763741078982387,0.2564047413245427,0.9311538993240389,0.6453254163405322,0.6114796828964544,0.5378282883910244,0.19921609846644528,0.9653785345250194,0.39789096849914607],"wheel_vertex":[0.17526063711196405,0.5219227364785715,0.19228400828285652,0.4747119812082834,0.12939951976376407,0.9719157459336423,0.05855057550033971,0.17011606800359047],"index":37},{"id":"0.skr6mmi0sug","wheel_radius":[0.13019903595315174,0.6978847412153089],"wheel_density":[0.9380383929168379,0.9006263152797596],"chassis_density":[0.5362153572215496],"vertex_list":[0.7898533203452032,0.04826996095952185,0.10461690807436286,0.19143508600849146,0.8187561846892544,0.2535765016568483,0.4644271093103154,0.7747321663565605,0.7155888564099566,0.22773684985020748,0.8764042408069712,0.25650019822349357],"wheel_vertex":[0.9742245496507285,0.38649515346286556,0.330704831027097,0.8695117307217375,0.8324213556099074,0.1815734170046004,0.40685293714777715,0.36774085813193635],"index":38},{"id":"0.0bod8ulve58","wheel_radius":[0.5690838202354156,0.24947317707233663],"wheel_density":[0.5327172442416095,0.5221831496178757],"chassis_density":[0.858638303927433],"vertex_list":[0.6544165849856707,0.7921670656120694,0.22828101591886552,0.6608910536558867,0.025260356428931097,0.7044614209271924,0.9761907228962194,0.4711649209146893,0.5727050275473584,0.8272756635204241,0.3982557215345284,0.546708833415614],"wheel_vertex":[0.20255946416681603,0.2824579920782291,0.30185189504063725,0.7373091921243422,0.8353113639169545,0.8787308062707437,0.20223004484930285,0.7812766443788959],"index":39}]}
},{}],19:[function(require,module,exports){
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
@param selectionTypeOne int - the selection method for the first parent
@param selectionTypeTwo int - the selection method for the second parent
@param mateIncreaseSelectionMethod int - the selection method for choosing the mateIncrease parent which will not be deleted
@return parentsScore int - returns the average score of the parents*/
function selectParents(parents, scores, increaseMate, selectionTypeOne, selectionTypeTwo, mateIncreaseSelectionMethod){
	var parent1 = selection.runSelection(scores,(increaseMate===false)?selectionTypeOne:mateIncreaseSelectionMethod);
	parents.push(parent1.def);
	if(increaseMate===false){
		scores.splice(scores.findIndex(x=> x.def.id===parents[0].id),1);
	}
	var parent2 = selection.runSelection(scores,(increaseMate===false)?selectionTypeTwo:mateIncreaseSelectionMethod);
	parents.push(parent2.def);
	scores.splice(scores.findIndex(x=> x.def.id===parents[1].id),1);
	return (parent1.score.s + parent2.score.s)/2;
}

/*This function runs a Evolutionary algorithm which uses Selection, Crossover and mutations to create the new populations of cars.
@param scores ObjectArray - An array which holds the car objects and there performance scores
@param config - This is the generationConfig file passed through which gives the cars template/blueprint for creation
@param noCarsCreated int - The number of cars there currently exist used for creating the id of new cars
@param selectionTypeOne int - the selection method for the first parent
@param selectionTypeTwo int - the selection method for the second parent
@param mutationType int - the type of mutation to be used either single mutation or multi-mutations
@param mateIncreaseSelectionMethod int - the selection method for choosing the mateIncrease parent which will not be deleted
@return newGeneration ObjectArray - is returned with all the newly created cars that will be in the simulation*/
function runEA(scores, config, noCarsCreated, noElites, crossoverType, noMateIncrease, selectionTypeOne, selectionTypeTwo, mutationType, mateIncreaseSelectionMethod, clust){
	scores.sort(function(a, b){return b.score.s - a.score.s;});
	var generationSize=scores.length;
	var newGeneration = new Array();
	var maxNoMatesIncreases = noMateIncrease;
	var currentNoMateIncreases = 0;
	var noElites=noElites;
	var tempClust;
	if(typeof clust !== "undefined"){
		if(clust.carsArray.length>20){tempClust=clust;}
	}
	for(var i=0;i<noElites;i++){//add new elites to newGeneration
		var newElite = scores[i].def;
		newElite.elite = true;
		newGeneration.push(newElite);
	}
	for(var k = 0;k<generationSize/2;k++){
		if(newGeneration.length!==generationSize){
		var pickedParents = [];
		var parentsScore = selectParents(pickedParents, scores, (currentNoMateIncreases<maxNoMatesIncreases)?true:false, selectionTypeOne, selectionTypeTwo, mateIncreaseSelectionMethod); 
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
				newGeneration[x] = ((mutationType===0)||(mutationType===3))?mutation.mutate(newGeneration[x], tempClust):mutation.multiMutations(newGeneration[x],newGeneration.findIndex(x=> x.id===currentID),20);
			}
		}
		console.log(newGeneration);
	return newGeneration;
}

/*This function runs the Baseline Evolutionary algorithm which only runs a mutation or multiMutations over all the cars passed though in the scores parameter.
@param scores Array - This parameter is an array of cars that holds the score statistics and car data such as id and "wheel_radius", "chassis_density", "vertex_list", "wheel_vertex" and "wheel_density"
@param config - This passes a file with functions that can be called.
@return newGeneration - this is the new population that have had mutations applied to them.*/
function runBaselineEA(scores, config, clust){
	scores.sort(function(a, b){return a.score.s - b.score.s;});
	var schema = config.schema;//list of car variables i.e "wheel_radius", "chassis_density", "vertex_list", "wheel_vertex" and "wheel_density"
	var newGeneration = new Array();
	var generationSize=scores.length;
	console.log(scores);//test data
	for (var k = 0; k < generationSize; k++) {
		var tempClust;
		if(clust.arrayOfClusters[0].dataArray.length>2){tempClust=clust;}
		newGeneration.push(mutation.mutate(scores[k].def, tempClust));
		//newGeneration.push(mutation.mutate(scores[k].def));
		//newGeneration.push(mutation.multiMutations(scores[k].def,scores.findIndex(x=> x.def.id===scores[k].def.id),20));
		newGeneration[k].elite = false;
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
	var mateIncreaseSelectionMethod = 1;// 1 for tournament selection using sub-arrays/ 2 for tournament selection to get weakest car/3 for roulette-selection/ 4 for uniform random selection
	// selectionType for selection the two parents selectionTypeOne for the first slection, selectionTypeTwo for the second parent
	var selectionTypeOne = 1;// 1 for tournament selection using sub-arrays/ 2 for tournament selection to get weakest car/3 for roulette-selection/ 4 for uniform random selection
	var selectionTypeTwo = 1;// 1 for tournament selection using sub-arrays/ 2 for tournament selection to get weakest car/3 for roulette-selection/ 4 for uniform random selection
	var mutationType =0;//0 for standard 1 mutation type 1 for multi-mutations, 3 for cluster mutation
	var useClusteringScoring = false;
	//--------------------------------------------------------------------------------------------------------------------
	var generationSize=scores.length;
	var newGeneration = new Array();
	var count;
	var tempRound=0;
	
	tempRound=(typeof previousState.round ==="undefined")?0:previousState.round;
	count = previousState.counter + 1;
	var clusterInt;
	if((mutationType===3)||(useClusteringScoring===true)){
		if(previousState.counter===0){
			clusterInt=cluster.setup(scores,null,false)
		}
		else{
			clusterInt=cluster.setup(scores,previousState.clust,true)
		}
		if(useClusteringScoring===true){
		cluster.reScoreCars(scores ,clusterInt);
		}
	}
	scores.sort(function(a, b){return a.score.s - b.score.s;});
	var numberOfCars = (previousState.counter===0)?generationSize:previousState.noCars+generationSize;
	var schema = config.schema;//list of car variables i.e "wheel_radius", "chassis_density", "vertex_list", "wheel_vertex"
	
	console.log("Log -- "+previousState.counter);
	//console.log(scoresData);//test data
	var eaType = 1;
	newGeneration = (eaType===1)?runEA(scores, config, numberOfCars, noElites, crossoverType, noMateIncrease, selectionTypeOne, selectionTypeTwo, mutationType, mateIncreaseSelectionMethod, clusterInt):runBaselineEA(scores, config,clusterInt);
	//console.log(newGeneration);//test data
	if(previousState.counter>150){
		count=0;
		tempRound++;
		//newGeneration=generationZero(config).generation;
		
	}
  return {
    counter: count,
    generation: newGeneration,
	clust: clusterInt,
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

},{"../create-instance":14,"./clustering/clusterSetup.js/":16,"./crossover.js/":17,"./initialCars.json/":18,"./mutation.js/":20,"./randomInt.js/":21,"./selection.js/":22,"fs":1}],20:[function(require,module,exports){
var cluster = require("./clustering/clusterSetup.js/");

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
		if(typeof notEqualsArr === "undefined"){
			runLoop=false;
		}
		else if(notEqualsArr.find(function(value){return value===toReturn;})!==toReturn){
			runLoop=false;
		}
	}
    return toReturn;//(typeof findIfExists === "undefined")?toReturn:getRandomInt(min, max, notEqualsArr);
}


function changeArrayValue(id, originalValue, clust, dataType){
	for(var i=0;i<originalValue.length;i++){
		if(typeof clust === "undefined"){
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
		} else {
			var newClust;
			for(var y=0;y<clust.arrayOfClusters.length;y++){
				if(clust.arrayOfClusters[y].id===dataType){
					newClust=clust.arrayOfClusters[y];
				}
			}
			var newValue = (cluster.clusterMutate(id,newClust.dataArray[i].dataArray)-originalValue[i])*0.3;
			originalValue[i]=originalValue[i]+newValue;
		}
	}
	return originalValue;
}

function mutate(car, clust){
	return changeData(car,new Array(),1, clust);
}

function changeData(car, multiMutations, noMutations, clust){
	var randomInt = getRandomInt(0,4, multiMutations);
	if(randomInt===1){
		car.chassis_density=changeArrayValue(car.id, car.chassis_density, clust, "chassis_density");
	}
	else if(randomInt===2){
		car.vertex_list=changeArrayValue(car.id, car.vertex_list, clust, "vertex_list");
	}
	else if(randomInt===3){
		car.wheel_density=changeArrayValue(car.id, car.wheel_density, clust, "wheel_density");
	}
	else if(randomInt===4){
		car.wheel_radius=changeArrayValue(car.id, car.wheel_radius, clust, "wheel_radius");
	}
	else {
		car.wheel_vertex=changeArrayValue(car.id, car.wheel_vertex, clust, "wheel_vertex");
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
},{"./clustering/clusterSetup.js/":16}],21:[function(require,module,exports){
 module.exports = {
	getRandomInt: getRandomInt
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
		if(typeof notEqualsArr === "undefined"){
			runLoop=false;
		}
		else if(notEqualsArr.find(function(value){return value===toReturn;})!==toReturn){
			runLoop=false;
		}
	}
    return toReturn;//(typeof findIfExists === "undefined")?toReturn:getRandomInt(min, max, notEqualsArr);
}
},{}],22:[function(require,module,exports){
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
		return tournamentSelection(carsArr,strongest,carsArr.length/2, useSubSet);
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
	if(useSubSet===true){
		subSet.sort(function(a,b){return (strongest===true)?b.score.s - a.score.s:a.score.s - b.score.s;});
	} else {
		carsArr.sort(function(a,b){return (strongest===true)?b.score.s - a.score.s:a.score.s - b.score.s;});
	}
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
		if(typeof notEqualsArr === "undefined"){
			runLoop=false;
		}
		else if(notEqualsArr.find(function(value){return value===toReturn;})!==toReturn){
			runLoop=false;
		}
	}
    return toReturn;//(typeof findIfExists === "undefined")?toReturn:getRandomInt(min, max, notEqualsArr);
}


},{}],23:[function(require,module,exports){


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

},{}],24:[function(require,module,exports){
var create = require("../create-instance");

module.exports = {
  generationZero: generationZero,
  nextGeneration: nextGeneration,
}

function generationZero(config){
  var oldStructure = create.createGenerationZero(
    config.schema, config.generateRandom
  );
  var newStructure = createStructure(config, 1, oldStructure);

  var k = 0;

  return {
    counter: 0,
    k: k,
    generation: [newStructure, oldStructure]
  }
}

function nextGeneration(previousState, scores, config){
  var nextState = {
    k: (previousState.k + 1)%config.generationSize,
    counter: previousState.counter + (previousState.k === config.generationSize ? 1 : 0)
  };
  // gradually get closer to zero temperature (but never hit it)
  var oldDef = previousState.curDef || previousState.generation[1];
  var oldScore = previousState.score || scores[1].score.v;

  var newDef = previousState.generation[0];
  var newScore = scores[0].score.v;


  var temp = Math.pow(Math.E, -nextState.counter / config.generationSize);

  var scoreDiff = newScore - oldScore;
  // If the next point is higher, change location
  if(scoreDiff > 0){
    nextState.curDef = newDef;
    nextState.score = newScore;
    // Else we want to increase likelyhood of changing location as we get
  } else if(Math.random() > Math.exp(-scoreDiff/(nextState.k * temp))){
    nextState.curDef = newDef;
    nextState.score = newScore;
  } else {
    nextState.curDef = oldDef;
    nextState.score = oldScore;
  }

  console.log(previousState, nextState);

  nextState.generation = [createStructure(config, temp, nextState.curDef)];

  return nextState;
}


function createStructure(config, mutation_range, parent){
  var schema = config.schema,
    gen_mutation = 1,
    generateRandom = config.generateRandom;
  return create.createMutatedClone(
    schema,
    generateRandom,
    parent,
    mutation_range,
    gen_mutation
  )

}

},{"../create-instance":14}],25:[function(require,module,exports){
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

},{"../car-schema/def-to-car":5,"../car-schema/run":6,"./setup-scene":26}],26:[function(require,module,exports){
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

},{}]},{},[2])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9saWIvX2VtcHR5LmpzIiwic3JjL2JhcmUuanMiLCJzcmMvY2FyLXNjaGVtYS9jYXItY29uc3RhbnRzLmpzb24iLCJzcmMvY2FyLXNjaGVtYS9jb25zdHJ1Y3QuanMiLCJzcmMvY2FyLXNjaGVtYS9kZWYtdG8tY2FyLmpzIiwic3JjL2Nhci1zY2hlbWEvcnVuLmpzIiwic3JjL2RyYXcvcGxvdC1ncmFwaHMuanMiLCJzcmMvZHJhdy9zY2F0dGVyLXBsb3QuanMiLCJzcmMvZ2VuZXJhdGlvbi1jb25maWcvZ2VuZXJhdGVSYW5kb20uanMiLCJzcmMvZ2VuZXJhdGlvbi1jb25maWcvaW5icmVlZGluZy1jb2VmZmljaWVudC5qcyIsInNyYy9nZW5lcmF0aW9uLWNvbmZpZy9pbmRleC5qcyIsInNyYy9nZW5lcmF0aW9uLWNvbmZpZy9waWNrUGFyZW50LmpzIiwic3JjL2dlbmVyYXRpb24tY29uZmlnL3NlbGVjdEZyb21BbGxQYXJlbnRzLmpzIiwic3JjL21hY2hpbmUtbGVhcm5pbmcvY3JlYXRlLWluc3RhbmNlLmpzIiwic3JjL21hY2hpbmUtbGVhcm5pbmcvZ2VuZXRpYy1hbGdvcml0aG0vY2x1c3RlcmluZy9jbHVzdGVyLmpzIiwic3JjL21hY2hpbmUtbGVhcm5pbmcvZ2VuZXRpYy1hbGdvcml0aG0vY2x1c3RlcmluZy9jbHVzdGVyU2V0dXAuanMiLCJzcmMvbWFjaGluZS1sZWFybmluZy9nZW5ldGljLWFsZ29yaXRobS9jcm9zc292ZXIuanMiLCJzcmMvbWFjaGluZS1sZWFybmluZy9nZW5ldGljLWFsZ29yaXRobS9pbml0aWFsQ2Fycy5qc29uIiwic3JjL21hY2hpbmUtbGVhcm5pbmcvZ2VuZXRpYy1hbGdvcml0aG0vbWFuYWdlLXJvdW5kLmpzIiwic3JjL21hY2hpbmUtbGVhcm5pbmcvZ2VuZXRpYy1hbGdvcml0aG0vbXV0YXRpb24uanMiLCJzcmMvbWFjaGluZS1sZWFybmluZy9nZW5ldGljLWFsZ29yaXRobS9yYW5kb21JbnQuanMiLCJzcmMvbWFjaGluZS1sZWFybmluZy9nZW5ldGljLWFsZ29yaXRobS9zZWxlY3Rpb24uanMiLCJzcmMvbWFjaGluZS1sZWFybmluZy9yYW5kb20uanMiLCJzcmMvbWFjaGluZS1sZWFybmluZy9zaW11bGF0ZWQtYW5uZWFsaW5nL21hbmFnZS1yb3VuZC5qcyIsInNyYy93b3JsZC9ydW4uanMiLCJzcmMvd29ybGQvc2V0dXAtc2NlbmUuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTs7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9LQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDWEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNySEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEtBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3REQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RHQTs7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9OQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4R0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uKCl7ZnVuY3Rpb24gcihlLG4sdCl7ZnVuY3Rpb24gbyhpLGYpe2lmKCFuW2ldKXtpZighZVtpXSl7dmFyIGM9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZTtpZighZiYmYylyZXR1cm4gYyhpLCEwKTtpZih1KXJldHVybiB1KGksITApO3ZhciBhPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIraStcIidcIik7dGhyb3cgYS5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGF9dmFyIHA9bltpXT17ZXhwb3J0czp7fX07ZVtpXVswXS5jYWxsKHAuZXhwb3J0cyxmdW5jdGlvbihyKXt2YXIgbj1lW2ldWzFdW3JdO3JldHVybiBvKG58fHIpfSxwLHAuZXhwb3J0cyxyLGUsbix0KX1yZXR1cm4gbltpXS5leHBvcnRzfWZvcih2YXIgdT1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlLGk9MDtpPHQubGVuZ3RoO2krKylvKHRbaV0pO3JldHVybiBvfXJldHVybiByfSkoKSIsIiIsIi8qIGdsb2JhbHMgZG9jdW1lbnQgY29uZmlybSBidG9hICovXG4vKiBnbG9iYWxzIGIyVmVjMiAqL1xuLy8gR2xvYmFsIFZhcnNcblxudmFyIHdvcmxkUnVuID0gcmVxdWlyZShcIi4vd29ybGQvcnVuLmpzXCIpO1xuXG52YXIgZ3JhcGhfZm5zID0gcmVxdWlyZShcIi4vZHJhdy9wbG90LWdyYXBocy5qc1wiKTtcbnZhciBwbG90X2dyYXBocyA9IGdyYXBoX2Zucy5wbG90R3JhcGhzO1xuXG5cbi8vID09PT09PT0gV09STEQgU1RBVEUgPT09PT09XG5cbnZhciAkZ3JhcGhMaXN0ID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcihcIiNncmFwaC1saXN0XCIpO1xudmFyICRncmFwaFRlbXBsYXRlID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcihcIiNncmFwaC10ZW1wbGF0ZVwiKTtcblxuZnVuY3Rpb24gc3RyaW5nVG9IVE1MKHMpe1xuICB2YXIgdGVtcCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICB0ZW1wLmlubmVySFRNTCA9IHM7XG4gIHJldHVybiB0ZW1wLmNoaWxkcmVuWzBdO1xufVxuXG52YXIgc3RhdGVzLCBydW5uZXJzLCByZXN1bHRzLCBncmFwaFN0YXRlID0ge307XG5cbmZ1bmN0aW9uIHVwZGF0ZVVJKGtleSwgc2NvcmVzKXtcbiAgdmFyICRncmFwaCA9ICRncmFwaExpc3QucXVlcnlTZWxlY3RvcihcIiNncmFwaC1cIiArIGtleSk7XG4gIHZhciAkbmV3R3JhcGggPSBzdHJpbmdUb0hUTUwoJGdyYXBoVGVtcGxhdGUuaW5uZXJIVE1MKTtcbiAgJG5ld0dyYXBoLmlkID0gXCJncmFwaC1cIiArIGtleTtcbiAgaWYoJGdyYXBoKXtcbiAgICAkZ3JhcGhMaXN0LnJlcGxhY2VDaGlsZCgkZ3JhcGgsICRuZXdHcmFwaCk7XG4gIH0gZWxzZSB7XG4gICAgJGdyYXBoTGlzdC5hcHBlbmRDaGlsZCgkbmV3R3JhcGgpO1xuICB9XG4gIGNvbnNvbGUubG9nKCRuZXdHcmFwaCk7XG4gIHZhciBzY2F0dGVyUGxvdEVsZW0gPSAkbmV3R3JhcGgucXVlcnlTZWxlY3RvcihcIi5zY2F0dGVycGxvdFwiKTtcbiAgc2NhdHRlclBsb3RFbGVtLmlkID0gXCJncmFwaC1cIiArIGtleSArIFwiLXNjYXR0ZXJcIjtcbiAgZ3JhcGhTdGF0ZVtrZXldID0gcGxvdF9ncmFwaHMoXG4gICAgJG5ld0dyYXBoLnF1ZXJ5U2VsZWN0b3IoXCIuZ3JhcGhjYW52YXNcIiksXG4gICAgJG5ld0dyYXBoLnF1ZXJ5U2VsZWN0b3IoXCIudG9wc2NvcmVzXCIpLFxuICAgIHNjYXR0ZXJQbG90RWxlbSxcbiAgICBncmFwaFN0YXRlW2tleV0sXG4gICAgc2NvcmVzLFxuICAgIHt9XG4gICk7XG59XG5cbnZhciBnZW5lcmF0aW9uQ29uZmlnID0gcmVxdWlyZShcIi4vZ2VuZXJhdGlvbi1jb25maWdcIik7XG5cbnZhciBib3gyZGZwcyA9IDYwO1xudmFyIG1heF9jYXJfaGVhbHRoID0gYm94MmRmcHMgKiAxMDtcblxudmFyIHdvcmxkX2RlZiA9IHtcbiAgZ3Jhdml0eTogbmV3IGIyVmVjMigwLjAsIC05LjgxKSxcbiAgZG9TbGVlcDogdHJ1ZSxcbiAgZmxvb3JzZWVkOiBidG9hKE1hdGguc2VlZHJhbmRvbSgpKSxcbiAgdGlsZURpbWVuc2lvbnM6IG5ldyBiMlZlYzIoMS41LCAwLjE1KSxcbiAgbWF4Rmxvb3JUaWxlczogMjAwLFxuICBtdXRhYmxlX2Zsb29yOiBmYWxzZSxcbiAgYm94MmRmcHM6IGJveDJkZnBzLFxuICBtb3RvclNwZWVkOiAyMCxcbiAgbWF4X2Nhcl9oZWFsdGg6IG1heF9jYXJfaGVhbHRoLFxuICBzY2hlbWE6IGdlbmVyYXRpb25Db25maWcuY29uc3RhbnRzLnNjaGVtYVxufVxuXG52YXIgbWFuYWdlUm91bmQgPSB7XG4gIGdlbmV0aWM6IHJlcXVpcmUoXCIuL21hY2hpbmUtbGVhcm5pbmcvZ2VuZXRpYy1hbGdvcml0aG0vbWFuYWdlLXJvdW5kLmpzXCIpLFxuICBhbm5lYWxpbmc6IHJlcXVpcmUoXCIuL21hY2hpbmUtbGVhcm5pbmcvc2ltdWxhdGVkLWFubmVhbGluZy9tYW5hZ2Utcm91bmQuanNcIiksXG59O1xuXG52YXIgY3JlYXRlTGlzdGVuZXJzID0gZnVuY3Rpb24oa2V5KXtcbiAgcmV0dXJuIHtcbiAgICBwcmVDYXJTdGVwOiBmdW5jdGlvbigpe30sXG4gICAgY2FyU3RlcDogZnVuY3Rpb24oKXt9LFxuICAgIGNhckRlYXRoOiBmdW5jdGlvbihjYXJJbmZvKXtcbiAgICAgIGNhckluZm8uc2NvcmUuaSA9IHN0YXRlc1trZXldLmNvdW50ZXI7XG4gICAgfSxcbiAgICBnZW5lcmF0aW9uRW5kOiBmdW5jdGlvbihyZXN1bHRzKXtcbiAgICAgIGhhbmRsZVJvdW5kRW5kKGtleSwgcmVzdWx0cyk7XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIGdlbmVyYXRpb25aZXJvKCl7XG4gIHZhciBvYmogPSBPYmplY3Qua2V5cyhtYW5hZ2VSb3VuZCkucmVkdWNlKGZ1bmN0aW9uKG9iaiwga2V5KXtcbiAgICBvYmouc3RhdGVzW2tleV0gPSBtYW5hZ2VSb3VuZFtrZXldLmdlbmVyYXRpb25aZXJvKGdlbmVyYXRpb25Db25maWcoKSk7XG4gICAgb2JqLnJ1bm5lcnNba2V5XSA9IHdvcmxkUnVuKFxuICAgICAgd29ybGRfZGVmLCBvYmouc3RhdGVzW2tleV0uZ2VuZXJhdGlvbiwgY3JlYXRlTGlzdGVuZXJzKGtleSlcbiAgICApO1xuICAgIG9iai5yZXN1bHRzW2tleV0gPSBbXTtcbiAgICBncmFwaFN0YXRlW2tleV0gPSB7fVxuICAgIHJldHVybiBvYmo7XG4gIH0sIHtzdGF0ZXM6IHt9LCBydW5uZXJzOiB7fSwgcmVzdWx0czoge319KTtcbiAgc3RhdGVzID0gb2JqLnN0YXRlcztcbiAgcnVubmVycyA9IG9iai5ydW5uZXJzO1xuICByZXN1bHRzID0gb2JqLnJlc3VsdHM7XG59XG5cbmZ1bmN0aW9uIGhhbmRsZVJvdW5kRW5kKGtleSwgc2NvcmVzKXtcbiAgdmFyIHByZXZpb3VzQ291bnRlciA9IHN0YXRlc1trZXldLmNvdW50ZXI7XG4gIHN0YXRlc1trZXldID0gbWFuYWdlUm91bmRba2V5XS5uZXh0R2VuZXJhdGlvbihcbiAgICBzdGF0ZXNba2V5XSwgc2NvcmVzLCBnZW5lcmF0aW9uQ29uZmlnKClcbiAgKTtcbiAgcnVubmVyc1trZXldID0gd29ybGRSdW4oXG4gICAgd29ybGRfZGVmLCBzdGF0ZXNba2V5XS5nZW5lcmF0aW9uLCBjcmVhdGVMaXN0ZW5lcnMoa2V5KVxuICApO1xuICBpZihzdGF0ZXNba2V5XS5jb3VudGVyID09PSBwcmV2aW91c0NvdW50ZXIpe1xuICAgIGNvbnNvbGUubG9nKHJlc3VsdHMpO1xuICAgIHJlc3VsdHNba2V5XSA9IHJlc3VsdHNba2V5XS5jb25jYXQoc2NvcmVzKTtcbiAgfSBlbHNlIHtcbiAgICBoYW5kbGVHZW5lcmF0aW9uRW5kKGtleSk7XG4gICAgcmVzdWx0c1trZXldID0gW107XG4gIH1cbn1cblxuZnVuY3Rpb24gcnVuUm91bmQoKXtcbiAgdmFyIHRvUnVuID0gbmV3IE1hcCgpO1xuICBPYmplY3Qua2V5cyhzdGF0ZXMpLmZvckVhY2goZnVuY3Rpb24oa2V5KXsgdG9SdW4uc2V0KGtleSwgc3RhdGVzW2tleV0uY291bnRlcikgfSk7XG4gIGNvbnNvbGUubG9nKHRvUnVuKTtcbiAgd2hpbGUodG9SdW4uc2l6ZSl7XG4gICAgY29uc29sZS5sb2coXCJydW5uaW5nXCIpO1xuICAgIEFycmF5LmZyb20odG9SdW4ua2V5cygpKS5mb3JFYWNoKGZ1bmN0aW9uKGtleSl7XG4gICAgICBpZihzdGF0ZXNba2V5XS5jb3VudGVyID09PSB0b1J1bi5nZXQoa2V5KSl7XG4gICAgICAgIHJ1bm5lcnNba2V5XS5zdGVwKCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0b1J1bi5kZWxldGUoa2V5KTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxufVxuXG5mdW5jdGlvbiBoYW5kbGVHZW5lcmF0aW9uRW5kKGtleSl7XG4gIHZhciBzY29yZXMgPSByZXN1bHRzW2tleV07XG4gIHNjb3Jlcy5zb3J0KGZ1bmN0aW9uIChhLCBiKSB7XG4gICAgaWYgKGEuc2NvcmUudiA+IGIuc2NvcmUudikge1xuICAgICAgcmV0dXJuIC0xXG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiAxXG4gICAgfVxuICB9KVxuICB1cGRhdGVVSShrZXksIHNjb3Jlcyk7XG4gIHJlc3VsdHNba2V5XSA9IFtdO1xufVxuXG5mdW5jdGlvbiBjd19yZXNldFBvcHVsYXRpb25VSSgpIHtcbiAgJGdyYXBoTGlzdC5pbm5lckhUTUwgPSBcIlwiO1xufVxuXG5mdW5jdGlvbiBjd19yZXNldFdvcmxkKCkge1xuICBjd19yZXNldFBvcHVsYXRpb25VSSgpO1xuICBNYXRoLnNlZWRyYW5kb20oKTtcbiAgZ2VuZXJhdGlvblplcm8oKTtcbn1cblxuZG9jdW1lbnQucXVlcnlTZWxlY3RvcihcIiNuZXctcG9wdWxhdGlvblwiKS5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgZnVuY3Rpb24oKXtcbiAgY3dfcmVzZXRQb3B1bGF0aW9uVUkoKVxuICBnZW5lcmF0aW9uWmVybygpO1xufSlcblxuXG5kb2N1bWVudC5xdWVyeVNlbGVjdG9yKFwiI2NvbmZpcm0tcmVzZXRcIikuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIGZ1bmN0aW9uKCl7XG4gIGN3X2NvbmZpcm1SZXNldFdvcmxkKClcbn0pXG5cbmRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoXCIjZmFzdC1mb3J3YXJkXCIpLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCBmdW5jdGlvbigpe1xuICBydW5Sb3VuZCgpO1xufSlcblxuZnVuY3Rpb24gY3dfY29uZmlybVJlc2V0V29ybGQoKSB7XG4gIGlmIChjb25maXJtKCdSZWFsbHkgcmVzZXQgd29ybGQ/JykpIHtcbiAgICBjd19yZXNldFdvcmxkKCk7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG59XG5cbmN3X3Jlc2V0V29ybGQoKTtcbiIsIm1vZHVsZS5leHBvcnRzPXtcbiAgXCJ3aGVlbENvdW50XCI6IDIsXG4gIFwid2hlZWxNaW5SYWRpdXNcIjogMC4yLFxuICBcIndoZWVsUmFkaXVzUmFuZ2VcIjogMC41LFxuICBcIndoZWVsTWluRGVuc2l0eVwiOiA0MCxcbiAgXCJ3aGVlbERlbnNpdHlSYW5nZVwiOiAxMDAsXG4gIFwiY2hhc3Npc0RlbnNpdHlSYW5nZVwiOiAzMDAsXG4gIFwiY2hhc3Npc01pbkRlbnNpdHlcIjogMzAsXG4gIFwiY2hhc3Npc01pbkF4aXNcIjogMC4xLFxuICBcImNoYXNzaXNBeGlzUmFuZ2VcIjogMS4xXG59XG4iLCJ2YXIgY2FyQ29uc3RhbnRzID0gcmVxdWlyZShcIi4vY2FyLWNvbnN0YW50cy5qc29uXCIpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgd29ybGREZWY6IHdvcmxkRGVmLFxuICBjYXJDb25zdGFudHM6IGdldENhckNvbnN0YW50cyxcbiAgZ2VuZXJhdGVTY2hlbWE6IGdlbmVyYXRlU2NoZW1hXG59XG5cbmZ1bmN0aW9uIHdvcmxkRGVmKCl7XG4gIHZhciBib3gyZGZwcyA9IDYwO1xuICByZXR1cm4ge1xuICAgIGdyYXZpdHk6IHsgeTogMCB9LFxuICAgIGRvU2xlZXA6IHRydWUsXG4gICAgZmxvb3JzZWVkOiBcImFiY1wiLFxuICAgIG1heEZsb29yVGlsZXM6IDIwMCxcbiAgICBtdXRhYmxlX2Zsb29yOiBmYWxzZSxcbiAgICBtb3RvclNwZWVkOiAyMCxcbiAgICBib3gyZGZwczogYm94MmRmcHMsXG4gICAgbWF4X2Nhcl9oZWFsdGg6IGJveDJkZnBzICogMTAsXG4gICAgdGlsZURpbWVuc2lvbnM6IHtcbiAgICAgIHdpZHRoOiAxLjUsXG4gICAgICBoZWlnaHQ6IDAuMTVcbiAgICB9XG4gIH07XG59XG5cbmZ1bmN0aW9uIGdldENhckNvbnN0YW50cygpe1xuICByZXR1cm4gY2FyQ29uc3RhbnRzO1xufVxuXG5mdW5jdGlvbiBnZW5lcmF0ZVNjaGVtYSh2YWx1ZXMpe1xuICByZXR1cm4ge1xuICAgIHdoZWVsX3JhZGl1czoge1xuICAgICAgdHlwZTogXCJmbG9hdFwiLFxuICAgICAgbGVuZ3RoOiB2YWx1ZXMud2hlZWxDb3VudCxcbiAgICAgIG1pbjogdmFsdWVzLndoZWVsTWluUmFkaXVzLFxuICAgICAgcmFuZ2U6IHZhbHVlcy53aGVlbFJhZGl1c1JhbmdlLFxuICAgICAgZmFjdG9yOiAxLFxuICAgIH0sXG4gICAgd2hlZWxfZGVuc2l0eToge1xuICAgICAgdHlwZTogXCJmbG9hdFwiLFxuICAgICAgbGVuZ3RoOiB2YWx1ZXMud2hlZWxDb3VudCxcbiAgICAgIG1pbjogdmFsdWVzLndoZWVsTWluRGVuc2l0eSxcbiAgICAgIHJhbmdlOiB2YWx1ZXMud2hlZWxEZW5zaXR5UmFuZ2UsXG4gICAgICBmYWN0b3I6IDEsXG4gICAgfSxcbiAgICBjaGFzc2lzX2RlbnNpdHk6IHtcbiAgICAgIHR5cGU6IFwiZmxvYXRcIixcbiAgICAgIGxlbmd0aDogMSxcbiAgICAgIG1pbjogdmFsdWVzLmNoYXNzaXNEZW5zaXR5UmFuZ2UsXG4gICAgICByYW5nZTogdmFsdWVzLmNoYXNzaXNNaW5EZW5zaXR5LFxuICAgICAgZmFjdG9yOiAxLFxuICAgIH0sXG4gICAgdmVydGV4X2xpc3Q6IHtcbiAgICAgIHR5cGU6IFwiZmxvYXRcIixcbiAgICAgIGxlbmd0aDogMTIsXG4gICAgICBtaW46IHZhbHVlcy5jaGFzc2lzTWluQXhpcyxcbiAgICAgIHJhbmdlOiB2YWx1ZXMuY2hhc3Npc0F4aXNSYW5nZSxcbiAgICAgIGZhY3RvcjogMSxcbiAgICB9LFxuICAgIHdoZWVsX3ZlcnRleDoge1xuICAgICAgdHlwZTogXCJzaHVmZmxlXCIsXG4gICAgICBsZW5ndGg6IDgsXG4gICAgICBsaW1pdDogdmFsdWVzLndoZWVsQ291bnQsXG4gICAgICBmYWN0b3I6IDEsXG4gICAgfSxcbiAgfTtcbn1cbiIsIi8qXG4gIGdsb2JhbHMgYjJSZXZvbHV0ZUpvaW50RGVmIGIyVmVjMiBiMkJvZHlEZWYgYjJCb2R5IGIyRml4dHVyZURlZiBiMlBvbHlnb25TaGFwZSBiMkNpcmNsZVNoYXBlXG4qL1xuXG52YXIgY3JlYXRlSW5zdGFuY2UgPSByZXF1aXJlKFwiLi4vbWFjaGluZS1sZWFybmluZy9jcmVhdGUtaW5zdGFuY2VcIik7XG5cbm1vZHVsZS5leHBvcnRzID0gZGVmVG9DYXI7XG5cbmZ1bmN0aW9uIGRlZlRvQ2FyKG5vcm1hbF9kZWYsIHdvcmxkLCBjb25zdGFudHMpe1xuICB2YXIgY2FyX2RlZiA9IGNyZWF0ZUluc3RhbmNlLmFwcGx5VHlwZXMoY29uc3RhbnRzLnNjaGVtYSwgbm9ybWFsX2RlZilcbiAgdmFyIGluc3RhbmNlID0ge307XG4gIGluc3RhbmNlLmNoYXNzaXMgPSBjcmVhdGVDaGFzc2lzKFxuICAgIHdvcmxkLCBjYXJfZGVmLnZlcnRleF9saXN0LCBjYXJfZGVmLmNoYXNzaXNfZGVuc2l0eVxuICApO1xuICB2YXIgaTtcblxuICB2YXIgd2hlZWxDb3VudCA9IGNhcl9kZWYud2hlZWxfcmFkaXVzLmxlbmd0aDtcblxuICBpbnN0YW5jZS53aGVlbHMgPSBbXTtcbiAgZm9yIChpID0gMDsgaSA8IHdoZWVsQ291bnQ7IGkrKykge1xuICAgIGluc3RhbmNlLndoZWVsc1tpXSA9IGNyZWF0ZVdoZWVsKFxuICAgICAgd29ybGQsXG4gICAgICBjYXJfZGVmLndoZWVsX3JhZGl1c1tpXSxcbiAgICAgIGNhcl9kZWYud2hlZWxfZGVuc2l0eVtpXVxuICAgICk7XG4gIH1cblxuICB2YXIgY2FybWFzcyA9IGluc3RhbmNlLmNoYXNzaXMuR2V0TWFzcygpO1xuICBmb3IgKGkgPSAwOyBpIDwgd2hlZWxDb3VudDsgaSsrKSB7XG4gICAgY2FybWFzcyArPSBpbnN0YW5jZS53aGVlbHNbaV0uR2V0TWFzcygpO1xuICB9XG5cbiAgdmFyIGpvaW50X2RlZiA9IG5ldyBiMlJldm9sdXRlSm9pbnREZWYoKTtcblxuICBmb3IgKGkgPSAwOyBpIDwgd2hlZWxDb3VudDsgaSsrKSB7XG4gICAgdmFyIHRvcnF1ZSA9IGNhcm1hc3MgKiAtY29uc3RhbnRzLmdyYXZpdHkueSAvIGNhcl9kZWYud2hlZWxfcmFkaXVzW2ldO1xuXG4gICAgdmFyIHJhbmR2ZXJ0ZXggPSBpbnN0YW5jZS5jaGFzc2lzLnZlcnRleF9saXN0W2Nhcl9kZWYud2hlZWxfdmVydGV4W2ldXTtcbiAgICBqb2ludF9kZWYubG9jYWxBbmNob3JBLlNldChyYW5kdmVydGV4LngsIHJhbmR2ZXJ0ZXgueSk7XG4gICAgam9pbnRfZGVmLmxvY2FsQW5jaG9yQi5TZXQoMCwgMCk7XG4gICAgam9pbnRfZGVmLm1heE1vdG9yVG9ycXVlID0gdG9ycXVlO1xuICAgIGpvaW50X2RlZi5tb3RvclNwZWVkID0gLWNvbnN0YW50cy5tb3RvclNwZWVkO1xuICAgIGpvaW50X2RlZi5lbmFibGVNb3RvciA9IHRydWU7XG4gICAgam9pbnRfZGVmLmJvZHlBID0gaW5zdGFuY2UuY2hhc3NpcztcbiAgICBqb2ludF9kZWYuYm9keUIgPSBpbnN0YW5jZS53aGVlbHNbaV07XG4gICAgd29ybGQuQ3JlYXRlSm9pbnQoam9pbnRfZGVmKTtcbiAgfVxuXG4gIHJldHVybiBpbnN0YW5jZTtcbn1cblxuZnVuY3Rpb24gY3JlYXRlQ2hhc3Npcyh3b3JsZCwgdmVydGV4cywgZGVuc2l0eSkge1xuXG4gIHZhciB2ZXJ0ZXhfbGlzdCA9IG5ldyBBcnJheSgpO1xuICB2ZXJ0ZXhfbGlzdC5wdXNoKG5ldyBiMlZlYzIodmVydGV4c1swXSwgMCkpO1xuICB2ZXJ0ZXhfbGlzdC5wdXNoKG5ldyBiMlZlYzIodmVydGV4c1sxXSwgdmVydGV4c1syXSkpO1xuICB2ZXJ0ZXhfbGlzdC5wdXNoKG5ldyBiMlZlYzIoMCwgdmVydGV4c1szXSkpO1xuICB2ZXJ0ZXhfbGlzdC5wdXNoKG5ldyBiMlZlYzIoLXZlcnRleHNbNF0sIHZlcnRleHNbNV0pKTtcbiAgdmVydGV4X2xpc3QucHVzaChuZXcgYjJWZWMyKC12ZXJ0ZXhzWzZdLCAwKSk7XG4gIHZlcnRleF9saXN0LnB1c2gobmV3IGIyVmVjMigtdmVydGV4c1s3XSwgLXZlcnRleHNbOF0pKTtcbiAgdmVydGV4X2xpc3QucHVzaChuZXcgYjJWZWMyKDAsIC12ZXJ0ZXhzWzldKSk7XG4gIHZlcnRleF9saXN0LnB1c2gobmV3IGIyVmVjMih2ZXJ0ZXhzWzEwXSwgLXZlcnRleHNbMTFdKSk7XG5cbiAgdmFyIGJvZHlfZGVmID0gbmV3IGIyQm9keURlZigpO1xuICBib2R5X2RlZi50eXBlID0gYjJCb2R5LmIyX2R5bmFtaWNCb2R5O1xuICBib2R5X2RlZi5wb3NpdGlvbi5TZXQoMC4wLCA0LjApO1xuXG4gIHZhciBib2R5ID0gd29ybGQuQ3JlYXRlQm9keShib2R5X2RlZik7XG5cbiAgY3JlYXRlQ2hhc3Npc1BhcnQoYm9keSwgdmVydGV4X2xpc3RbMF0sIHZlcnRleF9saXN0WzFdLCBkZW5zaXR5KTtcbiAgY3JlYXRlQ2hhc3Npc1BhcnQoYm9keSwgdmVydGV4X2xpc3RbMV0sIHZlcnRleF9saXN0WzJdLCBkZW5zaXR5KTtcbiAgY3JlYXRlQ2hhc3Npc1BhcnQoYm9keSwgdmVydGV4X2xpc3RbMl0sIHZlcnRleF9saXN0WzNdLCBkZW5zaXR5KTtcbiAgY3JlYXRlQ2hhc3Npc1BhcnQoYm9keSwgdmVydGV4X2xpc3RbM10sIHZlcnRleF9saXN0WzRdLCBkZW5zaXR5KTtcbiAgY3JlYXRlQ2hhc3Npc1BhcnQoYm9keSwgdmVydGV4X2xpc3RbNF0sIHZlcnRleF9saXN0WzVdLCBkZW5zaXR5KTtcbiAgY3JlYXRlQ2hhc3Npc1BhcnQoYm9keSwgdmVydGV4X2xpc3RbNV0sIHZlcnRleF9saXN0WzZdLCBkZW5zaXR5KTtcbiAgY3JlYXRlQ2hhc3Npc1BhcnQoYm9keSwgdmVydGV4X2xpc3RbNl0sIHZlcnRleF9saXN0WzddLCBkZW5zaXR5KTtcbiAgY3JlYXRlQ2hhc3Npc1BhcnQoYm9keSwgdmVydGV4X2xpc3RbN10sIHZlcnRleF9saXN0WzBdLCBkZW5zaXR5KTtcblxuICBib2R5LnZlcnRleF9saXN0ID0gdmVydGV4X2xpc3Q7XG5cbiAgcmV0dXJuIGJvZHk7XG59XG5cblxuZnVuY3Rpb24gY3JlYXRlQ2hhc3Npc1BhcnQoYm9keSwgdmVydGV4MSwgdmVydGV4MiwgZGVuc2l0eSkge1xuICB2YXIgdmVydGV4X2xpc3QgPSBuZXcgQXJyYXkoKTtcbiAgdmVydGV4X2xpc3QucHVzaCh2ZXJ0ZXgxKTtcbiAgdmVydGV4X2xpc3QucHVzaCh2ZXJ0ZXgyKTtcbiAgdmVydGV4X2xpc3QucHVzaChiMlZlYzIuTWFrZSgwLCAwKSk7XG4gIHZhciBmaXhfZGVmID0gbmV3IGIyRml4dHVyZURlZigpO1xuICBmaXhfZGVmLnNoYXBlID0gbmV3IGIyUG9seWdvblNoYXBlKCk7XG4gIGZpeF9kZWYuZGVuc2l0eSA9IGRlbnNpdHk7XG4gIGZpeF9kZWYuZnJpY3Rpb24gPSAxMDtcbiAgZml4X2RlZi5yZXN0aXR1dGlvbiA9IDAuMjtcbiAgZml4X2RlZi5maWx0ZXIuZ3JvdXBJbmRleCA9IC0xO1xuICBmaXhfZGVmLnNoYXBlLlNldEFzQXJyYXkodmVydGV4X2xpc3QsIDMpO1xuXG4gIGJvZHkuQ3JlYXRlRml4dHVyZShmaXhfZGVmKTtcbn1cblxuZnVuY3Rpb24gY3JlYXRlV2hlZWwod29ybGQsIHJhZGl1cywgZGVuc2l0eSkge1xuICB2YXIgYm9keV9kZWYgPSBuZXcgYjJCb2R5RGVmKCk7XG4gIGJvZHlfZGVmLnR5cGUgPSBiMkJvZHkuYjJfZHluYW1pY0JvZHk7XG4gIGJvZHlfZGVmLnBvc2l0aW9uLlNldCgwLCAwKTtcblxuICB2YXIgYm9keSA9IHdvcmxkLkNyZWF0ZUJvZHkoYm9keV9kZWYpO1xuXG4gIHZhciBmaXhfZGVmID0gbmV3IGIyRml4dHVyZURlZigpO1xuICBmaXhfZGVmLnNoYXBlID0gbmV3IGIyQ2lyY2xlU2hhcGUocmFkaXVzKTtcbiAgZml4X2RlZi5kZW5zaXR5ID0gZGVuc2l0eTtcbiAgZml4X2RlZi5mcmljdGlvbiA9IDE7XG4gIGZpeF9kZWYucmVzdGl0dXRpb24gPSAwLjI7XG4gIGZpeF9kZWYuZmlsdGVyLmdyb3VwSW5kZXggPSAtMTtcblxuICBib2R5LkNyZWF0ZUZpeHR1cmUoZml4X2RlZik7XG4gIHJldHVybiBib2R5O1xufVxuIiwiXG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBnZXRJbml0aWFsU3RhdGU6IGdldEluaXRpYWxTdGF0ZSxcbiAgdXBkYXRlU3RhdGU6IHVwZGF0ZVN0YXRlLFxuICBnZXRTdGF0dXM6IGdldFN0YXR1cyxcbiAgY2FsY3VsYXRlU2NvcmU6IGNhbGN1bGF0ZVNjb3JlLFxufTtcblxuZnVuY3Rpb24gZ2V0SW5pdGlhbFN0YXRlKHdvcmxkX2RlZil7XG4gIHJldHVybiB7XG4gICAgZnJhbWVzOiAwLFxuICAgIGhlYWx0aDogd29ybGRfZGVmLm1heF9jYXJfaGVhbHRoLFxuICAgIG1heFBvc2l0aW9ueTogMCxcbiAgICBtaW5Qb3NpdGlvbnk6IDAsXG4gICAgbWF4UG9zaXRpb254OiAwLFxuICB9O1xufVxuXG5mdW5jdGlvbiB1cGRhdGVTdGF0ZShjb25zdGFudHMsIHdvcmxkQ29uc3RydWN0LCBzdGF0ZSl7XG4gIGlmKHN0YXRlLmhlYWx0aCA8PSAwKXtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJBbHJlYWR5IERlYWRcIik7XG4gIH1cbiAgaWYoc3RhdGUubWF4UG9zaXRpb254ID4gY29uc3RhbnRzLmZpbmlzaExpbmUpe1xuICAgIHRocm93IG5ldyBFcnJvcihcImFscmVhZHkgRmluaXNoZWRcIik7XG4gIH1cblxuICAvLyBjb25zb2xlLmxvZyhzdGF0ZSk7XG4gIC8vIGNoZWNrIGhlYWx0aFxuICB2YXIgcG9zaXRpb24gPSB3b3JsZENvbnN0cnVjdC5jaGFzc2lzLkdldFBvc2l0aW9uKCk7XG4gIC8vIGNoZWNrIGlmIGNhciByZWFjaGVkIGVuZCBvZiB0aGUgcGF0aFxuICB2YXIgbmV4dFN0YXRlID0ge1xuICAgIGZyYW1lczogc3RhdGUuZnJhbWVzICsgMSxcbiAgICBtYXhQb3NpdGlvbng6IHBvc2l0aW9uLnggPiBzdGF0ZS5tYXhQb3NpdGlvbnggPyBwb3NpdGlvbi54IDogc3RhdGUubWF4UG9zaXRpb254LFxuICAgIG1heFBvc2l0aW9ueTogcG9zaXRpb24ueSA+IHN0YXRlLm1heFBvc2l0aW9ueSA/IHBvc2l0aW9uLnkgOiBzdGF0ZS5tYXhQb3NpdGlvbnksXG4gICAgbWluUG9zaXRpb255OiBwb3NpdGlvbi55IDwgc3RhdGUubWluUG9zaXRpb255ID8gcG9zaXRpb24ueSA6IHN0YXRlLm1pblBvc2l0aW9ueVxuICB9O1xuXG4gIGlmIChwb3NpdGlvbi54ID4gY29uc3RhbnRzLmZpbmlzaExpbmUpIHtcbiAgICByZXR1cm4gbmV4dFN0YXRlO1xuICB9XG5cbiAgaWYgKHBvc2l0aW9uLnggPiBzdGF0ZS5tYXhQb3NpdGlvbnggKyAwLjAyKSB7XG4gICAgbmV4dFN0YXRlLmhlYWx0aCA9IGNvbnN0YW50cy5tYXhfY2FyX2hlYWx0aDtcbiAgICByZXR1cm4gbmV4dFN0YXRlO1xuICB9XG4gIG5leHRTdGF0ZS5oZWFsdGggPSBzdGF0ZS5oZWFsdGggLSAxO1xuICBpZiAoTWF0aC5hYnMod29ybGRDb25zdHJ1Y3QuY2hhc3Npcy5HZXRMaW5lYXJWZWxvY2l0eSgpLngpIDwgMC4wMDEpIHtcbiAgICBuZXh0U3RhdGUuaGVhbHRoIC09IDU7XG4gIH1cbiAgcmV0dXJuIG5leHRTdGF0ZTtcbn1cblxuZnVuY3Rpb24gZ2V0U3RhdHVzKHN0YXRlLCBjb25zdGFudHMpe1xuICBpZihoYXNGYWlsZWQoc3RhdGUsIGNvbnN0YW50cykpIHJldHVybiAtMTtcbiAgaWYoaGFzU3VjY2VzcyhzdGF0ZSwgY29uc3RhbnRzKSkgcmV0dXJuIDE7XG4gIHJldHVybiAwO1xufVxuXG5mdW5jdGlvbiBoYXNGYWlsZWQoc3RhdGUgLyosIGNvbnN0YW50cyAqLyl7XG4gIHJldHVybiBzdGF0ZS5oZWFsdGggPD0gMDtcbn1cbmZ1bmN0aW9uIGhhc1N1Y2Nlc3Moc3RhdGUsIGNvbnN0YW50cyl7XG4gIHJldHVybiBzdGF0ZS5tYXhQb3NpdGlvbnggPiBjb25zdGFudHMuZmluaXNoTGluZTtcbn1cblxuZnVuY3Rpb24gY2FsY3VsYXRlU2NvcmUoc3RhdGUsIGNvbnN0YW50cyl7XG4gIHZhciBhdmdzcGVlZCA9IChzdGF0ZS5tYXhQb3NpdGlvbnggLyBzdGF0ZS5mcmFtZXMpICogY29uc3RhbnRzLmJveDJkZnBzO1xuICB2YXIgcG9zaXRpb24gPSBzdGF0ZS5tYXhQb3NpdGlvbng7XG4gIHZhciBzY29yZSA9IHBvc2l0aW9uICsgYXZnc3BlZWQ7XG4gIHJldHVybiB7XG4gICAgdjogc2NvcmUsXG4gICAgczogYXZnc3BlZWQsXG4gICAgeDogcG9zaXRpb24sXG4gICAgeTogc3RhdGUubWF4UG9zaXRpb255LFxuICAgIHkyOiBzdGF0ZS5taW5Qb3NpdGlvbnlcbiAgfVxufVxuIiwidmFyIHNjYXR0ZXJQbG90ID0gcmVxdWlyZShcIi4vc2NhdHRlci1wbG90XCIpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgcGxvdEdyYXBoczogZnVuY3Rpb24oZ3JhcGhFbGVtLCB0b3BTY29yZXNFbGVtLCBzY2F0dGVyUGxvdEVsZW0sIGxhc3RTdGF0ZSwgc2NvcmVzLCBjb25maWcpIHtcbiAgICBsYXN0U3RhdGUgPSBsYXN0U3RhdGUgfHwge307XG4gICAgdmFyIGdlbmVyYXRpb25TaXplID0gc2NvcmVzLmxlbmd0aFxuICAgIHZhciBncmFwaGNhbnZhcyA9IGdyYXBoRWxlbTtcbiAgICB2YXIgZ3JhcGhjdHggPSBncmFwaGNhbnZhcy5nZXRDb250ZXh0KFwiMmRcIik7XG4gICAgdmFyIGdyYXBod2lkdGggPSA0MDA7XG4gICAgdmFyIGdyYXBoaGVpZ2h0ID0gMjUwO1xuICAgIHZhciBuZXh0U3RhdGUgPSBjd19zdG9yZUdyYXBoU2NvcmVzKFxuICAgICAgbGFzdFN0YXRlLCBzY29yZXMsIGdlbmVyYXRpb25TaXplXG4gICAgKTtcbiAgICBjb25zb2xlLmxvZyhzY29yZXMsIG5leHRTdGF0ZSk7XG4gICAgY3dfY2xlYXJHcmFwaGljcyhncmFwaGNhbnZhcywgZ3JhcGhjdHgsIGdyYXBod2lkdGgsIGdyYXBoaGVpZ2h0KTtcbiAgICBjd19wbG90QXZlcmFnZShuZXh0U3RhdGUsIGdyYXBoY3R4KTtcbiAgICBjd19wbG90RWxpdGUobmV4dFN0YXRlLCBncmFwaGN0eCk7XG4gICAgY3dfcGxvdFRvcChuZXh0U3RhdGUsIGdyYXBoY3R4KTtcbiAgICBjd19saXN0VG9wU2NvcmVzKHRvcFNjb3Jlc0VsZW0sIG5leHRTdGF0ZSk7XG4gICAgbmV4dFN0YXRlLnNjYXR0ZXJHcmFwaCA9IGRyYXdBbGxSZXN1bHRzKFxuICAgICAgc2NhdHRlclBsb3RFbGVtLCBjb25maWcsIG5leHRTdGF0ZSwgbGFzdFN0YXRlLnNjYXR0ZXJHcmFwaFxuICAgICk7XG4gICAgcmV0dXJuIG5leHRTdGF0ZTtcbiAgfSxcbiAgY2xlYXJHcmFwaGljczogZnVuY3Rpb24oZ3JhcGhFbGVtKSB7XG4gICAgdmFyIGdyYXBoY2FudmFzID0gZ3JhcGhFbGVtO1xuICAgIHZhciBncmFwaGN0eCA9IGdyYXBoY2FudmFzLmdldENvbnRleHQoXCIyZFwiKTtcbiAgICB2YXIgZ3JhcGh3aWR0aCA9IDQwMDtcbiAgICB2YXIgZ3JhcGhoZWlnaHQgPSAyNTA7XG4gICAgY3dfY2xlYXJHcmFwaGljcyhncmFwaGNhbnZhcywgZ3JhcGhjdHgsIGdyYXBod2lkdGgsIGdyYXBoaGVpZ2h0KTtcbiAgfVxufTtcblxuXG5mdW5jdGlvbiBjd19zdG9yZUdyYXBoU2NvcmVzKGxhc3RTdGF0ZSwgY3dfY2FyU2NvcmVzLCBnZW5lcmF0aW9uU2l6ZSkge1xuICBjb25zb2xlLmxvZyhjd19jYXJTY29yZXMpO1xuICByZXR1cm4ge1xuICAgIGN3X3RvcFNjb3JlczogKGxhc3RTdGF0ZS5jd190b3BTY29yZXMgfHwgW10pXG4gICAgLmNvbmNhdChbY3dfY2FyU2NvcmVzWzBdLnNjb3JlXSksXG4gICAgY3dfZ3JhcGhBdmVyYWdlOiAobGFzdFN0YXRlLmN3X2dyYXBoQXZlcmFnZSB8fCBbXSkuY29uY2F0KFtcbiAgICAgIGN3X2F2ZXJhZ2UoY3dfY2FyU2NvcmVzLCBnZW5lcmF0aW9uU2l6ZSlcbiAgICBdKSxcbiAgICBjd19ncmFwaEVsaXRlOiAobGFzdFN0YXRlLmN3X2dyYXBoRWxpdGUgfHwgW10pLmNvbmNhdChbXG4gICAgICBjd19lbGl0ZWF2ZXJhZ2UoY3dfY2FyU2NvcmVzLCBnZW5lcmF0aW9uU2l6ZSlcbiAgICBdKSxcbiAgICBjd19ncmFwaFRvcDogKGxhc3RTdGF0ZS5jd19ncmFwaFRvcCB8fCBbXSkuY29uY2F0KFtcbiAgICAgIGN3X2NhclNjb3Jlc1swXS5zY29yZS52XG4gICAgXSksXG4gICAgYWxsUmVzdWx0czogKGxhc3RTdGF0ZS5hbGxSZXN1bHRzIHx8IFtdKS5jb25jYXQoY3dfY2FyU2NvcmVzKSxcbiAgfVxufVxuXG5mdW5jdGlvbiBjd19wbG90VG9wKHN0YXRlLCBncmFwaGN0eCkge1xuICB2YXIgY3dfZ3JhcGhUb3AgPSBzdGF0ZS5jd19ncmFwaFRvcDtcbiAgdmFyIGdyYXBoc2l6ZSA9IGN3X2dyYXBoVG9wLmxlbmd0aDtcbiAgZ3JhcGhjdHguc3Ryb2tlU3R5bGUgPSBcIiNDODNCM0JcIjtcbiAgZ3JhcGhjdHguYmVnaW5QYXRoKCk7XG4gIGdyYXBoY3R4Lm1vdmVUbygwLCAwKTtcbiAgZm9yICh2YXIgayA9IDA7IGsgPCBncmFwaHNpemU7IGsrKykge1xuICAgIGdyYXBoY3R4LmxpbmVUbyg0MDAgKiAoayArIDEpIC8gZ3JhcGhzaXplLCBjd19ncmFwaFRvcFtrXSk7XG4gIH1cbiAgZ3JhcGhjdHguc3Ryb2tlKCk7XG59XG5cbmZ1bmN0aW9uIGN3X3Bsb3RFbGl0ZShzdGF0ZSwgZ3JhcGhjdHgpIHtcbiAgdmFyIGN3X2dyYXBoRWxpdGUgPSBzdGF0ZS5jd19ncmFwaEVsaXRlO1xuICB2YXIgZ3JhcGhzaXplID0gY3dfZ3JhcGhFbGl0ZS5sZW5ndGg7XG4gIGdyYXBoY3R4LnN0cm9rZVN0eWxlID0gXCIjN0JDNzREXCI7XG4gIGdyYXBoY3R4LmJlZ2luUGF0aCgpO1xuICBncmFwaGN0eC5tb3ZlVG8oMCwgMCk7XG4gIGZvciAodmFyIGsgPSAwOyBrIDwgZ3JhcGhzaXplOyBrKyspIHtcbiAgICBncmFwaGN0eC5saW5lVG8oNDAwICogKGsgKyAxKSAvIGdyYXBoc2l6ZSwgY3dfZ3JhcGhFbGl0ZVtrXSk7XG4gIH1cbiAgZ3JhcGhjdHguc3Ryb2tlKCk7XG59XG5cbmZ1bmN0aW9uIGN3X3Bsb3RBdmVyYWdlKHN0YXRlLCBncmFwaGN0eCkge1xuICB2YXIgY3dfZ3JhcGhBdmVyYWdlID0gc3RhdGUuY3dfZ3JhcGhBdmVyYWdlO1xuICB2YXIgZ3JhcGhzaXplID0gY3dfZ3JhcGhBdmVyYWdlLmxlbmd0aDtcbiAgZ3JhcGhjdHguc3Ryb2tlU3R5bGUgPSBcIiMzRjcyQUZcIjtcbiAgZ3JhcGhjdHguYmVnaW5QYXRoKCk7XG4gIGdyYXBoY3R4Lm1vdmVUbygwLCAwKTtcbiAgZm9yICh2YXIgayA9IDA7IGsgPCBncmFwaHNpemU7IGsrKykge1xuICAgIGdyYXBoY3R4LmxpbmVUbyg0MDAgKiAoayArIDEpIC8gZ3JhcGhzaXplLCBjd19ncmFwaEF2ZXJhZ2Vba10pO1xuICB9XG4gIGdyYXBoY3R4LnN0cm9rZSgpO1xufVxuXG5cbmZ1bmN0aW9uIGN3X2VsaXRlYXZlcmFnZShzY29yZXMsIGdlbmVyYXRpb25TaXplKSB7XG4gIHZhciBzdW0gPSAwO1xuICBmb3IgKHZhciBrID0gMDsgayA8IE1hdGguZmxvb3IoZ2VuZXJhdGlvblNpemUgLyAyKTsgaysrKSB7XG4gICAgc3VtICs9IHNjb3Jlc1trXS5zY29yZS52O1xuICB9XG4gIHJldHVybiBzdW0gLyBNYXRoLmZsb29yKGdlbmVyYXRpb25TaXplIC8gMik7XG59XG5cbmZ1bmN0aW9uIGN3X2F2ZXJhZ2Uoc2NvcmVzLCBnZW5lcmF0aW9uU2l6ZSkge1xuICB2YXIgc3VtID0gMDtcbiAgZm9yICh2YXIgayA9IDA7IGsgPCBnZW5lcmF0aW9uU2l6ZTsgaysrKSB7XG4gICAgc3VtICs9IHNjb3Jlc1trXS5zY29yZS52O1xuICB9XG4gIHJldHVybiBzdW0gLyBnZW5lcmF0aW9uU2l6ZTtcbn1cblxuZnVuY3Rpb24gY3dfY2xlYXJHcmFwaGljcyhncmFwaGNhbnZhcywgZ3JhcGhjdHgsIGdyYXBod2lkdGgsIGdyYXBoaGVpZ2h0KSB7XG4gIGdyYXBoY2FudmFzLndpZHRoID0gZ3JhcGhjYW52YXMud2lkdGg7XG4gIGdyYXBoY3R4LnRyYW5zbGF0ZSgwLCBncmFwaGhlaWdodCk7XG4gIGdyYXBoY3R4LnNjYWxlKDEsIC0xKTtcbiAgZ3JhcGhjdHgubGluZVdpZHRoID0gMTtcbiAgZ3JhcGhjdHguc3Ryb2tlU3R5bGUgPSBcIiMzRjcyQUZcIjtcbiAgZ3JhcGhjdHguYmVnaW5QYXRoKCk7XG4gIGdyYXBoY3R4Lm1vdmVUbygwLCBncmFwaGhlaWdodCAvIDIpO1xuICBncmFwaGN0eC5saW5lVG8oZ3JhcGh3aWR0aCwgZ3JhcGhoZWlnaHQgLyAyKTtcbiAgZ3JhcGhjdHgubW92ZVRvKDAsIGdyYXBoaGVpZ2h0IC8gNCk7XG4gIGdyYXBoY3R4LmxpbmVUbyhncmFwaHdpZHRoLCBncmFwaGhlaWdodCAvIDQpO1xuICBncmFwaGN0eC5tb3ZlVG8oMCwgZ3JhcGhoZWlnaHQgKiAzIC8gNCk7XG4gIGdyYXBoY3R4LmxpbmVUbyhncmFwaHdpZHRoLCBncmFwaGhlaWdodCAqIDMgLyA0KTtcbiAgZ3JhcGhjdHguc3Ryb2tlKCk7XG59XG5cbmZ1bmN0aW9uIGN3X2xpc3RUb3BTY29yZXMoZWxlbSwgc3RhdGUpIHtcbiAgdmFyIGN3X3RvcFNjb3JlcyA9IHN0YXRlLmN3X3RvcFNjb3JlcztcbiAgdmFyIHRzID0gZWxlbTtcbiAgdHMuaW5uZXJIVE1MID0gXCI8Yj5Ub3AgU2NvcmVzOjwvYj48YnIgLz5cIjtcbiAgY3dfdG9wU2NvcmVzLnNvcnQoZnVuY3Rpb24gKGEsIGIpIHtcbiAgICBpZiAoYS52ID4gYi52KSB7XG4gICAgICByZXR1cm4gLTFcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIDFcbiAgICB9XG4gIH0pO1xuXG4gIGZvciAodmFyIGsgPSAwOyBrIDwgTWF0aC5taW4oMTAsIGN3X3RvcFNjb3Jlcy5sZW5ndGgpOyBrKyspIHtcbiAgICB2YXIgdG9wU2NvcmUgPSBjd190b3BTY29yZXNba107XG4gICAgLy8gY29uc29sZS5sb2codG9wU2NvcmUpO1xuICAgIHZhciBuID0gXCIjXCIgKyAoayArIDEpICsgXCI6XCI7XG4gICAgdmFyIHNjb3JlID0gTWF0aC5yb3VuZCh0b3BTY29yZS52ICogMTAwKSAvIDEwMDtcbiAgICB2YXIgZGlzdGFuY2UgPSBcImQ6XCIgKyBNYXRoLnJvdW5kKHRvcFNjb3JlLnggKiAxMDApIC8gMTAwO1xuICAgIHZhciB5cmFuZ2UgPSAgXCJoOlwiICsgTWF0aC5yb3VuZCh0b3BTY29yZS55MiAqIDEwMCkgLyAxMDAgKyBcIi9cIiArIE1hdGgucm91bmQodG9wU2NvcmUueSAqIDEwMCkgLyAxMDAgKyBcIm1cIjtcbiAgICB2YXIgZ2VuID0gXCIoR2VuIFwiICsgY3dfdG9wU2NvcmVzW2tdLmkgKyBcIilcIlxuXG4gICAgdHMuaW5uZXJIVE1MICs9ICBbbiwgc2NvcmUsIGRpc3RhbmNlLCB5cmFuZ2UsIGdlbl0uam9pbihcIiBcIikgKyBcIjxiciAvPlwiO1xuICB9XG59XG5cbmZ1bmN0aW9uIGRyYXdBbGxSZXN1bHRzKHNjYXR0ZXJQbG90RWxlbSwgY29uZmlnLCBhbGxSZXN1bHRzLCBwcmV2aW91c0dyYXBoKXtcbiAgaWYoIXNjYXR0ZXJQbG90RWxlbSkgcmV0dXJuO1xuICByZXR1cm4gc2NhdHRlclBsb3Qoc2NhdHRlclBsb3RFbGVtLCBhbGxSZXN1bHRzLCBjb25maWcucHJvcGVydHlNYXAsIHByZXZpb3VzR3JhcGgpXG59XG4iLCIvKiBnbG9iYWxzIHZpcyBIaWdoY2hhcnRzICovXG5cbi8vIENhbGxlZCB3aGVuIHRoZSBWaXN1YWxpemF0aW9uIEFQSSBpcyBsb2FkZWQuXG5cbm1vZHVsZS5leHBvcnRzID0gaGlnaENoYXJ0cztcbmZ1bmN0aW9uIGhpZ2hDaGFydHMoZWxlbSwgc2NvcmVzKXtcbiAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyhzY29yZXNbMF0uZGVmKTtcbiAga2V5cyA9IGtleXMucmVkdWNlKGZ1bmN0aW9uKGN1ckFycmF5LCBrZXkpe1xuICAgIHZhciBsID0gc2NvcmVzWzBdLmRlZltrZXldLmxlbmd0aDtcbiAgICB2YXIgc3ViQXJyYXkgPSBbXTtcbiAgICBmb3IodmFyIGkgPSAwOyBpIDwgbDsgaSsrKXtcbiAgICAgIHN1YkFycmF5LnB1c2goa2V5ICsgXCIuXCIgKyBpKTtcbiAgICB9XG4gICAgcmV0dXJuIGN1ckFycmF5LmNvbmNhdChzdWJBcnJheSk7XG4gIH0sIFtdKTtcbiAgZnVuY3Rpb24gcmV0cmlldmVWYWx1ZShvYmosIHBhdGgpe1xuICAgIHJldHVybiBwYXRoLnNwbGl0KFwiLlwiKS5yZWR1Y2UoZnVuY3Rpb24oY3VyVmFsdWUsIGtleSl7XG4gICAgICByZXR1cm4gY3VyVmFsdWVba2V5XTtcbiAgICB9LCBvYmopO1xuICB9XG5cbiAgdmFyIGRhdGFPYmogPSBPYmplY3Qua2V5cyhzY29yZXMpLnJlZHVjZShmdW5jdGlvbihrdiwgc2NvcmUpe1xuICAgIGtleXMuZm9yRWFjaChmdW5jdGlvbihrZXkpe1xuICAgICAga3Zba2V5XS5kYXRhLnB1c2goW1xuICAgICAgICByZXRyaWV2ZVZhbHVlKHNjb3JlLmRlZiwga2V5KSwgc2NvcmUuc2NvcmUudlxuICAgICAgXSlcbiAgICB9KVxuICAgIHJldHVybiBrdjtcbiAgfSwga2V5cy5yZWR1Y2UoZnVuY3Rpb24oa3YsIGtleSl7XG4gICAga3Zba2V5XSA9IHtcbiAgICAgIG5hbWU6IGtleSxcbiAgICAgIGRhdGE6IFtdLFxuICAgIH1cbiAgICByZXR1cm4ga3Y7XG4gIH0sIHt9KSlcbiAgSGlnaGNoYXJ0cy5jaGFydChlbGVtLmlkLCB7XG4gICAgICBjaGFydDoge1xuICAgICAgICAgIHR5cGU6ICdzY2F0dGVyJyxcbiAgICAgICAgICB6b29tVHlwZTogJ3h5J1xuICAgICAgfSxcbiAgICAgIHRpdGxlOiB7XG4gICAgICAgICAgdGV4dDogJ1Byb3BlcnR5IFZhbHVlIHRvIFNjb3JlJ1xuICAgICAgfSxcbiAgICAgIHhBeGlzOiB7XG4gICAgICAgICAgdGl0bGU6IHtcbiAgICAgICAgICAgICAgZW5hYmxlZDogdHJ1ZSxcbiAgICAgICAgICAgICAgdGV4dDogJ05vcm1hbGl6ZWQnXG4gICAgICAgICAgfSxcbiAgICAgICAgICBzdGFydE9uVGljazogdHJ1ZSxcbiAgICAgICAgICBlbmRPblRpY2s6IHRydWUsXG4gICAgICAgICAgc2hvd0xhc3RMYWJlbDogdHJ1ZVxuICAgICAgfSxcbiAgICAgIHlBeGlzOiB7XG4gICAgICAgICAgdGl0bGU6IHtcbiAgICAgICAgICAgICAgdGV4dDogJ1Njb3JlJ1xuICAgICAgICAgIH1cbiAgICAgIH0sXG4gICAgICBsZWdlbmQ6IHtcbiAgICAgICAgICBsYXlvdXQ6ICd2ZXJ0aWNhbCcsXG4gICAgICAgICAgYWxpZ246ICdsZWZ0JyxcbiAgICAgICAgICB2ZXJ0aWNhbEFsaWduOiAndG9wJyxcbiAgICAgICAgICB4OiAxMDAsXG4gICAgICAgICAgeTogNzAsXG4gICAgICAgICAgZmxvYXRpbmc6IHRydWUsXG4gICAgICAgICAgYmFja2dyb3VuZENvbG9yOiAoSGlnaGNoYXJ0cy50aGVtZSAmJiBIaWdoY2hhcnRzLnRoZW1lLmxlZ2VuZEJhY2tncm91bmRDb2xvcikgfHwgJyNGRkZGRkYnLFxuICAgICAgICAgIGJvcmRlcldpZHRoOiAxXG4gICAgICB9LFxuICAgICAgcGxvdE9wdGlvbnM6IHtcbiAgICAgICAgICBzY2F0dGVyOiB7XG4gICAgICAgICAgICAgIG1hcmtlcjoge1xuICAgICAgICAgICAgICAgICAgcmFkaXVzOiA1LFxuICAgICAgICAgICAgICAgICAgc3RhdGVzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgaG92ZXI6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgZW5hYmxlZDogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgbGluZUNvbG9yOiAncmdiKDEwMCwxMDAsMTAwKSdcbiAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIHN0YXRlczoge1xuICAgICAgICAgICAgICAgICAgaG92ZXI6IHtcbiAgICAgICAgICAgICAgICAgICAgICBtYXJrZXI6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgZW5hYmxlZDogZmFsc2VcbiAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIHRvb2x0aXA6IHtcbiAgICAgICAgICAgICAgICAgIGhlYWRlckZvcm1hdDogJzxiPntzZXJpZXMubmFtZX08L2I+PGJyPicsXG4gICAgICAgICAgICAgICAgICBwb2ludEZvcm1hdDogJ3twb2ludC54fSwge3BvaW50Lnl9J1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgfSxcbiAgICAgIHNlcmllczoga2V5cy5tYXAoZnVuY3Rpb24oa2V5KXtcbiAgICAgICAgcmV0dXJuIGRhdGFPYmpba2V5XTtcbiAgICAgIH0pXG4gIH0pO1xufVxuXG5mdW5jdGlvbiB2aXNDaGFydChlbGVtLCBzY29yZXMsIHByb3BlcnR5TWFwLCBncmFwaCkge1xuXG4gIC8vIENyZWF0ZSBhbmQgcG9wdWxhdGUgYSBkYXRhIHRhYmxlLlxuICB2YXIgZGF0YSA9IG5ldyB2aXMuRGF0YVNldCgpO1xuICBzY29yZXMuZm9yRWFjaChmdW5jdGlvbihzY29yZUluZm8pe1xuICAgIGRhdGEuYWRkKHtcbiAgICAgIHg6IGdldFByb3BlcnR5KHNjb3JlSW5mbywgcHJvcGVydHlNYXAueCksXG4gICAgICB5OiBnZXRQcm9wZXJ0eShzY29yZUluZm8sIHByb3BlcnR5TWFwLngpLFxuICAgICAgejogZ2V0UHJvcGVydHkoc2NvcmVJbmZvLCBwcm9wZXJ0eU1hcC56KSxcbiAgICAgIHN0eWxlOiBnZXRQcm9wZXJ0eShzY29yZUluZm8sIHByb3BlcnR5TWFwLnopLFxuICAgICAgLy8gZXh0cmE6IGRlZi5hbmNlc3RyeVxuICAgIH0pO1xuICB9KTtcblxuICBmdW5jdGlvbiBnZXRQcm9wZXJ0eShpbmZvLCBrZXkpe1xuICAgIGlmKGtleSA9PT0gXCJzY29yZVwiKXtcbiAgICAgIHJldHVybiBpbmZvLnNjb3JlLnZcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIGluZm8uZGVmW2tleV07XG4gICAgfVxuICB9XG5cbiAgLy8gc3BlY2lmeSBvcHRpb25zXG4gIHZhciBvcHRpb25zID0ge1xuICAgIHdpZHRoOiAgJzYwMHB4JyxcbiAgICBoZWlnaHQ6ICc2MDBweCcsXG4gICAgc3R5bGU6ICdkb3Qtc2l6ZScsXG4gICAgc2hvd1BlcnNwZWN0aXZlOiB0cnVlLFxuICAgIHNob3dMZWdlbmQ6IHRydWUsXG4gICAgc2hvd0dyaWQ6IHRydWUsXG4gICAgc2hvd1NoYWRvdzogZmFsc2UsXG5cbiAgICAvLyBPcHRpb24gdG9vbHRpcCBjYW4gYmUgdHJ1ZSwgZmFsc2UsIG9yIGEgZnVuY3Rpb24gcmV0dXJuaW5nIGEgc3RyaW5nIHdpdGggSFRNTCBjb250ZW50c1xuICAgIHRvb2x0aXA6IGZ1bmN0aW9uIChwb2ludCkge1xuICAgICAgLy8gcGFyYW1ldGVyIHBvaW50IGNvbnRhaW5zIHByb3BlcnRpZXMgeCwgeSwgeiwgYW5kIGRhdGFcbiAgICAgIC8vIGRhdGEgaXMgdGhlIG9yaWdpbmFsIG9iamVjdCBwYXNzZWQgdG8gdGhlIHBvaW50IGNvbnN0cnVjdG9yXG4gICAgICByZXR1cm4gJ3Njb3JlOiA8Yj4nICsgcG9pbnQueiArICc8L2I+PGJyPic7IC8vICsgcG9pbnQuZGF0YS5leHRyYTtcbiAgICB9LFxuXG4gICAgLy8gVG9vbHRpcCBkZWZhdWx0IHN0eWxpbmcgY2FuIGJlIG92ZXJyaWRkZW5cbiAgICB0b29sdGlwU3R5bGU6IHtcbiAgICAgIGNvbnRlbnQ6IHtcbiAgICAgICAgYmFja2dyb3VuZCAgICA6ICdyZ2JhKDI1NSwgMjU1LCAyNTUsIDAuNyknLFxuICAgICAgICBwYWRkaW5nICAgICAgIDogJzEwcHgnLFxuICAgICAgICBib3JkZXJSYWRpdXMgIDogJzEwcHgnXG4gICAgICB9LFxuICAgICAgbGluZToge1xuICAgICAgICBib3JkZXJMZWZ0ICAgIDogJzFweCBkb3R0ZWQgcmdiYSgwLCAwLCAwLCAwLjUpJ1xuICAgICAgfSxcbiAgICAgIGRvdDoge1xuICAgICAgICBib3JkZXIgICAgICAgIDogJzVweCBzb2xpZCByZ2JhKDAsIDAsIDAsIDAuNSknXG4gICAgICB9XG4gICAgfSxcblxuICAgIGtlZXBBc3BlY3RSYXRpbzogdHJ1ZSxcbiAgICB2ZXJ0aWNhbFJhdGlvOiAwLjVcbiAgfTtcblxuICB2YXIgY2FtZXJhID0gZ3JhcGggPyBncmFwaC5nZXRDYW1lcmFQb3NpdGlvbigpIDogbnVsbDtcblxuICAvLyBjcmVhdGUgb3VyIGdyYXBoXG4gIHZhciBjb250YWluZXIgPSBlbGVtO1xuICBncmFwaCA9IG5ldyB2aXMuR3JhcGgzZChjb250YWluZXIsIGRhdGEsIG9wdGlvbnMpO1xuXG4gIGlmIChjYW1lcmEpIGdyYXBoLnNldENhbWVyYVBvc2l0aW9uKGNhbWVyYSk7IC8vIHJlc3RvcmUgY2FtZXJhIHBvc2l0aW9uXG4gIHJldHVybiBncmFwaDtcbn1cbiIsIlxubW9kdWxlLmV4cG9ydHMgPSBnZW5lcmF0ZVJhbmRvbTtcbmZ1bmN0aW9uIGdlbmVyYXRlUmFuZG9tKCl7XG4gIHJldHVybiBNYXRoLnJhbmRvbSgpO1xufVxuIiwiLy8gaHR0cDovL3N1bm1pbmd0YW8uYmxvZ3Nwb3QuY29tLzIwMTYvMTEvaW5icmVlZGluZy1jb2VmZmljaWVudC5odG1sXG5tb2R1bGUuZXhwb3J0cyA9IGdldEluYnJlZWRpbmdDb2VmZmljaWVudDtcblxuZnVuY3Rpb24gZ2V0SW5icmVlZGluZ0NvZWZmaWNpZW50KGNoaWxkKXtcbiAgdmFyIG5hbWVJbmRleCA9IG5ldyBNYXAoKTtcbiAgdmFyIGZsYWdnZWQgPSBuZXcgU2V0KCk7XG4gIHZhciBjb252ZXJnZW5jZVBvaW50cyA9IG5ldyBTZXQoKTtcbiAgY3JlYXRlQW5jZXN0cnlNYXAoY2hpbGQsIFtdKTtcblxuICB2YXIgc3RvcmVkQ29lZmZpY2llbnRzID0gbmV3IE1hcCgpO1xuXG4gIHJldHVybiBBcnJheS5mcm9tKGNvbnZlcmdlbmNlUG9pbnRzLnZhbHVlcygpKS5yZWR1Y2UoZnVuY3Rpb24oc3VtLCBwb2ludCl7XG4gICAgdmFyIGlDbyA9IGdldENvZWZmaWNpZW50KHBvaW50KTtcbiAgICByZXR1cm4gc3VtICsgaUNvO1xuICB9LCAwKTtcblxuICBmdW5jdGlvbiBjcmVhdGVBbmNlc3RyeU1hcChpbml0Tm9kZSl7XG4gICAgdmFyIGl0ZW1zSW5RdWV1ZSA9IFt7IG5vZGU6IGluaXROb2RlLCBwYXRoOiBbXSB9XTtcbiAgICBkb3tcbiAgICAgIHZhciBpdGVtID0gaXRlbXNJblF1ZXVlLnNoaWZ0KCk7XG4gICAgICB2YXIgbm9kZSA9IGl0ZW0ubm9kZTtcbiAgICAgIHZhciBwYXRoID0gaXRlbS5wYXRoO1xuICAgICAgaWYocHJvY2Vzc0l0ZW0obm9kZSwgcGF0aCkpe1xuICAgICAgICB2YXIgbmV4dFBhdGggPSBbIG5vZGUuaWQgXS5jb25jYXQocGF0aCk7XG4gICAgICAgIGl0ZW1zSW5RdWV1ZSA9IGl0ZW1zSW5RdWV1ZS5jb25jYXQobm9kZS5hbmNlc3RyeS5tYXAoZnVuY3Rpb24ocGFyZW50KXtcbiAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgbm9kZTogcGFyZW50LFxuICAgICAgICAgICAgcGF0aDogbmV4dFBhdGhcbiAgICAgICAgICB9O1xuICAgICAgICB9KSk7XG4gICAgICB9XG4gICAgfXdoaWxlKGl0ZW1zSW5RdWV1ZS5sZW5ndGgpO1xuXG5cbiAgICBmdW5jdGlvbiBwcm9jZXNzSXRlbShub2RlLCBwYXRoKXtcbiAgICAgIHZhciBuZXdBbmNlc3RvciA9ICFuYW1lSW5kZXguaGFzKG5vZGUuaWQpO1xuICAgICAgaWYobmV3QW5jZXN0b3Ipe1xuICAgICAgICBuYW1lSW5kZXguc2V0KG5vZGUuaWQsIHtcbiAgICAgICAgICBwYXJlbnRzOiAobm9kZS5hbmNlc3RyeSB8fCBbXSkubWFwKGZ1bmN0aW9uKHBhcmVudCl7XG4gICAgICAgICAgICByZXR1cm4gcGFyZW50LmlkO1xuICAgICAgICAgIH0pLFxuICAgICAgICAgIGlkOiBub2RlLmlkLFxuICAgICAgICAgIGNoaWxkcmVuOiBbXSxcbiAgICAgICAgICBjb252ZXJnZW5jZXM6IFtdLFxuICAgICAgICB9KTtcbiAgICAgIH0gZWxzZSB7XG5cbiAgICAgICAgZmxhZ2dlZC5hZGQobm9kZS5pZClcbiAgICAgICAgbmFtZUluZGV4LmdldChub2RlLmlkKS5jaGlsZHJlbi5mb3JFYWNoKGZ1bmN0aW9uKGNoaWxkSWRlbnRpZmllcil7XG4gICAgICAgICAgdmFyIG9mZnNldHMgPSBmaW5kQ29udmVyZ2VuY2UoY2hpbGRJZGVudGlmaWVyLnBhdGgsIHBhdGgpO1xuICAgICAgICAgIGlmKCFvZmZzZXRzKXtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG4gICAgICAgICAgdmFyIGNoaWxkSUQgPSBwYXRoW29mZnNldHNbMV1dO1xuICAgICAgICAgIGNvbnZlcmdlbmNlUG9pbnRzLmFkZChjaGlsZElEKTtcbiAgICAgICAgICBuYW1lSW5kZXguZ2V0KGNoaWxkSUQpLmNvbnZlcmdlbmNlcy5wdXNoKHtcbiAgICAgICAgICAgIHBhcmVudDogbm9kZS5pZCxcbiAgICAgICAgICAgIG9mZnNldHM6IG9mZnNldHMsXG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICBpZihwYXRoLmxlbmd0aCl7XG4gICAgICAgIG5hbWVJbmRleC5nZXQobm9kZS5pZCkuY2hpbGRyZW4ucHVzaCh7XG4gICAgICAgICAgY2hpbGQ6IHBhdGhbMF0sXG4gICAgICAgICAgcGF0aDogcGF0aFxuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgaWYoIW5ld0FuY2VzdG9yKXtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgaWYoIW5vZGUuYW5jZXN0cnkpe1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBnZXRDb2VmZmljaWVudChpZCl7XG4gICAgaWYoc3RvcmVkQ29lZmZpY2llbnRzLmhhcyhpZCkpe1xuICAgICAgcmV0dXJuIHN0b3JlZENvZWZmaWNpZW50cy5nZXQoaWQpO1xuICAgIH1cbiAgICB2YXIgbm9kZSA9IG5hbWVJbmRleC5nZXQoaWQpO1xuICAgIHZhciB2YWwgPSBub2RlLmNvbnZlcmdlbmNlcy5yZWR1Y2UoZnVuY3Rpb24oc3VtLCBwb2ludCl7XG4gICAgICByZXR1cm4gc3VtICsgTWF0aC5wb3coMSAvIDIsIHBvaW50Lm9mZnNldHMucmVkdWNlKGZ1bmN0aW9uKHN1bSwgdmFsdWUpe1xuICAgICAgICByZXR1cm4gc3VtICsgdmFsdWU7XG4gICAgICB9LCAxKSkgKiAoMSArIGdldENvZWZmaWNpZW50KHBvaW50LnBhcmVudCkpO1xuICAgIH0sIDApO1xuICAgIHN0b3JlZENvZWZmaWNpZW50cy5zZXQoaWQsIHZhbCk7XG5cbiAgICByZXR1cm4gdmFsO1xuXG4gIH1cbiAgZnVuY3Rpb24gZmluZENvbnZlcmdlbmNlKGxpc3RBLCBsaXN0Qil7XG4gICAgdmFyIGNpLCBjaiwgbGksIGxqO1xuICAgIG91dGVybG9vcDpcbiAgICBmb3IoY2kgPSAwLCBsaSA9IGxpc3RBLmxlbmd0aDsgY2kgPCBsaTsgY2krKyl7XG4gICAgICBmb3IoY2ogPSAwLCBsaiA9IGxpc3RCLmxlbmd0aDsgY2ogPCBsajsgY2orKyl7XG4gICAgICAgIGlmKGxpc3RBW2NpXSA9PT0gbGlzdEJbY2pdKXtcbiAgICAgICAgICBicmVhayBvdXRlcmxvb3A7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgaWYoY2kgPT09IGxpKXtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgcmV0dXJuIFtjaSwgY2pdO1xuICB9XG59XG4iLCJ2YXIgY2FyQ29uc3RydWN0ID0gcmVxdWlyZShcIi4uL2Nhci1zY2hlbWEvY29uc3RydWN0LmpzXCIpO1xyXG5cclxudmFyIGNhckNvbnN0YW50cyA9IGNhckNvbnN0cnVjdC5jYXJDb25zdGFudHMoKTtcclxuXHJcbnZhciBzY2hlbWEgPSBjYXJDb25zdHJ1Y3QuZ2VuZXJhdGVTY2hlbWEoY2FyQ29uc3RhbnRzKTtcclxudmFyIHBpY2tQYXJlbnQgPSByZXF1aXJlKFwiLi9waWNrUGFyZW50XCIpO1xyXG52YXIgc2VsZWN0RnJvbUFsbFBhcmVudHMgPSByZXF1aXJlKFwiLi9zZWxlY3RGcm9tQWxsUGFyZW50c1wiKTtcclxuY29uc3QgY29uc3RhbnRzID0ge1xyXG4gIGdlbmVyYXRpb25TaXplOiAyMCxcclxuICBzY2hlbWE6IHNjaGVtYSxcclxuICBjaGFtcGlvbkxlbmd0aDogMSxcclxuICBtdXRhdGlvbl9yYW5nZTogMSxcclxuICBnZW5fbXV0YXRpb246IDAuMDUsXHJcbn07XHJcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oKXtcclxuICB2YXIgY3VycmVudENob2ljZXMgPSBuZXcgTWFwKCk7XHJcbiAgcmV0dXJuIE9iamVjdC5hc3NpZ24oXHJcbiAgICB7fSxcclxuICAgIGNvbnN0YW50cyxcclxuICAgIHtcclxuICAgICAgc2VsZWN0RnJvbUFsbFBhcmVudHM6IHNlbGVjdEZyb21BbGxQYXJlbnRzLFxyXG4gICAgICBnZW5lcmF0ZVJhbmRvbTogcmVxdWlyZShcIi4vZ2VuZXJhdGVSYW5kb21cIiksXHJcbiAgICAgIHBpY2tQYXJlbnQ6IHBpY2tQYXJlbnQuYmluZCh2b2lkIDAsIGN1cnJlbnRDaG9pY2VzKSxcclxuICAgIH1cclxuICApO1xyXG59XHJcbm1vZHVsZS5leHBvcnRzLmNvbnN0YW50cyA9IGNvbnN0YW50c1xyXG4iLCJ2YXIgbkF0dHJpYnV0ZXMgPSAxNTtcbm1vZHVsZS5leHBvcnRzID0gcGlja1BhcmVudDtcblxuZnVuY3Rpb24gcGlja1BhcmVudChjdXJyZW50Q2hvaWNlcywgY2hvb3NlSWQsIGtleSAvKiAsIHBhcmVudHMgKi8pe1xuICBpZighY3VycmVudENob2ljZXMuaGFzKGNob29zZUlkKSl7XG4gICAgY3VycmVudENob2ljZXMuc2V0KGNob29zZUlkLCBpbml0aWFsaXplUGljaygpKVxuICB9XG4gIC8vIGNvbnNvbGUubG9nKGNob29zZUlkKTtcbiAgdmFyIHN0YXRlID0gY3VycmVudENob2ljZXMuZ2V0KGNob29zZUlkKTtcbiAgLy8gY29uc29sZS5sb2coc3RhdGUuY3VycGFyZW50KTtcbiAgc3RhdGUuaSsrXG4gIGlmKFtcIndoZWVsX3JhZGl1c1wiLCBcIndoZWVsX3ZlcnRleFwiLCBcIndoZWVsX2RlbnNpdHlcIl0uaW5kZXhPZihrZXkpID4gLTEpe1xuICAgIHN0YXRlLmN1cnBhcmVudCA9IGN3X2Nob29zZVBhcmVudChzdGF0ZSk7XG4gICAgcmV0dXJuIHN0YXRlLmN1cnBhcmVudDtcbiAgfVxuICBzdGF0ZS5jdXJwYXJlbnQgPSBjd19jaG9vc2VQYXJlbnQoc3RhdGUpO1xuICByZXR1cm4gc3RhdGUuY3VycGFyZW50O1xuXG4gIGZ1bmN0aW9uIGN3X2Nob29zZVBhcmVudChzdGF0ZSkge1xuICAgIHZhciBjdXJwYXJlbnQgPSBzdGF0ZS5jdXJwYXJlbnQ7XG4gICAgdmFyIGF0dHJpYnV0ZUluZGV4ID0gc3RhdGUuaTtcbiAgICB2YXIgc3dhcFBvaW50MSA9IHN0YXRlLnN3YXBQb2ludDFcbiAgICB2YXIgc3dhcFBvaW50MiA9IHN0YXRlLnN3YXBQb2ludDJcbiAgICAvLyBjb25zb2xlLmxvZyhzd2FwUG9pbnQxLCBzd2FwUG9pbnQyLCBhdHRyaWJ1dGVJbmRleClcbiAgICBpZiAoKHN3YXBQb2ludDEgPT0gYXR0cmlidXRlSW5kZXgpIHx8IChzd2FwUG9pbnQyID09IGF0dHJpYnV0ZUluZGV4KSkge1xuICAgICAgcmV0dXJuIGN1cnBhcmVudCA9PSAxID8gMCA6IDFcbiAgICB9XG4gICAgcmV0dXJuIGN1cnBhcmVudFxuICB9XG5cbiAgZnVuY3Rpb24gaW5pdGlhbGl6ZVBpY2soKXtcbiAgICB2YXIgY3VycGFyZW50ID0gMDtcblxuICAgIHZhciBzd2FwUG9pbnQxID0gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogKG5BdHRyaWJ1dGVzKSk7XG4gICAgdmFyIHN3YXBQb2ludDIgPSBzd2FwUG9pbnQxO1xuICAgIHdoaWxlIChzd2FwUG9pbnQyID09IHN3YXBQb2ludDEpIHtcbiAgICAgIHN3YXBQb2ludDIgPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAobkF0dHJpYnV0ZXMpKTtcbiAgICB9XG4gICAgdmFyIGkgPSAwO1xuICAgIHJldHVybiB7XG4gICAgICBjdXJwYXJlbnQ6IGN1cnBhcmVudCxcbiAgICAgIGk6IGksXG4gICAgICBzd2FwUG9pbnQxOiBzd2FwUG9pbnQxLFxuICAgICAgc3dhcFBvaW50Mjogc3dhcFBvaW50MlxuICAgIH1cbiAgfVxufVxuIiwidmFyIGdldEluYnJlZWRpbmdDb2VmZmljaWVudCA9IHJlcXVpcmUoXCIuL2luYnJlZWRpbmctY29lZmZpY2llbnRcIik7XG5cbm1vZHVsZS5leHBvcnRzID0gc2ltcGxlU2VsZWN0O1xuXG5mdW5jdGlvbiBzaW1wbGVTZWxlY3QocGFyZW50cyl7XG4gIHZhciB0b3RhbFBhcmVudHMgPSBwYXJlbnRzLmxlbmd0aFxuICB2YXIgciA9IE1hdGgucmFuZG9tKCk7XG4gIGlmIChyID09IDApXG4gICAgcmV0dXJuIDA7XG4gIHJldHVybiBNYXRoLmZsb29yKC1NYXRoLmxvZyhyKSAqIHRvdGFsUGFyZW50cykgJSB0b3RhbFBhcmVudHM7XG59XG5cbmZ1bmN0aW9uIHNlbGVjdEZyb21BbGxQYXJlbnRzKHBhcmVudHMsIHBhcmVudExpc3QsIHByZXZpb3VzUGFyZW50SW5kZXgpIHtcbiAgdmFyIHByZXZpb3VzUGFyZW50ID0gcGFyZW50c1twcmV2aW91c1BhcmVudEluZGV4XTtcbiAgdmFyIHZhbGlkUGFyZW50cyA9IHBhcmVudHMuZmlsdGVyKGZ1bmN0aW9uKHBhcmVudCwgaSl7XG4gICAgaWYocHJldmlvdXNQYXJlbnRJbmRleCA9PT0gaSl7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIGlmKCFwcmV2aW91c1BhcmVudCl7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgdmFyIGNoaWxkID0ge1xuICAgICAgaWQ6IE1hdGgucmFuZG9tKCkudG9TdHJpbmcoMzIpLFxuICAgICAgYW5jZXN0cnk6IFtwcmV2aW91c1BhcmVudCwgcGFyZW50XS5tYXAoZnVuY3Rpb24ocCl7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgaWQ6IHAuZGVmLmlkLFxuICAgICAgICAgIGFuY2VzdHJ5OiBwLmRlZi5hbmNlc3RyeVxuICAgICAgICB9XG4gICAgICB9KVxuICAgIH1cbiAgICB2YXIgaUNvID0gZ2V0SW5icmVlZGluZ0NvZWZmaWNpZW50KGNoaWxkKTtcbiAgICBjb25zb2xlLmxvZyhcImluYnJlZWRpbmcgY29lZmZpY2llbnRcIiwgaUNvKVxuICAgIGlmKGlDbyA+IDAuMjUpe1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSlcbiAgaWYodmFsaWRQYXJlbnRzLmxlbmd0aCA9PT0gMCl7XG4gICAgcmV0dXJuIE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIHBhcmVudHMubGVuZ3RoKVxuICB9XG4gIHZhciB0b3RhbFNjb3JlID0gdmFsaWRQYXJlbnRzLnJlZHVjZShmdW5jdGlvbihzdW0sIHBhcmVudCl7XG4gICAgcmV0dXJuIHN1bSArIHBhcmVudC5zY29yZS52O1xuICB9LCAwKTtcbiAgdmFyIHIgPSB0b3RhbFNjb3JlICogTWF0aC5yYW5kb20oKTtcbiAgZm9yKHZhciBpID0gMDsgaSA8IHZhbGlkUGFyZW50cy5sZW5ndGg7IGkrKyl7XG4gICAgdmFyIHNjb3JlID0gdmFsaWRQYXJlbnRzW2ldLnNjb3JlLnY7XG4gICAgaWYociA+IHNjb3JlKXtcbiAgICAgIHIgPSByIC0gc2NvcmU7XG4gICAgfSBlbHNlIHtcbiAgICAgIGJyZWFrO1xuICAgIH1cbiAgfVxuICByZXR1cm4gaTtcbn1cbiIsInZhciByYW5kb20gPSByZXF1aXJlKFwiLi9yYW5kb20uanNcIik7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBjcmVhdGVHZW5lcmF0aW9uWmVybyhzY2hlbWEsIGdlbmVyYXRvcil7XG4gICAgcmV0dXJuIE9iamVjdC5rZXlzKHNjaGVtYSkucmVkdWNlKGZ1bmN0aW9uKGluc3RhbmNlLCBrZXkpe1xuICAgICAgdmFyIHNjaGVtYVByb3AgPSBzY2hlbWFba2V5XTtcbiAgICAgIHZhciB2YWx1ZXMgPSByYW5kb20uY3JlYXRlTm9ybWFscyhzY2hlbWFQcm9wLCBnZW5lcmF0b3IpO1xuICAgICAgaW5zdGFuY2Vba2V5XSA9IHZhbHVlcztcbiAgICAgIHJldHVybiBpbnN0YW5jZTtcbiAgICB9LCB7IGlkOiBNYXRoLnJhbmRvbSgpLnRvU3RyaW5nKDMyKSB9KTtcbiAgfSxcbiAgY3JlYXRlQ3Jvc3NCcmVlZChzY2hlbWEsIHBhcmVudHMsIHBhcmVudENob29zZXIpe1xuICAgIHZhciBpZCA9IE1hdGgucmFuZG9tKCkudG9TdHJpbmcoMzIpO1xuICAgIHJldHVybiBPYmplY3Qua2V5cyhzY2hlbWEpLnJlZHVjZShmdW5jdGlvbihjcm9zc0RlZiwga2V5KXtcbiAgICAgIHZhciBzY2hlbWFEZWYgPSBzY2hlbWFba2V5XTtcbiAgICAgIHZhciB2YWx1ZXMgPSBbXTtcbiAgICAgIGZvcih2YXIgaSA9IDAsIGwgPSBzY2hlbWFEZWYubGVuZ3RoOyBpIDwgbDsgaSsrKXtcbiAgICAgICAgdmFyIHAgPSBwYXJlbnRDaG9vc2VyKGlkLCBrZXksIHBhcmVudHMpO1xuICAgICAgICB2YWx1ZXMucHVzaChwYXJlbnRzW3BdW2tleV1baV0pO1xuICAgICAgfVxuICAgICAgY3Jvc3NEZWZba2V5XSA9IHZhbHVlcztcbiAgICAgIHJldHVybiBjcm9zc0RlZjtcbiAgICB9LCB7XG4gICAgICBpZDogaWQsXG4gICAgICBhbmNlc3RyeTogcGFyZW50cy5tYXAoZnVuY3Rpb24ocGFyZW50KXtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICBpZDogcGFyZW50LmlkLFxuICAgICAgICAgIGFuY2VzdHJ5OiBwYXJlbnQuYW5jZXN0cnksXG4gICAgICAgIH07XG4gICAgICB9KVxuICAgIH0pO1xuICB9LFxuICBjcmVhdGVNdXRhdGVkQ2xvbmUoc2NoZW1hLCBnZW5lcmF0b3IsIHBhcmVudCwgZmFjdG9yLCBjaGFuY2VUb011dGF0ZSl7XG4gICAgcmV0dXJuIE9iamVjdC5rZXlzKHNjaGVtYSkucmVkdWNlKGZ1bmN0aW9uKGNsb25lLCBrZXkpe1xuICAgICAgdmFyIHNjaGVtYVByb3AgPSBzY2hlbWFba2V5XTtcbiAgICAgIHZhciBvcmlnaW5hbFZhbHVlcyA9IHBhcmVudFtrZXldO1xuICAgICAgdmFyIHZhbHVlcyA9IHJhbmRvbS5tdXRhdGVOb3JtYWxzKFxuICAgICAgICBzY2hlbWFQcm9wLCBnZW5lcmF0b3IsIG9yaWdpbmFsVmFsdWVzLCBmYWN0b3IsIGNoYW5jZVRvTXV0YXRlXG4gICAgICApO1xuICAgICAgY2xvbmVba2V5XSA9IHZhbHVlcztcbiAgICAgIHJldHVybiBjbG9uZTtcbiAgICB9LCB7XG4gICAgICBpZDogcGFyZW50LmlkLFxuICAgICAgYW5jZXN0cnk6IHBhcmVudC5hbmNlc3RyeVxuICAgIH0pO1xuICB9LFxuICBhcHBseVR5cGVzKHNjaGVtYSwgcGFyZW50KXtcbiAgICByZXR1cm4gT2JqZWN0LmtleXMoc2NoZW1hKS5yZWR1Y2UoZnVuY3Rpb24oY2xvbmUsIGtleSl7XG4gICAgICB2YXIgc2NoZW1hUHJvcCA9IHNjaGVtYVtrZXldO1xuICAgICAgdmFyIG9yaWdpbmFsVmFsdWVzID0gcGFyZW50W2tleV07XG4gICAgICB2YXIgdmFsdWVzO1xuICAgICAgc3dpdGNoKHNjaGVtYVByb3AudHlwZSl7XG4gICAgICAgIGNhc2UgXCJzaHVmZmxlXCIgOlxuICAgICAgICAgIHZhbHVlcyA9IHJhbmRvbS5tYXBUb1NodWZmbGUoc2NoZW1hUHJvcCwgb3JpZ2luYWxWYWx1ZXMpOyBicmVhaztcbiAgICAgICAgY2FzZSBcImZsb2F0XCIgOlxuICAgICAgICAgIHZhbHVlcyA9IHJhbmRvbS5tYXBUb0Zsb2F0KHNjaGVtYVByb3AsIG9yaWdpbmFsVmFsdWVzKTsgYnJlYWs7XG4gICAgICAgIGNhc2UgXCJpbnRlZ2VyXCI6XG4gICAgICAgICAgdmFsdWVzID0gcmFuZG9tLm1hcFRvSW50ZWdlcihzY2hlbWFQcm9wLCBvcmlnaW5hbFZhbHVlcyk7IGJyZWFrO1xuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgVW5rbm93biB0eXBlICR7c2NoZW1hUHJvcC50eXBlfSBvZiBzY2hlbWEgZm9yIGtleSAke2tleX1gKTtcbiAgICAgIH1cbiAgICAgIGNsb25lW2tleV0gPSB2YWx1ZXM7XG4gICAgICByZXR1cm4gY2xvbmU7XG4gICAgfSwge1xuICAgICAgaWQ6IHBhcmVudC5pZCxcbiAgICAgIGFuY2VzdHJ5OiBwYXJlbnQuYW5jZXN0cnlcbiAgICB9KTtcbiAgfSxcbn1cbiIsIm1vZHVsZS5leHBvcnRzID0ge1xyXG5cdGNyZWF0ZURhdGFQb2ludENsdXN0ZXI6IGNyZWF0ZURhdGFQb2ludENsdXN0ZXIsXHJcblx0Y3JlYXRlRGF0YVBvaW50OiBjcmVhdGVEYXRhUG9pbnQsXHJcblx0Y3JlYXRlQ2x1c3RlckludGVyZmFjZTogY3JlYXRlQ2x1c3RlckludGVyZmFjZSxcclxuXHRmaW5kRGF0YVBvaW50Q2x1c3RlcjogZmluZERhdGFQb2ludENsdXN0ZXIsXHJcblx0ZmluZERhdGFQb2ludDogZmluZERhdGFQb2ludCxcclxuXHRzb3J0Q2x1c3Rlcjogc29ydENsdXN0ZXIsXHJcblx0ZmluZE9qZWN0TmVpZ2hib3JzOiBmaW5kT2plY3ROZWlnaGJvcnMsXHJcblx0c2NvcmVPYmplY3Q6IHNjb3JlT2JqZWN0LFxyXG5cdGNyZWF0ZVN1YkRhdGFQb2ludENsdXN0ZXI6Y3JlYXRlU3ViRGF0YVBvaW50Q2x1c3RlclxyXG5cdFxyXG59XHJcblxyXG5mdW5jdGlvbiBjcmVhdGVEYXRhUG9pbnRDbHVzdGVyKGNhckRhdGFQb2ludFR5cGUpe1xyXG5cdHZhciBjbHVzdGVyID0ge1xyXG5cdFx0aWQ6IGNhckRhdGFQb2ludFR5cGUsXHJcblx0XHRkYXRhQXJyYXk6IG5ldyBBcnJheSgpXHJcblx0fTtcclxuXHRyZXR1cm4gY2x1c3RlcjtcclxufVxyXG5cclxuZnVuY3Rpb24gY3JlYXRlU3ViRGF0YVBvaW50Q2x1c3RlcihjYXJEYXRhUG9pbnRUeXBlKXtcclxuXHR2YXIgY2x1c3RlciA9IHtcclxuXHRcdGlkOiBjYXJEYXRhUG9pbnRUeXBlLFxyXG5cdFx0ZGF0YUFycmF5OiBuZXcgQXJyYXkoKVxyXG5cdH07XHJcblx0cmV0dXJuIGNsdXN0ZXI7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNyZWF0ZURhdGFQb2ludChkYXRhSWQsIGRhdGFQb2ludFR5cGUsIGQsIHMpe1xyXG5cdHZhciBkYXRhUG9pbnQgPSB7XHJcblx0XHRpZDogZGF0YUlkLFxyXG5cdFx0dHlwZTogZGF0YVBvaW50VHlwZSxcclxuXHRcdGRhdGE6IGQsXHJcblx0XHRzY29yZTogc1xyXG5cdH07XHJcblx0cmV0dXJuIGRhdGFQb2ludDtcclxufVxyXG5cclxuZnVuY3Rpb24gY3JlYXRlQ2x1c3RlckludGVyZmFjZShpZCl7XHJcblx0dmFyIGNsdXN0ZXIgPSB7XHJcblx0XHRjYXJzQXJyYXk6IG5ldyBBcnJheSgpLFxyXG5cdFx0Y2x1c3RlcklEOiBpZCxcclxuXHRcdGFycmF5T2ZDbHVzdGVyczogbmV3IEFycmF5KClcclxuXHR9O1xyXG5cdHJldHVybiBjbHVzdGVyO1xyXG59XHJcblxyXG5mdW5jdGlvbiBzb3J0Q2x1c3RlcihjbHVzdGVyKXtcclxuXHRjbHVzdGVyLnNvcnQoZnVuY3Rpb24oYSwgYil7cmV0dXJuIGEuZGF0YSAtIGIuZGF0YX0pO1xyXG59XHJcblxyXG5mdW5jdGlvbiBmaW5kT2plY3ROZWlnaGJvcnMoZGF0YUlkLCBjbHVzdGVyLCByYW5nZUludCkge1xyXG5cdHZhciByYW5nZSA9IE1hdGgucm91bmQocmFuZ2VJbnQpO1xyXG5cdHZhciBuZWlnaGJvcnMgPSBuZXcgQXJyYXkoKTtcclxuXHR2YXIgaW5kZXggPSBjbHVzdGVyLmZpbmRJbmRleCh4PT4geC5pZD09PWRhdGFJZCk7XHJcblx0dmFyIGdvbmVQYXN0SWQgPSBmYWxzZTtcclxuXHR2YXIgY2x1c3Rlckxlbmd0aCA9IGNsdXN0ZXIubGVuZ3RoO1xyXG5cdGZvcih2YXIgaT0wO2k8cmFuZ2U7aSsrKXtcclxuXHRcdGlmKChpbmRleC1yYW5nZSk8MCl7XHJcblx0XHRcdGlmKGNsdXN0ZXJbaV0uaWQ9PT1kYXRhSWQpe2dvbmVQYXN0SWQ9dHJ1ZTt9XHJcblx0XHRcdG5laWdoYm9ycy5wdXNoKChnb25lUGFzdElkPT09ZmFsc2UpP2NsdXN0ZXJbaV06Y2x1c3RlcltpKzFdKTtcclxuXHRcdH1cclxuXHRcdGVsc2UgaWYoKGluZGV4K3JhbmdlKT5jbHVzdGVyTGVuZ3RoKXtcclxuXHRcdFx0aWYoY2x1c3RlclsoY2x1c3Rlckxlbmd0aC0xKS1pXS5pZD09PWRhdGFJZCl7Z29uZVBhc3RJZD10cnVlO31cclxuXHRcdFx0bmVpZ2hib3JzLnB1c2goKGdvbmVQYXN0SWQ9PT1mYWxzZSk/Y2x1c3RlclsoY2x1c3Rlckxlbmd0aC0xKS1pXTpjbHVzdGVyWyhjbHVzdGVyTGVuZ3RoLTEpLShpKzEpXSk7XHJcblx0XHR9XHJcblx0XHRlbHNlIHtcclxuXHRcdFx0aWYoY2x1c3RlcltpbmRleC0ocmFuZ2UvMikraV0uaWQ9PT1kYXRhSWQpe2dvbmVQYXN0SWQ9dHJ1ZTt9XHJcblx0XHRcdG5laWdoYm9ycy5wdXNoKChnb25lUGFzdElkPT09ZmFsc2UpP2NsdXN0ZXJbaW5kZXgtKHJhbmdlLzIpK2ldOmNsdXN0ZXJbKGluZGV4KzEpLShyYW5nZS8yKStpXSk7XHJcblx0XHR9XHJcblx0XHRcclxuXHR9XHJcblx0cmV0dXJuIG5laWdoYm9ycztcclxufVxyXG5cclxuZnVuY3Rpb24gZmluZERhdGFQb2ludENsdXN0ZXIoZGF0YUlkLCBjbHVzdGVyKXtcclxuXHRyZXR1cm4gY2x1c3Rlci5hcnJheU9mQ2x1c3RlcnMuZmluZCh4PT4geC5pZD09PWRhdGFJZCk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGZpbmREYXRhUG9pbnQoZGF0YUlkLCBjbHVzdGVyKXtcclxuXHRyZXR1cm4gY2x1c3Rlci5kYXRhQXJyYXkuZmluZChmdW5jdGlvbih2YWx1ZSl7XHJcblx0XHRyZXR1cm4gdmFsdWUuaWQ9PT1pZDtcclxuXHR9KTtcclxufVxyXG5cclxuZnVuY3Rpb24gc2NvcmVPYmplY3QoaWQsIGNsdXN0ZXIpe1xyXG5cdHZhciBuZWlnaGJvcnMgPSBmaW5kT2plY3ROZWlnaGJvcnMoaWQsIGNsdXN0ZXIsICgoY2x1c3Rlci5sZW5ndGgvNCk8NDApPzY6NDApO1xyXG5cdHZhciBuZXdTY29yZSA9IDA7XHJcblx0Zm9yKHZhciBpPTA7aTxuZWlnaGJvcnMubGVuZ3RoO2krKyl7XHJcblx0XHRuZXdTY29yZSs9bmVpZ2hib3JzW2ldLnNjb3JlO1xyXG5cdH1cclxuXHRyZXR1cm4gbmV3U2NvcmUvbmVpZ2hib3JzLmxlbmd0aDtcclxufSIsInZhciBjbHVzdGVyID0gcmVxdWlyZShcIi4vY2x1c3Rlci5qcy9cIik7XHJcbi8vdmFyIGNhck9iamVjdHMgPSByZXF1aXJlKFwiLi9jYXItb2JqZWN0cy5qc29uXCIpO1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSB7XHJcblx0c2V0dXA6IHNldHVwLFxyXG5cdHJlU2NvcmVDYXJzOiByZVNjb3JlQ2FycyxcclxuXHRjbHVzdGVyTXV0YXRlOiBjbHVzdGVyTXV0YXRlXHJcbn1cclxuXHJcbi8vXCJ3aGVlbF9yYWRpdXNcIiwgXCJjaGFzc2lzX2RlbnNpdHlcIiwgXCJ2ZXJ0ZXhfbGlzdFwiLCBcIndoZWVsX3ZlcnRleFwiIGFuZCBcIndoZWVsX2RlbnNpdHlcIi9cclxuZnVuY3Rpb24gc2V0dXAoY2FycywgZXh0Q2x1c3RlciwgY2x1c3RlclByZWNyZWF0ZWQpe1xyXG5cdHZhciBjbHVzdCA9IChjbHVzdGVyUHJlY3JlYXRlZD09PWZhbHNlKT9zZXR1cERhdGFDbHVzdGVycyhjbHVzdGVyLmNyZWF0ZUNsdXN0ZXJJbnRlcmZhY2UoXCJuZXdDbHVzdGVyXCIpKTogZXh0Q2x1c3RlcjtcclxuXHRmb3IodmFyIGkgPTA7aTxjYXJzLmxlbmd0aDtpKyspe1xyXG5cdFx0aWYoY2Fyc1tpXS5kZWYuZWxpdGU9PT1mYWxzZSl7XHJcblx0XHRcdGFkZENhcnNUb0NsdXN0ZXIoY2Fyc1tpXSwgY2x1c3QpO1xyXG5cdFx0XHRjbHVzdC5jYXJzQXJyYXkucHVzaChjYXJzW2ldKTtcclxuXHRcdH1cclxuXHR9XHJcblx0Y29uc29sZS5sb2coY2x1c3QpOy8vdGVzdFxyXG5cdHJldHVybiBjbHVzdDtcclxufVxyXG5cclxuZnVuY3Rpb24gc2V0dXBEYXRhQ2x1c3RlcnMobWFpbkNsdXN0ZXIpe1xyXG5cdG1haW5DbHVzdGVyLmFycmF5T2ZDbHVzdGVycy5wdXNoKGNsdXN0ZXIuY3JlYXRlRGF0YVBvaW50Q2x1c3RlcihcIndoZWVsX3JhZGl1c1wiKSk7XHJcblx0bWFpbkNsdXN0ZXIuYXJyYXlPZkNsdXN0ZXJzLnB1c2goY2x1c3Rlci5jcmVhdGVEYXRhUG9pbnRDbHVzdGVyKFwiY2hhc3Npc19kZW5zaXR5XCIpKTtcclxuXHRtYWluQ2x1c3Rlci5hcnJheU9mQ2x1c3RlcnMucHVzaChjbHVzdGVyLmNyZWF0ZURhdGFQb2ludENsdXN0ZXIoXCJ3aGVlbF92ZXJ0ZXhcIikpO1xyXG5cdG1haW5DbHVzdGVyLmFycmF5T2ZDbHVzdGVycy5wdXNoKGNsdXN0ZXIuY3JlYXRlRGF0YVBvaW50Q2x1c3RlcihcInZlcnRleF9saXN0XCIpKTtcclxuXHRtYWluQ2x1c3Rlci5hcnJheU9mQ2x1c3RlcnMucHVzaChjbHVzdGVyLmNyZWF0ZURhdGFQb2ludENsdXN0ZXIoXCJ3aGVlbF9kZW5zaXR5XCIpKTtcclxuXHRyZXR1cm4gbWFpbkNsdXN0ZXI7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGFkZENhcnNUb0NsdXN0ZXIoY2FyLCBjbHVzdCl7XHJcblx0YWRkRGF0YVRvQ2x1c3RlcihjYXIuZGVmLmlkLCBjYXIuZGVmLndoZWVsX3JhZGl1cyxjYXIuc2NvcmUucywgY2x1c3Rlci5maW5kRGF0YVBvaW50Q2x1c3RlcihcIndoZWVsX3JhZGl1c1wiLCBjbHVzdCkpO1xyXG4gICAgYWRkRGF0YVRvQ2x1c3RlcihjYXIuZGVmLmlkLCBjYXIuZGVmLmNoYXNzaXNfZGVuc2l0eSxjYXIuc2NvcmUucywgY2x1c3Rlci5maW5kRGF0YVBvaW50Q2x1c3RlcihcImNoYXNzaXNfZGVuc2l0eVwiLCBjbHVzdCkpO1xyXG5cdGFkZERhdGFUb0NsdXN0ZXIoY2FyLmRlZi5pZCwgY2FyLmRlZi52ZXJ0ZXhfbGlzdCxjYXIuc2NvcmUucywgY2x1c3Rlci5maW5kRGF0YVBvaW50Q2x1c3RlcihcInZlcnRleF9saXN0XCIsIGNsdXN0KSk7XHJcblx0YWRkRGF0YVRvQ2x1c3RlcihjYXIuZGVmLmlkLCBjYXIuZGVmLndoZWVsX3ZlcnRleCxjYXIuc2NvcmUucywgY2x1c3Rlci5maW5kRGF0YVBvaW50Q2x1c3RlcihcIndoZWVsX3ZlcnRleFwiLCBjbHVzdCkpO1xyXG5cdGFkZERhdGFUb0NsdXN0ZXIoY2FyLmRlZi5pZCwgY2FyLmRlZi53aGVlbF9kZW5zaXR5LGNhci5zY29yZS5zLCBjbHVzdGVyLmZpbmREYXRhUG9pbnRDbHVzdGVyKFwid2hlZWxfZGVuc2l0eVwiLCBjbHVzdCkpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBhZGREYXRhVG9DbHVzdGVyKGlkLCBjYXJEYXRhLCBzY29yZSwgY2x1c3Qpe1xyXG5cdGlmKGNsdXN0LmRhdGFBcnJheS5sZW5ndGg9PT1jYXJEYXRhLmxlbmd0aCl7XHJcblx0XHRmb3IodmFyIHg9MDt4PGNhckRhdGEubGVuZ3RoO3grKyl7XHJcblx0XHRcdGNsdXN0LmRhdGFBcnJheVt4XS5kYXRhQXJyYXkucHVzaChjbHVzdGVyLmNyZWF0ZURhdGFQb2ludChpZCwgXCJcIiwgY2FyRGF0YVt4XSwgc2NvcmUpKTtcclxuXHRcdFx0Y2x1c3Rlci5zb3J0Q2x1c3RlcihjbHVzdC5kYXRhQXJyYXlbeF0uZGF0YUFycmF5KTtcclxuXHRcdH1cclxuXHR9XHJcblx0ZWxzZSB7XHJcblx0XHRmb3IodmFyIGk9MDtpPGNhckRhdGEubGVuZ3RoO2krKyl7XHJcblx0XHRcdHZhciBuZXdDbHVzdCA9IGNsdXN0ZXIuY3JlYXRlU3ViRGF0YVBvaW50Q2x1c3RlcihcIlwiKTtcclxuXHRcdFx0bmV3Q2x1c3QuZGF0YUFycmF5LnB1c2goY2x1c3Rlci5jcmVhdGVEYXRhUG9pbnQoaWQsIFwiXCIsIGNhckRhdGFbaV0sIHNjb3JlKSk7XHJcblx0XHRcdGNsdXN0LmRhdGFBcnJheS5wdXNoKG5ld0NsdXN0KTtcclxuXHRcdH1cclxuXHR9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHJlU2NvcmVDYXJzKGNhcnMsIGNsdXN0KXtcclxuXHRmb3IodmFyIGk9MDtpPGNhcnMubGVuZ3RoO2krKyl7XHJcblx0XHR2YXIgc2NvcmUgPSAwO1xyXG5cdFx0Zm9yKHZhciB4PTA7eDxjbHVzdC5hcnJheU9mQ2x1c3RlcnMubGVuZ3RoO3grKyl7XHJcblx0XHRcdGZvcih2YXIgeT0wO3k8Y2x1c3QuYXJyYXlPZkNsdXN0ZXJzW3hdLmRhdGFBcnJheS5sZW5ndGg7eSsrKXtcclxuXHRcdFx0XHRzY29yZSArPSBjbHVzdGVyLnNjb3JlT2JqZWN0KGNhcnNbaV0uZGVmLmlkLCBjbHVzdC5hcnJheU9mQ2x1c3RlcnNbeF0uZGF0YUFycmF5W3ldLmRhdGFBcnJheSk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHRcdGNhcnNbaV0uc2NvcmUucyArPSBzY29yZS9jbHVzdC5hcnJheU9mQ2x1c3RlcnMubGVuZ3RoO1xyXG5cdH1cclxufVxyXG5cclxuZnVuY3Rpb24gY2x1c3Rlck11dGF0ZShpZCwgY2x1c3Qpe1xyXG5cdHZhciBuZWlnaGJvcnMgPSBjbHVzdGVyLmZpbmRPamVjdE5laWdoYm9ycyhpZCwgY2x1c3QsICgoY2x1c3QubGVuZ3RoLzQpPDQwKT82OjQwKTsvLygoY2x1c3QubGVuZ3RoLzQpPjcwMCk/NzAwOihjbHVzdC5sZW5ndGgvNCkpO1xyXG5cdG5laWdoYm9ycy5zb3J0KGZ1bmN0aW9uKGEsIGIpe3JldHVybiBiLnNjb3JlLnMgLSBhLnNjb3JlLnM7fSk7XHJcblx0cmV0dXJuIG5laWdoYm9yc1swXS5kYXRhO1xyXG59XHJcblxyXG4iLCIvKnZhciByYW5kb21JbnQgPSByZXF1aXJlKFwiLi9yYW5kb21JbnQuanMvXCIpO1xyXG52YXIgZ2V0UmFuZG9tSW50ID0gcmFuZG9tSW50LmdldFJhbmRvbUludDsqL1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSB7XHJcblx0cnVuQ3Jvc3NvdmVyOiBydW5Dcm9zc292ZXJcclxufVxyXG5cclxuLypUaGlzIGZ1bmN0aW9uIGNyZWF0ZXMgdGhlIGFjdWFsIG5ldyBjYXIgYW5kIHJldHVybmVkLiBUaGUgZnVuY3Rpb24gcnVucyBhIG9uZS1wb2ludCBjcm9zc292ZXIgdGFraW5nIGRhdGEgZnJvbSB0aGUgcGFyZW50cyBwYXNzZWQgdGhyb3VnaCBhbmQgYWRkaW5nIHRoZW0gdG8gdGhlIG5ldyBjYXIuXHJcbkBwYXJhbSBwYXJlbnRzIE9iamVjdEFycmF5IC0gRGF0YSBpcyB0YWtlbiBmcm9tIHRoZXNlIGNhcnMgYW5kIGFkZGVkIHRvIHRoZSBuZXcgY2FyIHVzaW5nIGNyb3Nzb3Zlci5cclxuQHBhcmFtIHNjaGVtYSAtIFRoZSBkYXRhIG9iamVjdHMgdGhhdCBjYXIgb2JqZWN0cyBoYXZlIHN1Y2ggYXMgXCJ3aGVlbF9yYWRpdXNcIiwgXCJjaGFzc2lzX2RlbnNpdHlcIiwgXCJ2ZXJ0ZXhfbGlzdFwiLCBcIndoZWVsX3ZlcnRleFwiIGFuZCBcIndoZWVsX2RlbnNpdHlcIlxyXG5AcGFyYW0gbm9Dcm9zc292ZXJQb2ludCBpbnQgLSBUaGUgZmlyc3QgY3Jvc3NvdmVyIHBvaW50IHJhbmRvbWx5IGdlbmVyYXRlZFxyXG5AcGFyYW0gbm9Dcm9zc292ZXJQb2ludFR3byBpbnQgLSBUaGUgc2Vjb25kIGNyb3Nzb3ZlciBwb2ludCByYW5kb21seSBnZW5lcmF0ZWQgXHJcbkBwYXJhbSBjYXJObyBpbnQgLSB3aGV0aGVyIHRoaXMgY2FyIGlzIHRoZSBmaXJzdCBvciBzZWNvbmQgY2hpbGQgZm9yIHRoZSBwYXJlbnQgY2Fyc1xyXG5AcGFyYW0gcGFyZW50U2NvcmUgaW50IC0gVGhlIGF2ZXJhZ2Ugc2NvcmUgb2YgdGhlIHR3byBwYXJlbnRzXHJcbkBwYXJhbSBub0NhcnNDcmVhdGVkIGludCAtIFRoZSBudW1iZXIgb2YgY2FycyBjcmVhdGVkIHNvIGZhciwgdXNlZCBmb3IgdGhlIG5ldyBjYXJzIGlkXHJcbkBwYXJhbSBjcm9zc292ZXJUeXBlIGludCAtIFRoZSB0eXBlIG9mIGNyb3Nzb3ZlciB0byB1c2Ugc3VjaCBhcyAxIGZvciBPbmUgcG9pbnQgY3Jvc3NvdmVyIGFueSBvdGhlciBUd28gcG9pbnQgY3Jvc3NvdmVyXHJcbkByZXR1cm4gY2FyIE9iamVjdCAtIEEgY2FyIG9iamVjdCBpcyBjcmVhdGVkIGFuZCByZXR1cm5lZCovXHJcbmZ1bmN0aW9uIGNvbWJpbmVEYXRhKHBhcmVudHMsIHNjaGVtYSwgbm9Dcm9zc292ZXJQb2ludCwgbm9Dcm9zc292ZXJQb2ludFR3bywgY2FyTm8sIHBhcmVudFNjb3JlLG5vQ2Fyc0NyZWF0ZWQsIGNyb3Nzb3ZlclR5cGUpe1xyXG5cdHZhciBpZCA9IG5vQ2Fyc0NyZWF0ZWQrY2FyTm87XHJcblx0dmFyIGtleUl0ZXJhdGlvbiA9IDA7XHJcblx0cmV0dXJuIE9iamVjdC5rZXlzKHNjaGVtYSkucmVkdWNlKGZ1bmN0aW9uKGNyb3NzRGVmLCBrZXkpe1xyXG4gICAgICB2YXIgc2NoZW1hRGVmID0gc2NoZW1hW2tleV07XHJcbiAgICAgIHZhciB2YWx1ZXMgPSBbXTtcclxuICAgICAgZm9yKHZhciBpID0gMCwgbCA9IHNjaGVtYURlZi5sZW5ndGg7IGkgPCBsOyBpKyspe1xyXG4gICAgICAgIHZhciBwID0gY3Jvc3NvdmVyKGNhck5vLCBub0Nyb3Nzb3ZlclBvaW50LCBub0Nyb3Nzb3ZlclBvaW50VHdvLCBrZXlJdGVyYXRpb24sIGNyb3Nzb3ZlclR5cGUpO1xyXG4gICAgICAgIHZhbHVlcy5wdXNoKHBhcmVudHNbcF1ba2V5XVtpXSk7XHJcbiAgICAgIH1cclxuICAgICAgY3Jvc3NEZWZba2V5XSA9IHZhbHVlcztcclxuXHQgIGtleUl0ZXJhdGlvbisrO1xyXG4gICAgICByZXR1cm4gY3Jvc3NEZWY7XHJcbiAgICB9ICwge1xyXG5cdFx0aWQ6IGlkLFxyXG5cdFx0cGFyZW50c1Njb3JlOiBwYXJlbnRTY29yZVxyXG5cdH0pO1xyXG59XHJcblxyXG4vKlRoaXMgZnVuY3Rpb24gY2hvb3NlcyB3aGljaCBjYXIgdGhlIGRhdGEgaXMgdGFrZW4gZnJvbSBiYXNlZCBvbiB0aGUgcGFyYW1ldGVycyBnaXZlbiB0byB0aGUgZnVuY3Rpb25cclxuQHBhcmFtIGNhck5vIGludCAtIFRoaXMgaXMgdGhlIG51bWJlciBvZiB0aGUgY2FyIGJlaW5nIGNyZWF0ZWQgYmV0d2VlbiAxLTIsIGZpbHRlcnMgY2FycyBkYXRhIGlzIGJlaW5nIHRha2VuXHJcbkBwYXJhbSBub0Nyb3Nzb3ZlclBvaW50IGludCAtIFRoZSBmaXJzdCBjcm9zc292ZXIgcG9pbnQgd2hlcmUgZGF0YSBiZWZvcmUgb3IgYWZ0ZXIgdGhlIHBvaW50IGlzIHRha2VuXHJcbkBwYXJhbSBub0Nyb3Nzb3ZlclBvaW50VHdvIGludCAtIFRoZSBzZWNvbmQgY3Jvc3NvdmVyIHBvaW50IHdoZXJlIGRhdGEgaXMgYmVmb3JlIG9yIGFmdGVyIHRoZSBwb2ludCBpcyB0YWtlblxyXG5AcGFyYW0ga2V5SXRlcmF0aW9uIGludCAtIFRoaXMgaXMgdGhlIHBvaW50IGF0IHdoaWNoIHRoZSBjcm9zc292ZXIgaXMgY3VycmVudGx5IGF0IHdoaWNoIGhlbHAgc3BlY2lmaWVzIHdoaWNoIGNhcnMgZGF0YSBpcyByZWxhdmVudCB0byB0YWtlIGNvbXBhcmluZyB0aGlzIHBvaW50IHRvIHRoZSBvbmUvdHdvIGNyb3Nzb3ZlIHBvaW50c1xyXG5AcGFyYW0gY3Jvc3NvdmVUeXBlIGludCAtIFRoaXMgc3BlY2lmaWVzIGlmIG9uZSBwb2ludCgxKSBvciB0d28gcG9pbnQgY3Jvc3NvdmVyKGFueSBpbnQpIGlzIHVzZWRcclxuQHJldHVybiBpbnQgLSBXaGljaCBwYXJlbnQgZGF0YSBzaG91bGQgYmUgdGFrZW4gZnJvbSBpcyByZXR1cm5lZCBlaXRoZXIgMCBvciAxKi9cclxuZnVuY3Rpb24gY3Jvc3NvdmVyKGNhck5vLCBub0Nyb3Nzb3ZlclBvaW50LCBub0Nyb3Nzb3ZlclBvaW50VHdvLGtleUl0ZXJhdGlvbixjcm9zc292ZXJUeXBlKXtcclxuXHRpZihjcm9zc292ZXJUeXBlPT09MSl7IC8vcnVuIG9uZS1wb2ludCBjcm9zc292ZXJcclxuXHRcdHJldHVybiAoY2FyTm89PT0xKT8oa2V5SXRlcmF0aW9uPj1ub0Nyb3Nzb3ZlclBvaW50KT8wOjE6KGtleUl0ZXJhdGlvbj49bm9Dcm9zc292ZXJQb2ludCk/MTowOy8vIGhhbmRsZXMgdGhlIGZpeGVkIG9uZS1wb2ludCBzd2l0Y2ggb3ZlclxyXG5cdH1cclxuXHRlbHNlIHsgLy9ydW4gdHdvLXBvaW50IGNyb3Nzb3ZlclxyXG5cdFx0aWYoY2FyTm89PT0xKXtcclxuXHRcdFx0aWYoKChrZXlJdGVyYXRpb24+bm9Dcm9zc292ZXJQb2ludCkmJihrZXlJdGVyYXRpb248bm9Dcm9zc292ZXJQb2ludFR3bykpfHwoKGtleUl0ZXJhdGlvbj5ub0Nyb3Nzb3ZlclBvaW50VHdvKSYmKGtleUl0ZXJhdGlvbjxub0Nyb3Nzb3ZlclBvaW50KSkpe1xyXG5cdFx0XHRcdHJldHVybiAwO1xyXG5cdFx0XHR9XHJcblx0XHRcdGVsc2UgeyByZXR1cm4gMTt9XHJcblx0XHR9XHJcblx0XHRlbHNle1xyXG5cdFx0XHRpZigoKGtleUl0ZXJhdGlvbj5ub0Nyb3Nzb3ZlclBvaW50KSYmKGtleUl0ZXJhdGlvbjxub0Nyb3Nzb3ZlclBvaW50VHdvKSl8fCgoa2V5SXRlcmF0aW9uPm5vQ3Jvc3NvdmVyUG9pbnRUd28pJiYoa2V5SXRlcmF0aW9uPG5vQ3Jvc3NvdmVyUG9pbnQpKSl7XHJcblx0XHRcdFx0cmV0dXJuIDE7XHJcblx0XHRcdH1cclxuXHRcdFx0ZWxzZSB7IHJldHVybiAwO31cclxuXHRcdH1cclxuXHR9XHJcbn1cclxuXHJcbi8qVGhpcyBmdW5jdGlvbiByYW5kb21seSBnZW5lcmF0ZXMgdHdvIGNyb3Nzb3ZlciBwb2ludHMgYW5kIHBhc3NlcyB0aGVtIHRvIHRoZSBjcm9zc292ZXIgZnVuY3Rpb25cclxuQHBhcmFtIHBhcmVudHMgT2JqZWN0QXJyYXkgLSBBbiBhcnJheSBvZiB0aGUgcGFyZW50cyBvYmplY3RzXHJcbkBwYXJhbSBjcm9zc292ZXJUcHllIGludCAtIFNwZWNpZmllZCB3aGljaCBjcm9zc292ZXIgc2hvdWxkIGJlIHVzZWRcclxuQHBhcmFtIHNjaGVtYSAtIENhciBvYmplY3QgZGF0YSB0ZW1wbGF0ZSB1c2VkIGZvciBjYXIgY3JlYXRpb25cclxuQHBhcmFtIHBhcmVudFNjb3JlIGludCAtIEF2ZXJhZ2UgbnVtYmVyIG9mIHRoZSBwYXJlbnRzIHNjb3JlXHJcbkBwYXJhbSBub0NhcnNDcmVhdGVkIGludCAtIG51bWJlciBvZiBjYXJzIGNyZWF0ZWQgZm9yIHRoZSBzaW11bGF0aW9uXHJcbkBwYXJhbSBub0NhcnNUb0NyZWF0ZSBpbnQgLSB0aGUgbnVtYmVyIG9mIG5ldyBjYXJzIHRoYXQgc2hvdWxkIGJlIGNyZWF0ZWQgdmlhIGNyb3Nzb3ZlclxyXG5AcmV0dXJuIGNhciBPYmplY3RBcnJheSAtIEFuIGFycmF5IG9mIG5ld2x5IGNyZWF0ZWQgY2FycyBmcm9tIHRoZSBjcm9zc292ZXIgYXJlIHJldHVybmVkKi9cclxuZnVuY3Rpb24gcnVuQ3Jvc3NvdmVyKHBhcmVudHMsY3Jvc3NvdmVyVHlwZSxzY2hlbWEsIHBhcmVudHNTY29yZSxub0NhcnNDcmVhdGVkLCBub0NhcnNUb0NyZWF0ZSl7XHJcblx0dmFyIG5ld0NhcnMgPSBuZXcgQXJyYXkoKTtcclxuXHR2YXIgY3Jvc3NvdmVyUG9pbnRPbmU9Z2V0UmFuZG9tSW50KDAsNCwgbmV3IEFycmF5KCkpO1xyXG5cdHZhciBjcm9zc292ZXJQb2ludFR3bz1nZXRSYW5kb21JbnQoMCw0LCBbY3Jvc3NvdmVyUG9pbnRPbmVdKTtcclxuXHRmb3IodmFyIGk9MDtpPG5vQ2Fyc1RvQ3JlYXRlO2krKyl7XHJcblx0XHRuZXdDYXJzLnB1c2goY29tYmluZURhdGEocGFyZW50cyxzY2hlbWEsIGNyb3Nzb3ZlclBvaW50T25lLCBjcm9zc292ZXJQb2ludFR3bywgaSwgcGFyZW50c1Njb3JlLG5vQ2Fyc0NyZWF0ZWQsY3Jvc3NvdmVyVHlwZSkpO1xyXG5cdH1cclxuXHRyZXR1cm4gbmV3Q2FycztcclxufVxyXG5cclxuLypUaGlzIGZ1bmN0aW9uIHJldHVybnMgd2hvbGUgaW50cyBiZXR3ZWVuIGEgbWluaW11bSBhbmQgbWF4aW11bVxyXG5AcGFyYW0gbWluIGludCAtIFRoZSBtaW5pbXVtIGludCB0aGF0IGNhbiBiZSByZXR1cm5lZFxyXG5AcGFyYW0gbWF4IGludCAtIFRoZSBtYXhpbXVtIGludCB0aGF0IGNhbiBiZSByZXR1cm5lZFxyXG5AcGFyYW0gbm90RXF1YWxzQXJyIGludEFycmF5IC0gQW4gYXJyYXkgb2YgdGhlIGludHMgdGhhdCB0aGUgZnVuY3Rpb24gc2hvdWxkIG5vdCByZXR1cm5cclxuQHJldHVybiBpbnQgLSBUaGUgaW50IHdpdGhpbiB0aGUgc3BlY2lmaWVkIHBhcmFtZXRlciBib3VuZHMgaXMgcmV0dXJuZWQuKi9cclxuZnVuY3Rpb24gZ2V0UmFuZG9tSW50KG1pbiwgbWF4LCBub3RFcXVhbHNBcnIpIHtcclxuXHR2YXIgdG9SZXR1cm47XHJcblx0dmFyIHJ1bkxvb3AgPSB0cnVlO1xyXG5cdHdoaWxlKHJ1bkxvb3A9PT10cnVlKXtcclxuXHRcdG1pbiA9IE1hdGguY2VpbChtaW4pO1xyXG5cdFx0bWF4ID0gTWF0aC5mbG9vcihtYXgpO1xyXG5cdFx0dG9SZXR1cm4gPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAobWF4IC0gbWluICsgMSkpICsgbWluO1xyXG5cdFx0aWYodHlwZW9mIG5vdEVxdWFsc0FyciA9PT0gXCJ1bmRlZmluZWRcIil7XHJcblx0XHRcdHJ1bkxvb3A9ZmFsc2U7XHJcblx0XHR9XHJcblx0XHRlbHNlIGlmKG5vdEVxdWFsc0Fyci5maW5kKGZ1bmN0aW9uKHZhbHVlKXtyZXR1cm4gdmFsdWU9PT10b1JldHVybjt9KSE9PXRvUmV0dXJuKXtcclxuXHRcdFx0cnVuTG9vcD1mYWxzZTtcclxuXHRcdH1cclxuXHR9XHJcbiAgICByZXR1cm4gdG9SZXR1cm47Ly8odHlwZW9mIGZpbmRJZkV4aXN0cyA9PT0gXCJ1bmRlZmluZWRcIik/dG9SZXR1cm46Z2V0UmFuZG9tSW50KG1pbiwgbWF4LCBub3RFcXVhbHNBcnIpO1xyXG59XHJcbiIsIm1vZHVsZS5leHBvcnRzPXtcIm5hbWVcIjpcIm9iamVjdHNcIixcImFycmF5XCI6W3tcImlkXCI6XCIwLmhkZjVxbjd2cm1cIixcIndoZWVsX3JhZGl1c1wiOlswLjU3Njc2OTA4MjQ3MjEyNDgsMC40MTc3Mjg2MTU0NDc2ODM2XSxcIndoZWVsX2RlbnNpdHlcIjpbMC4wNTgwNTgyODQ5OTMyMjc2MywwLjU1NTg0ODUwMjkyMTgyMTZdLFwiY2hhc3Npc19kZW5zaXR5XCI6WzAuMDE3NDY5MjI0ODI4MzA2MTVdLFwidmVydGV4X2xpc3RcIjpbMC43OTQxNTQ2MDI3NTMxNzk0LDAuMzM4NjEwNTgzMTM0MTgzNDYsMC45ODE3OTY2NzI3MzUwODg2LDAuMDQwNTgzOTE4OTkwMzk0NzEsMC42NzkyNzY0ODQwMDg0NTc3LDAuNzA5NTUxNjgzMzQyOTg2OSwwLjQ0NDI5Mjk2ODk3ODYwMzcsMC4zNzE1OTcwOTYzMzk3ODE0NCwwLjQ4NjU1NDkxMzg5ODA3MzE1LDAuODE5NDg5NzQzNDY3OTk0OSwwLjA2NzkxMjkyNzYyOTIyMjUyLDAuODUwMDYxNzE4Nzk4MTIwMV0sXCJ3aGVlbF92ZXJ0ZXhcIjpbMC4zMTk3NDU0ODMzODA0ODA1LDAuMDczMDY4MzI1NTM0NDM1MzIsMC45Njk2NjgwMjIxMzIxOTE4LDAuMjgyNDI5MTQ0NjI4ODY4NSwwLjIzODAxMDg0MzUzNTYyNjMsMC4wMzQyMDE2MzY1Mjg1MDAwNiwwLjM5MzAyMDQ0Nzg0OTQwMTUsMC45MjkyNTg5MDI2MTY4NjA1XSxcImluZGV4XCI6MH0se1wiaWRcIjpcIjAuZGR2cW85YzR1NVwiLFwid2hlZWxfcmFkaXVzXCI6WzAuMDc2MjczMTE2NTM2OTAzMDUsMC4zODA3NzU2NTgyNDcwNjM4M10sXCJ3aGVlbF9kZW5zaXR5XCI6WzAuMDE4NjM2OTc4ODEwODY0NjgsMC4wMjY4NjQzNjE3ODkzMTAyODddLFwiY2hhc3Npc19kZW5zaXR5XCI6WzAuNzA0NTU2ODU5Njk2OTgxOF0sXCJ2ZXJ0ZXhfbGlzdFwiOlswLjg4Mjc4MzY3Mzg0NTE0MTMsMC40MTkwNjE3NDkzNDk5OTg0LDAuMDE3MTQ3NjI2ODQ0NDE3MDYzLDAuMjI3NzU1MzUzNDUyNTIwMywwLjkzOTE4NTIzMDA1NjIzOTEsMC40MTYyMzUzNTA0NzQ3OTk3NiwwLjY2Nzg3NDI5NjY1NTQyMywwLjMxODQ5MzYwOTI5ODQyMjMsMC44ODU2MDE3OTIyNjMyMTQsMC4xMzQ2NTM5ODExNjIzOTY4LDAuMzIyMzg1MzAzODcyNDg4LDAuMTYxNDA3NDcyMzk2OTAxXSxcIndoZWVsX3ZlcnRleFwiOlswLjE3MjA2NjI1MTY3MTgyNTQzLDAuMjg2NDMwNjI3NzUwMjA2MiwwLjkzODUxMzg4NTkzODk2MTcsMC43MTIwNTE2MzQ2Nzg5NzAzLDAuNDc2ODE4NDE3NzYzMDEyMTUsMC45NTczNDIwMDU3MzcxNjE1LDAuMzQ3Nzk2NTc2MDM0MTkwNTYsMC40OTQyNDI4MDAxMzY5NTAxXSxcImluZGV4XCI6MX0se1wiaWRcIjpcIjAuaTU4ZWljdW9ncFwiLFwid2hlZWxfcmFkaXVzXCI6WzAuODc5Nzc0MjIwMjc5MzY5MiwwLjQ5NDYwOTAwNDE3MDE2NjNdLFwid2hlZWxfZGVuc2l0eVwiOlswLjY5MDc3MTU3MDAyMzk1NjMsMC4zNTQzMjk4NDk5MzU2MTU1Nl0sXCJjaGFzc2lzX2RlbnNpdHlcIjpbMC45OTcxMDk3NjM5MzU4NTk3XSxcInZlcnRleF9saXN0XCI6WzAuMzM1NTkzOTc2Njc5NTY4NiwwLjM2NzcwMzU2MTYxMjA5OTYsMC4yNTIyMTAxNzQwODEzMTQ3NCwwLjYwNDIxMzU3MTgxNjQzNSwwLjE0MzAzMDM2OTc2NTE3NDcsMC42NzA3NDE0NTM4NTAxMzQ0LDAuNzk3NjQxMDc5MDU4NTc5NywwLjAwMzMwNDAxOTMxNTc1ODI5OTgsMC40ODIyNTg2NDUwMDUzMDAzNiwwLjk3MjI0NjM0OTA3Mzk4NjMsMC4xMzMyNjY4NTE5MDYxODgxNCwwLjI0NTExODYzNjgxODYzMjY2XSxcIndoZWVsX3ZlcnRleFwiOlswLjkxMzQ2MzI1NzY3NjMzNTUsMC44MDI4NTU3MTc5MjMxMzUzLDAuMDY1MjA4ODc2MDIwMDI2NDUsMC41MDA4Nzg0ODQxNzUzNDE4LDAuMjk2NjA4MjI5NjQ5Mjk3MzQsMC44MjY4ODQ3OTcwNDk5MzMzLDAuNzAzNTEwNzcyNjc2ODc3OSwwLjAyMDE0OTE1NjcyMDMxMTE0NV0sXCJpbmRleFwiOjJ9LHtcImlkXCI6XCIwLmd1dGo3NmE4OGZcIixcIndoZWVsX3JhZGl1c1wiOlswLjkyOTMyMjkxNzk4MjE5ODUsMC4xNDA5NjAxODgwNjQyOTcyMl0sXCJ3aGVlbF9kZW5zaXR5XCI6WzAuOTYxMDY2ODc0MTc4NDQ1MiwwLjEyOTE4OTM1MDQ1NTQ0NjIyXSxcImNoYXNzaXNfZGVuc2l0eVwiOlswLjQ0MTI5Mzg2MTI3NzQ3NzNdLFwidmVydGV4X2xpc3RcIjpbMC41MDk2NjYyODUzOTAxMjcsMC4wNDQwNDI0NzAzNzE4ODM4LDAuMzIzNTU1MTQ2MTU0ODEwOTYsMC41MDI4NTYwNDkxNDY3ODM3LDAuODg1NTUyNTYxMTg0Njg4NiwwLjY2MzQ3NDc2MzM5MDg4MTcsMC4wNTM3MjAxMzU0Nzk3MjUyMDYsMC4wMzkzOTkxOTExMzQ3MzU3OCwwLjg2NTkxMzA0Nzk5ODgwMzMsMC41MjkyNjEwMTkxMTU1NzkzLDAuMjU4NDQ5NzQ0MTE3MzM5NDUsMC4xNTY3NDk1MzU5MzMwNTg2M10sXCJ3aGVlbF92ZXJ0ZXhcIjpbMC4xMDkyMjUyOTc5ODU0Njc1NCwwLjg2OTc2NzA3NTA0NjEyNjgsMC44MzA4MDc5NDU5ODc3MzEzLDAuNjM4MzEwMjc2NjE5NzUyOCwwLjcwOTk5Njk4NTgwOTYyOTYsMC41Mzg5NTA5NzQ1MTExNDIzLDAuODk3ODM3NjMzMTk2MTEyOSwwLjY0MjA2NjQ1MDEwODU4ODRdLFwiaW5kZXhcIjozfSx7XCJpZFwiOlwiMC5zMHFiOGdkMXVrOFwiLFwid2hlZWxfcmFkaXVzXCI6WzAuNzIxOTg2NTk0MTA1MDAwMywwLjg3NDkyMjg3NjQ4OTg2MjddLFwid2hlZWxfZGVuc2l0eVwiOlswLjg4ODg4MjczMTk3MzQ0NjcsMC4zNjMzNzgwOTcyMjg0ODE3XSxcImNoYXNzaXNfZGVuc2l0eVwiOlswLjc4MTE1MTQzNDE3ODg5NzJdLFwidmVydGV4X2xpc3RcIjpbMC4wNzEwMjk4MjUxOTAyMjI2LDAuMDQ3Nzc4Mzk5MjE3NjA3OTYsMC4xMzI1ODg4Mzg4OTkzODA1NiwwLjk3NjY2NDc2NzMzMDY4NTYsMC41NDAwMzk5MzM2NzI1NzA3LDAuMDA5NDkwMzAzMjcxNTgxODQ2LDAuNjEwNTYxODM0NTI5MzYwMiwwLjMwNzY5Njg0MDY0NjI4OTQ0LDAuOTUzNjgyMjEzMDM2MTM3NSwwLjY2MDg5NjA5ODE1NzM4NzMsMC4zODc4ODc2Njg0MTIzNTM1NiwwLjE0Njk4MjExMjczNTE1MTE2XSxcIndoZWVsX3ZlcnRleFwiOlswLjQ1Nzk2MDU1Mzk4MTE5NzA2LDAuNTA4MjM4NDAwNTM4NzkxNCwwLjY5MTAwNzA2MzczMzk1MjcsMC40OTQ5MTQ4MDU3NjE5NTA1NywwLjAxNzU2NDk4MzA1NjY2OTUzNiwwLjkwMDQxODcxMjE5MzkyMzYsMC45NTA4ODgxNDk0NDM3NzgsMC4zMTQ1NzcxODc5OTgzMTM5XSxcImluZGV4XCI6NH0se1wiaWRcIjpcIjAuYW01MHNrZmlmdjhcIixcIndoZWVsX3JhZGl1c1wiOlswLjQzNzE3ODIxNTE3MDUwMTcsMC4xNjkzNDQwNzUyODY2OTU5M10sXCJ3aGVlbF9kZW5zaXR5XCI6WzAuNTE1NTYxNTUzMDM4MjQ0NSwwLjM3NDYzOTg2MjY1NTg0ODddLFwiY2hhc3Npc19kZW5zaXR5XCI6WzAuOTc3NzgzMTAxMDM5ODU3OV0sXCJ2ZXJ0ZXhfbGlzdFwiOlswLjQyMTgyNTQzMzI5MTg0MDMsMC4xMzQwMjk5MTk3OTc5ODU5NSwwLjU2Nzk1MjM4MzM4MDQyNjEsMC45OTg2MzYwNDU0NzEyMTMxLDAuMTM3MDIyNjUyOTA0OTcxNCwwLjY4NjYyMjY3MjM5OTQzMDksMC4yMTA4NTA2NjcyMjg1ODE0OCwwLjExMjAxMjgxMDM2MzQ3ODU0LDAuNjQ1ODg2ODA4Mzg5NjI0MywwLjc2ODYzNDkxNzkxOTI1OTUsMC41NjMxMjc5NDEwODMzMDc3LDAuODkyOTUyNzg3MDI3NzM5NF0sXCJ3aGVlbF92ZXJ0ZXhcIjpbMC4zMjAxMzAwNDYzMzkzMTAyLDAuNzg4MTMwNDc4NTI5NzY2OSwwLjE5OTQ2MjI2NjM4NzA5NTMsMC41MzYxMzEyNDcwNzkwNTIyLDAuOTM3Mjg0NDcwNDMyNzA3NywwLjYwMjk1NjYxMDkyMDc5MzEsMC42NjU0OTU5OTIwMzkxODIxLDAuMjU0NDA3NTYwNzkyMDkxN10sXCJpbmRleFwiOjV9LHtcImlkXCI6XCIwLm1qY2c5ZmVtYW5nXCIsXCJ3aGVlbF9yYWRpdXNcIjpbMC42MDc1Mjg2MTc4OTk2MzM1LDAuMDI4OTMyMzUwODc4Mjk5OTNdLFwid2hlZWxfZGVuc2l0eVwiOlswLjY4ODExNzEwODkyMDU1NDksMC4zNjgxMzY5MDMwNTE3NzYyN10sXCJjaGFzc2lzX2RlbnNpdHlcIjpbMC45MTk0NzQzNjY3OTQ3OTMxXSxcInZlcnRleF9saXN0XCI6WzAuOTA0NTY2NjkwODEzMjg4MSwwLjAzMTcwMTQ0OTMwNDc4MDI1LDAuMzMzODQxMzAwMjEzNzQwNiwwLjc4NDgxNzAzODU0MDgyNjYsMC44ODMyNDA3NzcyMjQyODE2LDAuODI2NTMzNDcxODc2OTE0NCwwLjk2Mjk2OTU1MzEyNDQyMjksMC4yNzM2MDQxNDAyMDkyMTkxLDAuODA4ODA4NzQ0OTc2MzgwMSwwLjQxMDc2MTA3MzEyNzk0NTYzLDAuODIxNzk5NjYzMzY3OTcwNSwwLjE0ODM3MDIzNjUyMzE3MzZdLFwid2hlZWxfdmVydGV4XCI6WzAuMTE0ODA3ODE3NDM1MTMxMDIsMC4xNjk3MzY4OTk0OTc3MTczLDAuMjI5ODY0MTU5MjIwNTQ1MjYsMC45NTExNTM2NTQ2Mzc1MzU3LDAuNzgwOTIzMTI5MjM5MTQ1LDAuNzkxMDI2ODM4OTY2MzgyOCwwLjM0NTYxMDM0NjQ3NzYyNzcsMC45NjEzODU5Nzc2NTI3OTA3XSxcImluZGV4XCI6Nn0se1wiaWRcIjpcIjAuaWRmanZlNmY4dDhcIixcIndoZWVsX3JhZGl1c1wiOlswLjU0MTE1NTk1ODE0OTUxNzMsMC40NDEyNTA1MzA0ODA4OTA0N10sXCJ3aGVlbF9kZW5zaXR5XCI6WzAuMjU5MDk4NzU0OTI4MjYyODQsMC40NzAyMTM5OTA2OTQ1NjMyN10sXCJjaGFzc2lzX2RlbnNpdHlcIjpbMC4zNjEzNzI4MjAyMjg1MDE2XSxcInZlcnRleF9saXN0XCI6WzAuNDEwMjEzOTE1NDQyNjkzMTQsMC45ODgxOTMyOTY5NzY5NTg5LDAuNDk4NDcxMTQ4NTk1NTQ4ODYsMC4zNzMxOTc2ODc2ODgwNTk4MywwLjAwNTAwMjUxMzQ3NzkyOTkwNCwwLjQ4OTkzOTk0NTUwNzM3Njc0LDAuOTY3Mjc1NjgyNDAxMTY4MSwwLjYxMDkyNzExNzM5MjcsMC42Njk4MDE0NzUxMjM4ODcyLDAuOTk3MzY5MDI4MDk1MDA2NywwLjE5NDQzNjMyODY5NDQ2MjE1LDAuMDQ3NjU4NDcwNTUwNDU0MTM1XSxcIndoZWVsX3ZlcnRleFwiOlswLjI4NjQyNzA3NDQ4MDU0ODYsMC4xOTA0MDA4MzgwNjExMjg2MiwwLjc3MTk1NDc2MTgyMDc2NzYsMC4zMTMwNjg4MDIzOTkyNDIzLDAuNTUyOTkxNjM2NDI1OTIwMiwwLjkxMzM0MzQ4MDgzNzY2MTksMC40NzExNTI5MDYyMjY2ODg2LDAuODg3MTM2MDI0ODIxMDM5OF0sXCJpbmRleFwiOjd9LHtcImlkXCI6XCIwLjlrZXY3ZWVmcDNcIixcIndoZWVsX3JhZGl1c1wiOlswLjI5ODMxNTI3MzA0ODU4MTYzLDAuNzU0NDg5NTcxNjA4NzYwNV0sXCJ3aGVlbF9kZW5zaXR5XCI6WzAuMTk4MTg3Nzk4ODM1NjY4NCwwLjcwMTc0MDcxMjMyMjczNTVdLFwiY2hhc3Npc19kZW5zaXR5XCI6WzAuMTI2OTgwMDIxMTk3MjM2MDZdLFwidmVydGV4X2xpc3RcIjpbMC45MTg5MjgzMjQzNjQ0MjI4LDAuNjcxMTQxNjM3ODY3MzAyNSwwLjUwNzk0MTkyODk3OTkzNTQsMC42MTgxMDM2NDg0MjQ0MjQ0LDAuOTQ3OTY5NTY2MjIzOTQxMSwwLjI2OTczMzUzOTM4OTU2MzQ2LDAuNzc1NjUxMzU4ODkyMjk4LDAuODc1NjE2OTIzMzI5MzkwNywwLjA1NzcyNjAyNjc4ODExNTY3LDAuMjU1NDk1MDc3MzY5Mjg2OCwwLjczOTg2NDE2MzgxMDYyMDMsMC43MTE2ODY3NjQwMDM3NDc0XSxcIndoZWVsX3ZlcnRleFwiOlswLjEzMjExMDg4MjM5MjEzMTUzLDAuMDI3MDQyNDY0NjAzMzc2MDA0LDAuMDAyNzA0NjAyMjQ4NDgyNjc5MywwLjkxODg5MDg0MTIwNDcxMjgsMC4xMjczNDkzNzMzMDM0NjY5NiwwLjYzMTI0MDkxMzk3ODU3ODYsMC41NDU4MzYxMTQzNDgzNzcyLDAuNDIwMjc4MDEyMzAzNzcwOF0sXCJpbmRleFwiOjh9LHtcImlkXCI6XCIwLjk0b3YxaXZ2ZDFnXCIsXCJ3aGVlbF9yYWRpdXNcIjpbMC40MjE3NDU0ODY1NTY4NTQ2LDAuMTQ5MzA0NjI4Njc3Mzc3Nl0sXCJ3aGVlbF9kZW5zaXR5XCI6WzAuMTU3ODAwMTQ1Mzk3ODU3NDcsMC42MzQ5Mzg3OTA5MTAzOTA3XSxcImNoYXNzaXNfZGVuc2l0eVwiOlswLjI2MTEwMTUwODIwMjIwODFdLFwidmVydGV4X2xpc3RcIjpbMC4xNjE0MDU2MTk4MTE1MDY4LDAuNzA3MzM4NTMwODgzMTQ4MSwwLjg4NjU3NzUyMDQwNTk5MjUsMC4zODU5Mjk1OTU3MjI2ODE4LDAuMDA2MzIzNzQxNDkwNzIyOTAxLDAuNTYwMDcxNzE2MDMzODIyMiwwLjcxNTA4Mjg1ODQzNDQ0MDQsMC40NjQ1NDUxNTUzNDgzNzUyNiwwLjA4Nzg3MTE2OTA3MTU2NzIyLDAuNzQ4MjcyNjQyNDM4MTM4MywwLjYwMDczMzQwNzkxOTE4NjgsMC4zMTI3MTE4NzEwMzIyODg3XSxcIndoZWVsX3ZlcnRleFwiOlswLjI0MzYyMjgzNTc4MTExMzIsMC44NzcwOTkwMzY3Mzg4NDgzLDAuNTU2MzMyNDUxODUzODM5NSwwLjIxNTgwMDU3ODU2OTE4NywwLjc5NDc3NDE5MzY2Nzk1MzEsMC43NDUzMTQ3Mjk0NzQyNjA0LDAuNzMyNjY1NTA1MDEwNDk1MSwwLjgxMjU0MzM3NDcwNzM3MDldLFwiaW5kZXhcIjo5fSx7XCJpZFwiOlwiMC5ldXYzY2hmY29nXCIsXCJ3aGVlbF9yYWRpdXNcIjpbMC41MDYxODAxOTI1OTA5MDgsMC40MDc0MzAxMjQ4MDIzMjcxXSxcIndoZWVsX2RlbnNpdHlcIjpbMC4yMjgxOTM4NzA4ODUyNjc1NSwwLjIwMzg4NDA3OTk3OTcwMDgyXSxcImNoYXNzaXNfZGVuc2l0eVwiOlswLjk4NjgwOTg0OTk4Mjk3MzhdLFwidmVydGV4X2xpc3RcIjpbMC44OTAxMTA0OTE2MjIxNzk0LDAuMDM4MjQ2MDUzNjIzODQyNywwLjAxMjQ3NjIxNzc1MTg5MDQ1LDAuMzE5ODIzOTM3NTM5MDAwNCwwLjI0NjE0MjYxNzAyNTg0MTE3LDAuNjYxMjE0MjA1NjEwODk1LDAuMjA4ODc4NjE0MDcxNzkzNzYsMC4zMDcyNDQyNzIzNTIzNDg3NSwwLjY5MDY0Nzc5OTMyMTk0NzEsMC4xMzQyMDMyODI2MTA0NTI0NSwwLjU1NjIwNTc2NjM5MjUwNjQsMC41NjM2OTEyMzM2MDYwNzEzXSxcIndoZWVsX3ZlcnRleFwiOlswLjI3MjkyOTQwMzE1ODI3OTg1LDAuODExNjY5NDgxMTA0OTk5NCwwLjM0MzA1NDI3MDgxMjY3NjI1LDAuNzM3NzkwMzcwOTI2Mzk4LDAuNzE0NDA0OTYzMjA1MTk3NiwwLjQxMzY1NTM0OTI4MjI5NTQsMC45MDY1Nzg4NjUwNjY5NDg2LDAuMjY3MzQzNjY4NDIyMDQ2N10sXCJpbmRleFwiOjEwfSx7XCJpZFwiOlwiMC4zdDczcjA4OTg3OFwiLFwid2hlZWxfcmFkaXVzXCI6WzAuMzM0MzQ3NzgyMzYwODE4OTcsMC4zMzExMDc1MDA0NDcyODkyXSxcIndoZWVsX2RlbnNpdHlcIjpbMC4xNDgyNjUxMDg4Nzc1MjA2NSwwLjc0ODc0MDA1NzcwMTg2OV0sXCJjaGFzc2lzX2RlbnNpdHlcIjpbMC4wOTY4Njk2NDc3ODA1OTU0OF0sXCJ2ZXJ0ZXhfbGlzdFwiOlswLjE3MzQ1MTg5MDk3MzM1OCwwLjk1NDk1Nzg1MzUwNDQ4NiwwLjEyOTY5MDEyMzg4NjM5MzY3LDAuODA5MzQ0MDA0OTU3OTc1OSwwLjIwNjYyMTcwMjIzNjMzMjM2LDAuNTk1NzQ3NTQ5NDMwODM2OSwwLjEyMDkzMDkzNjQ0NjI3NjczLDAuMjM4Mjc2Nzg1MTU0MDY0MTQsMC44NzgyMzY5NzcxNTUwNTkxLDAuMTg3OTM5NzI0NDA5MDIxNzQsMC41MzQwMjQ5ODQ0NjEyNzc0LDAuNjc0NjkzNjI1NTg5NjQyM10sXCJ3aGVlbF92ZXJ0ZXhcIjpbMC43NzM3NDUyODI4NTY1NTI4LDAuMjE3OTczMjcwNDIyMzEyMywwLjY0MzM5MjYxMjY5MzMyMjcsMC4wNTU5NzM5OTEyODg2MzIxMiwwLjgzNjQ5MDkyMDEwMjgwODEsMC41NTk0MjY2MzY4NTQwODg4LDAuNDgwMjY4OTI2NzE3MzYzNjUsMC4xMzI4NjMzODU0NDc0NTkwMV0sXCJpbmRleFwiOjExfSx7XCJpZFwiOlwiMC5vdHA0bWhnZmZsZ1wiLFwid2hlZWxfcmFkaXVzXCI6WzAuMzA5NjcyMzg5MDg5OTA3NiwwLjMyNzA5MDU4NDU4NjI1MzVdLFwid2hlZWxfZGVuc2l0eVwiOlswLjk1MTk3OTc3Nzk0NzA2NTgsMC40ODI0NjU5MTI3OTQ4Njk0XSxcImNoYXNzaXNfZGVuc2l0eVwiOlswLjUwODg0OTUxMzk3MTYzNF0sXCJ2ZXJ0ZXhfbGlzdFwiOlswLjA1Mzg1MDc2ODA0ODIxMDMyLDAuNDcyNDYxNTc2OTc1NDU3MiwwLjQ3NTkxODc2MDc1NzE5OTMsMC44NDA0MzkyMTAzOTA0Njk0LDAuNjA2ODAzOTE4NDA1Njk4NiwwLjI0NTA2MDM3OTU3NjI0NTE2LDAuNzg5MDU4MzU5MTA5NzIxOCwwLjQyODA3MjczNDgyODUwMTQsMC45MTQzMDgzOTk4MTQ3NDMsMC4wMTY2NzkyNDU3ODYzNTA0OTQsMC4wMjM1OTczNjU5MjI3OTQxNTYsMC41NDcyMTUwNDc4Mjk2NTI1XSxcIndoZWVsX3ZlcnRleFwiOlswLjk2ODEzMjU0NzEwODY5MjMsMC44NDQwNTkyODA0ODMyNDM2LDAuNTYzMzA0Mzg4NzU3Mjk1MywwLjM4NjU5OTk3MTkwNTczMTE0LDAuOTQ1NzI1Njk3NjgwMjA3MywwLjE1Njg5NTk1NzQ2ODM4NDM2LDAuNTQ1OTkwMzI4MTA2MzQ0MywwLjY4MzQ3NjY2MDE2NDMzNDFdLFwiaW5kZXhcIjoxMn0se1wiaWRcIjpcIjAubTcyY204Z2xjaVwiLFwid2hlZWxfcmFkaXVzXCI6WzAuNDkyMTE5MDIwNTcwMjU1NywwLjk3MzAxMjMxMjIxODc0NDhdLFwid2hlZWxfZGVuc2l0eVwiOlswLjYxMzg3MzExMDc2MjIyNzEsMC44MDE4ODgyNjA3NDA3N10sXCJjaGFzc2lzX2RlbnNpdHlcIjpbMC4yNzMzNjM2NjIyMTI2NTQ5Nl0sXCJ2ZXJ0ZXhfbGlzdFwiOlswLjQ4NjczMzc5MzcxMzQ3NzI1LDAuNTYxNjYzOTQyMTE4NjgwOSwwLjY2NTI2Mjg2NzU0NTM3MzMsMC41MjExMjc4Njk0ODMwOTUsMC44ODI2MjM2NjgwMjgzNzE0LDAuNzcyNDM3MDE1OTY3MTk2MywwLjUzMjg1NDM2NDMwMTQ4NzQsMC40ODI4OTk0NTM5NTAzMTk3NSwwLjcwMTExMjg5Mzk5ODU4NDUsMC45NDA3OTE5Mzc0OTU5MTMzLDAuNTE5Njc1ODAxNjI2ODE0NCwwLjI2MjE0NjA3NzMyNjIyNTYzXSxcIndoZWVsX3ZlcnRleFwiOlswLjAyNjk2ODAzNzEzNTIyODc3MywwLjgwNzgxMTUwOTA0Njg3NzgsMC4xMTU2Nzg3MTY5NDk5ODA0NCwwLjI4ODc2NTMxNTIyMTA0ODEsMC4xMDg3MTYzNjE2OTczNTY1NCwwLjI5MDA1ODMxMDM4NDE1Njk3LDAuOTcwNTIwODI4NTg1NjM5NSwwLjg1MjE2OTk2MzI3NjIzMDVdLFwiaW5kZXhcIjoxM30se1wiaWRcIjpcIjAuOWhqdXEwdmFyazhcIixcIndoZWVsX3JhZGl1c1wiOlswLjczNzc3NDIyNzI0MjQ2MDYsMC4yNzc2NjQxOTcxMTUzOTAxNF0sXCJ3aGVlbF9kZW5zaXR5XCI6WzAuMTIwNjc5ODIyODgzODA5NzQsMC41NTA4NDI5NDc3NDk3ODAzXSxcImNoYXNzaXNfZGVuc2l0eVwiOlswLjQ3NDI3NzczMDcxOTEyNzddLFwidmVydGV4X2xpc3RcIjpbMC40NzUzMjU3Mzg1MDk2MTUsMC42NTM0NjI2OTYyNjgxODYsMC4yMzYyNDQ1MjE4NTA1OTk1MiwwLjg2MjQ3NzMyOTUzMzYyNzksMC4zODQzNjYzMDUzNTY3NzI1LDAuMjk2MjQxNjM4NzYzNjE2NjQsMC44NTU1ODY0MDI4MDYwMzYzLDAuNjE1Mzc5NzcxMjYyMTQwNSwwLjAyMjkwOTMxMzMwODc3NzY1NywwLjcwNzgwNzM4MTk0MDUzNzMsMC4yOTk1NjAzMjMzMDIzODQ3LDAuOTU5MTU5OTg1NTM5OTE5MV0sXCJ3aGVlbF92ZXJ0ZXhcIjpbMC45MTU5MTQ2MjY5MTMyNTksMC42OTU2ODQ0NjkyMDc5ODc4LDAuMzMyODQ2OTE5NjMxNzY0MDUsMC43OTE5OTg1MTkzNjMwODkyLDAuODg0Njk5NjQ4MzgyNjA3NywwLjc4NjI2MDY0MzM1MTU1NjcsMC42NTIzMzI1NzYzODk1MDk4LDAuODAxNjEwOTQyMDc2ODQwN10sXCJpbmRleFwiOjE0fSx7XCJpZFwiOlwiMC5wazR1cXJvNDF1XCIsXCJ3aGVlbF9yYWRpdXNcIjpbMC44NjU4ODgxMDA3ODAzMTY1LDAuMzM1NzMzMTk4NjM5ODQ3M10sXCJ3aGVlbF9kZW5zaXR5XCI6WzAuNTY5MjA2NDU1NzMwNzMyNCwwLjI3OTE0NTQ4NzEwMTE1NjNdLFwiY2hhc3Npc19kZW5zaXR5XCI6WzAuMzEyMDM3NTQwMDM2NzA4Nl0sXCJ2ZXJ0ZXhfbGlzdFwiOlswLjkxODk1NTQwMDk5OTI1MjQsMC4zNTQyNTc5MTAwNDc4NDY5LDAuMTQ5NjQ4MjY5NjM0NDcxNjQsMC45NTQ4OTkyMDM4MTA5NDQ3LDAuNTEzNjk4MTg0Nzk1ODAzMSwwLjU0MjU0MjIyMzMzMjQwNzgsMC41MzgyMzIyNjY3MzM5NDQ4LDAuNjg2NzQwNDgxOTA2MTk3MSwwLjI0MDMwNzE0MDk3MDQxNzYsMC41OTYwMTkyMDI2MTUxNzI5LDAuMTk4MTM5MTg1NDY2MDcyOCwwLjA2NTIxMTk1NTUyMTU5ODJdLFwid2hlZWxfdmVydGV4XCI6WzAuOTM4MjE0NzI4NzI4NDIwNiwwLjYzODkwMzI4OTc2MzkzNDYsMC41NzQ1MDY4NjA2ODk2ODU5LDAuMzI5ODAwNzk1NjIwMzczOSwwLjM3NDgwMTAyMjUyNDM2NTQsMC4xNTU1MzEyNzQ1NzU5NDM0LDAuMzQ4ODg2NTM2ODgwOTgxNSwwLjIyODg2MDg5MDE1ODAwNDddLFwiaW5kZXhcIjoxNX0se1wiaWRcIjpcIjAuOTJwbXFmdG0wNzhcIixcIndoZWVsX3JhZGl1c1wiOlswLjIwOTQwMTg2MzU3ODA0MzAyLDAuOTYwMTgzMTg1NTY4NDUwMl0sXCJ3aGVlbF9kZW5zaXR5XCI6WzAuNjA3NDg2NTA2MjU1MjUzNSwwLjQ4NzIxNDA4NDg1Nzc0NF0sXCJjaGFzc2lzX2RlbnNpdHlcIjpbMC44ODc5Nzc5NTgxNDE3MzczXSxcInZlcnRleF9saXN0XCI6WzAuMzcyMjkzNTg5MTE3MDk1NzYsMC4zMjUwNjM4MTQ5MzAyNDYzLDAuMDIzOTk2MjQzMzQxNjcyOTQsMC41MDc2ODQ0OTI1OTI5MzY5LDAuOTM2MTc4ODcwNjM2MDA3NywwLjU1OTk4Nzc2NzUxOTgwMTMsMC42MTc4NzYxNzAxOTQ1MTk3LDAuMTkxOTk1MTU0MTI0NTkzMjMsMC40MzY4OTM5OTQ0OTA5NjIsMC4zNDA5NzMxNDIzMzc3NDk4LDAuNDk4MjU1OTUwMDU2MDI3NSwwLjMwMTgwNTQ3Nzk4NjMzNDRdLFwid2hlZWxfdmVydGV4XCI6WzAuNDgwNTU2Nzk5MjQxNjkyOCwwLjUyOTE3Mjk3MTUwODQyNSwwLjQ1NzY4MjQ0OTAxODU4NjcsMC4yODgxNTgxNjI1OTk2Njg1MywwLjQxMzA3MDM4MDIxMjc3NTc2LDAuODQ5NjMwMzEwMjE1MDMxNSwwLjQ0MjYyNDA5NDEwMjgwOTIzLDAuMTE4OTkwODM1Mzk3MzYxXSxcImluZGV4XCI6MTZ9LHtcImlkXCI6XCIwLnAwYmIzamNzYTZvXCIsXCJ3aGVlbF9yYWRpdXNcIjpbMC44MDUzNzcwNDA5MzYzODc2LDAuMDA0NjA4NTExNTA1ODc2NDg5XSxcIndoZWVsX2RlbnNpdHlcIjpbMC4zNzAzMjkzNjU4NTMxOTg1MywwLjkxMTA3MTgyOTA3Mzk5MDNdLFwiY2hhc3Npc19kZW5zaXR5XCI6WzAuNDEyNjg5MzEzNjY1NTU1MTddLFwidmVydGV4X2xpc3RcIjpbMC4zNzUwNTUyOTYxNjg4NzQ0NSwwLjMyNjk4OTQ1NTU3ODg0NzMsMC43ODI0Mjg3MzM5NjE3ODk3LDAuMDg5MTY3NTUyNjAyNzI2MDIsMC4xMTg0NjM2ODc4OTk1ODc3MiwwLjYxODIzMDU0MDIwNjk4NDgsMC42ODgzNDY3NDgwMTU4OTI5LDAuMzgxNzc5MDUyMTQ5OTU2NjcsMC43MjA4MTgxNjA5NTkxNDMzLDAuNzE4MjgxMTY3Mjk4MDczMSwwLjUwNTM0MDM5ODI0MzM5NjYsMC42Nzg1NDg1OTAzODg5MzkyXSxcIndoZWVsX3ZlcnRleFwiOlswLjg2MDI1MTY0MzQ2NjcxMjcsMC45MTgyNDEyODk1NjQ4NzEzLDAuNDk0MzMyMTQ0NjQ5NDA1OCwwLjQwNjY4MTQ0MjQwNTM2MzMsMC45NDUwMDMzOTM0NDM2OTY1LDAuMDQxNDc2Nzg0MTY5MDMsMC45MDc0MzAzMTQxMDI1MjgyLDAuNzkyMDgwNTMxODEzOTI5NV0sXCJpbmRleFwiOjE3fSx7XCJpZFwiOlwiMC5nNm51ZTQwbzZ1XCIsXCJ3aGVlbF9yYWRpdXNcIjpbMC4yNTk1MDM2NTE3OTA4OTI4NSwwLjQ1MTE3MTk2Njk2MzYxNTE3XSxcIndoZWVsX2RlbnNpdHlcIjpbMC44NzM3NzczMjA3NDkxNjQ2LDAuMzgyNTA0OTQ1OTE3NTk4NF0sXCJjaGFzc2lzX2RlbnNpdHlcIjpbMC41NzUwNjM2MDU2NDMyNjQzXSxcInZlcnRleF9saXN0XCI6WzAuMTYxNTUwNzcyNzIyNzQzNjUsMC4xNzQwMTkxNDc3MzE3MDIzNSwwLjQyODc1ODA3ODEwNzY0ODEsMC40MjkzMjkyMzg2MDMwNTgyNywwLjQ3NjA4MTQzNTA2NzMxMzI2LDAuMDE2MTQxNjY2MTgyMTk4MDMzLDAuNzQ5MDA2OTU5OTI4MzY5NywwLjg3NzkxNTY2MzM3NTQ5NzYsMC42MDgwOTI4NDcwMTg1NTc4LDAuNDg0NTc2MzE1NDk2MDYwNSwwLjE1OTg5Njk0NTI1ODc2MDQxLDAuNTQ5MjMzMDYzMjk3MTczNF0sXCJ3aGVlbF92ZXJ0ZXhcIjpbMC40ODg2NjA0MjY3ODU5OTYyLDAuOTUwNzEwMDU1MzM2MDI5OSwwLjg5NjM3ODYwMDQxMDY5MDYsMC4xMzk2MjAwNDI2ODg5MDM4MiwwLjAxNzEwNTMwNTc2MTMzOTI4NCwwLjEyMDMyMDgxMzAzMjg1NjgsMC45MDE2ODU5NjQ1NDQwMjU0LDAuMzEyODI3OTY1OTU2MjYyMDZdLFwiaW5kZXhcIjoxOH0se1wiaWRcIjpcIjAudWlrcG05cm1iYlwiLFwid2hlZWxfcmFkaXVzXCI6WzAuMDgwNjQ1MTUwNDc2MjA3OCwwLjA4NDIzMTAxNDY5ODQxNTMyXSxcIndoZWVsX2RlbnNpdHlcIjpbMC4zNDQ2MzkyODM1MDQwNjEyNiwwLjg2OTQ4OTUwMzE0Nzg2NzFdLFwiY2hhc3Npc19kZW5zaXR5XCI6WzAuMTQwMDg0ODE3OTY0NjE1MjVdLFwidmVydGV4X2xpc3RcIjpbMC42ODYwMzU1ODI3ODIzNjcyLDAuOTQ3NTYzNzgzNDE4Mzc0NiwwLjU0ODA0NDY0ODE4ODE5NDYsMC4yNzI5MDcyOTEyNjc4MzM0LDAuOTE1ODA3MTYyOTAxMTU4MiwwLjU0MDM2NzczMTI5MTkyNzcsMC43MTEwNDM4Mzc1ODQ4MDM2LDAuMzQ2NjYxMzUzNTE0MTA0NTQsMC43ODM1ODkyNjQ3NjEzMTU0LDAuMjY5MTQwMzI3MTY5OTQwNCwwLjE0NDM2MDQ2NDExNjI5MDMzLDAuMjcxNjg1MTY3OTQ3MDg3OTddLFwid2hlZWxfdmVydGV4XCI6WzAuODE3NjU5NDc1NTk0NjE4NywwLjY2MzczNTUyNDE0NDkxNjgsMC44NDAyNDczOTQ0OTU5MzgxLDAuNjQzNTU4MjEzMTMwMTc3OCwwLjkxNzA0MDg0MTA0MjYyMywwLjk4MjQzODc1MjU1ODMyMTEsMC40OTc5MTYzOTQ0NjY3MDY0NCwwLjAwNTM3NzgzMDE4MjM2MTQ4N10sXCJpbmRleFwiOjE5fSx7XCJpZFwiOlwiMC5waGtvZDRoNjY2b1wiLFwid2hlZWxfcmFkaXVzXCI6WzAuMzg4NTEyMTU0NzA1MjExNSwwLjk0MDgxNDc3OTY4NjcxNzVdLFwid2hlZWxfZGVuc2l0eVwiOlswLjYwNjY3NjA0OTk5MjAzODcsMC43NDM3ODUzNzM1MTQxNDc4XSxcImNoYXNzaXNfZGVuc2l0eVwiOlswLjA0NzYxOTM0ODQ2Mzc0NDgyNl0sXCJ2ZXJ0ZXhfbGlzdFwiOlswLjI4MTgwMTgxODg5OTQ2NzEsMC41Mzc2NzExMjgzMjM1NTExLDAuMjc4MjY1MjQ5MzQ3MDU3LDAuMzcxODAzODA3NDk0MDQwNjMsMC4wMDE2MzU0MTEyNDQwNzcwNjc0LDAuMzczNDkyMDI5ODQwNjUzOSwwLjkyNTgyNDM2NDk0MzM1NDYsMC45NjExMjgyMDEwNjQ4MDk5LDAuMjYzNTY3Nzc1ODQ0MzMwMiwwLjI5OTUxMjI2Njk2OTg3NjksMC40NTAwOTUzNzYyMTY2MzE3NiwwLjE0MTIwNDk1MDE4OTYxOTU0XSxcIndoZWVsX3ZlcnRleFwiOlswLjgyMTE1MjcwMjUzMDAyNDMsMC42Mzc4NTIwNjQ2MTUwMDg1LDAuODQzMzY5MTI0MjQ1MDg4NywwLjEwMDgwMTEyNTMwNTE0OTA2LDAuNzQyMDU3MTcxODY0MzI5NCwwLjA2MjQwNjU5NDQ5NTM3NTc4LDAuNTAxOTk2Mzc5ODIyOTE5MiwwLjEzOTU4ODAzMzI3MDMzMjc2XSxcImluZGV4XCI6MjB9LHtcImlkXCI6XCIwLmNkc2IydDBhMGdnXCIsXCJ3aGVlbF9yYWRpdXNcIjpbMC4yNDUwNTg0MjE3NjYwMTk2NiwwLjQ3OTM3NTcwNjYxNTg4MDM2XSxcIndoZWVsX2RlbnNpdHlcIjpbMC43MzE4OTYzMzU5MTk4ODgyLDAuMjA0MzM1OTE5MDY3MTQyNTVdLFwiY2hhc3Npc19kZW5zaXR5XCI6WzAuOTQ0MDgwNDAxMzgwODAxN10sXCJ2ZXJ0ZXhfbGlzdFwiOlswLjI3NjcxNzcxODU3MzU1NzIsMC40MDE5MTIwNjkxOTczOTI1MywwLjY5OTI1MjA2MzE3NTM2NDksMC41ODA1MzY3MDU0NzY1NjczLDAuNTMyODc2MDY5NDU5NTg5MywwLjYwNTE2NTUyNjYzOTY4NTYsMC44NjU5Mzc0OTIzNjk4MjMzLDAuNjM4NTc0MDUxODE2NDU5MSwwLjA5MTM2MTc1NjcyNDk1Mjk1LDAuMTk0NjI2NzE2MjYwNzkzMywwLjU4NDgzMjQ3ODM0MTk0NzIsMC45NjEyMTE1MDY5ODg5ODE3XSxcIndoZWVsX3ZlcnRleFwiOlswLjk4NDA0MTk3MDg2NzQ0MDQsMC40MDAyMDc4MzI4ODc3NTM0LDAuNjExNDY2ODQ5MzAwNDk2OSwwLjA1NDc2NjI4MjY5NjM4NzUsMC43NTkwMjYzMjM2MTg2ODk2LDAuOTA5NTgyMTcxODQ0MzY1MSwwLjgyNTI3ODUwMDE0NDUxOTMsMC45MzU0NTczNTAzMTQ0Nzc5XSxcImluZGV4XCI6MjF9LHtcImlkXCI6XCIwLjVlYzNmN3VjODZnXCIsXCJ3aGVlbF9yYWRpdXNcIjpbMC43NDI4Nzk0NTI2NzM3NzM5LDAuMTQ3MjcwNzkwNTUzNTM1NTRdLFwid2hlZWxfZGVuc2l0eVwiOlswLjIxNzIwMTM0MzI0NjU3NTU4LDAuNTc1NDI2ODc5NDE0NjgzN10sXCJjaGFzc2lzX2RlbnNpdHlcIjpbMC4yMjQ3NjQyMTQyNDg5NzAwOF0sXCJ2ZXJ0ZXhfbGlzdFwiOlswLjgyMTI5NjM3MjgxNjAxMDUsMC4yMjk3MzMxODkyMjA3NDg2LDAuMjEwNTg4MTc5Nzc2NDU1MjgsMC4zMDAyODYzMzQ5MTkxNDQ5LDAuMTYwOTU0MjQxMTM5NTMwODMsMC4yODU3MDk3OTAzNTAwMTg3NiwwLjg1MDUwNTMyMjU5NTkyMDUsMC4wMTIwOTk3NzU1NjUyNDU2NjMsMC40MzA3MTkwOTcwMjk2MTQ2NCwwLjM1ODE4MjA2NzMzOTAzMzcsMC45OTQxMzk2NjYzMzUwOTUyLDAuMTcxMTUyMDQ2NjMxNjQ3NjNdLFwid2hlZWxfdmVydGV4XCI6WzAuNjM0OTM2NTA0MzY0NzM5MywwLjg1NjQxNjgwNTY1NTkyMjcsMC44MzQ3MzE0MTAzOTgzMTk3LDAuMDEzNTYxNjAwOTg5MTE1NTE5LDAuMjA0NzM4MTM1NTU4OTkwNzksMC45NzM3ODg5NDk1MzE1MjgsMC4zMjk4OTU1NDc1NzIwMTkxLDAuNzA0MDQ5ODcwMjY4MjQzXSxcImluZGV4XCI6MjJ9LHtcImlkXCI6XCIwLm8ybTdlM2psNW1cIixcIndoZWVsX3JhZGl1c1wiOlswLjg2NjEzNjk0NDc0MjMwOTEsMC4zNjIwOTE4NjYzNjg1NTE3M10sXCJ3aGVlbF9kZW5zaXR5XCI6WzAuMjQ4ODYzNjk5NDgyOTYyNzIsMC45NDgxMTM2NzA4OTYxNjk3XSxcImNoYXNzaXNfZGVuc2l0eVwiOlswLjQ2NDUzNDkwNzE0Mjg1OTddLFwidmVydGV4X2xpc3RcIjpbMC4zOTYzMTU4MTcxNzQwMjMzLDAuMzI1NjI3ODgyMjQ1MjkxNiwwLjQzNTg4NjU2MjE2OTMwODIsMC40MTgwMDY1NzU2NzIwMTI0LDAuMDMzNTA3NTc3OTAxMjY2MTMsMC4yNjgxMDY3NDk1OTYyNzE5LDAuMTkxNDU3OTk1MjYyNjczMzcsMC43MzcxMTExODg0OTExNTY1LDAuNDUwMDQwODk1NTE5NTg4NSwwLjEwNjg4MjYxNTY3Njc5MzQ3LDAuMzgyMTU0MTMxMTQ2NDkyMiwwLjAwOTQxNjc1MDU0MTE3MjE5Ml0sXCJ3aGVlbF92ZXJ0ZXhcIjpbMC45NTc1NDYyNzEyODY3NTUxLDAuNTY5NTUwMDc2MjM1NTgwMywwLjc5ODE0NDMwMDIxNTQ2MDUsMC45NDc0MzI4NDAzNzQ5ODIzLDAuNzAyNzAxNjA5NjQwMDcxMSwwLjgyODY0MjQ2NjM3MTM2OTYsMC44MzEwNTAwMDA5NDYxNzcyLDAuMjAzODk0NTE3OTgzMjM1NDNdLFwiaW5kZXhcIjoyM30se1wiaWRcIjpcIjAudmlqN2g0bGwzaWdcIixcIndoZWVsX3JhZGl1c1wiOlswLjE4MTQ5ODAwNzYxNTU0ODgsMC4yNjM4OTc2MjA1MDcyMjU2NV0sXCJ3aGVlbF9kZW5zaXR5XCI6WzAuMjgyOTM1Mjk3MjcwMzUxOCwwLjc0MjY0Njg5NzgxNzY1MDZdLFwiY2hhc3Npc19kZW5zaXR5XCI6WzAuMDE0NDg2NjYyNjEzODIzMzY1XSxcInZlcnRleF9saXN0XCI6WzAuMDUzMDg2Nzc3NTg2MDYyMTcsMC4zNjYwMzI5OTIwMDAwMTA1LDAuOTE1NDU4ODExMTEwOTc1NiwwLjY1OTkzNjc0MDMxNDI0NzEsMC4wMDYyMzY3MDEwMDAzNzIxMDIsMC45NDE2Nzc5NzU3NzM0NzE3LDAuODA4MDgwOTI3ODMzOTYxOCwwLjQyNDk5NzE1ODU3MjkxODIsMC40Mzk0MjAyMzYyMzI3MDc3NiwwLjQ0NjMyMTc4MjA0NDMzNDgsMC43NDA3NTcwMjA2Mzg5NTgsMC4wOTE1NDI4NjM2Mjg1NDI0N10sXCJ3aGVlbF92ZXJ0ZXhcIjpbMC4xNzAxNDc4ODg3MTEzOTk0LDAuMjM5NTE1MDAwMjY2NTE2OTUsMC44NDE3MTYwNzUzMDUwMDgxLDAuNDQ2Njg2MzIxOTczMTM3ODUsMC43OTg0NzQ2NjIwMTEwOTAzLDAuMjQ5OTMwNTA1MDk3Mjk2NDIsMC41OTgyNjEzNDEzNzE4MDM2LDAuMDI0NjM0MTQzMzgwMzc1NjE3XSxcImluZGV4XCI6MjR9LHtcImlkXCI6XCIwLnZidWRwcTdyOGpnXCIsXCJ3aGVlbF9yYWRpdXNcIjpbMC4xODgwODMzNzkyMDg2NTM4LDAuMjkwOTQxNzU1NjI1MzcyNF0sXCJ3aGVlbF9kZW5zaXR5XCI6WzAuMzgzNTM1MzYwNzQ4NzYzNywwLjEyNTQyNDcxMTI3ODA2MTk4XSxcImNoYXNzaXNfZGVuc2l0eVwiOlswLjk5MTQ4ODcyNjY3ODc4MzVdLFwidmVydGV4X2xpc3RcIjpbMC4xNDA4MjAyMzI3OTUxOTUzLDAuOTAwNjU2Mzc0OTE3MjQ1NCwwLjI4NjAxMzE4OTY1NDY3NDcsMC41MDM2MDU4MjY4MDE1MDk2LDAuMjgyMzcxNzUzNTE0NjQ1OTQsMC42OTIwOTM1MDk3NzE3NTQ5LDAuNDAzMDAyMTQzMDIwNTg1OSwwLjQ1MjYzNDk2MjUzMzQ5MzgsMC4zMjk1MTA2NjEzODY3NTA2NywwLjk5MTU2MzkzMDMyNDg5MjQsMC4xNTQyMTQ5MTc4MDE4MDUwNywwLjU2NTgxMjAzNzY0NDUwMjhdLFwid2hlZWxfdmVydGV4XCI6WzAuNjIwNzc5NjA4MTI1MTQ5OCwwLjA4NDU3NTI5MzIxODc5OTk3LDAuMzA5NTk2MDg5MzQ1MDQ1NTcsMC45Mjg5ODg3OTAxNTA2MDc1LDAuMjExMzQ0MjAwOTAwMDEwMzgsMC4yNjYxNTg0NzQwNDc4MTA0NiwwLjk2Nzk5ODYzMjU5OTI1NzYsMC4wMzYzOTMyNjY2MDkwNTYyODVdLFwiaW5kZXhcIjoyNX0se1wiaWRcIjpcIjAuNGlna3M3N2RmbGdcIixcIndoZWVsX3JhZGl1c1wiOlswLjYxNjI2MzA2ODg4MDUxMDksMC45OTYzMjIxOTU3MjQxMTZdLFwid2hlZWxfZGVuc2l0eVwiOlswLjA3MjE5Mzg5NTU4Mzk1MDI4LDAuODE2MzA5MDA0MTU3OTQyMl0sXCJjaGFzc2lzX2RlbnNpdHlcIjpbMC42NDYzODcxNzI0OTI0NzY4XSxcInZlcnRleF9saXN0XCI6WzAuMTQ2ODYyODI5Mzk1OTI3MzIsMC4zNTM4NjI0MzM4MDg5MDM4LDAuNzM1Mjc4OTEwNzE3MjUwOCwwLjgzMzYyMTkxMzEzMzQ5MDEsMC4xMzQ1ODQ0MjE0OTQ3OTExLDAuMDY5NTcxMTY2NjIzNTMyOCwwLjA1ODkxNTc0OTYxMTQyMDU0LDAuNTkxNTA4MjExMzI2OTU2NywwLjgxMDYwOTkwODE3NTY2OTUsMC4wOTU4NzYzMTc0MjU4Nzg5OSwwLjk3NzU3ODkxNjIxMzA1NTcsMC42MjAwMTEwMDAyNTExMzddLFwid2hlZWxfdmVydGV4XCI6WzAuMjM4NjkxNjQzMTcyOTkwNjMsMC40Njk2MDgyMDUzNDM0Mjc4NCwwLjk4MDkyMDk0MzM5ODAyNjgsMC4wOTQwODcxNzUxNzU5ODk1MiwwLjk1OTYyMjg0NTg2MTU0OTQsMC4xNDkzMTA2NjUwMzg1MDEyLDAuNTQyNDExNjk0OTg4MzQxNSwwLjM1MDY4NzYyMDM5MTQ5MjM3XSxcImluZGV4XCI6MjZ9LHtcImlkXCI6XCIwLmk3aW43MTBmMzk4XCIsXCJ3aGVlbF9yYWRpdXNcIjpbMC4wMTA3NDI0MzUzNTcwNjk5OCwwLjM3NDk2MTUwMjQ0Mzk1NDc2XSxcIndoZWVsX2RlbnNpdHlcIjpbMC4yMTc2MTE2MzAzMzk4NzU4NSwwLjI4NzcwNjkwNDE3MjY2OTg2XSxcImNoYXNzaXNfZGVuc2l0eVwiOlswLjc3ODg1MDQ3NzQ3MDg3MDddLFwidmVydGV4X2xpc3RcIjpbMC45MDY1MDQ1Mjk0NTI3MDYxLDAuMDgzMjAzMDgzNDk4NzU3MzgsMC4wMzQ2MDg2NDcyODI3ODA2OCwwLjEyODg1NDU5NDk4MjAzNzQ0LDAuNzAzNjEyMDExMzU4OTI5NywwLjgzMDExNTgxNTE4NTg3MTIsMC4zOTU3NzY5MTU4NDQyNzAxLDAuOTg5NzYxNDM0NTE4MTM5MSwwLjA4MDg4MTUzNzA1NjE5NTUsMC45NDM1NDYwNjY3MzUxNjg1LDAuMzA3MDI2NjEzNDkwMTQyNywwLjA1NTIzMzQ3MTAyNjI0Mzg3NF0sXCJ3aGVlbF92ZXJ0ZXhcIjpbMC4yMjcwNjI0MDc4NjI5MDEzMywwLjQ1MzYzODgyODU4MTM0NjYzLDAuNDA0MzExMDU0MzM4ODA3MSwwLjA0NjYyMTMzMjY3ODU3MzYsMC4xNzM3NjEzMDU0ODc3NzMxMywwLjY0MTk0MTYwNTU0MjIxOTYsMC40NTAzNDE4MjA1MzYzODg5NCwwLjA2MzAzNDg2NDk1NDYyMzUyXSxcImluZGV4XCI6Mjd9LHtcImlkXCI6XCIwLjk2aXZxcHBlZ2FnXCIsXCJ3aGVlbF9yYWRpdXNcIjpbMC40OTExMTc5MjMwOTAyMDA1LDAuMzUwNDY0NDQ2OTE5MzkwOTRdLFwid2hlZWxfZGVuc2l0eVwiOlswLjMzNTM0NDQ5NjcyODk3MDI2LDAuOTMzNTE3NjU4MDAzMjQyN10sXCJjaGFzc2lzX2RlbnNpdHlcIjpbMC4zMTk1NzUzODY2NDExMDU3NF0sXCJ2ZXJ0ZXhfbGlzdFwiOlswLjU5MjYyNTQ4NzM4NTkzNTEsMC43MTkyMDg3OTk1MjI5ODQ2LDAuNDg0NDkxNjMwNDY5Mzg4MjYsMC43ODIwNzU3NjE2MjA4NTgyLDAuNzQ2MjA1NDM5ODI0NTc3NCwwLjA5MDQyNjI0NjUzMjAzMDQ2LDAuMTA3MDI1ODE1MDM1NDc5OTIsMC45MDYxODc4NzczNjI2OTYzLDAuNjUyMjI5NDEyMjg0NTI5NCwwLjY3NzI3MTEzNTE5MjM0OTcsMC4wMjQ1MTE2OTM1NTIyNDM4MDcsMC44MDU0NTkzMTQzMDU4MzU1XSxcIndoZWVsX3ZlcnRleFwiOlswLjM2MDI5ODEwNDM4MzMzMDY1LDAuNjA2NTIzNzYwNjIzNzE0NCwwLjMyNjAyMTMyMTcxMjQyNjM3LDAuNTk0MDQxNTcxOTA3NjQwNiwwLjU4MjEwNTg2OTQ4MDQ0NDIsMC42NDc0NjkwODAwNjUwMTA3LDAuNTkwNjU2MjI1NDgxNzcwMiwwLjQ3NzU0ODQzOTkzMjY1NTk0XSxcImluZGV4XCI6Mjh9LHtcImlkXCI6XCIwLmZmcThkZXBjaHBnXCIsXCJ3aGVlbF9yYWRpdXNcIjpbMC4xOTQyNDExNDQwMzc4NDU1NCwwLjQxMTE2MTUwMjU0NjY3NTddLFwid2hlZWxfZGVuc2l0eVwiOlswLjcxNjExMTk1MjY5NjkwMzUsMC45MjEwOTE0MjE4OTc5MzY3XSxcImNoYXNzaXNfZGVuc2l0eVwiOlswLjY3MjYwNjY0MjU4Nzc1OTddLFwidmVydGV4X2xpc3RcIjpbMC42MDg3MjUxNDkxNzkwNjMxLDAuNzEyNjkyMjU2MzYwODI5OCwwLjI4NDgxMzMyMTgyNDUwMjgsMC4yNTc3Nzc4OTMwNTYwMjY0LDAuOTMyMjkxNzUwNTYwODY5LDAuMjYwMjQ2MzQzODYxODA0NTYsMC45MDA4NjA4MzY5NzUxNzQ5LDAuODE5Njg2MTc5MzQwMjY4OCwwLjA0OTc4MTEyODI1MDQ0NjExNiwwLjQ5ODQ2ODk2NDk5MTc2MDYzLDAuNDIyMDY3NzYyNjc5ODk4NzYsMC4xMzI4MjY0NzM4OTkxODJdLFwid2hlZWxfdmVydGV4XCI6WzAuNTUyNzA3MTI3MTY0NzQzMiwwLjYwMDY2NjMwOTM5MTkxNDcsMC44ODg4NzA3NjQ3ODQzNzE0LDAuMjQ0NzI3MTMwNDE2MzAyMTIsMC45MjY0NDQ5MzY3Nzg2NDk0LDAuMDA4NjczOTgzMjIwMzQyODUxLDAuNjU2MTI2ODYzOTMwNTkzNywwLjgwMDg2OTg0MDYwMTkxNV0sXCJpbmRleFwiOjI5fSx7XCJpZFwiOlwiMC4zMWsxYnNhMjl2OFwiLFwid2hlZWxfcmFkaXVzXCI6WzAuNTIxNjU3OTcyMzIyNjg4NCwwLjY5MzgwMzg3ODI1MjA1NzJdLFwid2hlZWxfZGVuc2l0eVwiOlswLjc1MTA1MDQ5MzA4NDYzNzgsMC45MzYwMjExNjcxNjQxMzM5XSxcImNoYXNzaXNfZGVuc2l0eVwiOlswLjk5MTk2OTI1NDc4MzM1ODVdLFwidmVydGV4X2xpc3RcIjpbMC42MjAyMjUzNDUwNjYyNzk4LDAuODQwODkzMjkwMjI4ODAyOSwwLjE0NjcwNzk5NTU2MDg5NDMsMC45ODUwNDUwMzAxMjQxNzI0LDAuMjMzNDQ0OTc2MTkxMjIwMywwLjI4OTc5MTIzMjczMjU0NjAzLDAuMjcwOTM4MDgwMTc1Njc4NjYsMC4xOTA3MDQ2MjM3NDc4Mzg5MiwwLjA1MzM2MDU5NzgyOTQyODI2LDAuODI3NjA3MjkyNjYzMTgzLDAuOTMxOTEyMzQyMTkyNTQ5LDAuNDM3NjcxNzYyODU5NTc2NzZdLFwid2hlZWxfdmVydGV4XCI6WzAuMDQxNTg2Njk0NzI4NjcwNzE0LDAuMDcyOTgyNzE3NTE5MDgwNywwLjAxNjkxNjE1NDkwNTI5MDc0OCwwLjQ5MDE0NTQ1OTg4MjMyMDUsMC4yMzExOTg5MzY3OTY2NTgyNiwwLjAyNTEzMDA2ODIzMjE0OTM2LDAuNDg5Mzg5MDk4NjM5MjU5OTUsMC4zODg0MzUwMTcwNTM3NzQ1XSxcImluZGV4XCI6MzB9LHtcImlkXCI6XCIwLjkwa2t2YjR1Y2hvXCIsXCJ3aGVlbF9yYWRpdXNcIjpbMC45MTAxMDM3OTkyNzg1NDcyLDAuNDg3ODU5MjQ3MDExNTkxMl0sXCJ3aGVlbF9kZW5zaXR5XCI6WzAuMzg0ODQ3Nzk3MDgyNDYzMSwwLjQ1Mzg5MDQ5Njk3OTYxMjAzXSxcImNoYXNzaXNfZGVuc2l0eVwiOlswLjI2MDgwMDc5ODkzNjkzMTY0XSxcInZlcnRleF9saXN0XCI6WzAuNTMxNzkzMjA3NTkzNTIxNCwwLjY4NzgxODkzMTAyMTQxOTEsMC45ODAzMTAxNDkzNzExMTc3LDAuNzY1NzUxNjU1MDUzNDM0LDAuNDA2MDE4NzE4MzIxNjk4OCwwLjExODQ4NzI5NDg5MDcyODUxLDAuNTczNTI0MjI1OTA3ODUyMywwLjk4ODgzNzMxNDAxNzEzNDMsMC42NjMxNDIxNzQ3ODIwOTExLDAuNTQzMDMyOTg2MzYyMDIxNiwwLjQ1OTgyOTk5NDM1ODM2NjEzLDAuODk2OTY3NjUxNzAzNjAyM10sXCJ3aGVlbF92ZXJ0ZXhcIjpbMC40MDU0NTcyNjIwODc4NDk2LDAuMzgxNzA1NjU4MzM1MTYxLDAuNjIzNDk1MTQ2MjM4MTY1NywwLjY0MzMyODg1NTk3MzQ1MzgsMC44NTcyMjgyNjY0OTc5MzIsMC44OTk1NTQ5NzQxMTk5MzY3LDAuMDc2NTExMzI3OTMyMzE4ODUsMC43NzExNzY1Mjg2OTg1MzY4XSxcImluZGV4XCI6MzF9LHtcImlkXCI6XCIwLmFqZ3RjaTNzY2c4XCIsXCJ3aGVlbF9yYWRpdXNcIjpbMC4zMzUxOTQ4MTQwNjE3MTg5LDAuNjI5OTczMTg3OTA4NzUzOF0sXCJ3aGVlbF9kZW5zaXR5XCI6WzAuNDE1MzQxODY4MTAyODg1NTQsMC4yNzA0NDEzNTI3MjIzMDQyXSxcImNoYXNzaXNfZGVuc2l0eVwiOlswLjcwMTM3MjM1MjYyNzE1MDldLFwidmVydGV4X2xpc3RcIjpbMC43NDE1NzgyNTkyNjY5MTM4LDAuNjM1MjY0NDQzMjkxODI5MywwLjE3MzY2NjAyNTk2MjEwOTY3LDAuNTA3MjA2NzkzNDI3NDk3MywwLjU5MTU1NjA0MzIwMTM4NzUsMC40NTQ5MzAxMTMyNTE2ODQ1MywwLjI2NDk0MDkyMzA1MjQ0OTMsMC43NTYyMTEwMzU2NTI0OTIzLDAuMDc4NTMyOTIxNjY4MTM3NDEsMC42MTU0MzU4NzYwNzYyNzIxLDAuODE4ODAzMDk4OTg1MTgwNCwwLjg3NDgzMTAzODkxNTM0NTddLFwid2hlZWxfdmVydGV4XCI6WzAuMTA4NjIzNDk3MzE4MDYzMDksMC41ODU3NjIzNjY4NDc3ODQ1LDAuNDczNDA3ODYwNzk3NTc5MzUsMC4yNjY2NjE2MDE1NjE0MTQwNSwwLjcxMTcwMjU5MzI4MDY1MjIsMC41MzM0MzkyODUxMjk0OTk4LDAuOTc0MDIwNDcxMDM0Njg3NiwwLjgxMTk0ODk0MTE0ODQ5MjFdLFwiaW5kZXhcIjozMn0se1wiaWRcIjpcIjAuaWo2bmxsY2M2ajhcIixcIndoZWVsX3JhZGl1c1wiOlswLjA2NTc2NTM2MDcxODgzNzc2LDAuMjY5ODEzNDYwNjE2ODY1Nl0sXCJ3aGVlbF9kZW5zaXR5XCI6WzAuMTA4MjY5ODg5NjQxNDI3ODEsMC40MjgwNzkzODQwNjM5Nzc2XSxcImNoYXNzaXNfZGVuc2l0eVwiOlswLjEyNDUxNzUzNTU1ODg5MDU2XSxcInZlcnRleF9saXN0XCI6WzAuOTg1OTI3Njc1NjU5MTk4MSwwLjMyMzYxNTYxNzgzMTgyNTcsMC4yMzg4MTcxMDk4OTA2MDcxMiwwLjkwODUwNDQ4MzgzMTI5ODYsMC4wNzU5MDkxODUxOTE0MzI4NiwwLjExNzgzMDI2NzYxNTAxNDkyLDAuNzU0NTQ5NDc0MzE4MDEwOCwwLjk4MzA5MjYyMjI2MTE4MzMsMC4yMDU1MTkwNzQzMTI4NzgzLDAuNzA4NDI3MzU1Mzg5MTQwNSwwLjYxODA3OTgxMjQ3NzcyMjUsMC4wMzgzNzY1ODM3ODgwODQ5NV0sXCJ3aGVlbF92ZXJ0ZXhcIjpbMC4yNjI1Nzk1ODMyOTM2NzgxNCwwLjM3NDIyNzU2MzQzNTQ0ODgzLDAuOTcwNjYzNzA5NzcyMzgzOCwwLjgyNzA0MDI4NzI5MTY5NzUsMC42NDIzNDcwNjAyODYxNTI3LDAuMzA0OTQ2OTYwMzkzNjg0MSwwLjAyMDMxNTQyNDQyMTAyNTA3NSwwLjY3MzE1NDIzMTU2OTIxOTZdLFwiaW5kZXhcIjozM30se1wiaWRcIjpcIjAuY2ZhbWprZ2UxNFwiLFwid2hlZWxfcmFkaXVzXCI6WzAuNTU1MzM3MTIyMzQ0MTMyNiwwLjQ4MjU1OTUyNTQ1MzAxMTk1XSxcIndoZWVsX2RlbnNpdHlcIjpbMC4xMDIzMzU2Nzk1NTk1NzExMiwwLjQxMTg2NjM5OTQ2MDY0NjJdLFwiY2hhc3Npc19kZW5zaXR5XCI6WzAuODUwNzAxMDM3MjQ5ODIwM10sXCJ2ZXJ0ZXhfbGlzdFwiOlswLjQ0MzU1MjYxNDQ0MTA4MTUsMC43OTUyNTcxMTYxMjE2MDE1LDAuNjk1NjY3NDI5ODQ4MTY5OCwwLjc3MDAzODExNTA0MjYyNjgsMC4wMjQ0Mzc3OTE5MjI2NTcyNywwLjMzMTQ5MjQyMDIyNjQ1MjQsMC41MzQ4NDcyODcyMTc2ODkzLDAuMTY5OTg5ODM1ODcxMTc0NDQsMC4zNzAyNTY3NTMxNjM2MzU4LDAuMTMyNDg4NzExMDgzNTkzOTUsMC4zMjQyMTE1MjkwODA4MDI1MywwLjEyMzg0Mzg5OTM1NDI5NTg1XSxcIndoZWVsX3ZlcnRleFwiOlswLjU1NjIzNjE3Nzc0MTMxMTgsMC4wMjAxODE5NzMyNzMwMDA0MiwwLjY2NTY3NzM5NjY5ODY4ODIsMC4zNDA1NjcwNzU0OTE2Nzg5NywwLjMyMjg2ODcyNDgyODMwMzEsMC4wMDU0Njg5NjMyODA3OTIyNzIsMC4yNDg3NDEzMjMxMjMxMzE2OSwwLjAwNzU2ODAyOTQxNzMyOTI1OF0sXCJpbmRleFwiOjM0fSx7XCJpZFwiOlwiMC44OTd1cHVzcDAwb1wiLFwid2hlZWxfcmFkaXVzXCI6WzAuOTUwNjIyMTA1NzczOTI4OCwwLjI2MzQ2NzgyODg3ODcyNl0sXCJ3aGVlbF9kZW5zaXR5XCI6WzAuNzgxMDE2NjQ1MzQ2NDM3MywwLjM4NjQ3OTkyOTk4ODk4MjA2XSxcImNoYXNzaXNfZGVuc2l0eVwiOlswLjA3MzU0MjE4MjU3ODEyNTVdLFwidmVydGV4X2xpc3RcIjpbMC4zMzM3MzExNDExNTg3MTExNiwwLjA5ODY5ODYxMTIxNzI4Mjk2LDAuMTU1NTg1NTE0NjUxOTAyNSwwLjMxNzQ4NzMxODcyMTc4NTUsMC40NzUyODI2NzcwNzczMzI2LDAuMzI5OTE1OTg5Mjc5NzY1NCwwLjE5NjAwMDk3OTY3NTI0NTU1LDAuMTQ5MjUxNzA5NjQxOTU2MzMsMC4wMDY4NjQ1MjQwNTI3MTI5ODQsMC43NTMyNDg5MDE3NTU0MDIzLDAuNDM4MzU0MTcyMDUyNjc2LDAuMzExMjQwMTI0Nzc2ODUyMTVdLFwid2hlZWxfdmVydGV4XCI6WzAuODQ5ODY3MzMyODk1MjU3NSwwLjQ4ODMzMjUwMTM5NjMzMzU1LDAuNzE0ODAxNjQ3NTU0Mjc2LDAuODk4NzEwNDEzNjI4NTE5NiwwLjkzODQxMDg0OTQ3OTI2NDcsMC44ODM5ODUzODc2NDkxNjM5LDAuNDE5NDAxMTA1NzU2MjEyNiwwLjUwMjI0NzY5NDkwMzY0NTJdLFwiaW5kZXhcIjozNX0se1wiaWRcIjpcIjAuZXVndWU5cGM3cW9cIixcIndoZWVsX3JhZGl1c1wiOlswLjE0NTgwODc5MzgyODE0NDkzLDAuODc0NDAwOTM3NTgxMzQyXSxcIndoZWVsX2RlbnNpdHlcIjpbMC4zNTA1NzgyNjM3NjQ3NDM0NCwwLjQ5MDg1NzEyNzU3MzcxOTQ3XSxcImNoYXNzaXNfZGVuc2l0eVwiOlswLjkyNjE0NDk4MTc4NTA1MjddLFwidmVydGV4X2xpc3RcIjpbMC4xNjY5MDI3OTc4MTU3MTU2LDAuMjY4ODUzMDU2MTM0ODI3OSwwLjQxMDIzNzkyOTAyMDQ3OTIsMC41ODE0MjU5NTU2NDA1NTY4LDAuNDQ5NTc4MTIzMDkwOTY2MzQsMC43NTA3MDgzNTcyNDE2NzQ0LDAuMDcyODc3NzMzMjk3MDE1ODYsMC43OTc0MzY3NzM2NjI1NzI1LDAuMDY4NDYxODA3ODMwNzc1MjcsMC43MzQ0NzU0MjkxMTkxNTQ5LDAuNTcwMzAyNjc1OTMyOTY3NywwLjYyODkzMzU1NzQ5NTU2N10sXCJ3aGVlbF92ZXJ0ZXhcIjpbMC43OTE3MTkyMzI4MDg2MjI5LDAuNTcwODAxOTAyMzY1OTYyMywwLjc3NjUyNTAyMDkxNTc5MzIsMC4yOTI2NDIzNDY2MDE0NzIyNiwwLjI3OTM4OTIzMzc4OTc1MzQ0LDAuMTQzNDgxMDYxMzUxMDYwNDIsMC41NjA5MTY3NTU1MDg3ODU1LDAuNTA0NzQ0MjkzODE5MjMzOV0sXCJpbmRleFwiOjM2fSx7XCJpZFwiOlwiMC5sNnNjbDVudGpkXCIsXCJ3aGVlbF9yYWRpdXNcIjpbMC4yNDU1NzgxMjE0ODc1MjU2NywwLjY3NDA0OTYwNDM3MDY4ODFdLFwid2hlZWxfZGVuc2l0eVwiOlswLjA3ODAwNDc4NzkwNjAzNjgyLDAuNTIyNDI5NTY3MzM4NTQ1N10sXCJjaGFzc2lzX2RlbnNpdHlcIjpbMC4wNDYwODg1MTE3MDMyMDU0OV0sXCJ2ZXJ0ZXhfbGlzdFwiOlswLjMwNzUzNTMyNTgwNjczMDYsMC45NDY0OTc0MTk5Njc4MDIsMC40MDYyOTIyMzAyOTQzODU2NiwwLjI3NjM3NDEwNzg5ODIzODcsMC4yNTY0MDQ3NDEzMjQ1NDI3LDAuOTMxMTUzODk5MzI0MDM4OSwwLjY0NTMyNTQxNjM0MDUzMjIsMC42MTE0Nzk2ODI4OTY0NTQ0LDAuNTM3ODI4Mjg4MzkxMDI0NCwwLjE5OTIxNjA5ODQ2NjQ0NTI4LDAuOTY1Mzc4NTM0NTI1MDE5NCwwLjM5Nzg5MDk2ODQ5OTE0NjA3XSxcIndoZWVsX3ZlcnRleFwiOlswLjE3NTI2MDYzNzExMTk2NDA1LDAuNTIxOTIyNzM2NDc4NTcxNSwwLjE5MjI4NDAwODI4Mjg1NjUyLDAuNDc0NzExOTgxMjA4MjgzNCwwLjEyOTM5OTUxOTc2Mzc2NDA3LDAuOTcxOTE1NzQ1OTMzNjQyMywwLjA1ODU1MDU3NTUwMDMzOTcxLDAuMTcwMTE2MDY4MDAzNTkwNDddLFwiaW5kZXhcIjozN30se1wiaWRcIjpcIjAuc2tyNm1taTBzdWdcIixcIndoZWVsX3JhZGl1c1wiOlswLjEzMDE5OTAzNTk1MzE1MTc0LDAuNjk3ODg0NzQxMjE1MzA4OV0sXCJ3aGVlbF9kZW5zaXR5XCI6WzAuOTM4MDM4MzkyOTE2ODM3OSwwLjkwMDYyNjMxNTI3OTc1OTZdLFwiY2hhc3Npc19kZW5zaXR5XCI6WzAuNTM2MjE1MzU3MjIxNTQ5Nl0sXCJ2ZXJ0ZXhfbGlzdFwiOlswLjc4OTg1MzMyMDM0NTIwMzIsMC4wNDgyNjk5NjA5NTk1MjE4NSwwLjEwNDYxNjkwODA3NDM2Mjg2LDAuMTkxNDM1MDg2MDA4NDkxNDYsMC44MTg3NTYxODQ2ODkyNTQ0LDAuMjUzNTc2NTAxNjU2ODQ4MywwLjQ2NDQyNzEwOTMxMDMxNTQsMC43NzQ3MzIxNjYzNTY1NjA1LDAuNzE1NTg4ODU2NDA5OTU2NiwwLjIyNzczNjg0OTg1MDIwNzQ4LDAuODc2NDA0MjQwODA2OTcxMiwwLjI1NjUwMDE5ODIyMzQ5MzU3XSxcIndoZWVsX3ZlcnRleFwiOlswLjk3NDIyNDU0OTY1MDcyODUsMC4zODY0OTUxNTM0NjI4NjU1NiwwLjMzMDcwNDgzMTAyNzA5NywwLjg2OTUxMTczMDcyMTczNzUsMC44MzI0MjEzNTU2MDk5MDc0LDAuMTgxNTczNDE3MDA0NjAwNCwwLjQwNjg1MjkzNzE0Nzc3NzE1LDAuMzY3NzQwODU4MTMxOTM2MzVdLFwiaW5kZXhcIjozOH0se1wiaWRcIjpcIjAuMGJvZDh1bHZlNThcIixcIndoZWVsX3JhZGl1c1wiOlswLjU2OTA4MzgyMDIzNTQxNTYsMC4yNDk0NzMxNzcwNzIzMzY2M10sXCJ3aGVlbF9kZW5zaXR5XCI6WzAuNTMyNzE3MjQ0MjQxNjA5NSwwLjUyMjE4MzE0OTYxNzg3NTddLFwiY2hhc3Npc19kZW5zaXR5XCI6WzAuODU4NjM4MzAzOTI3NDMzXSxcInZlcnRleF9saXN0XCI6WzAuNjU0NDE2NTg0OTg1NjcwNywwLjc5MjE2NzA2NTYxMjA2OTQsMC4yMjgyODEwMTU5MTg4NjU1MiwwLjY2MDg5MTA1MzY1NTg4NjcsMC4wMjUyNjAzNTY0Mjg5MzEwOTcsMC43MDQ0NjE0MjA5MjcxOTI0LDAuOTc2MTkwNzIyODk2MjE5NCwwLjQ3MTE2NDkyMDkxNDY4OTMsMC41NzI3MDUwMjc1NDczNTg0LDAuODI3Mjc1NjYzNTIwNDI0MSwwLjM5ODI1NTcyMTUzNDUyODQsMC41NDY3MDg4MzM0MTU2MTRdLFwid2hlZWxfdmVydGV4XCI6WzAuMjAyNTU5NDY0MTY2ODE2MDMsMC4yODI0NTc5OTIwNzgyMjkxLDAuMzAxODUxODk1MDQwNjM3MjUsMC43MzczMDkxOTIxMjQzNDIyLDAuODM1MzExMzYzOTE2OTU0NSwwLjg3ODczMDgwNjI3MDc0MzcsMC4yMDIyMzAwNDQ4NDkzMDI4NSwwLjc4MTI3NjY0NDM3ODg5NTldLFwiaW5kZXhcIjozOX1dfSIsInZhciBjcmVhdGUgPSByZXF1aXJlKFwiLi4vY3JlYXRlLWluc3RhbmNlXCIpO1xyXG52YXIgc2VsZWN0aW9uID0gcmVxdWlyZShcIi4vc2VsZWN0aW9uLmpzL1wiKTtcclxudmFyIG11dGF0aW9uID0gcmVxdWlyZShcIi4vbXV0YXRpb24uanMvXCIpO1xyXG52YXIgY3Jvc3NvdmVyID0gcmVxdWlyZShcIi4vY3Jvc3NvdmVyLmpzL1wiKTtcclxudmFyIGNsdXN0ZXIgPSByZXF1aXJlKFwiLi9jbHVzdGVyaW5nL2NsdXN0ZXJTZXR1cC5qcy9cIik7XHJcbnZhciByYW5kb21JbnQgPSByZXF1aXJlKFwiLi9yYW5kb21JbnQuanMvXCIpO1xyXG52YXIgZ2V0UmFuZG9tSW50ID0gcmFuZG9tSW50LmdldFJhbmRvbUludDtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0ge1xyXG4gIGdlbmVyYXRpb25aZXJvOiBnZW5lcmF0aW9uWmVybyxcclxuICBuZXh0R2VuZXJhdGlvbjogbmV4dEdlbmVyYXRpb25cclxufVxyXG5cclxuZnVuY3Rpb24gZ2VuZXJhdGlvblplcm8oY29uZmlnKXtcclxuICB2YXIgZ2VuZXJhdGlvblNpemUgPSBjb25maWcuZ2VuZXJhdGlvblNpemUsXHJcbiAgc2NoZW1hID0gY29uZmlnLnNjaGVtYTtcclxuICB2YXIgdXNlRmlsZSA9IGZhbHNlO1xyXG4gIHZhciBjd19jYXJHZW5lcmF0aW9uID0gW107XHJcbiAgaWYodXNlRmlsZT09PXRydWUpe1xyXG5cdCAgY3dfY2FyR2VuZXJhdGlvbj0gcmVhZEZpbGUoKTtcclxuICB9XHJcbiAgZWxzZSB7XHJcblx0ICBmb3IgKHZhciBrID0gMDsgayA8IGdlbmVyYXRpb25TaXplOyBrKyspIHtcclxuXHRcdHZhciBkZWYgPSBjcmVhdGUuY3JlYXRlR2VuZXJhdGlvblplcm8oc2NoZW1hLCBmdW5jdGlvbigpe1xyXG5cdFx0cmV0dXJuIE1hdGgucmFuZG9tKClcclxuXHRcdH0pO1xyXG5cdFx0ZGVmLmluZGV4ID0gaztcclxuXHRcdGN3X2NhckdlbmVyYXRpb24ucHVzaChkZWYpO1xyXG5cdH1cclxuICB9XHJcbiAgcmV0dXJuIHtcclxuICAgIGNvdW50ZXI6IDAsXHJcbiAgICBnZW5lcmF0aW9uOiBjd19jYXJHZW5lcmF0aW9uLFxyXG4gIH07XHJcbn1cclxuXHJcbi8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tIG15IGNvZGUgam9iNjRcclxuLypUaGlzIGZ1bmN0aW9uIGxvYWRzIGFuIGluaXRpYWwgY2FyIHBvcHVsYXRpb24gZnJvbSBhIC5qc29uIGZpbGUqL1xyXG5mdW5jdGlvbiByZWFkRmlsZSgpe1xyXG5cdHZhciBmcyA9IHJlcXVpcmUoJ2ZzJyk7XHJcblx0dmFyIGFycmF5ID0gW107XHJcblx0dmFyIGZpbGUgPSByZXF1aXJlKFwiLi9pbml0aWFsQ2Fycy5qc29uL1wiKTtcclxuXHRmb3IodmFyIGkgPSAwO2k8ZmlsZS5hcnJheS5sZW5ndGg7aSsrKXtcclxuXHRcdGFycmF5LnB1c2goZmlsZS5hcnJheVtpXSk7XHJcblx0fVxyXG5cdHJldHVybiBhcnJheTtcclxufVxyXG5cclxuLypUaGlzIGZ1bmN0aW9uIENob29zZXMgd2hpY2ggc2VsZWN0aW9uIG9wZXJhdG9yIHRvIHVzZSBpbiB0aGUgc2VsZWN0aW9uIG9mIHR3byBwYXJlbnRzIGZvciB0d28gbmV3IGNhcnMgc3VjaCBhcyBlaXRoZXIgVG91cm5hbWVudCBvciBSb3VsZXR0ZS13aGVlbCBzZWxlY3Rpb25cclxuQHBhcmFtIHBhcmVudHMgT2JqZWN0QXJyYXkgLSBBZGRpbmcgdGhlIHNlbGVjdGVkIG9iamVjdCBpbnRvIHRoaXMgYXJyYXlcclxuQHBhcmFtIHNjb3JlcyBPYmplY3RBcnJheSAtIEFuIGFycmF5IG9mIGNhcnMgd2hlcmUgdGhlIHBhcmVudHMgd2lsbCBiZSBzZWxlY3RlZCBmcm9tXHJcbkBwYXJhbSBpbmNyZWFzZU1hdGUgQm9vbGVhbiAtIFdoZXRoZXIgdGhlIGN1cnJlbnQgc2VsZWN0aW9uIHdpbGwgaW5jbHVkZSBhbiBlbGl0ZSB3aGVyZSBpZiB0cnVlIGl0IHdvbnQgYmUgZGVsZXRlZCBmcm9tIHRoZSBPYmplY3QgYXJyYXkgYWxsb3dpbmcgaXQgdG8gYmUgdXNlZCBhZ2FpblxyXG5AcGFyYW0gc2VsZWN0aW9uVHlwZU9uZSBpbnQgLSB0aGUgc2VsZWN0aW9uIG1ldGhvZCBmb3IgdGhlIGZpcnN0IHBhcmVudFxyXG5AcGFyYW0gc2VsZWN0aW9uVHlwZVR3byBpbnQgLSB0aGUgc2VsZWN0aW9uIG1ldGhvZCBmb3IgdGhlIHNlY29uZCBwYXJlbnRcclxuQHBhcmFtIG1hdGVJbmNyZWFzZVNlbGVjdGlvbk1ldGhvZCBpbnQgLSB0aGUgc2VsZWN0aW9uIG1ldGhvZCBmb3IgY2hvb3NpbmcgdGhlIG1hdGVJbmNyZWFzZSBwYXJlbnQgd2hpY2ggd2lsbCBub3QgYmUgZGVsZXRlZFxyXG5AcmV0dXJuIHBhcmVudHNTY29yZSBpbnQgLSByZXR1cm5zIHRoZSBhdmVyYWdlIHNjb3JlIG9mIHRoZSBwYXJlbnRzKi9cclxuZnVuY3Rpb24gc2VsZWN0UGFyZW50cyhwYXJlbnRzLCBzY29yZXMsIGluY3JlYXNlTWF0ZSwgc2VsZWN0aW9uVHlwZU9uZSwgc2VsZWN0aW9uVHlwZVR3bywgbWF0ZUluY3JlYXNlU2VsZWN0aW9uTWV0aG9kKXtcclxuXHR2YXIgcGFyZW50MSA9IHNlbGVjdGlvbi5ydW5TZWxlY3Rpb24oc2NvcmVzLChpbmNyZWFzZU1hdGU9PT1mYWxzZSk/c2VsZWN0aW9uVHlwZU9uZTptYXRlSW5jcmVhc2VTZWxlY3Rpb25NZXRob2QpO1xyXG5cdHBhcmVudHMucHVzaChwYXJlbnQxLmRlZik7XHJcblx0aWYoaW5jcmVhc2VNYXRlPT09ZmFsc2Upe1xyXG5cdFx0c2NvcmVzLnNwbGljZShzY29yZXMuZmluZEluZGV4KHg9PiB4LmRlZi5pZD09PXBhcmVudHNbMF0uaWQpLDEpO1xyXG5cdH1cclxuXHR2YXIgcGFyZW50MiA9IHNlbGVjdGlvbi5ydW5TZWxlY3Rpb24oc2NvcmVzLChpbmNyZWFzZU1hdGU9PT1mYWxzZSk/c2VsZWN0aW9uVHlwZVR3bzptYXRlSW5jcmVhc2VTZWxlY3Rpb25NZXRob2QpO1xyXG5cdHBhcmVudHMucHVzaChwYXJlbnQyLmRlZik7XHJcblx0c2NvcmVzLnNwbGljZShzY29yZXMuZmluZEluZGV4KHg9PiB4LmRlZi5pZD09PXBhcmVudHNbMV0uaWQpLDEpO1xyXG5cdHJldHVybiAocGFyZW50MS5zY29yZS5zICsgcGFyZW50Mi5zY29yZS5zKS8yO1xyXG59XHJcblxyXG4vKlRoaXMgZnVuY3Rpb24gcnVucyBhIEV2b2x1dGlvbmFyeSBhbGdvcml0aG0gd2hpY2ggdXNlcyBTZWxlY3Rpb24sIENyb3Nzb3ZlciBhbmQgbXV0YXRpb25zIHRvIGNyZWF0ZSB0aGUgbmV3IHBvcHVsYXRpb25zIG9mIGNhcnMuXHJcbkBwYXJhbSBzY29yZXMgT2JqZWN0QXJyYXkgLSBBbiBhcnJheSB3aGljaCBob2xkcyB0aGUgY2FyIG9iamVjdHMgYW5kIHRoZXJlIHBlcmZvcm1hbmNlIHNjb3Jlc1xyXG5AcGFyYW0gY29uZmlnIC0gVGhpcyBpcyB0aGUgZ2VuZXJhdGlvbkNvbmZpZyBmaWxlIHBhc3NlZCB0aHJvdWdoIHdoaWNoIGdpdmVzIHRoZSBjYXJzIHRlbXBsYXRlL2JsdWVwcmludCBmb3IgY3JlYXRpb25cclxuQHBhcmFtIG5vQ2Fyc0NyZWF0ZWQgaW50IC0gVGhlIG51bWJlciBvZiBjYXJzIHRoZXJlIGN1cnJlbnRseSBleGlzdCB1c2VkIGZvciBjcmVhdGluZyB0aGUgaWQgb2YgbmV3IGNhcnNcclxuQHBhcmFtIHNlbGVjdGlvblR5cGVPbmUgaW50IC0gdGhlIHNlbGVjdGlvbiBtZXRob2QgZm9yIHRoZSBmaXJzdCBwYXJlbnRcclxuQHBhcmFtIHNlbGVjdGlvblR5cGVUd28gaW50IC0gdGhlIHNlbGVjdGlvbiBtZXRob2QgZm9yIHRoZSBzZWNvbmQgcGFyZW50XHJcbkBwYXJhbSBtdXRhdGlvblR5cGUgaW50IC0gdGhlIHR5cGUgb2YgbXV0YXRpb24gdG8gYmUgdXNlZCBlaXRoZXIgc2luZ2xlIG11dGF0aW9uIG9yIG11bHRpLW11dGF0aW9uc1xyXG5AcGFyYW0gbWF0ZUluY3JlYXNlU2VsZWN0aW9uTWV0aG9kIGludCAtIHRoZSBzZWxlY3Rpb24gbWV0aG9kIGZvciBjaG9vc2luZyB0aGUgbWF0ZUluY3JlYXNlIHBhcmVudCB3aGljaCB3aWxsIG5vdCBiZSBkZWxldGVkXHJcbkByZXR1cm4gbmV3R2VuZXJhdGlvbiBPYmplY3RBcnJheSAtIGlzIHJldHVybmVkIHdpdGggYWxsIHRoZSBuZXdseSBjcmVhdGVkIGNhcnMgdGhhdCB3aWxsIGJlIGluIHRoZSBzaW11bGF0aW9uKi9cclxuZnVuY3Rpb24gcnVuRUEoc2NvcmVzLCBjb25maWcsIG5vQ2Fyc0NyZWF0ZWQsIG5vRWxpdGVzLCBjcm9zc292ZXJUeXBlLCBub01hdGVJbmNyZWFzZSwgc2VsZWN0aW9uVHlwZU9uZSwgc2VsZWN0aW9uVHlwZVR3bywgbXV0YXRpb25UeXBlLCBtYXRlSW5jcmVhc2VTZWxlY3Rpb25NZXRob2QsIGNsdXN0KXtcclxuXHRzY29yZXMuc29ydChmdW5jdGlvbihhLCBiKXtyZXR1cm4gYi5zY29yZS5zIC0gYS5zY29yZS5zO30pO1xyXG5cdHZhciBnZW5lcmF0aW9uU2l6ZT1zY29yZXMubGVuZ3RoO1xyXG5cdHZhciBuZXdHZW5lcmF0aW9uID0gbmV3IEFycmF5KCk7XHJcblx0dmFyIG1heE5vTWF0ZXNJbmNyZWFzZXMgPSBub01hdGVJbmNyZWFzZTtcclxuXHR2YXIgY3VycmVudE5vTWF0ZUluY3JlYXNlcyA9IDA7XHJcblx0dmFyIG5vRWxpdGVzPW5vRWxpdGVzO1xyXG5cdHZhciB0ZW1wQ2x1c3Q7XHJcblx0aWYodHlwZW9mIGNsdXN0ICE9PSBcInVuZGVmaW5lZFwiKXtcclxuXHRcdGlmKGNsdXN0LmNhcnNBcnJheS5sZW5ndGg+MjApe3RlbXBDbHVzdD1jbHVzdDt9XHJcblx0fVxyXG5cdGZvcih2YXIgaT0wO2k8bm9FbGl0ZXM7aSsrKXsvL2FkZCBuZXcgZWxpdGVzIHRvIG5ld0dlbmVyYXRpb25cclxuXHRcdHZhciBuZXdFbGl0ZSA9IHNjb3Jlc1tpXS5kZWY7XHJcblx0XHRuZXdFbGl0ZS5lbGl0ZSA9IHRydWU7XHJcblx0XHRuZXdHZW5lcmF0aW9uLnB1c2gobmV3RWxpdGUpO1xyXG5cdH1cclxuXHRmb3IodmFyIGsgPSAwO2s8Z2VuZXJhdGlvblNpemUvMjtrKyspe1xyXG5cdFx0aWYobmV3R2VuZXJhdGlvbi5sZW5ndGghPT1nZW5lcmF0aW9uU2l6ZSl7XHJcblx0XHR2YXIgcGlja2VkUGFyZW50cyA9IFtdO1xyXG5cdFx0dmFyIHBhcmVudHNTY29yZSA9IHNlbGVjdFBhcmVudHMocGlja2VkUGFyZW50cywgc2NvcmVzLCAoY3VycmVudE5vTWF0ZUluY3JlYXNlczxtYXhOb01hdGVzSW5jcmVhc2VzKT90cnVlOmZhbHNlLCBzZWxlY3Rpb25UeXBlT25lLCBzZWxlY3Rpb25UeXBlVHdvLCBtYXRlSW5jcmVhc2VTZWxlY3Rpb25NZXRob2QpOyBcclxuXHRcdGlmKGN1cnJlbnROb01hdGVJbmNyZWFzZXM8bWF4Tm9NYXRlc0luY3JlYXNlcyl7Y3VycmVudE5vTWF0ZUluY3JlYXNlcysrO31cclxuXHRcdFx0dmFyIG5ld0NhcnMgPSBjcm9zc292ZXIucnVuQ3Jvc3NvdmVyKHBpY2tlZFBhcmVudHMsIGNyb3Nzb3ZlclR5cGUsY29uZmlnLnNjaGVtYSwgcGFyZW50c1Njb3JlLCBub0NhcnNDcmVhdGVkLCAobmV3R2VuZXJhdGlvbi5sZW5ndGg9PT1nZW5lcmF0aW9uU2l6ZS0xKT8xOjIpO1xyXG5cdFx0XHRmb3IodmFyIGk9MDtpPG5ld0NhcnMubGVuZ3RoO2krKyl7XHJcblx0XHRcdFx0bmV3Q2Fyc1tpXS5lbGl0ZSA9IGZhbHNlO1xyXG5cdFx0XHRcdG5ld0NhcnNbaV0uaW5kZXggPSBrO1xyXG5cdFx0XHRcdG5ld0dlbmVyYXRpb24ucHVzaChuZXdDYXJzW2ldKTtcclxuXHRcdFx0XHRub0NhcnNDcmVhdGVkKys7Ly8gdXNlZCBpbiBjYXIgaWQgY3JlYXRpb25cclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdH1cdFxyXG5cdG5ld0dlbmVyYXRpb24uc29ydChmdW5jdGlvbihhLCBiKXtyZXR1cm4gYS5wYXJlbnRzU2NvcmUgLSBiLnBhcmVudHNTY29yZTt9KTtcclxuXHRmb3IodmFyIHggPSAwO3g8bmV3R2VuZXJhdGlvbi5sZW5ndGg7eCsrKXtcclxuXHRcdFx0dmFyIGN1cnJlbnRJRCA9IG5ld0dlbmVyYXRpb25beF0uaWQ7XHJcblx0XHRcdGlmKG5ld0dlbmVyYXRpb25beF0uZWxpdGU9PT1mYWxzZSl7XHJcblx0XHRcdFx0bmV3R2VuZXJhdGlvblt4XSA9ICgobXV0YXRpb25UeXBlPT09MCl8fChtdXRhdGlvblR5cGU9PT0zKSk/bXV0YXRpb24ubXV0YXRlKG5ld0dlbmVyYXRpb25beF0sIHRlbXBDbHVzdCk6bXV0YXRpb24ubXVsdGlNdXRhdGlvbnMobmV3R2VuZXJhdGlvblt4XSxuZXdHZW5lcmF0aW9uLmZpbmRJbmRleCh4PT4geC5pZD09PWN1cnJlbnRJRCksMjApO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0XHRjb25zb2xlLmxvZyhuZXdHZW5lcmF0aW9uKTtcclxuXHRyZXR1cm4gbmV3R2VuZXJhdGlvbjtcclxufVxyXG5cclxuLypUaGlzIGZ1bmN0aW9uIHJ1bnMgdGhlIEJhc2VsaW5lIEV2b2x1dGlvbmFyeSBhbGdvcml0aG0gd2hpY2ggb25seSBydW5zIGEgbXV0YXRpb24gb3IgbXVsdGlNdXRhdGlvbnMgb3ZlciBhbGwgdGhlIGNhcnMgcGFzc2VkIHRob3VnaCBpbiB0aGUgc2NvcmVzIHBhcmFtZXRlci5cclxuQHBhcmFtIHNjb3JlcyBBcnJheSAtIFRoaXMgcGFyYW1ldGVyIGlzIGFuIGFycmF5IG9mIGNhcnMgdGhhdCBob2xkcyB0aGUgc2NvcmUgc3RhdGlzdGljcyBhbmQgY2FyIGRhdGEgc3VjaCBhcyBpZCBhbmQgXCJ3aGVlbF9yYWRpdXNcIiwgXCJjaGFzc2lzX2RlbnNpdHlcIiwgXCJ2ZXJ0ZXhfbGlzdFwiLCBcIndoZWVsX3ZlcnRleFwiIGFuZCBcIndoZWVsX2RlbnNpdHlcIlxyXG5AcGFyYW0gY29uZmlnIC0gVGhpcyBwYXNzZXMgYSBmaWxlIHdpdGggZnVuY3Rpb25zIHRoYXQgY2FuIGJlIGNhbGxlZC5cclxuQHJldHVybiBuZXdHZW5lcmF0aW9uIC0gdGhpcyBpcyB0aGUgbmV3IHBvcHVsYXRpb24gdGhhdCBoYXZlIGhhZCBtdXRhdGlvbnMgYXBwbGllZCB0byB0aGVtLiovXHJcbmZ1bmN0aW9uIHJ1bkJhc2VsaW5lRUEoc2NvcmVzLCBjb25maWcsIGNsdXN0KXtcclxuXHRzY29yZXMuc29ydChmdW5jdGlvbihhLCBiKXtyZXR1cm4gYS5zY29yZS5zIC0gYi5zY29yZS5zO30pO1xyXG5cdHZhciBzY2hlbWEgPSBjb25maWcuc2NoZW1hOy8vbGlzdCBvZiBjYXIgdmFyaWFibGVzIGkuZSBcIndoZWVsX3JhZGl1c1wiLCBcImNoYXNzaXNfZGVuc2l0eVwiLCBcInZlcnRleF9saXN0XCIsIFwid2hlZWxfdmVydGV4XCIgYW5kIFwid2hlZWxfZGVuc2l0eVwiXHJcblx0dmFyIG5ld0dlbmVyYXRpb24gPSBuZXcgQXJyYXkoKTtcclxuXHR2YXIgZ2VuZXJhdGlvblNpemU9c2NvcmVzLmxlbmd0aDtcclxuXHRjb25zb2xlLmxvZyhzY29yZXMpOy8vdGVzdCBkYXRhXHJcblx0Zm9yICh2YXIgayA9IDA7IGsgPCBnZW5lcmF0aW9uU2l6ZTsgaysrKSB7XHJcblx0XHR2YXIgdGVtcENsdXN0O1xyXG5cdFx0aWYoY2x1c3QuYXJyYXlPZkNsdXN0ZXJzWzBdLmRhdGFBcnJheS5sZW5ndGg+Mil7dGVtcENsdXN0PWNsdXN0O31cclxuXHRcdG5ld0dlbmVyYXRpb24ucHVzaChtdXRhdGlvbi5tdXRhdGUoc2NvcmVzW2tdLmRlZiwgdGVtcENsdXN0KSk7XHJcblx0XHQvL25ld0dlbmVyYXRpb24ucHVzaChtdXRhdGlvbi5tdXRhdGUoc2NvcmVzW2tdLmRlZikpO1xyXG5cdFx0Ly9uZXdHZW5lcmF0aW9uLnB1c2gobXV0YXRpb24ubXVsdGlNdXRhdGlvbnMoc2NvcmVzW2tdLmRlZixzY29yZXMuZmluZEluZGV4KHg9PiB4LmRlZi5pZD09PXNjb3Jlc1trXS5kZWYuaWQpLDIwKSk7XHJcblx0XHRuZXdHZW5lcmF0aW9uW2tdLmVsaXRlID0gZmFsc2U7XHJcblx0XHRuZXdHZW5lcmF0aW9uW2tdLmluZGV4ID0gaztcclxuXHR9XHJcblx0XHJcblx0cmV0dXJuIG5ld0dlbmVyYXRpb247XHJcbn1cdFxyXG5cclxuLypcclxuVGhpcyBmdW5jdGlvbiBoYW5kbGVzIHRoZSBjaG9vc2luZyBvZiB3aGljaCBFdm9sdXRpb25hcnkgYWxnb3JpdGhtIHRvIHJ1biBhbmQgcmV0dXJucyB0aGUgbmV3IHBvcHVsYXRpb24gdG8gdGhlIHNpbXVsYXRpb24qL1xyXG5mdW5jdGlvbiBuZXh0R2VuZXJhdGlvbihwcmV2aW91c1N0YXRlLCBzY29yZXMsIGNvbmZpZyl7XHJcblx0Ly8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0gU0VUIEVWT0xVVElPTkFSWSBBTEdPUklUSE0gT1BFUkFUT1JTIEhFUkUgPC0tLS0tLS0tLS0tLS0tLVxyXG5cdHZhciBub0VsaXRlcyA9IDE7Ly90eXBlIHRoZSBudW1iZXIgb2YgZWxpdGVzIGZvciB0aGUgcHJvZ3JhbSB0byB1c2VcclxuXHR2YXIgY3Jvc3NvdmVyVHlwZT0wOy8vd3JpdGUgMSBmb3Igb25lLXBvaW50IGNyb3Nzb3ZlciBhbnlvdGhlciBmb3IgdHdvLXBvaW50IGNyb3Nzb3ZlclxyXG5cdHZhciBub01hdGVJbmNyZWFzZT0wOy8vVGhlIG51bWJlciBvZiBjYXJzIHRoYXQgY2FuIG1hdGUgdHdpY2UgcHJvZHVjaW5nIDQga2lkcyBub3QgMlxyXG5cdHZhciBtYXRlSW5jcmVhc2VTZWxlY3Rpb25NZXRob2QgPSAxOy8vIDEgZm9yIHRvdXJuYW1lbnQgc2VsZWN0aW9uIHVzaW5nIHN1Yi1hcnJheXMvIDIgZm9yIHRvdXJuYW1lbnQgc2VsZWN0aW9uIHRvIGdldCB3ZWFrZXN0IGNhci8zIGZvciByb3VsZXR0ZS1zZWxlY3Rpb24vIDQgZm9yIHVuaWZvcm0gcmFuZG9tIHNlbGVjdGlvblxyXG5cdC8vIHNlbGVjdGlvblR5cGUgZm9yIHNlbGVjdGlvbiB0aGUgdHdvIHBhcmVudHMgc2VsZWN0aW9uVHlwZU9uZSBmb3IgdGhlIGZpcnN0IHNsZWN0aW9uLCBzZWxlY3Rpb25UeXBlVHdvIGZvciB0aGUgc2Vjb25kIHBhcmVudFxyXG5cdHZhciBzZWxlY3Rpb25UeXBlT25lID0gMTsvLyAxIGZvciB0b3VybmFtZW50IHNlbGVjdGlvbiB1c2luZyBzdWItYXJyYXlzLyAyIGZvciB0b3VybmFtZW50IHNlbGVjdGlvbiB0byBnZXQgd2Vha2VzdCBjYXIvMyBmb3Igcm91bGV0dGUtc2VsZWN0aW9uLyA0IGZvciB1bmlmb3JtIHJhbmRvbSBzZWxlY3Rpb25cclxuXHR2YXIgc2VsZWN0aW9uVHlwZVR3byA9IDE7Ly8gMSBmb3IgdG91cm5hbWVudCBzZWxlY3Rpb24gdXNpbmcgc3ViLWFycmF5cy8gMiBmb3IgdG91cm5hbWVudCBzZWxlY3Rpb24gdG8gZ2V0IHdlYWtlc3QgY2FyLzMgZm9yIHJvdWxldHRlLXNlbGVjdGlvbi8gNCBmb3IgdW5pZm9ybSByYW5kb20gc2VsZWN0aW9uXHJcblx0dmFyIG11dGF0aW9uVHlwZSA9MDsvLzAgZm9yIHN0YW5kYXJkIDEgbXV0YXRpb24gdHlwZSAxIGZvciBtdWx0aS1tdXRhdGlvbnMsIDMgZm9yIGNsdXN0ZXIgbXV0YXRpb25cclxuXHR2YXIgdXNlQ2x1c3RlcmluZ1Njb3JpbmcgPSBmYWxzZTtcclxuXHQvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcblx0dmFyIGdlbmVyYXRpb25TaXplPXNjb3Jlcy5sZW5ndGg7XHJcblx0dmFyIG5ld0dlbmVyYXRpb24gPSBuZXcgQXJyYXkoKTtcclxuXHR2YXIgY291bnQ7XHJcblx0dmFyIHRlbXBSb3VuZD0wO1xyXG5cdFxyXG5cdHRlbXBSb3VuZD0odHlwZW9mIHByZXZpb3VzU3RhdGUucm91bmQgPT09XCJ1bmRlZmluZWRcIik/MDpwcmV2aW91c1N0YXRlLnJvdW5kO1xyXG5cdGNvdW50ID0gcHJldmlvdXNTdGF0ZS5jb3VudGVyICsgMTtcclxuXHR2YXIgY2x1c3RlckludDtcclxuXHRpZigobXV0YXRpb25UeXBlPT09Myl8fCh1c2VDbHVzdGVyaW5nU2NvcmluZz09PXRydWUpKXtcclxuXHRcdGlmKHByZXZpb3VzU3RhdGUuY291bnRlcj09PTApe1xyXG5cdFx0XHRjbHVzdGVySW50PWNsdXN0ZXIuc2V0dXAoc2NvcmVzLG51bGwsZmFsc2UpXHJcblx0XHR9XHJcblx0XHRlbHNle1xyXG5cdFx0XHRjbHVzdGVySW50PWNsdXN0ZXIuc2V0dXAoc2NvcmVzLHByZXZpb3VzU3RhdGUuY2x1c3QsdHJ1ZSlcclxuXHRcdH1cclxuXHRcdGlmKHVzZUNsdXN0ZXJpbmdTY29yaW5nPT09dHJ1ZSl7XHJcblx0XHRjbHVzdGVyLnJlU2NvcmVDYXJzKHNjb3JlcyAsY2x1c3RlckludCk7XHJcblx0XHR9XHJcblx0fVxyXG5cdHNjb3Jlcy5zb3J0KGZ1bmN0aW9uKGEsIGIpe3JldHVybiBhLnNjb3JlLnMgLSBiLnNjb3JlLnM7fSk7XHJcblx0dmFyIG51bWJlck9mQ2FycyA9IChwcmV2aW91c1N0YXRlLmNvdW50ZXI9PT0wKT9nZW5lcmF0aW9uU2l6ZTpwcmV2aW91c1N0YXRlLm5vQ2FycytnZW5lcmF0aW9uU2l6ZTtcclxuXHR2YXIgc2NoZW1hID0gY29uZmlnLnNjaGVtYTsvL2xpc3Qgb2YgY2FyIHZhcmlhYmxlcyBpLmUgXCJ3aGVlbF9yYWRpdXNcIiwgXCJjaGFzc2lzX2RlbnNpdHlcIiwgXCJ2ZXJ0ZXhfbGlzdFwiLCBcIndoZWVsX3ZlcnRleFwiXHJcblx0XHJcblx0Y29uc29sZS5sb2coXCJMb2cgLS0gXCIrcHJldmlvdXNTdGF0ZS5jb3VudGVyKTtcclxuXHQvL2NvbnNvbGUubG9nKHNjb3Jlc0RhdGEpOy8vdGVzdCBkYXRhXHJcblx0dmFyIGVhVHlwZSA9IDE7XHJcblx0bmV3R2VuZXJhdGlvbiA9IChlYVR5cGU9PT0xKT9ydW5FQShzY29yZXMsIGNvbmZpZywgbnVtYmVyT2ZDYXJzLCBub0VsaXRlcywgY3Jvc3NvdmVyVHlwZSwgbm9NYXRlSW5jcmVhc2UsIHNlbGVjdGlvblR5cGVPbmUsIHNlbGVjdGlvblR5cGVUd28sIG11dGF0aW9uVHlwZSwgbWF0ZUluY3JlYXNlU2VsZWN0aW9uTWV0aG9kLCBjbHVzdGVySW50KTpydW5CYXNlbGluZUVBKHNjb3JlcywgY29uZmlnLGNsdXN0ZXJJbnQpO1xyXG5cdC8vY29uc29sZS5sb2cobmV3R2VuZXJhdGlvbik7Ly90ZXN0IGRhdGFcclxuXHRpZihwcmV2aW91c1N0YXRlLmNvdW50ZXI+MTUwKXtcclxuXHRcdGNvdW50PTA7XHJcblx0XHR0ZW1wUm91bmQrKztcclxuXHRcdC8vbmV3R2VuZXJhdGlvbj1nZW5lcmF0aW9uWmVybyhjb25maWcpLmdlbmVyYXRpb247XHJcblx0XHRcclxuXHR9XHJcbiAgcmV0dXJuIHtcclxuICAgIGNvdW50ZXI6IGNvdW50LFxyXG4gICAgZ2VuZXJhdGlvbjogbmV3R2VuZXJhdGlvbixcclxuXHRjbHVzdDogY2x1c3RlckludCxcclxuXHRub0NhcnM6IG51bWJlck9mQ2FycyxcclxuXHRyb3VuZDogdGVtcFJvdW5kXHJcbiAgfTtcclxufVxyXG5cclxuXHJcbi8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tIGVuZCBvZiBteSBjb2RlIGpvYjY0XHJcblxyXG5cclxuZnVuY3Rpb24gbWFrZUNoaWxkKGNvbmZpZywgcGFyZW50cyl7XHJcbiAgdmFyIHNjaGVtYSA9IGNvbmZpZy5zY2hlbWEsXHJcbiAgICBwaWNrUGFyZW50ID0gY29uZmlnLnBpY2tQYXJlbnQ7XHJcbiAgcmV0dXJuIGNyZWF0ZS5jcmVhdGVDcm9zc0JyZWVkKHNjaGVtYSwgcGFyZW50cywgcGlja1BhcmVudClcclxufVxyXG5cclxuXHJcblxyXG5mdW5jdGlvbiBtdXRhdGUoY29uZmlnLCBwYXJlbnQpe1xyXG4gIHZhciBzY2hlbWEgPSBjb25maWcuc2NoZW1hLFxyXG4gICAgbXV0YXRpb25fcmFuZ2UgPSBjb25maWcubXV0YXRpb25fcmFuZ2UsXHJcbiAgICBnZW5fbXV0YXRpb24gPSBjb25maWcuZ2VuX211dGF0aW9uLFxyXG4gICAgZ2VuZXJhdGVSYW5kb20gPSBjb25maWcuZ2VuZXJhdGVSYW5kb207XHJcbiAgcmV0dXJuIGNyZWF0ZS5jcmVhdGVNdXRhdGVkQ2xvbmUoXHJcbiAgICBzY2hlbWEsXHJcbiAgICBnZW5lcmF0ZVJhbmRvbSxcclxuICAgIHBhcmVudCxcclxuICAgIE1hdGgubWF4KG11dGF0aW9uX3JhbmdlKSxcclxuICAgIGdlbl9tdXRhdGlvblxyXG4gIClcclxufVxyXG4iLCJ2YXIgY2x1c3RlciA9IHJlcXVpcmUoXCIuL2NsdXN0ZXJpbmcvY2x1c3RlclNldHVwLmpzL1wiKTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0ge1xyXG5cdG11dGF0ZTogbXV0YXRlLFxyXG5cdG11bHRpTXV0YXRpb25zOiBtdWx0aU11dGF0aW9uc1xyXG59XHJcblxyXG4vKlRoaXMgZnVuY3Rpb24gcmV0dXJucyB3aG9sZSBpbnRzIGJldHdlZW4gYSBtaW5pbXVtIGFuZCBtYXhpbXVtXHJcbkBwYXJhbSBtaW4gaW50IC0gVGhlIG1pbmltdW0gaW50IHRoYXQgY2FuIGJlIHJldHVybmVkXHJcbkBwYXJhbSBtYXggaW50IC0gVGhlIG1heGltdW0gaW50IHRoYXQgY2FuIGJlIHJldHVybmVkXHJcbkBwYXJhbSBub3RFcXVhbHNBcnIgaW50QXJyYXkgLSBBbiBhcnJheSBvZiB0aGUgaW50cyB0aGF0IHRoZSBmdW5jdGlvbiBzaG91bGQgbm90IHJldHVyblxyXG5AcmV0dXJuIGludCAtIFRoZSBpbnQgd2l0aGluIHRoZSBzcGVjaWZpZWQgcGFyYW1ldGVyIGJvdW5kcyBpcyByZXR1cm5lZC4qL1xyXG5mdW5jdGlvbiBnZXRSYW5kb21JbnQobWluLCBtYXgsIG5vdEVxdWFsc0Fycikge1xyXG5cdHZhciB0b1JldHVybjtcclxuXHR2YXIgcnVuTG9vcCA9IHRydWU7XHJcblx0d2hpbGUocnVuTG9vcD09PXRydWUpe1xyXG5cdFx0bWluID0gTWF0aC5jZWlsKG1pbik7XHJcblx0XHRtYXggPSBNYXRoLmZsb29yKG1heCk7XHJcblx0XHR0b1JldHVybiA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIChtYXggLSBtaW4gKyAxKSkgKyBtaW47XHJcblx0XHRpZih0eXBlb2Ygbm90RXF1YWxzQXJyID09PSBcInVuZGVmaW5lZFwiKXtcclxuXHRcdFx0cnVuTG9vcD1mYWxzZTtcclxuXHRcdH1cclxuXHRcdGVsc2UgaWYobm90RXF1YWxzQXJyLmZpbmQoZnVuY3Rpb24odmFsdWUpe3JldHVybiB2YWx1ZT09PXRvUmV0dXJuO30pIT09dG9SZXR1cm4pe1xyXG5cdFx0XHRydW5Mb29wPWZhbHNlO1xyXG5cdFx0fVxyXG5cdH1cclxuICAgIHJldHVybiB0b1JldHVybjsvLyh0eXBlb2YgZmluZElmRXhpc3RzID09PSBcInVuZGVmaW5lZFwiKT90b1JldHVybjpnZXRSYW5kb21JbnQobWluLCBtYXgsIG5vdEVxdWFsc0Fycik7XHJcbn1cclxuXHJcblxyXG5mdW5jdGlvbiBjaGFuZ2VBcnJheVZhbHVlKGlkLCBvcmlnaW5hbFZhbHVlLCBjbHVzdCwgZGF0YVR5cGUpe1xyXG5cdGZvcih2YXIgaT0wO2k8b3JpZ2luYWxWYWx1ZS5sZW5ndGg7aSsrKXtcclxuXHRcdGlmKHR5cGVvZiBjbHVzdCA9PT0gXCJ1bmRlZmluZWRcIil7XHJcblx0XHRcdHZhciByYW5kb21GbG9hdCA9IE1hdGgucmFuZG9tKCk7XHJcblx0XHRcdHZhciBtdXRhdGlvblJhdGUgPSAwLjUqcmFuZG9tRmxvYXQ7Ly9NYXRoLnJhbmRvbSgpO1xyXG5cdFx0XHR2YXIgaW5jcmVhc2VPckRlY3JlYXNlID0gZ2V0UmFuZG9tSW50KDAsMSxbXSk7XHJcblx0XHRcdG5ld1ZhbHVlID0gKGluY3JlYXNlT3JEZWNyZWFzZT09PTApP29yaWdpbmFsVmFsdWVbaV0tbXV0YXRpb25SYXRlOm9yaWdpbmFsVmFsdWVbaV0rbXV0YXRpb25SYXRlO1xyXG5cdFx0XHRpZihuZXdWYWx1ZTwwKXtcclxuXHRcdFx0XHRuZXdWYWx1ZSA9IG9yaWdpbmFsVmFsdWVbaV0rbXV0YXRpb25SYXRlO1xyXG5cdFx0XHR9IGVsc2UgaWYobmV3VmFsdWU+MSl7XHJcblx0XHRcdFx0bmV3VmFsdWUgPSBvcmlnaW5hbFZhbHVlW2ldLW11dGF0aW9uUmF0ZTtcclxuXHRcdFx0fVxyXG5cdFx0XHRvcmlnaW5hbFZhbHVlW2ldID0gbmV3VmFsdWU7XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHR2YXIgbmV3Q2x1c3Q7XHJcblx0XHRcdGZvcih2YXIgeT0wO3k8Y2x1c3QuYXJyYXlPZkNsdXN0ZXJzLmxlbmd0aDt5Kyspe1xyXG5cdFx0XHRcdGlmKGNsdXN0LmFycmF5T2ZDbHVzdGVyc1t5XS5pZD09PWRhdGFUeXBlKXtcclxuXHRcdFx0XHRcdG5ld0NsdXN0PWNsdXN0LmFycmF5T2ZDbHVzdGVyc1t5XTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdFx0dmFyIG5ld1ZhbHVlID0gKGNsdXN0ZXIuY2x1c3Rlck11dGF0ZShpZCxuZXdDbHVzdC5kYXRhQXJyYXlbaV0uZGF0YUFycmF5KS1vcmlnaW5hbFZhbHVlW2ldKSowLjM7XHJcblx0XHRcdG9yaWdpbmFsVmFsdWVbaV09b3JpZ2luYWxWYWx1ZVtpXStuZXdWYWx1ZTtcclxuXHRcdH1cclxuXHR9XHJcblx0cmV0dXJuIG9yaWdpbmFsVmFsdWU7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIG11dGF0ZShjYXIsIGNsdXN0KXtcclxuXHRyZXR1cm4gY2hhbmdlRGF0YShjYXIsbmV3IEFycmF5KCksMSwgY2x1c3QpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBjaGFuZ2VEYXRhKGNhciwgbXVsdGlNdXRhdGlvbnMsIG5vTXV0YXRpb25zLCBjbHVzdCl7XHJcblx0dmFyIHJhbmRvbUludCA9IGdldFJhbmRvbUludCgwLDQsIG11bHRpTXV0YXRpb25zKTtcclxuXHRpZihyYW5kb21JbnQ9PT0xKXtcclxuXHRcdGNhci5jaGFzc2lzX2RlbnNpdHk9Y2hhbmdlQXJyYXlWYWx1ZShjYXIuaWQsIGNhci5jaGFzc2lzX2RlbnNpdHksIGNsdXN0LCBcImNoYXNzaXNfZGVuc2l0eVwiKTtcclxuXHR9XHJcblx0ZWxzZSBpZihyYW5kb21JbnQ9PT0yKXtcclxuXHRcdGNhci52ZXJ0ZXhfbGlzdD1jaGFuZ2VBcnJheVZhbHVlKGNhci5pZCwgY2FyLnZlcnRleF9saXN0LCBjbHVzdCwgXCJ2ZXJ0ZXhfbGlzdFwiKTtcclxuXHR9XHJcblx0ZWxzZSBpZihyYW5kb21JbnQ9PT0zKXtcclxuXHRcdGNhci53aGVlbF9kZW5zaXR5PWNoYW5nZUFycmF5VmFsdWUoY2FyLmlkLCBjYXIud2hlZWxfZGVuc2l0eSwgY2x1c3QsIFwid2hlZWxfZGVuc2l0eVwiKTtcclxuXHR9XHJcblx0ZWxzZSBpZihyYW5kb21JbnQ9PT00KXtcclxuXHRcdGNhci53aGVlbF9yYWRpdXM9Y2hhbmdlQXJyYXlWYWx1ZShjYXIuaWQsIGNhci53aGVlbF9yYWRpdXMsIGNsdXN0LCBcIndoZWVsX3JhZGl1c1wiKTtcclxuXHR9XHJcblx0ZWxzZSB7XHJcblx0XHRjYXIud2hlZWxfdmVydGV4PWNoYW5nZUFycmF5VmFsdWUoY2FyLmlkLCBjYXIud2hlZWxfdmVydGV4LCBjbHVzdCwgXCJ3aGVlbF92ZXJ0ZXhcIik7XHJcblx0fVxyXG5cdG11bHRpTXV0YXRpb25zLnB1c2gocmFuZG9tSW50KTtcclxuXHRub011dGF0aW9ucy0tO1xyXG5cdHJldHVybiAobm9NdXRhdGlvbnM9PT0wKT9jYXI6Y2hhbmdlRGF0YShjYXIsIG11bHRpTXV0YXRpb25zLCBub011dGF0aW9ucyk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIG11bHRpTXV0YXRpb25zKGNhciwgYXJyUG9zaXRpb24sIGFyclNpemUpe1xyXG5cdC8vdmFyIG5vTXV0YXRpb25zID0gKGFyclBvc2l0aW9uPChhcnJTaXplLzIpKT8oYXJyUG9zaXRpb248KGFyclNpemUvNCkpPzQ6MzooYXJyUG9zaXRpb24+YXJyU2l6ZS0oYXJyU2l6ZS80KSk/MToyO1xyXG5cdHZhciBub011dGF0aW9ucyA9IChhcnJQb3NpdGlvbjwxMCk/MzoxO1xyXG5cdHJldHVybiBjaGFuZ2VEYXRhKGNhciwgbmV3IEFycmF5KCksbm9NdXRhdGlvbnMpO1xyXG59IiwiIG1vZHVsZS5leHBvcnRzID0ge1xyXG5cdGdldFJhbmRvbUludDogZ2V0UmFuZG9tSW50XHJcbiB9XHJcbiBcclxuLypUaGlzIGZ1bmN0aW9uIHJldHVybnMgd2hvbGUgaW50cyBiZXR3ZWVuIGEgbWluaW11bSBhbmQgbWF4aW11bVxyXG5AcGFyYW0gbWluIGludCAtIFRoZSBtaW5pbXVtIGludCB0aGF0IGNhbiBiZSByZXR1cm5lZFxyXG5AcGFyYW0gbWF4IGludCAtIFRoZSBtYXhpbXVtIGludCB0aGF0IGNhbiBiZSByZXR1cm5lZFxyXG5AcGFyYW0gbm90RXF1YWxzQXJyIGludEFycmF5IC0gQW4gYXJyYXkgb2YgdGhlIGludHMgdGhhdCB0aGUgZnVuY3Rpb24gc2hvdWxkIG5vdCByZXR1cm5cclxuQHJldHVybiBpbnQgLSBUaGUgaW50IHdpdGhpbiB0aGUgc3BlY2lmaWVkIHBhcmFtZXRlciBib3VuZHMgaXMgcmV0dXJuZWQuKi9cclxuZnVuY3Rpb24gZ2V0UmFuZG9tSW50KG1pbiwgbWF4LCBub3RFcXVhbHNBcnIpIHtcclxuXHR2YXIgdG9SZXR1cm47XHJcblx0dmFyIHJ1bkxvb3AgPSB0cnVlO1xyXG5cdHdoaWxlKHJ1bkxvb3A9PT10cnVlKXtcclxuXHRcdG1pbiA9IE1hdGguY2VpbChtaW4pO1xyXG5cdFx0bWF4ID0gTWF0aC5mbG9vcihtYXgpO1xyXG5cdFx0dG9SZXR1cm4gPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAobWF4IC0gbWluICsgMSkpICsgbWluO1xyXG5cdFx0aWYodHlwZW9mIG5vdEVxdWFsc0FyciA9PT0gXCJ1bmRlZmluZWRcIil7XHJcblx0XHRcdHJ1bkxvb3A9ZmFsc2U7XHJcblx0XHR9XHJcblx0XHRlbHNlIGlmKG5vdEVxdWFsc0Fyci5maW5kKGZ1bmN0aW9uKHZhbHVlKXtyZXR1cm4gdmFsdWU9PT10b1JldHVybjt9KSE9PXRvUmV0dXJuKXtcclxuXHRcdFx0cnVuTG9vcD1mYWxzZTtcclxuXHRcdH1cclxuXHR9XHJcbiAgICByZXR1cm4gdG9SZXR1cm47Ly8odHlwZW9mIGZpbmRJZkV4aXN0cyA9PT0gXCJ1bmRlZmluZWRcIik/dG9SZXR1cm46Z2V0UmFuZG9tSW50KG1pbiwgbWF4LCBub3RFcXVhbHNBcnIpO1xyXG59IiwiLy92YXIgcmFuZG9tSW50ID0gcmVxdWlyZShcIi4vcmFuZG9tSW50LmpzL1wiKTtcclxuLy92YXIgZ2V0UmFuZG9tSW50ID0gcmFuZG9tSW50LmdldFJhbmRvbUludDtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0ge1xyXG5cdHJ1blNlbGVjdGlvbjogcnVuU2VsZWN0aW9uXHJcbn1cclxuLypcclxuVGhpcyBmdW5jdGlvbiBjaGFuZ2VzIHRoZSB0eXBlIG9mIHNlbGVjdGlvbiB1c2VkIGRlcGVuZGluZyBvbiB0aGUgcGFyYW1ldGVyIG51bWJlciBcInNlbGVjdFR5cGVcIiA9IChyb3VsZXRlV2hlZWxTZWwgLSAxLCB0b3VybmFtZW50U2VsZWN0aW9uIC0gMilcclxuQHBhcmFtIHNlbGVjdFR5cGUgaW50IC0gdGhpcyBwYXJhbWV0ZXIgZGV0ZXJtaW5lcyB0aGUgdHlwZSBvZiBzZWxlY3Rpb24gdXNlZCAtIDEgZm9yIHRvdXJuYW1lbnQgc2VsZWN0aW9uIHVzaW5nIHN1Yi1hcnJheXMvIDIgZm9yIHRvdXJuYW1lbnQgc2VsZWN0aW9uIHRvIGdldCB3ZWFrZXN0IGNhci8zIGZvciByb3VsZXR0ZS1zZWxlY3Rpb24vIDQgZm9yIHVuaWZvcm0gcmFuZG9tIHNlbGVjdGlvbi5cclxuQHBhcmFtIGNhcnNBcnIgQXJyYXkgLSB0aGlzIHBhcmFtZXRlciBpcyB0aGUgcG9wdWxhdGlvbiB3aGljaCB0aGUgc2VsZWN0aW9uIGZ1bmN0aW9ucyBhcmUgdXNlZCBvbi5cclxuQHJldHVybiBPYmplY3RBcnJheSAtIHRoZSBwYXJlbnRzIGFycmF5IG9mIHR3byBpcyByZXR1cm5lZCBmcm9tIGVpdGhlciB0b3VybmFtZW50IG9yIHJvdWxsZXRlIHdoZWVsIHNlbGVjdGlvbiovXHJcbmZ1bmN0aW9uIHJ1blNlbGVjdGlvbihjYXJzQXJyLCBzZWxlY3RUeXBlKXtcclxuXHQvLyBTZWxlY3RUeXBlIC0gMSBmb3IgdG91cm5hbWVudCBzZWxlY3Rpb24gdXNpbmcgc3ViLWFycmF5cy8gMiBmb3IgdG91cm5hbWVudCBzZWxlY3Rpb24gdG8gZ2V0IHdlYWtlc3QgY2FyLzMgZm9yIHJvdWxldHRlLXNlbGVjdGlvbi8gNCBmb3IgdW5pZm9ybSByYW5kb20gc2VsZWN0aW9uXHJcblx0dmFyIHN0cm9uZ2VzdCA9IChzZWxlY3RUeXBlPT09MSk/dHJ1ZTpmYWxzZTtcclxuXHR2YXIgdXNlU3ViU2V0ID0gKChzZWxlY3RUeXBlPT09MSl8fChzZWxlY3RUeXBlPT09MikpP3RydWU6ZmFsc2U7XHJcblx0dmFyIHVuaWZvcm0gPSAoc2VsZWN0VHlwZT09PTQpP3RydWU6ZmFsc2U7XHJcblx0aWYoKHNlbGVjdFR5cGU9PT0zKXx8KHNlbGVjdFR5cGU9PT00KSl7XHJcblx0XHRyZXR1cm4gcm91bGV0ZVdoZWVsU2VsKGNhcnNBcnIsIHVuaWZvcm0pO1xyXG5cdH0gXHJcblx0ZWxzZSBpZigoc2VsZWN0VHlwZT09PTEpfHxzZWxlY3RUeXBlPT09Mil7XHJcblx0XHRyZXR1cm4gdG91cm5hbWVudFNlbGVjdGlvbihjYXJzQXJyLHN0cm9uZ2VzdCxjYXJzQXJyLmxlbmd0aC8yLCB1c2VTdWJTZXQpO1xyXG5cdH1cclxufVxyXG5cclxuLypUaGlzIGZ1bmN0aW9uIHVzZXMgZmluZXNzIHByb3BvcnRpb25hdGUgc2VsZWN0aW9uIHdoZXJlIGEgcHJvcG9ydGlvbiBvZiB0aGUgd2hlZWwgaXMgZ2l2ZW4gdG8gYSBjYXIgYmFzZWQgb24gZml0bmVzc1xyXG5AcGFyYW0gY2Fyc0FyciBPYmplY3RBcnJheSAtIFRoZSBhcnJheSBvZiBjYXJzIHdoZXJlIHRoZSBwYXJlbnRzIGFyZSBjaG9zZW4gZnJvbVxyXG5AcGFyYW0gdW5pZm9ybSBib29sZWFuIC0gd2hldGhlciB0aGUgc2VsZWN0aW9uIHNob3VsZCBiZSB1bmlmb3JtXHJcbkByZXR1cm4gY2FyIE9iamVjdCAtIEEgY2FyIG9iamVjdCBpcyByZXR1cm5lZCBhZnRlciBzZWxlY3Rpb24qL1xyXG5mdW5jdGlvbiByb3VsZXRlV2hlZWxTZWwoY2Fyc0FyciwgdW5pZm9ybSl7XHJcblx0aWYodW5pZm9ybSA9PT1mYWxzZSl7XHJcblx0XHR2YXIgc3VtQ2FyU2NvcmUgPSAwO1xyXG5cdFx0Zm9yKHZhciBpID0wO2k8Y2Fyc0Fyci5sZW5ndGg7aSsrKXtcclxuXHRcdFx0c3VtQ2FyU2NvcmUgKz0gY2Fyc0FycltpXS5zY29yZS5zO1xyXG5cdFx0fVxyXG5cdFx0Lypjb25zb2xlLmxvZyhcInNlbGVjdGlvbiBkYXRhIC1cIik7XHJcblx0XHRjb25zb2xlLmxvZyhjYXJzQXJyLmxlbmd0aCk7XHJcblx0XHRjb25zb2xlLmxvZyhzdW1DYXJTY29yZSk7Ly90ZXN0IG5vXHJcblx0XHQqL1xyXG5cdFx0dmFyIG5vID0gTWF0aC5yYW5kb20oKSAqIHN1bUNhclNjb3JlO1xyXG5cdFx0aWYoc3VtQ2FyU2NvcmUhPTApe1xyXG5cdFx0XHRmb3IodmFyIHggPTA7eDxjYXJzQXJyLmxlbmd0aDt4Kyspe1xyXG5cdFx0XHRcdG5vIC09IGNhcnNBcnJbeF0uc2NvcmUucztcclxuXHRcdFx0XHRpZihubzwwKXtcclxuXHRcdFx0XHRcdC8vY29uc29sZS5sb2coY2Fyc0Fyclt4XSk7Ly9yZXR1cm5lZCBjYXJcclxuXHRcdFx0XHRcdHJldHVybiBjYXJzQXJyW3hdO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdFx0ZWxzZXtcclxuXHRcdFx0cmV0dXJuIGNhcnNBcnJbMF07XHJcblx0XHR9XHJcblx0fSBlbHNlIHtcclxuXHRcdHZhciByYW5kTm8gPSBnZXRSYW5kb21JbnQoMCwgY2Fyc0Fyci5sZW5ndGgtMSxbXSk7XHJcblx0XHRyZXR1cm4gY2Fyc0FycltyYW5kTm9dO1xyXG5cdH1cclxufVxyXG5cclxuLypUaGlzIGZ1bmN0aW9uIHVzZXMgdG91cm5hbWVudFNlbGVjdGlvbiB3aGVyZSBhIGFycmF5IGlzIHNvcnRlZCBhbmQgdGhlIHN0cm9uZ2VzdCBvciB3ZWFrZXN0IGlzIHJldHVybmVkXHJcbkBwYXJhbSBjYXJzQXJyIE9iamVjdEFycmF5IC0gVGhlIGFycmF5IG9mIGNhcnMgd2hlcmUgdGhlIHBhcmVudHMgYXJlIGNob3NlbiBmcm9tXHJcbkBwYXJhbSBzdHJvbmdlc3QgQm9vbGVhbiAtIGlmIHRydWUgdGhlIHN0cm9uZ2VzdCBjYXIgaXMgY2hvc2VuLCBlbHNlIGlmIGZhbHNlIHRoZSB3ZWFrZXN0IGlzIHJldHVybmVkIFxyXG5AcGFyYW0gc3ViU2V0UmFuZ2UgaW50IC0gSG93IGJpZyB0aGUgc3ViU2V0IG9mIHRoZSBnbG9iYWwgYXJyYXkgc2hvdWxkIGJlXHJcbkBwYXJhbSB1c2VTdWJTZXQgYm9vbGVhbiAtIHRydWUgaWYgeW91IHdhbnQgdG8gdXNlIHN1YiBzZXQgb2YgcmFuZG9tbHkgY2hvc2VuIG9iamVjdHMgZnJvbSB0aGUgZ2xvYmFsLCBvciBmYWxzZSB0byBqdXN0IHVzZSB0aGUgZ2xvYmFsXHJcbkByZXR1cm4gY2FyIE9iamVjdCAtIEEgY2FyIG9iamVjdCBpcyByZXR1cm5lZCBhZnRlciBzZWxlY3Rpb24qL1xyXG5mdW5jdGlvbiB0b3VybmFtZW50U2VsZWN0aW9uKGNhcnNBcnIsIHN0cm9uZ2VzdCwgc3ViU2V0UmFuZ2UsIHVzZVN1YlNldCl7XHJcblx0dmFyIHN1YlNldCA9IFtdO1xyXG5cdGlmKHVzZVN1YlNldD09PXRydWUpe1xyXG5cdHZhciBjaG9zZW5JbnRzID0gW107XHJcblx0Zm9yKHZhciBpID0wO2k8c3ViU2V0UmFuZ2U7aSsrKXtcclxuXHRcdHZhciBjaG9zZW5ObyA9IGdldFJhbmRvbUludCgwLGNhcnNBcnIubGVuZ3RoLTEsY2hvc2VuSW50cyk7XHJcblx0XHRjaG9zZW5JbnRzLnB1c2goY2hvc2VuTm8pO1xyXG5cdFx0c3ViU2V0LnB1c2goY2Fyc0FycltjaG9zZW5Ob10pO1xyXG5cdH1cclxuXHR9XHJcblx0aWYodXNlU3ViU2V0PT09dHJ1ZSl7XHJcblx0XHRzdWJTZXQuc29ydChmdW5jdGlvbihhLGIpe3JldHVybiAoc3Ryb25nZXN0PT09dHJ1ZSk/Yi5zY29yZS5zIC0gYS5zY29yZS5zOmEuc2NvcmUucyAtIGIuc2NvcmUuczt9KTtcclxuXHR9IGVsc2Uge1xyXG5cdFx0Y2Fyc0Fyci5zb3J0KGZ1bmN0aW9uKGEsYil7cmV0dXJuIChzdHJvbmdlc3Q9PT10cnVlKT9iLnNjb3JlLnMgLSBhLnNjb3JlLnM6YS5zY29yZS5zIC0gYi5zY29yZS5zO30pO1xyXG5cdH1cclxuXHRyZXR1cm4gKHVzZVN1YlNldD09PXRydWUpP3N1YlNldFswXTpjYXJzQXJyWzBdO1xyXG59XHJcblxyXG4vKlRoaXMgZnVuY3Rpb24gcmV0dXJucyB3aG9sZSBpbnRzIGJldHdlZW4gYSBtaW5pbXVtIGFuZCBtYXhpbXVtXHJcbkBwYXJhbSBtaW4gaW50IC0gVGhlIG1pbmltdW0gaW50IHRoYXQgY2FuIGJlIHJldHVybmVkXHJcbkBwYXJhbSBtYXggaW50IC0gVGhlIG1heGltdW0gaW50IHRoYXQgY2FuIGJlIHJldHVybmVkXHJcbkBwYXJhbSBub3RFcXVhbHNBcnIgaW50QXJyYXkgLSBBbiBhcnJheSBvZiB0aGUgaW50cyB0aGF0IHRoZSBmdW5jdGlvbiBzaG91bGQgbm90IHJldHVyblxyXG5AcmV0dXJuIGludCAtIFRoZSBpbnQgd2l0aGluIHRoZSBzcGVjaWZpZWQgcGFyYW1ldGVyIGJvdW5kcyBpcyByZXR1cm5lZC4qL1xyXG5mdW5jdGlvbiBnZXRSYW5kb21JbnQobWluLCBtYXgsIG5vdEVxdWFsc0Fycikge1xyXG5cdHZhciB0b1JldHVybjtcclxuXHR2YXIgcnVuTG9vcCA9IHRydWU7XHJcblx0d2hpbGUocnVuTG9vcD09PXRydWUpe1xyXG5cdFx0bWluID0gTWF0aC5jZWlsKG1pbik7XHJcblx0XHRtYXggPSBNYXRoLmZsb29yKG1heCk7XHJcblx0XHR0b1JldHVybiA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIChtYXggLSBtaW4gKyAxKSkgKyBtaW47XHJcblx0XHRpZih0eXBlb2Ygbm90RXF1YWxzQXJyID09PSBcInVuZGVmaW5lZFwiKXtcclxuXHRcdFx0cnVuTG9vcD1mYWxzZTtcclxuXHRcdH1cclxuXHRcdGVsc2UgaWYobm90RXF1YWxzQXJyLmZpbmQoZnVuY3Rpb24odmFsdWUpe3JldHVybiB2YWx1ZT09PXRvUmV0dXJuO30pIT09dG9SZXR1cm4pe1xyXG5cdFx0XHRydW5Mb29wPWZhbHNlO1xyXG5cdFx0fVxyXG5cdH1cclxuICAgIHJldHVybiB0b1JldHVybjsvLyh0eXBlb2YgZmluZElmRXhpc3RzID09PSBcInVuZGVmaW5lZFwiKT90b1JldHVybjpnZXRSYW5kb21JbnQobWluLCBtYXgsIG5vdEVxdWFsc0Fycik7XHJcbn1cclxuXHJcbiIsIlxuXG5jb25zdCByYW5kb20gPSB7XG4gIHNodWZmbGVJbnRlZ2Vycyhwcm9wLCBnZW5lcmF0b3Ipe1xuICAgIHJldHVybiByYW5kb20ubWFwVG9TaHVmZmxlKHByb3AsIHJhbmRvbS5jcmVhdGVOb3JtYWxzKHtcbiAgICAgIGxlbmd0aDogcHJvcC5sZW5ndGggfHwgMTAsXG4gICAgICBpbmNsdXNpdmU6IHRydWUsXG4gICAgfSwgZ2VuZXJhdG9yKSk7XG4gIH0sXG4gIGNyZWF0ZUludGVnZXJzKHByb3AsIGdlbmVyYXRvcil7XG4gICAgcmV0dXJuIHJhbmRvbS5tYXBUb0ludGVnZXIocHJvcCwgcmFuZG9tLmNyZWF0ZU5vcm1hbHMoe1xuICAgICAgbGVuZ3RoOiBwcm9wLmxlbmd0aCxcbiAgICAgIGluY2x1c2l2ZTogdHJ1ZSxcbiAgICB9LCBnZW5lcmF0b3IpKTtcbiAgfSxcbiAgY3JlYXRlRmxvYXRzKHByb3AsIGdlbmVyYXRvcil7XG4gICAgcmV0dXJuIHJhbmRvbS5tYXBUb0Zsb2F0KHByb3AsIHJhbmRvbS5jcmVhdGVOb3JtYWxzKHtcbiAgICAgIGxlbmd0aDogcHJvcC5sZW5ndGgsXG4gICAgICBpbmNsdXNpdmU6IHRydWUsXG4gICAgfSwgZ2VuZXJhdG9yKSk7XG4gIH0sXG4gIGNyZWF0ZU5vcm1hbHMocHJvcCwgZ2VuZXJhdG9yKXtcbiAgICB2YXIgbCA9IHByb3AubGVuZ3RoO1xuICAgIHZhciB2YWx1ZXMgPSBbXTtcbiAgICBmb3IodmFyIGkgPSAwOyBpIDwgbDsgaSsrKXtcbiAgICAgIHZhbHVlcy5wdXNoKFxuICAgICAgICBjcmVhdGVOb3JtYWwocHJvcCwgZ2VuZXJhdG9yKVxuICAgICAgKTtcbiAgICB9XG4gICAgcmV0dXJuIHZhbHVlcztcbiAgfSxcbiAgbXV0YXRlU2h1ZmZsZShcbiAgICBwcm9wLCBnZW5lcmF0b3IsIG9yaWdpbmFsVmFsdWVzLCBtdXRhdGlvbl9yYW5nZSwgY2hhbmNlVG9NdXRhdGVcbiAgKXtcbiAgICByZXR1cm4gcmFuZG9tLm1hcFRvU2h1ZmZsZShwcm9wLCByYW5kb20ubXV0YXRlTm9ybWFscyhcbiAgICAgIHByb3AsIGdlbmVyYXRvciwgb3JpZ2luYWxWYWx1ZXMsIG11dGF0aW9uX3JhbmdlLCBjaGFuY2VUb011dGF0ZVxuICAgICkpO1xuICB9LFxuICBtdXRhdGVJbnRlZ2Vycyhwcm9wLCBnZW5lcmF0b3IsIG9yaWdpbmFsVmFsdWVzLCBtdXRhdGlvbl9yYW5nZSwgY2hhbmNlVG9NdXRhdGUpe1xuICAgIHJldHVybiByYW5kb20ubWFwVG9JbnRlZ2VyKHByb3AsIHJhbmRvbS5tdXRhdGVOb3JtYWxzKFxuICAgICAgcHJvcCwgZ2VuZXJhdG9yLCBvcmlnaW5hbFZhbHVlcywgbXV0YXRpb25fcmFuZ2UsIGNoYW5jZVRvTXV0YXRlXG4gICAgKSk7XG4gIH0sXG4gIG11dGF0ZUZsb2F0cyhwcm9wLCBnZW5lcmF0b3IsIG9yaWdpbmFsVmFsdWVzLCBtdXRhdGlvbl9yYW5nZSwgY2hhbmNlVG9NdXRhdGUpe1xuICAgIHJldHVybiByYW5kb20ubWFwVG9GbG9hdChwcm9wLCByYW5kb20ubXV0YXRlTm9ybWFscyhcbiAgICAgIHByb3AsIGdlbmVyYXRvciwgb3JpZ2luYWxWYWx1ZXMsIG11dGF0aW9uX3JhbmdlLCBjaGFuY2VUb011dGF0ZVxuICAgICkpO1xuICB9LFxuICBtYXBUb1NodWZmbGUocHJvcCwgbm9ybWFscyl7XG4gICAgdmFyIG9mZnNldCA9IHByb3Aub2Zmc2V0IHx8IDA7XG4gICAgdmFyIGxpbWl0ID0gcHJvcC5saW1pdCB8fCBwcm9wLmxlbmd0aDtcbiAgICB2YXIgc29ydGVkID0gbm9ybWFscy5zbGljZSgpLnNvcnQoZnVuY3Rpb24oYSwgYil7XG4gICAgICByZXR1cm4gYSAtIGI7XG4gICAgfSk7XG4gICAgcmV0dXJuIG5vcm1hbHMubWFwKGZ1bmN0aW9uKHZhbCl7XG4gICAgICByZXR1cm4gc29ydGVkLmluZGV4T2YodmFsKTtcbiAgICB9KS5tYXAoZnVuY3Rpb24oaSl7XG4gICAgICByZXR1cm4gaSArIG9mZnNldDtcbiAgICB9KS5zbGljZSgwLCBsaW1pdCk7XG4gIH0sXG4gIG1hcFRvSW50ZWdlcihwcm9wLCBub3JtYWxzKXtcbiAgICBwcm9wID0ge1xuICAgICAgbWluOiBwcm9wLm1pbiB8fCAwLFxuICAgICAgcmFuZ2U6IHByb3AucmFuZ2UgfHwgMTAsXG4gICAgICBsZW5ndGg6IHByb3AubGVuZ3RoXG4gICAgfVxuICAgIHJldHVybiByYW5kb20ubWFwVG9GbG9hdChwcm9wLCBub3JtYWxzKS5tYXAoZnVuY3Rpb24oZmxvYXQpe1xuICAgICAgcmV0dXJuIE1hdGgucm91bmQoZmxvYXQpO1xuICAgIH0pO1xuICB9LFxuICBtYXBUb0Zsb2F0KHByb3AsIG5vcm1hbHMpe1xuICAgIHByb3AgPSB7XG4gICAgICBtaW46IHByb3AubWluIHx8IDAsXG4gICAgICByYW5nZTogcHJvcC5yYW5nZSB8fCAxXG4gICAgfVxuICAgIHJldHVybiBub3JtYWxzLm1hcChmdW5jdGlvbihub3JtYWwpe1xuICAgICAgdmFyIG1pbiA9IHByb3AubWluO1xuICAgICAgdmFyIHJhbmdlID0gcHJvcC5yYW5nZTtcbiAgICAgIHJldHVybiBtaW4gKyBub3JtYWwgKiByYW5nZVxuICAgIH0pXG4gIH0sXG4gIG11dGF0ZU5vcm1hbHMocHJvcCwgZ2VuZXJhdG9yLCBvcmlnaW5hbFZhbHVlcywgbXV0YXRpb25fcmFuZ2UsIGNoYW5jZVRvTXV0YXRlKXtcbiAgICB2YXIgZmFjdG9yID0gKHByb3AuZmFjdG9yIHx8IDEpICogbXV0YXRpb25fcmFuZ2VcbiAgICByZXR1cm4gb3JpZ2luYWxWYWx1ZXMubWFwKGZ1bmN0aW9uKG9yaWdpbmFsVmFsdWUpe1xuICAgICAgaWYoZ2VuZXJhdG9yKCkgPiBjaGFuY2VUb011dGF0ZSl7XG4gICAgICAgIHJldHVybiBvcmlnaW5hbFZhbHVlO1xuICAgICAgfVxuICAgICAgcmV0dXJuIG11dGF0ZU5vcm1hbChcbiAgICAgICAgcHJvcCwgZ2VuZXJhdG9yLCBvcmlnaW5hbFZhbHVlLCBmYWN0b3JcbiAgICAgICk7XG4gICAgfSk7XG4gIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gcmFuZG9tO1xuXG5mdW5jdGlvbiBtdXRhdGVOb3JtYWwocHJvcCwgZ2VuZXJhdG9yLCBvcmlnaW5hbFZhbHVlLCBtdXRhdGlvbl9yYW5nZSl7XG4gIGlmKG11dGF0aW9uX3JhbmdlID4gMSl7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IG11dGF0ZSBiZXlvbmQgYm91bmRzXCIpO1xuICB9XG4gIHZhciBuZXdNaW4gPSBvcmlnaW5hbFZhbHVlIC0gMC41O1xuICBpZiAobmV3TWluIDwgMCkgbmV3TWluID0gMDtcbiAgaWYgKG5ld01pbiArIG11dGF0aW9uX3JhbmdlICA+IDEpXG4gICAgbmV3TWluID0gMSAtIG11dGF0aW9uX3JhbmdlO1xuICB2YXIgcmFuZ2VWYWx1ZSA9IGNyZWF0ZU5vcm1hbCh7XG4gICAgaW5jbHVzaXZlOiB0cnVlLFxuICB9LCBnZW5lcmF0b3IpO1xuICByZXR1cm4gbmV3TWluICsgcmFuZ2VWYWx1ZSAqIG11dGF0aW9uX3JhbmdlO1xufVxuXG5mdW5jdGlvbiBjcmVhdGVOb3JtYWwocHJvcCwgZ2VuZXJhdG9yKXtcbiAgaWYoIXByb3AuaW5jbHVzaXZlKXtcbiAgICByZXR1cm4gZ2VuZXJhdG9yKCk7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIGdlbmVyYXRvcigpIDwgMC41ID9cbiAgICBnZW5lcmF0b3IoKSA6XG4gICAgMSAtIGdlbmVyYXRvcigpO1xuICB9XG59XG4iLCJ2YXIgY3JlYXRlID0gcmVxdWlyZShcIi4uL2NyZWF0ZS1pbnN0YW5jZVwiKTtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIGdlbmVyYXRpb25aZXJvOiBnZW5lcmF0aW9uWmVybyxcbiAgbmV4dEdlbmVyYXRpb246IG5leHRHZW5lcmF0aW9uLFxufVxuXG5mdW5jdGlvbiBnZW5lcmF0aW9uWmVybyhjb25maWcpe1xuICB2YXIgb2xkU3RydWN0dXJlID0gY3JlYXRlLmNyZWF0ZUdlbmVyYXRpb25aZXJvKFxuICAgIGNvbmZpZy5zY2hlbWEsIGNvbmZpZy5nZW5lcmF0ZVJhbmRvbVxuICApO1xuICB2YXIgbmV3U3RydWN0dXJlID0gY3JlYXRlU3RydWN0dXJlKGNvbmZpZywgMSwgb2xkU3RydWN0dXJlKTtcblxuICB2YXIgayA9IDA7XG5cbiAgcmV0dXJuIHtcbiAgICBjb3VudGVyOiAwLFxuICAgIGs6IGssXG4gICAgZ2VuZXJhdGlvbjogW25ld1N0cnVjdHVyZSwgb2xkU3RydWN0dXJlXVxuICB9XG59XG5cbmZ1bmN0aW9uIG5leHRHZW5lcmF0aW9uKHByZXZpb3VzU3RhdGUsIHNjb3JlcywgY29uZmlnKXtcbiAgdmFyIG5leHRTdGF0ZSA9IHtcbiAgICBrOiAocHJldmlvdXNTdGF0ZS5rICsgMSklY29uZmlnLmdlbmVyYXRpb25TaXplLFxuICAgIGNvdW50ZXI6IHByZXZpb3VzU3RhdGUuY291bnRlciArIChwcmV2aW91c1N0YXRlLmsgPT09IGNvbmZpZy5nZW5lcmF0aW9uU2l6ZSA/IDEgOiAwKVxuICB9O1xuICAvLyBncmFkdWFsbHkgZ2V0IGNsb3NlciB0byB6ZXJvIHRlbXBlcmF0dXJlIChidXQgbmV2ZXIgaGl0IGl0KVxuICB2YXIgb2xkRGVmID0gcHJldmlvdXNTdGF0ZS5jdXJEZWYgfHwgcHJldmlvdXNTdGF0ZS5nZW5lcmF0aW9uWzFdO1xuICB2YXIgb2xkU2NvcmUgPSBwcmV2aW91c1N0YXRlLnNjb3JlIHx8IHNjb3Jlc1sxXS5zY29yZS52O1xuXG4gIHZhciBuZXdEZWYgPSBwcmV2aW91c1N0YXRlLmdlbmVyYXRpb25bMF07XG4gIHZhciBuZXdTY29yZSA9IHNjb3Jlc1swXS5zY29yZS52O1xuXG5cbiAgdmFyIHRlbXAgPSBNYXRoLnBvdyhNYXRoLkUsIC1uZXh0U3RhdGUuY291bnRlciAvIGNvbmZpZy5nZW5lcmF0aW9uU2l6ZSk7XG5cbiAgdmFyIHNjb3JlRGlmZiA9IG5ld1Njb3JlIC0gb2xkU2NvcmU7XG4gIC8vIElmIHRoZSBuZXh0IHBvaW50IGlzIGhpZ2hlciwgY2hhbmdlIGxvY2F0aW9uXG4gIGlmKHNjb3JlRGlmZiA+IDApe1xuICAgIG5leHRTdGF0ZS5jdXJEZWYgPSBuZXdEZWY7XG4gICAgbmV4dFN0YXRlLnNjb3JlID0gbmV3U2NvcmU7XG4gICAgLy8gRWxzZSB3ZSB3YW50IHRvIGluY3JlYXNlIGxpa2VseWhvb2Qgb2YgY2hhbmdpbmcgbG9jYXRpb24gYXMgd2UgZ2V0XG4gIH0gZWxzZSBpZihNYXRoLnJhbmRvbSgpID4gTWF0aC5leHAoLXNjb3JlRGlmZi8obmV4dFN0YXRlLmsgKiB0ZW1wKSkpe1xuICAgIG5leHRTdGF0ZS5jdXJEZWYgPSBuZXdEZWY7XG4gICAgbmV4dFN0YXRlLnNjb3JlID0gbmV3U2NvcmU7XG4gIH0gZWxzZSB7XG4gICAgbmV4dFN0YXRlLmN1ckRlZiA9IG9sZERlZjtcbiAgICBuZXh0U3RhdGUuc2NvcmUgPSBvbGRTY29yZTtcbiAgfVxuXG4gIGNvbnNvbGUubG9nKHByZXZpb3VzU3RhdGUsIG5leHRTdGF0ZSk7XG5cbiAgbmV4dFN0YXRlLmdlbmVyYXRpb24gPSBbY3JlYXRlU3RydWN0dXJlKGNvbmZpZywgdGVtcCwgbmV4dFN0YXRlLmN1ckRlZildO1xuXG4gIHJldHVybiBuZXh0U3RhdGU7XG59XG5cblxuZnVuY3Rpb24gY3JlYXRlU3RydWN0dXJlKGNvbmZpZywgbXV0YXRpb25fcmFuZ2UsIHBhcmVudCl7XG4gIHZhciBzY2hlbWEgPSBjb25maWcuc2NoZW1hLFxuICAgIGdlbl9tdXRhdGlvbiA9IDEsXG4gICAgZ2VuZXJhdGVSYW5kb20gPSBjb25maWcuZ2VuZXJhdGVSYW5kb207XG4gIHJldHVybiBjcmVhdGUuY3JlYXRlTXV0YXRlZENsb25lKFxuICAgIHNjaGVtYSxcbiAgICBnZW5lcmF0ZVJhbmRvbSxcbiAgICBwYXJlbnQsXG4gICAgbXV0YXRpb25fcmFuZ2UsXG4gICAgZ2VuX211dGF0aW9uXG4gIClcblxufVxuIiwiLyogZ2xvYmFscyBidG9hICovXG52YXIgc2V0dXBTY2VuZSA9IHJlcXVpcmUoXCIuL3NldHVwLXNjZW5lXCIpO1xudmFyIGNhclJ1biA9IHJlcXVpcmUoXCIuLi9jYXItc2NoZW1hL3J1blwiKTtcbnZhciBkZWZUb0NhciA9IHJlcXVpcmUoXCIuLi9jYXItc2NoZW1hL2RlZi10by1jYXJcIik7XG5cbm1vZHVsZS5leHBvcnRzID0gcnVuRGVmcztcbmZ1bmN0aW9uIHJ1bkRlZnMod29ybGRfZGVmLCBkZWZzLCBsaXN0ZW5lcnMpIHtcbiAgaWYgKHdvcmxkX2RlZi5tdXRhYmxlX2Zsb29yKSB7XG4gICAgLy8gR0hPU1QgRElTQUJMRURcbiAgICB3b3JsZF9kZWYuZmxvb3JzZWVkID0gYnRvYShNYXRoLnNlZWRyYW5kb20oKSk7XG4gIH1cblxuICB2YXIgc2NlbmUgPSBzZXR1cFNjZW5lKHdvcmxkX2RlZik7XG4gIHNjZW5lLndvcmxkLlN0ZXAoMSAvIHdvcmxkX2RlZi5ib3gyZGZwcywgMjAsIDIwKTtcbiAgY29uc29sZS5sb2coXCJhYm91dCB0byBidWlsZCBjYXJzXCIpO1xuICB2YXIgY2FycyA9IGRlZnMubWFwKChkZWYsIGkpID0+IHtcbiAgICByZXR1cm4ge1xuICAgICAgaW5kZXg6IGksXG4gICAgICBkZWY6IGRlZixcbiAgICAgIGNhcjogZGVmVG9DYXIoZGVmLCBzY2VuZS53b3JsZCwgd29ybGRfZGVmKSxcbiAgICAgIHN0YXRlOiBjYXJSdW4uZ2V0SW5pdGlhbFN0YXRlKHdvcmxkX2RlZilcbiAgICB9O1xuICB9KTtcbiAgdmFyIGFsaXZlY2FycyA9IGNhcnM7XG4gIHJldHVybiB7XG4gICAgc2NlbmU6IHNjZW5lLFxuICAgIGNhcnM6IGNhcnMsXG4gICAgc3RlcDogZnVuY3Rpb24gKCkge1xuICAgICAgaWYgKGFsaXZlY2Fycy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwibm8gbW9yZSBjYXJzXCIpO1xuICAgICAgfVxuICAgICAgc2NlbmUud29ybGQuU3RlcCgxIC8gd29ybGRfZGVmLmJveDJkZnBzLCAyMCwgMjApO1xuICAgICAgbGlzdGVuZXJzLnByZUNhclN0ZXAoKTtcbiAgICAgIGFsaXZlY2FycyA9IGFsaXZlY2Fycy5maWx0ZXIoZnVuY3Rpb24gKGNhcikge1xuICAgICAgICBjYXIuc3RhdGUgPSBjYXJSdW4udXBkYXRlU3RhdGUoXG4gICAgICAgICAgd29ybGRfZGVmLCBjYXIuY2FyLCBjYXIuc3RhdGVcbiAgICAgICAgKTtcbiAgICAgICAgdmFyIHN0YXR1cyA9IGNhclJ1bi5nZXRTdGF0dXMoY2FyLnN0YXRlLCB3b3JsZF9kZWYpO1xuICAgICAgICBsaXN0ZW5lcnMuY2FyU3RlcChjYXIpO1xuICAgICAgICBpZiAoc3RhdHVzID09PSAwKSB7XG4gICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgY2FyLnNjb3JlID0gY2FyUnVuLmNhbGN1bGF0ZVNjb3JlKGNhci5zdGF0ZSwgd29ybGRfZGVmKTtcbiAgICAgICAgbGlzdGVuZXJzLmNhckRlYXRoKGNhcik7XG5cbiAgICAgICAgdmFyIHdvcmxkID0gc2NlbmUud29ybGQ7XG4gICAgICAgIHZhciB3b3JsZENhciA9IGNhci5jYXI7XG4gICAgICAgIHdvcmxkLkRlc3Ryb3lCb2R5KHdvcmxkQ2FyLmNoYXNzaXMpO1xuXG4gICAgICAgIGZvciAodmFyIHcgPSAwOyB3IDwgd29ybGRDYXIud2hlZWxzLmxlbmd0aDsgdysrKSB7XG4gICAgICAgICAgd29ybGQuRGVzdHJveUJvZHkod29ybGRDYXIud2hlZWxzW3ddKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH0pXG4gICAgICBpZiAoYWxpdmVjYXJzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICBsaXN0ZW5lcnMuZ2VuZXJhdGlvbkVuZChjYXJzKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxufVxuIiwiLyogZ2xvYmFscyBiMldvcmxkIGIyVmVjMiBiMkJvZHlEZWYgYjJGaXh0dXJlRGVmIGIyUG9seWdvblNoYXBlICovXG5cbi8qXG5cbndvcmxkX2RlZiA9IHtcbiAgZ3Jhdml0eToge3gsIHl9LFxuICBkb1NsZWVwOiBib29sZWFuLFxuICBmbG9vcnNlZWQ6IHN0cmluZyxcbiAgdGlsZURpbWVuc2lvbnMsXG4gIG1heEZsb29yVGlsZXMsXG4gIG11dGFibGVfZmxvb3I6IGJvb2xlYW5cbn1cblxuKi9cblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbih3b3JsZF9kZWYpe1xuXG4gIHZhciB3b3JsZCA9IG5ldyBiMldvcmxkKHdvcmxkX2RlZi5ncmF2aXR5LCB3b3JsZF9kZWYuZG9TbGVlcCk7XG4gIHZhciBmbG9vclRpbGVzID0gY3dfY3JlYXRlRmxvb3IoXG4gICAgd29ybGQsXG4gICAgd29ybGRfZGVmLmZsb29yc2VlZCxcbiAgICB3b3JsZF9kZWYudGlsZURpbWVuc2lvbnMsXG4gICAgd29ybGRfZGVmLm1heEZsb29yVGlsZXMsXG4gICAgd29ybGRfZGVmLm11dGFibGVfZmxvb3JcbiAgKTtcblxuICB2YXIgbGFzdF90aWxlID0gZmxvb3JUaWxlc1tcbiAgICBmbG9vclRpbGVzLmxlbmd0aCAtIDFcbiAgXTtcbiAgdmFyIGxhc3RfZml4dHVyZSA9IGxhc3RfdGlsZS5HZXRGaXh0dXJlTGlzdCgpO1xuICB2YXIgdGlsZV9wb3NpdGlvbiA9IGxhc3RfdGlsZS5HZXRXb3JsZFBvaW50KFxuICAgIGxhc3RfZml4dHVyZS5HZXRTaGFwZSgpLm1fdmVydGljZXNbM11cbiAgKTtcbiAgd29ybGQuZmluaXNoTGluZSA9IHRpbGVfcG9zaXRpb24ueDtcbiAgcmV0dXJuIHtcbiAgICB3b3JsZDogd29ybGQsXG4gICAgZmxvb3JUaWxlczogZmxvb3JUaWxlcyxcbiAgICBmaW5pc2hMaW5lOiB0aWxlX3Bvc2l0aW9uLnhcbiAgfTtcbn1cblxuZnVuY3Rpb24gY3dfY3JlYXRlRmxvb3Iod29ybGQsIGZsb29yc2VlZCwgZGltZW5zaW9ucywgbWF4Rmxvb3JUaWxlcywgbXV0YWJsZV9mbG9vcikge1xuICB2YXIgbGFzdF90aWxlID0gbnVsbDtcbiAgdmFyIHRpbGVfcG9zaXRpb24gPSBuZXcgYjJWZWMyKC01LCAwKTtcbiAgdmFyIGN3X2Zsb29yVGlsZXMgPSBbXTtcbiAgTWF0aC5zZWVkcmFuZG9tKGZsb29yc2VlZCk7XG4gIGZvciAodmFyIGsgPSAwOyBrIDwgbWF4Rmxvb3JUaWxlczsgaysrKSB7XG4gICAgaWYgKCFtdXRhYmxlX2Zsb29yKSB7XG4gICAgICAvLyBrZWVwIG9sZCBpbXBvc3NpYmxlIHRyYWNrcyBpZiBub3QgdXNpbmcgbXV0YWJsZSBmbG9vcnNcbiAgICAgIGxhc3RfdGlsZSA9IGN3X2NyZWF0ZUZsb29yVGlsZShcbiAgICAgICAgd29ybGQsIGRpbWVuc2lvbnMsIHRpbGVfcG9zaXRpb24sIChNYXRoLnJhbmRvbSgpICogMyAtIDEuNSkgKiAxLjUgKiBrIC8gbWF4Rmxvb3JUaWxlc1xuICAgICAgKTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gaWYgcGF0aCBpcyBtdXRhYmxlIG92ZXIgcmFjZXMsIGNyZWF0ZSBzbW9vdGhlciB0cmFja3NcbiAgICAgIGxhc3RfdGlsZSA9IGN3X2NyZWF0ZUZsb29yVGlsZShcbiAgICAgICAgd29ybGQsIGRpbWVuc2lvbnMsIHRpbGVfcG9zaXRpb24sIChNYXRoLnJhbmRvbSgpICogMyAtIDEuNSkgKiAxLjIgKiBrIC8gbWF4Rmxvb3JUaWxlc1xuICAgICAgKTtcbiAgICB9XG4gICAgY3dfZmxvb3JUaWxlcy5wdXNoKGxhc3RfdGlsZSk7XG4gICAgdmFyIGxhc3RfZml4dHVyZSA9IGxhc3RfdGlsZS5HZXRGaXh0dXJlTGlzdCgpO1xuICAgIHRpbGVfcG9zaXRpb24gPSBsYXN0X3RpbGUuR2V0V29ybGRQb2ludChsYXN0X2ZpeHR1cmUuR2V0U2hhcGUoKS5tX3ZlcnRpY2VzWzNdKTtcbiAgfVxuICByZXR1cm4gY3dfZmxvb3JUaWxlcztcbn1cblxuXG5mdW5jdGlvbiBjd19jcmVhdGVGbG9vclRpbGUod29ybGQsIGRpbSwgcG9zaXRpb24sIGFuZ2xlKSB7XG4gIHZhciBib2R5X2RlZiA9IG5ldyBiMkJvZHlEZWYoKTtcblxuICBib2R5X2RlZi5wb3NpdGlvbi5TZXQocG9zaXRpb24ueCwgcG9zaXRpb24ueSk7XG4gIHZhciBib2R5ID0gd29ybGQuQ3JlYXRlQm9keShib2R5X2RlZik7XG4gIHZhciBmaXhfZGVmID0gbmV3IGIyRml4dHVyZURlZigpO1xuICBmaXhfZGVmLnNoYXBlID0gbmV3IGIyUG9seWdvblNoYXBlKCk7XG4gIGZpeF9kZWYuZnJpY3Rpb24gPSAwLjU7XG5cbiAgdmFyIGNvb3JkcyA9IG5ldyBBcnJheSgpO1xuICBjb29yZHMucHVzaChuZXcgYjJWZWMyKDAsIDApKTtcbiAgY29vcmRzLnB1c2gobmV3IGIyVmVjMigwLCAtZGltLnkpKTtcbiAgY29vcmRzLnB1c2gobmV3IGIyVmVjMihkaW0ueCwgLWRpbS55KSk7XG4gIGNvb3Jkcy5wdXNoKG5ldyBiMlZlYzIoZGltLngsIDApKTtcblxuICB2YXIgY2VudGVyID0gbmV3IGIyVmVjMigwLCAwKTtcblxuICB2YXIgbmV3Y29vcmRzID0gY3dfcm90YXRlRmxvb3JUaWxlKGNvb3JkcywgY2VudGVyLCBhbmdsZSk7XG5cbiAgZml4X2RlZi5zaGFwZS5TZXRBc0FycmF5KG5ld2Nvb3Jkcyk7XG5cbiAgYm9keS5DcmVhdGVGaXh0dXJlKGZpeF9kZWYpO1xuICByZXR1cm4gYm9keTtcbn1cblxuZnVuY3Rpb24gY3dfcm90YXRlRmxvb3JUaWxlKGNvb3JkcywgY2VudGVyLCBhbmdsZSkge1xuICByZXR1cm4gY29vcmRzLm1hcChmdW5jdGlvbihjb29yZCl7XG4gICAgcmV0dXJuIHtcbiAgICAgIHg6IE1hdGguY29zKGFuZ2xlKSAqIChjb29yZC54IC0gY2VudGVyLngpIC0gTWF0aC5zaW4oYW5nbGUpICogKGNvb3JkLnkgLSBjZW50ZXIueSkgKyBjZW50ZXIueCxcbiAgICAgIHk6IE1hdGguc2luKGFuZ2xlKSAqIChjb29yZC54IC0gY2VudGVyLngpICsgTWF0aC5jb3MoYW5nbGUpICogKGNvb3JkLnkgLSBjZW50ZXIueSkgKyBjZW50ZXIueSxcbiAgICB9O1xuICB9KTtcbn1cbiJdfQ==
