
module.exports = {
	runSelection: runSelection
}
/*
This function changes the type of selection used depending on the parameter number "selectType" = (rouleteWheelSel - 1, tournamentSelection - 2)
@param strongest boolean  - this parameter is passed through to the tournamentSelection function where true is return the strongest and false get weakest
@param selectType int - this parameter determines the type of selection used.
@param carsArr Array - this parameter is the population which the selection functions are used on.
@return ObjectArray - the parents array of two is returned from either tournament or roullete wheel selection*/
function runSelection(carsArr, selectType, strongest){
	if(selectType===1){
		return rouleteWheelSel(carsArr);
	} 
	else if(selectType===2){
		return tournamentSelection(carsArr,strongest);
	}
}

/*This function uses finess proportionate selection where a proportion of the wheel is given to a car based on fitness
@param carsArr ObjectArray - The array of cars where the parents are chosen from
@return car Object - A car object is returned after selection*/
function rouleteWheelSel(carsArr){
	var sumCarScore = 0;
	for(var i =0;i<carsArr.length;i++){
		sumCarScore += carsArr[i].score.s;
	}
	/*console.log("selection data -");
	console.log(carsArr.length);
	console.log(sumCarScore);//test no
	*/
	var no = Math.random() * sumCarScore;
	if(sumCarScore!=0){
		for(var x =0;x<carsArr.length;x++){
			no -= carsArr[x].score.s;
			if(no<0){
				//console.log(carsArr[x]);//returned car
				return carsArr[x];
			}
		}
	}
	else{
		return carsArr[0];
	}
}

/*This function uses tournamentSelection where a array is sorted and the strongest or weakest is returned
@param carsArr ObjectArray - The array of cars where the parents are chosen from
@param strongest Boolean - if true the strongest car is chosen, else if false the weakest is returned 
@return car Object - A car object is returned after selection*/
function tournamentSelection(carsArr, strongest){
	carsArr.sort(function(a,b){return (strongest===true)?b.score.s - a.score.s:a.score.s - a.score.b;});
	return carsArr[0];
}

