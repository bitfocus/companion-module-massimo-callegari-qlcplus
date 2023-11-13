module.exports = (instance) => {
	instance.setActionDefinitions({
		getFunctionsList: {
			name: 'Get Function List',
			options: [],
			callback: () => {
				this.log('debug', instance.sendCommand(`QLC+API|getFunctionsList`))
			},
		},
		getFunctionStatus: {
			name: 'Get Function Status based on a ID',
			options: [
				{
					type: 'dropdown',
					label: 'Function',
					id: 'functionID',
					default: 0,
					choices: instance.qlcplusObj.functions,
				},
			],
			callback: async (event) => {
				//Find the matching function:
				const targetFunction = instance.qlcplusObj.functions.find((f) => f.id === event.options.functionID)
				if (targetFunction) {
					targetFunction.status = instance.convertDataToJavascriptObject(
						await instance.sendCommand(`QLC+API|getFunctionStatus|${event.options.functionID}`)
					)[0].id
					instance.setVariableValues({ ['Function'+targetFunction.id]: targetFunction.status })
					instance.checkFeedbacks('functionState')
				}
				instance.log('debug', `Function ${event.options.functionID} is ${targetFunction.status}`)
			},
		},
		setFunctionStatus: {
			name: 'Set Function Status',
			options: [
				{
					type: 'dropdown',
					label: 'Function',
					id: 'functionID',
					default: 0,
					choices: instance.qlcplusObj.functions,
				},
				{
					type: 'dropdown',
					label: 'Status',
					id: 'status',
					choices: [
						{ id: '0', label: 'Stop' },
						{ id: '1', label: 'Run' },
					],
					default: 0,
				},
			],
			callback: (event) => {
				instance.sendCommand(`QLC+API|setFunctionStatus|${event.options.functionID}|${event.options.status}`)
				// Build delay???
				instance.sendCommand(`QLC+API|getFunctionStatus|${event.options.functionID}`)
				// Build delay???
				instance.checkFeedbacks('functionState')
			},
		},
		getWidgetsList: {
			name: 'Get Widgets List',
			options: [],
			callback: () => {
				instance.sendCommand(`QLC+API|getWidgetsList`)
			},
		},
		basicWidgetValueSet: {
			name: 'Set Widget Value',
			options: [
				{
					type: 'dropdown',
					label: 'Widget',
					id: 'widgetID',
					default: 0,
					choices: instance.qlcplusObj.widgets,
				},
				{
					type: 'number',
					label: 'Value',
					id: 'value',
					default: 255,
					min: 0,
					max: 255,
				},
			],
			callback: (event) => {
				instance.sendCommand(`${event.options.widgetID}|${event.options.value}`)
			},
		},
	})
}
