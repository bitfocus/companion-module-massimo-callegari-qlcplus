const { combineRgb } = require('@companion-module/base')
const feedbacksSettings = require('./constants').feedbacksSettings

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
				if(!instance.qlcplusObj.functions) return false
				const targetFunction = instance.qlcplusObj.functions.find((f) => f.id === feedback.options.functionID)
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
	})
}
