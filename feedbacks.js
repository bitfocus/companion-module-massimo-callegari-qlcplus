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
				if (!instance.qlcplusObj.functions) return false
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
		widgetState: {
			name: "Widget State",
			type: "boolean",
			defaultStyle: {
				bgcolor: 0xFF7B37,
				color: 0x000000,
			},
			options: [{
				type: 'dropdown',
				label: 'Widget',
				id: 'widgetID',
				default: 0,
				choices: instance.qlcplusObj.widgets,
			},
			{
				type: 'number',
				label: "Threshold",
				id: "treshold",
				default: 1,
				min: 0,
				max: 255,
				range: true
			}],
			callback: (feedback) => {
   				if (!instance.qlcplusObj.widgets) return false;
				const target = instance.qlcplusObj.widgets.find((f) => f.id === feedback.options.widgetID)
				if (!target) return false;

				if (target.value > feedback.options.treshold) {
					return true;
				} else return false;
  			},
		}
	})
}
