var create = require("../create-instance");
var selection = require("./selection.js/");
var mutation = require("./mutation.js/")
var crossover = require("./crossover.js/")

module.exports = {
  generationZero: generationZero,
  nextGeneration: nextGeneration
}

function generationZero(config){
  var generationSize = config.generationSize,
  schema = config.schema;
  var cw_carGeneration = [];
  for (var k = 0; k < generationSize; k++) {
    var def = create.createGenerationZero(schema, function(){
      return Math.random()
    });
    def.index = k;
    cw_carGeneration.push(def);
  }
  return {
    counter: 0,
    generation: cw_carGeneration,
  };
}

function nextGeneration(
  previousState,
  scores,
  config
){
  var champion_length = config.championLength,
    generationSize = config.generationSize,
    selectFromAllParents = config.selectFromAllParents;
	scores.sort(function(a, b){return a.score.s - b.score.s;});
	var schema = config.schema;//list of car variables i.e "wheel_radius", "chassis_density", "vertex_list", "wheel_vertex"
  var newGeneration = new Array();
  var newborn;
  console.log("Log -- "+previousState.counter);
  console.log(scores);//test data
  for (var k = 0; k < 10; k++) {
	var parents=new Array();
	parents.push(selection.rouleteWheelSel(scores).def);
	scores.splice(scores.findIndex(x=> x.index===parents[0].index),1);
	parents.push(selection.rouleteWheelSel(scores).def);
	scores.splice(scores.findIndex(x=> x.index===parents[1].index),1);
	var newCars = crossover.runCrossover(parents,0,config.schema);
	for(var i=0;i<2;i++){
		newCars[i].is_elite = false;
		newCars[i].index = k;
		newGeneration.push(mutation.mutate(newCars[i],schema));
	}
	//var newCar = mutation.mutate(selParent,schema);
    //newGeneration.push(newCar.def);
	
  }
	console.log(newGeneration);//test data

  return {
    counter: previousState.counter + 1,
    generation: newGeneration,
  };
}



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
