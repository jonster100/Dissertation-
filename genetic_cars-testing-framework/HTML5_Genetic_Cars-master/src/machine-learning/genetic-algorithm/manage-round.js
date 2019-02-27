var create = require("../create-instance");
var selection = require("./selection.js/");
var mutation = require("./mutation.js/");
var crossover = require("./crossover.js/");
var cluster = require("./clustering/clusterSetup.js/");

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

//--------------------------------------------------------------------------- my code job64
function getRandomInt(min, max, notEqualsArr) {
    min = Math.ceil(min);
    max = Math.floor(max);
	var toReturn = Math.floor(Math.random() * (max - min + 1)) + min;
	var findIfExists = notEqualsArr.find(function(value){
		return value===toReturn;
	});
    return (typeof findIfExists === "undefined")?toReturn:getRandomInt(min, max, notEqualsArr);
}

function checkGenerationAverages(generationAverageArr){
	if((typeof generationAverageArr === "undefined")){
		return 2;
	}
	else{
		if(generationAverageArr.length<7){
			var sumAverage = 0;
			for(var i=0;i<7;i++){
				sumAverage+=generationAverageArr[(generationAverageArr.length-1)-i];
			}
			var av =sumAverage/7;
			return (av<generationAverageArr[(generationAverageArr.length-1)])?1:2;
		}
	}
	return 2;
}

function selectParents(scores, elite){
	var parents=new Array();
	var parent1 = selection.runSelection(scores,(elite===false)?1:2,true);
	parents.push(parent1.def);
	if(elite===false){
		scores.splice(scores.findIndex(x=> x.def.id===parents[0].id),1);
	}
	var parent2 = selection.runSelection(scores,(elite===false)?1:1,true);
	parents.push(parent2.def);
	scores.splice(scores.findIndex(x=> x.def.id===parents[1].id),1);
	var score = (parent1.score.s + parent2.score.s)/2;
	
	return {
		chosenParents: parents,
		parentsScore: score
	}
}

/*This function runs a Evolutionary algorithm which uses Selection, Crossover and mutations to create the new populations of cars.*/
function runEA(scores, config, noCarsCreated, generationAverageArr){
	scores.sort(function(a, b){return a.score.s - b.score.s;});
	var generationSize=scores.length;
	var schema = config.schema;//list of car variables i.e "wheel_radius", "chassis_density", "vertex_list", "wheel_vertex" and "wheel_density"
	var newGeneration = new Array();
	//var check = checkGenerationAverages(generationAverageArr);
	var randomElite = getRandomInt(0,1, new Array());
	for (var k = 0; k < generationSize/2; k++) {
		var parents=selectParents(scores, (k===randomElite)?true:false);
		var newCars = crossover.runCrossover(parents.chosenParents,0,config.schema, parents.parentsScore, noCarsCreated);
		for(var i=0;i<2;i++){
			newCars[i].is_elite = false;
			newCars[i].index = k;
			newGeneration.push(newCars[i]);
			noCarsCreated++;// used in car id creation
		}
	}	
	newGeneration.sort(function(a, b){return a.parentsScore - b.parentsScore;});
	for(var x = 0;x<newGeneration.length;x++){
			var currentID = newGeneration[x].id;
			newGeneration[x] = mutation.multiMutations(newGeneration[x],newGeneration.findIndex(x=> x.id===currentID),20);
			//newGeneration[x] = mutation.mutate(newGeneration[x]);
		}
	return newGeneration;
}

/*This function runs the Baseline Evolutionary algorithm which only runs a mutation or multiMutations over all the cars passed though in the scores parameter.
@param scores Array This parameter is an array of cars that holds the score statistics and car data such as id and "wheel_radius", "chassis_density", "vertex_list", "wheel_vertex" and "wheel_density"
@param config This passes a file with functions that can be called.
@return newGeneration this is the new population that have had mutations applied to them.*/
function runBaselineEA(scores, config){
	scores.sort(function(a, b){return a.score.s - b.score.s;});
	var schema = config.schema;//list of car variables i.e "wheel_radius", "chassis_density", "vertex_list", "wheel_vertex"
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
	var clusterInt = (previousState.counter===0)?cluster.setup(scores,null,false):cluster.setup(scores,previousState.clust,true);
	//cluster.reScoreCars(scores ,clusterInt);
	scores.sort(function(a, b){return a.score.s - b.score.s;});
	var schema = config.schema;//list of car variables i.e "wheel_radius", "chassis_density", "vertex_list", "wheel_vertex"
	var newGeneration = new Array();
	var stateAverage = (previousState.counter===0)?new Array():previousState.stateAveragesArr;
	var averageScore = 0;
	for(var i=0;i<scores.length;i++){averageScore+=scores[i].score.s;}
	stateAverage.push(averageScore/scores.length);
	console.log("Log -- "+previousState.counter);
	//console.log(scoresData);//test data
	var eaType = 1;
	newGeneration = (eaType===1)?runEA(scores, config, clusterInt.carsArray.length, previousState.stateAveragesArr):runBaselineEA(scores, config);
	//console.log(newGeneration);//test data
	
  return {
    counter: previousState.counter + 1,
    generation: newGeneration,
	clust: clusterInt,
	stateAveragesArr: stateAverage
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
