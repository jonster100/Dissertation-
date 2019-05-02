This is just a guide though the technical work explaining which part of the project are where:
NOTE - Third party code is used where the original can be gotten from https://github.com/red42/HTML5_Genetic_Cars

The final solution whhich is the Evolutionay algorithm consist of the following fles:
	\HTML5_Genetic_Cars-master\src\machine-learning\genetic-algorithm\crossover.js - all the code in this file is my own written code
	\HTML5_Genetic_Cars-master\src\machine-learning\genetic-algorithm\mutation.js - all the code in this file is my own written code
	\HTML5_Genetic_Cars-master\src\machine-learning\genetic-algorithm\randomInt.js - all the code in this file is my own written code
	\HTML5_Genetic_Cars-master\src\machine-learning\genetic-algorithm\selecton.js - all the code in this file is my own written code
	\HTML5_Genetic_Cars-master\src\machine-learning\genetic-algorithm\clustering\cluster.js - all the code in this file is my own written code
	\HTML5_Genetic_Cars-master\src\machine-learning\genetic-algorithm\clustering\clusterSetup.js - all the code in this file is my own written code
	
	\HTML5_Genetic_Cars-master\src\machine-learning\genetic-algorithm\manage-round.js - the code that is mine within this program is between line 37-200
	\HTML5_Genetic_Cars-master\src\index.js - the code that is mine is line 4 and line 405-414
	
the following are the unit test files -
	\genetic_cars-testing-framework\HTML5_Genetic_Cars-master\spec\crossover.spec.js - the crossover operator unit tests
	\genetic_cars-testing-framework\HTML5_Genetic_Cars-master\spec\selection.spec.js - the selection operator unit tests

	
Setting up Evolutionary algorithm -
To setup a particular combination of Evolutionary algorithm operators go to the \HTML5_Genetic_Cars-master\src\machine-learning\genetic-algorithm\manage-round.js file
Go to line 146-155 to change the variables of the tpye of operaotrs to use.

To Compile code -
NPM is required to be installed from https://www.npmjs.com/get-npm
install browserify by typing in the command prompt "npm install browserify" in the src code file
To run the compile the source code to a bundle.js type "npm run-script build" in the directory of "index.html" :Dissertation-\genetic_cars-testing-framework\HTML5_Genetic_Cars-master

To run simulation -
To run the simulation go into the \genetic_cars-testing-framework\HTML5_Genetic_Cars-master file and press the index.html the simulation will automatically start
Tthe testing of this was done in google chrome so to view and debug parts of the code running press ctrl-shift-i

To run unit tests - 
Install Jasmine in the command console with "npm install -g jasmine"
To fun the unit tests go into the src file in the command console and type "Jasmine" to automatically run the unit tests

