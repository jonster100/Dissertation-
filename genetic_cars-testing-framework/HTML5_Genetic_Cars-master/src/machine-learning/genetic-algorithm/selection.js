
module.exports = {
	rouleteWheelSel: rouleteWheelSel
}

function rouleteWheelSel(carsArr){
	var sumCarScore = 0;
	for(var i =0;i<carsArr.length;i++){
		sumCarScore += carsArr[i].score.s;
	}
	console.log("selection data -");
	console.log(carsArr.length);
	console.log(sumCarScore);//test no

	var no = Math.random() * sumCarScore;
	if(sumCarScore!=0){
		for(var x =0;x<carsArr.length;x++){
			no -= carsArr[x].score.s;
			if(no<0){
				console.log(carsArr[x]);
				return carsArr[x];
			}
		}
	}
	else{
		return carsArr[0];
	}
}

