module.exports = (instance) => {
	instance.setActionDefinitions({
		getFunctionsList: {
			name: 'Get Function List',
			options: [],
			callback: () => {
				instance.log('debug', instance.sendCommand(`QLC+API|getFunctionsList`))
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
				instance.sendCommand(`QLC+API|getFunctionStatus|${event.options.functionID}`)
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
		// Virtual Console Slider Control
		setSliderValue: {
			name: 'Set Virtual Console Slider Value',
			options: [
				{
					type: 'dropdown',
					label: 'Slider Widget',
					id: 'widgetID',
					default: 0,
					choices: instance.qlcplusObj.widgets,
					tooltip: 'Select a Slider widget from Virtual Console',
				},
				{
					type: 'number',
					label: 'Value (0-255)',
					id: 'value',
					default: 128,
					min: 0,
					max: 255,
				},
			],
			callback: (event) => {
				instance.sendCommand(`${event.options.widgetID}|${event.options.value}`)
			},
		},
		// Virtual Console Button Control
		pressButton: {
			name: 'Press Virtual Console Button',
			options: [
				{
					type: 'dropdown',
					label: 'Button Widget',
					id: 'widgetID',
					default: 0,
					choices: instance.qlcplusObj.widgets,
					tooltip: 'Select a Button widget from Virtual Console',
				},
				{
					type: 'dropdown',
					label: 'Action',
					id: 'action',
					choices: [
						{ id: '255', label: 'Press' },
						{ id: '0', label: 'Release' },
					],
					default: '255',
				},
			],
			callback: (event) => {
				instance.sendCommand(`${event.options.widgetID}|${event.options.action}`)
			},
		},
		// Virtual Console Button Toggle
		toggleButton: {
			name: 'Toggle Virtual Console Button',
			options: [
				{
					type: 'dropdown',
					label: 'Button Widget',
					id: 'widgetID',
					default: 0,
					choices: instance.qlcplusObj.widgets,
					tooltip: 'Toggle a Button widget on Virtual Console',
				},
			],
			callback: async (event) => {
				// Press
				await instance.sendCommand(`${event.options.widgetID}|255`)
				// Small delay
				setTimeout(() => {
					// Release
					instance.sendCommand(`${event.options.widgetID}|0`)
				}, 100)
			},
		},
		// Virtual Console Cue List Control
		setCueListStep: {
			name: 'Set Cue List Step',
			options: [
				{
					type: 'dropdown',
					label: 'Cue List Widget',
					id: 'widgetID',
					default: 0,
					choices: instance.qlcplusObj.widgets,
					tooltip: 'Select a Cue List widget',
				},
				{
					type: 'number',
					label: 'Step Number',
					id: 'step',
					default: 0,
					min: 0,
				},
			],
			callback: (event) => {
				instance.sendCommand(`${event.options.widgetID}|${event.options.step}`)
			},
		},
		// Virtual Console Frame Page Control
		setFramePage: {
			name: 'Set Frame Page',
			options: [
				{
					type: 'dropdown',
					label: 'Frame Widget',
					id: 'widgetID',
					default: 0,
					choices: instance.qlcplusObj.widgets,
					tooltip: 'Select a Frame widget with multiple pages',
				},
				{
					type: 'number',
					label: 'Page Number',
					id: 'page',
					default: 0,
					min: 0,
				},
			],
			callback: (event) => {
				instance.sendCommand(`${event.options.widgetID}|${event.options.page}`)
			},
		},
		// Virtual Console XY Pad Control
		setXYPadPosition: {
			name: 'Set XY Pad Position',
			options: [
				{
					type: 'dropdown',
					label: 'XY Pad Widget',
					id: 'widgetID',
					default: 0,
					choices: instance.qlcplusObj.widgets,
					tooltip: 'Select an XY Pad widget',
				},
				{
					type: 'number',
					label: 'X Position (0-255)',
					id: 'xPos',
					default: 128,
					min: 0,
					max: 255,
				},
				{
					type: 'number',
					label: 'Y Position (0-255)',
					id: 'yPos',
					default: 128,
					min: 0,
					max: 255,
				},
			],
			callback: (event) => {
				// XY Pad requires two commands
				instance.sendCommand(`${event.options.widgetID}|${event.options.xPos}|${event.options.yPos}`)
			},
		},
		// Virtual Console Speed Dial Control
		setSpeedDialValue: {
			name: 'Set Speed Dial Value',
			options: [
				{
					type: 'dropdown',
					label: 'Speed Dial Widget',
					id: 'widgetID',
					default: 0,
					choices: instance.qlcplusObj.widgets,
					tooltip: 'Select a Speed Dial widget',
				},
				{
					type: 'number',
					label: 'Speed (ms)',
					id: 'speed',
					default: 1000,
					min: 0,
					max: 999999,
				},
			],
			callback: (event) => {
				instance.sendCommand(`${event.options.widgetID}|${event.options.speed}`)
			},
		},
		// Blackout Control
		setBlackout: {
			name: 'Set Blackout',
			options: [
				{
					type: 'dropdown',
					label: 'Blackout State',
					id: 'state',
					choices: [
						{ id: '1', label: 'On' },
						{ id: '0', label: 'Off' },
					],
					default: '1',
				},
			],
			callback: (event) => {
				instance.sendCommand(`QLC+API|setBlackout|${event.options.state}`)
			},
		},
		// Load Project
		loadProject: {
			name: 'Load Project',
			options: [
				{
					type: 'textinput',
					label: 'Project Path',
					id: 'path',
					default: '',
					tooltip: 'Full path to the QLC+ project file',
				},
			],
			callback: (event) => {
				if (event.options.path) {
					instance.sendCommand(`QLC+API|loadProject|${event.options.path}`)
				}
			},
		},
	})
}
