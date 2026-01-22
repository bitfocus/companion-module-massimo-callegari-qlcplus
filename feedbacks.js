const { combineRgb } = require('@companion-module/base')
const feedbacksSettings = require('./constants').feedbacksSettings

function getFunctionChoices(instance) {
	return Array.isArray(instance?.qlcplusObj?.functions) ? instance.qlcplusObj.functions : []
}

function findFunctionById(instance, id) {
	const funcs = getFunctionChoices(instance)
	return funcs.find((f) => String(f.id) === String(id))
}
module.exports = async (instance) => {
	instance.setFeedbackDefinitions({
		functionState: {
			name: 'State of function',
			type: 'advanced',
			label: 'Function State',
			defaultStyle: {
				bgcolor: combineRgb(255, 0, 0),
				color: combineRgb(255, 255, 255),
			},
			options: [
				{
					type: 'dropdown',
					label: 'Function',
					id: 'functionID',
					default: 0,
					choices: instance.qlcplusObj.functions,
				},
			],
			callback: (feedback) => {
				if (!instance.qlcplusObj.functions) return {}
				const targetFunction = findFunctionById(instance, feedback.options.functionID)
				if (targetFunction) {
					if (targetFunction.status === 'Running') {
						return {
							png64: feedbacksSettings.images.play,
							pngalignment: 'center:bottom',
						}
					} else if (targetFunction.status === 'Stopped') {
						return {
							png64: feedbacksSettings.images.stop,
							pngalignment: 'center:bottom',
						}
					}
				}
			},
		},

		functionRunning: {
			name: 'Function is Running',
			type: 'boolean',
			defaultStyle: {
				// conservative default; user can adjust later
				bgcolor: combineRgb(0, 128, 0),
			},
			options: [
				{
					type: 'dropdown',
					label: 'Function ID source',
					id: 'idSource',
					default: 'dropdown',
					choices: [
						{ id: 'dropdown', label: 'Select from list' },
						{ id: 'manual', label: 'Manual (supports variables)' },
					],
				},
				{
					type: 'dropdown',
					label: 'Function',
					id: 'functionID',
					default: getFunctionChoices(instance)?.[0]?.id ?? 0,
					choices: getFunctionChoices(instance),
					isVisible: (opts) => (opts?.idSource ?? 'dropdown') === 'dropdown',
				},
				{
					type: 'textinput',
					label: 'Function ID (manual)',
					id: 'functionIDManual',
					default: '',
					useVariables: true,
					isVisible: (opts) => (opts?.idSource ?? 'dropdown') === 'manual',
				},
			],
			callback: async (feedback, context) => {
				let id

				if ((feedback.options.idSource ?? 'dropdown') === 'manual') {
					id = await context.parseVariablesInString(feedback.options.functionIDManual || '')
				} else {
					id = feedback.options.functionID
				}

				const fn = findFunctionById(instance, id)
				return fn?.status === 'Running'
			},
		},

	})
}
