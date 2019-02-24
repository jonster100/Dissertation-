
module.exports = {
	runCrossover: runCrossover
}

/*This function creates the acual new car and returned. The function runs a one-point crossover taking data from the parents passed through and adding them to the new car.
@param parents Data is taken from these cars and added to the new car using crossover.
@param schema The data objects that car objects have such as "wheel_radius", "chassis_density", "vertex_list", "wheel_vertex" and "wheel_density"
@param noCrossover range of mutation passed to the new car out of 5 from either car.
@param carNo whether this car is the first or second child for the parent cars*/
function combineData(parents, schema, noCrossoverPoint, noCrossoverPointTwo, carNo, parentScore,noCarsCreated){
	var id = noCarsCreated+carNo;
	var keyIteration = 0;
	return Object.keys(schema).reduce(function(crossDef, key){
      var schemaDef = schema[key];
      var values = [];
      for(var i = 0, l = schemaDef.length; i < l; i++){
        var p = crossover(carNo, noCrossoverPoint, noCrossoverPointTwo, keyIteration,2);
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

function crossover(carNo,noCrossoverPoint,keyIteration,crossoverType){
	if(crossoverType===1){ //run one-point crossover
		return (carNo===1)?(keyIteration>=noCrossoverPoint)?0:1:(keyIteration>=noCrossoverPoint)?1:0;// handles the fixed one-point switch over
	}
	else { //run two-point crossover
		return 	(carNo===1)?((keyIteration>=noCrossoverPoint)||(keyIteration<=noCrossoverPoint))?0:1:((keyIteration>=noCrossoverPoint)||(keyIteration<=noCrossoverPoint))?1:0;// handles the fixed one-point switch over
	}
}

function runCrossover(parents,crossoveType,schema, parentsScore,noCarsCreated){
	var newCars = new Array();
	for(var i=0;i<2;i++){
		newCars.push(combineData(parents,schema, 2 ,4 , i, parentsScore,noCarsCreated));
	}
	return newCars;
}

