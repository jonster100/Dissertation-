var cluster = require("./cluster.js/");

module.exports = {
	setup: setup
}

//"wheel_radius", "chassis_density", "vertex_list", "wheel_vertex" and "wheel_density"/
function setup(cars, extCluster, clusterPrecreated){
	var clust = (clusterPrecreated===false)?setupDataClusters(cluster.createClusterInterface("newCluster")): extCluster;
	for(var i =0;i<cars.length;i++){
		addCarsToCluster(cars[i], clust);
	}
	console.log(clust);//test
	return clust;
}

function setupDataClusters(mainCluster){
	mainCluster.arrayOfClusters.push(cluster.createDataPointCluster("wheel_radius"));
	mainCluster.arrayOfClusters.push(cluster.createDataPointCluster("chassis_density"));
	mainCluster.arrayOfClusters.push(cluster.createDataPointCluster("wheel_vertex"));
	mainCluster.arrayOfClusters.push(cluster.createDataPointCluster("vertex_list"));
	mainCluster.arrayOfClusters.push(cluster.createDataPointCluster("wheel_density"));
	return mainCluster;
}

function addCarsToCluster(car, clust){
	cluster.findDataPointCluster("wheel_radius", clust).dataArray.push(cluster.createDataPoint(car.id, "wheel_radius",car.wheel_radius));
	cluster.findDataPointCluster("chassis_density", clust).dataArray.push(cluster.createDataPoint(car.id, "chassis_density",car.chassis_density));
	cluster.findDataPointCluster("vertex_list", clust).dataArray.push(cluster.createDataPoint(car.id, "vertex_list",car.vertex_list));
	cluster.findDataPointCluster("wheel_vertex", clust).dataArray.push(cluster.createDataPoint(car.id, "wheel_vertex",car.wheel_vertex));
	cluster.findDataPointCluster("wheel_density", clust).dataArray.push(cluster.createDataPoint(car.id, "wheel_density",car.wheel_density));
}