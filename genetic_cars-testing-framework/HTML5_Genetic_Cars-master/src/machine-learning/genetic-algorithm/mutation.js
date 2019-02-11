
module.exports = {
	mutate: mutate
}

function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function changeArrayValue(originalValue){
	for(var i=0;i<originalValue.length;i++){
		var randomFloat = Math.random();
		originalValue[i] = (randomFloat<0.5)?(originalValue[i]*0.5)+randomFloat:1-randomFloat;
	}
	return originalValue;
}

function mutate(car,schema){
	var randomInt = getRandomInt(1,4);
	if(randomInt===1){
		car.def.chassis_density=changeArrayValue(car.def.chassis_density);
	}
	else if(randomInt===2){
		car.def.vertex_list=changeArrayValue(car.def.vertex_list);
	}
	else if(randomInt===3){
		car.def.wheel_density=changeArrayValue(car.def.wheel_density);
	}
	else {
		car.def.wheel_radius=changeArrayValue(car.def.wheel_radius);
	}
	return car;
}
