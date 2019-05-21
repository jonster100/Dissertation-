# Dissertation-
The overall framework is not my-own creation, but my contribution/code can be seen in \genetic_cars-testing-framework\HTML5_Genetic_Cars-master\src\machine-learning\genetic-algorithm

All files in the above file is my-own code including the clustering where as the rest is not but a Framework which my Evolutionary algorithm uses in the back-end, some of the code in the manage-round.js file is not mine but my code is highlighted between two comment lines.

This is just a guide though the technical work explaining which part of the project are where:
NOTE - Third party code/original framework is used where the original can be gotten from https://github.com/red42/HTML5_Genetic_Cars

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

