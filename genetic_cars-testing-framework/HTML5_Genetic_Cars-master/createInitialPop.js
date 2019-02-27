var crossover = require("./src/machine-learning/genetic-algorithm/crossover.js");
var generationConfig = require("./src/generation-config");
var create = require("./src/machine-learning/create-instance");
var fs = require('fs');

module.exports = {
	run: generationZero
}

function generationZero(){
  var generationSize = generationConfig.generationSize,
  schema = generationConfig.schema;
  var cw_carGeneration = [];
  for (var k = 0; k < generationSize; k++) {
    var def = create.createGenerationZero(schema, function(){
      return Math.random()
    });
    def.index = k;
    //cw_carGeneration.push(def);
	printToFile(def);
  }
}

function printToFile(data){
	fs.writeFile ("initialCars.json", JSON.stringify(data), function(err) {
    if (err) throw err;
		console.log('complete');
    });
}
