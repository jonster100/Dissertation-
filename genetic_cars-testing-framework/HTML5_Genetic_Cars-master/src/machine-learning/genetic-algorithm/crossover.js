
module.exports = {
	runCrossover: runCrossover
}

function combineData(parents, schema, noCrossover, carNo){
	var id = Math.random().toString(32);
	var keyIteration = 0;
	return Object.keys(schema).reduce(function(crossDef, key){
      var schemaDef = schema[key];
      var values = [];
      for(var i = 0, l = schemaDef.length; i < l; i++){
        var p = (carNo===1)?(keyIteration>=noCrossover)?0:1:(keyIteration>=noCrossover)?1:0;// handles the fixed one-point switch over
        values.push(parents[p][key][i]);
      }
      crossDef[key] = values;
	  keyIteration++;
      return crossDef;
    } , {
		id: id
	});
}

function runCrossover(parents,crossoveType,schema){
	var newCars = new Array();
	for(var i=0;i<2;i++){
		newCars.push(combineData(parents,schema, 2,i));
	}
	return newCars;
}

