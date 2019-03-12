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
