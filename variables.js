module.exports = async (instance) => {
	//Functions
	let functionsArray = [];
	instance.qlcplusObj.functions.forEach((f) => {
		functionsArray.push({ variableId: `Function${f.id}`, name: f.label })
	})
	instance.qlcplusObj.functions.forEach((f) => {
		instance.setVariableValues({
			[`Function${f.id}`]: f.status ? f.status : 'Unknown',
		})
	})
	//Widgets
	let widgetArray = [];
	instance.qlcplusObj.widgets.forEach((w) => {
		widgetArray.push({ variableId: `Widget${w.id}`, name: w.label })
	})
	instance.qlcplusObj.widgets.forEach((w) => {
		instance.setVariableValues({
			[`Function${w.id}`]: w.value ? w.value : 'Unknown',
		})
	})
	instance.setVariableDefinitions(functionsArray.concat(widgetArray))
}
