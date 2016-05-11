app.controller('PropertyEditorHandlerCtrl', ['$scope', 'logSvc', 'config',
	function ($scope, logSvc, config) {
		$scope.model = {
			value: null,         // the value of the property which is attached to the object
			bind: null           // this is the object used by the visual editor before applying the changes to the value
		};

		$scope.hasMultipleDefinitions = function(propertyName) {
			if($scope.property.systemType === "object" && propertyName) {
				return ($scope.property.differentProperties.indexOf(propertyName) >= 0);
			} else {
				return $scope.property.hasDifferentAssignments;
			}
		};

		$scope.onValueChange = function (subPropertyName) {
			// first we update the actual value so the other unedited properties are also set during the synchronization
			$scope.model.value[subPropertyName] = $scope.model.bind[subPropertyName];

			// now we call the parent controller to sync the value into the target
			$scope.syncValue($scope.container, $scope.property, subPropertyName, $scope.model.value);
		};

		(function init() {
			// we don't want to change the original, so we need to clone first to ensure that
			$scope.model.value = (JSON.parse(JSON.stringify($scope.getPropertyValue($scope.container, $scope.property))));

			// the property has multiple assignments? (multi-selection)
			// if true, we shall only assign to the binder the properties that are equal in all of the selected targets
			if($scope.property.hasDifferentAssignments) {
				$scope.model.bind = {};

				// now we need manually copy all the properties to the binder while checking for multiple definitions
				if(typeof $scope.model.value === "object") {
					var propertyNames = Object.getOwnPropertyNames($scope.model.value);
					propertyNames.forEach(function(propertyName) {
						$scope.model.bind[propertyName] = $scope.hasMultipleDefinitions(propertyName) ? null : $scope.model.value[propertyName];
					});
				} else {
					$scope.model.bind = null;
				}

			} else {
				// no reason to make the bind any different :)
				$scope.model.bind = $scope.model.value;
			}

		})();
	}
]);