Data Collected -
The data colelcted from the Evolutionary algorithms are put into Excel spreadsheets, they all have a code such as EA1 or EA101 they are listed below with a description of what operators are used.
Data Collected from different versions of Evolutionary algorithm operators -

	EA1 - Roulette-wheel selection, 3 elites, Two-point crossover, 1 Mutation (20 cars) - (09/03/2019)
	EA2 - Tournament selection, 3 elites, Two-point crossover, 1 Mutation (20 cars) - (09/03/2019)
	EA3 - Uniform random selection, 3 elites, Two-point crossover, 1 Mutation (20 cars) - (09/03/2019)
	EA4 - Roulette-wheel selection, 3 elites, One-point crossover, 1 Mutation (20 cars) - (10/03/2019)
	EA5 - Tournament selection, 3 elites, One-point crossover, 1 Mutation (20 cars) - (10/03/2019)
	EA6 - Uniform random selection, 3 elites, One-point crossover, 1 Mutation (20 cars) - (10/03/2019)
	EA7 - Roulette-wheel selection, 3 elites, Two-point crossover, Multi-Mutations (20 cars) - (10/03/2019)	
	EA8 - Tournament selection, 3 elites, Two-point crossover, Multi-Mutations (20 cars) - (10/03/2019)	
	EA9 - Uniform random selection, 3 elites, Two-point crossover, Multi-Mutations (20 cars) - (10/03/2019)	
	EA10 - Roulette-wheel selection, 1 elites, Two-point crossover, 1 Mutations (20 cars) - (10/03/2019)
	EA11 - Tournament selection, 1 elites, Two-point crossover, 1 Mutations (20 cars) - (10/03/2019)
	EA12 - Uniform random selection, 1 elites, Two-point crossover, 1 Mutations (20 cars) - (10/03/2019)
	EA13 - Tournament selection Strong&Weak, 3 elites, Two-point crossover, 1 Mutations (20 cars) - (10/03/2019)
	EA14 - Tournament selection Strong&Weak, 3 elites, One-point crossover, 1 Mutations (20 cars) - (10/03/2019)		
	EA15 - Tournament selection Strong&Weak, 3 elites, Two-point crossover, Multi-Mutations (20 cars) - (11/03/2019)
	EA16 - Roulette-wheel selection, 3 elites, Two-point crossover, 1 Mutation, 1 ReproductionIncrease-(tournament selection) (20 cars) - (11/03/2019)
	EA17 - Tournament selection, 3 elites, Two-point crossover, 1 Mutations, 1 ReproductionIncrease-(tournament selection) (20 cars) - (11/03/2019)
	EA18 - Uniform random selection, 3 elites, Two-point crossover, 1 Mutations, 1 ReproductionIncrease-(tournament selection) (20 cars) - (11/03/2019)
	EA19 - Tournament selection Strong&Weak, 3 elites, Two-point crossover, 1 Mutations, 1 ReproductionIncrease-(tournament selection) (20 cars) - (11/03/2019)
	EA20 - Roulette-wheel selection, 3 elites, Two-point crossover, Multi-Mutations, 1 ReproductionIncrease-(tournament selection) (20 cars) - (11/03/2019)
	EA21 - Tournament selection, 3 elites, Two-point crossover, Multi-Mutations, 1 ReproductionIncrease-(tournament selection) (20 cars) - (11/03/2019)
	EA22 - Uniform random selection, 3 elites, Two-point crossover, Multi-Mutations, 1 ReproductionIncrease-(tournament selection) (20 cars) - (11/03/2019)
	
	EA23 - Roulette-wheel selection, 3 elites, Two-point crossover, 1 Mutation, 1 ReproductionIncrease-(Roulette-wheel selection) (20 cars) - (13/03/2019)
	EA24 - Tournament selection, 3 elites, Two-point crossover, 1 Mutation, 1 ReproductionIncrease-(Roulette-wheel selection) (20 cars) - (13/03/2019)
	EA25 - Uniform random selection, 3 elites, Two-point crossover, 1 Mutation, 1 ReproductionIncrease-(Roulette-wheel selection) (20 cars) - (13/03/2019)
	EA26 - Tournament selection Strong&Weak, 3 elites, Two-point crossover, 1 Mutations, 1 ReproductionIncrease-(Roulette-wheel selection) (20 cars) - (13/03/2019)
	
	EA27 - Roulette-wheel selection, 3 elites, Two-point crossover, 1 Mutation, 1 ReproductionIncrease-(Uniform random selection) (20 cars) - (15/03/2019)
	EA28 - Tournament selection, 3 elites, Two-point crossover, 1 Mutation, 1 ReproductionIncrease-(Uniform random selection) (20 cars) - (15/03/2019)
	EA29 - Uniform random selection, 3 elites, Two-point crossover, 1 Mutation, 1 ReproductionIncrease-(Uniform random selection) (20 cars) - (15/03/2019)
	EA30 - Tournament selection Strong&Weak, 3 elites, Two-point crossover, 1 Mutations, 1 ReproductionIncrease-(Uniform random selection) (20 cars) - (15/03/2019)
	
	EA31 - Roulette-wheel selection, 0 elites, Two-point crossover, 1 Mutation (20 cars) - (15/03/2019)
	EA32 - Tournament selection, 0 elites, Two-point crossover, 1 Mutation (20 cars) - (15/03/2019)
	EA33 - Uniform random selection, 0 elites, Two-point crossover, 1 Mutation (20 cars) - (15/03/2019)
	
	EA34 - Roulette-wheel selection, 0 elites, Two-point crossover, 1 Mutation, 1 ReproductionIncrease-(tournament selection) (20 cars) - (15/03/2019)
	EA35 - Tournament selection, 0 elites, Two-point crossover, 1 Mutation, 1 ReproductionIncrease-(tournament selection) (20 cars) - (15/03/2019)
	EA36 - Uniform random selection, 0 elites, Two-point crossover, 1 Mutation, 1 ReproductionIncrease-(tournament selection) (20 cars) - (15/03/2019)
	
	EA37 - Roulette-wheel selection, 0 elites, Two-point crossover, 1 Mutation, 3 ReproductionIncrease-(tournament selection) (20 cars) - (16/03/2019)
	EA38 - Tournament selection, 0 elites, Two-point crossover, 1 Mutation, 3 ReproductionIncrease-(tournament selection) (20 cars) - (16/03/2019)
	EA39 - Uniform random selection, 0 elites, Two-point crossover, 1 Mutation, 3 ReproductionIncrease-(tournament selection) (20 cars) - (16/03/2019)
	!!!- the previous 3 tests show that increasing the mateIncreas increases selection pressure improving performance which shows in the results and this can also be show with the elitism using 3 instead of 1
	EA40 - Roulette-wheel selection, 0 elites, Two-point crossover, 1 Mutation, 3 ReproductionIncrease-(Roulette-wheel selection) (20 cars) - (16/03/2019)
	EA41 - Tournament selection, 0 elites, Two-point crossover, 1 Mutation, 3 ReproductionIncrease-(Roulette-wheel selection) (20 cars) - (16/03/2019)
	!!!- the past two have a lower performance using roulette instead of tournament because of the lower selection pressure
	
	EA42 - Roulette-wheel selection, 3 elites, Two-point crossover, 1 Mutation, 3 ReproductionIncrease-(tournament selection) (20 cars) - (16/03/2019)
	EA43 - Tournament selection, 3 elites, Two-point crossover, 1 Mutations, 3 ReproductionIncrease-(tournament selection) (20 cars) - (16/03/2019)
	EA44 - Uniform random selection, 3 elites, Two-point crossover, 1 Mutations, 3 ReproductionIncrease-(tournament selection) (20 cars) - (16/03/2019)
	!!!- no notable increase in performance compared to others
	
	EA45 - Roulette-wheel selection, 6 elites, Two-point crossover, 1 Mutations (20 cars) - (17/03/2019)
	EA46 - Tournament selection, 6 elites, Two-point crossover, 1 Mutations (20 cars) - (17/03/2019)
	EA47 - Uniform random selection, 6 elites, Two-point crossover, 1 Mutations (20 cars) - (17/03/2019)
	!!!- there is a increase in the average performance with the increase of elites from 3 to 6
	
	EA48 - Roulette-wheel selection, 9 elites, Two-point crossover, 1 Mutations (20 cars) - (17/03/2019)
	EA49 - Tournament selection, 9 elites, Two-point crossover, 1 Mutations (20 cars) - (17/03/2019)
	EA50 - Uniform random selection, 9 elites, Two-point crossover, 1 Mutations (20 cars) - (18/03/2019)
	
	EA51 - Roulette-wheel selection, 0 elites, Two-point crossover, 1 Mutation, 6 ReproductionIncrease-(tournament selection) (20 cars) - (18/03/2019)
	EA52 - Tournament selection, 0 elites, Two-point crossover, 1 Mutation, 6 ReproductionIncrease-(tournament selection) (20 cars) - (18/03/2019)
	EA53 - Uniform random selection, 0 elites, Two-point crossover, 1 Mutation, 6 ReproductionIncrease-(tournament selection) (20 cars) - (18/03/2019)
	
	EA54 - Roulette-wheel selection, 1 elites, one-point crossover, 1 Mutations (20 cars) - (20/03/2019)
	EA55 - Tournament selection, 1 elites, one-point crossover, 1 Mutations (20 cars) - (20/03/2019)
	EA56 - Uniform random selection, 1 elites, one-point crossover, 1 Mutations (20 cars) - (20/03/2019)
	
	EA57 - Roulette-wheel selection, 9 elites, one-point crossover, 1 Mutations (20 cars) - (20/03/2019)
	EA58 - Tournament selection, 9 elites, one-point crossover, 1 Mutations (20 cars) - (20/03/2019)
	EA59 - Uniform random selection, 9 elites, one-point crossover, 1 Mutations (20 cars) - (20/03/2019)
	
	EA60 - Roulette-wheel selection, 0 elites, one-point crossover, 1 Mutation, 1 ReproductionIncrease-(tournament selection) (20 cars) - (20/03/2019)
	EA61 - Tournament selection, 0 elites, one-point crossover, 1 Mutation, 1 ReproductionIncrease-(tournament selection) (20 cars) - (20/03/2019)
	EA62 - Uniform random selection, 0 elites, one-point crossover, 1 Mutation, 1 ReproductionIncrease-(tournament selection) (20 cars) - (20/03/2019)
	
	EA63 - Roulette-wheel selection, 0 elites, one-point crossover, 1 Mutation, 3 ReproductionIncrease-(tournament selection) (20 cars) - (21/03/2019)
	EA64 - Tournament selection, 0 elites, one-point crossover, 1 Mutation, 3 ReproductionIncrease-(tournament selection) (20 cars) - (21/03/2019)
	EA65 - Uniform random selection, 0 elites, one-point crossover, 1 Mutation, 3 ReproductionIncrease-(tournament selection) (20 cars) - (21/03/2019)
	
	EA66 - Roulette-wheel selection, 0 elites, one-point crossover, 1 Mutation, 6 ReproductionIncrease-(tournament selection) (20 cars) - (21/03/2019)
	EA67 - Tournament selection, 0 elites, one-point crossover, 1 Mutation, 6 ReproductionIncrease-(tournament selection) (20 cars) - (21/03/2019)
	EA68 - Uniform random selection, 0 elites, one-point crossover, 1 Mutation, 6 ReproductionIncrease-(tournament selection) (20 cars) - (21/03/2019)
	
	EA69 - Roulette-wheel selection, 0 elites, one-point crossover, 1 Mutation (20 cars) - (21/03/2019)
	EA70 - Tournament selection, 0 elites, one-point crossover, 1 Mutation (20 cars) - (22/03/2019)
	EA71 - Uniform random selection, 0 elites, one-point crossover, 1 Mutation (20 cars) - (22/03/2019)
	
	EA72 - Roulette-wheel selection, 3 elites, one-point crossover, 1 Mutation, 1 ReproductionIncrease-(tournament selection) (20 cars) - (22/03/2019)
	EA73 - Tournament selection, 3 elites, one-point crossover, 1 Mutations, 1 ReproductionIncrease-(tournament selection) (20 cars) - (22/03/2019)
	EA74 - Uniform random selection, 3 elites, one-point crossover, 1 Mutations, 1 ReproductionIncrease-(tournament selection) (20 cars) - (22/03/2019)
	
	EA75 - Roulette-wheel selection, 1 elites, two-point crossover, 1 Mutations, usingClusteringScore(20 cars) - (22/03/2019)
	EA76 - Tournament selection, 1 elites, two-point crossover, 1 Mutations, usingClusteringScore(20 cars) - (22/03/2019)
	EA77 - Uniform random selection, 1 elites, two-point crossover, 1 Mutations, usingClusteringScore(20 cars) - (22/03/2019)
	
	EA78 - Roulette-wheel selection, 3 elites, two-point crossover, 1 Mutations, usingClusteringScore(20 cars) - (22/03/2019)
	EA79 - Tournament selection, 3 elites, two-point crossover, 1 Mutations, usingClusteringScore(20 cars) - (22/03/2019)
	EA80 - Uniform random selection, 3 elites, two-point crossover, 1 Mutations, usingClusteringScore(20 cars) - (22/03/2019)
	
	EA81 - Roulette-wheel selection, 9 elites, two-point crossover, 1 Mutations, usingClusteringScore(20 cars) - (22/03/2019)
	EA82 - Tournament selection, 9 elites, two-point crossover, 1 Mutations, usingClusteringScore(20 cars) - (23/03/2019)
	EA83 - Uniform random selection, 9 elites, two-point crossover, 1 Mutations, usingClusteringScore(20 cars) - (23/03/2019)
	
	EA84 - Roulette-wheel selection, 0 elites, two-point crossover, 1 Mutation, 1 ReproductionIncrease, usingClusteringScore-(tournament selection) (20 cars) - (23/03/2019)
	EA85 - Tournament selection, 0 elites, two-point crossover, 1 Mutation, 1 ReproductionIncrease, usingClusteringScore-(tournament selection) (20 cars) - (23/03/2019)
	EA86 - Uniform random selection, 0 elites, two-point crossover, 1 Mutation, 1 ReproductionIncrease, usingClusteringScore-(tournament selection) (20 cars) - (23/03/2019)
	
	EA87 - Roulette-wheel selection, 0 elites, two-point crossover, 1 Mutation, 3 ReproductionIncrease, usingClusteringScore-(tournament selection) (20 cars) - (23/03/2019)
	EA88 - Tournament selection, 0 elites, two-point crossover, 1 Mutation, 3 ReproductionIncrease, usingClusteringScore-(tournament selection) (20 cars) - (23/03/2019)
	EA89 - Uniform random selection, 0 elites, two-point crossover, 1 Mutation, 3 ReproductionIncrease, usingClusteringScore-(tournament selection) (20 cars) - (23/03/2019)
	
	EA90 - Roulette-wheel selection, 0 elites, one-point crossover, 1 Mutation, 6 ReproductionIncrease-(tournament selection) (20 cars) - (24/03/2019)
	EA91 - Tournament selection, 0 elites, one-point crossover, 1 Mutation, 6 ReproductionIncrease-(tournament selection) (20 cars) - (24/03/2019)
	EA92 - Uniform random selection, 0 elites, one-point crossover, 1 Mutation, 6 ReproductionIncrease-(tournament selection) (20 cars) - (24/03/2019)
	
	EA93 - Roulette-wheel selection, 1 elites, two-point crossover, Multi-Mutation (20 cars) - (24/03/2019)
	EA94 - Tournament selection, 1 elites, two-point crossover, Multi-Mutation (20 cars) - (24/03/2019)
	EA95 - Roulette-wheel selection, 1 elites, two-point crossover, Multi-Mutation (20 cars) - (24/03/2019)
	
	EA96 - Roulette-wheel selection, 3 elites, two-point crossover, Multi-Mutation (20 cars) - (24/03/2019)
	->EA97 - Tournament selection, 3 elites, two-point crossover, Multi-Mutation (20 cars) - (24/03/2019)
	->EA98 - Roulette-wheel selection, 3 elites, two-point crossover, Multi-Mutation (20 cars) - (24/03/2019)
	
	EA99 - Roulette-wheel selection, 9 elites, two-point crossover, Multi-Mutation (20 cars) - (24/03/2019)
	EA100 - Tournament selection, 9 elites, two-point crossover, Multi-Mutation (20 cars) - (24/03/2019)
	EA101 - Roulette-wheel selection, 9 elites, two-point crossover, Multi-Mutation (20 cars) - (24/03/2019)
	
	EA102 - Roulette-wheel selection, 0 elites, two-point crossover, Multi-Mutation, 1 ReproductionIncrease-(tournament selection) (20 cars) - (25/03/2019)
	EA103 - Tournament selection, 0 elites, two-point crossover, Multi-Mutation, 1 ReproductionIncrease-(tournament selection) (20 cars) - (25/03/2019)
	EA104 - Uniform random selection, 0 elites, two-point crossover, Multi-Mutation, 1 ReproductionIncrease-(tournament selection) (20 cars) - (25/03/2019)
	
	EA105 - Roulette-wheel selection, 0 elites, two-point crossover, Multi-Mutation, 3 ReproductionIncrease-(tournament selection) (20 cars) - (25/03/2019)
	EA106 - Tournament selection, 0 elites, two-point crossover, Multi-Mutation, 3 ReproductionIncrease-(tournament selection) (20 cars) - (25/03/2019)
	EA107 - Uniform random selection, 0 elites, two-point crossover, Multi-Mutation, 3 ReproductionIncrease-(tournament selection) (20 cars) - (25/03/2019)
	
	EA108 - Roulette-wheel selection, 0 elites, two-point crossover, Multi-Mutation, 6 ReproductionIncrease-(tournament selection) (20 cars) - (25/03/2019)
	EA109 - Tournament selection, 0 elites, two-point crossover, Multi-Mutation, 6 ReproductionIncrease-(tournament selection) (20 cars) - (25/03/2019)
	EA110 - Uniform random selection, 0 elites, two-point crossover, Multi-Mutation, 6 ReproductionIncrease-(tournament selection) (20 cars) - (25/03/2019)
	-39
	EA111 - Roulette-wheel selection, 1 elites, two-point crossover, Cluster-Mutation (20 cars) - (27/03/2019)
	EA112 - Tournament selection, 1 elites, two-point crossover, Cluster-Mutation (20 cars) - (27/03/2019)
	EA113 - Uniform random selection, 1 elites, two-point crossover, Cluster-Mutation (20 cars) - (27/03/2019)
	
	EA114 - Roulette-wheel selection, 3 elites, two-point crossover, Cluster-Mutation (20 cars) - (28/03/2019)
	EA115 - Tournament selection, 3 elites, two-point crossover, Cluster-Mutation (20 cars) - (28/03/2019)
	EA116 - Uniform random selection, 3 elites, two-point crossover, Cluster-Mutation (20 cars) - (28/03/2019)
	
	EA117 - Roulette-wheel selection, 9 elites, two-point crossover, Cluster-Mutation (20 cars) - (26/03/2019)
	EA118 - Tournament selection, 9 elites, two-point crossover, Cluster-Mutation (20 cars) - (29/03/2019)
	EA119 - Uniform random selection, 9 elites, two-point crossover, Cluster-Mutation (20 cars) - (29/03/2019)
	
	EA120 - Roulette-wheel selection, 0 elites, two-point crossover, Cluster-Mutation(40n) (20 cars) - (29/03/2019)
	EA121 - Tournament selection, 0 elites, two-point crossover, Cluster-Mutation(40n)(20 cars) - (29/03/2019)
	EA122 - Uniform random selection, 0 elites, two-point crossover, Cluster-Mutation(40n)(20 cars) - (29/03/2019)
	
	EA123 - Roulette-wheel selection, 1 elites, two-point crossover, Cluster-Mutation(200n) (20 cars) - (29/03/2019)
	EA124 - Tournament selection, 1 elites, two-point crossover, Cluster-Mutation(200n)(20 cars) - (29/03/2019)
	EA125 - Uniform random selection, 1 elites, two-point crossover, Cluster-Mutation(200n)(20 cars) - (29/03/2019)
	
	EA126 - Roulette-wheel selection, 3 elites, two-point crossover, Cluster-Mutation(200n) (20 cars) - (29/03/2019)
	EA127 - Tournament selection, 3 elites, two-point crossover, Cluster-Mutation(200n)(20 cars) - (29/03/2019)
	EA128 - Uniform random selection, 3 elites, two-point crossover, Cluster-Mutation(200n)(20 cars) - (29/03/2019)
	
	EA131 - Roulette-wheel selection, 0 elites,two-point crossover, Cluster-Mutation(40n), 1 ReproductionIncrease-(tournament selection) (20 cars) - (21/03/2019)
	EA132 - Roulette-wheel selection, 0 elites, two-point crossover,  Cluster-Mutation(40n), 3 ReproductionIncrease-(tournament selection) (20 cars) - (21/03/2019)
	EA133 - Roulette-wheel selection, 0 elites, two-point crossover, Cluster-Mutation(40n), 6 ReproductionIncrease-(tournament selection) (20 cars) - (21/03/2019)
	
	EA000 - Roulette-wheel selection, 1 elites, two-point crossover, Cluster-Mutation(40n) (20 cars) - (23/04/2019)
	EA001 - Roulette-wheel selection, 1 elites, two-point crossover, Cluster-Mutation(200n) (20 cars) - (23/04/2019)
	EA003 - Roulette-wheel selection, 1 elites, two-point crossover, Cluster-Mutation(700) (20 cars) - (23/04/2019)
	