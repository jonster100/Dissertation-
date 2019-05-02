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