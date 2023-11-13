module.exports = async (instance) => {
	let functionsArray = []
	instance.qlcplusObj.functions.forEach((f) => {
		functionsArray.push({ variableId: `Function${f.id}`, name: f.label })
	})
	instance.setVariableDefinitions(functionsArray)
	instance.qlcplusObj.functions.forEach((f) => {
		instance.setVariableValues({
			[`Function${f.id}`]: f.status ? f.status : 'Unknown',
		})
	})
}
