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
	var noElites = 0;//type the number of elites for the program to use
	var crossoverType=0;//write 1 for one-point crossover anyother for two-point crossover
	var noMateIncrease=3;//The number of cars that can mate twice producing 4 kids not 2
	var mateIncreaseSelectionMethod = 1;// 1 for tournament selection using sub-arrays/ 2 for tournament selection to get weakest car/3 for roulette-selection/ 4 for uniform random selection
	// selectionType for selection the two parents selectionTypeOne for the first slection, selectionTypeTwo for the second parent
	var selectionTypeOne = 3;// 1 for tournament selection using sub-arrays/ 2 for tournament selection to get weakest car/3 for roulette-selection/ 4 for uniform random selection
	var selectionTypeTwo = 3;// 1 for tournament selection using sub-arrays/ 2 for tournament selection to get weakest car/3 for roulette-selection/ 4 for uniform random selection
	var mutationType =3;//0 for standard 1 mutation type 1 for multi-mutations, 3 for cluster mutation
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
