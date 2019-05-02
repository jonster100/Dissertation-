var selection = require("../src/machine-learning/genetic-algorithm/selection");

describe("roulette selection test suite", function(){
	it("roulette selection",function(){
		var arr = [];
		for(var i=0;i<2;i++){
			var obj = {
				id: i,
				score: {
					s: i,
				}
			}
			arr.push(obj);
		}
		var runSel = selection.runSelection(arr, 1,true);
		expect(arr.includes(runSel)).toBe(true);
	});
});

describe("tournament-selection test suite", function(){
	var arr = [];
		for(var i=0;i<2;i++){
			var obj = {
				id: i,
				score: {
					s: i,
				}
			}
			arr.push(obj);
		}
	it("tournament selection get strongest",function(){
		var runSel = selection.tournamentSelection(arr, false,2,true);
		expect(arr[0].id===runSel.id).toBe(true);
	});
	it("tournament selection get weakest",function(){
		var runSel = selection.tournamentSelection(arr, false,2,true);
		expect(arr[0].id===runSel.id).toBe(true);
	});
});