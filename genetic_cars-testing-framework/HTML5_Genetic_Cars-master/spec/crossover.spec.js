var crossover = require("../src/machine-learning/genetic-algorithm/crossover.js");
var generationConfig = require("../src/generation-config");
var create = require("../src/machine-learning/create-instance");
var fs = require('fs');

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
	printToFile(def);
  }
  return {
    counter: 0,
    generation: cw_carGeneration,
  };
}

function printToFile(data){
	fs.appendFile("initialCars.json", JSON.stringify(data), function(err) {
    if (err) throw err;
		console.log('complete');
    });
}

function check(runSel, generation){
			if(generation.includes(runSel[0].id)||generation.includes(runSel[1].id)){
				console.log(runSel[0].id);
				console.log(runSel[1].id);
				return false;
			}
			else if(JSON.stringify(runSel[0].wheel_radius) === JSON.stringify(runSel[1].wheel_radius)){
				console.log(runSel[0].wheel_radius);
				console.log(runSel[1].wheel_radius);
				return false;
			}
			else if(JSON.stringify(runSel[0].chassis_density) === JSON.stringify(runSel[1].chassis_density)){
				console.log(runSel[0].chassis_density);
				console.log(runSel[1].chassis_density);
				return false;
			}
			else if(JSON.stringify(runSel[0].vertex_list) === JSON.stringify(runSel[1].vertex_list)){
				console.log(runSel[0].vertex_list);
				console.log(runSel[1].vertex_list);
				return false;
			}
			else if(JSON.stringify(runSel[0].wheel_density) === JSON.stringify(runSel[1].wheel_density)){
				console.log(runSel[0].wheel_density);
				console.log(runSel[1].wheel_density);
				return false;
			}
			return true;
		}
	
describe("Crossover test suite", function(){
	var schema = generationConfig().schema;
	//var config =generationConfig;
	var generation = generationZero(generationConfig()).generation;
	//console.log(generation[0].id);
	it("one point crossover",function(){
		var arr = [];
		arr.push(generation[0]);
		arr.push(generation[1]);
		var runSel = crossover.runCrossover(arr, 1, schema, 0, generation.length);
		
		expect(check(runSel, generation)).toBe(true);
	});
	it("two point crossover",function(){
		var arr = [];
		arr.push(generation[0]);
		arr.push(generation[1]);
		var runSel = crossover.runCrossover(arr, 2, schema, 0, generation.length);
		
		expect(check(runSel, generation)).toBe(true);
	});
});
